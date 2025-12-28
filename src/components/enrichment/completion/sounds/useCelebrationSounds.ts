"use client";

import { useCallback, useRef, useEffect } from "react";

// Pentatonic scale frequencies for soft, pleasant chimes
// These create a Chinese bell/meditation bowl quality
const SCORE_COMPLETE_FREQUENCIES = [523.25, 659.25, 783.99]; // C5, E5, G5 major chord
const RANK_REVEAL_FREQUENCIES = [783.99, 987.77, 1174.66]; // G5, B5, D6 higher chord

export function useCelebrationSounds() {
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize audio context on first user interaction (required for mobile)
  useEffect(() => {
    const initAudio = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext)();
      }
    };

    document.addEventListener("click", initAudio, { once: true });
    document.addEventListener("touchstart", initAudio, { once: true });

    return () => {
      document.removeEventListener("click", initAudio);
      document.removeEventListener("touchstart", initAudio);
    };
  }, []);

  const playChime = useCallback(
    (frequencies: number[], duration: number = 0.8) => {
      const ctx = audioContextRef.current;
      if (!ctx) return;

      // Resume if suspended (browser autoplay policy)
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const now = ctx.currentTime;

      frequencies.forEach((freq, i) => {
        // Create oscillator with sine wave for soft bell-like tone
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now);

        // Create gain node for ADSR-like envelope
        const gain = ctx.createGain();

        // Bell-like envelope: quick attack, long exponential decay
        // Volume capped at 0.15 for subtle, non-jarring sound
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.15, now + 0.02); // Quick 20ms attack
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration); // Slow decay

        // Slight delay between notes for arpeggio effect
        const delay = i * 0.08;

        // Connect audio graph
        osc.connect(gain);
        gain.connect(ctx.destination);

        // Schedule playback
        osc.start(now + delay);
        osc.stop(now + delay + duration);
      });
    },
    []
  );

  const playScoreComplete = useCallback(() => {
    playChime(SCORE_COMPLETE_FREQUENCIES, 1.0);
  }, [playChime]);

  const playRankReveal = useCallback(() => {
    playChime(RANK_REVEAL_FREQUENCIES, 1.2);
  }, [playChime]);

  return { playScoreComplete, playRankReveal };
}
