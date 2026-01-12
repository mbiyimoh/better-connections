"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { DotIndicator } from "./DotIndicator";
import { Slide1PainPoint } from "./slides/Slide1PainPoint";
import { Slide2Frustration } from "./slides/Slide2Frustration";
import { Slide3MagicMoment } from "./slides/Slide3MagicMoment";
import { Slide4HowItWorks } from "./slides/Slide4HowItWorks";
import { Slide5EnrichmentPreview } from "./slides/Slide5EnrichmentPreview";
import { Slide6AIResearch } from "./slides/Slide6AIResearch";
import { Slide7CTA } from "./slides/Slide7CTA";

const TOTAL_SLIDES = 7;

export function StoryOnboarding() {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleComplete = useCallback(async () => {
    await fetch("/api/user/complete-onboarding", { method: "POST" });
    router.push("/contacts");
  }, [router]);

  // Tap navigation (click-to-advance)
  const handleTap = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;

    if (x > rect.width / 2) {
      // Right tap → next slide
      if (currentSlide < TOTAL_SLIDES - 1) {
        setCurrentSlide(c => c + 1);
      }
    } else if (currentSlide > 0) {
      // Left tap → previous slide
      setCurrentSlide(c => c - 1);
    }
  };

  return (
    <div
      className="relative w-full h-full flex items-center justify-center cursor-pointer"
      onClick={handleTap}
    >
      {/* Dot indicator at top */}
      <div className="absolute top-8 left-0 right-0 z-10">
        <DotIndicator currentSlide={currentSlide} totalSlides={TOTAL_SLIDES} />
      </div>

      {/* Tap hint on first slide */}
      {currentSlide === 0 && (
        <p className="absolute bottom-8 left-0 right-0 text-center text-text-tertiary text-sm animate-pulse z-10">
          Tap anywhere to continue →
        </p>
      )}

      {/* Render current slide */}
      {currentSlide === 0 && <Slide1PainPoint />}
      {currentSlide === 1 && <Slide2Frustration />}
      {currentSlide === 2 && <Slide3MagicMoment />}
      {currentSlide === 3 && <Slide4HowItWorks />}
      {currentSlide === 4 && <Slide5EnrichmentPreview />}
      {currentSlide === 5 && <Slide6AIResearch />}
      {currentSlide === 6 && <Slide7CTA onComplete={handleComplete} />}
    </div>
  );
}
