import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
} from 'react-native-reanimated';

interface FlipCardProps {
  isFlipped: boolean;
  front: React.ReactNode;
  back: React.ReactNode;
  onFlip?: () => void;
}

/**
 * 3D Y-axis card flip using Reanimated rotateY.
 *
 * Both faces use absoluteFillObject so they always fill the flex: 1 parent
 * correctly, with no size locking that could cause overflow or size mismatch
 * when sibling elements (e.g. the flip hint) appear/disappear.
 *
 * Front face: rotateY 0 → 180 deg (disappears past 90°)
 * Back face:  rotateY -180 → 0 deg (appears past 90°)
 * backfaceVisibility: 'hidden' on each face hides the reversed side.
 */
export default function FlipCard({ isFlipped, front, back, onFlip }: FlipCardProps) {
  const rotation = useSharedValue(0);

  // Track previous isFlipped to detect changes without re-running on every render.
  const prevFlipped = React.useRef(isFlipped);

  // Animate whenever isFlipped changes.
  React.useEffect(() => {
    if (prevFlipped.current === isFlipped) return;
    prevFlipped.current = isFlipped;

    rotation.value = withTiming(isFlipped ? 180 : 0, {
      duration: 320,
      easing: Easing.inOut(Easing.ease),
    });
    onFlip?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFlipped]);

  const frontStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(rotation.value, [0, 180], [0, 180]);
    return {
      transform: [{ perspective: 1000 }, { rotateY: `${rotateY}deg` }],
      backfaceVisibility: 'hidden',
    };
  });

  const backStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(rotation.value, [0, 180], [-180, 0]);
    return {
      transform: [{ perspective: 1000 }, { rotateY: `${rotateY}deg` }],
      backfaceVisibility: 'hidden',
    };
  });

  return (
    <View style={styles.container}>
      {/* Front face — disable touches when showing back */}
      <Animated.View
        style={[StyleSheet.absoluteFill, frontStyle]}
        pointerEvents={isFlipped ? 'none' : 'auto'}
      >
        {front}
      </Animated.View>

      {/* Back face — disable touches when showing front */}
      <Animated.View
        style={[StyleSheet.absoluteFill, backStyle]}
        pointerEvents={isFlipped ? 'auto' : 'none'}
      >
        {back}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
