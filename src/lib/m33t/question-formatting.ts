import { formatDistanceToNow, format, isAfter, subDays } from 'date-fns';
import type { Question } from './schemas';

/**
 * Format a question response value for display.
 * Maps option values to labels for select/ranking types.
 */
export function formatResponseValue(
  value: string | number | string[] | null,
  question: Question
): string {
  if (value === null || value === undefined) return 'No answer';

  switch (question.type) {
    case 'single_select': {
      const option = question.config?.options?.find((o) => o.value === value);
      return option?.label ?? String(value);
    }
    case 'multi_select': {
      const values = Array.isArray(value) ? value : [value];
      return values
        .map((v) => {
          const option = question.config?.options?.find((o) => o.value === v);
          return option?.label ?? String(v);
        })
        .join(', ');
    }
    case 'slider':
      return String(value);
    case 'ranking': {
      const values = Array.isArray(value) ? value : [];
      return values
        .map((v, i) => {
          const option = question.config?.options?.find((o) => o.value === v);
          return `${i + 1}. ${option?.label ?? v}`;
        })
        .join(', ');
    }
    case 'open_text':
    default:
      return String(value);
  }
}

/**
 * Format a date as relative time (e.g., "2 hours ago") if within 7 days,
 * otherwise as "Jan 15" format.
 */
export function formatRelativeDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const sevenDaysAgo = subDays(new Date(), 7);

  if (isAfter(d, sevenDaysAgo)) {
    return formatDistanceToNow(d, { addSuffix: true });
  }

  return format(d, 'MMM d');
}
