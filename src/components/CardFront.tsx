import React, { useCallback } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PenLine, Volume2, Lightbulb } from 'lucide-react-native';
import { Word } from '../types';
import type { CardState } from '../types';
import { Fonts } from '../theme';
import { useTheme } from '../ThemeContext';
import { useSettingsStore } from '../store/settingsStore';
import * as audioService from '../services/audioService';

interface CardFrontProps {
  word: Word;
  showExample: boolean;
  showImage: boolean;
  mnemonicImageUri?: string | null;
  exampleGreek?: string | null;
  cardState?: CardState | null;
  onMnemonicPress?: () => void;
  onInfoPress?: () => void;
  mode?: 'learn' | 'overview';
}

export default function CardFront({
  word,
  showExample,
  showImage,
  mnemonicImageUri,
  exampleGreek,
  cardState,
  onMnemonicPress,
  onInfoPress,
  mode,
}: CardFrontProps) {
  const theme = useTheme();
  const darkMode = useSettingsStore(s => s.darkMode);
  const textColor = darkMode ? theme.textPrimary : theme.textDark;
  const iconBg = darkMode ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.06)';

  const handleAudio = useCallback(() => {
    if (cardState) audioService.playFront(cardState.wordId).catch(() => {});
  }, [cardState]);

  return (
    <LinearGradient
      colors={darkMode
        ? ['#1E3250', '#0E1E36'] as const
        : ['#FEFCF2', '#FDF4DC'] as const}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={[styles.card, darkMode ? styles.cardDark : styles.cardLight]}
    >
      {/* Glass sheen */}
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
        <Text style={[styles.greekWord, { color: textColor }]}>{word.greek}</Text>
        <Text style={[styles.pos, { color: theme.textMuted }]}>{word.partOfSpeech}</Text>
      </View>

      {showExample && !!exampleGreek && (
        <View style={[styles.exampleBox, { backgroundColor: darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)' }]}>
          <Text style={[styles.exampleText, { color: textColor }]}>{exampleGreek}</Text>
        </View>
      )}

      {showImage && !!mnemonicImageUri && (
        <View style={styles.imageBox}>
          <Image source={{ uri: mnemonicImageUri }} style={styles.mnemonicImage} resizeMode="contain" />
        </View>
      )}

      {mode !== 'learn' && (
        <View style={styles.bottomRow}>
          <TouchableOpacity style={[styles.iconButton, { backgroundColor: iconBg }]} hitSlop={8} onPress={onMnemonicPress}>
            <PenLine size={18} color={theme.textMuted} strokeWidth={2} />
          </TouchableOpacity>
          {cardState && (
            <TouchableOpacity style={[styles.iconButton, { backgroundColor: iconBg }]} hitSlop={8} onPress={handleAudio}>
              <Volume2 size={18} color={theme.textMuted} strokeWidth={2} />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.iconButton, { backgroundColor: iconBg }]} hitSlop={8} onPress={onInfoPress}>
            <Lightbulb size={18} color={theme.textGold} strokeWidth={2} />
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
    gap: 8,
  },
  greekWord: {
    fontFamily: Fonts.greekBold,
    fontSize: 48,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  pos: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    textTransform: 'capitalize',
    letterSpacing: 0.5,
  },
  exampleBox: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  exampleText: {
    fontFamily: Fonts.greek,
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
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingTop: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
