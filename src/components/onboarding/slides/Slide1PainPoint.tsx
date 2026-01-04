"use client";

import { SlideLayout } from "./SlideLayout";
import { Users } from "lucide-react";

export function Slide1PainPoint() {
  return (
    <SlideLayout
      visual={
        <div className="flex flex-col items-center justify-center w-32 h-32 rounded-2xl border border-white/10 bg-white/5">
          <Users className="w-10 h-10 text-[#606068] mb-2" />
          <span className="text-2xl font-bold text-[#606068]">347</span>
          <span className="text-xs text-[#606068]">contacts</span>
        </div>
      }
      headline="You have the perfect connection."
      subline="You just can't find them."
    />
  );
}
