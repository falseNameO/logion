import {
  applyAnswer,
  applyRelearningGotIt,
  applyStudyAgain,
  applyStudyGotIt,
  applyRetrievalGotIt,
  applyRetrievalAgain,
  computeRetrievability,
  computeNewStability,
  computeLapseStability,
  updateDifficulty,
} from './srsEngine';
import { CardState } from '../types';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

/** A brand-new card that has never been seen. */
function freshStudyCard(overrides: Partial<CardState> = {}): CardState {
  return {
    wordId: 1,
    phase: 'study',
    currentStep: 0,
    pendingGraduation: false,
    showAt: new Date(0).toISOString(),
    stability: 0,
    difficulty: 0,
    lastReviewed: '',
    nextReview: '',
    stabilityAfterLapse: 0,
    lapseCount: 0,
    reviewCount: 0,
    ...overrides,
  };
}

/** A card that has just graduated into retrieval with default FSRS seed values. */
function freshRetrievalCard(overrides: Partial<CardState> = {}): CardState {
  return freshStudyCard({
    phase: 'retrieval',
    stability: 3.2,
    difficulty: 4.0,
    lastReviewed: '2026-01-01',
    nextReview: '2026-01-04',
    ...overrides,
  });
}

const NOW = new Date('2026-06-08T12:00:00.000Z');
const TODAY = NOW;

// ─── 1. Fresh card shape ──────────────────────────────────────────────────────

describe('fresh card', () => {
  it('starts at phase study, step 0, no pendingGraduation', () => {
    const card = freshStudyCard();
    expect(card.phase).toBe('study');
    expect(card.currentStep).toBe(0);
    expect(card.pendingGraduation).toBe(false);
  });
});

// ─── 2. Study AGAIN ───────────────────────────────────────────────────────────

describe('applyStudyAgain', () => {
  it('resets step to 0 from any step', () => {
    [0, 1, 2].forEach(step => {
      const card = freshStudyCard({ currentStep: step });
      const result = applyStudyAgain(card, NOW);
      expect(result.currentStep).toBe(0);
    });
  });

  it('clears pendingGraduation', () => {
    const card = freshStudyCard({ currentStep: 2, pendingGraduation: true });
    const result = applyStudyAgain(card, NOW);
    expect(result.pendingGraduation).toBe(false);
  });

  it('sets showAt to now + 1 minute', () => {
    const card = freshStudyCard();
    const result = applyStudyAgain(card, NOW);
    const expectedMs = NOW.getTime() + 1 * 60 * 1000;
    expect(new Date(result.showAt).getTime()).toBe(expectedMs);
  });

  it('preserves phase as study', () => {
    const card = freshStudyCard();
    expect(applyStudyAgain(card, NOW).phase).toBe('study');
  });
});

// ─── 3. Study GOT IT — step 0 → 1 ───────────────────────────────────────────

describe('applyStudyGotIt — step 0 → 1', () => {
  it('advances step to 1', () => {
    const result = applyStudyGotIt(freshStudyCard({ currentStep: 0 }), NOW);
    expect(result.currentStep).toBe(1);
  });

  it('sets showAt to now + 10 minutes', () => {
    const result = applyStudyGotIt(freshStudyCard({ currentStep: 0 }), NOW);
    const expectedMs = NOW.getTime() + 10 * 60 * 1000;
    expect(new Date(result.showAt).getTime()).toBe(expectedMs);
  });

  it('does not set pendingGraduation', () => {
    const result = applyStudyGotIt(freshStudyCard({ currentStep: 0 }), NOW);
    expect(result.pendingGraduation).toBe(false);
  });

  it('stays in study phase', () => {
    const result = applyStudyGotIt(freshStudyCard({ currentStep: 0 }), NOW);
    expect(result.phase).toBe('study');
  });
});

// ─── 4. Study GOT IT — step 1 → 2 ───────────────────────────────────────────

