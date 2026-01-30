import type { WhatToExpectItem } from '../types';
import { MarkdownContent } from '@/components/ui/MarkdownContent';
import { DynamicLucideIcon } from '@/components/ui/DynamicLucideIcon';

interface WhatToExpectSectionProps {
  items: WhatToExpectItem[];
  sectionNumber?: string | null;
}

export function WhatToExpectSection({ items, sectionNumber }: WhatToExpectSectionProps) {
  if (!items || items.length === 0) return null;

  return (
    <section className="py-24 px-4">
      <div className="max-w-3xl mx-auto">
        <p className="font-mono text-amber-500 text-sm font-medium tracking-widest uppercase mb-4 text-left md:text-center">
          {sectionNumber ? `${sectionNumber} — ` : ''}THE EXPERIENCE
        </p>
        <h2
          className="font-display text-3xl md:text-4xl text-left md:text-center mb-12"
        >
          What to Expect
        </h2>

        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex gap-5 items-start p-6 bg-zinc-900/50 border border-zinc-800 rounded-xl hover:border-amber-500/30 transition-colors"
            >
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <DynamicLucideIcon
                  name={item.icon}
                  className="w-6 h-6 text-amber-500"
                  fallback={<span className="text-2xl text-amber-500">{item.icon}</span>}
                />
              </div>
              <div>
                <h3 className="font-display text-lg font-medium text-white mb-1">
                  {item.title}
                </h3>
                <MarkdownContent className="text-zinc-400 text-sm leading-relaxed">
                  {item.description}
                </MarkdownContent>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
