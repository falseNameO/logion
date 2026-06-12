-- Logion database schema — reference only, not executed directly.
-- The authoritative CREATE TABLE statements live in src/database/db.ts.

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- Core vocabulary entries (~5400 NT Greek words).
CREATE TABLE IF NOT EXISTS words (
  id                 INTEGER PRIMARY KEY NOT NULL,
  greek              TEXT    NOT NULL,           -- Greek lemma in Unicode, e.g. "λόγος"
  english            TEXT    NOT NULL,           -- Primary English gloss
  partOfSpeech       TEXT    NOT NULL,           -- noun | verb | adjective | ...
  root               TEXT,                       -- Greek root for etymology display
  ntFrequency        INTEGER NOT NULL DEFAULT 0, -- Occurrence count in the Greek NT
  englishDerivatives TEXT,                       -- Comma-separated English words derived from this root
  imagePath          TEXT,                       -- Bundled mnemonic image asset path (optional)
  audioFrontPath     TEXT,                       -- Audio file for the Greek pronunciation
  audioBackPath      TEXT                        -- Audio file for the English gloss (optional)
);

-- NT sentence examples for a word, shown in the WordInfoSheet "Bible Verse" tab.
CREATE TABLE IF NOT EXISTS examples (
  id              INTEGER PRIMARY KEY NOT NULL,
  wordId          INTEGER NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  reference       TEXT    NOT NULL,              -- e.g. "John 3:16"
  greekSentence   TEXT    NOT NULL,              -- Full Greek sentence
  englishSentence TEXT    NOT NULL               -- English translation
);

-- Verb principal parts (present, future, aorist active, perfect active,
-- perfect middle/passive, aorist passive). One row per verb.
CREATE TABLE IF NOT EXISTS principalParts (
  id             INTEGER PRIMARY KEY NOT NULL,
  wordId         INTEGER NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  present        TEXT,
  future         TEXT,
  aoristActive   TEXT,
  perfectActive  TEXT,
  perfectPassive TEXT,
  aoristPassive  TEXT
);

-- Maps a word to the chapter where it is introduced in a given textbook.
-- One row per (word, textbook) pair.
CREATE TABLE IF NOT EXISTS textbookChapters (
  id           INTEGER PRIMARY KEY NOT NULL,
  wordId       INTEGER NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  textbookSlug TEXT    NOT NULL,                 -- e.g. "mounce" — matches TEXTBOOKS[].slug
  chapter      INTEGER NOT NULL
);

-- Maps a word to the NT book and chapter where it first appears.
-- One row per (word, book) pair.
CREATE TABLE IF NOT EXISTS ntChapterWords (
  id      INTEGER PRIMARY KEY NOT NULL,
  wordId  INTEGER NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  book    TEXT    NOT NULL,                      -- Full English book name, e.g. "Romans"
  chapter INTEGER NOT NULL
);

-- SRS progress record for each word the user has encountered.
-- One row per word; created on first exposure, updated by srsEngine.ts.
-- pendingGraduation stored as 0/1 integer (SQLite has no boolean type).
CREATE TABLE IF NOT EXISTS progress (
  id                  INTEGER PRIMARY KEY NOT NULL,
  wordId              INTEGER NOT NULL UNIQUE REFERENCES words(id) ON DELETE CASCADE,
  phase               TEXT    NOT NULL DEFAULT 'study',  -- 'study' | 'relearning' | 'retrieval'
  currentStep         INTEGER NOT NULL DEFAULT 0,
  pendingGraduation   INTEGER NOT NULL DEFAULT 0,        -- 0 = false, 1 = true
  showAt              TEXT,                              -- ISO timestamp; earliest next show time
  stability           REAL    NOT NULL DEFAULT 3.2,      -- FSRS S, in days
  difficulty          REAL    NOT NULL DEFAULT 4.0,      -- FSRS D, 1–10
  lastReviewed        TEXT,                              -- ISO date of last retrieval review
  nextReview          TEXT,                              -- ISO date of next scheduled retrieval
  stabilityAfterLapse REAL    NOT NULL DEFAULT 0.0,      -- S saved at lapse, restored on re-graduation
  lapseCount          INTEGER NOT NULL DEFAULT 0,
  reviewCount         INTEGER NOT NULL DEFAULT 0
);

-- Personal mnemonic per word (text note and/or photo). One row per word.
CREATE TABLE IF NOT EXISTS mnemonics (
  id        INTEGER PRIMARY KEY NOT NULL,
  wordId    INTEGER NOT NULL UNIQUE REFERENCES words(id) ON DELETE CASCADE,
  textNote  TEXT    NOT NULL DEFAULT '',         -- User's mnemonic note (may be empty)
  imagePath TEXT,                                -- Local URI of user's mnemonic photo (optional)
  createdAt TEXT    NOT NULL,                    -- ISO-8601 datetime
  updatedAt TEXT    NOT NULL                     -- ISO-8601 datetime
);

-- Single-row table that records the current schema version.
-- Increment when running migrations in future app versions.
CREATE TABLE IF NOT EXISTS schemaVersion (
  version INTEGER NOT NULL
);
