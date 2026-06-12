import React, { useRef } from 'react';
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
import Animated, {
  FadeIn,
  FadeInUp,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { CheckCircle, XCircle } from 'lucide-react-native';

import CardBack from '../../components/CardBack';
import CardFront from '../../components/CardFront';
import FlipCard from '../../components/FlipCard';
import { useRetrievalSession } from '../../hooks/useRetrievalSession';
import { useTheme } from '../../ThemeContext';
import type { RootStackParamList } from '../../types';
import BgOrbs from '../../components/BgOrbs';
import GlassCard from '../../components/GlassCard';
import { Fonts } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'RetrievalQuiz'>;

function formatDate(iso: string): string {
  if (!iso) return '—';
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function RetrievalQuizScreen({ navigation }: Props) {
  const theme = useTheme();
  const { isLoading, currentWord, currentCardState, isFlipped, justLapsed, flip, again, gotIt, sessionStats, isComplete, cardIndex, totalCards } = useRetrievalSession();

  const shakeX = useSharedValue(0);
  const checkScale = useSharedValue(0);
  const checkAnimated = useRef(false);

  const cardAnimStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));
  const checkCircleStyle = useAnimatedStyle(() => ({ transform: [{ scale: checkScale.value }] }));

  const handleAgain = () => {
    shakeX.value = withSequence(
      withTiming(-10, { duration: 50 }), withTiming(10, { duration: 50 }),
      withTiming(-6, { duration: 40 }), withTiming(6, { duration: 40 }),
      withTiming(0, { duration: 40 }),
    );
    again();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.gold} style={styles.loader} />
      </SafeAreaView>
    );
  }

  if (isComplete) {
    if (!checkAnimated.current) {
      checkAnimated.current = true;
      checkScale.value = withSpring(1, { damping: 10, stiffness: 200 });
    }
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>
        <BgOrbs />
        <ScrollView contentContainerStyle={styles.summaryScroll} showsVerticalScrollIndicator={false}>
          <Animated.View style={[styles.checkCircle, checkCircleStyle]}>
            <CheckCircle size={40} color="#4CAF88" strokeWidth={2} />
          </Animated.View>

          <Animated.Text entering={FadeInUp.delay(200).duration(300)} style={[styles.summaryTitle, { color: theme.textPrimary }]}>
            Retrieval Complete
          </Animated.Text>

          <Animated.View entering={FadeInUp.delay(300).duration(300)}>
            <GlassCard style={styles.statsCard} noHighlight>
              <StatRow label="Cards reviewed" value={`${sessionStats.total}`} delay={0} />
              <StatRow label="Remembered" value={`${sessionStats.reviewed}`} accent="#C8F5D6" delay={60} />
              <StatRow label="Lapsed" value={`${sessionStats.lapsed}`} accent="#FFD6D6" delay={120} />
              {sessionStats.nextSessionDate && (
                <StatRow label="Next session" value={formatDate(sessionStats.nextSessionDate)} accent={theme.gold} delay={180} isLast />
              )}
            </GlassCard>
          </Animated.View>

          {sessionStats.lapsed > 0 && (
            <Animated.View entering={FadeInUp.delay(400).duration(300)} style={[styles.lapsedNote, { backgroundColor: `${theme.bgBorder}60`, borderColor: '#5C2A1A' }]}>
              <XCircle size={16} color="#FFB8A0" strokeWidth={2} style={{ marginBottom: 4 }} />
              <Text style={styles.lapsedNoteText}>
                {sessionStats.lapsed} lapsed word{sessionStats.lapsed !== 1 ? 's' : ''} moved back to Study.
              </Text>
            </Animated.View>
          )}

          <Animated.View entering={FadeInUp.delay(460).duration(300)}>
            <TouchableOpacity
              style={[styles.doneButton, { backgroundColor: theme.gold }]}
              onPress={() => navigation.navigate('ModeSelect')}
              activeOpacity={0.85}
            >
              <Text style={styles.doneLabel}>Done</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!currentWord || !currentCardState) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>
        <View style={styles.summaryContainer}>
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>No words due for retrieval.</Text>
          <TouchableOpacity style={[styles.doneButton, { backgroundColor: theme.gold }]} onPress={() => navigation.goBack()}>
            <Text style={styles.doneLabel}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const progress = totalCards > 0 ? cardIndex / totalCards : 0;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>
      <BgOrbs />

      {justLapsed && (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(500)} style={styles.lapsedBanner}>
          <XCircle size={14} color="#FFB8A0" strokeWidth={2} />
          <Text style={styles.lapsedBannerText}> Going back to study…</Text>
        </Animated.View>
      )}

      <View style={[styles.progressBarTrack, { backgroundColor: theme.bgBorder }]}>
        <Animated.View style={[styles.progressBarFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: theme.gold }]} />
      </View>

      <View style={styles.progressRow}>
        <Text style={[styles.progressText, { color: theme.textMuted }]}>
          {cardIndex} / {totalCards}
          {sessionStats.lapsed > 0 ? `  ·  ${sessionStats.lapsed} lapsed` : ''}
        </Text>
      </View>

      <Animated.View style={[styles.cardArea, cardAnimStyle]}>
        <TouchableOpacity style={styles.cardTouchable} activeOpacity={1} onPress={flip}>
          <FlipCard
            isFlipped={isFlipped}
            onFlip={() => {}}
            front={<CardFront word={currentWord} showExample={false} showImage={false} cardState={currentCardState} />}
            back={<CardBack word={currentWord} showExample={false} showImage={false} mode="retrieval" onAgain={handleAgain} onGotIt={gotIt} cardState={currentCardState} />}
          />
        </TouchableOpacity>
      </Animated.View>

      <Text style={[styles.flipHint, { color: theme.textFaint, opacity: isFlipped ? 0 : 1 }]}>
        Tap card to reveal
      </Text>
    </SafeAreaView>
  );
}

