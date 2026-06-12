import type { CardState } from '../types';
import { computeRetrievability } from '../services/srsEngine';

// ─── Study / Relearning step minutes ─────────────────────────────────────────
// Mirrors the constants in srsEngine.ts so display logic stays in sync.
const STUDY_STEPS_MINUTES = [1, 10, 1440];
const RELEARN_STEPS_MINUTES = [10, 1440];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function minutesLabel(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
  return `${Math.round(minutes / 1440)}d`;
}

function daysLabel(days: number): string {
  const rounded = Math.max(1, Math.round(days));
  if (rounded === 1) return '1d';
  if (rounded < 30) return `${rounded}d`;
  if (rounded < 365) return `${(rounded / 30).toFixed(1)}mo`;
  return `${(rounded / 365).toFixed(1)}y`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns the human-readable "next review" label for the Again button
 * given the card's current state.
 */
export function againLabel(card: CardState): string {
  switch (card.phase) {
    case 'study':
      return minutesLabel(STUDY_STEPS_MINUTES[0]); // always resets to step 0 → 1 min
    case 'relearning':
      return minutesLabel(RELEARN_STEPS_MINUTES[0]); // always resets to step 0 → 10 min
    case 'retrieval':
      return minutesLabel(RELEARN_STEPS_MINUTES[0]); // lapse → relearning step 0 → 10 min
  }
}

/**
 * Returns the human-readable "next review" label for the Got It button
 * given the card's current state.
 */
export function gotItLabel(card: CardState): string {
  switch (card.phase) {
    case 'study': {
      if (card.pendingGraduation) return '3d'; // graduates → 3 day interval
      const nextStep = card.currentStep + 1;
      const minutes = STUDY_STEPS_MINUTES[nextStep] ?? STUDY_STEPS_MINUTES[STUDY_STEPS_MINUTES.length - 1];
      return minutesLabel(minutes);
    }
    case 'relearning': {
      const nextStep = card.currentStep + 1;
      if (nextStep >= RELEARN_STEPS_MINUTES.length) {
        // Will graduate back to retrieval using stabilityAfterLapse
        return daysLabel(card.stabilityAfterLapse || 1);
      }
      return minutesLabel(RELEARN_STEPS_MINUTES[nextStep]);
    }
    case 'retrieval': {
      // Approximate: next stability ≈ current stability × ~2 (rough estimate for display)
      // We just show the current stability as a rough "next interval" since computing
      // the exact FSRS value requires knowing elapsed time at answer time.
      return `~${daysLabel(card.stability * 1.5)}`;
    }
  }
}

/**
 * Returns a memory strength percentage (0–100) based on retrievability,
 * using days since lastReviewed and current stability.
 */
export function memoryStrengthPercent(card: CardState): number {
  if (card.phase !== 'retrieval' && card.phase !== 'relearning') return 0;
  const lastReviewed = card.lastReviewed;
  if (!lastReviewed) return 0;

  const today = new Date();
  const reviewDate = new Date(lastReviewed);
  const t = Math.max(0, (today.getTime() - reviewDate.getTime()) / (1000 * 60 * 60 * 24));
  const R = computeRetrievability(card.stability || 1, t);
  return Math.round(R * 100);
}

/**
 * Returns a short string like "Next in 14d" or "Next in 2mo" for a retrieval card.
 */
export function nextReviewLabel(card: CardState): string {
  if (!card.nextReview) return '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(card.nextReview);
  due.setHours(0, 0, 0, 0);
  const days = Math.max(0, Math.round((due.getTime() - today.getTime()) / 86_400_000));
  if (days === 0) return 'Due today';
  if (days === 1) return 'Next in 1d';
  return `Next in ${daysLabel(days)}`;
}
