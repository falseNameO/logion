import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList, ScopeConfig } from '../types';
import { useScopeStore } from '../store/scopeStore';
import { useTheme } from '../ThemeContext';
import {
  getWordsForScope,
  getGraduatedCountForScope,
  getRetrievalQueueForScope,
} from '../services/wordFilterService';
import { getProgressByPhase } from '../database/progressRepository';
import { BookOpen, RefreshCw } from 'lucide-react-native';
import GlassCard from '../components/GlassCard';
import BgOrbs from '../components/BgOrbs';
import { Fonts } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ModeSelect'>;

function scopeSummary(scope: ScopeConfig, totalWords: number): string {
  let location = '';
  if (scope.type === 'bible_chapter') {
    const book = scope.book ?? '';
    const from = scope.chapterStart ?? 1;
    const to = scope.chapterEnd ?? from;
    location = from === to ? `${book} ${from}` : `${book} ${from}–${to}`;
  } else if (scope.type === 'textbook') {
    const slug = scope.textbookSlug ?? '';
    const from = scope.chapterStart ?? 1;
    const to = scope.chapterEnd ?? from;
    location = from === to ? `${slug} ch ${from}` : `${slug} ch ${from}–${to}`;
  } else {
    const min = scope.frequencyMin ?? 1;
    const max = scope.frequencyMax ?? 5000;
    location = `${min}×–${max}× frequency`;
  }
  return `${location} · ${totalWords} word${totalWords !== 1 ? 's' : ''}`;
}

interface CachedCounts {
  totalWords: number;
  studyCount: number;
  retrieveDue: number;
  learningCount: number;
  masteredCount: number;
}

const countsCache = new Map<string, CachedCounts>();

