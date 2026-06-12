import { useCallback, useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import type { CardState, Word } from '../types';
import { upsertProgress } from '../database/progressRepository';
import { getWordsByIds } from '../database/wordRepository';
import * as audioService from '../services/audioService';
import {
  answerCard,
  advanceSession,
  createStudySession,
  getCurrentCard,
  getSessionStats,
  type QuizSession,
} from '../services/quizEngine';
import { getStudyQueueForScope } from '../services/wordFilterService';
import { useScopeStore } from '../store/scopeStore';

export interface StudySessionStats {
  correct: number;
  again: number;
  total: number;
  graduatedThisSession: number;
}

export interface UseStudySessionResult {
  isLoading: boolean;
  currentWord: Word | null;
  currentCardState: CardState | null;
  isFlipped: boolean;
  justGraduated: boolean;
  flip: () => void;
  again: () => void;
  gotIt: () => void;
  sessionStats: StudySessionStats;
  isComplete: boolean;
  /** 0-based index of the current card (advances only on Got It). */
  cardIndex: number;
  /** Total unique cards in the session queue. */
  totalCards: number;
  /** Earliest time the next cooldown card becomes available, or null. */
  nextAvailableAt: Date | null;
  /** Number of words currently waiting on a cooldown timer. */
  cooldownCount: number;
  /** Number of words that have graduated to retrieval phase. */
  graduatedCount: number;
}

export function useStudySession(): UseStudySessionResult {
  const scope = useScopeStore(s => s.activeScope);

  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<QuizSession | null>(null);
  const [wordMap, setWordMap] = useState<Map<number, Word>>(new Map());
  const [isFlipped, setIsFlipped] = useState(false);
  const [justGraduated, setJustGraduated] = useState(false);
  const [graduatedThisSession, setGraduatedThisSession] = useState(0);
  const [nextAvailableAt, setNextAvailableAt] = useState<Date | null>(null);
  const [cooldownCount, setCooldownCount] = useState(0);
  const [graduatedCount, setGraduatedCount] = useState(0);

  // Guard against state updates after unmount.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ── Load the study queue on mount ──────────────────────────────────────────

  useEffect(() => {
    if (!scope) return;

    let cancelled = false;

    (async () => {
      const now = new Date();
      const { cards: queue, nextAvailableAt: naa, cooldownCount: cc, graduatedCount: gc } = await getStudyQueueForScope(scope, now);
      const words = await getWordsByIds(queue.map(c => c.wordId));
      if (cancelled) return;

      const map = new Map<number, Word>(words.map(w => [w.id, w]));
      setWordMap(map);
      setNextAvailableAt(naa);
      setCooldownCount(cc);
      setGraduatedCount(gc);
      setSession(createStudySession(queue, 'learn'));
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
  const sessionStats: StudySessionStats = { ...rawStats, graduatedThisSession };

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

  // Stable ref so _applyAnswer closure always sees the latest session without
  // stale capture — avoids the session → callback → session circular dep.
  const sessionRef = useRef(session);
  const currentCardStateRef = useRef(currentCardState);
  useEffect(() => { sessionRef.current = session; }, [session]);
  useEffect(() => { currentCardStateRef.current = currentCardState; }, [currentCardState]);

  const _applyAnswer = useCallback((answer: 'again' | 'gotIt') => {
    const sess = sessionRef.current;
    const card = currentCardStateRef.current;
    if (!sess || !card) return;

    // Haptics — non-fatal on devices without a haptic engine.
    if (answer === 'again') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }

    const now = new Date();
    const { updatedSession, updatedCard } = answerCard(sess, answer, now);

    const graduated =
      answer === 'gotIt' &&
      card.phase !== 'retrieval' &&
      updatedCard.phase === 'retrieval';

    // For 'again': card is re-inserted at the right position in updatedSession.queue;
    // do NOT advance so the next card (now at the same currentIndex) becomes active.
    // For 'gotIt': advance past the answered card.
    const nextSession =
      answer === 'gotIt' ? advanceSession(updatedSession) : updatedSession;

    setSession(nextSession);
    setIsFlipped(false);

    if (graduated) {
      setGraduatedThisSession(n => n + 1);
      setJustGraduated(true);
      setTimeout(() => {
        if (mountedRef.current) setJustGraduated(false);
      }, 1500);
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
    justGraduated,
    flip,
    again,
    gotIt,
    sessionStats,
    isComplete,
    cardIndex,
    totalCards,
    nextAvailableAt,
    cooldownCount,
    graduatedCount,
  };
}
