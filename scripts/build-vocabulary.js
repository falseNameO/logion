/**
 * build-vocabulary.js
 *
 * Builds two seed files from scratch:
 *   src/seeds/vocabulary.json        — all NT Greek lemmas with frequency + gloss
 *   src/seeds/ntChapterMappings.json — every lemma → NT book + chapter occurrence
 *
 * Data sources:
 *   1. OpenText-org GNT annotation (27 XML files, fetched from GitHub)
 *      → real NT occurrence counts per lemma
 *      → part-of-speech per lemma
 *      → book + chapter locations per lemma
 *   2. Strong's Greek Dictionary (local JS file)
 *      → English gloss (kjv_def)
 *      → definition (strongs_def)
 *      → etymology hint (derivation)
 *
 * Requirements: Node.js v18+ (uses native fetch, no extra dependencies)
 * Usage: node scripts/build-vocabulary.js
 */

'use strict';

const fs   = require('fs/promises');
const path = require('path');

// ─── Configuration ────────────────────────────────────────────────────────────

const STRONGS_PATH = path.resolve(
  process.env.STRONGS_PATH ||
  '/Users/gicumita/Downloads/strongs-greek-dictionary.js'
);

const OUT_VOCAB    = path.resolve(__dirname, '../src/seeds/vocabulary.json');
const OUT_CHAPTERS = path.resolve(__dirname, '../src/seeds/ntChapterMappings.json');

// Delay between HTTP requests to respect GitHub raw CDN limits (ms)
const FETCH_DELAY_MS = 500;

// ─── OpenText book list (exact filenames in the repo) ────────────────────────

const OPENTEXT_BOOKS = [
  '01_matthew',      '02_mark',          '03_luke',
  '04_john',         '05_acts',          '06_romans',
  '07_1corinthians', '08_2corinthians',  '09_galatians',
  '10_ephesians',    '11_philippians',   '12_colossians',
  '13_1thessalonians','14_2thessalonians','15_1timothy',
  '16_2timothy',     '17_titus',         '18_philemon',
  '19_hebrews',      '20_james',         '21_1peter',
  '22_2peter',       '23_1john',         '24_2john',
  '25_3john',        '26_jude',          '27_revelation',
];

const OPENTEXT_BASE =
  'https://raw.githubusercontent.com/OpenText-org/GNT_annotation_v1.0/master';

// ─── OpenText book-abbreviation → app book name ──────────────────────────────
// xml:id format: NA28.<Abbrev>.<chapter>.<verse>.w<n>
// App uses the full names defined in constants/index.ts NT_BOOKS.

const ABBREV_TO_BOOK = {
  Matt:   'Matthew',         Mark:    'Mark',
  Luke:   'Luke',            John:    'John',
  Acts:   'Acts',            Rom:     'Romans',
  '1Cor': '1 Corinthians',   '2Cor':  '2 Corinthians',
  Gal:    'Galatians',       Eph:     'Ephesians',
  Phil:   'Philippians',     Col:     'Colossians',
  '1Thess':'1 Thessalonians','2Thess':'2 Thessalonians',
  '1Tim': '1 Timothy',       '2Tim':  '2 Timothy',
  Titus:  'Titus',           Phlm:    'Philemon',
  Heb:    'Hebrews',         Jas:     'James',
  '1Pet': '1 Peter',         '2Pet':  '2 Peter',
  '1John':'1 John',          '2John': '2 John',
  '3John':'3 John',          Jude:    'Jude',
  Rev:    'Revelation',
};

// ─── OpenText POS → app PartOfSpeech ─────────────────────────────────────────
// OpenText uses granular verbal categories (finite/participle/infinitive).
// We normalise all three to 'verb' to match our PartOfSpeech type.

const POS_MAP = {
  noun:        'noun',
  finite:      'verb',
  participle:  'verb',
  infinitive:  'verb',
  adjective:   'adjective',
  pronoun:     'pronoun',
  preposition: 'preposition',
  adverb:      'adverb',
  article:     'article',
  particle:    'particle',
  conjunction: 'conjunction',
  interjection:'interjection',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Parses an XML attribute string into a plain object.
 * Handles namespaced attributes like xml:id.
 * Example input: `xml:id="NA28.John.1.1.w1" lemma="λόγος" pos="noun"`
 */
function parseAttributes(attrString) {
  const attrs = {};
  // [\w:-]+ covers regular names AND namespaced names like xml:id
  const re = /([\w:-]+)="([^"]*)"/g;
  let m;
  while ((m = re.exec(attrString)) !== null) {
    attrs[m[1].toLowerCase()] = m[2];
  }
  return attrs;
}

