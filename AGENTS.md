# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.
# CLAUDE.md — Logion App Context

> This file is the single source of truth for the Logion project.
> Read this file at the start of every session before writing any code.

---

## What We Are Building

**Logion** is a React Native mobile app (iOS + Android) for learning New Testament Koine Greek vocabulary. It is inspired by the FlashGreek app by Danny Zacharias but built from scratch with a custom spaced-repetition system, a richer personal mnemonic feature, and a cleaner two-phase learning architecture.

The app is NOT a general flashcard app. It is specifically designed for students of Biblical Greek — seminary students, pastors, and serious Bible students — who want to build and maintain a deep vocabulary in Koine Greek.

---

## Tech Stack

| Concern | Technology |
|---|---|
| Framework | React Native (bare workflow, not Expo Go) |
| Build tooling | Expo (EAS Build) |
| Language | TypeScript (strict mode) |
| Navigation | React Navigation v6 (Native Stack) |
| State management | Zustand |
| Local database | SQLite via expo-sqlite |
| Audio | expo-av |
| Image picker | expo-image-picker |
| Animations | react-native-reanimated v3 |
| In-app purchase | react-native-iap |
| Testing | Jest + React Native Testing Library |

---

## Project Folder Structure

```
lexigreek/
├── CLAUDE.md                        ← you are here
├── app.json                         ← Expo config
├── tsconfig.json
├── package.json
├── src/
│   ├── types/
│   │   └── index.ts                 ← all shared TypeScript interfaces
│   ├── constants/
│   │   └── index.ts                 ← textbook slugs, NT books, IAP IDs, SRS params
│   ├── assets/
│   │   ├── audio/                   ← bundled .mp3 pronunciation files
│   │   └── images/                  ← bundled mnemonic images (system-provided)
│   ├── database/
│   │   ├── db.ts                    ← SQLite connection singleton + schema init
│   │   ├── schema.sql               ← master table definitions (reference only)
│   │   ├── wordRepository.ts        ← CRUD on `words` table
│   │   ├── progressRepository.ts    ← CRUD on `progress` table
│   │   └── mnemonicRepository.ts    ← CRUD on `mnemonics` table
│   ├── seeds/
│   │   ├── vocabulary.json          ← all NT Greek words (~5400 entries)
│   │   ├── textbookMappings.json    ← word → textbook + chapter
│   │   ├── ntChapterMappings.json   ← word → NT book + chapter
│   │   └── principalParts.json      ← verb principal parts
│   ├── services/
│   │   ├── seedService.ts           ← runs seed on first launch
│   │   ├── wordFilterService.ts     ← translates ScopeConfig → word list
│   │   ├── srsEngine.ts             ← ALL SRS logic (study, retrieval, relearning)
│   │   ├── quizEngine.ts            ← session state machine (start, answer, end)
│   │   ├── audioService.ts          ← expo-av wrapper
│   │   ├── mnemonicService.ts       ← save/load user mnemonics (text + image)
│   │   ├── iapService.ts            ← in-app purchase logic
│   │   └── recentsService.ts        ← save/load recent scope configs
│   ├── store/
│   │   ├── scopeStore.ts            ← active ScopeConfig the user chose
│   │   ├── sessionStore.ts          ← active quiz session state
│   │   └── settingsStore.ts         ← app-level preferences
│   ├── hooks/
│   │   ├── useStudySession.ts       ← study mode logic hook
│   │   ├── useRetrievalSession.ts   ← retrieval mode logic hook
│   │   └── useSlideshow.ts          ← overview (slideshow) logic hook
│   ├── navigation/
│   │   └── AppNavigator.tsx         ← root navigation stack + all route definitions
│   ├── screens/
│   │   ├── HomeScreen.tsx           ← scope type picker + recents
│   │   ├── scope/
│   │   │   ├── BibleChapterScopeScreen.tsx
│   │   │   ├── TextbookScopeScreen.tsx
│   │   │   └── FrequencyScopeScreen.tsx
│   │   ├── ModeSelectScreen.tsx     ← Study vs Retrieve (after scope chosen)
│   │   ├── study/
│   │   │   ├── VocabListScreen.tsx  ← word list + filter panel
│   │   │   ├── OverviewScreen.tsx   ← slideshow / browse flashcards
│   │   │   └── LearnScreen.tsx      ← active learning with SRS steps
│   │   ├── retrieval/
│   │   │   ├── RetrievalDashScreen.tsx ← cooldown info + start retrieval
│   │   │   └── RetrievalQuizScreen.tsx ← retrieval flashcard quiz
│   │   └── SettingsScreen.tsx
│   └── components/
│       ├── FlipCard.tsx             ← animated 3D card flip
│       ├── CardFront.tsx
│       ├── CardBack.tsx
│       ├── WordInfoSheet.tsx        ← lightbulb bottom sheet (syntax, verse, etymology)
│       ├── MnemonicPanel.tsx        ← personal mnemonic (text + image)
│       ├── WheelPicker.tsx          ← scroll-drum range picker
│       ├── FilterPanel.tsx          ← part-of-speech + direction filters
│       ├── ProgressBar.tsx
│       ├── ScoreDisplay.tsx
│       └── LockOverlay.tsx          ← IAP gate UI
```

