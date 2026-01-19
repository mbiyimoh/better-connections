import type { ScheduleItem } from '../types';

interface ScheduleSectionProps {
  schedule: ScheduleItem[];
}

export function ScheduleSection({ schedule }: ScheduleSectionProps) {
  if (!schedule || schedule.length === 0) return null;

  return (
    <section className="py-24 px-4">
      <div className="max-w-3xl mx-auto">
        <p className="text-amber-500 text-sm font-medium tracking-widest uppercase mb-4 text-center">
          THE AGENDA
        </p>
        <h2
          className="text-3xl md:text-4xl text-center mb-12"
          style={{ fontFamily: 'Georgia, serif' }}
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
                <p className="text-zinc-500 text-sm">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