function StatRow({ label, value, accent, delay = 0, isLast }: { label: string; value: string; accent?: string; delay?: number; isLast?: boolean }) {
  const theme = useTheme();
  return (
    <Animated.View
      entering={FadeInUp.delay(delay).duration(280)}
      style={[statStyles.row, !isLast && { borderBottomWidth: 1, borderBottomColor: `${theme.bgBorder}60` }]}
    >
      <Text style={[statStyles.label, { color: theme.textMuted }]}>{label}</Text>
      <Text style={[statStyles.value, { color: accent ?? theme.textPrimary }]}>{value}</Text>
    </Animated.View>
  );
}

const statStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 },
  label: { fontFamily: Fonts.sans, fontSize: 15 },
  value: { fontFamily: Fonts.sansBold, fontSize: 16, fontWeight: '700' },
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  loader: { flex: 1 },
  progressBarTrack: { height: 3 },
  progressBarFill: { height: 3, borderRadius: 2 },
  progressRow: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4, alignItems: 'center' },
  progressText: { fontFamily: Fonts.sans, fontSize: 12, letterSpacing: 0.3 },
  cardArea: { flex: 1, marginHorizontal: 20, marginVertical: 16, position: 'relative' },
  cardTouchable: { flex: 1 },
  flipHint: { textAlign: 'center', fontFamily: Fonts.sans, fontSize: 12, paddingBottom: 20, letterSpacing: 0.5 },
  lapsedBanner: {
    position: 'absolute', top: 60, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#3D1C10', borderWidth: 1, borderColor: '#FF8860',
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, zIndex: 10,
  },
  lapsedBannerText: { fontFamily: Fonts.sansMedium, color: '#FFB8A0', fontSize: 14, fontWeight: '600', letterSpacing: 0.3 },
  summaryScroll: { paddingHorizontal: 32, paddingTop: 48, paddingBottom: 40 },
  checkCircle: { alignSelf: 'center', marginBottom: 20 },
  summaryTitle: { fontFamily: Fonts.sansBold, fontSize: 26, fontWeight: '700', marginBottom: 28, textAlign: 'center' },
  statsCard: { marginBottom: 20, paddingHorizontal: 0, paddingVertical: 0 },
  summaryContainer: { flex: 1, paddingHorizontal: 32, paddingTop: 48 },
  lapsedNote: {
    borderRadius: 10, padding: 14, marginBottom: 28, borderWidth: 1,
    alignItems: 'center', gap: 4,
  },
  lapsedNoteText: { fontFamily: Fonts.sans, fontSize: 13, color: '#FFB8A0', lineHeight: 19, textAlign: 'center' },
  doneButton: { borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  doneLabel: { fontFamily: Fonts.sansBold, fontSize: 16, fontWeight: '700', color: '#0D1B2A', letterSpacing: 0.5 },
  emptyText: { fontFamily: Fonts.sans, fontSize: 16, textAlign: 'center', marginBottom: 32 },
});
