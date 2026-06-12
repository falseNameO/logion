import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Circle } from 'react-native-svg';
import { RefreshCw } from 'lucide-react-native';

import { getAllRetrievalCards } from '../../database/progressRepository';
import { getWordsByIds } from '../../database/wordRepository';
import { useScopeStore } from '../../store/scopeStore';
import type { CardState, RootStackParamList, ScopeConfig, Word } from '../../types';
import { getWordsForScope } from '../../services/wordFilterService';
import { useTheme } from '../../ThemeContext';
import GlassCard from '../../components/GlassCard';
import BgOrbs from '../../components/BgOrbs';
import { Fonts } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'RetrievalDash'>;

function scopeSummary(scope: ScopeConfig): string {
  switch (scope.type) {
    case 'bible_chapter': {
      const book = scope.book ?? '';
      if (scope.chapterStart === scope.chapterEnd || !scope.chapterEnd) return `${book} ${scope.chapterStart}`;
      return `${book} ${scope.chapterStart}–${scope.chapterEnd}`;
    }
    case 'textbook': {
      const slug = scope.textbookSlug ?? '';
      const label = slug.charAt(0).toUpperCase() + slug.slice(1);
      if (scope.chapterStart === scope.chapterEnd || !scope.chapterEnd) return `${label} ch. ${scope.chapterStart}`;
      return `${label} ch. ${scope.chapterStart}–${scope.chapterEnd}`;
    }
    case 'frequency':
      return `Freq. ${scope.frequencyMin ?? ''}–${scope.frequencyMax ?? ''}`;
  }
}

function daysUntil(nextReview: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(nextReview); due.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((due.getTime() - today.getTime()) / 86_400_000));
}

function nextDueLabel(cooldown: CardState[]): string {
  if (cooldown.length === 0) return '';
  const days = daysUntil(cooldown[0].nextReview);
  if (days === 1) return 'Tomorrow';
  return `In ${days} days`;
}

interface DashData { dueCards: CardState[]; cooldownCards: CardState[]; wordMap: Map<number, Word>; }

