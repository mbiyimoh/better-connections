'use client';

import type { BaseSynthesis } from '@/lib/clarity-canvas/types';

interface SynthesisSummaryProps {
  synthesis: BaseSynthesis;
  className?: string;
}

/**
 * Generate a natural language summary from synthesis data
 * Now includes richer context from the enriched synthesis
 */
function generateSummary(synthesis: BaseSynthesis): string {
  const { identity, goals, activeProjects, background, values, product, market } = synthesis;

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

  // Build expertise snippet
  let expertiseDesc = '';
  if (background?.expertise && background.expertise.length > 0) {
    const topExpertise = background.expertise.slice(0, 2).join(' and ');
    expertiseDesc = ` with expertise in ${topExpertise}`;
  }

  // Get top priority goals
  const topGoals = goals
    .filter((g) => g.priority === 'high' || g.timeframe === 'now' || g.timeframe === 'immediate')
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

  // Build product/market snippet if available
  let businessContext = '';
  if (product?.coreProduct) {
    businessContext = ` Building ${product.coreProduct.toLowerCase()}`;
    if (market?.targetMarket) {
      businessContext += ` for ${market.targetMarket.toLowerCase()}`;
    }
    businessContext += '.';
  }

  // Build values snippet if available
  let valuesDesc = '';
  if (values?.coreValues && values.coreValues.length > 0) {
    const topValues = values.coreValues.slice(0, 2).join(' and ');
    valuesDesc = ` Driven by ${topValues.toLowerCase()}.`;
  }

  const mainSentence = `You're ${roleDesc} ${companyDesc}${stageDesc}${industryDesc}${expertiseDesc}${focusDesc}.`;

  // Only add extra context if we have it
  const extraContext = businessContext || valuesDesc;

  return extraContext ? `${mainSentence}${extraContext}` : mainSentence;
}

export function SynthesisSummary({ synthesis, className }: SynthesisSummaryProps) {
  const summary = generateSummary(synthesis);

  return (
    <p className={`text-zinc-300 italic ${className || ''}`}>
      &ldquo;{summary}&rdquo;
    </p>
  );
}
