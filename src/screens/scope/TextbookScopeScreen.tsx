import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Alert,
  Modal,
  Animated,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  ActivityIndicator,
  type ListRenderItemInfo,
} from 'react-native';
import Reanimated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../types';
import { TEXTBOOKS, type TextbookMeta } from '../../constants';
import WheelPicker from '../../components/WheelPicker';
import { getWordsForScope } from '../../services/wordFilterService';
import {
  isUnlocked,
  purchaseTextbook,
  getProducts,
  type IAPProduct,
} from '../../services/iapService';
import { IAP_PRODUCT_IDS } from '../../constants';
import { useScopeStore } from '../../store/scopeStore';
import { saveRecentScope } from '../../services/recentsService';
import { useTheme } from '../../ThemeContext';
import { useSettingsStore } from '../../store/settingsStore';
import { Check, Lock, ChevronRight } from 'lucide-react-native';
import GlassCard from '../../components/GlassCard';
import BgOrbs from '../../components/BgOrbs';
import { Fonts } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'TextbookScope'>;

const MODAL_SHEET_HEIGHT = 380;

export default function TextbookScopeScreen({ navigation }: Props) {
  const c = useTheme();
  const darkMode = useSettingsStore(s => s.darkMode);
  const setScope = useScopeStore(s => s.setScope);

  const [selectedTextbook, setSelectedTextbook] = useState<TextbookMeta | null>(null);
  const [chapterFromIdx, setChapterFromIdx] = useState(0);
  const [chapterToIdx, setChapterToIdx] = useState(0);
  const [wordCount, setWordCount] = useState<number | null>(null);
  const [counting, setCounting] = useState(false);

  const [products, setProducts] = useState<IAPProduct[]>([]);
  const [purchasingSlug, setPurchasingSlug] = useState<string | null>(null);
  const [lockedModalBook, setLockedModalBook] = useState<TextbookMeta | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Bottom panel animation
  const panelAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (selectedTextbook) {
      panelAnim.setValue(0);
      Animated.spring(panelAnim, { toValue: 1, useNativeDriver: true, tension: 65, friction: 11 }).start();
    }
  }, [selectedTextbook]); // eslint-disable-line react-hooks/exhaustive-deps

  // Modal animation
  const modalTranslateY = useSharedValue(MODAL_SHEET_HEIGHT);
  const modalOpacity = useSharedValue(0);

  const openModal = useCallback((tb: TextbookMeta) => {
    setLockedModalBook(tb);
    setModalVisible(true);
    modalTranslateY.value = MODAL_SHEET_HEIGHT;
    modalOpacity.value = 0;
    modalTranslateY.value = withTiming(0, { duration: 340, easing: Easing.out(Easing.cubic) });
    modalOpacity.value = withTiming(1, { duration: 200 });
  }, [modalTranslateY, modalOpacity]);

  const closeModal = useCallback(() => {
    modalTranslateY.value = withTiming(MODAL_SHEET_HEIGHT, { duration: 260, easing: Easing.in(Easing.cubic) }, finished => {
      if (finished) runOnJS(setModalVisible)(false);
    });
    modalOpacity.value = withTiming(0, { duration: 220 });
  }, [modalTranslateY, modalOpacity]);

  const modalSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: modalTranslateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: modalOpacity.value,
  }));

  useEffect(() => {
    getProducts().then(setProducts).catch(() => {});
  }, []);

  function priceForSlug(slug: string): string | undefined {
    const productId = IAP_PRODUCT_IDS.TEXTBOOKS[slug as keyof typeof IAP_PRODUCT_IDS.TEXTBOOKS];
    return products.find(p => p.productId === productId)?.localizedPrice;
  }

  const handleUnlock = useCallback(async (slug: string) => {
    setPurchasingSlug(slug);
    try {
      await purchaseTextbook(slug);
      setPurchasingSlug(null);
      closeModal();
    } catch (err: unknown) {
      setPurchasingSlug(null);
      const msg = err instanceof Error ? err.message : 'Purchase failed.';
      if (!msg.includes('E_USER_CANCELLED') && !msg.includes('cancel')) {
        Alert.alert('Purchase Failed', msg);
      }
    }
  }, [closeModal]);

  const chapterLabels = selectedTextbook
    ? Array.from({ length: selectedTextbook.chapterCount }, (_, i) => String(i + 1))
    : [];

  const chapterFrom = chapterFromIdx + 1;
  const chapterTo = Math.max(chapterFrom, chapterToIdx + 1);

  useEffect(() => {
    if (chapterToIdx < chapterFromIdx) setChapterToIdx(chapterFromIdx);
  }, [chapterFromIdx, chapterToIdx]);

  useEffect(() => {
    if (!selectedTextbook) { setWordCount(null); return; }
    let cancelled = false;
    setCounting(true);
    getWordsForScope({ type: 'textbook', textbookSlug: selectedTextbook.slug, chapterStart: chapterFrom, chapterEnd: chapterTo })
      .then(ids => { if (!cancelled) { setWordCount(ids.length); setCounting(false); } })
      .catch(() => { if (!cancelled) { setWordCount(null); setCounting(false); } });
    return () => { cancelled = true; };
  }, [selectedTextbook, chapterFrom, chapterTo]);

  const handleTextbookTap = useCallback((tb: TextbookMeta) => {
    if (!isUnlocked(tb.slug)) { openModal(tb); return; }
    setSelectedTextbook(tb);
    setChapterFromIdx(0);
    setChapterToIdx(0);
  }, [openModal]);

  const handleContinue = useCallback(async () => {
    if (!selectedTextbook) return;
    const scope = { type: 'textbook' as const, textbookSlug: selectedTextbook.slug, chapterStart: chapterFrom, chapterEnd: chapterTo };
    setScope(scope);
    await saveRecentScope(scope);
    navigation.navigate('ModeSelect');
  }, [selectedTextbook, chapterFrom, chapterTo, setScope, navigation]);

  const renderTextbook = useCallback(
    ({ item }: ListRenderItemInfo<TextbookMeta>) => {
      const unlocked = isUnlocked(item.slug);
      const isSelected = selectedTextbook?.slug === item.slug;

      return (
        <TouchableOpacity
          onPress={() => handleTextbookTap(item)}
          activeOpacity={0.7}
          style={[styles.row, { borderBottomColor: `${c.bgBorder}50` }, isSelected && { backgroundColor: `${c.gold}18` }]}
        >
          <View style={styles.rowContent}>
            <Text style={[styles.rowTitle, { color: isSelected ? c.textGold : c.textPrimary }, isSelected && styles.rowTitleSelected]} numberOfLines={2}>
              {item.displayName}
            </Text>
            <Text style={[styles.rowMeta, { color: c.textMuted }]}>{item.chapterCount} chapters</Text>
          </View>
          {unlocked
            ? isSelected
              ? <Check size={18} color={c.gold} strokeWidth={2.5} />
              : <ChevronRight size={18} color={c.textFaint} strokeWidth={2} />
            : <Lock size={16} color={c.textMuted} strokeWidth={2} />
          }
        </TouchableOpacity>
      );
    },
    [selectedTextbook, handleTextbookTap, c],
  );

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <BgOrbs />
      <FlatList
        data={TEXTBOOKS}
        keyExtractor={tb => tb.slug}
        renderItem={renderTextbook}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {selectedTextbook && (
        <Animated.View style={{
          opacity: panelAnim,
          transform: [{ translateY: panelAnim.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) }],
        }}>
          <GlassCard style={styles.bottomPanel}>
            <Text style={[styles.panelTitle, { color: c.textPrimary }]} numberOfLines={1}>
              {selectedTextbook.displayName}
            </Text>

            <View style={styles.pickersRow}>
              <View style={styles.pickerCol}>
                <Text style={[styles.pickerLabel, { color: c.textMuted }]}>From</Text>
                <WheelPicker items={chapterLabels} selectedIndex={chapterFromIdx} onIndexChange={setChapterFromIdx} width={100} />
              </View>
              <Text style={[styles.pickerSeparator, { color: c.textGold }]}>–</Text>
              <View style={styles.pickerCol}>
                <Text style={[styles.pickerLabel, { color: c.textMuted }]}>To</Text>
                <WheelPicker items={chapterLabels} selectedIndex={chapterToIdx} onIndexChange={setChapterToIdx} minIndex={chapterFromIdx} width={100} />
              </View>
            </View>

            <View style={styles.previewRow}>
              {counting ? (
                <ActivityIndicator size="small" color={c.gold} />
              ) : (
                <Text style={[styles.previewText, { color: c.textGold }]}>
                  {wordCount !== null ? `${wordCount} word${wordCount !== 1 ? 's' : ''} in chapters ${chapterFrom === chapterTo ? chapterFrom : `${chapterFrom}–${chapterTo}`}` : ''}
                </Text>
              )}
            </View>

            <TouchableOpacity
              style={[styles.continueBtn, {
                backgroundColor: darkMode ? 'rgba(201,168,76,0.12)' : 'rgba(160,112,10,0.10)',
                borderColor: darkMode ? 'rgba(201,168,76,0.45)' : 'rgba(160,112,10,0.40)',
              }, !wordCount && styles.continueBtnDisabled]}
              onPress={handleContinue}
              disabled={!wordCount}
              activeOpacity={0.7}
            >
              <Text style={[styles.continueBtnText, { color: c.textGold }]}>Continue</Text>
            </TouchableOpacity>
          </GlassCard>
        </Animated.View>
      )}

      {/* Glass lock modal */}
      <Modal visible={modalVisible} transparent animationType="none" onRequestClose={closeModal}>
        <TouchableWithoutFeedback onPress={closeModal}>
          <Reanimated.View style={[styles.modalBackdrop, backdropStyle]} />
        </TouchableWithoutFeedback>

        {lockedModalBook && (
          <Reanimated.View style={[styles.modalSheet, modalSheetStyle]}>
            {/* Glass background */}
            <BlurView
              intensity={darkMode ? 80 : 60}
              tint={darkMode ? 'dark' : 'default'}
              style={StyleSheet.absoluteFill}
            />
            {/* Border top */}
            <View style={[styles.modalBorderTop, { borderColor: darkMode ? 'rgba(201,168,76,0.20)' : 'rgba(255,255,255,0.80)' }]} />

            <View style={[styles.modalHandle, { backgroundColor: darkMode ? 'rgba(255,255,255,0.20)' : 'rgba(0,0,0,0.15)' }]} />

            <View style={[styles.lockCircle, { backgroundColor: darkMode ? 'rgba(201,168,76,0.15)' : 'rgba(160,112,10,0.10)', borderWidth: 1, borderColor: darkMode ? 'rgba(201,168,76,0.25)' : 'rgba(160,112,10,0.20)' }]}>
              <Lock size={28} color={c.textGold} strokeWidth={2} />
            </View>

            <Text style={[styles.modalTitle, { color: c.textPrimary }]}>{lockedModalBook.displayName}</Text>
            <Text style={[styles.modalPrice, { color: c.textMuted }]}>
              {priceForSlug(lockedModalBook.slug) ?? 'Unlock to access this textbook'}
            </Text>

            {purchasingSlug === lockedModalBook.slug ? (
              <ActivityIndicator color={c.gold} style={{ marginTop: 20 }} />
            ) : (
              <TouchableOpacity
                style={[styles.unlockBtn, {
                  backgroundColor: darkMode ? 'rgba(201,168,76,0.12)' : 'rgba(160,112,10,0.10)',
                  borderColor: darkMode ? 'rgba(201,168,76,0.45)' : 'rgba(160,112,10,0.40)',
                }]}
                onPress={() => handleUnlock(lockedModalBook.slug)}
                activeOpacity={0.8}
              >
                <Text style={[styles.unlockBtnText, { color: c.textGold }]}>Unlock</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.cancelBtn} onPress={closeModal}>
              <Text style={[styles.cancelBtnText, { color: c.textMuted }]}>Cancel</Text>
            </TouchableOpacity>
          </Reanimated.View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: { flex: 1 },
  listContent: { paddingVertical: 8, paddingHorizontal: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 2,
    borderBottomWidth: 1,
  },
  rowContent: { flex: 1 },
  rowTitle: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    marginBottom: 4,
    lineHeight: 20,
  },
  rowTitleSelected: {
    fontFamily: Fonts.sansBold,
    fontWeight: '600',
  },
  rowMeta: {
    fontFamily: Fonts.sans,
    fontSize: 12,
  },
  bottomPanel: {
    borderRadius: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  panelTitle: {
    fontFamily: Fonts.sansBold,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
    maxWidth: '90%',
  },
  pickersRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pickerCol: { alignItems: 'center', gap: 6 },
  pickerLabel: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  pickerSeparator: { fontSize: 22, marginTop: 28, paddingHorizontal: 4 },
  previewRow: { marginTop: 16, height: 20, justifyContent: 'center' },
  previewText: { fontFamily: Fonts.sans, fontSize: 14 },
  continueBtn: { marginTop: 20, paddingVertical: 16, paddingHorizontal: 48, borderRadius: 12, borderWidth: 1 },
  continueBtnDisabled: { opacity: 0.35 },
  continueBtnText: { fontFamily: Fonts.sansBold, fontWeight: '700', fontSize: 16 },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  modalSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: MODAL_SHEET_HEIGHT,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
  modalBorderTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    marginTop: 12,
    marginBottom: 20,
  },
  lockCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontFamily: Fonts.sansBold, fontSize: 17, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  modalPrice: { fontFamily: Fonts.sans, fontSize: 14, textAlign: 'center', marginBottom: 24 },
  unlockBtn: { paddingVertical: 16, paddingHorizontal: 56, borderRadius: 12, borderWidth: 1, marginBottom: 12, width: '100%', alignItems: 'center' },
  unlockBtnText: { fontFamily: Fonts.sansBold, fontWeight: '700', fontSize: 16 },
  cancelBtn: { paddingVertical: 12, width: '100%', alignItems: 'center' },
  cancelBtnText: { fontFamily: Fonts.sans, fontSize: 15 },
});
