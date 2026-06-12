import type { ScopeType } from '../types';

// ─── Textbooks ────────────────────────────────────────────────────────────────

export interface TextbookMeta {
  /** Short identifier used in `ScopeConfig.textbookSlug` and seed data keys. */
  slug: string;
  /** Human-readable name shown in the UI. */
  displayName: string;
  /** Total number of vocabulary-bearing chapters in this edition. */
  chapterCount: number;
}

/**
 * All supported Greek textbooks with their scope slugs and chapter counts.
 * Order determines display order in TextbookScopeScreen.
 */
export const TEXTBOOKS: TextbookMeta[] = [
  { slug: 'mounce',          displayName: 'Mounce — Basics of Biblical Greek (3rd ed.)',          chapterCount: 36 },
  { slug: 'black',           displayName: 'Black — Learn to Read New Testament Greek (3rd ed.)',   chapterCount: 28 },
  { slug: 'croy',            displayName: 'Croy — A Primer of Biblical Greek',                     chapterCount: 28 },
  { slug: 'campbell',        displayName: 'Campbell — Greek: An Intensive Course',                 chapterCount: 20 },
  { slug: 'duff',            displayName: 'Duff — The Elements of New Testament Greek (3rd ed.)',  chapterCount: 37 },
  { slug: 'harris',          displayName: 'Harris — Learn New Testament Greek (3rd ed.)',          chapterCount: 40 },
  { slug: 'hewett',          displayName: 'Hewett — New Testament Greek: A Beginning and Intermediate Grammar', chapterCount: 29 },
  { slug: 'baugh',           displayName: 'Baugh — A New Testament Greek Primer (3rd ed.)',        chapterCount: 26 },
  { slug: 'porter',          displayName: 'Porter — Fundamentals of New Testament Greek',          chapterCount: 36 },
  { slug: 'stevens',         displayName: 'Stevens — Greek Is Great Gain',                        chapterCount: 40 },
  { slug: 'zacharias',       displayName: 'Zacharias — FlashGreek Vocabulary',                    chapterCount: 10 },
  { slug: 'merkle-plummer',  displayName: 'Merkle & Plummer — Greek for Life',                    chapterCount: 20 },
];

// ─── NT Books ─────────────────────────────────────────────────────────────────

export interface NtBookMeta {
  /** Full English book name used in `ScopeConfig.book` and seed data. */
  name: string;
  /** Total number of chapters in this book. */
  chapterCount: number;
}

/**
 * All 27 NT books in canonical order, with their chapter counts.
 */
export const NT_BOOKS: NtBookMeta[] = [
  { name: 'Matthew',           chapterCount: 28 },
  { name: 'Mark',              chapterCount: 16 },
  { name: 'Luke',              chapterCount: 24 },
  { name: 'John',              chapterCount: 21 },
  { name: 'Acts',              chapterCount: 28 },
  { name: 'Romans',            chapterCount: 16 },
  { name: '1 Corinthians',     chapterCount: 16 },
  { name: '2 Corinthians',     chapterCount: 13 },
  { name: 'Galatians',         chapterCount:  6 },
  { name: 'Ephesians',         chapterCount:  6 },
  { name: 'Philippians',       chapterCount:  4 },
  { name: 'Colossians',        chapterCount:  4 },
  { name: '1 Thessalonians',   chapterCount:  5 },
  { name: '2 Thessalonians',   chapterCount:  3 },
  { name: '1 Timothy',         chapterCount:  6 },
  { name: '2 Timothy',         chapterCount:  4 },
  { name: 'Titus',             chapterCount:  3 },
  { name: 'Philemon',          chapterCount:  1 },
  { name: 'Hebrews',           chapterCount: 13 },
  { name: 'James',             chapterCount:  5 },
  { name: '1 Peter',           chapterCount:  5 },
  { name: '2 Peter',           chapterCount:  3 },
  { name: '1 John',            chapterCount:  5 },
  { name: '2 John',            chapterCount:  1 },
  { name: '3 John',            chapterCount:  1 },
  { name: 'Jude',              chapterCount:  1 },
  { name: 'Revelation',        chapterCount: 22 },
];

// ─── SRS parameters ───────────────────────────────────────────────────────────

/**
 * All tunable constants for the SRS engine, sourced from the AGENTS.md formula
 * reference. Change here to affect the entire scheduling system.
 */
