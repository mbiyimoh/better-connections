"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, MessageSquare, Users, MessageSquarePlus } from "lucide-react";
import Link from "next/link";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatInput } from "@/components/chat/ChatInput";
import { ContactCard } from "@/components/chat/ContactCard";
import { DraftIntroModal } from "@/components/chat/DraftIntroModal";
import { MobileContactOverlay } from "@/components/explore/MobileContactOverlay";
import { JumpToBottomIndicator } from "@/components/chat/JumpToBottomIndicator";
import { parseContactSuggestions } from "@/lib/chat-parser";
import { useDebouncedCallback } from "use-debounce";
import { getDisplayName } from "@/types/contact";
import { useIsMobile } from "@/hooks/useMediaQuery";

interface ContactTag {
  id: string;
  text: string;
  category: string;
}

interface Contact {
  id: string;
  firstName: string;
  lastName: string | null;
  title: string | null;
  company: string | null;
  location: string | null;
  primaryEmail: string | null;
  howWeMet: string | null;
  whyNow: string | null;
  expertise: string | null;
  interests: string | null;
  relationshipStrength: number;
  lastContactDate: string | null;
  tags: ContactTag[];
}

interface SuggestedContact {
  contact: Contact;
  dynamicWhyNow: string;
}

interface ChatMessageData {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function ExplorePage() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const contactsRef = useRef<Contact[]>([]);
  const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [suggestedContacts, setSuggestedContacts] = useState<SuggestedContact[]>([]);
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [draftIntroContact, setDraftIntroContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hoveredContactId, setHoveredContactId] = useState<string | null>(null);
  // Maps identifiers (IDs, emails, names) to actual contact IDs for chip hover/click
  const identifierToIdMap = useRef<Map<string, string>>(new Map());

