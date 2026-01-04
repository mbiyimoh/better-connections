"use client";

import { ReactNode } from "react";

interface SlideLayoutProps {
  visual: ReactNode;
  headline: string;
  subline: string;
  children?: ReactNode; // For CTA buttons etc
}

export function SlideLayout({ visual, headline, subline, children }: SlideLayoutProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-8 max-w-lg mx-auto">
      <div className="mb-8">
        {visual}
      </div>
      <h1 className="font-display text-[28px] md:text-[32px] text-white mb-4 leading-tight">
        {headline}
      </h1>
      <p className="font-body text-base text-text-secondary leading-relaxed">
        {subline}
      </p>
      {children && <div className="mt-8">{children}</div>}
    </div>
  );
}
