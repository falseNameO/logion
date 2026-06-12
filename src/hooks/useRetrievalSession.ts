import { useCallback, useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import type { CardState, Word } from '../types';
import { upsertProgress } from '../database/progressRepository';
import { getWordsByIds } from '../database/wordRepository';
import * as audioService from '../services/audioService';
import {
  answerCard,
  advanceSession,
  createRetrievalSession,
  getCurrentCard,
  getSessionStats,
  type QuizSession,
} from '../services/quizEngine';
import { getRetrievalQueueForScope } from '../services/wordFilterService';
import { useScopeStore } from '../store/scopeStore';

export interface RetrievalSessionStats {
  reviewed: number;
  lapsed: number;
  total: number;
  /** Earliest nextReview date among all reviewed cards in this session. */
  nextSessionDate: string | null;
}

export interface UseRetrievalSessionResult {
  isLoading: boolean;
  currentWord: Word | null;
  currentCardState: CardState | null;
  isFlipped: boolean;
  justLapsed: boolean;
  flip: () => void;
  again: () => void;
  gotIt: () => void;
  sessionStats: RetrievalSessionStats;
  isComplete: boolean;
  cardIndex: number;
  totalCards: number;
}

export function useRetrievalSession(): UseRetrievalSessionResult {
  const scope = useScopeStore(s => s.activeScope);

  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<QuizSession | null>(null);
  const [wordMap, setWordMap] = useState<Map<number, Word>>(new Map());
  const [isFlipped, setIsFlipped] = useState(false);
  const [justLapsed, setJustLapsed] = useState(false);
  // Track the earliest next-review date across all got-it answers this session.
  const [nextReviewDates, setNextReviewDates] = useState<string[]>([]);
  const [lapsedCount, setLapsedCount] = useState(0);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ── Load queue on mount ────────────────────────────────────────────────────

  useEffect(() => {
    if (!scope) return;
    let cancelled = false;

    (async () => {
      const now = new Date();
      const queue = await getRetrievalQueueForScope(scope, now);
      const words = await getWordsByIds(queue.map(c => c.wordId));
      if (cancelled) return;

      const map = new Map<number, Word>(words.map(w => [w.id, w]));
      setWordMap(map);
      setSession(createRetrievalSession(queue));
      setIsLoading(false);
    })();

    return () => { cancelled = true; };
  }, [scope]);

  // ── Derived values ─────────────────────────────────────────────────────────

  const currentCardState = session ? getCurrentCard(session) : null;
  const currentWord = currentCardState ? (wordMap.get(currentCardState.wordId) ?? null) : null;
  const isComplete = session?.isComplete ?? false;
  const cardIndex = session?.currentIndex ?? 0;
  const totalCards = session?.initialQueueSize ?? 0;

  const rawStats = session ? getSessionStats(session) : { correct: 0, again: 0, total: 0 };
  const nextSessionDate =
    nextReviewDates.length > 0
      ? nextReviewDates.reduce((a, b) => (a < b ? a : b))
      : null;

  const sessionStats: RetrievalSessionStats = {
    reviewed: rawStats.correct,
    lapsed: lapsedCount,
    total: rawStats.total,
    nextSessionDate,
  };

  // ── Stable refs for action callbacks ──────────────────────────────────────

  const sessionRef = useRef(session);
  const currentCardStateRef = useRef(currentCardState);
  useEffect(() => { sessionRef.current = session; }, [session]);
  useEffect(() => { currentCardStateRef.current = currentCardState; }, [currentCardState]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const flip = useCallback(() => {
    setIsFlipped(prev => {
      const next = !prev;
      if (next && currentCardState) {
        audioService.playBack(currentCardState.wordId).catch(() => {});
      }
      return next;
    });
  }, [currentCardState]);

  const _applyAnswer = useCallback((answer: 'again' | 'gotIt') => {
    const sess = sessionRef.current;
    if (!sess) return;

    if (answer === 'again') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }

    const now = new Date();
    const { updatedSession, updatedCard } = answerCard(sess, answer, now);
    // Retrieval mode always advances after each answer.
    const nextSession = advanceSession(updatedSession);

    setSession(nextSession);
    setIsFlipped(false);

    if (answer === 'again') {
      setLapsedCount(n => n + 1);
      setJustLapsed(true);
      setTimeout(() => {
        if (mountedRef.current) setJustLapsed(false);
      }, 1800);
    } else {
      // Track the new nextReview date so we can compute the next session date.
      setNextReviewDates(prev => [...prev, updatedCard.nextReview]);
    }

    upsertProgress(updatedCard).catch(() => {});
  }, []);

  const again = useCallback(() => _applyAnswer('again'), [_applyAnswer]);
  const gotIt = useCallback(() => _applyAnswer('gotIt'), [_applyAnswer]);

  return {
    isLoading,
    currentWord,
    currentCardState,
    isFlipped,
    justLapsed,
    flip,
    again,
    gotIt,
    sessionStats,
    isComplete,
    cardIndex,
    totalCards,
  };
}