  // Mobile-specific state
  const [mobileOverlayOpen, setMobileOverlayOpen] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showJumpIndicator, setShowJumpIndicator] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const userJustSentMessage = useRef(false);
  const userScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollSentinelRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevMessagesLength = useRef(0);

  const handleChatSubmit = async (userMessage: string) => {
    if (!userMessage.trim() || isLoading) return;

    const userMsg: ChatMessageData = {
      id: Date.now().toString(),
      role: "user",
      content: userMessage,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat/explore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      const decoder = new TextDecoder();
      let assistantContent = "";
      const assistantId = (Date.now() + 1).toString();

      // Add empty assistant message
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "" },
      ]);

      // Stream the response
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        assistantContent += chunk;

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: assistantContent } : m
          )
        );
      }

      // Parse contact suggestions from completed response
      // Use contactsRef to avoid stale closure issue
      const suggestions = parseContactSuggestions(assistantContent);

      if (suggestions.length > 0) {
        const newSuggested: SuggestedContact[] = [];
        // Additive mapping: accumulate identifiers across all messages
        // This allows chips from previous messages to still work

        for (const suggestion of suggestions) {
          // Try exact ID match first
          let contact = contactsRef.current.find(
            (c) => c.id === suggestion.contactId
          );

          // Fallback: If identifier looks like email, try email match
          if (!contact && suggestion.contactId.includes('@')) {
            const emailLower = suggestion.contactId.toLowerCase();
            contact = contactsRef.current.find(
              (c) => c.primaryEmail?.toLowerCase() === emailLower
            );
            if (contact) {
              // Email fallback match successful
            }
          }

          // Fallback: Try case-insensitive name match as last resort
          if (!contact) {
            const nameLower = suggestion.name.trim().toLowerCase();
            contact = contactsRef.current.find((c) => {
              const displayName = `${c.firstName}${c.lastName ? ' ' + c.lastName : ''}`.toLowerCase();
              return displayName === nameLower;
            });
            if (contact) {
              // Name fallback match successful
            }
          }

          if (contact) {
            // Store mapping from parsed identifier to actual contact ID
            // This allows chip hover/click to work even when AI uses email/name
            identifierToIdMap.current.set(suggestion.contactId, contact.id);
            identifierToIdMap.current.set(suggestion.name.trim().toLowerCase(), contact.id);

            // Avoid duplicates
            if (!newSuggested.some(s => s.contact.id === contact!.id)) {
              newSuggested.push({
                contact,
                dynamicWhyNow: suggestion.reason,
              });
            }
          }
          // Note: Unmatched contacts are silently skipped - this is expected when
          // AI references contacts outside the loaded set
        }
        if (newSuggested.length > 0) {
          setSuggestedContacts(newSuggested);
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      // Show user-friendly error message
      const errorMsg: ChatMessageData = {
        id: (Date.now() + 2).toString(),
        role: "assistant",
        content: "Sorry, I encountered an error processing your request. Please try again.",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch all contacts on mount
  useEffect(() => {
    fetchContacts();
  }, []);

  // Desktop: scroll to bottom when new messages arrive
  useEffect(() => {
    if (!isMobile) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isMobile]);

  // Keep contactsRef in sync with contacts state to avoid stale closure
  useEffect(() => {
    contactsRef.current = contacts;
  }, [contacts]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
      if (userScrollTimeoutRef.current) {
        clearTimeout(userScrollTimeoutRef.current);
      }
    };
  }, []);

  // Mobile: scroll position tracking with IntersectionObserver
  useEffect(() => {
    if (!isMobile) return;
    const sentinel = scrollSentinelRef.current;
    const container = scrollContainerRef.current;
    if (!sentinel || !container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        const atBottom = entry.isIntersecting;
        setIsAtBottom(atBottom);
        if (atBottom) {
          setShowJumpIndicator(false);
          setUnreadCount(0);
        }
      },
      {
        root: container,
        threshold: 0.1,
        rootMargin: '-100px'
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isMobile]);

  // Mobile: track unread count when not at bottom
  useEffect(() => {
    if (!isMobile) return;
    if (!isAtBottom && messages.length > prevMessagesLength.current) {
      const newMessages = messages.length - prevMessagesLength.current;
      setUnreadCount(prev => Math.min(prev + newMessages, 99));
    }
    prevMessagesLength.current = messages.length;
  }, [messages, isAtBottom, isMobile]);

  // Mobile: show jump indicator when streaming and not at bottom
  useEffect(() => {
    if (!isMobile) return;
    if (isLoading && !isAtBottom && !userJustSentMessage.current) {
      setShowJumpIndicator(true);
    }
  }, [isLoading, isAtBottom, isMobile]);

  // Mobile: auto-scroll only when user sends a message
  useEffect(() => {
    if (!isMobile) return;
    if (userJustSentMessage.current && scrollContainerRef.current) {
      requestAnimationFrame(() => {
        scrollContainerRef.current?.scrollTo({
          top: scrollContainerRef.current.scrollHeight,
          behavior: 'smooth',
        });
      });
      if (userScrollTimeoutRef.current) {
        clearTimeout(userScrollTimeoutRef.current);
      }
      userScrollTimeoutRef.current = setTimeout(() => {
        userJustSentMessage.current = false;
      }, 500);
    }
  }, [messages, isMobile]);

  // Auto-close overlay when resizing to desktop
  useEffect(() => {
    if (!isMobile && mobileOverlayOpen) {
      setMobileOverlayOpen(false);
    }
  }, [isMobile, mobileOverlayOpen]);

  // Resolve identifier (could be ID, email, or name) to actual contact ID
  const resolveContactId = useCallback((identifier: string): string | null => {
    // Check if it's already a valid contact ID
    if (contactsRef.current.some(c => c.id === identifier)) {
      return identifier;
    }
    // Check the identifier map (populated during suggestion parsing)
    const mapped = identifierToIdMap.current.get(identifier);
    if (mapped) return mapped;
    // Try lowercase version for name matching
    const lowerMapped = identifierToIdMap.current.get(identifier.toLowerCase());
    if (lowerMapped) return lowerMapped;
    // Fallback: try email match directly
    if (identifier.includes('@')) {
      const emailLower = identifier.toLowerCase();
      const contact = contactsRef.current.find(c => c.primaryEmail?.toLowerCase() === emailLower);
      if (contact) return contact.id;
    }
    return null;
  }, []);

  const handleContactHover = useCallback((identifier: string | null) => {
    if (!identifier) {
      setHoveredContactId(null);
      return;
    }
    const actualId = resolveContactId(identifier);
    setHoveredContactId(actualId);
  }, [resolveContactId]);

  const handleContactClick = useCallback((identifier: string) => {
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }
    const actualId = resolveContactId(identifier);
    if (!actualId) {
      // Silently ignore unresolved identifiers - expected when AI references contacts outside loaded set
      return;
    }

    if (isMobile) {
      // Open overlay first, then scroll after animation completes
      setMobileOverlayOpen(true);
      setTimeout(() => {
        const element = document.getElementById(`contact-card-${actualId}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          setHoveredContactId(actualId);
          highlightTimeoutRef.current = setTimeout(() => {
            setHoveredContactId(null);
          }, 2000);
        }
      }, 350); // Wait for spring animation
    } else {
      // Desktop: existing behavior
      const element = document.getElementById(`contact-card-${actualId}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        setHoveredContactId(actualId);
        highlightTimeoutRef.current = setTimeout(() => {
          setHoveredContactId(null);
        }, 2000);
      }
    }
  }, [resolveContactId, isMobile]);

  const fetchContacts = async () => {
    try {
      // IMPORTANT: Must match the ordering used in /api/chat/explore (enrichmentScore DESC)
      // The AI only sees contacts from that query, so we need the same set here
      // to properly match suggested contact IDs
      const res = await fetch("/api/contacts?limit=100&sort=enrichmentScore&order=desc");
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts);
      }
    } catch (error) {
      console.error("Failed to fetch contacts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = (message: string) => {
    userJustSentMessage.current = true;
    handleChatSubmit(message);
  };

  const handlePin = (contactId: string) => {
    setPinnedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(contactId)) {
        newSet.delete(contactId);
      } else {
        newSet.add(contactId);
      }
      return newSet;
    });
  };

  const handleDraftIntro = (contact: Contact) => {
    setDraftIntroContact(contact);
  };

  const handleViewContact = (contactId: string) => {
    router.push(`/contacts/${contactId}`);
  };

  // Filter contacts by search query
  const debouncedSearch = useDebouncedCallback((query: string) => {
    setSearchQuery(query);
  }, 300);

  const getFilteredContacts = useCallback(() => {
    let result: Contact[] = [];

    // If we have suggested contacts from AI, show those
    if (suggestedContacts.length > 0) {
      result = suggestedContacts.map((s) => s.contact);
    } else if (searchQuery) {
      // Otherwise filter by search
      const query = searchQuery.toLowerCase();
      result = contacts.filter(
        (c) =>
          getDisplayName(c).toLowerCase().includes(query) ||
          c.primaryEmail?.toLowerCase().includes(query) ||
          c.company?.toLowerCase().includes(query)
      );
    } else {
      // Default: show top contacts by enrichment score
      result = contacts.slice(0, 10);
    }

    // Sort pinned to top
    return result.sort((a, b) => {
      const aPinned = pinnedIds.has(a.id);
      const bPinned = pinnedIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return 0;
    });
  }, [contacts, suggestedContacts, searchQuery, pinnedIds]);

  const getDynamicWhyNow = (contactId: string): string | undefined => {
    const suggested = suggestedContacts.find((s) => s.contact.id === contactId);
    return suggested?.dynamicWhyNow;
  };

  const handleShowContacts = useCallback(() => {
    setMobileOverlayOpen(true);
  }, []);

  const handleJumpToBottom = useCallback(() => {
    scrollContainerRef.current?.scrollTo({
      top: scrollContainerRef.current.scrollHeight,
      behavior: 'smooth',
    });
    setShowJumpIndicator(false);
    setUnreadCount(0);
  }, []);

  const displayedContacts = getFilteredContacts();

  // SSR guard
  if (isMobile === undefined || loading) {
    return (
      <div className="min-h-screen bg-[#0D0D0F] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-gold-primary" />
      </div>
    );
  }

  // Mobile layout
  if (isMobile) {
    return (
      <div className="h-screen bg-bg-primary flex flex-col">
        {/* Header with contacts button - pl-16 clears hamburger menu */}
        <header className="flex items-center justify-between p-4 pl-16 border-b border-border shrink-0">
          <div>
            <p className="font-mono text-xs font-medium uppercase tracking-[0.2em] text-gold-primary">
              03 — Discover
            </p>
            <h2 className="font-display text-lg text-white flex items-center gap-2">
              <MessageSquare size={20} className="text-gold-primary" />
              Explore
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {/* Feedback button */}
            <Link
              href="/feedback"
              className="p-2 rounded-lg bg-bg-secondary border border-border hover:border-gold-primary/50 transition-colors"
              aria-label="Send Feedback"
            >
              <MessageSquarePlus className="w-5 h-5 text-gold-primary" />
            </Link>
            {/* Contacts button */}
            <button
              onClick={handleShowContacts}
              className="relative p-2 rounded-lg bg-bg-secondary border border-border hover:border-gold-primary/50 transition-colors"
              aria-label="View contacts"
            >
              <Users className="w-5 h-5 text-gold-primary" />
              {suggestedContacts.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-gold-primary text-black text-xs font-bold rounded-full flex items-center justify-center">
                  {Math.min(suggestedContacts.length, 9)}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Chat messages - scrollable */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto relative min-h-0"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div className="p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-12">
                <p className="text-zinc-500 mb-4">
                  Start by asking a question about your network
                </p>
                <div className="space-y-2">
                  {[
                    "Who should I talk to about raising a seed round?",
                    "Find contacts who work in AI or machine learning",
                    "Who do I know in San Francisco?",
                  ].map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => handleSendMessage(prompt)}
                      className="block w-full text-left px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-zinc-400 hover:text-white transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                content={message.content}
                isUser={message.role === "user"}
                onContactHover={handleContactHover}
                onContactClick={handleContactClick}
              />
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white/10 rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce [animation-delay:0.1s]" />
                    <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Scroll sentinel for IntersectionObserver */}
          <div ref={scrollSentinelRef} className="h-1" />

          <JumpToBottomIndicator
            visible={showJumpIndicator}
            unreadCount={unreadCount}
            onClick={handleJumpToBottom}
          />
        </div>

        {/* Chat input - fixed at bottom with padding + safe area */}
        <div className="px-4 pt-3 pb-4 border-t border-border shrink-0" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          <ChatInput
            onSend={handleSendMessage}
            disabled={isLoading}
            placeholder="Ask about your network..."
          />
        </div>

        {/* Contact overlay */}
        <MobileContactOverlay
          isOpen={mobileOverlayOpen}
          onClose={() => setMobileOverlayOpen(false)}
          title={suggestedContacts.length > 0 ? 'Suggested Contacts' : 'Your Contacts'}
          subtitle={suggestedContacts.length > 0 ? `${suggestedContacts.length} matches` : undefined}
        >
          <div className="p-4 space-y-3">
            {displayedContacts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-zinc-500">
                  {searchQuery ? "No contacts match your search" : "No contacts to display"}
                </p>
              </div>
            ) : (
              displayedContacts.map((contact) => (
                <ContactCard
                  key={contact.id}
                  contact={contact}
                  dynamicWhyNow={getDynamicWhyNow(contact.id)}
                  isPinned={pinnedIds.has(contact.id)}
                  isHighlighted={hoveredContactId === contact.id}
                  onPin={handlePin}
                  onDraftIntro={handleDraftIntro}
                  onViewContact={handleViewContact}
                />
              ))
            )}
          </div>
        </MobileContactOverlay>

        {/* Draft Intro Modal */}
        <DraftIntroModal
          contact={draftIntroContact}
          isOpen={!!draftIntroContact}
          onClose={() => setDraftIntroContact(null)}
        />
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="min-h-screen bg-[#0D0D0F]">
      <div className="flex h-screen">
        {/* Chat Panel */}
        <div className="w-[45%] flex flex-col border-r border-white/[0.08]">
          {/* Header - 33 Strategies Style */}
          <div className="p-4 border-b border-white/[0.08]">
            <p className="mb-2 font-mono text-xs font-medium uppercase tracking-[0.2em] text-gold-primary">
              03 — Discover
            </p>
            <h2 className="font-display text-lg text-white flex items-center gap-2">
              <MessageSquare size={20} className="text-gold-primary" />
              Explore Your Network
            </h2>
            <p className="font-body text-sm text-zinc-500 mt-1">
              Ask questions to find the right contacts
            </p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-12">
                <p className="text-zinc-500 mb-4">
                  Start by asking a question about your network
                </p>
                <div className="space-y-2">
                  {[
                    "Who should I talk to about raising a seed round?",
                    "Find contacts who work in AI or machine learning",
                    "Who do I know in San Francisco?",
                  ].map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => handleSendMessage(prompt)}
                      className="block w-full text-left px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-zinc-400 hover:text-white transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                content={message.content}
                isUser={message.role === "user"}
                onContactHover={handleContactHover}
                onContactClick={handleContactClick}
              />
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white/10 rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce [animation-delay:0.1s]" />
                    <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-white/[0.08]">
            <ChatInput
              onSend={handleSendMessage}
              disabled={isLoading}
              placeholder="Ask about your network..."
            />
          </div>
        </div>

        {/* Contacts Panel */}
        <div className="flex-1 flex flex-col">
          {/* Search Header */}
          <div className="p-4 border-b border-white/[0.08]">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
              />
              <input
                type="text"
                placeholder="Search contacts by name or email..."
                onChange={(e) => debouncedSearch(e.target.value)}
                className="w-full bg-white/5 border border-white/[0.08] rounded-lg pl-10 pr-4 py-2.5 text-white text-sm outline-none focus:border-white/20 transition-colors placeholder:text-zinc-500"
              />
            </div>
            {suggestedContacts.length > 0 && (
              <p className="text-sm text-zinc-500 mt-2">
                Showing{" "}
                <span className="text-gold-primary">
                  {suggestedContacts.length} suggested contacts
                </span>{" "}
                based on your query
              </p>
            )}
          </div>

          {/* Contact List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {displayedContacts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-zinc-500">
                  {searchQuery
                    ? "No contacts match your search"
                    : "No contacts to display"}
                </p>
              </div>
            ) : (
              displayedContacts.map((contact) => (
                <ContactCard
                  key={contact.id}
                  contact={contact}
                  dynamicWhyNow={getDynamicWhyNow(contact.id)}
                  isPinned={pinnedIds.has(contact.id)}
                  isHighlighted={hoveredContactId === contact.id}
                  onPin={handlePin}
                  onDraftIntro={handleDraftIntro}
                  onViewContact={handleViewContact}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Draft Intro Modal */}
      <DraftIntroModal
        contact={draftIntroContact}
        isOpen={!!draftIntroContact}
        onClose={() => setDraftIntroContact(null)}
      />
    </div>
  );
}