export default function ModeSelectScreen({ navigation }: Props) {
  const theme = useTheme();
  const scope = useScopeStore(s => s.activeScope);

  const [counts, setCounts] = useState<CachedCounts | null>(null);
  const [loading, setLoading] = useState(true);

  const scopeRef = useRef(scope);
  scopeRef.current = scope;

  useFocusEffect(
    useCallback(() => {
      if (scope) countsCache.delete(JSON.stringify(scope));
    }, [scope]),
  );

  useEffect(() => {
    if (!scope) return;
    const cacheKey = JSON.stringify(scope);
    const cached = countsCache.get(cacheKey);
    if (cached) { setCounts(cached); setLoading(false); return; }

    let cancelled = false;
    setLoading(true);
    const today = new Date();

    Promise.all([
      getWordsForScope(scope),
      getGraduatedCountForScope(scope),
      getRetrievalQueueForScope(scope, today),
    ]).then(async ([allIds, graduatedCount, dueCards]) => {
      if (cancelled) return;
      const [studyCards, relearnCards] = await Promise.all([
        getProgressByPhase('study', allIds),
        getProgressByPhase('relearning', allIds),
      ]);
      if (cancelled) return;
      const result: CachedCounts = {
        totalWords: allIds.length,
        studyCount: allIds.length - graduatedCount,
        retrieveDue: dueCards.length,
        learningCount: studyCards.length + relearnCards.length,
        masteredCount: graduatedCount,
      };
      countsCache.set(cacheKey, result);
      setCounts(result);
      setLoading(false);
    }).catch(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [scope]);

  if (!scope) {
    return (
      <View style={[styles.root, { backgroundColor: theme.bg }]}>
        <Text style={[styles.errorText, { color: theme.textMuted }]}>No scope selected. Go back and choose one.</Text>
      </View>
    );
  }

  const canRetrieve = !loading && !!counts && counts.retrieveDue > 0;

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <BgOrbs />

      {/* Scope summary */}
      <View style={[styles.summaryBar, { borderBottomColor: `${theme.bgBorder}80` }]}>
        {loading || !counts ? (
          <ActivityIndicator size="small" color={theme.textGold} />
        ) : (
          <Text style={[styles.summaryText, { color: theme.textGold }]}>
            {scopeSummary(scope, counts.totalWords)}
          </Text>
        )}
      </View>

      {/* Stats strip */}
      <GlassCard style={styles.statsCard} noHighlight>
        <View style={styles.statsStrip}>
          <StatBox value={loading || !counts ? '…' : `${counts.totalWords}`}  label="Total"    color={theme.textPrimary} labelColor={theme.textMuted} />
          <StatBox value={loading || !counts ? '…' : `${counts.learningCount}`} label="Learning" color={theme.textGold}    labelColor={theme.textMuted} />
          <StatBox value={loading || !counts ? '…' : `${counts.retrieveDue}`}   label="Due"      color={theme.success}     labelColor={theme.textMuted} />
          <StatBox value={loading || !counts ? '…' : `${counts.masteredCount}`} label="Mastered" color={theme.mastered}    labelColor={theme.textMuted} />
        </View>
      </GlassCard>

      {/* Mode buttons */}
      <View style={styles.buttonsArea}>
        <TouchableOpacity onPress={() => navigation.navigate('VocabList')} activeOpacity={0.8}>
          <GlassCard style={styles.modeCard}>
            <View style={styles.modeCardInner}>
              <View style={[styles.modeIconCircle, { backgroundColor: `${theme.gold}22` }]}>
                <BookOpen size={32} color={theme.gold} strokeWidth={1.8} />
              </View>
              <Text style={[styles.modeTitle, { color: theme.textPrimary }]}>Study</Text>
              <Text style={[styles.modeSubtitle, { color: theme.textGold }]}>
                {loading || !counts ? '…' : `${Math.max(0, counts.studyCount)} word${counts.studyCount !== 1 ? 's' : ''} to learn`}
              </Text>
            </View>
          </GlassCard>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => canRetrieve && navigation.navigate('RetrievalDash')}
          activeOpacity={canRetrieve ? 0.8 : 1}
        >
          <GlassCard style={[styles.modeCard, !canRetrieve && styles.modeCardDisabled]}>
            <View style={styles.modeCardInner}>
              <View style={[styles.modeIconCircle, { backgroundColor: canRetrieve ? 'rgba(76,175,136,0.15)' : `${theme.bgBorder}40` }]}>
                <RefreshCw size={32} color={canRetrieve ? '#4CAF88' : theme.textFaint} strokeWidth={1.8} />
              </View>
              <Text style={[styles.modeTitle, { color: canRetrieve ? theme.textPrimary : theme.textFaint }]}>Retrieve</Text>
              <Text style={[styles.modeSubtitle, { color: canRetrieve ? '#4CAF88' : theme.textFaint }]}>
                {loading ? '…' : canRetrieve ? `${counts!.retrieveDue} due today` : 'Nothing to retrieve yet'}
              </Text>
            </View>
          </GlassCard>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function StatBox({ value, label, color, labelColor }: { value: string; label: string; color: string; labelColor: string }) {
  return (
    <View style={statStyles.box}>
      <Text style={[statStyles.value, { color }]}>{value}</Text>
      <Text style={[statStyles.label, { color: labelColor }]}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  box: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    gap: 3,
  },
  value: {
    fontFamily: Fonts.sansBold,
    fontSize: 22,
    fontWeight: '700',
  },
  label: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    letterSpacing: 0.3,
  },
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  summaryBar: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    minHeight: 58,
    justifyContent: 'center',
  },
  summaryText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 15,
    fontWeight: '500',
  },
  statsCard: {
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderRadius: 14,
  },
  statsStrip: {
    flexDirection: 'row',
  },
  buttonsArea: {
    paddingHorizontal: 20,
    gap: 16,
    paddingTop: 20,
    paddingBottom: 20,
  },
  modeCard: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  modeCardDisabled: {
    opacity: 0.5,
  },
  modeCardInner: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 10,
  },
  modeIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  modeTitle: {
    fontFamily: Fonts.sansBold,
    fontSize: 22,
    fontWeight: '700',
  },
  modeSubtitle: {
    fontFamily: Fonts.sans,
    fontSize: 14,
  },
  errorText: {
    fontSize: 15,
    textAlign: 'center',
    padding: 32,
  },
});
