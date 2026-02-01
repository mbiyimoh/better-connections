import type { Question } from './schemas';

// ========== AGGREGATION TYPES ==========

export type QuestionAggregation =
  | { type: 'single_select'; counts: Record<string, number>; total: number }
  | { type: 'multi_select'; counts: Record<string, number>; total: number }
  | { type: 'slider'; average: number; min: number; max: number; total: number }
  | {
      type: 'ranking';
      averageRanks: Array<{ value: string; label: string; averageRank: number }>;
      total: number;
    }
  | { type: 'open_text'; total: number };

// ========== AGGREGATION LOGIC ==========

export function computeAggregation(
  question: Question,
  values: Array<unknown>
): QuestionAggregation {
  switch (question.type) {
    case 'single_select':
      return aggregateSingleSelect(values);
    case 'multi_select':
      return aggregateMultiSelect(values);
    case 'slider':
      return aggregateSlider(values);
    case 'ranking':
      return aggregateRanking(question, values);
    case 'open_text':
    default:
      return { type: 'open_text', total: values.length };
  }
}

function aggregateSingleSelect(
  values: Array<unknown>
): QuestionAggregation & { type: 'single_select' } {
  const counts: Record<string, number> = {};
  let total = 0;

  for (const v of values) {
    if (v == null || typeof v !== 'string') continue;
    counts[v] = (counts[v] || 0) + 1;
    total++;
  }

  return { type: 'single_select', counts, total };
}

function aggregateMultiSelect(
  values: Array<unknown>
): QuestionAggregation & { type: 'multi_select' } {
  const counts: Record<string, number> = {};
  let total = 0;

  for (const v of values) {
    if (!Array.isArray(v)) continue;
    total++;
    for (const item of v) {
      if (typeof item === 'string') {
        counts[item] = (counts[item] || 0) + 1;
      }
    }
  }

  return { type: 'multi_select', counts, total };
}

function aggregateSlider(
  values: Array<unknown>
): QuestionAggregation & { type: 'slider' } {
  const nums: number[] = [];

  for (const v of values) {
    const n = typeof v === 'number' ? v : Number(v);
    if (!isNaN(n)) nums.push(n);
  }

  if (nums.length === 0) {
    return { type: 'slider', average: 0, min: 0, max: 0, total: 0 };
  }

  const sum = nums.reduce((a, b) => a + b, 0);
  return {
    type: 'slider',
    average: Math.round((sum / nums.length) * 10) / 10,
    min: Math.min(...nums),
    max: Math.max(...nums),
    total: nums.length,
  };
}

function aggregateRanking(
  question: Question,
  values: Array<unknown>
): QuestionAggregation & { type: 'ranking' } {
  const options = question.config?.options ?? [];
  const rankSums: Record<string, { sum: number; count: number }> = {};

  // Initialize for all known options
  for (const opt of options) {
    rankSums[opt.value] = { sum: 0, count: 0 };
  }

  let total = 0;

  for (const v of values) {
    if (!Array.isArray(v)) continue;
    total++;
    for (let i = 0; i < v.length; i++) {
      const optValue = String(v[i]);
      if (!rankSums[optValue]) {
        rankSums[optValue] = { sum: 0, count: 0 };
      }
      rankSums[optValue].sum += i + 1; // 1-based rank
      rankSums[optValue].count += 1;
    }
  }

  const averageRanks = Object.entries(rankSums)
    .filter(([, data]) => data.count > 0)
    .map(([value, data]) => {
      const opt = options.find((o) => o.value === value);
      return {
        value,
        label: opt?.label ?? value,
        averageRank: Math.round((data.sum / data.count) * 10) / 10,
      };
    })
    .sort((a, b) => a.averageRank - b.averageRank);

  return { type: 'ranking', averageRanks, total };
}
