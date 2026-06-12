import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSettingsStore } from '../store/settingsStore';

export default function BgOrbs() {
  const darkMode = useSettingsStore(s => s.darkMode);

  if (darkMode) {
    return (
      <View style={styles.container} pointerEvents="none">
        {/* Subtle diagonal background gradient */}
        <LinearGradient
          colors={['#0D1F35', '#080F1C', '#0A1628']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Orb 1 — top-left teal bloom */}
        <View style={[styles.orb, styles.orb1Dark]} />
        {/* Orb 2 — mid-right deep indigo */}
        <View style={[styles.orb, styles.orb2Dark]} />
        {/* Orb 3 — bottom-left blue */}
        <View style={[styles.orb, styles.orb3Dark]} />
      </View>
    );
  }

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Base — richer parchment so card lifts off clearly */}
      <LinearGradient
        colors={['#E8D8A0', '#F0E4B8', '#E2D098']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Orb 1 — top-right rich amber */}
      <View style={[styles.orb, styles.orb1Light]} />
      {/* Orb 2 — mid-left warm rose */}
      <View style={[styles.orb, styles.orb2Light]} />
      {/* Orb 3 — bottom-right deep gold */}
      <View style={[styles.orb, styles.orb3Light]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    borderRadius: 9999,
  },

  // ── Dark mode orbs ──────────────────────────────────────────────────────
  orb1Dark: {
    width: 460,
    height: 460,
    top: -160,
    left: -130,
    backgroundColor: 'rgba(16,85,140,0.50)',
  },
  orb2Dark: {
    width: 400,
    height: 400,
    top: '28%',
    right: -150,
    backgroundColor: 'rgba(50,30,120,0.38)',
  },
  orb3Dark: {
    width: 320,
    height: 320,
    bottom: 40,
    left: -60,
    backgroundColor: 'rgba(8,65,110,0.36)',
  },

  // ── Light mode orbs ─────────────────────────────────────────────────────
  orb1Light: {
    width: 480,
    height: 480,
    top: -180,
    right: -140,
    backgroundColor: 'rgba(230,155,30,0.45)',
  },
  orb2Light: {
    width: 380,
    height: 380,
    top: '28%',
    left: -140,
    backgroundColor: 'rgba(215,95,45,0.32)',
  },
  orb3Light: {
    width: 300,
    height: 300,
    bottom: 20,
    right: -60,
    backgroundColor: 'rgba(205,160,20,0.38)',
  },
});
