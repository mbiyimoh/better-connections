import fs from 'fs';
import path from 'path';
import { parseUpdateMarkdown } from './parser';
import type { Update } from './types';

let cachedUpdates: Update[] | null = null;

/**
 * Gets all published updates, sorted by version (most recent first)
 * Results are cached in memory after first read
 */
export function getAllUpdates(): Update[] {
  if (cachedUpdates) return cachedUpdates;

  const updatesDir = path.join(process.cwd(), 'updates');

  if (!fs.existsSync(updatesDir)) {
    return [];
  }

  const files = fs.readdirSync(updatesDir)
    .filter(f => f.endsWith('.md'))
    .sort()
    .reverse(); // Most recent first (date-prefixed filenames)

  cachedUpdates = files
    .map(filename => {
      const content = fs.readFileSync(path.join(updatesDir, filename), 'utf-8');
      try {
        return parseUpdateMarkdown(content);
      } catch {
        console.warn(`Failed to parse update: ${filename}`);
        return null;
      }
    })
    .filter((u): u is Update => u !== null && u.published);

  return cachedUpdates;
}

/**
 * Gets the most recent published update
 */
export function getLatestUpdate(): Update | null {
  const updates = getAllUpdates();
  return updates[0] ?? null;
}

// Re-export types for convenience
export type { Update, UpdateSummaryItem } from './types';
