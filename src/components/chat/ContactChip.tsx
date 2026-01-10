"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { getInitialsFromName, getHueFromName } from "@/lib/contact-utils";

interface ContactChipProps {
  contactId: string;
  name: string;
  onHover: (id: string | null) => void;
  onClick: (id: string) => void;
}

export function ContactChip({
  contactId,
  name,
  onHover,
  onClick,
}: ContactChipProps) {
  const [isPressed, setIsPressed] = useState(false);
  const initials = getInitialsFromName(name);
  const hue = useMemo(() => getHueFromName(name), [name]);

  // Generate consistent colors based on name (matches avatar gradient)
  const colors = useMemo(() => ({
    bg: `hsla(${hue}, 60%, 50%, 0.15)`,
    bgHover: `hsla(${hue}, 60%, 50%, 0.25)`,
    border: `hsla(${hue}, 60%, 50%, 0.30)`,
    borderHover: `hsla(${hue}, 60%, 50%, 0.50)`,
    text: `hsl(${hue}, 60%, 65%)`,
    avatarBg: `hsla(${hue}, 60%, 50%, 0.30)`,
    focusRing: `hsla(${hue}, 60%, 50%, 0.50)`,
  }), [hue]);

  // Unified handler for press state (touch + mouse)
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsPressed(true);
    // Only call onHover for mouse (desktop hover preview)
    if (e.pointerType === 'mouse') {
      onHover(contactId);
    }
  };

  const handlePointerUp = () => {
    setIsPressed(false);
  };

  const handlePointerLeave = (e: React.PointerEvent) => {
    setIsPressed(false);
    // Only call onHover(null) for mouse
    if (e.pointerType === 'mouse') {
      onHover(null);
    }
  };

  const handlePointerCancel = () => {
    setIsPressed(false);
  };

  // Keep mouse enter/leave for desktop hover (when not pressing)
  const handleMouseEnter = () => {
    if (!isPressed) {
      onHover(contactId);
    }
  };

  const handleMouseLeave = () => {
    if (!isPressed) {
      onHover(null);
    }
  };

  const isHighlighted = isPressed;

  return (
    <motion.button
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full",
        "text-sm font-medium",
        "transition-colors cursor-pointer",
        "focus:outline-none focus:ring-2"
      )}
      style={{
        backgroundColor: isHighlighted ? colors.bgHover : colors.bg,
        borderWidth: "1px",
        borderStyle: "solid",
        borderColor: isHighlighted ? colors.borderHover : colors.border,
        color: colors.text,
        // @ts-expect-error CSS custom property for focus ring
        "--tw-ring-color": colors.focusRing,
      }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onPointerCancel={handlePointerCancel}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={() => onClick(contactId)}
      whileTap={{ scale: 0.98 }}
      role="button"
      aria-label={`View contact: ${name}`}
    >
      <span
        className="w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-semibold"
        style={{ backgroundColor: colors.avatarBg }}
      >
        {initials}
      </span>
      <span>{name}</span>
    </motion.button>
  );
}
