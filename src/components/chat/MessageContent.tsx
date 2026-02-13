"use client";

import { ContactChip } from "./ContactChip";
import { createContactPattern } from "@/lib/chat-parser";

/**
 * Represents a contact that was successfully matched from the AI response
 * to an actual contact in the database.
 */
export interface ResolvedContact {
  resolvedId: string;      // Actual contact ID from database
  displayName: string;     // Contact's actual name for display
}

interface MessageContentProps {
  content: string;
  onContactHover: (id: string | null) => void;
  onContactClick: (id: string) => void;
  /**
   * Map of parsed identifiers (contactId, name) to resolved contact data.
   * When provided, chips only render for successfully matched contacts.
   * Unmatched contacts render as bold text instead.
   */
  resolvedContacts?: Map<string, ResolvedContact>;
}

/**
 * Parse inline markdown (bold only) and return React nodes
 */
function parseInlineMarkdown(text: string, keyPrefix: string): React.ReactNode[] {
  const result: React.ReactNode[] = [];
  // Match **bold** text
  const boldPattern = /\*\*([^*]+)\*\*/g;
  let lastIndex = 0;
  let match;

  while ((match = boldPattern.exec(text)) !== null) {
    // Text before the bold
    if (match.index > lastIndex) {
      result.push(text.slice(lastIndex, match.index));
    }
    // Bold text
    result.push(
      <strong key={`${keyPrefix}-bold-${match.index}`} className="font-semibold">
        {match[1]}
      </strong>
    );
    lastIndex = boldPattern.lastIndex;
  }

  // Remaining text
  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex));
  }

  return result.length > 0 ? result : [text];
}

export function MessageContent({
  content,
  onContactHover,
  onContactClick,
  resolvedContacts,
}: MessageContentProps) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  // Create fresh regex instance to avoid shared state issues
  const pattern = createContactPattern();

  while ((match = pattern.exec(content)) !== null) {
    // Text before this match - parse for markdown
    if (match.index > lastIndex) {
      const textBefore = content.slice(lastIndex, match.index);
      parts.push(
        <span key={`text-${lastIndex}`}>
          {parseInlineMarkdown(textBefore, `pre-${lastIndex}`)}
        </span>
      );
    }

    // Extract groups: [full, contactId, name, reason]
    const [, contactId, name, reason] = match;

    // Skip if required fields are missing
    if (!contactId || !name || !reason) {
      continue;
    }

    // When resolvedContacts is provided, use it to determine if we render a chip or plain text
    if (resolvedContacts) {
      // Try to find resolved contact by parsed ID or name
      const resolved = resolvedContacts.get(contactId.trim())
        || resolvedContacts.get(name.trim().toLowerCase());

      if (resolved) {
        // Successfully matched - render ContactChip with resolved data
        parts.push(
          <ContactChip
            key={`chip-${match.index}`}
            contactId={resolved.resolvedId}
            name={resolved.displayName}
            onHover={onContactHover}
            onClick={onContactClick}
          />
        );
      } else {
        // Unmatched contact - render as bold text (graceful degradation)
        parts.push(
          <strong key={`unmatched-${match.index}`} className="font-semibold text-white/80">
            {name.trim()}
          </strong>
        );
      }
    } else {
      // Legacy behavior: no resolvedContacts provided, render chip with raw data
      parts.push(
        <ContactChip
          key={`chip-${match.index}`}
          contactId={contactId.trim()}
          name={name.trim()}
          onHover={onContactHover}
          onClick={onContactClick}
        />
      );
    }

    // Reason text (trailing) - parse for markdown
    parts.push(
      <span key={`reason-${match.index}`}>
        {" "}{parseInlineMarkdown(reason.trim(), `reason-${match.index}`)}
      </span>
    );

    lastIndex = pattern.lastIndex;
  }

  // Remaining text after last match - parse for markdown
  if (lastIndex < content.length) {
    const remaining = content.slice(lastIndex);
    parts.push(
      <span key={`text-${lastIndex}`}>
        {parseInlineMarkdown(remaining, `end-${lastIndex}`)}
      </span>
    );
  }

  return <>{parts}</>;
}
