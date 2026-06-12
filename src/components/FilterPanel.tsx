import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { ChevronDown } from 'lucide-react-native';
import type { PartOfSpeech } from '../types';
import { useTheme } from '../ThemeContext';
import { Fonts } from '../theme';

export type PosFilter = 'all' | 'verb' | 'noun' | 'adjective' | 'other';
export type Direction = 'greek_to_english' | 'english_to_greek';

export interface FilterState {
  pos: PosFilter;
  direction: Direction;
}

export const DEFAULT_FILTERS: FilterState = {
  pos: 'all',
  direction: 'greek_to_english',
};

export function matchesPosFilter(partOfSpeech: PartOfSpeech, filter: PosFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'verb') return partOfSpeech === 'verb';
  if (filter === 'noun') return partOfSpeech === 'noun';
  if (filter === 'adjective') return partOfSpeech === 'adjective';
  return !['verb', 'noun', 'adjective'].includes(partOfSpeech);
}

const TIMING = { duration: 300, easing: Easing.out(Easing.cubic) };
const BODY_MAX_HEIGHT = 220;

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const c = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        { backgroundColor: `${c.bgBorder}50`, borderColor: `${c.bgBorder}80` },
        active && { backgroundColor: `${c.gold}22`, borderColor: c.gold },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.chipText, { color: active ? c.textGold : c.textMuted }, active && { fontWeight: '600' }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const POS_OPTIONS: { label: string; value: PosFilter }[] = [
  { label: 'All',        value: 'all' },
  { label: 'Verbs',      value: 'verb' },
  { label: 'Nouns',      value: 'noun' },
  { label: 'Adjectives', value: 'adjective' },
  { label: 'Other',      value: 'other' },
];

const AnimatedChevron = Animated.createAnimatedComponent(ChevronDown as React.ComponentType<{ size: number; color: string; strokeWidth: number; style?: object }>);

export default function FilterPanel({ filters, onChange }: { filters: FilterState; onChange: (next: FilterState) => void }) {
  const c = useTheme();
  const [expanded, setExpanded] = useState(false);
  const progress = useSharedValue(0);

  function toggle() {
    const next = !expanded;
    setExpanded(next);
    progress.value = withTiming(next ? 1 : 0, TIMING);
  }

  const bodyStyle = useAnimatedStyle(() => ({
    maxHeight: progress.value * BODY_MAX_HEIGHT,
    opacity: progress.value,
    overflow: 'hidden',
  }));

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(progress.value, [0, 1], [0, 180])}deg` }],
  }));

  return (
    <View style={[styles.root, { backgroundColor: `${c.bgBorder}30`, borderBottomColor: `${c.bgBorder}80` }]}>
      <TouchableOpacity style={styles.header} onPress={toggle} activeOpacity={0.8}>
        <Text style={[styles.headerLabel, { color: c.textPrimary }]}>Filters</Text>
        <View style={styles.headerRight}>
          {!expanded && (
            <Text style={[styles.headerHint, { color: c.textMuted }]}>
              {POS_OPTIONS.find(o => o.value === filters.pos)?.label ?? 'All'}
              {' · '}
              {filters.direction === 'greek_to_english' ? 'GR→EN' : 'EN→GR'}
            </Text>
          )}
          <AnimatedChevron size={16} color={c.textMuted} strokeWidth={2} style={chevronStyle} />
        </View>
      </TouchableOpacity>

      <Animated.View style={bodyStyle}>
        <View style={styles.body}>
          <Text style={[styles.groupLabel, { color: c.textMuted }]}>Word type</Text>
          <View style={styles.chipRow}>
            {POS_OPTIONS.map(o => (
              <Chip key={o.value} label={o.label} active={filters.pos === o.value} onPress={() => onChange({ ...filters, pos: o.value })} />
            ))}
          </View>

          <Text style={[styles.groupLabel, { color: c.textMuted }]}>Direction</Text>
          <View style={styles.chipRow}>
            <Chip label="Greek → English" active={filters.direction === 'greek_to_english'} onPress={() => onChange({ ...filters, direction: 'greek_to_english' })} />
            <Chip label="English → Greek" active={filters.direction === 'english_to_greek'} onPress={() => onChange({ ...filters, direction: 'english_to_greek' })} />
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { borderBottomWidth: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, paddingHorizontal: 16,
  },
  headerLabel: { fontFamily: Fonts.sansMedium, fontSize: 14, fontWeight: '600' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerHint: { fontFamily: Fonts.sans, fontSize: 12 },
  body: { paddingHorizontal: 16, paddingBottom: 14, gap: 8 },
  groupLabel: {
    fontFamily: Fonts.sans, fontSize: 11,
    textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 4,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1 },
  chipText: { fontFamily: Fonts.sans, fontSize: 13 },
});