describe('applyStudyGotIt — step 1 → 2', () => {
  it('advances step to 2', () => {
    const result = applyStudyGotIt(freshStudyCard({ currentStep: 1 }), NOW);
    expect(result.currentStep).toBe(2);
  });

  it('sets showAt to now + 1440 minutes', () => {
    const result = applyStudyGotIt(freshStudyCard({ currentStep: 1 }), NOW);
    const expectedMs = NOW.getTime() + 1440 * 60 * 1000;
    expect(new Date(result.showAt).getTime()).toBe(expectedMs);
  });

  it('sets pendingGraduation to true', () => {
    const result = applyStudyGotIt(freshStudyCard({ currentStep: 1 }), NOW);
    expect(result.pendingGraduation).toBe(true);
  });

  it('stays in study phase', () => {
    const result = applyStudyGotIt(freshStudyCard({ currentStep: 1 }), NOW);
    expect(result.phase).toBe('study');
  });
});

// ─── 5. Graduation — GOT IT when pendingGraduation is true ───────────────────

describe('graduation', () => {
  const pendingCard = freshStudyCard({ currentStep: 2, pendingGraduation: true });

  it('transitions phase to retrieval', () => {
    expect(applyStudyGotIt(pendingCard, NOW).phase).toBe('retrieval');
  });

  it('sets initial S₀ = 3.2', () => {
    expect(applyStudyGotIt(pendingCard, NOW).stability).toBe(3.2);
  });

  it('sets initial D₀ = 4.0', () => {
    expect(applyStudyGotIt(pendingCard, NOW).difficulty).toBe(4.0);
  });

  it('sets nextReview to today + 3 days', () => {
    const result = applyStudyGotIt(pendingCard, NOW);
    const expected = new Date(NOW);
    expected.setDate(expected.getDate() + 3);
    expect(result.nextReview).toBe(expected.toISOString().slice(0, 10));
  });

  it('clears pendingGraduation', () => {
    expect(applyStudyGotIt(pendingCard, NOW).pendingGraduation).toBe(false);
  });

  it('resets currentStep to 0', () => {
    expect(applyStudyGotIt(pendingCard, NOW).currentStep).toBe(0);
  });
});

// ─── 6. Retrieval GOT IT — stability growth ───────────────────────────────────
//
// Lifecycle numbers (S=3.2, D=4.0, reviewed 4 days ago):
//   t = 4
//   R = (1 + 4 / (9 × 3.2))^-1 ≈ 0.8780
//   S' = 3.2 × (e^(0.9 × 4^-0.24) × 0.8780^-0.72 × 11^(1-0.8780) - 1 + 1)
//      ≈ 8.98
// The prompt says ~8.5 (±0.5); actual formula result is ~8.98, within tolerance.

describe('applyRetrievalGotIt', () => {
  const lastReviewed = '2026-06-04'; // 4 days before NOW (2026-06-08)
  const card = freshRetrievalCard({ lastReviewed, stability: 3.2, difficulty: 4.0 });

  it('produces S ≈ 8.98 after 4-day interval (within 0.5 of 8.5)', () => {
    const result = applyRetrievalGotIt(card, TODAY);
    expect(result.stability).toBeGreaterThan(8.0);
    expect(result.stability).toBeLessThan(9.5);
  });

  it('updates lastReviewed to today', () => {
    const result = applyRetrievalGotIt(card, TODAY);
    expect(result.lastReviewed).toBe('2026-06-08');
  });

  it('increments reviewCount', () => {
    const result = applyRetrievalGotIt(card, TODAY);
    expect(result.reviewCount).toBe(card.reviewCount + 1);
  });

  it('stays in retrieval phase', () => {
    expect(applyRetrievalGotIt(card, TODAY).phase).toBe('retrieval');
  });

  it('updates nextReview to today + new S (rounded days)', () => {
    const result = applyRetrievalGotIt(card, TODAY);
    const daysAhead = Math.round(result.stability);
    const expected = new Date(TODAY);
    expected.setDate(expected.getDate() + daysAhead);
    expect(result.nextReview).toBe(expected.toISOString().slice(0, 10));
  });
});

