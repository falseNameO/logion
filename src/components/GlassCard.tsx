import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSettingsStore } from '../store/settingsStore';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  intensity?: number;
  noHighlight?: boolean;
}

export default function GlassCard({ children, style, intensity, noHighlight = false }: GlassCardProps) {
  const darkMode = useSettingsStore(s => s.darkMode);

  if (darkMode) {
    return (
      <View style={[styles.wrapperDark, style]}>
        {/* Background layer — clipped to border radius, no touch interception */}
        <View style={styles.bgClip} pointerEvents="none">
          <BlurView intensity={intensity ?? 40} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.darkTint} />
          {!noHighlight && (
            <LinearGradient
              colors={['rgba(255,255,255,0.10)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.highlightDark}
            />
          )}
        </View>
        {children}
      </View>
    );
  }

  return (
    <View style={[styles.wrapperLight, style]}>
      {/* Background layer — clipped to border radius, no touch interception */}
      <View style={styles.bgClip} pointerEvents="none">
        <BlurView intensity={intensity ?? 50} tint="light" style={StyleSheet.absoluteFill} />
        <View style={styles.lightTint} />
        {!noHighlight && (
          <LinearGradient
            colors={['rgba(255,255,255,0.80)', 'rgba(255,255,255,0.0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.highlightLight}
          />
        )}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapperDark: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.40,
    shadowRadius: 20,
    elevation: 10,
  },
  wrapperLight: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.75)',
    backgroundColor: 'rgba(255,255,255,0.45)',
    shadowColor: '#8A7040',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  bgClip: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    overflow: 'hidden',
  },
  darkTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,20,38,0.30)',
  },
  lightTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  highlightDark: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  highlightLight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
  },
});
