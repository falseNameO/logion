import { getDatabase } from './db';
import type { Mnemonic } from '../types';

// ─── Internal row shape returned by SQLite ────────────────────────────────────

interface MnemonicRow {
  id: number;
  wordId: number;
  textNote: string;
  imagePath: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Row → domain type mapper ─────────────────────────────────────────────────

function rowToMnemonic(row: MnemonicRow): Mnemonic {
  return {
    id: row.id,
    wordId: row.wordId,
    text: row.textNote,
    imageUri: row.imagePath,
    updatedAt: row.updatedAt,
  };
}

// ─── Exported query functions ─────────────────────────────────────────────────

export async function getMnemonic(wordId: number): Promise<Mnemonic | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync<MnemonicRow>(
    `SELECT id, wordId, textNote, imagePath, createdAt, updatedAt
     FROM mnemonics
     WHERE wordId = ?`,
    wordId,
  );
  return row ? rowToMnemonic(row) : null;
}

export async function saveMnemonic(
  wordId: number,
  textNote: string | null,
  imagePath: string | null,
): Promise<void> {
  const db = getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO mnemonics (wordId, textNote, imagePath, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (wordId) DO UPDATE SET
       textNote  = excluded.textNote,
       imagePath = excluded.imagePath,
       updatedAt = excluded.updatedAt`,
    wordId,
    textNote ?? '',
    imagePath,
    now,
    now,
  );
}

export async function deleteMnemonic(wordId: number): Promise<void> {
  const db = getDatabase();
  await db.runAsync(`DELETE FROM mnemonics WHERE wordId = ?`, wordId);
}
