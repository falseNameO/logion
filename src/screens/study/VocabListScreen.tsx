import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  type ListRenderItemInfo,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Word, CardState } from '../../types';
import type { RootStackParamList } from '../../types';
import { useScopeStore } from '../../store/scopeStore';
import { getWordsByIds } from '../../database/wordRepository';
import { getProgressForWords } from '../../database/progressRepository';
import { getWordsForScope } from '../../services/wordFilterService';
import FilterPanel, {
  DEFAULT_FILTERS,
  matchesPosFilter,
  type FilterState,
} from '../../components/FilterPanel';
import WordInfoSheet from '../../components/WordInfoSheet';
import { useTheme } from '../../ThemeContext';
import { useSettingsStore } from '../../store/settingsStore';
import { Eye, BookOpen } from 'lucide-react-native';
import { Fonts } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'VocabList'>;

type SortMode = 'default' | 'az' | 'status';

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'default', label: 'NT Order' },
  { value: 'az',      label: 'A → Z' },
  { value: 'status',  label: 'Status' },
];

function sortWords(words: Word[], progressMap: Map<number, CardState>, mode: SortMode): Word[] {
  if (mode === 'az') return [...words].sort((a, b) => a.greek.localeCompare(b.greek));
  if (mode === 'status') {
    const statusOrder: Record<string, number> = { mastered: 0, learning: 1, new: 2 };
    return [...words].sort((a, b) => {
      const ca = progressMap.get(a.id);
      const cb = progressMap.get(b.id);
      const sa = ca ? (ca.phase === 'retrieval' ? 'mastered' : 'learning') : 'new';
      const sb = cb ? (cb.phase === 'retrieval' ? 'mastered' : 'learning') : 'new';
      return statusOrder[sa] - statusOrder[sb];
    });
  }
  return words;
}

type WordStatus = 'new' | 'learning' | 'mastered';

function statusForCard(card: CardState | undefined): WordStatus {
  if (!card) return 'new';
  if (card.phase === 'retrieval') return 'mastered';
  return 'learning';
}

const STATUS_LABEL: Record<WordStatus, string> = { new: 'New', learning: 'Learning', mastered: 'Mastered' };
const STATUS_COLOR: Record<WordStatus, string> = { new: '#8899AA', learning: '#C9A84C', mastered: '#4CAF88' };

const WordRow = React.memo(function WordRow({
  word, card, direction, onPress,
}: {
  word: Word; card: CardState | undefined; direction: FilterState['direction'];
  onPress: (word: Word) => void; sortMode: SortMode;
}) {
  const c = useTheme();
  const status = statusForCard(card);
  const primary   = direction === 'greek_to_english' ? word.greek  : word.gloss;
  const secondary = direction === 'greek_to_english' ? word.gloss  : word.greek;
  const stabilityPct = card?.phase === 'retrieval' ? Math.min(100, Math.round(((card.stability ?? 0) / 30) * 100)) : 0;

  return (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: `${c.bgBorder}60` }]}
      onPress={() => onPress(word)}
      activeOpacity={0.7}
    >
      <View style={styles.rowMain}>
        <Text
          style={[styles.primaryText, { color: c.textPrimary }, direction === 'greek_to_english' && styles.greekText]}
          numberOfLines={1}
        >
          {primary}
        </Text>
        <Text style={[styles.secondaryText, { color: c.textMuted }]} numberOfLines={1}>{secondary}</Text>
        {stabilityPct > 0 && (
          <View style={[styles.stabilityTrack, { backgroundColor: `${c.bgBorder}80` }]}>
            <View style={[styles.stabilityFill, { width: `${stabilityPct}%`, backgroundColor: `${c.gold}88` }]} />
          </View>
        )}
      </View>
      <View style={styles.rowRight}>
        <Text style={[styles.posText, { color: c.textFaint }]}>{word.partOfSpeech}</Text>
        <View style={[styles.badge, { backgroundColor: STATUS_COLOR[status] + '22' }]}>
          <Text style={[styles.badgeText, { color: STATUS_COLOR[status] }]}>{STATUS_LABEL[status]}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

