import React, { useEffect, useRef, useState } from 'react';
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
  FadeInUp,
  FadeOut,
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { CheckCircle, Timer, Eye } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import CardBack from '../../components/CardBack';
import CardFront from '../../components/CardFront';
import FlipCard from '../../components/FlipCard';
import { useStudySession } from '../../hooks/useStudySession';
import { useTheme } from '../../ThemeContext';
import { useSettingsStore } from '../../store/settingsStore';
import type { RootStackParamList } from '../../types';
import BgOrbs from '../../components/BgOrbs';
import GlassCard from '../../components/GlassCard';
import { Fonts } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Learn'>;

export default function LearnScreen({ navigation }: Props) {
  const {
    isLoading, currentWord, currentCardState, isFlipped, justGraduated,
    flip, again, gotIt, sessionStats, isComplete, cardIndex, totalCards,
    nextAvailableAt, cooldownCount, graduatedCount,
  } = useStudySession();

  const theme = useTheme();
  const darkMode = useSettingsStore(s => s.darkMode);

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!nextAvailableAt) return;
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [nextAvailableAt]);

  const cardScale   = useSharedValue(1);
  const cardTranslY = useSharedValue(0);
  const cardOpacity = useSharedValue(1);
  const shakeX      = useSharedValue(0);
  const checkScale  = useSharedValue(0);
  const checkAnimated = useRef(false);

  const cardContainerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }, { translateY: cardTranslY.value }, { scale: cardScale.value }],
    opacity: cardOpacity.value,
  }));

  const checkCircleStyle = useAnimatedStyle(() => ({ transform: [{ scale: checkScale.value }] }));

  const animateCardTransition = (action: () => void) => {
    const DURATION = 160;
    cardScale.value   = withTiming(0.88, { duration: DURATION });
    cardTranslY.value = withTiming(30,   { duration: DURATION });
    cardOpacity.value = withTiming(0,    { duration: DURATION });
    setTimeout(() => {
      cardScale.value   = 0.93;
      cardTranslY.value = -20;
      cardOpacity.value = 0;
      action();
      cardScale.value   = withSpring(1,  { damping: 20, stiffness: 260 });
      cardTranslY.value = withTiming(0,  { duration: 200 });
      cardOpacity.value = withTiming(1,  { duration: 180 });
    }, DURATION);
  };

  const handleAgain = () => {
    shakeX.value = withSequence(
      withTiming(-10, { duration: 50 }), withTiming(10, { duration: 50 }),
      withTiming(-6, { duration: 40 }), withTiming(6, { duration: 40 }),
      withTiming(0, { duration: 40 }),
    );
    animateCardTransition(again);
  };

  const handleGotIt = () => animateCardTransition(gotIt);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.gold} style={styles.loader} />
      </SafeAreaView>
    );
  }

  // ── All words on cooldown ────────────────────────────────────────────────────

  if (nextAvailableAt && !currentWord) {
    const msLeft = Math.max(0, nextAvailableAt.getTime() - now.getTime());
    const totalSecs = Math.ceil(msLeft / 1000);
    const days  = Math.floor(totalSecs / 86400);
    const hrs   = Math.floor((totalSecs % 86400) / 3600);
    const mins  = Math.floor((totalSecs % 3600) / 60);
    const secs  = totalSecs % 60;
    const countdown =
      days  > 0 ? `${days}d ${hrs}h`
      : hrs  > 0 ? `${hrs}h ${mins}m`
      : mins > 0 ? `${mins}m ${secs.toString().padStart(2, '0')}s`
      : `${secs}s`;

    return (
      <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>
        <BgOrbs />
        <View style={styles.cooldownContainer}>
          <View style={[styles.timerIconWrap, { backgroundColor: `${theme.gold}18` }]}>
            <Timer size={40} color={theme.gold} strokeWidth={1.5} />
          </View>
          <Text style={[styles.cooldownTitle, { color: theme.textPrimary }]}>All caught up!</Text>
          <Text style={[styles.cooldownSub, { color: theme.textMuted }]}>Next card available in</Text>
          <Text style={[styles.cooldownTimer, { color: theme.textGold }]}>{countdown}</Text>

          <GlassCard style={styles.cooldownStats} noHighlight>
            <View style={[styles.cooldownStatRow, { borderBottomColor: `${theme.bgBorder}60` }]}>
              <Text style={[styles.cooldownStatLabel, { color: theme.textMuted }]}>Still learning</Text>
              <Text style={[styles.cooldownStatValue, { color: theme.textPrimary }]}>{cooldownCount}</Text>
            </View>
            <View style={[styles.cooldownStatRow, { borderBottomWidth: 0 }]}>
              <Text style={[styles.cooldownStatLabel, { color: theme.textMuted }]}>Graduated</Text>
              <Text style={[styles.cooldownStatValue, { color: theme.textGold }]}>{graduatedCount}</Text>
            </View>
          </GlassCard>

          <TouchableOpacity
            style={[styles.overviewButton, {
              borderColor: darkMode ? 'rgba(255,255,255,0.13)' : 'rgba(0,0,0,0.18)',
              backgroundColor: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            }]}
            onPress={() => navigation.navigate('Overview', undefined)}
            activeOpacity={0.8}
          >
            <Eye size={18} color={theme.textPrimary} strokeWidth={2} />
            <Text style={[styles.overviewLabel, { color: theme.textPrimary }]}>Browse Cards</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.doneButton, {
              backgroundColor: darkMode ? 'rgba(201,168,76,0.12)' : 'rgba(160,112,10,0.10)',
              borderColor: darkMode ? 'rgba(201,168,76,0.45)' : 'rgba(160,112,10,0.40)',
            }]}
            onPress={() => navigation.pop(2)}
            activeOpacity={0.8}
          >
            <Text style={[styles.doneLabel, { color: theme.textGold }]}>Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Session complete ──────────────────────────────────────────────────────────

  if (isComplete) {
    if (!checkAnimated.current) {
      checkAnimated.current = true;
      checkScale.value = withSpring(1, { damping: 10, stiffness: 200 });
    }

    const inProgress = Math.max(0, sessionStats.total - sessionStats.correct - sessionStats.graduatedThisSession);

    return (
      <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>
        <BgOrbs />
        <ScrollView contentContainerStyle={styles.summaryScroll} showsVerticalScrollIndicator={false}>
          <Animated.View style={[styles.checkCircle, checkCircleStyle]}>
            <CheckCircle size={40} color="#4CAF88" strokeWidth={2} />
          </Animated.View>

          <Animated.Text entering={FadeInUp.delay(200).duration(300)} style={[styles.summaryTitle, { color: theme.textPrimary }]}>
            Session Complete
          </Animated.Text>

          <Animated.View entering={FadeInUp.delay(300).duration(300)} style={styles.statsGrid}>
            <GlassCard style={styles.statsCard} noHighlight>
              <StatRow label="Cards reviewed" value={sessionStats.total} delay={0} theme={theme} />
              <StatRow label="Got it" value={sessionStats.correct} accent="#C8F5D6" delay={60} theme={theme} />
              <StatRow label="Again" value={sessionStats.again} accent="#FFD6D6" delay={120} theme={theme} />
              <StatRow label="In progress" value={inProgress} delay={180} theme={theme} />
              <StatRow label="Graduated" value={sessionStats.graduatedThisSession} accent={theme.gold} delay={240} theme={theme} isLast />
            </GlassCard>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(400).duration(300)}>
            <TouchableOpacity
              style={[styles.doneButton, {
              backgroundColor: darkMode ? 'rgba(201,168,76,0.12)' : 'rgba(160,112,10,0.10)',
              borderColor: darkMode ? 'rgba(201,168,76,0.45)' : 'rgba(160,112,10,0.40)',
            }]}
              onPress={() => navigation.pop(2)}
              activeOpacity={0.8}
            >
              <Text style={[styles.doneLabel, { color: theme.textGold }]}>Done</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── No words / no scope ───────────────────────────────────────────────────────

  if (!currentWord) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>
        <View style={styles.summaryContainer}>
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>No words to study in this scope.</Text>
          <TouchableOpacity style={[styles.doneButton, {
            backgroundColor: darkMode ? 'rgba(201,168,76,0.12)' : 'rgba(160,112,10,0.10)',
            borderColor: darkMode ? 'rgba(201,168,76,0.45)' : 'rgba(160,112,10,0.40)',
          }]} onPress={() => navigation.goBack()}>
            <Text style={[styles.doneLabel, { color: theme.textGold }]}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Active session ────────────────────────────────────────────────────────────

  const progress = totalCards > 0 ? cardIndex / totalCards : 0;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>
      <BgOrbs />

      {justGraduated && (
        <Animated.View
          entering={ZoomIn.springify().damping(12).stiffness(160)}
          exiting={FadeOut.duration(400)}
          style={[styles.graduationBanner, { borderColor: theme.gold }]}
        >
          <CheckCircle size={14} color={theme.gold} strokeWidth={2.5} />
          <Text style={[styles.graduationText, { color: theme.gold }]}> Graduated!</Text>
        </Animated.View>
      )}

      {/* Modern progress bar */}
      <View style={styles.progressRow}>
        <Text style={[styles.progressCount, { color: theme.textMuted }]}>{cardIndex}</Text>
        <View style={[styles.progressBarTrack, { backgroundColor: `${theme.bgBorder}CC` }]}>
          <Animated.View style={[styles.progressBarFill, { width: `${Math.round(progress * 100)}%` }]}>
            <LinearGradient
              colors={[theme.gold, `${theme.gold}CC`]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>
        <Text style={[styles.progressCount, { color: theme.textMuted }]}>{totalCards}</Text>
      </View>
      {sessionStats.graduatedThisSession > 0 && (
        <Text style={[styles.graduatedHint, { color: theme.gold }]}>
          {sessionStats.graduatedThisSession} graduated ✦
        </Text>
      )}

      <Animated.View style={[styles.cardArea, cardContainerStyle]}>
        <TouchableOpacity style={styles.cardTouchable} activeOpacity={1} onPress={flip}>
          <FlipCard
            key={currentWord.id}
            isFlipped={isFlipped}
            onFlip={() => {}}
            front={<CardFront word={currentWord} showExample={false} showImage={false} mode="learn" cardState={currentCardState} />}
            back={<CardBack word={currentWord} showExample={false} showImage={false} mode="learn" onAgain={handleAgain} onGotIt={handleGotIt} cardState={currentCardState} />}
          />
        </TouchableOpacity>
      </Animated.View>

      <Text style={[styles.flipHint, { color: theme.textFaint, opacity: isFlipped ? 0 : 1 }]}>
        Tap card to reveal
      </Text>
    </SafeAreaView>
  );
}

