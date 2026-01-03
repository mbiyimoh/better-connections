"use client";

import { ContactChip } from "./ContactChip";
import { createContactPattern } from "@/lib/chat-parser";

interface MessageContentProps {
  content: string;
  onContactHover: (id: string | null) => void;
  onContactClick: (id: string) => void;
}

export function MessageContent({
  content,
  onContactHover,
  onContactClick,
}: MessageContentProps) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  // Create fresh regex instance to avoid shared state issues
  const pattern = createContactPattern();

  while ((match = pattern.exec(content)) !== null) {
    // Text before this match
    if (match.index > lastIndex) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {content.slice(lastIndex, match.index)}
        </span>
      );
    }

    // Extract groups: [full, contactId, name, reason]
    const [, contactId, name, reason] = match;

    // Skip if required fields are missing
    if (!contactId || !name || !reason) {
      continue;
    }

    // Contact chip
    parts.push(
      <ContactChip
        key={`chip-${match.index}`}
        contactId={contactId.trim()}
        name={name.trim()}
        onHover={onContactHover}
        onClick={onContactClick}
      />
    );

    // Reason text (trailing)
    parts.push(<span key={`reason-${match.index}`}> {reason.trim()}</span>);

    lastIndex = pattern.lastIndex;
  }

  // Remaining text after last match
  if (lastIndex < content.length) {
    parts.push(
      <span key={`text-${lastIndex}`}>{content.slice(lastIndex)}</span>
    );
  }

  return <>{parts}</>;
}
