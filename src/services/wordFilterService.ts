import type { ScopeConfig, CardState } from '../types';
import {
  getWordsByNTChapter,
  getWordsByTextbookChapter,
  getWordsByFrequency,
} from '../database/wordRepository';
import {
  getDueStudyCards,
  getCooldownStudyCards,
  getDueRetrievalCards,
  getGraduatedCount,
} from '../database/progressRepository';

// ─── Word ID list ─────────────────────────────────────────────────────────────

/**
 * Returns word IDs for the scope in canonical display order
 * (NT/textbook sequence ASC, frequency DESC).
 */
export async function getWordsForScope(scope: ScopeConfig): Promise<number[]> {
  switch (scope.type) {
    case 'bible_chapter': {
      const words = await getWordsByNTChapter(
        scope.book ?? '',
        scope.chapterStart ?? 1,
        scope.chapterEnd ?? scope.chapterStart ?? 1,
      );
      return words.map(w => w.id);
    }

    case 'textbook': {
      const words = await getWordsByTextbookChapter(
        scope.textbookSlug ?? '',
        scope.chapterStart ?? 1,
        scope.chapterEnd ?? scope.chapterStart ?? 1,
      );
      return words.map(w => w.id);
    }

    case 'frequency': {
      const words = await getWordsByFrequency(
        scope.frequencyMin ?? 1,
        scope.frequencyMax ?? Number.MAX_SAFE_INTEGER,
      );
      return words.map(w => w.id);
    }
  }
}

// ─── Study queue ──────────────────────────────────────────────────────────────

export interface StudyQueueResult {
  cards: CardState[];
  /** Earliest time any cooldown card becomes due, or null if no cards on cooldown. */
  nextAvailableAt: Date | null;
  /** Number of words currently on cooldown (in study/relearning, not yet due). */
  cooldownCount: number;
  /** Number of words that have graduated to retrieval phase. */
  graduatedCount: number;
}

/**
 * Returns due study/relearning cards for the scope, ordered as per CLAUDE.md:
 *   1. Cards already in progress (study or relearning), sorted by showAt ASC.
 *   2. Brand-new cards (no progress record), in NT/textbook/frequency sequence order.
 *
 * Cards with a progress record whose showAt is in the future (on cooldown) are
 * excluded — they must NOT be re-introduced as "new" cards until their timer fires.
 * `nextAvailableAt` is set to the earliest such showAt so the UI can show a countdown.
 */
export async function getStudyQueueForScope(
  scope: ScopeConfig,
  now: Date,
): Promise<StudyQueueResult> {
  const scopeWordIds = await getWordsForScope(scope);
  if (scopeWordIds.length === 0) return { cards: [], nextAvailableAt: null, cooldownCount: 0, graduatedCount: 0 };

  // Due cards with an existing progress record, sorted by showAt ASC.
  const dueCards = await getDueStudyCards(scopeWordIds, now);
  const dueWordIds = new Set(dueCards.map(c => c.wordId));

  // Cards that exist in the DB but are not yet due (showAt > now).
  const cooldownCards = await getCooldownStudyCards(scopeWordIds, now);
  const cooldownWordIds = new Set(cooldownCards.map(c => c.wordId));

  // Compute earliest time a cooldown card becomes available.
  let nextAvailableAt: Date | null = null;
  for (const c of cooldownCards) {
    if (c.showAt) {
      const t = new Date(c.showAt);
      if (!nextAvailableAt || t < nextAvailableAt) nextAvailableAt = t;
    }
  }

  // New cards: never seen (no DB record), preserving sequence order.
  const newCards: CardState[] = scopeWordIds
    .filter(id => !dueWordIds.has(id) && !cooldownWordIds.has(id))
    .map(wordId => newCardState(wordId, now));

  const graduatedCount = await getGraduatedCount(scopeWordIds);

  return {
    cards: [...dueCards, ...newCards],
    nextAvailableAt,
    cooldownCount: cooldownCards.length,
    graduatedCount,
  };
}

// ─── Retrieval queue ──────────────────────────────────────────────────────────

/**
 * Returns due retrieval-phase cards for the scope, sorted by nextReview ASC.
 */
export async function getRetrievalQueueForScope(
  scope: ScopeConfig,
  today: Date,
): Promise<CardState[]> {
  const scopeWordIds = await getWordsForScope(scope);
  if (scopeWordIds.length === 0) return [];
  return getDueRetrievalCards(scopeWordIds, today);
}

// ─── Graduated count ──────────────────────────────────────────────────────────

/**
 * Returns the count of graduated (retrieval-phase) words in the scope.
 * Used to populate the Retrieve button badge and decide whether to enable it.
 */
export async function getGraduatedCountForScope(scope: ScopeConfig): Promise<number> {
  const scopeWordIds = await getWordsForScope(scope);
  if (scopeWordIds.length === 0) return 0;
  return getGraduatedCount(scopeWordIds);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Produces a fresh CardState for a word that has never been seen.
 * showAt is set to now so it surfaces immediately in the study queue.
 */
function newCardState(wordId: number, now: Date): CardState {
  const iso = now.toISOString();
  const today = iso.slice(0, 10);
  return {
    wordId,
    phase: 'study',
    currentStep: 0,
    pendingGraduation: false,
    showAt: iso,
    stability: 0,
    difficulty: 0,
    lastReviewed: today,
    nextReview: today,
    stabilityAfterLapse: 0,
    lapseCount: 0,
    reviewCount: 0,
  };
}