/**
 * Deduplicates and joins two comma-separated gloss strings.
 * e.g. "word, saying" + "account, word" → "word, saying, account"
 */
function mergeGlosses(a, b) {
  const parts = new Set(
    [...(a || '').split(','), ...(b || '').split(',')]
      .map(s => s.trim())
      .filter(Boolean)
  );
  return [...parts].join(', ');
}

/**
 * Attempts to extract a root hint from a Strong's derivation string.
 * Looks for the first Greek-script word inside parentheses.
 * e.g. "from G3056 (λόγος);" → "λόγος"
 * Returns null if nothing usable is found.
 */
function extractRootHint(derivation) {
  if (!derivation) return null;
  // Match content inside parens that contains at least one Greek character
  const re = /\(([^)]*[Ͱ-Ͽἀ-῿][^)]*)\)/g;
  let m;
  while ((m = re.exec(derivation)) !== null) {
    const candidate = m[1].trim();
    // Skip if it looks like a transliteration or Latin (no Greek chars dominant)
    if (/[Ͱ-Ͽἀ-῿]/.test(candidate)) {
      // Return the Greek lemma as a root hint (not a morpheme — best we can do automatically)
      return candidate;
    }
  }
  return null;
}

// ─── Phase 1: Fetch and parse all 27 OpenText XML files ──────────────────────

async function buildLemmaMap() {
  // lemmaData: Map<lemma_NFC, { count: number, posFreq: Map<string, number>, chapters: Set<string> }>
  // chapters entries are "BookName|chapterNumber" strings for deduplication
  const lemmaData = new Map();

  console.log('Phase 1 — Fetching 27 OpenText XML files...\n');

  for (const book of OPENTEXT_BOOKS) {
    const url = `${OPENTEXT_BASE}/${book}_full.xml`;
    process.stdout.write(`  Fetching ${book}... `);

    let xmlText;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        // A 404 or server error here means no data for this book — fatal.
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }
      xmlText = await res.text();
    } catch (err) {
      // Abort entirely — a partial vocabulary is worse than no vocabulary.
      console.error(`\nFATAL: Failed to fetch ${url}\n${err.message}`);
      process.exit(1);
    }

    let wordCount = 0;

    // Walk every <w ...> element (handles both <w .../> and <w ...>)
    const wRe = /<w\s+([^>]+?)(?:\s*\/)?>/g;
    let m;

    while ((m = wRe.exec(xmlText)) !== null) {
      const attrs = parseAttributes(m[1]);

      const rawLemma = attrs['lemma'];
      const rawPos   = attrs['pos'];
      const rawId    = attrs['xml:id'];   // e.g. "NA28.Phlm.1.1.w1"

      if (!rawLemma || !rawPos) continue;

      const lemma = rawLemma.normalize('NFC');
      const pos   = POS_MAP[rawPos.toLowerCase()] || 'other';

      // ── Tally frequency and POS ──────────────────────────────────────────
      if (!lemmaData.has(lemma)) {
        lemmaData.set(lemma, { count: 0, posFreq: new Map(), chapters: new Set() });
      }
      const entry = lemmaData.get(lemma);
      entry.count += 1;
      entry.posFreq.set(pos, (entry.posFreq.get(pos) ?? 0) + 1);

      // ── Extract book + chapter from xml:id ───────────────────────────────
      // Format: NA28.<Abbrev>.<chapter>.<verse>.w<n>
      if (rawId) {
        const parts = rawId.split('.');
        // parts[0] = "NA28", parts[1] = abbrev, parts[2] = chapter
        if (parts.length >= 3) {
          const abbrev  = parts[1];
          const chapter = parseInt(parts[2], 10);
          const appBook = ABBREV_TO_BOOK[abbrev];

          if (appBook && !isNaN(chapter)) {
            // Use a string key for deduplication — one row per word per chapter
            entry.chapters.add(`${appBook}|${chapter}`);
          }
        }
      }

      wordCount++;
    }

    console.log(`${wordCount} tokens`);
    await sleep(FETCH_DELAY_MS);
  }

  // ── Resolve dominant POS per lemma ────────────────────────────────────────
  const lemmaMap = new Map();
  for (const [lemma, data] of lemmaData) {
    let dominantPos = 'other';
    let maxCount    = -1;
    for (const [pos, freq] of data.posFreq) {
      if (freq > maxCount) { maxCount = freq; dominantPos = pos; }
    }
    lemmaMap.set(lemma, {
      count:    data.count,
      pos:      dominantPos,
      chapters: data.chapters,   // Set<"BookName|chapter">
    });
  }

  console.log(`\nPhase 1 complete — ${lemmaMap.size} unique lemmas extracted.\n`);
  return lemmaMap;
}

