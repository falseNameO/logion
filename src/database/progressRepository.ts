import { getDatabase } from './db';
import type { CardState, CardPhase } from '../types';

// ─── Internal row shape returned by SQLite ────────────────────────────────────

interface ProgressRow {
  id: number;
  wordId: number;
  phase: string;
  currentStep: number;
  pendingGraduation: number; // stored as 0 / 1
  showAt: string | null;
  stability: number;
  difficulty: number;
  lastReviewed: string | null;
  nextReview: string | null;
  stabilityAfterLapse: number;
  lapseCount: number;
  reviewCount: number;
}

// ─── Row → domain type mapper ─────────────────────────────────────────────────

function rowToCardState(row: ProgressRow): CardState {
  return {
    wordId: row.wordId,
    phase: row.phase as CardPhase,
    currentStep: row.currentStep,
    pendingGraduation: row.pendingGraduation === 1,
    showAt: row.showAt ?? '',
    stability: row.stability,
    difficulty: row.difficulty,
    lastReviewed: row.lastReviewed ?? '',
    nextReview: row.nextReview ?? '',
    stabilityAfterLapse: row.stabilityAfterLapse,
    lapseCount: row.lapseCount,
    reviewCount: row.reviewCount,
  };
}

// ─── Helper: build a variable-length IN clause ────────────────────────────────

function inClause(ids: number[]): { sql: string; params: number[] } {
  return {
    sql: ids.map(() => '?').join(', '),
    params: ids,
  };
}

// ─── Exported query functions ─────────────────────────────────────────────────

export async function getProgress(wordId: number): Promise<CardState | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync<ProgressRow>(
    `SELECT * FROM progress WHERE wordId = ?`,
    wordId,
  );
  return row ? rowToCardState(row) : null;
}

export async function upsertProgress(state: CardState): Promise<void> {
  const db = getDatabase();
  await db.runAsync(
    `INSERT INTO progress (
       wordId, phase, currentStep, pendingGraduation, showAt,
       stability, difficulty, lastReviewed, nextReview,
       stabilityAfterLapse, lapseCount, reviewCount
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (wordId) DO UPDATE SET
       phase               = excluded.phase,
       currentStep         = excluded.currentStep,
       pendingGraduation   = excluded.pendingGraduation,
       showAt              = excluded.showAt,
       stability           = excluded.stability,
       difficulty          = excluded.difficulty,
       lastReviewed        = excluded.lastReviewed,
       nextReview          = excluded.nextReview,
       stabilityAfterLapse = excluded.stabilityAfterLapse,
       lapseCount          = excluded.lapseCount,
       reviewCount         = excluded.reviewCount`,
    state.wordId,
    state.phase,
    state.currentStep,
    state.pendingGraduation ? 1 : 0,
    state.showAt || null,
    state.stability,
    state.difficulty,
    state.lastReviewed || null,
    state.nextReview || null,
    state.stabilityAfterLapse,
    state.lapseCount,
    state.reviewCount,
  );
}

export async function getProgressByPhase(
  phase: 'study' | 'relearning' | 'retrieval',
  wordIds: number[],
): Promise<CardState[]> {
  if (wordIds.length === 0) return [];
  const db = getDatabase();
  const { sql, params } = inClause(wordIds);
  const rows = await db.getAllAsync<ProgressRow>(
    `SELECT * FROM progress WHERE phase = ? AND wordId IN (${sql})`,
    phase,
    ...params,
  );
  return rows.map(rowToCardState);
}

export async function getDueStudyCards(
  wordIds: number[],
  now: Date,
): Promise<CardState[]> {
  if (wordIds.length === 0) return [];
  const db = getDatabase();
  const { sql, params } = inClause(wordIds);
  // showAt is an ISO timestamp string; lexicographic comparison works correctly
  // for ISO-8601 strings with consistent formatting.
  const rows = await db.getAllAsync<ProgressRow>(
    `SELECT * FROM progress
     WHERE phase IN ('study', 'relearning')
       AND wordId IN (${sql})
       AND (showAt IS NULL OR showAt <= ?)
     ORDER BY showAt ASC`,
    ...params,
    now.toISOString(),
  );
  return rows.map(rowToCardState);
}

/**
 * Returns study/relearning cards that exist in the DB but are NOT yet due
 * (showAt > now). Used to prevent these from being re-introduced as "new" cards.
 */
export async function getCooldownStudyCards(
  wordIds: number[],
  now: Date,
): Promise<CardState[]> {
  if (wordIds.length === 0) return [];
  const db = getDatabase();
  const { sql, params } = inClause(wordIds);
  const rows = await db.getAllAsync<ProgressRow>(
    `SELECT * FROM progress
     WHERE phase IN ('study', 'relearning')
       AND wordId IN (${sql})
       AND showAt > ?
     ORDER BY showAt ASC`,
    ...params,
    now.toISOString(),
  );
  return rows.map(rowToCardState);
}

export async function getDueRetrievalCards(
  wordIds: number[],
  today: Date,
): Promise<CardState[]> {
  if (wordIds.length === 0) return [];
  const db = getDatabase();
  const { sql, params } = inClause(wordIds);
  // nextReview is an ISO date string (YYYY-MM-DD); compare against date portion only.
  const todayStr = today.toISOString().slice(0, 10);
  const rows = await db.getAllAsync<ProgressRow>(
    `SELECT * FROM progress
     WHERE phase = 'retrieval'
       AND wordId IN (${sql})
       AND nextReview <= ?
     ORDER BY nextReview ASC`,
    ...params,
    todayStr,
  );
  return rows.map(rowToCardState);
}

/**
 * Returns all retrieval-phase cards for the given word IDs, regardless of due date.
 * Used by RetrievalDashScreen to split due vs. cooldown words.
 */
export async function getAllRetrievalCards(wordIds: number[]): Promise<CardState[]> {
  if (wordIds.length === 0) return [];
  const db = getDatabase();
  const { sql, params } = inClause(wordIds);
  const rows = await db.getAllAsync<ProgressRow>(
    `SELECT * FROM progress WHERE phase = 'retrieval' AND wordId IN (${sql}) ORDER BY nextReview ASC`,
    ...params,
  );
  return rows.map(rowToCardState);
}

export async function getGraduatedCount(wordIds: number[]): Promise<number> {
  if (wordIds.length === 0) return 0;
  const db = getDatabase();
  const { sql, params } = inClause(wordIds);
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) AS count FROM progress
     WHERE phase = 'retrieval' AND wordId IN (${sql})`,
    ...params,
  );
  return row?.count ?? 0;
}

export async function getProgressForWords(wordIds: number[]): Promise<CardState[]> {
  if (wordIds.length === 0) return [];
  const db = getDatabase();
  const { sql, params } = inClause(wordIds);
  const rows = await db.getAllAsync<ProgressRow>(
    `SELECT * FROM progress WHERE wordId IN (${sql})`,
    ...params,
  );
  return rows.map(rowToCardState);
}

export async function resetProgress(wordId: number): Promise<void> {
  const db = getDatabase();
  await db.runAsync(`DELETE FROM progress WHERE wordId = ?`, wordId);
}

export async function resetAllProgress(): Promise<void> {
  const db = getDatabase();
  await db.runAsync(`DELETE FROM progress`);
}
