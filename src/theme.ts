/**
 * Central design tokens for Logion.
 * All screens and components should import colors and font names from here
 * rather than hardcoding hex strings.
 */

// ─── Colors ───────────────────────────────────────────────────────────────────

export const Colors = {
  // Backgrounds
  bg:          '#0D1B2A',   // deep navy — primary background
  bgCard:      '#132030',   // slightly lighter card surface
  bgElevated:  '#1C2E42',   // elevated panels, rows
  bgBorder:    '#2A3F5A',   // borders and dividers

  // Cream card surface (flash-card face)
  cardSurface: '#F5ECD7',
  cardBorder:  '#E8E0D0',

  // Accent
  gold:        '#C9A84C',   // primary accent (CTA, highlights)
  goldMuted:   '#8A6E2A',   // darker gold for pressed states

  // Text
  textPrimary: '#F5ECD7',   // cream — primary text on dark bg
  textMuted:   '#8899AA',   // secondary / placeholder text
  textFaint:   '#4A6080',   // very muted (hints, disabled)
  textGold:    '#C9A84C',   // gold text
  textDark:    '#0D1B2A',   // dark text on light surfaces (card back)

  // Semantic
  success:     '#4CAF88',
  successBg:   '#1A3D2B',
  successText: '#C8F5D6',
  error:       '#FF6B6B',
  errorBg:     '#3D1C10',
  errorText:   '#FFB8A0',
  warning:     '#C9A84C',
  mastered:    '#7ABFEE',   // blue for mastered/graduated words
} as const;

// Dark mode overrides — AMOLED / extra-dark navy.
export const DarkColors: typeof Colors = {
  ...Colors,
  bg:          '#080F18',
  bgCard:      '#0D1825',
  bgElevated:  '#142030',
  bgBorder:    '#1C2E42',
};

// Light (parchment) theme — cream backgrounds, dark text.
export const LightColors: typeof Colors = {
  // Backgrounds
  bg:          '#F0E8D5',   // parchment
  bgCard:      '#E8DECA',   // slightly darker parchment card
  bgElevated:  '#DDD2B8',   // elevated panels
  bgBorder:    '#C8BFAA',   // borders

  // Cream card surface (same — the flashcard face is always cream)
  cardSurface: '#FFFDF6',
  cardBorder:  '#F0E8D5',

  // Accent — keep gold, looks great on parchment
  gold:        '#B8923C',
  goldMuted:   '#8A6A28',

  // Text
  textPrimary: '#0D1B2A',   // dark navy on light bg
  textMuted:   '#5A6070',
  textFaint:   '#8A8E96',
  textGold:    '#B8923C',
  textDark:    '#0D1B2A',

  // Semantic — warm muted tones for light mode
  success:     '#3D7A5F',   // muted sage green
  successBg:   '#D4EDE3',
  successText: '#1A3D2B',
  error:       '#CC4040',
  errorBg:     '#F8D8D8',
  errorText:   '#6A1010',
  warning:     '#B8923C',
  mastered:    '#3E6E8A',   // muted teal-blue for light mode
};

// ─── Typography ───────────────────────────────────────────────────────────────

export const Fonts = {
  greek:          'NotoSerif_400Regular',
  greekBold:      'NotoSerif_700Bold',
  greekBoldItalic: 'NotoSerif_700Bold_Italic',
  /** Humanist sans for all English UI text. Falls back to system sans. */
  sans:       'DMSans_400Regular',
  sansMedium: 'DMSans_500Medium',
  sansBold:   'DMSans_700Bold',
} as const;

// ─── Spacing ──────────────────────────────────────────────────────────────────

export const Spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
} as const;

// ─── Border radius ────────────────────────────────────────────────────────────

export const Radius = {
  sm:   8,
  md:  12,
  lg:  16,
  xl:  20,
  pill: 999,
} as const;
