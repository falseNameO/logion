import React, { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { X } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { useSettingsStore } from '../store/settingsStore';

import type { Example, Word } from '../types';
import { getExamplesForWord, getWordsByRoot } from '../database/wordRepository';
import { Fonts } from '../theme';
import { useTheme } from '../ThemeContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WordInfoSheetProps {
  word: Word | null;
  visible: boolean;
  onClose: () => void;
}

type Tab = 'syntax' | 'verse' | 'etymology';

const TABS: { key: Tab; label: string }[] = [
  { key: 'syntax',    label: 'Syntax' },
  { key: 'verse',     label: 'Bible Verse' },
  { key: 'etymology', label: 'Etymology' },
];

const SHEET_HEIGHT = 480;

// ─── Component ────────────────────────────────────────────────────────────────

export default function WordInfoSheet({ word, visible, onClose }: WordInfoSheetProps) {
  const c = useTheme();
  const darkMode = useSettingsStore(s => s.darkMode);
  const [activeTab, setActiveTab] = useState<Tab>('syntax');
  const [examples, setExamples] = useState<Example[]>([]);
  const [rootFamily, setRootFamily] = useState<Word[]>([]);

  // translateY = 0 → fully visible; SHEET_HEIGHT → hidden below screen edge.
  const translateY = useSharedValue(SHEET_HEIGHT);

  // ── Animation helpers ────────────────────────────────────────────────────

  const animateIn = useCallback(() => {
    translateY.value = withTiming(0, { duration: 320, easing: Easing.out(Easing.cubic) });
  }, [translateY]);

  const animateOut = useCallback(
    (onDone?: () => void) => {
      translateY.value = withTiming(
        SHEET_HEIGHT,
        { duration: 260, easing: Easing.in(Easing.cubic) },
        finished => {
          if (finished && onDone) runOnJS(onDone)();
        },
      );
    },
    [translateY],
  );

  const dismiss = useCallback(() => {
    animateOut(onClose);
  }, [animateOut, onClose]);

  // ── Open / close effect ──────────────────────────────────────────────────

  useEffect(() => {
    if (visible && word) {
      setActiveTab('syntax');
      animateIn();
    } else if (!visible) {
      translateY.value = SHEET_HEIGHT;
    }
  }, [visible, word]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch tab data when word changes ─────────────────────────────────────

  useEffect(() => {
    if (!word) {
      setExamples([]);
      setRootFamily([]);
      return;
    }
    let cancelled = false;

    getExamplesForWord(word.id).then(rows => {
      if (!cancelled) setExamples(rows);
    });

    if (word.root) {
      getWordsByRoot(word.root, word.id).then(rows => {
        if (!cancelled) setRootFamily(rows);
      });
    } else {
      setRootFamily([]);
    }

    return () => { cancelled = true; };
  }, [word?.id]);

  // ── Animated style ────────────────────────────────────────────────────────

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!word) return null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={dismiss}
    >
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={dismiss}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      {/* Sheet */}
      <Animated.View style={[styles.sheet, { borderColor: `${c.bgBorder}80` }, sheetStyle]}>
        <BlurView intensity={darkMode ? 80 : 60} tint={darkMode ? 'dark' : 'default'} style={StyleSheet.absoluteFill} />

        {/* Drag handle (decorative) */}
        <View style={styles.handleArea}>
          <View style={[styles.handle, { backgroundColor: c.bgBorder }]} />
        </View>

        {/* Header */}
        <View style={[styles.header, { borderBottomColor: `${c.bgBorder}80` }]}>
          <View style={styles.headerWords}>
            <Text style={[styles.greek, { color: c.textPrimary }]}>{word.greek}</Text>
            <Text style={[styles.gloss, { color: c.textGold }]}>{word.gloss}</Text>
          </View>
          <TouchableOpacity onPress={dismiss} hitSlop={12} style={[styles.closeBtn, { backgroundColor: `${c.bgBorder}60` }]}>
            <X size={16} color={c.textMuted} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        {/* Tab bar */}
        <View style={[styles.tabBar, { borderBottomColor: `${c.bgBorder}80` }]}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && { borderBottomColor: c.gold }]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, { color: activeTab === tab.key ? c.textGold : c.textMuted }, activeTab === tab.key && { fontWeight: '600' }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab content */}
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 'syntax' && (
            <SyntaxTab word={word} rootFamily={rootFamily} />
          )}
          {activeTab === 'verse' && (
            <VerseTab examples={examples} />
          )}
          {activeTab === 'etymology' && (
            <EtymologyTab word={word} />
          )}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

// ─── Syntax tab ───────────────────────────────────────────────────────────────

