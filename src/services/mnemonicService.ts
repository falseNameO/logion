import * as FileSystem from 'expo-file-system/legacy';
import type { Mnemonic } from '../types';
import {
  getMnemonic as repoGet,
  saveMnemonic as repoSave,
  deleteMnemonic as repoDelete,
} from '../database/mnemonicRepository';

// ─── Directory ────────────────────────────────────────────────────────────────

// All mnemonic images land in <documents>/mnemonics/
const MNEMONICS_DIR = `${FileSystem.documentDirectory}mnemonics/`;

async function ensureMnemonicsDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(MNEMONICS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(MNEMONICS_DIR, { intermediates: true });
  }
}

function imagePathForWord(wordId: number): string {
  return `${MNEMONICS_DIR}${wordId}.jpg`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getMnemonic(wordId: number): Promise<Mnemonic | null> {
  return repoGet(wordId);
}

/**
 * Saves or replaces the text note for a word, leaving any existing image intact.
 */
export async function saveTextMnemonic(wordId: number, text: string): Promise<void> {
  const existing = await repoGet(wordId);
  await repoSave(wordId, text, existing?.imageUri ?? null);
}

/**
 * Copies the image at sourceUri into the app's documents directory under
 * mnemonics/<wordId>.jpg, then records the new path in the database.
 * Any existing image for this word is overwritten.
 */
export async function saveImageMnemonic(wordId: number, sourceUri: string): Promise<void> {
  await ensureMnemonicsDir();
  const dest = imagePathForWord(wordId);
  await FileSystem.copyAsync({ from: sourceUri, to: dest });

  const existing = await repoGet(wordId);
  await repoSave(wordId, existing?.text ?? '', dest);
}

/**
 * Deletes the mnemonic record from the database and removes the image file
 * from disk if one exists.
 */
export async function deleteMnemonic(wordId: number): Promise<void> {
  const existing = await repoGet(wordId);
  await repoDelete(wordId);

  if (existing?.imageUri) {
    const info = await FileSystem.getInfoAsync(existing.imageUri);
    if (info.exists) {
      await FileSystem.deleteAsync(existing.imageUri, { idempotent: true });
    }
  }
}

/**
 * Returns the local file URI of the mnemonic image for a word, or null if
 * none exists.
 */
export async function getMnemonicImageUri(wordId: number): Promise<string | null> {
  const mnemonic = await repoGet(wordId);
  return mnemonic?.imageUri ?? null;
}
