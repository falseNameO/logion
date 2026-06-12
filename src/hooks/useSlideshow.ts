import { useCallback, useEffect, useRef, useState } from 'react';

interface UseSlideshowOptions {
  total: number;
  /** Called by the hook when it needs the screen to flip or advance the card. */
  onFlipRequest: () => void;
  onAdvanceRequest: () => void;
}

interface UseSlideshowResult {
  isPlaying: boolean;
  currentIndex: number;
  play: () => void;
  pause: () => void;
  stop: () => void;
  advance: () => void;
  goTo: (index: number) => void;
}

/**
 * Manages slideshow playback for OverviewScreen.
 *
 * Timing per card: 2s on front → flip → 2s on back → advance.
 * The hook fires `onFlipRequest` at the 2s mark and `onAdvanceRequest` at 4s.
 * The screen owns the flip state; the hook only signals when to change it.
 */
export function useSlideshow({
  total,
  onFlipRequest,
  onAdvanceRequest,
}: UseSlideshowOptions): UseSlideshowResult {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Stable refs so interval callbacks always see the latest values without
  // needing to be recreated (avoids clearing/re-setting the interval on every
  // index change).
  const indexRef = useRef(currentIndex);
  const totalRef = useRef(total);
  const onFlipRef = useRef(onFlipRequest);
  const onAdvanceRef = useRef(onAdvanceRequest);

  useEffect(() => { indexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { totalRef.current = total; }, [total]);
  useEffect(() => { onFlipRef.current = onFlipRequest; }, [onFlipRequest]);
  useEffect(() => { onAdvanceRef.current = onAdvanceRequest; }, [onAdvanceRequest]);

  const flipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (flipTimerRef.current) clearTimeout(flipTimerRef.current);
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    flipTimerRef.current = null;
    advanceTimerRef.current = null;
  }, []);

  const scheduleCard = useCallback(() => {
    clearTimers();
    flipTimerRef.current = setTimeout(() => {
      onFlipRef.current();
    }, 2000);
    advanceTimerRef.current = setTimeout(() => {
      onAdvanceRef.current();
    }, 4000);
  }, [clearTimers]);

  // Start / stop the slideshow when isPlaying changes.
  useEffect(() => {
    if (isPlaying) {
      scheduleCard();
    } else {
      clearTimers();
    }
    return clearTimers;
  }, [isPlaying, scheduleCard, clearTimers]);

  const advance = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % (totalRef.current || 1));
  }, []);

  const play = useCallback(() => setIsPlaying(true), []);
  const pause = useCallback(() => setIsPlaying(false), []);
  const stop = useCallback(() => {
    setIsPlaying(false);
    setCurrentIndex(0);
  }, []);
  const goTo = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  return { isPlaying, currentIndex, play, pause, stop, advance, goTo };
}
