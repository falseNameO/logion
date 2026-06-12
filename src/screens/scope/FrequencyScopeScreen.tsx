import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../types';
import WheelPicker from '../../components/WheelPicker';
import { getWordsForScope } from '../../services/wordFilterService';
import { useScopeStore } from '../../store/scopeStore';
import { saveRecentScope } from '../../services/recentsService';
import { useTheme } from '../../ThemeContext';
import { useSettingsStore } from '../../store/settingsStore';
import GlassCard from '../../components/GlassCard';
import BgOrbs from '../../components/BgOrbs';
import { Fonts } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'FrequencyScope'>;

const FREQ_VALUES = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
  12, 15, 20, 25, 30, 35, 40, 50,
  60, 75, 100, 125, 150, 200, 250,
  300, 400, 500, 750, 1000, 1500, 2000, 5000,
];
const FREQ_LABELS = FREQ_VALUES.map(String);
const DEFAULT_MIN = 30;
const DEFAULT_MAX = 100;

function closestIndex(value: number): number {
  let best = 0;
  let bestDist = Math.abs(FREQ_VALUES[0] - value);
  for (let i = 1; i < FREQ_VALUES.length; i++) {
    const d = Math.abs(FREQ_VALUES[i] - value);
    if (d < bestDist) { bestDist = d; best = i; }
  }
  return best;
}

export default function FrequencyScopeScreen({ navigation }: Props) {
  const c = useTheme();
  const darkMode = useSettingsStore(s => s.darkMode);
  const setScope = useScopeStore(s => s.setScope);

  const [minIdx, setMinIdx] = useState(() => closestIndex(DEFAULT_MIN));
  const [maxIdx, setMaxIdx] = useState(() => closestIndex(DEFAULT_MAX));
  const [wordCount, setWordCount] = useState<number | null>(null);
  const [counting, setCounting] = useState(false);

  const freqMin = FREQ_VALUES[minIdx];
  const freqMax = Math.max(freqMin, FREQ_VALUES[maxIdx]);

  useEffect(() => {
    if (maxIdx < minIdx) setMaxIdx(minIdx);
  }, [minIdx, maxIdx]);

  useEffect(() => {
    let cancelled = false;
    setCounting(true);
    getWordsForScope({ type: 'frequency', frequencyMin: freqMin, frequencyMax: freqMax })
      .then(ids => { if (!cancelled) { setWordCount(ids.length); setCounting(false); } })
      .catch(() => { if (!cancelled) { setWordCount(null); setCounting(false); } });
    return () => { cancelled = true; };
  }, [freqMin, freqMax]);

  const handleContinue = useCallback(async () => {
    const scope = { type: 'frequency' as const, frequencyMin: freqMin, frequencyMax: freqMax };
    setScope(scope);
    await saveRecentScope(scope);
    navigation.navigate('ModeSelect');
  }, [freqMin, freqMax, setScope, navigation]);

  const canContinue = !!wordCount;

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <BgOrbs />
      <View style={styles.content}>
        <Text style={[styles.heading, { color: c.textPrimary }]}>NT Frequency Range</Text>
        <Text style={[styles.explanation, { color: c.textMuted }]}>
          Words occurring more often are more essential.
          Most intro grammars cover words appearing 30× or more.
        </Text>

        <GlassCard style={styles.pickersCard}>
          <View style={styles.pickersRow}>
            <View style={styles.pickerCol}>
              <Text style={[styles.pickerLabel, { color: c.textMuted }]}>Min</Text>
              <WheelPicker items={FREQ_LABELS} selectedIndex={minIdx} onIndexChange={idx => setMinIdx(idx)} width={110} maxIndex={maxIdx} />
              <Text style={[styles.pickerUnit, { color: c.textMuted }]}>× in NT</Text>
            </View>
            <Text style={[styles.pickerSeparator, { color: c.textGold }]}>–</Text>
            <View style={styles.pickerCol}>
              <Text style={[styles.pickerLabel, { color: c.textMuted }]}>Max</Text>
              <WheelPicker items={FREQ_LABELS} selectedIndex={Math.max(minIdx, maxIdx)} onIndexChange={idx => setMaxIdx(Math.max(minIdx, idx))} width={110} minIndex={minIdx} />
              <Text style={[styles.pickerUnit, { color: c.textMuted }]}>× in NT</Text>
            </View>
          </View>
        </GlassCard>

        <View style={styles.previewRow}>
          {counting ? (
            <ActivityIndicator size="small" color={c.gold} />
          ) : (
            <Text style={[styles.previewText, { color: c.textGold }]}>
              {wordCount !== null
                ? `${wordCount} word${wordCount !== 1 ? 's' : ''} appear between ${freqMin}× and ${freqMax}× in the NT`
                : ''}
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={[styles.continueBtn, {
            backgroundColor: darkMode ? 'rgba(201,168,76,0.12)' : 'rgba(160,112,10,0.10)',
            borderColor: darkMode ? 'rgba(201,168,76,0.45)' : 'rgba(160,112,10,0.40)',
          }, !canContinue && styles.continueBtnDisabled]}
          onPress={handleContinue}
          disabled={!canContinue}
          activeOpacity={0.7}
        >
          <Text style={[styles.continueBtnText, { color: c.textGold }]}>Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 48,
    gap: 20,
  },
  heading: {
    fontFamily: Fonts.sansBold,
    fontSize: 22,
    fontWeight: '700',
    alignSelf: 'flex-start',
  },
  explanation: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 21,
    alignSelf: 'flex-start',
  },
  pickersCard: {
    width: '100%',
    paddingVertical: 24,
    paddingHorizontal: 24,
  },
  pickersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pickerCol: { alignItems: 'center', gap: 6 },
  pickerLabel: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  pickerUnit: {
    fontFamily: Fonts.sans,
    fontSize: 11,
  },
  pickerSeparator: {
    fontSize: 22,
    paddingHorizontal: 4,
  },
  previewRow: {
    height: 22,
    justifyContent: 'center',
  },
  previewText: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    textAlign: 'center',
  },
  continueBtn: {
    paddingVertical: 16,
    paddingHorizontal: 56,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  continueBtnDisabled: { opacity: 0.35 },
  continueBtnText: {
    fontFamily: Fonts.sansBold,
    fontWeight: '700',
    fontSize: 16,
  },
});