// ─── Phase 2: Build Strong's reverse index ────────────────────────────────────

async function buildStrongsIndex() {
  console.log('Phase 2 — Loading Strong\'s dictionary...');

  let raw;
  try {
    raw = await fs.readFile(STRONGS_PATH, 'utf8');
  } catch (err) {
    console.error(`FATAL: Cannot read Strong's file at ${STRONGS_PATH}`);
    console.error('Set the STRONGS_PATH environment variable if the file is elsewhere.');
    process.exit(1);
  }

  // Extract the JS object literal — the file assigns it to a var, so we
  // strip the variable declaration and trailing semicolon then JSON-parse it.
  // File ends with `}; module.exports = strongsGreekDictionary;` so we
  // match greedily up to the last `}` before the semicolon + module.exports.
  const objMatch = raw.match(/var\s+strongsGreekDictionary\s*=\s*(\{[\s\S]+\});/);
  if (!objMatch) {
    console.error('FATAL: Could not parse Strong\'s dictionary file — unexpected format.');
    process.exit(1);
  }

  let strongsDict;
  try {
    // JSON.parse is safe here; the file is a local trusted resource we control.
    strongsDict = JSON.parse(objMatch[1]);
  } catch (err) {
    console.error('FATAL: Strong\'s file is not valid JSON after extraction.');
    console.error(err.message);
    process.exit(1);
  }

  // Build reverse index: NFC-normalised Greek lemma → merged entry
  // { gloss: string, definition: string, rootHint: string|null }
  const index = new Map();

  for (const entry of Object.values(strongsDict)) {
    if (!entry.lemma) continue;

    const key = entry.lemma.normalize('NFC');

    const incoming = {
      gloss:      (entry.kjv_def    || '').trim(),
      definition: (entry.strongs_def || '').trim(),
      rootHint:   extractRootHint(entry.derivation),
    };

    if (!index.has(key)) {
      index.set(key, incoming);
    } else {
      // Homonym collision — merge glosses, keep the longer definition
      const existing = index.get(key);
      existing.gloss      = mergeGlosses(existing.gloss, incoming.gloss);
      existing.definition = existing.definition.length >= incoming.definition.length
        ? existing.definition
        : incoming.definition;
      // Keep whichever rootHint is non-null
      if (!existing.rootHint && incoming.rootHint) {
        existing.rootHint = incoming.rootHint;
      }
    }
  }

  console.log(`Phase 2 complete — ${index.size} Strong's entries indexed.\n`);
  return index;
}

// ─── Phase 3 + 4: Merge, sort, assign IDs ─────────────────────────────────────

