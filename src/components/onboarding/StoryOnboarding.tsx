"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { StoryProgressBar } from "./StoryProgressBar";
import { Slide1PainPoint } from "./slides/Slide1PainPoint";
import { Slide2Frustration } from "./slides/Slide2Frustration";
import { Slide3MagicMoment } from "./slides/Slide3MagicMoment";
import { Slide4HowItWorks } from "./slides/Slide4HowItWorks";
import { Slide5EnrichmentPreview } from "./slides/Slide5EnrichmentPreview";
import { Slide6CTA } from "./slides/Slide6CTA";

const TOTAL_SLIDES = 6;

export function StoryOnboarding() {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [progress, setProgress] = useState(0);

  const handleComplete = useCallback(async () => {
    await fetch("/api/user/complete-onboarding", { method: "POST" });
    router.push("/contacts/new");
  }, [router]);

  // Auto-advance timer
  useEffect(() => {
    // Pause on final slide
    if (currentSlide === TOTAL_SLIDES - 1) return;

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          if (currentSlide < TOTAL_SLIDES - 1) {
            setCurrentSlide(c => c + 1);
            return 0;
          }
          return 100;
        }
        return prev + 1.5; // ~6.6 seconds per slide
      });
    }, 100);

    return () => clearInterval(interval);
  }, [currentSlide]);

  // Tap navigation
  const handleTap = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;

    if (x > rect.width / 2) {
      // Right tap → next
      if (currentSlide < TOTAL_SLIDES - 1) {
        setCurrentSlide(c => c + 1);
        setProgress(0);
      } else {
        handleComplete();
      }
    } else if (currentSlide > 0) {
      // Left tap → previous
      setCurrentSlide(c => c - 1);
      setProgress(0);
    }
  };

  return (
    <div
      className="relative w-full h-full flex items-center justify-center cursor-pointer"
      onClick={handleTap}
    >
      <StoryProgressBar
        totalSlides={TOTAL_SLIDES}
        currentSlide={currentSlide}
        progress={progress}
      />

      {/* Render current slide */}
      {currentSlide === 0 && <Slide1PainPoint />}
      {currentSlide === 1 && <Slide2Frustration />}
      {currentSlide === 2 && <Slide3MagicMoment />}
      {currentSlide === 3 && <Slide4HowItWorks />}
      {currentSlide === 4 && <Slide5EnrichmentPreview />}
      {currentSlide === 5 && <Slide6CTA onComplete={handleComplete} />}
    </div>
  );
}
