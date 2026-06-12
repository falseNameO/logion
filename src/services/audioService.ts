import { Audio } from 'expo-av';
import { getWordById } from '../database/wordRepository';

// ─── Module-level Sound instance ─────────────────────────────────────────────

// A single Sound is reused for every playback request. The previous audio is
// always unloaded before a new source is loaded to avoid resource leaks.
let _sound: Audio.Sound | null = null;
let _volume: number = 1.0;

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function _unloadCurrent(): Promise<void> {
  if (_sound) {
    try {
      await _sound.unloadAsync();
    } catch {
      // Ignore errors from already-unloaded instances.
    }
    _sound = null;
  }
}

async function _loadAndPlay(path: string): Promise<void> {
  await _unloadCurrent();
  const { sound } = await Audio.Sound.createAsync(
    { uri: path },
    { shouldPlay: true, volume: _volume },
  );
  _sound = sound;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Loads a local audio file by URI path and begins playback immediately.
 */
export async function loadAudio(path: string): Promise<void> {
  await _loadAndPlay(path);
}

/**
 * Plays the front (Greek pronunciation) audio for the given word.
 * Fails silently if the word has no front audio file.
 */
export async function playFront(wordId: number): Promise<void> {
  const word = await getWordById(wordId);
  // audioFrontPath lives on the DB row but is not exposed on the Word domain
  // type — access it through the repository's internal shape via unknown cast.
  const path = (word as unknown as { audioFrontPath: string | null } | null)
    ?.audioFrontPath;
  if (!path) return;
  await _loadAndPlay(path);
}

/**
 * Plays the back (English gloss) audio for the given word.
 * Fails silently if the word has no back audio file.
 */
export async function playBack(wordId: number): Promise<void> {
  const word = await getWordById(wordId);
  const path = (word as unknown as { audioBackPath: string | null } | null)
    ?.audioBackPath;
  if (!path) return;
  await _loadAndPlay(path);
}

/**
 * Stops and unloads any currently playing audio.
 */
export async function stopAll(): Promise<void> {
  if (_sound) {
    try {
      await _sound.stopAsync();
    } catch {
      // Already stopped or unloaded — ignore.
    }
    await _unloadCurrent();
  }
}

/**
 * Sets the volume for all subsequent playback (0.0 – 1.0).
 * Applies immediately if audio is currently loaded.
 */
export async function setVolume(level: number): Promise<void> {
  _volume = Math.min(1, Math.max(0, level));
  if (_sound) {
    try {
      await _sound.setVolumeAsync(_volume);
    } catch {
      // Sound may have already finished — ignore.
    }
  }
}
