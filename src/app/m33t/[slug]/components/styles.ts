/**
 * Shared styles for M33T landing page components
 * Provides consistent premium styling across cards, badges, and UI elements
 */

/**
 * Metallic badge/tag styling with embossed effect
 * Use for expertise tags, category badges, etc.
 */
export const METALLIC_BADGE_CLASS = `
  bg-[linear-gradient(135deg,rgba(212,165,74,0.55)_0%,rgba(245,215,130,0.70)_45%,rgba(229,199,102,0.65)_55%,rgba(212,165,74,0.50)_100%)]
  text-[#1a1610]
  border border-gold-primary/50
  [box-shadow:inset_0_1px_1px_rgba(255,255,255,0.35),inset_0_-1px_1px_rgba(0,0,0,0.15),0_2px_4px_rgba(0,0,0,0.35)]
  [text-shadow:0_0.5px_0_rgba(255,255,255,0.3)]
  font-medium
`.replace(/\n\s*/g, ' ').trim();

/**
 * Status dot glow effects keyed by RSVP status
 * Creates a soft glow around status indicators
 */
export const STATUS_GLOW: Record<string, string> = {
  confirmed: 'shadow-[0_0_0_2px_rgba(26,26,31,1),0_0_8px_rgba(16,185,129,0.6)]',
  maybe: 'shadow-[0_0_0_2px_rgba(26,26,31,1),0_0_8px_rgba(245,158,11,0.6)]',
  invited: 'shadow-[0_0_0_2px_rgba(26,26,31,1),0_0_6px_rgba(113,113,122,0.5)]',
};

/**
 * Floating card shadow (multi-layer for natural depth)
 * Use for cards that should appear to float above the surface
 */
export const FLOATING_CARD_SHADOW = `
  [box-shadow:0_2px_2px_hsl(0_0%_0%/0.18),0_4px_4px_hsl(0_0%_0%/0.16),0_8px_8px_hsl(0_0%_0%/0.14),0_16px_16px_hsl(0_0%_0%/0.12),0_24px_24px_hsl(0_0%_0%/0.08),inset_0_1px_0_rgba(255,255,255,0.06)]
`.trim();

/**
 * Floating card shadow on hover (deeper elevation)
 */
export const FLOATING_CARD_SHADOW_HOVER = `
  [box-shadow:0_4px_4px_hsl(0_0%_0%/0.20),0_8px_8px_hsl(0_0%_0%/0.18),0_16px_16px_hsl(0_0%_0%/0.16),0_24px_24px_hsl(0_0%_0%/0.12),0_32px_32px_hsl(0_0%_0%/0.08),inset_0_1px_0_rgba(255,255,255,0.08)]
`.trim();

/**
 * Text styling with 3D depth (inline style object)
 * Use for headings/names on cards
 */
export const TEXT_3D_NAME_STYLE: React.CSSProperties = {
  textShadow: '0 2px 4px rgba(0,0,0,0.7), 0 4px 8px rgba(0,0,0,0.4)',
};

/**
 * Subtitle text with depth (inline style object)
 */
export const TEXT_3D_SUBTITLE_STYLE: React.CSSProperties = {
  textShadow: '0 1px 3px rgba(0,0,0,0.6), 0 2px 6px rgba(0,0,0,0.3)',
};

/**
 * Floating attendee card base styles
 * Pebble-like with edge contouring, highlights, and depth
 */
export const FLOATING_CARD_CLASS = `
  relative
  bg-[linear-gradient(165deg,rgba(35,35,42,0.98)_0%,rgba(26,26,31,0.97)_30%,rgba(22,22,27,0.98)_100%)]
  backdrop-blur-sm
  border border-white/[0.06]
  transition-all duration-300 ease-out
  [box-shadow:0_2px_2px_hsl(0_0%_0%/0.20),0_4px_4px_hsl(0_0%_0%/0.18),0_8px_8px_hsl(0_0%_0%/0.16),0_16px_16px_hsl(0_0%_0%/0.12),0_24px_24px_hsl(0_0%_0%/0.08),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-1px_0_rgba(0,0,0,0.3),inset_1px_0_0_rgba(255,255,255,0.04),inset_-1px_0_0_rgba(0,0,0,0.15)]
  hover:translate-y-[-3px]
  hover:[box-shadow:0_4px_4px_hsl(0_0%_0%/0.22),0_8px_8px_hsl(0_0%_0%/0.20),0_16px_16px_hsl(0_0%_0%/0.18),0_24px_24px_hsl(0_0%_0%/0.14),0_32px_32px_hsl(0_0%_0%/0.10),inset_0_1px_0_rgba(255,255,255,0.10),inset_0_-1px_0_rgba(0,0,0,0.3),inset_1px_0_0_rgba(255,255,255,0.05),inset_-1px_0_0_rgba(0,0,0,0.15)]
  hover:border-amber-500/25
`.replace(/\n\s*/g, ' ').trim();

/**
 * Pebble highlight overlay - use on a div inside the card
 * Creates the curved surface illusion with edge-to-center gradient
 */
export const PEBBLE_HIGHLIGHT_STYLE: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  borderRadius: 'inherit',
  background: 'radial-gradient(ellipse 80% 50% at 30% 10%, rgba(255,255,255,0.07) 0%, transparent 60%)',
  pointerEvents: 'none',
};

/**
 * Polished avatar styling with subtle depth
 */
export const POLISHED_AVATAR_CLASS = `
  bg-[linear-gradient(145deg,rgba(63,63,70,1)_0%,rgba(39,39,42,1)_100%)]
  border border-white/[0.05]
  [box-shadow:0_2px_4px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(255,255,255,0.05)]
`.replace(/\n\s*/g, ' ').trim();

/**
 * Current focus callout container - inset panel with subtle gold tint
 * Creates a recessed area for the "current focus" text
 */
export const CURRENT_FOCUS_CALLOUT_CLASS = `
  bg-[linear-gradient(135deg,rgba(212,165,74,0.08)_0%,rgba(180,140,60,0.05)_100%)]
  rounded-lg
  px-3 py-2
  [box-shadow:inset_0_1px_3px_rgba(0,0,0,0.3),inset_0_0_0_1px_rgba(212,165,74,0.1)]
`.replace(/\n\s*/g, ' ').trim();

/**
 * Current focus text styling (inline style object)
 * Gold italic text with subtle engraved effect
 */
export const CURRENT_FOCUS_TEXT_STYLE: React.CSSProperties = {
  color: '#d4a54a', // Brand gold
  fontStyle: 'italic',
  fontSize: '12px',
  lineHeight: '1.4',
  textShadow: '0 -1px 0 rgba(0,0,0,0.5), 0 0.5px 0 rgba(255,255,255,0.2)',
};