export default function RetrievalDashScreen({ navigation }: Props) {
  const theme = useTheme();
  const scope = useScopeStore(s => s.activeScope);
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<DashData>({ dueCards: [], cooldownCards: [], wordMap: new Map() });

  useFocusEffect(
    useCallback(() => {
      if (!scope) return;
      let cancelled = false;
      (async () => {
        setIsLoading(true);
        const todayStr = new Date().toISOString().slice(0, 10);
        const scopeWordIds = await getWordsForScope(scope);
        const allRetrieval = await getAllRetrievalCards(scopeWordIds);
        const due = allRetrieval.filter(c => c.nextReview <= todayStr);
        const cooldown = allRetrieval.filter(c => c.nextReview > todayStr);
        const words = await getWordsByIds(allRetrieval.map(c => c.wordId));
        if (cancelled) return;
        setData({ dueCards: due, cooldownCards: cooldown, wordMap: new Map(words.map(w => [w.id, w])) });
        setIsLoading(false);
      })();
      return () => { cancelled = true; };
    }, [scope]),
  );

  if (!scope) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>
        <Text style={[styles.errorText, { color: theme.textMuted }]}>No scope selected.</Text>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.gold} style={styles.loader} />
      </SafeAreaView>
    );
  }

  const { dueCards, cooldownCards, wordMap } = data;
  const totalGraduated = dueCards.length + cooldownCards.length;
  const dueCount = dueCards.length;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>
      <BgOrbs />

      <View style={[styles.headerBlock, { borderBottomColor: `${theme.bgBorder}80` }]}>
        <Text style={[styles.headerLabel, { color: theme.textMuted }]}>Retrieval</Text>
        <Text style={[styles.headerScope, { color: theme.textPrimary }]}>{scopeSummary(scope)}</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <DonutChart due={dueCount} cooldown={cooldownCards.length} total={totalGraduated} />
        <View style={styles.donutLegend}>
          <LegendDot color={theme.gold} label={`${dueCount} due`} />
          <LegendDot color="#3A5A7A" label={`${cooldownCards.length} cooldown`} />
        </View>

        {cooldownCards.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textGold }]}>Cooldown Words</Text>
            <GlassCard style={styles.cooldownCard} noHighlight>
              {cooldownCards.map((card, i) => {
                const word = wordMap.get(card.wordId);
                if (!word) return null;
                const days = daysUntil(card.nextReview);
                return (
                  <CooldownRow
                    key={card.wordId}
                    word={word}
                    dueLabel={days === 1 ? 'Due tomorrow' : `Due in ${days} days`}
                    isLast={i === cooldownCards.length - 1}
                    onReviewEarly={() => navigation.navigate('Overview', { words: [word] })}
                  />
                );
              })}
            </GlassCard>
          </View>
        )}

        {totalGraduated === 0 && (
          <GlassCard style={styles.emptyCard}>
            <View style={styles.emptyBlock}>
              <RefreshCw size={36} color={theme.textMuted} strokeWidth={1.5} />
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                No words have graduated yet for this scope.{'\n'}
                Study some words first to unlock retrieval.
              </Text>
            </View>
          </GlassCard>
        )}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: `${theme.bgBorder}80` }]}>
        {dueCount > 0 ? (
          <TouchableOpacity
            style={[styles.startButton, { backgroundColor: theme.gold }]}
            onPress={() => navigation.navigate('RetrievalQuiz')}
            activeOpacity={0.85}
          >
            <Text style={styles.startButtonText}>
              Start Retrieval — {dueCount} word{dueCount !== 1 ? 's' : ''}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.noWordsBlock}>
            <Text style={[styles.noWordsTitle, { color: theme.textMuted }]}>No words due today.</Text>
            {cooldownCards.length > 0 && (
              <Text style={[styles.noWordsSubtitle, { color: theme.textFaint }]}>
                Next due: {nextDueLabel(cooldownCards)}
              </Text>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

// ─── DonutChart ───────────────────────────────────────────────────────────────

const DONUT_SIZE = 160;
const DONUT_STROKE = 18;
const DONUT_RADIUS = (DONUT_SIZE - DONUT_STROKE) / 2;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;

function DonutChart({ due, cooldown, total }: { due: number; cooldown: number; total: number }) {
  const c = useTheme();
  const cx = DONUT_SIZE / 2;
  const cy = DONUT_SIZE / 2;
  const dueFrac = total > 0 ? due / total : 0;
  const cooldownFrac = total > 0 ? cooldown / total : 0;
  const dueArc = dueFrac * DONUT_CIRCUMFERENCE;
  const cooldownArc = cooldownFrac * DONUT_CIRCUMFERENCE;

  return (
    <View style={donutStyles.container}>
      <Svg width={DONUT_SIZE} height={DONUT_SIZE} viewBox={`0 0 ${DONUT_SIZE} ${DONUT_SIZE}`}>
        <Circle cx={cx} cy={cy} r={DONUT_RADIUS} stroke={c.bgBorder} strokeWidth={DONUT_STROKE} fill="none" />
        {cooldownArc > 0 && (
          <Circle cx={cx} cy={cy} r={DONUT_RADIUS} stroke="#3A5A7A" strokeWidth={DONUT_STROKE} fill="none"
            strokeDasharray={`${cooldownArc} ${DONUT_CIRCUMFERENCE - cooldownArc}`}
            strokeDashoffset={DONUT_CIRCUMFERENCE / 4 - dueArc} strokeLinecap="round" rotation={-90} originX={cx} originY={cy}
          />
        )}
        {dueArc > 0 && (
          <Circle cx={cx} cy={cy} r={DONUT_RADIUS} stroke={c.gold} strokeWidth={DONUT_STROKE} fill="none"
            strokeDasharray={`${dueArc} ${DONUT_CIRCUMFERENCE - dueArc}`}
            strokeDashoffset={DONUT_CIRCUMFERENCE / 4} strokeLinecap="round" rotation={-90} originX={cx} originY={cy}
          />
        )}
      </Svg>
      <View style={donutStyles.centerLabel}>
        <Text style={[donutStyles.centerNumber, { color: c.textPrimary }]}>{due}</Text>
        <Text style={[donutStyles.centerText, { color: c.textMuted }]}>due today</Text>
      </View>
    </View>
  );
}

const donutStyles = StyleSheet.create({
  container: { alignSelf: 'center', marginVertical: 8, position: 'relative', width: DONUT_SIZE, height: DONUT_SIZE },
  centerLabel: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  centerNumber: { fontFamily: Fonts.sansBold, fontSize: 32, fontWeight: '700' },
  centerText: { fontFamily: Fonts.sans, fontSize: 11, letterSpacing: 0.3 },
});

function LegendDot({ color, label }: { color: string; label: string }) {
  const c = useTheme();
  return (
    <View style={legendStyles.row}>
      <View style={[legendStyles.dot, { backgroundColor: color }]} />
      <Text style={[legendStyles.label, { color: c.textMuted }]}>{label}</Text>
    </View>
  );
}

const legendStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  label: { fontFamily: Fonts.sans, fontSize: 12 },
});

function CooldownRow({ word, dueLabel, isLast, onReviewEarly }: { word: Word; dueLabel: string; isLast: boolean; onReviewEarly: () => void }) {
  const c = useTheme();
  return (
    <View style={[cooldownStyles.row, !isLast && { borderBottomWidth: 1, borderBottomColor: `${c.bgBorder}60` }]}>
      <View style={cooldownStyles.wordBlock}>
        <Text style={[cooldownStyles.greek, { color: c.textPrimary }]}>{word.greek}</Text>
        <Text style={[cooldownStyles.gloss, { color: c.textMuted }]}>{word.gloss}</Text>
      </View>
      <Text style={[cooldownStyles.dueLabel, { color: c.textMuted }]}>{dueLabel}</Text>
      <TouchableOpacity
        style={[cooldownStyles.reviewBtn, { backgroundColor: `${c.gold}18`, borderColor: `${c.gold}50` }]}
        onPress={onReviewEarly}
        hitSlop={8}
        activeOpacity={0.75}
      >
        <Text style={[cooldownStyles.reviewBtnText, { color: c.textGold }]}>Review early</Text>
      </TouchableOpacity>
    </View>
  );
}

const cooldownStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, gap: 8 },
  wordBlock: { flex: 1, gap: 2 },
  greek: { fontFamily: Fonts.greek, fontSize: 16 },
  gloss: { fontFamily: Fonts.sans, fontSize: 12 },
  dueLabel: { fontFamily: Fonts.sans, fontSize: 12, minWidth: 80, textAlign: 'right' },
  reviewBtn: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1 },
  reviewBtnText: { fontFamily: Fonts.sansMedium, fontSize: 11, fontWeight: '600' },
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  loader: { flex: 1 },
  errorText: { flex: 1, textAlign: 'center', textAlignVertical: 'center', marginTop: '50%' },
  headerBlock: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8, borderBottomWidth: 1 },
  headerLabel: { fontFamily: Fonts.sansBold, fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  headerScope: { fontFamily: Fonts.sansBold, fontSize: 22, fontWeight: '700', marginTop: 2 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  donutLegend: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginBottom: 24, marginTop: 4 },
  section: { marginBottom: 16 },
  sectionTitle: { fontFamily: Fonts.sansBold, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  cooldownCard: { paddingHorizontal: 0, paddingVertical: 0 },
  emptyCard: { marginTop: 16 },
  emptyBlock: { alignItems: 'center', paddingVertical: 32, gap: 12 },
  emptyText: { fontFamily: Fonts.sans, fontSize: 14, textAlign: 'center', lineHeight: 22 },
  footer: { paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1 },
  startButton: { borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  startButtonText: { fontFamily: Fonts.sansBold, fontSize: 16, fontWeight: '700', color: '#0D1B2A', letterSpacing: 0.3 },
  noWordsBlock: { alignItems: 'center', paddingVertical: 12, gap: 4 },
  noWordsTitle: { fontFamily: Fonts.sansMedium, fontSize: 15, fontWeight: '600' },
  noWordsSubtitle: { fontFamily: Fonts.sans, fontSize: 13 },
});