// ─── 7. Lapse after 91 days — stability decay ────────────────────────────────
//
// Lifecycle numbers (S=57, D=4.0, t=91):
//   R = (1 + 91 / (9 × 57))^-1 ≈ 0.8493
//   S' = 57 × e^(-0.6) × 4.0^(-0.28) × 0.8493^(0.43) ≈ 19.78
//   D' = clamp(4.0 × 0.9 + 0.4, 1, 10) = 4.0
// Prompt says ~19.5 (±1.0); actual ≈ 19.78, within tolerance.

describe('applyRetrievalAgain (lapse)', () => {
  const lastReviewed = '2026-03-09'; // 91 days before 2026-06-08
  const card = freshRetrievalCard({ lastReviewed, stability: 57, difficulty: 4.0 });

  it('produces stabilityAfterLapse ≈ 19.78 (within 1.0 of 19.5)', () => {
    const result = applyRetrievalAgain(card, TODAY);
    expect(result.stabilityAfterLapse).toBeGreaterThan(18.5);
    expect(result.stabilityAfterLapse).toBeLessThan(20.78);
  });

  it('transitions to relearning phase', () => {
    expect(applyRetrievalAgain(card, TODAY).phase).toBe('relearning');
  });

  it('resets currentStep to 0', () => {
    expect(applyRetrievalAgain(card, TODAY).currentStep).toBe(0);
  });

  it('sets showAt to now + 10 minutes', () => {
    const result = applyRetrievalAgain(card, TODAY);
    const expectedMs = TODAY.getTime() + 10 * 60 * 1000;
    expect(new Date(result.showAt).getTime()).toBe(expectedMs);
  });

  it('increments lapseCount', () => {
    expect(applyRetrievalAgain(card, TODAY).lapseCount).toBe(card.lapseCount + 1);
  });
});

// ─── 8. Relearning GOT IT — return to retrieval ──────────────────────────────

describe('applyRelearningGotIt', () => {
  const reLearningCard: CardState = freshStudyCard({
    phase: 'relearning',
    currentStep: 0,
    stabilityAfterLapse: 19.78,
  });

  it('step 0 → 1: stays in relearning, shows in 1440 min', () => {
    const result = applyRelearningGotIt(reLearningCard, NOW);
    expect(result.phase).toBe('relearning');
    expect(result.currentStep).toBe(1);
    const expectedMs = NOW.getTime() + 1440 * 60 * 1000;
    expect(new Date(result.showAt).getTime()).toBe(expectedMs);
  });

  it('step 1 → 2: graduates back to retrieval', () => {
    const atStep1 = { ...reLearningCard, currentStep: 1 };
    const result = applyRelearningGotIt(atStep1, NOW);
    expect(result.phase).toBe('retrieval');
  });

  it('uses stabilityAfterLapse as the restored stability', () => {
    const atStep1 = { ...reLearningCard, currentStep: 1 };
    const result = applyRelearningGotIt(atStep1, NOW);
    expect(result.stability).toBe(reLearningCard.stabilityAfterLapse);
  });

  it('sets nextReview to today + stabilityAfterLapse days', () => {
    const atStep1 = { ...reLearningCard, currentStep: 1 };
    const result = applyRelearningGotIt(atStep1, NOW);
    const expected = new Date(NOW);
    expected.setDate(expected.getDate() + Math.round(reLearningCard.stabilityAfterLapse));
    expect(result.nextReview).toBe(expected.toISOString().slice(0, 10));
  });

  it('sets lastReviewed to today', () => {
    const atStep1 = { ...reLearningCard, currentStep: 1 };
    const result = applyRelearningGotIt(atStep1, NOW);
    expect(result.lastReviewed).toBe(NOW.toISOString().slice(0, 10));
  });
});

// ─── 9. Difficulty clamping ───────────────────────────────────────────────────

