"use client";

import { SlideLayout } from "./SlideLayout";
import { HelpCircle } from "lucide-react";

export function Slide2Frustration() {
  return (
    <SlideLayout
      visual={
        <div className="flex flex-col items-center">
          <p className="text-lg text-white/80 italic mb-4 max-w-xs">
            &quot;I&apos;m raising a seed round... who do I know that could help?&quot;
          </p>
          <div className="w-16 h-16 rounded-full border-2 border-white/20 flex items-center justify-center">
            <HelpCircle className="w-8 h-8 text-white/40" />
          </div>
          <p className="text-sm text-white/30 mt-4">scrolling... scrolling...</p>
        </div>
      }
      headline="Scrolling through names doesn't work."
      subline="Your network is trapped in a flat list of names."
    />
  );
}
