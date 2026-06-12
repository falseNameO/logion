# Logion

A React Native mobile app for learning New Testament Koine Greek vocabulary, built for seminary students, pastors, and serious Bible students.

Inspired by the FlashGreek app, but built from scratch with a custom spaced-repetition system, personal mnemonic support, and a two-phase learning architecture.

---

## Features

- **Two-phase learning** — Study mode (step-based introduction) and Retrieval mode (FSRS-powered long-term review)
- **Custom SRS engine** — A spaced-repetition system based on the FSRS algorithm, implemented entirely in TypeScript
- **Three study scopes** — Filter vocabulary by NT Bible chapter, textbook chapter (e.g. Mounce, Duff), or word frequency
- **Personal mnemonics** — Attach a custom note or photo to any word to aid memorization
- **Word info sheet** — Tap the lightbulb on any card to see grammatical syntax, a Bible verse usage, and etymology
- **Audio pronunciation** — Hear each word pronounced
- **Dark + light mode** — Glassmorphism UI with a Greek Orthodox manuscript aesthetic
- **Fully offline** — All data and progress stored locally on device via SQLite. No accounts, no ads, no data collection.

---

## Tech Stack

| Concern | Technology |
|---|---|
| Framework | React Native (bare workflow) |
| Build tooling | Expo + EAS Build |
| Language | TypeScript (strict) |
| Navigation | React Navigation v6 |
| State management | Zustand |
| Local database | SQLite via expo-sqlite |
| Audio | expo-av |
| Animations | react-native-reanimated v3 |
| In-app purchase | react-native-iap |
| Testing | Jest + React Native Testing Library |

---

## Running Locally

### Prerequisites

- Node.js 18+
- Xcode 15+ (for iOS)
- CocoaPods

### Setup

```bash
# Install JS dependencies
npm install

# Install iOS native dependencies
cd ios && pod install && cd ..

# Start on iOS simulator
npm run ios

# Start on Android emulator
npm run android
```

---

## Architecture

```
src/
├── database/       # SQLite schema + repositories (words, progress, mnemonics)
├── seeds/          # ~5400 NT Greek vocabulary entries + textbook/chapter mappings
├── services/       # SRS engine, quiz engine, audio, IAP, mnemonics
├── store/          # Zustand stores (scope, session, settings)
├── hooks/          # useStudySession, useRetrievalSession, useSlideshow
├── screens/        # All app screens
└── components/     # FlipCard, WordInfoSheet, MnemonicPanel, WheelPicker, etc.
```

The SRS logic is entirely isolated in `src/services/srsEngine.ts` — no SRS logic lives in components or screens.

---

## License

MIT
