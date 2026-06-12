import React, { useRef, useCallback, useEffect } from 'react';
import {
  FlatList,
  View,
  Text,
  StyleSheet,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ListRenderItemInfo,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTheme } from '../ThemeContext';
import { useSettingsStore } from '../store/settingsStore';
import { Fonts } from '../theme';

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
const PAD_ITEMS = Math.floor(VISIBLE_ITEMS / 2);

export interface WheelPickerProps {
  items: string[];
  selectedIndex: number;
  onIndexChange: (index: number) => void;
  width?: number;
  minIndex?: number;
  maxIndex?: number;
}

export default function WheelPicker({ items, selectedIndex, onIndexChange, width = 120, minIndex, maxIndex }: WheelPickerProps) {
  const c = useTheme();
  const darkMode = useSettingsStore(s => s.darkMode);
  const listRef = useRef<FlatList<string>>(null);
  const isUserScrolling = useRef(false);

  const paddedItems = [...Array(PAD_ITEMS).fill(''), ...items, ...Array(PAD_ITEMS).fill('')];

  // Scroll wheel to selectedIndex only when driven externally (not while user is dragging)
  useEffect(() => {
    if (!isUserScrolling.current) {
      listRef.current?.scrollToIndex({ index: selectedIndex, animated: true });
    }
  }, [selectedIndex]);

  const handleScrollBegin = useCallback(() => {
    isUserScrolling.current = true;
  }, []);

  const handleScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      isUserScrolling.current = false;
      const offsetY = e.nativeEvent.contentOffset.y;
      const rawIndex = Math.round(offsetY / ITEM_HEIGHT);
      const lo = minIndex ?? 0;
      const hi = maxIndex ?? items.length - 1;
      const clampedIndex = Math.max(lo, Math.min(hi, rawIndex));
      if (clampedIndex !== selectedIndex) {
        onIndexChange(clampedIndex);
      } else {
        // Value didn't change but wheel may be at wrong position — snap it back
        listRef.current?.scrollToIndex({ index: clampedIndex, animated: true });
      }
    },
    [items.length, selectedIndex, onIndexChange, minIndex, maxIndex],
  );

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<string>) => {
      const realIndex = index - PAD_ITEMS;
      const isSelected = realIndex === selectedIndex;
      const isPad = item === '';
      return (
        <View style={[styles.item, { width }]}>
          {!isPad && (
            <Text
              style={[
                styles.itemText,
                { color: c.textFaint },
                isSelected && [styles.itemTextSelected, { color: c.textPrimary }],
              ]}
              numberOfLines={1}
            >
              {item}
            </Text>
          )}
        </View>
      );
    },
    [selectedIndex, width, c],
  );

  const getItemLayout = useCallback(
    (_: ArrayLike<string> | null | undefined, index: number) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index }),
    [],
  );

  const bgTransparent = darkMode ? 'rgba(13,27,42,0)' : 'rgba(244,236,210,0)';
  const bgSolid       = darkMode ? 'rgba(13,27,42,0.92)' : 'rgba(244,236,210,0.95)';

  return (
    <View style={[
      styles.wrapper,
      darkMode ? styles.wrapperDark : styles.wrapperLight,
      { width },
    ]}>
      {/* Glass blur background */}
      <View style={[StyleSheet.absoluteFill, styles.blurClip]} pointerEvents="none">
        <BlurView
          intensity={darkMode ? 30 : 40}
          tint={darkMode ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: darkMode ? 'rgba(10,20,38,0.45)' : 'rgba(255,255,255,0.30)' }]} />
      </View>

      <View style={[styles.container, { width, height: PICKER_HEIGHT }]}>
        {/* Selection band */}
        <View
          style={[styles.selectionBand, { top: ITEM_HEIGHT * PAD_ITEMS, width, borderColor: c.gold, backgroundColor: `${c.gold}18` }]}
          pointerEvents="none"
        />

        <FlatList
          ref={listRef}
          data={paddedItems}
          keyExtractor={(_, i) => String(i)}
          renderItem={renderItem}
          getItemLayout={getItemLayout}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          onScrollBeginDrag={handleScrollBegin}
          onMomentumScrollEnd={handleScrollEnd}
          onScrollEndDrag={handleScrollEnd}
          initialScrollIndex={selectedIndex}
          contentContainerStyle={{ paddingVertical: 0 }}
        />

        {/* Gradient fades */}
        <LinearGradient
          colors={[bgSolid, bgTransparent]}
          style={[styles.fade, styles.fadeTop, { width }]}
          pointerEvents="none"
        />
        <LinearGradient
          colors={[bgTransparent, bgSolid]}
          style={[styles.fade, styles.fadeBottom, { width }]}
          pointerEvents="none"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  wrapperDark: {
    borderColor: 'rgba(255,255,255,0.09)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  wrapperLight: {
    borderColor: 'rgba(255,255,255,0.70)',
    shadowColor: '#8A7040',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 5,
  },
  blurClip: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  container: { overflow: 'hidden' },
  item: { height: ITEM_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  itemText: { fontFamily: Fonts.sans, fontSize: 17 },
  itemTextSelected: { fontFamily: Fonts.sansBold, fontWeight: '600', fontSize: 19 },
  selectionBand: {
    position: 'absolute',
    height: ITEM_HEIGHT,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    zIndex: 1,
  },
  fade: { position: 'absolute', height: ITEM_HEIGHT * PAD_ITEMS, zIndex: 2 },
  fadeTop: { top: 0 },
  fadeBottom: { bottom: 0 },
});
