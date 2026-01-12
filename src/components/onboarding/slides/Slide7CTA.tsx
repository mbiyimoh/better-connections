"use client";

import { SlideLayout } from "./SlideLayout";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Slide7CTAProps {
  onComplete: () => void;
}

export function Slide7CTA({ onComplete }: Slide7CTAProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent tap navigation
    onComplete();
  };

  return (
    <SlideLayout
      visual={
        <div className="w-20 h-20 rounded-full bg-gold-subtle flex items-center justify-center">
          <Sparkles className="w-10 h-10 text-gold-primary" />
        </div>
      }
      headline="Unlock your network's full potential."
      subline=""
    >
      <Button
        onClick={handleClick}
        className="bg-gold-primary hover:bg-gold-light text-black font-semibold px-8 py-6 text-lg"
      >
        Get Started
      </Button>
      <p className="text-sm text-text-tertiary mt-4">
        Import your contacts or add them manually.
      </p>
    </SlideLayout>
  );
}
