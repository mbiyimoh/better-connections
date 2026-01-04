"use client";

import { SlideLayout } from "./SlideLayout";
import { ArrowRight } from "lucide-react";

export function Slide4HowItWorks() {
  return (
    <SlideLayout
      visual={
        <div className="flex flex-col items-center">
          <div className="px-4 py-2 rounded-full border-2 border-gold-primary text-gold-primary font-bold text-lg mb-6">
            HOW?
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2 text-white/70">
              <span className="text-white">&quot;Sarah invested in D2C&quot;</span>
              <ArrowRight className="w-4 h-4 text-gold-primary" />
              <span className="text-gold-primary">matches &quot;seed round, D2C&quot;</span>
            </div>
            <div className="flex items-center gap-2 text-white/70">
              <span className="text-white">&quot;Marcus is in NYC&quot;</span>
              <ArrowRight className="w-4 h-4 text-gold-primary" />
              <span className="text-gold-primary">matches &quot;NYC next week&quot;</span>
            </div>
          </div>
        </div>
      }
      headline="How does it know who to suggest?"
      subline="Because you told it—in 30 seconds per contact."
    />
  );
}
