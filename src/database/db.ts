import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'logion.db';

let _db: SQLite.SQLiteDatabase | null = null;

/**
 * Returns the open database instance. Throws if called before initializeDatabase().
 */
export function getDatabase(): SQLite.SQLiteDatabase {
  if (!_db) {
    throw new Error('Database not initialized. Call initializeDatabase() at app startup.');
  }
  return _db;
}

/**
 * Opens logion.db and creates all tables if they do not already exist.
 * Call once in App.tsx before rendering any screens.
 */
export async function initializeDatabase(): Promise<void> {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS words (
      id                 INTEGER PRIMARY KEY NOT NULL,
      greek              TEXT    NOT NULL,
      english            TEXT    NOT NULL,
      partOfSpeech       TEXT    NOT NULL,
      root               TEXT,
      ntFrequency        INTEGER NOT NULL DEFAULT 0,
      englishDerivatives TEXT,
      imagePath          TEXT,
      audioFrontPath     TEXT,
      audioBackPath      TEXT
    );

    CREATE TABLE IF NOT EXISTS examples (
      id              INTEGER PRIMARY KEY NOT NULL,
      wordId          INTEGER NOT NULL REFERENCES words(id) ON DELETE CASCADE,
      reference       TEXT    NOT NULL,
      greekSentence   TEXT    NOT NULL,
      englishSentence TEXT    NOT NULL
    );

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

    CREATE TABLE IF NOT EXISTS textbookChapters (
      id           INTEGER PRIMARY KEY NOT NULL,
      wordId       INTEGER NOT NULL REFERENCES words(id) ON DELETE CASCADE,
      textbookSlug TEXT    NOT NULL,
      chapter      INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ntChapterWords (
      id      INTEGER PRIMARY KEY NOT NULL,
      wordId  INTEGER NOT NULL REFERENCES words(id) ON DELETE CASCADE,
      book    TEXT    NOT NULL,
      chapter INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS progress (
      id                  INTEGER PRIMARY KEY NOT NULL,
      wordId              INTEGER NOT NULL UNIQUE REFERENCES words(id) ON DELETE CASCADE,
      phase               TEXT    NOT NULL DEFAULT 'study',
      currentStep         INTEGER NOT NULL DEFAULT 0,
      pendingGraduation   INTEGER NOT NULL DEFAULT 0,
      showAt              TEXT,
      stability           REAL    NOT NULL DEFAULT 3.2,
      difficulty          REAL    NOT NULL DEFAULT 4.0,
      lastReviewed        TEXT,
      nextReview          TEXT,
      stabilityAfterLapse REAL    NOT NULL DEFAULT 0.0,
      lapseCount          INTEGER NOT NULL DEFAULT 0,
      reviewCount         INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS mnemonics (
      id        INTEGER PRIMARY KEY NOT NULL,
      wordId    INTEGER NOT NULL UNIQUE REFERENCES words(id) ON DELETE CASCADE,
      textNote  TEXT    NOT NULL DEFAULT '',
      imagePath TEXT,
      createdAt TEXT    NOT NULL,
      updatedAt TEXT    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS schemaVersion (
      version INTEGER NOT NULL
    );
  `);

  const row = await db.getFirstAsync<{ version: number }>(
    'SELECT version FROM schemaVersion LIMIT 1'
  );
  if (!row) {
    // Version 0 = tables exist but seed data has not been loaded yet.
    // seedService.runSeedIfNeeded() checks for 0, loads all seed JSON, then
    // advances this to 1.
    await db.runAsync('INSERT INTO schemaVersion (version) VALUES (?)', 0);
  }

  _db = db;
}
