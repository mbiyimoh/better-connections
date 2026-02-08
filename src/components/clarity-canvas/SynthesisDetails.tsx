'use client';

import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Target,
  Users,
  Briefcase,
  AlertTriangle,
} from 'lucide-react';
import type { BaseSynthesis } from '@/lib/clarity-canvas/types';

interface SynthesisDetailsProps {
  synthesis: BaseSynthesis;
  defaultExpanded?: boolean;
}

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  count: number;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

function Section({
  title,
  icon,
  count,
  children,
  defaultExpanded = false,
}: SectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="border-t border-white/10 pt-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left text-sm text-white hover:text-gold-primary transition-colors"
      >
        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        {icon}
        <span className="font-medium">{title}</span>
        <span className="text-zinc-500">({count})</span>
      </button>
      {expanded && <div className="mt-2 pl-6 space-y-1">{children}</div>}
    </div>
  );
}

export function SynthesisDetails({
  synthesis,
  defaultExpanded = false,
}: SynthesisDetailsProps) {
  const { goals, personas, activeProjects, painPoints, strategicPriorities } =
    synthesis;

  return (
    <div className="space-y-3">
      {/* Goals Section */}
      {goals.length > 0 && (
        <Section
          title="Goals"
          icon={<Target size={16} className="text-gold-primary" />}
          count={goals.length}
          defaultExpanded={defaultExpanded}
        >
          {goals.map((goal, i) => (
            <div key={i} className="text-sm text-zinc-400">
              &bull; {goal.goal}
              <span className="text-zinc-600 ml-1">
                ({goal.priority} priority, {goal.timeframe})
              </span>
            </div>
          ))}
        </Section>
      )}

      {/* Target Personas Section */}
      {personas.length > 0 && (
        <Section
          title="Target Personas"
          icon={<Users size={16} className="text-gold-primary" />}
          count={personas.length}
          defaultExpanded={defaultExpanded}
        >
          {personas.map((persona, i) => (
            <div key={i} className="text-sm mb-2">
              <div className="text-zinc-300 font-medium">&bull; {persona.name}</div>
              <div className="text-zinc-500 pl-3 text-xs">
                <div>Role: {persona.role}</div>
                <div>Goal: {persona.primaryGoal}</div>
                <div>Frustration: {persona.topFrustration}</div>
              </div>
            </div>
          ))}
        </Section>
      )}

      {/* Active Projects Section */}
      {activeProjects.length > 0 && (
        <Section
          title="Active Projects"
          icon={<Briefcase size={16} className="text-gold-primary" />}
          count={activeProjects.length}
          defaultExpanded={defaultExpanded}
        >
          {activeProjects.map((project, i) => (
            <div key={i} className="text-sm text-zinc-400">
              &bull; {project.name}
              <span className="text-zinc-600 ml-1">
                ({project.status}, {project.priority} priority)
              </span>
            </div>
          ))}
        </Section>
      )}

      {/* Strategic Priorities */}
      {strategicPriorities.length > 0 && (
        <Section
          title="Strategic Priorities"
          icon={<Target size={16} className="text-gold-primary" />}
          count={strategicPriorities.length}
          defaultExpanded={defaultExpanded}
        >
          {strategicPriorities.map((priority, i) => (
            <div key={i} className="text-sm text-zinc-400">
              &bull; {priority}
            </div>
          ))}
        </Section>
      )}

      {/* Pain Points Section */}
      {painPoints.length > 0 && (
        <Section
          title="Challenges"
          icon={<AlertTriangle size={16} className="text-gold-primary" />}
          count={painPoints.length}
          defaultExpanded={defaultExpanded}
        >
          {painPoints.map((pain, i) => (
            <div key={i} className="text-sm text-zinc-400">
              &bull; {pain.pain}
              <span className="text-zinc-600 ml-1">
                ({pain.severity}, {pain.category})
              </span>
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}