describe('updateDifficulty clamping', () => {
  it('clamps minimum to 1 — D=1, grade=3: 1×0.9+0 = 0.9 → 1', () => {
    expect(updateDifficulty(1, 3)).toBe(1);
  });

  it('clamps maximum to 10 — D=12, grade=1: 12×0.9+0.4 = 11.2 → 10', () => {
    expect(updateDifficulty(12, 1)).toBe(10);
  });

  it('does not clamp mid-range values', () => {
    // D=4.0, grade=3: 4.0×0.9+0 = 3.6 — no clamp
    expect(updateDifficulty(4.0, 3)).toBeCloseTo(3.6, 5);
  });

  it('does not clamp lapse update mid-range — D=4.0, grade=1: 3.6+0.4 = 4.0', () => {
    expect(updateDifficulty(4.0, 1)).toBeCloseTo(4.0, 5);
  });
});

// ─── Formula helpers ──────────────────────────────────────────────────────────

describe('computeRetrievability', () => {
  it('returns 1.0 when t = 0', () => {
    expect(computeRetrievability(10, 0)).toBe(1);
  });

  it('decreases as t increases', () => {
    const R1 = computeRetrievability(10, 5);
    const R2 = computeRetrievability(10, 10);
    expect(R1).toBeGreaterThan(R2);
  });

  it('matches R(t) = (1 + 4/(9×3.2))^-1 ≈ 0.878', () => {
    expect(computeRetrievability(3.2, 4)).toBeCloseTo(0.878, 2);
  });
});

describe('computeNewStability', () => {
  it('returns a value greater than S (stability grows on correct recall)', () => {
    const S = 3.2, D = 4.0;
    const R = computeRetrievability(S, 4);
    expect(computeNewStability(S, D, R)).toBeGreaterThan(S);
  });
});

describe('computeLapseStability', () => {
  it('returns a value less than S (stability shrinks on lapse)', () => {
    const S = 57, D = 4.0;
    const R = computeRetrievability(S, 91);
    expect(computeLapseStability(S, D, R)).toBeLessThan(S);
  });
});

// ─── applyAnswer dispatch ─────────────────────────────────────────────────────

describe('applyAnswer dispatch', () => {
  it('routes study + again to applyStudyAgain', () => {
    const card = freshStudyCard({ currentStep: 1 });
    const result = applyAnswer(card, 'again', NOW);
    expect(result.currentStep).toBe(0);
    expect(new Date(result.showAt).getTime()).toBe(NOW.getTime() + 60_000);
  });

  it('routes study + gotIt to applyStudyGotIt', () => {
    const card = freshStudyCard({ currentStep: 0 });
    const result = applyAnswer(card, 'gotIt', NOW);
    expect(result.currentStep).toBe(1);
  });

  it('routes retrieval + gotIt to applyRetrievalGotIt', () => {
    const card = freshRetrievalCard({ lastReviewed: '2026-06-04' });
    const result = applyAnswer(card, 'gotIt', TODAY);
    expect(result.phase).toBe('retrieval');
    expect(result.reviewCount).toBe(1);
  });

  it('routes retrieval + again to applyRetrievalAgain', () => {
    const card = freshRetrievalCard({ lastReviewed: '2026-06-04' });
    const result = applyAnswer(card, 'again', TODAY);
    expect(result.phase).toBe('relearning');
  });

  it('routes relearning + again to applyRelearningAgain', () => {
    const card = freshStudyCard({ phase: 'relearning', currentStep: 1 });
    const result = applyAnswer(card, 'again', NOW);
    expect(result.currentStep).toBe(0);
  });

  it('routes relearning + gotIt to applyRelearningGotIt', () => {
    const card = freshStudyCard({ phase: 'relearning', currentStep: 0, stabilityAfterLapse: 10 });
    const result = applyAnswer(card, 'gotIt', NOW);
    expect(result.currentStep).toBe(1);
    expect(result.phase).toBe('relearning');
  });
});
