import type { CardState } from '../types';
import { applyAnswer } from './srsEngine';

// ─── Session type ─────────────────────────────────────────────────────────────

export type SessionMode = 'overview' | 'learn' | 'retrieval';

export interface QuizSession {
  queue: CardState[];
  currentIndex: number;
  initialQueueSize: number;
  answered: { wordId: number; correct: boolean }[];
  isComplete: boolean;
  mode: SessionMode;
}

// ─── Constructors ─────────────────────────────────────────────────────────────

export function createStudySession(
  cards: CardState[],
  mode: 'overview' | 'learn',
): QuizSession {
  return {
    queue: cards,
    currentIndex: 0,
    initialQueueSize: cards.length,
    answered: [],
    isComplete: cards.length === 0,
    mode,
  };
}

export function createRetrievalSession(cards: CardState[]): QuizSession {
  return {
    queue: cards,
    currentIndex: 0,
    initialQueueSize: cards.length,
    answered: [],
    isComplete: cards.length === 0,
    mode: 'retrieval',
  };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export function getCurrentCard(session: QuizSession): CardState | null {
  if (session.isComplete) return null;
  return session.queue[session.currentIndex] ?? null;
}

export function getSessionStats(
  session: QuizSession,
): { correct: number; again: number; total: number } {
  const correct = session.answered.filter(a => a.correct).length;
  const again = session.answered.filter(a => !a.correct).length;
  return { correct, again, total: session.answered.length };
}

// ─── Commands ─────────────────────────────────────────────────────────────────

/**
 * Applies the user's answer to the current card and returns the updated session
 * and the new card state (caller is responsible for persisting the card state).
 *
 * Learn-mode retry behaviour: when the answer is 'again', the card is
 * re-inserted immediately after the next card so the user retries it soon
 * rather than at the very end of the queue.
 */
export function answerCard(
  session: QuizSession,
  answer: 'again' | 'gotIt',
  now: Date,
): { updatedSession: QuizSession; updatedCard: CardState } {
  const current = getCurrentCard(session);
  if (!current) {
    throw new Error('answerCard called on a completed or empty session');
  }

  const updatedCard = applyAnswer(current, answer, now);

  const correct = answer === 'gotIt';
  const answered = [
    ...session.answered,
    { wordId: current.wordId, correct },
  ];

  let queue = session.queue;

  if (answer === 'again' && session.mode === 'learn') {
    // Re-insert the updated card after the next card (index + 2 in the new queue).
    // If the current card is the last one, append it to the end instead.
    const withoutCurrent = [
      ...session.queue.slice(0, session.currentIndex),
      ...session.queue.slice(session.currentIndex + 1),
    ];
    const insertAt = Math.min(
      session.currentIndex + 1,
      withoutCurrent.length,
    );
    queue = [
      ...withoutCurrent.slice(0, insertAt),
      updatedCard,
      ...withoutCurrent.slice(insertAt),
    ];
  } else {
    // Replace the card in place with its updated state (for stats / phase tracking).
    queue = session.queue.map((c, i) =>
      i === session.currentIndex ? updatedCard : c,
    );
  }

  const updatedSession: QuizSession = {
    ...session,
    queue,
    answered,
  };

  return { updatedSession, updatedCard };
}

/**
 * Moves the session to the next card.
 * Marks the session complete when the last card has been passed.
 */
export function advanceSession(session: QuizSession): QuizSession {
  const nextIndex = session.currentIndex + 1;
  const isComplete = nextIndex >= session.queue.length;
  return {
    ...session,
    currentIndex: nextIndex,
    isComplete,
  };
}