export default function VocabListScreen({ navigation }: Props) {
  const c = useTheme();
  const darkMode = useSettingsStore(s => s.darkMode);
  const scope = useScopeStore(s => s.activeScope);

  const [allWords, setAllWords]       = useState<Word[]>([]);
  const [progressMap, setProgressMap] = useState<Map<number, CardState>>(new Map());
  const [loading, setLoading]         = useState(true);
  const [filters, setFilters]         = useState<FilterState>(DEFAULT_FILTERS);
  const [sheetWord, setSheetWord]     = useState<Word | null>(null);
  const [sortMode, setSortMode]       = useState<SortMode>('default');

  useEffect(() => {
    if (!scope) return;
    let cancelled = false;
    setLoading(true);
    getWordsForScope(scope)
      .then(ids => getWordsByIds(ids).then(words => ({ ids, words })))
      .then(async ({ ids, words }) => {
        const cards = await getProgressForWords(ids);
        if (cancelled) return;
        const map = new Map<number, CardState>(cards.map(card => [card.wordId, card]));
        setAllWords(words);
        setProgressMap(map);
        setLoading(false);
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [scope]);

  const filteredWords = useMemo(() => {
    const filtered = allWords.filter(w => matchesPosFilter(w.partOfSpeech, filters.pos));
    return sortWords(filtered, progressMap, sortMode);
  }, [allWords, filters.pos, progressMap, sortMode]);

  const handleWordPress = useCallback((word: Word) => { setSheetWord(word); }, []);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Word>) => (
      <WordRow word={item} card={progressMap.get(item.id)} direction={filters.direction} onPress={handleWordPress} sortMode={sortMode} />
    ),
    [progressMap, filters.direction, handleWordPress, sortMode],
  );

  const keyExtractor = useCallback((w: Word) => String(w.id), []);

  if (!scope) {
    return (
      <View style={[styles.centered, { backgroundColor: c.bg }]}>
        <Text style={[styles.errorText, { color: c.textMuted }]}>No scope selected.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <FilterPanel filters={filters} onChange={setFilters} />

      <View style={[styles.sortBar, { backgroundColor: `${c.bgBorder}30`, borderBottomColor: `${c.bgBorder}80` }]}>
        {SORT_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.sortChip,
              { backgroundColor: `${c.bgBorder}50`, borderColor: `${c.bgBorder}80` },
              sortMode === opt.value && { backgroundColor: `${c.gold}22`, borderColor: c.gold },
            ]}
            onPress={() => setSortMode(opt.value)}
            activeOpacity={0.75}
          >
            <Text style={[styles.sortChipText, { color: sortMode === opt.value ? c.textGold : c.textMuted }, sortMode === opt.value && { fontWeight: '700' }]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={c.gold} />
        </View>
      ) : (
        <FlatList
          data={filteredWords}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={[styles.emptyText, { color: c.textMuted }]}>No words match this filter.</Text>
            </View>
          }
        />
      )}

      <View style={[styles.bottomBar, { backgroundColor: `${c.bgBorder}40`, borderTopColor: `${c.bgBorder}80` }]}>
        <TouchableOpacity
          style={[styles.actionBtn, { borderColor: `${c.bgBorder}80`, backgroundColor: `${c.bgBorder}30` }]}
          onPress={() => navigation.navigate('Overview', { words: filteredWords })}
          activeOpacity={0.8}
        >
          <Eye size={16} color={c.textPrimary} strokeWidth={2} />
          <Text style={[styles.actionBtnText, { color: c.textPrimary }]}>Overview</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnPrimary, {
            backgroundColor: darkMode ? 'rgba(201,168,76,0.12)' : 'rgba(160,112,10,0.10)',
            borderColor: darkMode ? 'rgba(201,168,76,0.45)' : 'rgba(160,112,10,0.40)',
          }]}
          onPress={() => navigation.navigate('Learn')}
          activeOpacity={0.7}
        >
          <BookOpen size={16} color={c.gold} strokeWidth={2} />
          <Text style={[styles.actionBtnText, { color: c.gold }]}>Learn</Text>
        </TouchableOpacity>
      </View>

      <WordInfoSheet word={sheetWord} visible={sheetWord !== null} onClose={() => setSheetWord(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  errorText: { fontFamily: Fonts.sans, fontSize: 15 },
  emptyText: { fontFamily: Fonts.sans, fontSize: 14 },
  listContent: { paddingVertical: 4, flexGrow: 1 },
  sortBar: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sortChip: { paddingVertical: 4, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1 },
  sortChipText: { fontFamily: Fonts.sansMedium, fontSize: 12, fontWeight: '500' },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowMain: { flex: 1, gap: 2, marginRight: 12 },
  primaryText: { fontFamily: Fonts.sansBold, fontSize: 17, flex: 1 },
  greekText: { fontFamily: Fonts.greekBold, fontSize: 19 },
  secondaryText: { fontFamily: Fonts.sans, fontSize: 13 },
  stabilityTrack: { height: 2, borderRadius: 1, marginTop: 4, overflow: 'hidden' },
  stabilityFill: { height: 2, borderRadius: 1 },
  rowRight: { alignItems: 'flex-end', gap: 4 },
  posText: { fontFamily: Fonts.sans, fontSize: 11, textTransform: 'capitalize' },
  badge: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 10 },
  badgeText: { fontFamily: Fonts.sansBold, fontSize: 11, fontWeight: '600' },
  bottomBar: {
    flexDirection: 'row', gap: 12, padding: 16, paddingBottom: 28,
    borderTopWidth: 1,
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16, borderRadius: 12, borderWidth: 1,
  },
  actionBtnPrimary: {},
  actionBtnText: { fontFamily: Fonts.sansBold, fontSize: 16, fontWeight: '700' },
  actionBtnTextPrimary: { color: '#0D1B2A' },
});
