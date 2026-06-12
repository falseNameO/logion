import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Animated,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  type ListRenderItemInfo,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../types';
import { NT_BOOKS, type NtBookMeta } from '../../constants';
import WheelPicker from '../../components/WheelPicker';
import { getWordsForScope } from '../../services/wordFilterService';
import { useScopeStore } from '../../store/scopeStore';
import { saveRecentScope } from '../../services/recentsService';
import { useTheme } from '../../ThemeContext';
import { useSettingsStore } from '../../store/settingsStore';
import { Check } from 'lucide-react-native';
import GlassCard from '../../components/GlassCard';
import BgOrbs from '../../components/BgOrbs';
import { Fonts } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'BibleChapterScope'>;

export default function BibleChapterScopeScreen({ navigation }: Props) {
  const c = useTheme();
  const darkMode = useSettingsStore(s => s.darkMode);
  const setScope = useScopeStore(s => s.setScope);

  const [selectedBook, setSelectedBook] = useState<NtBookMeta | null>(null);
  const [chapterFromIdx, setChapterFromIdx] = useState(0);
  const [chapterToIdx, setChapterToIdx] = useState(0);
  const [wordCount, setWordCount] = useState<number | null>(null);
  const [counting, setCounting] = useState(false);

  const chapterLabels = selectedBook
    ? Array.from({ length: selectedBook.chapterCount }, (_, i) => String(i + 1))
    : [];

  const chapterFrom = chapterFromIdx + 1;
  const chapterTo = Math.max(chapterFrom, chapterToIdx + 1);

  useEffect(() => {
    if (chapterToIdx < chapterFromIdx) setChapterToIdx(chapterFromIdx);
  }, [chapterFromIdx, chapterToIdx]);

  useEffect(() => {
    if (!selectedBook) { setWordCount(null); return; }
    let cancelled = false;
    setCounting(true);
    getWordsForScope({ type: 'bible_chapter', book: selectedBook.name, chapterStart: chapterFrom, chapterEnd: chapterTo })
      .then(ids => { if (!cancelled) { setWordCount(ids.length); setCounting(false); } })
      .catch(() => { if (!cancelled) { setWordCount(null); setCounting(false); } });
    return () => { cancelled = true; };
  }, [selectedBook, chapterFrom, chapterTo]);

  const panelAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (selectedBook) {
      panelAnim.setValue(0);
      Animated.spring(panelAnim, { toValue: 1, useNativeDriver: true, tension: 65, friction: 11 }).start();
    }
  }, [selectedBook]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBookSelect = useCallback((book: NtBookMeta) => {
    setSelectedBook(book);
    setChapterFromIdx(0);
    setChapterToIdx(0);
  }, []);

  const handleContinue = useCallback(async () => {
    if (!selectedBook) return;
    const scope = { type: 'bible_chapter' as const, book: selectedBook.name, chapterStart: chapterFrom, chapterEnd: chapterTo };
    setScope(scope);
    await saveRecentScope(scope);
    navigation.navigate('ModeSelect');
  }, [selectedBook, chapterFrom, chapterTo, setScope, navigation]);

  const renderBook = useCallback(
    ({ item }: ListRenderItemInfo<NtBookMeta>) => {
      const isSelected = selectedBook?.name === item.name;
      return (
        <TouchableOpacity
          style={[styles.bookRow, { borderBottomColor: `${c.bgBorder}50` }, isSelected && { backgroundColor: `${c.gold}18` }]}
          onPress={() => handleBookSelect(item)}
          activeOpacity={0.7}
        >
          <Text style={[styles.bookName, { color: isSelected ? c.textGold : c.textPrimary }, isSelected && styles.bookNameSelected]}>
            {item.name}
          </Text>
          <View style={styles.bookRight}>
            <Text style={[styles.bookChapters, { color: c.textMuted }]}>{item.chapterCount} ch</Text>
            {isSelected && <Check size={16} color={c.gold} strokeWidth={2.5} />}
          </View>
        </TouchableOpacity>
      );
    },
    [selectedBook, handleBookSelect, c],
  );

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <BgOrbs />
      <FlatList
        data={NT_BOOKS}
        keyExtractor={b => b.name}
        renderItem={renderBook}
        style={styles.bookList}
        contentContainerStyle={styles.bookListContent}
        showsVerticalScrollIndicator={false}
      />

      {selectedBook && (
        <Animated.View style={{
          opacity: panelAnim,
          transform: [{ translateY: panelAnim.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) }],
        }}>
        <GlassCard style={styles.bottomPanel}>
          <Text style={[styles.panelTitle, { color: c.textPrimary }]}>{selectedBook.name}</Text>

          <View style={styles.pickersRow}>
            <View style={styles.pickerCol}>
              <Text style={[styles.pickerLabel, { color: c.textMuted }]}>From</Text>
              <WheelPicker items={chapterLabels} selectedIndex={chapterFromIdx} onIndexChange={idx => setChapterFromIdx(idx)} width={100} />
            </View>
            <Text style={[styles.pickerSeparator, { color: c.textGold }]}>–</Text>
            <View style={styles.pickerCol}>
              <Text style={[styles.pickerLabel, { color: c.textMuted }]}>To</Text>
              <WheelPicker items={chapterLabels} selectedIndex={chapterToIdx} onIndexChange={setChapterToIdx} minIndex={chapterFromIdx} width={100} />
            </View>
          </View>

          <View style={styles.previewRow}>
            {counting ? (
              <ActivityIndicator size="small" color={c.gold} />
            ) : (
              <Text style={[styles.previewText, { color: c.textGold }]}>
                {wordCount !== null
                  ? `${wordCount} word${wordCount !== 1 ? 's' : ''} in ${selectedBook.name} ${chapterFrom === chapterTo ? `ch ${chapterFrom}` : `ch ${chapterFrom}–${chapterTo}`}`
                  : ''}
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={[styles.continueBtn, {
              backgroundColor: darkMode ? 'rgba(201,168,76,0.12)' : 'rgba(160,112,10,0.10)',
              borderColor: darkMode ? 'rgba(201,168,76,0.45)' : 'rgba(160,112,10,0.40)',
            }, !wordCount && styles.continueBtnDisabled]}
            onPress={handleContinue}
            disabled={!wordCount}
            activeOpacity={0.7}
          >
            <Text style={[styles.continueBtnText, { color: c.textGold }]}>Continue</Text>
          </TouchableOpacity>
        </GlassCard>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bookList: { flex: 1 },
  bookListContent: { paddingVertical: 8, paddingHorizontal: 16 },
  bookRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 2,
    borderBottomWidth: 1,
  },
  bookName: {
    fontFamily: Fonts.sans,
    fontSize: 16,
  },
  bookNameSelected: {
    fontFamily: Fonts.sansBold,
    fontWeight: '600',
  },
  bookRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bookChapters: {
    fontFamily: Fonts.sans,
    fontSize: 13,
  },
  bottomPanel: {
    borderRadius: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  panelTitle: {
    fontFamily: Fonts.sansBold,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  pickersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pickerCol: { alignItems: 'center', gap: 6 },
  pickerLabel: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  pickerSeparator: {
    fontSize: 22,
    marginTop: 28,
    paddingHorizontal: 4,
  },
  previewRow: {
    marginTop: 16,
    height: 20,
    justifyContent: 'center',
  },
  previewText: {
    fontFamily: Fonts.sans,
    fontSize: 14,
  },
  continueBtn: {
    marginTop: 20,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    borderWidth: 1,
  },
  continueBtnDisabled: { opacity: 0.35 },
  continueBtnText: {
    fontFamily: Fonts.sansBold,
    fontWeight: '700',
    fontSize: 16,
  },
});