function SyntaxTab({ word, rootFamily }: { word: Word; rootFamily: Word[] }) {
  const c = useTheme();
  const posLabel = word.partOfSpeech.charAt(0).toUpperCase() + word.partOfSpeech.slice(1);

  return (
    <View style={tabStyles.container}>
      <InfoRow label="Part of Speech" value={posLabel} />
      <InfoRow label="NT Frequency" value={`${word.ntFrequency}×`} />
      {word.root && <InfoRow label="Root" value={word.root} />}
      {word.definition !== word.gloss && (
        <InfoRow label="Definition" value={word.definition} />
      )}

      {word.principalParts && word.principalParts.length > 0 && (
        <View style={tabStyles.section}>
          <Text style={tabStyles.sectionTitle}>Principal Parts</Text>
          <Text style={[tabStyles.greekLine, { color: c.textPrimary }]}>
            {word.principalParts.filter(Boolean).join(' · ')}
          </Text>
        </View>
      )}

      {rootFamily.length > 0 && (
        <View style={tabStyles.section}>
          <Text style={tabStyles.sectionTitle}>Root Family</Text>
          {rootFamily.map(w => (
            <View key={w.id} style={[tabStyles.familyRow, { borderBottomColor: c.bgBorder }]}>
              <Text style={[tabStyles.familyGreek, { color: c.textPrimary }]}>{w.greek}</Text>
              <Text style={[tabStyles.familyGloss, { color: c.textMuted }]}>{w.gloss}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Bible Verse tab ──────────────────────────────────────────────────────────

function VerseTab({ examples }: { examples: Example[] }) {
  const c = useTheme();
  if (examples.length === 0) {
    return (
      <View style={tabStyles.emptyContainer}>
        <Text style={[tabStyles.emptyText, { color: c.textMuted }]}>No example sentences available.</Text>
      </View>
    );
  }

  return (
    <View style={tabStyles.container}>
      {examples.map(ex => (
        <View key={ex.id} style={[tabStyles.exampleBlock, { borderBottomColor: c.bgBorder }]}>
          <Text style={tabStyles.reference}>{ex.reference}</Text>
          <Text style={[tabStyles.greekSentence, { color: c.textPrimary }]}>{ex.greekSentence}</Text>
          <Text style={[tabStyles.englishSentence, { color: c.textMuted }]}>{ex.englishSentence}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Etymology tab ────────────────────────────────────────────────────────────

function EtymologyTab({ word }: { word: Word }) {
  const c = useTheme();
  const derivatives = word.englishDerivatives
    ? word.englishDerivatives.split(',').map(d => d.trim()).filter(Boolean)
    : [];

  if (derivatives.length === 0) {
    return (
      <View style={tabStyles.emptyContainer}>
        <Text style={[tabStyles.emptyText, { color: c.textMuted }]}>No English derivatives recorded.</Text>
      </View>
    );
  }

  return (
    <View style={tabStyles.container}>
      <Text style={[tabStyles.etymologyNote, { color: c.textMuted }]}>
        These English words share the same Greek root.
      </Text>
      <View style={tabStyles.derivativeList}>
        {derivatives.map((d, i) => (
          <View key={i} style={[tabStyles.derivativeChip, { backgroundColor: c.bgElevated, borderColor: c.bgBorder }]}>
            <Text style={[tabStyles.derivativeText, { color: c.textPrimary }]}>{d}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── InfoRow helper ───────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  const c = useTheme();
  return (
    <View style={[tabStyles.infoRow, { borderBottomColor: c.bgBorder }]}>
      <Text style={[tabStyles.infoLabel, { color: c.textMuted }]}>{label}</Text>
      <Text style={[tabStyles.infoValue, { color: c.textPrimary }]}>{value}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    overflow: 'hidden',
  },
  handleArea: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3A5070',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1C2E42',
  },
  headerWords: {
    flex: 1,
    gap: 2,
  },
  greek: {
    fontFamily: Fonts.greekBold,
    fontSize: 26,
    color: '#F5ECD7',
  },
  gloss: {
    fontFamily: Fonts.sans,
    fontSize: 14,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#1C2E42',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontFamily: Fonts.sans,
    fontSize: 13,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
});

const tabStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 2,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 48,
  },
  emptyText: {
    fontSize: 14,
    color: '#6688AA',
    textAlign: 'center',
  },

  // InfoRow
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1C2E42',
  },
  infoLabel: {
    fontSize: 13,
    color: '#6688AA',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: '#F5ECD7',
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },

  // Section (principal parts, root family)
  section: {
    marginTop: 20,
    gap: 10,
  },
  sectionTitle: {
    fontFamily: Fonts.sansBold,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  greekLine: {
    fontFamily: Fonts.greek,
    fontSize: 15,
    color: '#F5ECD7',
    lineHeight: 22,
  },
  familyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1C2E42',
  },
  familyGreek: {
    fontFamily: Fonts.greek,
    fontSize: 16,
    color: '#F5ECD7',
  },
  familyGloss: {
    fontSize: 13,
    color: '#8899AA',
  },

  // Bible verse
  exampleBlock: {
    marginBottom: 20,
    gap: 6,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1C2E42',
  },
  reference: {
    fontSize: 11,
    color: '#C9A84C',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  greekSentence: {
    fontFamily: Fonts.greek,
    fontSize: 15,
    color: '#F5ECD7',
    lineHeight: 22,
  },
  englishSentence: {
    fontSize: 14,
    color: '#8899AA',
    lineHeight: 20,
    fontStyle: 'italic',
  },

  // Etymology
  etymologyNote: {
    fontSize: 13,
    color: '#6688AA',
    marginBottom: 16,
    lineHeight: 19,
  },
  derivativeList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  derivativeChip: {
    backgroundColor: '#1C2E42',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#2A3F5A',
  },
  derivativeText: {
    fontSize: 14,
    color: '#F5ECD7',
    fontWeight: '500',
  },
});
