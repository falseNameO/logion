import React, { useState } from 'react';
import {
  Alert,
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Volume2, Moon, RotateCcw, ShoppingBag, Info, ChevronRight, ExternalLink } from 'lucide-react-native';

import { resetAllProgress } from '../database/progressRepository';
import { clearRecents } from '../services/recentsService';
import { restorePurchases, type PurchaseResult } from '../services/iapService';
import { useSettingsStore } from '../store/settingsStore';
import { useTheme } from '../ThemeContext';
import type { RootStackParamList } from '../types';
import GlassCard from '../components/GlassCard';
import BgOrbs from '../components/BgOrbs';
import { Fonts } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const APP_VERSION = '1.0.0';
const PRIVACY_URL = 'https://logion.app/privacy';
const INSPIRATION_URL = 'https://dannyzacharias.net';

export default function SettingsScreen(_props: Props) {
  const theme = useTheme();
  const pronunciationType = useSettingsStore(s => s.pronunciationType);
  const darkMode = useSettingsStore(s => s.darkMode);
  const setPronunciation = useSettingsStore(s => s.setPronunciation);
  const toggleDarkMode = useSettingsStore(s => s.toggleDarkMode);

  const [isResetting, setIsResetting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [purchaseResults, setPurchaseResults] = useState<PurchaseResult[]>([]);

  function handleResetProgress() {
    Alert.alert(
      'Reset All Progress?',
      'This will permanently delete all your SRS progress, including every graduated word. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset', style: 'destructive',
          onPress: async () => {
            setIsResetting(true);
            try {
              await resetAllProgress();
              await clearRecents();
              Alert.alert('Done', 'All progress has been reset.');
            } catch {
              Alert.alert('Error', 'Could not reset progress. Please try again.');
            } finally {
              setIsResetting(false); }
          },
        },
      ],
    );
  }

  async function handleRestorePurchases() {
    setIsRestoring(true);
    setPurchaseResults([]);
    try {
      const results = await restorePurchases();
      setPurchaseResults(results);
      if (results.length === 0) Alert.alert('No Purchases Found', 'No previous purchases were found for this account.');
      else Alert.alert('Restored', `${results.length} purchase(s) restored.`);
    } catch {
      Alert.alert('Error', 'Could not restore purchases. Please try again later.');
    } finally {
      setIsRestoring(false);
    }
  }

  function openUrl(url: string) {
    Linking.openURL(url).catch(() => Alert.alert('Could not open link', url));
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>
      <BgOrbs />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        <SectionHeader title="Audio" icon={<Volume2 size={14} color={theme.textMuted} />} />
        <GlassCard style={styles.sectionCard} noHighlight>
          <PronunciationRow label="Erasmian" selected={pronunciationType === 'erasmian'} onSelect={() => setPronunciation('erasmian')} theme={theme} />
          <PronunciationRow label="Reconstructed Koine" sublabel="Coming soon" selected={pronunciationType === 'koine'} onSelect={() => setPronunciation('koine')} disabled theme={theme} />
        </GlassCard>

        <SectionHeader title="Appearance" icon={<Moon size={14} color={theme.textMuted} />} />
        <GlassCard style={styles.sectionCard} noHighlight>
          <View style={[styles.row, { borderBottomColor: `${theme.bgBorder}60` }]}>
            <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>Dark Mode</Text>
            <Switch
              value={darkMode}
              onValueChange={toggleDarkMode}
              trackColor={{ false: theme.bgBorder, true: theme.gold }}
              thumbColor="#F5ECD7"
            />
          </View>
        </GlassCard>

        <SectionHeader title="Progress" icon={<RotateCcw size={14} color={theme.textMuted} />} />
        <GlassCard style={styles.sectionCard} noHighlight>
          <TouchableOpacity style={[styles.row, styles.destructiveRow]} onPress={handleResetProgress} disabled={isResetting} activeOpacity={0.75}>
            <Text style={styles.destructiveLabel}>{isResetting ? 'Resetting…' : 'Reset All Progress'}</Text>
          </TouchableOpacity>
          <Text style={[styles.sectionNote, { color: theme.textFaint }]}>
            Permanently deletes all SRS progress. Your word library is unaffected.
          </Text>
        </GlassCard>

        <SectionHeader title="Purchases" icon={<ShoppingBag size={14} color={theme.textMuted} />} />
        <GlassCard style={styles.sectionCard} noHighlight>
          <TouchableOpacity style={[styles.row, { borderBottomColor: `${theme.bgBorder}60` }]} onPress={handleRestorePurchases} disabled={isRestoring} activeOpacity={0.75}>
            <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>{isRestoring ? 'Restoring…' : 'Restore Purchases'}</Text>
            <ChevronRight size={18} color={theme.textFaint} strokeWidth={2} />
          </TouchableOpacity>
          {purchaseResults.length > 0 && (
            <View style={styles.purchaseResults}>
              {purchaseResults.map(r => (
                <View key={r.productId} style={styles.purchaseRow}>
                  <Text style={[styles.purchaseId, { color: theme.textMuted }]} numberOfLines={1}>
                    {r.productId.replace('com.logion.', '')}
                  </Text>
                  <PurchaseBadge status={r.status} />
                </View>
              ))}
            </View>
          )}
        </GlassCard>

        <SectionHeader title="About" icon={<Info size={14} color={theme.textMuted} />} />
        <GlassCard style={styles.sectionCard} noHighlight>
          <View style={[styles.row, { borderBottomColor: `${theme.bgBorder}60` }]}>
            <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>Version</Text>
            <Text style={[styles.rowValue, { color: theme.textMuted }]}>{APP_VERSION}</Text>
          </View>
          <TouchableOpacity style={[styles.row, { borderBottomColor: `${theme.bgBorder}60` }]} onPress={() => openUrl(INSPIRATION_URL)} activeOpacity={0.75}>
            <View style={styles.rowMultiLine}>
              <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>Inspiration</Text>
              <Text style={[styles.rowSublabel, { color: theme.textMuted }]}>FlashGreek by Danny Zacharias</Text>
            </View>
            <ExternalLink size={16} color={theme.textFaint} strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.row, { borderBottomColor: `${theme.bgBorder}60` }]} onPress={() => openUrl(PRIVACY_URL)} activeOpacity={0.75}>
            <View style={styles.rowMultiLine}>
              <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>Privacy Policy</Text>
              <Text style={[styles.rowSublabel, { color: theme.textMuted }]}>No data collected or transmitted</Text>
            </View>
            <ExternalLink size={16} color={theme.textFaint} strokeWidth={2} />
          </TouchableOpacity>
        </GlassCard>

      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({ title, icon }: { title: string; icon: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={sectionHeaderStyles.row}>
      {icon}
      <Text style={[sectionHeaderStyles.text, { color: theme.textMuted }]}>{title.toUpperCase()}</Text>
    </View>
  );
}

const sectionHeaderStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingTop: 28, paddingBottom: 8 },
  text: { fontFamily: Fonts.sansBold, fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
});

function PronunciationRow({ label, sublabel, selected, onSelect, disabled, theme }: {
  label: string; sublabel?: string; selected: boolean; onSelect: () => void; disabled?: boolean; theme: ReturnType<typeof useTheme>;
}) {
  return (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: `${theme.bgBorder}60` }, disabled && styles.rowDisabled]}
      onPress={onSelect} disabled={disabled} activeOpacity={0.75}
    >
      <View style={styles.rowMultiLine}>
        <Text style={[styles.rowLabel, { color: theme.textPrimary }, disabled && styles.rowLabelDisabled]}>{label}</Text>
        {sublabel && <Text style={[styles.rowSublabel, { color: theme.textMuted }]}>{sublabel}</Text>}
      </View>
      <View style={[styles.radioOuter, selected && !disabled && { borderColor: theme.gold }]}>
        {selected && !disabled && <View style={[styles.radioInner, { backgroundColor: theme.gold }]} />}
      </View>
    </TouchableOpacity>
  );
}

function PurchaseBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    purchased:    { bg: '#1A3D2B', text: '#C8F5D6' },
    restored:     { bg: '#1A3D2B', text: '#C8F5D6' },
    error:        { bg: '#3D1C10', text: '#FFB8A0' },
    not_purchased: { bg: '#1C2E42', text: '#8899AA' },
  };
  const c = colors[status] ?? colors.not_purchased;
  return (
    <View style={[badgeStyles.chip, { backgroundColor: c.bg }]}>
      <Text style={[badgeStyles.label, { color: c.text }]}>{status.replace('_', ' ')}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  chip: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  label: { fontFamily: Fonts.sansBold, fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 48 },

  sectionCard: {
    marginHorizontal: 16,
    paddingHorizontal: 0,
    paddingVertical: 0,
    overflow: 'hidden',
  },
  sectionNote: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    lineHeight: 17,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  rowDisabled: { opacity: 0.45 },
  rowLabel: { fontFamily: Fonts.sans, fontSize: 15 },
  rowLabelDisabled: { opacity: 0.6 },
  rowSublabel: { fontFamily: Fonts.sans, fontSize: 12, marginTop: 2 },
  rowValue: { fontFamily: Fonts.sans, fontSize: 14 },
  rowMultiLine: { flex: 1 },

  destructiveRow: { borderBottomWidth: 0 },
  destructiveLabel: { fontFamily: Fonts.sans, fontSize: 15, color: '#FF6B6B', fontWeight: '500' },

  radioOuter: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#3A5070',
    alignItems: 'center', justifyContent: 'center',
  },
  radioInner: { width: 11, height: 11, borderRadius: 5.5 },

  purchaseResults: { paddingHorizontal: 16, paddingBottom: 12, paddingTop: 4, gap: 8 },
  purchaseRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  purchaseId: { fontFamily: Fonts.sans, fontSize: 13, flex: 1, marginRight: 12 },
});
