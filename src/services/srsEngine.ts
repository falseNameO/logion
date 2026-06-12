import { CardState } from '../types';

// ─── Study mode steps (minutes) ──────────────────────────────────────────────
// Steps: [1min → 10min → 1440min]
const STUDY_STEPS_MINUTES = [1, 10, 1440];

// ─── Relearning mode steps (minutes) ─────────────────────────────────────────
// Steps: [10min → 1440min]
const RELEARN_STEPS_MINUTES = [10, 1440];

// ─── Initial FSRS values on graduation ───────────────────────────────────────
const INITIAL_STABILITY = 3.2; // S₀
const INITIAL_DIFFICULTY = 4.0; // D₀
const GRADUATION_INTERVAL_DAYS = 3;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addMinutes(date: Date, minutes: number): string {
  return new Date(date.getTime() + minutes * 60 * 1000).toISOString();
}

function addDays(date: Date, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + Math.round(days));
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function daysBetween(from: string, to: Date): number {
  const fromMs = new Date(from).getTime();
  return Math.max(0, (to.getTime() - fromMs) / (1000 * 60 * 60 * 24));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// ─── Pure FSRS formula helpers ────────────────────────────────────────────────

/**
 * R(t) = (1 + t / (9 × S))^-1
 * Probability of recall after t days given stability S.
 */
export function computeRetrievability(S: number, t: number): number {
  return Math.pow(1 + t / (9 * S), -1);
}

/**
 * S' = S × (e^(0.9 × D^-0.24) × R^(-0.72) × 11^(1-R) - 1 + 1)
 * New stability after a successful retrieval review.
 */
export function computeNewStability(S: number, D: number, R: number): number {
  const factor = Math.exp(0.9 * Math.pow(D, -0.24)) * Math.pow(R, -0.72) * Math.pow(11, 1 - R);
  return S * (factor - 1 + 1);
}

/**
 * S' = S × e^(-0.6) × D^(-0.28) × R^(0.43)
 * Reduced stability saved at the moment of a lapse.
 */
export function computeLapseStability(S: number, D: number, R: number): number {
  return S * Math.exp(-0.6) * Math.pow(D, -0.28) * Math.pow(R, 0.43);
}

/**
 * D' = clamp(D × 0.9 + (3 - grade) × 0.2, 1, 10)
 * grade = 3 for Got It, grade = 1 for Again (lapse).
 */
export function updateDifficulty(D: number, grade: number): number {
  return clamp(D * 0.9 + (3 - grade) * 0.2, 1, 10);
}

// ─── Study phase ──────────────────────────────────────────────────────────────

/**
 * On AGAIN (study):
 *   currentStep = 0
 *   showAt = now + 1min
 *   pendingGraduation = false
 */
export function applyStudyAgain(card: CardState, now: Date): CardState {
  return {
    ...card,
    currentStep: 0,
    pendingGraduation: false,
    showAt: addMinutes(now, STUDY_STEPS_MINUTES[0]),
  };
}

/**
 * On GOT IT (study):
 *   currentStep += 1
 *   if step 1: showAt = now + 10min
 *   if step 2: showAt = now + 1440min, pendingGraduation = true
 *   if pendingGraduation was already true: graduate to retrieval
 */
export function applyStudyGotIt(card: CardState, now: Date): CardState {
  // Pending graduation means this Got It triggers the final step → graduate.
  if (card.pendingGraduation) {
    const today = now.toISOString().slice(0, 10);
    return {
      ...card,
      phase: 'retrieval',
      pendingGraduation: false,
      currentStep: 0,
      stability: INITIAL_STABILITY,
      difficulty: INITIAL_DIFFICULTY,
      lastReviewed: today,
      nextReview: addDays(now, GRADUATION_INTERVAL_DAYS),
    };
  }

  const nextStep = card.currentStep + 1;

  if (nextStep === 1) {
    // step 0 → 1: show in 10 min
    return {
      ...card,
      currentStep: nextStep,
      showAt: addMinutes(now, STUDY_STEPS_MINUTES[1]),
    };
  }

  if (nextStep === 2) {
    // step 1 → 2: show in 1440 min, mark pending graduation
    return {
      ...card,
      currentStep: nextStep,
      showAt: addMinutes(now, STUDY_STEPS_MINUTES[2]),
      pendingGraduation: true,
    };
  }

  // Safety fallback — normal flow never reaches here
  return { ...card, currentStep: nextStep };
}

// ─── Retrieval phase ──────────────────────────────────────────────────────────

/**
 * Retrieval Got It:
 *   grade = 3
 *   D' = clamp(D × 0.9 + (3 - 3) × 0.2, 1, 10)
 *   t = days since lastReviewed
 *   R = (1 + t / (9 × S))^-1
 *   S' = S × (e^(0.9 × D^-0.24) × R^(-0.72) × 11^(1-R) - 1 + 1)
 *   nextReview = today + S' days
 *   lastReviewed = today
 */
export function applyRetrievalGotIt(card: CardState, today: Date): CardState {
  const grade = 3;
  const t = daysBetween(card.lastReviewed, today);
  const R = computeRetrievability(card.stability, t);
  const newS = computeNewStability(card.stability, card.difficulty, R);
  const newD = updateDifficulty(card.difficulty, grade);
  const todayStr = today.toISOString().slice(0, 10);

  return {
    ...card,
    difficulty: newD,
    stability: newS,
    lastReviewed: todayStr,
    nextReview: addDays(today, newS),
    reviewCount: card.reviewCount + 1,
  };
}

/**
 * Retrieval Again (lapse):
 *   t = days since lastReviewed
 *   R = (1 + t / (9 × S))^-1
 *   S' = S × e^(-0.6) × D^(-0.28) × R^(0.43)
 *   grade = 1  →  D' = clamp(D × 0.9 + 0.4, 1, 10)
 *   phase = "relearning"
 *   currentStep = 0
 *   showAt = now + 10min
 *   stabilityAfterLapse = S'
 */
export function applyRetrievalAgain(card: CardState, today: Date): CardState {
  const grade = 1;
  const t = daysBetween(card.lastReviewed, today);
  const R = computeRetrievability(card.stability, t);
  const lapseS = computeLapseStability(card.stability, card.difficulty, R);
  const newD = updateDifficulty(card.difficulty, grade);

  return {
    ...card,
    phase: 'relearning',
    difficulty: newD,
    stabilityAfterLapse: lapseS,
    currentStep: 0,
    showAt: addMinutes(today, RELEARN_STEPS_MINUTES[0]),
    lapseCount: card.lapseCount + 1,
  };
}

// ─── Relearning phase ─────────────────────────────────────────────────────────

/**
 * Relearning Again:
 *   currentStep = 0
 *   showAt = now + 10min
 */
export function applyRelearningAgain(card: CardState, now: Date): CardState {
  return {
    ...card,
    currentStep: 0,
    showAt: addMinutes(now, RELEARN_STEPS_MINUTES[0]),
  };
}

/**
 * Relearning Got It:
 *   currentStep += 1
 *   if step 1: showAt = now + 1440min
 *   if step 2: graduate back to retrieval using stabilityAfterLapse
 *     phase = "retrieval"
 *     S = stabilityAfterLapse
 *     nextReview = today + S days
 *     lastReviewed = today
 */
export function applyRelearningGotIt(card: CardState, now: Date): CardState {
  const nextStep = card.currentStep + 1;

  if (nextStep === 1) {
    // step 0 → 1: show in 1440 min
    return {
      ...card,
      currentStep: nextStep,
      showAt: addMinutes(now, RELEARN_STEPS_MINUTES[1]),
    };
  }

  if (nextStep === 2) {
    // step 1 → 2: graduate back to retrieval
    const todayStr = now.toISOString().slice(0, 10);
    return {
      ...card,
      phase: 'retrieval',
      currentStep: 0,
      stability: card.stabilityAfterLapse,
      lastReviewed: todayStr,
      nextReview: addDays(now, card.stabilityAfterLapse),
    };
  }

  return { ...card, currentStep: nextStep };
}

// ─── Dispatch ─────────────────────────────────────────────────────────────────

/**
 * Routes to the correct SRS function based on card.phase and the user's answer.
 */
export function applyAnswer(
  card: CardState,
  answer: 'again' | 'gotIt',
  now: Date,
): CardState {
  switch (card.phase) {
    case 'study':
      return answer === 'again'
        ? applyStudyAgain(card, now)
        : applyStudyGotIt(card, now);

    case 'retrieval':
      return answer === 'again'
        ? applyRetrievalAgain(card, now)
        : applyRetrievalGotIt(card, now);

    case 'relearning':
      return answer === 'again'
        ? applyRelearningAgain(card, now)
        : applyRelearningGotIt(card, now);
  }
}
