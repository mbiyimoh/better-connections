import type { ScheduleItem } from '../types';
import { MarkdownContent } from '@/components/ui/MarkdownContent';

interface ScheduleSectionProps {
  schedule: ScheduleItem[];
  sectionNumber?: string | null;
}

export function ScheduleSection({ schedule, sectionNumber }: ScheduleSectionProps) {
  if (!schedule || schedule.length === 0) return null;

  return (
    <section className="py-24 px-4">
      <div className="max-w-3xl mx-auto">
        <p className="font-mono text-amber-500 text-sm font-medium tracking-widest uppercase mb-4 text-left md:text-center">
          {sectionNumber ? `${sectionNumber} — ` : ''}THE AGENDA
        </p>
        <h2
          className="font-display text-3xl md:text-4xl text-left md:text-center mb-12"
        >
          How the Evening Unfolds
        </h2>

        <div className="space-y-6">
          {schedule.map((item, idx) => (
            <div
              key={idx}
              className="flex gap-6 pb-4 border-b border-zinc-800 last:border-0"
            >
              <span className="text-amber-500 font-mono text-sm w-12 flex-shrink-0">
                {item.time}
              </span>
              <div>
                <p className="text-white font-medium mb-1">{item.title}</p>
                {item.description && (
                  <MarkdownContent className="text-zinc-500 text-sm">
                    {item.description}
                  </MarkdownContent>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
