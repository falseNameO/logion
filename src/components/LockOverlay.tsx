import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Lock } from 'lucide-react-native';
import { useTheme } from '../ThemeContext';
import { Fonts } from '../theme';

interface LockOverlayProps {
  locked: boolean;
  children: React.ReactNode;
  featureName?: string;
  price?: string;
  onUnlock?: () => void;
  isPurchasing?: boolean;
}

export default function LockOverlay({
  locked,
  children,
  featureName,
  price,
  onUnlock,
  isPurchasing = false,
}: LockOverlayProps) {
  const c = useTheme();
  return (
    <View style={styles.root}>
      {children}
      {locked && (
        <View style={[styles.overlay, { backgroundColor: 'rgba(8,18,30,0.88)' }]}>
          <View style={[styles.lockCircle, { backgroundColor: `${c.gold}22`, borderColor: `${c.gold}50` }]}>
            <Lock size={20} color={c.gold} strokeWidth={2} />
          </View>

          {featureName && (
            <Text style={[styles.featureName, { color: c.textGold }]} numberOfLines={2}>
              {featureName}
            </Text>
          )}

          {price && !isPurchasing && (
            <Text style={[styles.price, { color: c.textMuted }]}>{price}</Text>
          )}

          {isPurchasing ? (
            <ActivityIndicator color={c.gold} style={styles.spinner} />
          ) : (
            onUnlock && (
              <TouchableOpacity
                style={[styles.unlockBtn, { backgroundColor: c.gold }]}
                onPress={onUnlock}
                activeOpacity={0.8}
                hitSlop={8}
              >
                <Text style={[styles.unlockBtnText, { color: c.textDark }]}>Unlock</Text>
              </TouchableOpacity>
            )
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'relative' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  lockCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureName: {
    fontFamily: Fonts.sansMedium,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
  price: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    textAlign: 'center',
  },
  spinner: { marginTop: 4 },
  unlockBtn: {
    marginTop: 2,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  unlockBtnText: {
    fontFamily: Fonts.sansBold,
    fontSize: 13,
    fontWeight: '700',
  },
});