---

## Core Concepts & Definitions

### ScopeConfig
The user's chosen study scope. Set on HomeScreen and persisted through the whole session.

```typescript
type ScopeType = 'bible_chapter' | 'textbook' | 'frequency';

interface ScopeConfig {
  type: ScopeType;

  // bible_chapter
  book?: string;          // e.g. "John"
  chapterStart?: number;
  chapterEnd?: number;

  // textbook
  textbookSlug?: string;  // e.g. "mounce"
  chapterStart?: number;
  chapterEnd?: number;

  // frequency
  frequencyMin?: number;
  frequencyMax?: number;
}
```

### Two Modes: Study vs Retrieve
After scope is chosen, the user always lands on **ModeSelectScreen**:
- **Study** → VocabListScreen → Overview OR Learn
- **Retrieve** → RetrievalDashScreen → RetrievalQuizScreen

If no words have graduated for the chosen scope, the Retrieve button is disabled with the message "Nothing to retrieve yet."

### Card Phases

Every word card has a `phase`:
- `"study"` — word has not yet graduated. Lives in LearnScreen.
- `"relearning"` — word lapsed in retrieval. Moves back through short steps.
- `"retrieval"` — word has graduated. Lives in RetrievalQuizScreen.

### Display Order in Learn Mode (Multi-Scope)
When a scope includes multiple chapters or a wide frequency range, cards in Learn mode are ordered:
1. Cards already in progress (older, partially-learned) come first, sorted by `showAt` ascending.
2. Brand-new (never seen) cards come after, in order of NT/textbook sequence.

This ensures older due cards surface before new ones are introduced.

---

## SRS Formula Reference

### Study Mode Steps
```
Steps: [1min → 10min → 1440min]

On AGAIN (any step):
  currentStep = 0
  showAt = now + 1min
  pendingGraduation = false

On GOT IT:
  currentStep += 1
  if currentStep === 1: showAt = now + 10min
  if currentStep === 2: showAt = now + 1440min, pendingGraduation = true
  if pendingGraduation === true AND GOT IT:
    phase = "retrieval"
    S₀ = 3.2, D₀ = 4.0
    nextReview = today + 3 days
```

### Retrieval Mode — Got It
```
grade = 3
D = clamp(D × 0.9 + (3 - grade) × 0.2, 1, 10)
t = days since lastReviewed
R(t) = (1 + t / (9 × S))^-1
S' = S × (e^(0.9 × D^-0.24) × R^(-0.72) × 11^(1-R) - 1 + 1)
nextReview = today + S' days
lastReviewed = today
```

### Retrieval Mode — Again (Lapse)
```
t = days since lastReviewed
R(t) = (1 + t / (9 × S))^-1
S' = S × e^(-0.6) × D^(-0.28) × R^(0.43)
D = clamp(D × 0.9 + 0.4, 1, 10)   // grade = 1
phase = "relearning"
currentStep = 0
showAt = now + 10min
stabilityAfterLapse = S'
```

### Relearning Mode Steps
```
Steps: [10min → 1440min]

On AGAIN: currentStep = 0, showAt = now + 10min
On GOT IT:
  currentStep += 1
  if currentStep === 1: showAt = now + 1440min
  if currentStep === 2:
    phase = "retrieval"
    S = stabilityAfterLapse
    nextReview = today + S days
    lastReviewed = today
```

---

## Card State Shape (Full)

```typescript
interface CardState {
  // Identity
  wordId: number;

  // Phase
  phase: 'study' | 'relearning' | 'retrieval';

  // Study & Relearning
  currentStep: number;        // 0, 1, or 2
  pendingGraduation: boolean;
  showAt: string;             // ISO timestamp

  // FSRS
  stability: number;          // S, in days
  difficulty: number;         // D, 1–10
  lastReviewed: string;       // ISO date
  nextReview: string;         // ISO date
  stabilityAfterLapse: number;

  // Tracking
  lapseCount: number;
  reviewCount: number;
}
```

---

## UI & Design Rules

