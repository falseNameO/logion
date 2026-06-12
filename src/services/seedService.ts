import { getDatabase } from '../database/db';

import vocabulary from '../seeds/vocabulary.json';
import textbookMappings from '../seeds/textbookMappings.json';
import ntChapterMappings from '../seeds/ntChapterMappings.json';
import principalParts from '../seeds/principalParts.json';

// ─── Seed data types (match JSON shape exactly) ───────────────────────────────

interface VocabEntry {
  id: number;
  greek: string;
  english: string;
  partOfSpeech: string;
  root: string | null;
  ntFrequency: number;
  englishDerivatives: string | null;
  imagePath: string | null;
  audioFrontPath: string | null;
  audioBackPath: string | null;
}

interface TextbookMapping {
  wordId: number;
  textbookSlug: string;
  chapter: number;
}

interface NtChapterMapping {
  wordId: number;
  book: string;
  chapter: number;
}

interface PrincipalPartsEntry {
  wordId: number;
  present: string | null;
  future: string | null;
  aoristActive: string | null;
  perfectActive: string | null;
  perfectPassive: string | null;
  aoristPassive: string | null;
}

// ─── Seed runner ──────────────────────────────────────────────────────────────

// Current seed version. Bump this when seed data changes to trigger a reseed.
const CURRENT_SEED_VERSION = 2;

/**
 * Checks schemaVersion on every launch.
 * - version 0 → fresh install, insert all seed data, advance to CURRENT_SEED_VERSION.
 * - version 1 → old placeholder seed (10 words), wipe and reseed with full dataset.
 * - version >= CURRENT_SEED_VERSION → nothing to do.
 *
 * Uses chunked transactions (500 rows per chunk) to avoid blocking the JS thread
 * for the full 53,000+ row dataset on first install.
 */
export async function runSeedIfNeeded(): Promise<void> {
  const db = getDatabase();

  const row = await db.getFirstAsync<{ version: number }>(
    'SELECT version FROM schemaVersion LIMIT 1',
  );

  const version = row?.version ?? 0;
  if (version >= CURRENT_SEED_VERSION) return;

  if (version === 1) {
    // Wipe the old placeholder data before re-seeding.
    await db.withExclusiveTransactionAsync(async (txn) => {
      await txn.runAsync('DELETE FROM principalParts');
      await txn.runAsync('DELETE FROM ntChapterWords');
      await txn.runAsync('DELETE FROM textbookChapters');
      await txn.runAsync('DELETE FROM words');
    });
  }

  await insertWords(db);
  await insertTextbookMappings(db);
  await insertNtChapterMappings(db);
  await insertPrincipalParts(db);

  await db.runAsync('UPDATE schemaVersion SET version = ?', CURRENT_SEED_VERSION);
}

// ─── Chunked insert helpers ───────────────────────────────────────────────────
// Each helper breaks its dataset into 500-row transactions. This keeps individual
// transactions short so the JS thread stays responsive during the seed pass.

const CHUNK = 500;

async function insertWords(db: ReturnType<typeof getDatabase>): Promise<void> {
  const rows = vocabulary as VocabEntry[];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    await db.withExclusiveTransactionAsync(async (txn) => {
      for (const entry of chunk) {
        await txn.runAsync(
          `INSERT OR IGNORE INTO words
             (id, greek, english, partOfSpeech, root, ntFrequency,
              englishDerivatives, imagePath, audioFrontPath, audioBackPath)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          entry.id, entry.greek, entry.english, entry.partOfSpeech,
          entry.root, entry.ntFrequency, entry.englishDerivatives,
          entry.imagePath, entry.audioFrontPath, entry.audioBackPath,
        );
      }
    });
  }
}

async function insertTextbookMappings(db: ReturnType<typeof getDatabase>): Promise<void> {
  const rows = textbookMappings as TextbookMapping[];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    await db.withExclusiveTransactionAsync(async (txn) => {
      for (const m of chunk) {
        await txn.runAsync(
          `INSERT OR IGNORE INTO textbookChapters (wordId, textbookSlug, chapter)
           VALUES (?, ?, ?)`,
          m.wordId, m.textbookSlug, m.chapter,
        );
      }
    });
  }
}

async function insertNtChapterMappings(db: ReturnType<typeof getDatabase>): Promise<void> {
  const rows = ntChapterMappings as NtChapterMapping[];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    await db.withExclusiveTransactionAsync(async (txn) => {
      for (const m of chunk) {
        await txn.runAsync(
          `INSERT OR IGNORE INTO ntChapterWords (wordId, book, chapter)
           VALUES (?, ?, ?)`,
          m.wordId, m.book, m.chapter,
        );
      }
    });
  }
}

async function insertPrincipalParts(db: ReturnType<typeof getDatabase>): Promise<void> {
  const rows = principalParts as PrincipalPartsEntry[];
  if (rows.length === 0) return;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    await db.withExclusiveTransactionAsync(async (txn) => {
      for (const parts of chunk) {
        await txn.runAsync(
          `INSERT OR IGNORE INTO principalParts
             (wordId, present, future, aoristActive,
              perfectActive, perfectPassive, aoristPassive)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          parts.wordId, parts.present, parts.future, parts.aoristActive,
          parts.perfectActive, parts.perfectPassive, parts.aoristPassive,
        );
      }
    });
  }
}
