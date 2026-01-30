import { icons } from 'lucide-react';
import type { LucideProps } from 'lucide-react';

interface DynamicLucideIconProps extends LucideProps {
  /** Icon name in kebab-case ("mic-vocal") or PascalCase ("MicVocal") */
  name: string;
  /** Fallback content when icon name is not found */
  fallback?: React.ReactNode;
}

/**
 * Convert kebab-case to PascalCase: "mic-vocal" → "MicVocal"
 */
function toPascalCase(str: string): string {
  return str
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');
}

/**
 * Resolve an icon name to its PascalCase key in the icons map.
 * Handles: "mic-vocal" → "MicVocal", "car" → "Car", "MicVocal" → "MicVocal"
 */
function resolveIconName(name: string): string {
  // Already PascalCase (starts with uppercase, no hyphens)
  if (/^[A-Z]/.test(name) && !name.includes('-')) return name;
  // Kebab-case or lowercase — normalize via toPascalCase
  return toPascalCase(name);
}

/**
 * Renders a Lucide icon by name (supports kebab-case, lowercase, and PascalCase).
 * Falls back to rendering the raw string if the icon is not found
 * (handles emojis, characters like "◆", etc.)
 */
export function DynamicLucideIcon({ name, fallback, ...props }: DynamicLucideIconProps) {
  const resolvedName = resolveIconName(name);
  const IconComponent = icons[resolvedName as keyof typeof icons];

  if (IconComponent) {
    return <IconComponent {...props} />;
  }

  // Fallback: render the string directly (emoji, character, or unrecognized name)
  if (fallback) return <>{fallback}</>;
  return <span>{name}</span>;
}
