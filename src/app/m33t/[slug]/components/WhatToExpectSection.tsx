import type { WhatToExpectItem } from '../types';

interface WhatToExpectSectionProps {
  items: WhatToExpectItem[];
}

export function WhatToExpectSection({ items }: WhatToExpectSectionProps) {
  if (!items || items.length === 0) return null;

  return (
    <section className="py-24 px-4">
      <div className="max-w-5xl mx-auto">
        <p className="text-amber-500 text-sm font-medium tracking-widest uppercase mb-4 text-center">
          THE EXPERIENCE
        </p>
        <h2
          className="text-3xl md:text-4xl text-center mb-12"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          What to Expect
        </h2>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 text-center hover:border-amber-500/30 transition-colors"
            >
              <span className="text-3xl text-amber-500 mb-4 block">{item.icon}</span>
              <h3
                className="text-lg font-medium text-white mb-2"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                {item.title}
              </h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
