import { getDatabase } from './db';
import type { Word, Example, PrincipalParts, PartOfSpeech } from '../types';

// ─── Internal row shapes returned by SQLite ───────────────────────────────────

interface WordRow {
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
  /** GROUP_CONCAT of "slug:chapter" pairs from textbookChapters, or null. */
  textbookChaptersCsv: string | null;
  /** GROUP_CONCAT of "book:chapter" pairs from ntChapterWords, or null. */
  ntChaptersCsv: string | null;
}

interface ExampleRow {
  id: number;
  wordId: number;
  reference: string;
  greekSentence: string;
  englishSentence: string;
}

interface PrincipalPartsRow {
  wordId: number;
  present: string | null;
  future: string | null;
  aoristActive: string | null;
  perfectActive: string | null;
  perfectPassive: string | null;
  aoristPassive: string | null;
}

// ─── Row → domain type mappers ────────────────────────────────────────────────

function parseKvCsv(csv: string | null): Record<string, number> {
  if (!csv) return {};
  const result: Record<string, number> = {};
  for (const pair of csv.split(',')) {
    const colon = pair.lastIndexOf(':');
    if (colon === -1) continue;
    const key = pair.slice(0, colon);
    const val = parseInt(pair.slice(colon + 1), 10);
    if (key && !isNaN(val)) result[key] = val;
  }
  return result;
}

function rowToWord(row: WordRow): Word {
  return {
    id: row.id,
    greek: row.greek,
    gloss: row.english,
    definition: row.english,
    partOfSpeech: row.partOfSpeech as PartOfSpeech,
    ntFrequency: row.ntFrequency,
    principalParts: null,
    textbookChapters: parseKvCsv(row.textbookChaptersCsv),
    ntChapters: parseKvCsv(row.ntChaptersCsv),
    root: row.root,
    englishDerivatives: row.englishDerivatives,
  };
}

// ─── Base SELECT used by every word query ─────────────────────────────────────

// GROUP_CONCAT aggregates child rows so each word is returned as a single row.
// The separator '|' is used internally; keys and values are joined with ':'.
// lastIndexOf(':') in parseKvCsv safely handles book names that contain spaces.
const WORD_SELECT = `
  SELECT
    w.id,
    w.greek,
    w.english,
    w.partOfSpeech,
    w.root,
    w.ntFrequency,
    w.englishDerivatives,
    w.imagePath,
    w.audioFrontPath,
    w.audioBackPath,
    GROUP_CONCAT(DISTINCT tc.textbookSlug || ':' || tc.chapter) AS textbookChaptersCsv,
    GROUP_CONCAT(DISTINCT nc.book        || ':' || nc.chapter)  AS ntChaptersCsv
  FROM words w
  LEFT JOIN textbookChapters tc ON tc.wordId = w.id
  LEFT JOIN ntChapterWords   nc ON nc.wordId = w.id
`;

const WORD_GROUP_BY = `GROUP BY w.id`;

// ─── Exported query functions ─────────────────────────────────────────────────

export async function getWordById(id: number): Promise<Word | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync<WordRow>(
    `${WORD_SELECT} WHERE w.id = ? ${WORD_GROUP_BY}`,
    id,
  );
  return row ? rowToWord(row) : null;
}

export async function getWordsByIds(ids: number[]): Promise<Word[]> {
  if (ids.length === 0) return [];
  const db = getDatabase();
  const placeholders = ids.map(() => '?').join(', ');
  const rows = await db.getAllAsync<WordRow>(
    `${WORD_SELECT} WHERE w.id IN (${placeholders}) ${WORD_GROUP_BY}`,
    ids,
  );
  return rows.map(rowToWord);
}

export async function getWordsByFrequency(min: number, max: number): Promise<Word[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<WordRow>(
    `${WORD_SELECT} WHERE w.ntFrequency >= ? AND w.ntFrequency <= ? ${WORD_GROUP_BY} ORDER BY w.ntFrequency DESC`,
    min,
    max,
  );
  return rows.map(rowToWord);
}

export async function getWordsByTextbookChapter(
  slug: string,
  chapterStart: number,
  chapterEnd: number,
): Promise<Word[]> {
  const db = getDatabase();
  // Filter by the joining textbookChapters row so only words in the requested
  // range are returned, but still LEFT JOIN the full set of chapter mappings so
  // textbookChapters on the returned Word is complete.
  const rows = await db.getAllAsync<WordRow>(
    `${WORD_SELECT}
     WHERE w.id IN (
       SELECT wordId FROM textbookChapters
       WHERE textbookSlug = ? AND chapter >= ? AND chapter <= ?
     )
     ${WORD_GROUP_BY}
     ORDER BY (
       SELECT chapter FROM textbookChapters
       WHERE wordId = w.id AND textbookSlug = ?
       LIMIT 1
     ) ASC`,
    slug,
    chapterStart,
    chapterEnd,
    slug,
  );
  return rows.map(rowToWord);
}

export async function getWordsByNTChapter(
  book: string,
  chapterStart: number,
  chapterEnd: number,
): Promise<Word[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<WordRow>(
    `${WORD_SELECT}
     WHERE w.id IN (
       SELECT wordId FROM ntChapterWords
       WHERE book = ? AND chapter >= ? AND chapter <= ?
     )
     ${WORD_GROUP_BY}
     ORDER BY (
       SELECT chapter FROM ntChapterWords
       WHERE wordId = w.id AND book = ?
       LIMIT 1
     ) ASC`,
    book,
    chapterStart,
    chapterEnd,
    book,
  );
  return rows.map(rowToWord);
}

/**
 * Returns other words that share the same root as the given word.
 * Used by WordInfoSheet's Syntax tab to show the root family.
 */
export async function getWordsByRoot(root: string, excludeId: number): Promise<Word[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<WordRow>(
    `${WORD_SELECT} WHERE w.root = ? AND w.id != ? ${WORD_GROUP_BY} ORDER BY w.ntFrequency DESC LIMIT 10`,
    root,
    excludeId,
  );
  return rows.map(rowToWord);
}

export async function getExamplesForWord(wordId: number): Promise<Example[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<ExampleRow>(
    `SELECT id, wordId, reference, greekSentence, englishSentence
     FROM examples
     WHERE wordId = ?`,
    wordId,
  );
  return rows;
}

export async function getPrincipalPartsForWord(wordId: number): Promise<PrincipalParts | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync<PrincipalPartsRow>(
    `SELECT wordId, present, future, aoristActive, perfectActive, perfectPassive, aoristPassive
     FROM principalParts
     WHERE wordId = ?`,
    wordId,
  );
  return row ?? null;
}
