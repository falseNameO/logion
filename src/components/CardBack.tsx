import React, { useCallback } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Volume2 } from 'lucide-react-native';
import { StudyMode, Word } from '../types';
import type { CardState } from '../types';
import { Fonts } from '../theme';
import { useTheme } from '../ThemeContext';
import { useSettingsStore } from '../store/settingsStore';
import { againLabel, gotItLabel, memoryStrengthPercent, nextReviewLabel } from '../utils/srsDisplay';
import * as audioService from '../services/audioService';

interface CardBackProps {
  word: Word;
  showExample: boolean;
  showImage: boolean;
  mode: StudyMode;
  onAgain: () => void;
  onGotIt: () => void;
  mnemonicImageUri?: string | null;
  exampleEnglish?: string | null;
  cardState?: CardState | null;
}


function TactileButton({
  onPress, style, children,
}: {
  onPress: () => void; style: object; children: React.ReactNode; shadow?: boolean;
}) {
  return (
    <TouchableOpacity style={style} onPress={onPress} activeOpacity={0.6}>
      {children}
    </TouchableOpacity>
  );
}

export default function CardBack({
  word, showExample, showImage, mode, onAgain, onGotIt,
  mnemonicImageUri, exampleEnglish, cardState,
}: CardBackProps) {
  const theme = useTheme();
  const darkMode = useSettingsStore(s => s.darkMode);
  const textColor = darkMode ? theme.textPrimary : theme.textDark;

  const handleAudio = useCallback(() => {
    if (cardState) audioService.playBack(cardState.wordId).catch(() => {});
  }, [cardState]);

  const agLabel = cardState ? againLabel(cardState) : null;
  const giLabel = cardState ? gotItLabel(cardState) : null;
  const strength = cardState?.phase === 'retrieval' ? memoryStrengthPercent(cardState) : null;
  const nextLabel = cardState?.phase === 'retrieval' ? nextReviewLabel(cardState) : null;

  // Again: clearly distinct from card in both modes
  const againBg = darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';
  const againBorder = darkMode ? 'rgba(255,255,255,0.13)' : 'rgba(0,0,0,0.18)';

  return (
    <LinearGradient
      colors={darkMode
        ? ['#1E3250', '#0E1E36'] as const
        : ['#FEFCF2', '#FDF4DC'] as const}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={[styles.card, darkMode ? styles.cardDark : styles.cardLight]}
    >
      {darkMode && (
        <LinearGradient
          colors={['rgba(255,255,255,0.07)', 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.25 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      )}

      <View style={styles.centerBlock}>
        <Text style={[styles.gloss, { color: textColor }]}>{word.gloss}</Text>
      </View>

      {showExample && !!exampleEnglish && (
        <View style={[styles.exampleBox, { backgroundColor: darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)' }]}>
          <Text style={[styles.exampleText, { color: textColor }]}>{exampleEnglish}</Text>
        </View>
      )}

      {showImage && !!mnemonicImageUri && (
        <View style={styles.imageBox}>
          <Image source={{ uri: mnemonicImageUri }} style={styles.mnemonicImage} resizeMode="contain" />
        </View>
      )}

      {strength !== null && (
        <View style={styles.memoryRow}>
          <View style={[styles.memoryBarTrack, { backgroundColor: darkMode ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)' }]}>
            <View style={[styles.memoryBarFill, { width: `${strength}%`, backgroundColor: theme.gold }]} />
          </View>
          <Text style={[styles.memoryMeta, { color: theme.textMuted }]}>
            {strength}%{nextLabel ? `  ·  ${nextLabel}` : ''}
          </Text>
        </View>
      )}

      <View style={styles.buttonRow}>
        {mode === 'overview' ? (
          <TactileButton style={[styles.nextButton, {
              backgroundColor: darkMode ? 'rgba(201,168,76,0.12)' : 'rgba(160,112,10,0.10)',
              borderColor: darkMode ? 'rgba(201,168,76,0.45)' : 'rgba(160,112,10,0.40)',
            }]} onPress={onGotIt} shadow={false}>
            <Text style={[styles.nextLabel, { color: darkMode ? theme.gold : '#A07018' }]}>Next →</Text>
          </TactileButton>
        ) : (
          <>
            <TactileButton style={[styles.againButton, { backgroundColor: againBg, borderColor: againBorder }]} onPress={onAgain}>
              <Text style={[styles.againLabel, { color: textColor }]}>Again</Text>
              {agLabel && <Text style={[styles.buttonTimeLabel, { color: theme.textMuted }]}>{agLabel}</Text>}
            </TactileButton>
            <TactileButton style={[styles.gotItButton, {
                backgroundColor: darkMode ? 'rgba(201,168,76,0.12)' : 'rgba(160,112,10,0.10)',
                borderColor: darkMode ? 'rgba(201,168,76,0.45)' : 'rgba(160,112,10,0.40)',
              }]} onPress={onGotIt}>
              <Text style={[styles.gotItLabel, { color: darkMode ? theme.gold : '#A07018' }]}>Got It</Text>
              {giLabel && <Text style={[styles.buttonTimeLabelGold, { color: darkMode ? theme.textMuted : 'rgba(100,70,0,0.55)' }]}>{giLabel}</Text>}
            </TactileButton>
          </>
        )}
      </View>

      {cardState && mode === 'retrieval' && (
        <View style={styles.audioRow}>
          <TouchableOpacity
            onPress={handleAudio}
            hitSlop={8}
            style={[styles.audioBtn, { backgroundColor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
          >
            <Volume2 size={16} color={theme.textMuted} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    overflow: 'hidden',
  },
  cardDark: {
    borderColor: 'rgba(255,255,255,0.10)',
    shadowColor: '#050D1A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.70,
    shadowRadius: 30,
    elevation: 14,
  },
  cardLight: {
    borderColor: 'rgba(180,150,80,0.25)',
    shadowColor: '#8A7040',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.28,
    shadowRadius: 32,
    elevation: 10,
  },
  topHairline: {
    position: 'absolute',
    top: 0,
    left: 24,
    right: 24,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.90)',
  },
  centerBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gloss: {
    fontFamily: Fonts.sansBold,
    fontSize: 36,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 44,
  },
  exampleBox: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  exampleText: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  imageBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginBottom: 12,
    overflow: 'hidden',
    height: 140,
  },
  mnemonicImage: { width: '100%', height: '100%' },
  memoryRow: { marginBottom: 12, gap: 4 },
  memoryBarTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  memoryBarFill: { height: 4, borderRadius: 2 },
  memoryMeta: { fontFamily: Fonts.sans, fontSize: 11, textAlign: 'right', letterSpacing: 0.2 },
  buttonRow: { flexDirection: 'row', gap: 12 },
  buttonTimeLabel: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    marginTop: 2,
    letterSpacing: 0.2,
  },
  buttonTimeLabelGold: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    marginTop: 2,
    letterSpacing: 0.2,
    color: 'rgba(13,27,42,0.55)',
  },
  nextButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  nextLabel: {
    fontFamily: Fonts.sansBold,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  againButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  againLabel: {
    fontFamily: Fonts.sansBold,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  gotItButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  gotItLabel: {
    fontFamily: Fonts.sansBold,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  audioRow: { alignItems: 'center', marginTop: 8 },
  audioBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