function StatRow({ label, value, accent, delay = 0, theme, isLast }: {
  label: string; value: number; accent?: string; delay?: number; theme: ReturnType<typeof useTheme>; isLast?: boolean;
}) {
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
  value: { fontFamily: Fonts.sansBold, fontSize: 18, fontWeight: '700' },
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  loader: { flex: 1 },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 6,
    gap: 10,
  },
  progressBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    shadowColor: '#C9A84C',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  progressCount: {
    fontFamily: Fonts.sansBold,
    fontSize: 12,
    fontWeight: '600',
    minWidth: 20,
    textAlign: 'center',
  },
  graduatedHint: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    textAlign: 'center',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  cardArea: { flex: 1, marginHorizontal: 20, marginVertical: 16, position: 'relative' },
  cardTouchable: { flex: 1 },
  flipHint: { textAlign: 'center', fontFamily: Fonts.sans, fontSize: 12, paddingBottom: 20, letterSpacing: 0.5 },
  graduationBanner: {
    position: 'absolute', top: 60, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1A3020', borderWidth: 1,
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, zIndex: 10,
  },
  graduationText: { fontFamily: Fonts.sansBold, fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
  summaryScroll: { paddingHorizontal: 32, paddingTop: 48, paddingBottom: 40 },
  checkCircle: { alignSelf: 'center', marginBottom: 20 },
  summaryTitle: { fontFamily: Fonts.sansBold, fontSize: 26, fontWeight: '700', marginBottom: 28, textAlign: 'center' },
  statsGrid: { marginBottom: 40 },
  statsCard: { paddingHorizontal: 0, paddingVertical: 0 },
  summaryContainer: { flex: 1, paddingHorizontal: 32, paddingTop: 48 },
  doneButton: { width: '100%', borderRadius: 12, paddingVertical: 16, alignItems: 'center', borderWidth: 1 },
  doneLabel: { fontFamily: Fonts.sansBold, fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
  emptyText: { fontFamily: Fonts.sans, fontSize: 16, textAlign: 'center', marginBottom: 32 },
  cooldownContainer: { flex: 1, paddingHorizontal: 32, justifyContent: 'center', alignItems: 'center', gap: 8 },
  timerIconWrap: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  cooldownTitle: { fontFamily: Fonts.sansBold, fontSize: 26, fontWeight: '700', textAlign: 'center' },
  cooldownSub: { fontFamily: Fonts.sans, fontSize: 15, textAlign: 'center' },
  cooldownTimer: { fontFamily: Fonts.sansBold, fontSize: 40, fontWeight: '700', textAlign: 'center', marginTop: 4, marginBottom: 24, letterSpacing: 1 },
  cooldownStats: { width: '100%', marginBottom: 24, paddingHorizontal: 0, paddingVertical: 0 },
  cooldownStatRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 18, borderBottomWidth: 1 },
  cooldownStatLabel: { fontFamily: Fonts.sans, fontSize: 15 },
  cooldownStatValue: { fontFamily: Fonts.sansBold, fontSize: 18, fontWeight: '700' },
  overviewButton: {
    width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderWidth: 1, borderRadius: 12, paddingVertical: 16, marginBottom: 12,
  },
  overviewLabel: { fontFamily: Fonts.sansMedium, fontSize: 16, fontWeight: '600', letterSpacing: 0.3 },
});