- **Color palette:** Deep navy (#0D1B2A) background, cream (#F5ECD7) card surfaces, gold accent (#C9A84C). Greek Orthodox manuscript aesthetic.
- **Typography:** Greek words in a clean serif (GFS Didot or Noto Serif). English in a humanist sans.
- **Card flip:** 3D Y-axis rotation using react-native-reanimated. Front = Greek. Back = English gloss.
- **Lightbulb icon:** Top-right of every card. Opens WordInfoSheet bottom sheet with three tabs: Syntax, Bible Verse, Etymology.
- **Personal mnemonic:** Accessible from a separate panel icon on the card. User can type a mnemonic note OR take/upload a photo. Stored in `mnemonics` table.
- **No ads. No data collection. All progress stored locally.**

### Glassmorphism UI System (implemented)

The app uses a consistent glassmorphism aesthetic across all surfaces:

**Button styles:**
- Primary (gold CTA): `backgroundColor: rgba(201,168,76,0.12)`, `borderColor: rgba(201,168,76,0.45)`, text color `theme.textGold`. Light mode: `rgba(160,112,10,0.10)` bg + `rgba(160,112,10,0.40)` border.
- Neutral secondary: `rgba(255,255,255,0.06)` bg + `rgba(255,255,255,0.13)` border (dark); `rgba(0,0,0,0.04)` bg + `rgba(0,0,0,0.18)` border (light).
- No `TouchableOpacity` press animations (no translateY, no shadowOpacity). Use `activeOpacity={0.6}` only.

**Modal/sheet surfaces:**
- Backdrop: `rgba(0,0,0,0.18)` — intentionally light so content shows through.
- BlurView: `intensity={darkMode ? 80 : 60}`, `tint={darkMode ? 'dark' : 'default'}`. **Never use `tint="extraLight"` — it renders near-solid white on iOS.**
- No tint overlay View on top of BlurView.

**Cards (CardFront / CardBack):**
- Light mode gradient: `['#FEFCF2', '#FDF4DC']`. No glass sheen overlay (causes metallic look).
- Dark mode gradient: `['#1E3250', '#0E1E36']` with a subtle sheen overlay.
- Light border: `rgba(180,150,80,0.25)`. Dark border: `rgba(255,255,255,0.10)`.

**WheelPicker:**
- Outer wrapper: `borderRadius: 16`, `borderWidth: 1`, `overflow: 'hidden'`.
- BlurView inside with LinearGradient fade masks (top/bottom). Light fade color: `rgba(244,236,210,0.95)` (warm straw, not white, not yellow).

**FilterPanel:**
- Body always mounted. Animated with Reanimated `withTiming` on `maxHeight` (0→220) and `opacity`. Single chevron rotates 180°. 300ms cubic ease-out.

**Progress bar (LearnScreen + OverviewScreen):**
- Pill-shaped LinearGradient fill. Count numbers on each side of the bar. Consistent across both screens.

**Card transition animation (LearnScreen + OverviewScreen):**
- Shrink + fade out (160ms) → instant reset above → 40ms delay → spring-in from above. The 40ms delay is critical to prevent a flash of the answer before React commits the state reset.

**HomeScreen:**
- Nav bar header hidden (`headerShown: false`).
- Title "Logion" uses `Fonts.greekBoldItalic` (`NotoSerif_700Bold_Italic`) — `fontStyle: 'italic'` alone has no effect without a proper italic font variant loaded.
- `NotoSerif_700Bold_Italic` must be loaded in `App.tsx` via `useFonts` and registered in `Fonts` in `theme.ts`.

---

## Screens Quick Reference

| Screen | Purpose |
|---|---|
| HomeScreen | Choose scope type (Bible Chapter / Textbook / Frequency) + Recents |
| BibleChapterScopeScreen | Pick NT book + chapter range |
| TextbookScopeScreen | Pick textbook + chapter range |
| FrequencyScopeScreen | Pick frequency min/max via dual wheel |
| ModeSelectScreen | Study vs Retrieve (with cooldown count shown) |
| VocabListScreen | Word list for chosen scope + filters (POS, direction) |
| OverviewScreen | Browse flashcards (slideshow or manual, lightbulb available) |
| LearnScreen | Active SRS learning steps (Again / Got It) |
| RetrievalDashScreen | Stats on graduated words + cooldown info |
| RetrievalQuizScreen | Active retrieval with FSRS scheduling |
| SettingsScreen | Pronunciation, theme, reset progress, restore purchases |

---

## What NOT To Do

- Do not implement spaced repetition logic inside a React component. All SRS logic lives in `srsEngine.ts`.
- Do not query the database from a screen directly. Always go through a repository or service.
- Do not store session state in the database. Session state lives in Zustand (`sessionStore.ts`).
- Do not hardcode word data. All vocabulary comes from the seeds loaded into SQLite.
- Do not mix Scope logic into the SRS engine. The filter service produces a word list; the SRS engine operates on that list.

---

## Glossary

| Term | Meaning |
|---|---|
| Scope | The user's chosen filter for which words to study (bible chapter, textbook chapter, or frequency range) |
| ScopeConfig | The TypeScript object representing that scope choice |
| Phase | The current SRS stage of a card: study / relearning / retrieval |
| Graduate | A card moving from study phase → retrieval phase |
| Lapse | A card answered wrong in retrieval, moving to relearning |
| showAt | The earliest time a card can be shown again during study/relearning |
| nextReview | The scheduled date for a retrieval-phase card |
| stability (S) | FSRS measure of how long the memory is expected to last |
| difficulty (D) | FSRS measure of how hard the card is (1=easy, 10=hard) |
| retrievability (R) | Probability the user can recall the word right now |