export const SRS_PARAMS = {
  // ── Initial FSRS values assigned when a card graduates ───────────────────
  /** Starting stability (S₀) in days, assigned at graduation. */
  INITIAL_STABILITY: 3.2,
  /** Starting difficulty (D₀) assigned at graduation. */
  INITIAL_DIFFICULTY: 4.0,
  /** Days until the first retrieval review after graduation. */
  INITIAL_NEXT_REVIEW_DAYS: 3,

  // ── Study-phase step intervals (minutes) ─────────────────────────────────
  /** Step intervals for the study phase: [step-0 → step-1 → step-2]. */
  STUDY_STEPS_MINUTES: [1, 10, 1440] as const,

  // ── Relearning-phase step intervals (minutes) ────────────────────────────
  /** Step intervals for the relearning phase: [step-0 → step-1]. */
  RELEARNING_STEPS_MINUTES: [10, 1440] as const,

  // ── AGAIN penalty: how long to wait after pressing Again in study mode ───
  /** Minutes added to showAt when AGAIN is pressed at any study step. */
  AGAIN_DELAY_MINUTES: 1,

  // ── Lapse penalty multiplier ─────────────────────────────────────────────
  /** e^(-0.6) applied to stability on a lapse. */
  LAPSE_STABILITY_EXPONENT: -0.6,
  /** Difficulty exponent on a lapse (-0.28). */
  LAPSE_DIFFICULTY_EXPONENT: -0.28,
  /** Retrievability exponent on a lapse (0.43). */
  LAPSE_RETRIEVABILITY_EXPONENT: 0.43,

  // ── Got-It (retrieval) scheduling coefficients ───────────────────────────
  /** grade value assumed for a successful Got It in retrieval phase. */
  GOT_IT_GRADE: 3,
  /** Difficulty decay coefficient (0.9 per review). */
  DIFFICULTY_DECAY: 0.9,
  /** Stability exponent for retrievability calculation (D^-0.24). */
  STABILITY_D_EXPONENT: -0.24,
  /** Retrievability exponent in stability update (-0.72). */
  STABILITY_R_EXPONENT: -0.72,

  // ── Difficulty bounds ─────────────────────────────────────────────────────
  /** Minimum allowed difficulty value. */
  DIFFICULTY_MIN: 1,
  /** Maximum allowed difficulty value. */
  DIFFICULTY_MAX: 10,
} as const;

// ─── IAP product IDs ──────────────────────────────────────────────────────────

/**
 * App Store / Google Play product identifiers for in-app purchases.
 * These must match the product IDs configured in App Store Connect and
 * the Google Play Console exactly.
 */
export const IAP_PRODUCT_IDS = {
  /** One-time purchase that unlocks all premium features. */
  PRO_UNLOCK: 'com.logion.pro_unlock',

  /** Per-textbook unlocks — keys match `TextbookMeta.slug`. */
  TEXTBOOKS: {
    mounce:         'com.logion.textbook.mounce',
    black:          'com.logion.textbook.black',
    croy:           'com.logion.textbook.croy',
    campbell:       'com.logion.textbook.campbell',
    duff:           'com.logion.textbook.duff',
    harris:         'com.logion.textbook.harris',
    hewett:         'com.logion.textbook.hewett',
    baugh:          'com.logion.textbook.baugh',
    porter:         'com.logion.textbook.porter',
    stevens:        'com.logion.textbook.stevens',
    zacharias:      'com.logion.textbook.zacharias',
    'merkle-plummer': 'com.logion.textbook.merkle_plummer',
  },
} as const;

/** Convenience array of all IAP product ID strings (useful for `getProducts` calls). */
export const ALL_IAP_PRODUCT_IDS: string[] = [
  IAP_PRODUCT_IDS.PRO_UNLOCK,
  ...Object.values(IAP_PRODUCT_IDS.TEXTBOOKS),
];

// ─── Scope type labels ────────────────────────────────────────────────────────

/**
 * Display labels for each `ScopeType`, shown on HomeScreen.
 */
export const SCOPE_TYPE_LABELS: Record<ScopeType, string> = {
  bible_chapter: 'Bible Chapter',
  textbook:      'Textbook',
  frequency:     'Frequency',
};
