import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react-native';

import CardBack from '../../components/CardBack';
import CardFront from '../../components/CardFront';
import FlipCard from '../../components/FlipCard';
import WordInfoSheet from '../../components/WordInfoSheet';
import { useSlideshow } from '../../hooks/useSlideshow';
import { getWordsForScope } from '../../services/wordFilterService';
import { getWordsByIds } from '../../database/wordRepository';
import { useScopeStore } from '../../store/scopeStore';
import type { RootStackParamList, Word } from '../../types';
import { useTheme } from '../../ThemeContext';
import BgOrbs from '../../components/BgOrbs';
import { Fonts } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Overview'>;

export default function OverviewScreen({ route }: Props) {
  const c = useTheme();
  const scope = useScopeStore(s => s.activeScope);

  const cardTranslY = useSharedValue(0);
  const cardScale   = useSharedValue(1);
  const cardOpacity = useSharedValue(1);

  const cardContainerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: cardTranslY.value }, { scale: cardScale.value }],
    opacity: cardOpacity.value,
  }));

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
      // Small delay lets React commit the isFlipped=false re-render before the card becomes visible
      setTimeout(() => {
        cardScale.value   = withSpring(1,  { damping: 20, stiffness: 260 });
        cardTranslY.value = withTiming(0,  { duration: 200 });
        cardOpacity.value = withTiming(1,  { duration: 180 });
      }, 40);
    }, DURATION);
  };

  const paramWords = route.params?.words ?? null;
  const [loadedWords, setLoadedWords] = useState<Word[] | null>(paramWords);

  const [isFlipped, setIsFlipped] = useState(false);
  const [infoWord, setInfoWord] = useState<Word | null>(null);

  const advanceRef = useRef<() => void>(() => {});

  const handleFlipRequest = useCallback(() => { setIsFlipped(true); }, []);
  const handleAdvanceRequest = useCallback(() => {
    animateCardTransition(() => { setIsFlipped(false); advanceRef.current(); });
  }, []);

  const words = loadedWords ?? [];

  const slideshow = useSlideshow({ total: words.length, onFlipRequest: handleFlipRequest, onAdvanceRequest: handleAdvanceRequest });
  advanceRef.current = slideshow.advance;
  const { isPlaying, currentIndex, play, pause, goTo } = slideshow;

  useEffect(() => {
    if (paramWords) return;
    if (!scope) return;
    let cancelled = false;
    getWordsForScope(scope)
      .then(ids => getWordsByIds(ids))
      .then(w => { if (!cancelled) setLoadedWords(w); })
      .catch(() => { if (!cancelled) setLoadedWords([]); });
    return () => { cancelled = true; };
  }, [scope, paramWords]);

  if (loadedWords === null) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color={c.gold} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  const word = words[currentIndex];

  const handleNext = () => {
    if (isPlaying) pause();
    animateCardTransition(() => {
      setIsFlipped(false);
      goTo((currentIndex + 1) % Math.max(words.length, 1));
    });
  };

  const handlePrev = () => {
    if (isPlaying) pause();
    animateCardTransition(() => {
      setIsFlipped(false);
      goTo((currentIndex - 1 + Math.max(words.length, 1)) % Math.max(words.length, 1));
    });
  };

  const handleSlideshowToggle = () => {
    if (isPlaying) { pause(); } else { setIsFlipped(false); play(); }
  };

  const handleGotIt = () => {
    animateCardTransition(() => {
      setIsFlipped(false);
      goTo((currentIndex + 1) % Math.max(words.length, 1));
    });
  };

  if (!word) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]}>
        <Text style={[styles.empty, { color: c.textMuted }]}>No words in this scope.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]}>
      <BgOrbs />

      <View style={styles.progressRow}>
        <Text style={[styles.progressCount, { color: c.textMuted }]}>{currentIndex + 1}</Text>
        <View style={[styles.progressBarTrack, { backgroundColor: `${c.bgBorder}CC` }]}>
          <View style={[styles.progressBarFill, { width: `${((currentIndex + 1) / words.length) * 100}%` }]}>
            <LinearGradient
              colors={[c.gold, `${c.gold}CC`]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </View>
        </View>
        <Text style={[styles.progressCount, { color: c.textMuted }]}>{words.length}</Text>
      </View>

      <Animated.View style={[styles.cardArea, cardContainerStyle]}>
        <TouchableOpacity style={styles.cardTouchable} activeOpacity={1} onPress={() => setIsFlipped(f => !f)}>
          <FlipCard
            isFlipped={isFlipped}
            onFlip={() => {}}
            front={<CardFront word={word} showExample={false} showImage={false} />}
            back={<CardBack word={word} showExample={false} showImage={false} mode="overview" onAgain={() => {}} onGotIt={handleGotIt} />}
          />
        </TouchableOpacity>
      </Animated.View>

      <View style={styles.controls}>
        <TouchableOpacity style={[styles.arrowBtn, { backgroundColor: `${c.bgBorder}80` }]} onPress={handlePrev} hitSlop={8}>
          <ChevronLeft size={24} color={c.textPrimary} strokeWidth={2} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.slideshowBtn, { backgroundColor: `${c.bgBorder}80`, borderColor: isPlaying ? c.gold : 'transparent' }]}
          onPress={handleSlideshowToggle}
          hitSlop={8}
        >
          {isPlaying
            ? <><Pause size={16} color={c.gold} strokeWidth={2} /><Text style={[styles.slideshowBtnText, { color: c.gold }]}> Pause</Text></>
            : <><Play size={16} color={c.textPrimary} strokeWidth={2} /><Text style={[styles.slideshowBtnText, { color: c.textPrimary }]}> Slideshow</Text></>
          }
        </TouchableOpacity>

        <TouchableOpacity style={[styles.arrowBtn, { backgroundColor: `${c.bgBorder}80` }]} onPress={handleNext} hitSlop={8}>
          <ChevronRight size={24} color={c.textPrimary} strokeWidth={2} />
        </TouchableOpacity>
      </View>


      <WordInfoSheet word={infoWord} visible={!!infoWord} onClose={() => setInfoWord(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  cardArea: { flex: 1, marginHorizontal: 20, marginVertical: 16 },
  cardTouchable: { flex: 1 },
  empty: { flex: 1, textAlign: 'center', textAlignVertical: 'center', fontSize: 16, marginTop: '50%' },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 8,
    gap: 12,
  },
  arrowBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  slideshowBtn: {
    flex: 1,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1.5,
  },
  slideshowBtnText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 14,
    fontWeight: '600',
  },
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
});
