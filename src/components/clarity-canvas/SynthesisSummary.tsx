'use client';

import type { BaseSynthesis } from '@/lib/clarity-canvas/types';

interface SynthesisSummaryProps {
  synthesis: BaseSynthesis;
  className?: string;
}

/**
 * Generate a natural language summary from synthesis data
 */
function generateSummary(synthesis: BaseSynthesis): string {
  const { identity, goals, activeProjects } = synthesis;

  // Build role description
  const roleDesc = identity.role ? `a ${identity.role.toLowerCase()}` : 'working';

  // Build company description
  const companyDesc = identity.company ? `at ${identity.company}` : '';

  // Build stage description
  const stageDesc =
    identity.companyStage !== 'unknown' ? ` (${identity.companyStage} stage)` : '';

  // Build industry description
  const industryDesc = identity.industry
    ? ` in the ${identity.industry.toLowerCase()} space`
    : '';

  // Get top priority goals
  const topGoals = goals
    .filter((g) => g.priority === 'high' || g.timeframe === 'immediate')
    .slice(0, 2)
    .map((g) => g.goal.toLowerCase());

  // Get active projects
  const activeProjectNames = activeProjects
    .filter((p) => p.status === 'active')
    .slice(0, 1)
    .map((p) => p.name.toLowerCase());

  // Build focus description
  let focusDesc = '';
  if (topGoals.length > 0) {
    focusDesc = `, focused on ${topGoals.join(' and ')}`;
  } else if (activeProjectNames.length > 0) {
    focusDesc = `, working on ${activeProjectNames[0]}`;
  }

  return `You're ${roleDesc} ${companyDesc}${stageDesc}${industryDesc}${focusDesc}.`;
}

export function SynthesisSummary({ synthesis, className }: SynthesisSummaryProps) {
  const summary = generateSummary(synthesis);

  return (
    <p className={`text-zinc-300 italic ${className || ''}`}>
      &ldquo;{summary}&rdquo;
    </p>
  );
}
