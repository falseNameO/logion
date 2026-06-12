import React, { useCallback, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Animated, {
  FadeInDown,
  FadeOutUp,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  BookOpen,
  BookMarked,
  BarChart3,
  ChevronRight,
  ChevronDown,
  Clock,
  Settings,
} from 'lucide-react-native';

import { getRecentScopes } from '../services/recentsService';
import { useScopeStore } from '../store/scopeStore';
import type { RootStackParamList, ScopeConfig } from '../types';
import { Colors, Fonts, Radius, Spacing } from '../theme';
import { useTheme } from '../ThemeContext';
import { SCOPE_TYPE_LABELS } from '../constants';
import GlassCard from '../components/GlassCard';
import BgOrbs from '../components/BgOrbs';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

function scopeLabel(scope: ScopeConfig): string {
  switch (scope.type) {
    case 'bible_chapter': {
      const book = scope.book ?? '';
      const from = scope.chapterStart ?? 1;
      const to = scope.chapterEnd ?? from;
      return from === to ? `${book} ${from}` : `${book} ${from}–${to}`;
    }
    case 'textbook': {
      const slug = scope.textbookSlug ?? '';
      const label = slug.charAt(0).toUpperCase() + slug.slice(1);
      const from = scope.chapterStart ?? 1;
      const to = scope.chapterEnd ?? from;
      return from === to ? `${label} ch. ${from}` : `${label} ch. ${from}–${to}`;
    }
    case 'frequency':
      return `Freq. ${scope.frequencyMin ?? ''}–${scope.frequencyMax ?? ''}`;
  }
}

function ScopeIcon({ type, color, size = 20 }: { type: ScopeConfig['type']; color: string; size?: number }) {
  if (type === 'bible_chapter') return <BookOpen size={size} color={color} strokeWidth={2} />;
  if (type === 'textbook') return <BookMarked size={size} color={color} strokeWidth={2} />;
  return <BarChart3 size={size} color={color} strokeWidth={2} />;
}

const MODE_OPTIONS: { label: string; route: keyof RootStackParamList; Icon: typeof BookOpen; desc: string }[] = [
  { label: SCOPE_TYPE_LABELS.bible_chapter, route: 'BibleChapterScope', Icon: BookOpen,   desc: 'Study words from a NT passage' },
  { label: SCOPE_TYPE_LABELS.textbook,      route: 'TextbookScope',     Icon: BookMarked, desc: 'Follow a textbook chapter order' },
  { label: SCOPE_TYPE_LABELS.frequency,     route: 'FrequencyScope',    Icon: BarChart3,  desc: 'Filter by NT occurrence count' },
];

export default function HomeScreen({ navigation }: Props) {
  const theme = useTheme();
  const setScope = useScopeStore(s => s.setScope);
  const [recents, setRecents] = useState<ScopeConfig[]>([]);
  const [recentsLoading, setRecentsLoading] = useState(true);
  const [recentsExpanded, setRecentsExpanded] = useState(false);
  const chevronRotation = useSharedValue(0);
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotation.value}deg` }],
  }));

  const RECENTS_COLLAPSED_COUNT = 3;
  const visibleRecents = useMemo(
    () => recentsExpanded ? recents : recents.slice(0, RECENTS_COLLAPSED_COUNT),
    [recents, recentsExpanded],
  );

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getRecentScopes().then(r => {
        if (!cancelled) {
          setRecents(r);
          setRecentsLoading(false);
        }
      });
      return () => { cancelled = true; };
    }, []),
  );

  const handleRecentTap = useCallback(
    (scope: ScopeConfig) => {
      setScope(scope);
      navigation.navigate('ModeSelect');
    },
    [setScope, navigation],
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>
      <BgOrbs />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* App title */}
        <View style={styles.titleBlock}>
          <Text style={[styles.appTitle, { color: theme.textGold }]}>Logion</Text>
          <Text style={[styles.appSubtitle, { color: theme.textMuted }]}>NT Greek vocabulary</Text>
        </View>

        {/* Scope type picker */}
        <Text style={[styles.sectionHeader, { color: theme.textMuted }]}>Choose a scope</Text>
        <View style={styles.modeList}>
          {MODE_OPTIONS.map((opt, i) => (
            <Animated.View key={opt.route} entering={FadeInDown.delay(i * 60).duration(300)}>
              <TouchableOpacity
                onPress={() => navigation.navigate(opt.route as any)}
                activeOpacity={0.75}
              >
                <GlassCard style={styles.modeCard}>
                  <View style={styles.modeCardInner}>
                    <View style={[styles.modeIconWrap, { backgroundColor: `${theme.gold}22` }]}>
                      <opt.Icon size={22} color={theme.gold} strokeWidth={2} />
                    </View>
                    <View style={styles.modeLabelBlock}>
                      <Text style={[styles.modeLabel, { color: theme.textPrimary }]}>{opt.label}</Text>
                      <Text style={[styles.modeDesc, { color: theme.textMuted }]}>{opt.desc}</Text>
                    </View>
                    <ChevronRight size={18} color={theme.textFaint} strokeWidth={2} />
                  </View>
                </GlassCard>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>

        {/* Recents */}
        <Text style={[styles.sectionHeader, { color: theme.textMuted }]}>Recent scopes</Text>

        {recentsLoading ? (
          <ActivityIndicator color={theme.gold} style={styles.recentsLoader} />
        ) : recents.length === 0 ? (
          <GlassCard style={styles.emptyCard}>
            <View style={styles.emptyState}>
              <Clock size={36} color={theme.textMuted} strokeWidth={1.5} />
              <Text style={[styles.emptyTitle, { color: theme.textMuted }]}>No sessions yet</Text>
              <Text style={[styles.emptyBody, { color: theme.textFaint }]}>
                Your recently studied scopes will appear here once you start a session.
              </Text>
            </View>
          </GlassCard>
        ) : (
          <GlassCard style={styles.recentCard}>
            {visibleRecents.map((scope, i) => (
              <Animated.View key={i} entering={FadeInDown.delay(i * 40 + 120).duration(280)} exiting={FadeOutUp.duration(180)}>
                <TouchableOpacity
                  style={[
                    styles.recentRow,
                    (i < visibleRecents.length - 1 || recents.length > RECENTS_COLLAPSED_COUNT) && { borderBottomWidth: 1, borderBottomColor: `${theme.bgBorder}80` },
                  ]}
                  onPress={() => handleRecentTap(scope)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.recentIconWrap, { backgroundColor: `${theme.gold}18` }]}>
                    <ScopeIcon type={scope.type} color={theme.gold} size={16} />
                  </View>
                  <View style={styles.recentText}>
                    <Text style={[styles.recentLabel, { color: theme.textPrimary }]}>{scopeLabel(scope)}</Text>
                    <Text style={[styles.recentType, { color: theme.textMuted }]}>{SCOPE_TYPE_LABELS[scope.type]}</Text>
                  </View>
                  <ChevronRight size={16} color={theme.textFaint} strokeWidth={2} />
                </TouchableOpacity>
              </Animated.View>
            ))}
            {recents.length > RECENTS_COLLAPSED_COUNT && (
              <TouchableOpacity
                style={[styles.expandRow, { borderTopWidth: recentsExpanded ? 0 : 0 }]}
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  const next = !recentsExpanded;
                  chevronRotation.value = withTiming(next ? 180 : 0, { duration: 250 });
                  setRecentsExpanded(next);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.expandLabel, { color: theme.textMuted }]}>
                  {recentsExpanded
                    ? 'Show less'
                    : `Show ${recents.length - RECENTS_COLLAPSED_COUNT} more`}
                </Text>
                <Animated.View style={chevronStyle}>
                  <ChevronDown size={14} color={theme.textMuted} strokeWidth={2} />
                </Animated.View>
              </TouchableOpacity>
            )}
          </GlassCard>
        )}
      </ScrollView>

      {/* Settings gear */}
      <TouchableOpacity
        style={[styles.settingsBtn, { backgroundColor: `${theme.bgBorder}60` }]}
        onPress={() => navigation.navigate('Settings')}
        hitSlop={12}
      >
        <Settings size={20} color={theme.textMuted} strokeWidth={2} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
    paddingTop: 96,
  },

  titleBlock: {
    marginBottom: Spacing.xl,
    marginTop: 0,
  },
  appTitle: {
    fontFamily: Fonts.greekBoldItalic,
    fontSize: 36,
    letterSpacing: 0.5,
  },
  appSubtitle: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    marginTop: 4,
  },

  sectionHeader: {
    fontFamily: Fonts.sansBold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },

  modeList: {
    gap: Spacing.sm,
  },
  modeCard: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  modeCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  modeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeLabelBlock: {
    flex: 1,
    gap: 2,
  },
  modeLabel: {
    fontFamily: Fonts.sansMedium,
    fontSize: 15,
  },
  modeDesc: {
    fontFamily: Fonts.sans,
    fontSize: 12,
  },

  recentsLoader: {
    marginTop: Spacing.lg,
  },
  recentCard: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    overflow: 'hidden',
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  recentIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentText: {
    flex: 1,
    gap: 2,
  },
  recentLabel: {
    fontFamily: Fonts.sansMedium,
    fontSize: 15,
  },
  recentType: {
    fontFamily: Fonts.sans,
    fontSize: 12,
  },

  expandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    gap: 6,
  },
  expandLabel: {
    fontFamily: Fonts.sans,
    fontSize: 13,
  },

  emptyCard: {
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontFamily: Fonts.sansBold,
    fontSize: 15,
    marginTop: 4,
  },
  emptyBody: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },

  settingsBtn: {
    position: 'absolute',
    top: 80,
    right: Spacing.lg,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