function buildOutputs(lemmaMap, strongsIndex) {
  console.log('Phase 3 — Merging data and building output rows...');

  let matchedCount   = 0;
  let unmatchedCount = 0;

  const rawRows = [];

  for (const [lemma, data] of lemmaMap) {
    const strongs = strongsIndex.get(lemma);

    if (strongs) {
      matchedCount++;
    } else {
      unmatchedCount++;
    }

    // english: prefer kjv_def (concise gloss), fall back to truncated strongs_def
    let english = strongs?.gloss || '';
    if (!english && strongs?.definition) {
      // Truncate at first sentence or 60 chars
      english = strongs.definition.replace(/^[\s,;]+/, '').split(/[.;]/)[0].trim();
      if (english.length > 60) english = english.slice(0, 57) + '…';
    }
    if (!english) english = '(gloss unavailable)';

    rawRows.push({
      // id assigned after sort
      greek:              lemma,
      english,
      partOfSpeech:       data.pos,
      root:               strongs?.rootHint ?? null,
      ntFrequency:        data.count,
      englishDerivatives: null,    // not reliably extractable from Strong's
      imagePath:          null,
      audioFrontPath:     null,
      audioBackPath:      null,
      // Internal — used to build ntChapterMappings, stripped before writing
      _chapters:          data.chapters,
    });
  }

  // Sort by frequency DESC — SRS introduces words in this order within any scope
  rawRows.sort((a, b) => b.ntFrequency - a.ntFrequency);

  // Assign sequential IDs
  rawRows.forEach((row, i) => { row.id = i + 1; });

  // ── vocabulary.json rows (strip internal _chapters field) ─────────────────
  const vocabRows = rawRows.map(({ _chapters, ...rest }) => rest);

  // ── ntChapterMappings.json rows ───────────────────────────────────────────
  const chapterRows = [];
  for (const row of rawRows) {
    for (const entry of row._chapters) {
      const [book, chapterStr] = entry.split('|');
      chapterRows.push({ wordId: row.id, book, chapter: parseInt(chapterStr, 10) });
    }
  }
  // Sort for readability: by wordId, then book canonical order, then chapter
  chapterRows.sort((a, b) =>
    a.wordId !== b.wordId ? a.wordId - b.wordId :
    a.book   !== b.book   ? a.book.localeCompare(b.book) :
    a.chapter - b.chapter
  );

  console.log(`Phase 3 complete.\n`);

  return { vocabRows, chapterRows, matchedCount, unmatchedCount };
}

// ─── Phase 5: Write outputs + print summary ────────────────────────────────────

async function writeOutputs(vocabRows, chapterRows, matchedCount, unmatchedCount) {
  console.log('Phase 4 — Writing seed files...');

  await fs.writeFile(OUT_VOCAB,    JSON.stringify(vocabRows,    null, 2), 'utf8');
  await fs.writeFile(OUT_CHAPTERS, JSON.stringify(chapterRows,  null, 2), 'utf8');

  console.log(`  ✓ ${OUT_VOCAB}`);
  console.log(`  ✓ ${OUT_CHAPTERS}\n`);

  // ── Summary report ────────────────────────────────────────────────────────
  const total      = vocabRows.length;
  const matchPct   = ((matchedCount / total) * 100).toFixed(1);
  const maxFreq    = vocabRows[0]?.ntFrequency ?? 0;
  const maxLemma   = vocabRows[0]?.greek ?? '';
  const tier1Count = vocabRows.filter(w => w.ntFrequency >= 50).length;
  const tier2Count = vocabRows.filter(w => w.ntFrequency >= 25 && w.ntFrequency < 50).length;
  const tier3Count = vocabRows.filter(w => w.ntFrequency >= 1  && w.ntFrequency < 25).length;

  console.log('═══════════════════════════════════════════');
  console.log('  Build complete — Summary');
  console.log('═══════════════════════════════════════════');
  console.log(`  Total lemmas:           ${total}`);
  console.log(`  Matched to Strong's:    ${matchedCount} (${matchPct}%)`);
  console.log(`  Unmatched (no gloss):   ${unmatchedCount}`);
  console.log(`  Chapter mapping rows:   ${chapterRows.length}`);
  console.log(`  Most frequent word:     ${maxLemma} (${maxFreq}×)`);
  console.log(`  ─────────────────────────────────────────`);
  console.log(`  Frequency ≥ 50×:        ${tier1Count}  (WheelPicker tier 1)`);
  console.log(`  Frequency 25–49×:       ${tier2Count}  (WheelPicker tier 2)`);
  console.log(`  Frequency 1–24×:        ${tier3Count}  (WheelPicker tier 3)`);
  console.log('═══════════════════════════════════════════\n');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║      LexiGreek Vocabulary Builder        ║');
  console.log('╚══════════════════════════════════════════╝\n');

  const lemmaMap    = await buildLemmaMap();
  const strongsIdx  = await buildStrongsIndex();
  const { vocabRows, chapterRows, matchedCount, unmatchedCount } =
    buildOutputs(lemmaMap, strongsIdx);

  await writeOutputs(vocabRows, chapterRows, matchedCount, unmatchedCount);
}

main().catch(err => {
  console.error('\nUnhandled error:', err);
  process.exit(1);
});
