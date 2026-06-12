// ─── Scope ───────────────────────────────────────────────────────────────────

/**
 * The category of vocabulary scope the user has chosen to study.
 *
 * - `'bible_chapter'` – words tied to one or more NT book/chapter references
 * - `'textbook'`      – words tied to a specific chapter range in a Greek textbook
 * - `'frequency'`     – words filtered by how often they appear in the NT
 */
export type ScopeType = 'bible_chapter' | 'textbook' | 'frequency';

/**
 * The user's chosen study scope, set on HomeScreen and persisted through
 * the whole session via `scopeStore`.
 *
 * Fields are optional because each `ScopeType` uses a different subset of them.
 */
export interface ScopeConfig {
  /** Which kind of scope filter is active. */
  type: ScopeType;

  // ── bible_chapter fields ──────────────────────────────────────────────────

  /** NT book name (e.g. `"John"`). Used when `type === 'bible_chapter'`. */
  book?: string;

  // ── bible_chapter + textbook shared fields ────────────────────────────────

  /** Inclusive start chapter of the range. Used by `'bible_chapter'` and `'textbook'`. */
  chapterStart?: number;

  /** Inclusive end chapter of the range. Used by `'bible_chapter'` and `'textbook'`. */
  chapterEnd?: number;

  // ── textbook fields ───────────────────────────────────────────────────────

  /** Short identifier for the textbook (e.g. `"mounce"`). Used when `type === 'textbook'`. */
  textbookSlug?: string;

  // ── frequency fields ──────────────────────────────────────────────────────

  /** Minimum NT occurrence count (inclusive). Used when `type === 'frequency'`. */
  frequencyMin?: number;

  /** Maximum NT occurrence count (inclusive). Used when `type === 'frequency'`. */
  frequencyMax?: number;
}

// ─── Card phase ───────────────────────────────────────────────────────────────

/**
 * The current SRS stage of a flashcard.
 *
 * - `'study'`      – word has not yet graduated; lives in LearnScreen
 * - `'relearning'` – word lapsed in retrieval; cycling through short re-learn steps
 * - `'retrieval'`  – word has graduated; scheduled via FSRS in RetrievalQuizScreen
 */
export type CardPhase = 'study' | 'relearning' | 'retrieval';

// ─── Card state ───────────────────────────────────────────────────────────────

/**
 * Full persisted state of a single flashcard in the SRS system.
 * Stored in the `progress` table and managed exclusively by `srsEngine.ts`.
 */
export interface CardState {
  // ── Identity ────────────────────────────────────────────────────────────

  /** Foreign key to the `words` table. */
  wordId: number;

  // ── Phase ────────────────────────────────────────────────────────────────

  /** Current SRS stage of this card. */
  phase: CardPhase;

  // ── Study & relearning ────────────────────────────────────────────────────

  /** Which step within the current phase the card is on (0, 1, or 2). */
  currentStep: number;

  /**
   * `true` when the card has completed all study steps and is waiting for one
   * final "Got It" to graduate into retrieval phase.
   */
  pendingGraduation: boolean;

  /** Earliest ISO timestamp at which this card may be shown again (study/relearning). */
  showAt: string;

  // ── FSRS fields ───────────────────────────────────────────────────────────

  /** Stability (S): expected duration in days before the memory decays below threshold. */
  stability: number;

  /** Difficulty (D): how hard this card is, from 1 (easy) to 10 (hard). */
  difficulty: number;

  /** ISO date string of the most recent retrieval-phase review. */
  lastReviewed: string;

  /** ISO date string of the next scheduled retrieval-phase review. */
  nextReview: string;

  /**
   * Stability value saved at the moment of a lapse, used to restore S when the
   * card re-graduates through relearning steps.
   */
  stabilityAfterLapse: number;

  // ── Tracking ──────────────────────────────────────────────────────────────

  /** Total number of times this card has lapsed (answered wrong in retrieval). */
  lapseCount: number;

  /** Total number of retrieval-phase reviews completed for this card. */
  reviewCount: number;
}

// ─── Vocabulary supporting types ─────────────────────────────────────────────

/**
 * A NT sentence example for a word, shown in the WordInfoSheet "Bible Verse" tab.
 * Maps directly to a row in the `examples` table.
 */
export interface Example {
  /** Primary key. */
  id: number;
  /** Foreign key to `words.id`. */
  wordId: number;
  /** Scripture reference, e.g. `"John 3:16"`. */
  reference: string;
  /** Full Greek sentence containing the word. */
  greekSentence: string;
  /** English translation of the sentence. */
  englishSentence: string;
}

/**
 * The six principal parts of a Greek verb.
 * Maps directly to a row in the `principalParts` table.
 * `null` fields mean that form does not exist for this verb.
 */
export interface PrincipalParts {
  /** Foreign key to `words.id`. */
  wordId: number;
  /** 1st principal part: present active indicative 1sg. */
  present: string | null;
  /** 2nd principal part: future active indicative 1sg. */
  future: string | null;
  /** 3rd principal part: aorist active indicative 1sg. */
  aoristActive: string | null;
  /** 4th principal part: perfect active indicative 1sg. */
  perfectActive: string | null;
  /** 5th principal part: perfect middle/passive indicative 1sg. */
  perfectPassive: string | null;
  /** 6th principal part: aorist passive indicative 1sg. */
  aoristPassive: string | null;
}

// ─── Vocabulary word ──────────────────────────────────────────────────────────

/**
 * Part of speech for a Greek vocabulary entry.
 */
export type PartOfSpeech =
  | 'noun'
  | 'verb'
  | 'adjective'
  | 'adverb'
  | 'preposition'
  | 'conjunction'
  | 'particle'
  | 'pronoun'
  | 'article'
  | 'interjection'
  | 'other';

/**
 * A single Greek vocabulary entry as stored in the `words` table and seed data.
 */
export interface Word {
  /** Unique numeric identifier from the `words` table. */
  id: number;

  /** Greek lemma in Unicode (e.g. `'λόγος'`). */
  greek: string;

  /** Short English gloss shown on the card back. */
  gloss: string;

  /** Extended definition shown in WordInfoSheet. */
  definition: string;

  /** Part of speech. */
  partOfSpeech: PartOfSpeech;

  /** Number of occurrences in the Greek NT (used by frequency scope). */
  ntFrequency: number;

  /**
   * Verb principal parts in order: present, future, aorist active, perfect active,
   * perfect middle/passive, aorist passive. `null` for non-verbs.
   */
  principalParts: string[] | null;

  /** Map of textbook slug → chapter number where this word is introduced. */
  textbookChapters: Record<string, number>;

  /** Map of NT book name → chapter number where this word first appears. */
  ntChapters: Record<string, number>;

  /** Greek root the word belongs to (e.g. `'λογ-'`). `null` if unknown. */
  root: string | null;

  /**
   * Comma-separated English words derived from the same Greek root
   * (e.g. `'logic, dialogue, theology'`). `null` if none recorded.
   */
  englishDerivatives: string | null;
}

// ─── Session state ────────────────────────────────────────────────────────────

/**
 * The study mode the user is currently in.
 *
 * - `'overview'`   – browse cards in slideshow/manual mode (OverviewScreen)
 * - `'learn'`      – active SRS learning with Again / Got It buttons (LearnScreen)
 * - `'retrieval'`  – FSRS-scheduled recall quiz (RetrievalQuizScreen)
 */
export type StudyMode = 'overview' | 'learn' | 'retrieval';

/**
 * Live state of an active quiz/learn session, kept in `sessionStore`.
 * Never persisted to the database.
 */
export interface SessionState {
  /** Words queued for this session, in display order. */
  queue: Word[];

  /** Index into `queue` for the currently displayed card. */
  currentIndex: number;

  /** Number of cards answered correctly (Got It) in this session. */
  correctCount: number;

  /** Number of cards answered incorrectly (Again) in this session. */
  againCount: number;

  /** Whether the session has ended. */
  isComplete: boolean;
}

// ─── Mnemonic ─────────────────────────────────────────────────────────────────

/**
 * A user-created mnemonic for a vocabulary word, stored in the `mnemonics` table.
 */
export interface Mnemonic {
  /** Primary key. */
  id: number;

  /** Foreign key to `words.id`. */
  wordId: number;

  /** The mnemonic text note. Empty string if the user only added an image. */
  text: string;

  /**
   * Local file URI of a mnemonic photo chosen from the camera or photo library.
   * `null` if no image has been attached.
   */
  imageUri: string | null;

  /** ISO-8601 datetime when this mnemonic was last updated. */
  updatedAt: string;
}

// ─── Settings ─────────────────────────────────────────────────────────────────

/**
 * User-configurable app-level preferences, persisted in `settingsStore`.
 */
export interface AppSettings {
  /** Whether audio pronunciation plays automatically when a card is revealed. */
  autoPlayAudio: boolean;

  /** Whether to show the NT frequency badge on card fronts. */
  showFrequency: boolean;

  /** Whether the user has unlocked premium features via IAP. */
  isPremium: boolean;
}

// ─── Navigation ───────────────────────────────────────────────────────────────

/**
 * Parameter map for the root stack navigator.
 * Each key is a screen name; the value is its required route params (or `undefined`).
 */
export type RootStackParamList = {
  /** Scope type picker + recents list. */
  Home: undefined;
  /** Pick NT book + chapter range. */
  BibleChapterScope: undefined;
  /** Pick textbook + chapter range. */
  TextbookScope: undefined;
  /** Pick frequency min/max via dual wheel. */
  FrequencyScope: undefined;
  /** Study vs Retrieve mode picker. */
  ModeSelect: undefined;
  /** Word list for chosen scope with POS/direction filters. */
  VocabList: undefined;
  /** Slideshow / browse flashcards. */
  Overview: { words: Word[] } | undefined;
  /** Active SRS learning (Again / Got It). */
  Learn: undefined;
  /** Stats on graduated words + cooldown info. */
  RetrievalDash: undefined;
  /** Active retrieval with FSRS scheduling. */
  RetrievalQuiz: undefined;
  /** Pronunciation, theme, reset progress, restore purchases. */
  Settings: undefined;
};
