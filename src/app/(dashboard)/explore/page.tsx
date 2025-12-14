"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, MessageSquare } from "lucide-react";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatInput } from "@/components/chat/ChatInput";
import { ContactCard } from "@/components/chat/ContactCard";
import { DraftIntroModal } from "@/components/chat/DraftIntroModal";
import { parseContactSuggestions } from "@/lib/chat-parser";
import { useDebouncedCallback } from "use-debounce";

interface ContactTag {
  id: string;
  text: string;
  category: string;
}

interface Contact {
  id: string;
  name: string;
  title: string | null;
  company: string | null;
  location: string | null;
  email: string | null;
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [suggestedContacts, setSuggestedContacts] = useState<SuggestedContact[]>([]);
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [draftIntroContact, setDraftIntroContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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
      const suggestions = parseContactSuggestions(assistantContent);
      if (suggestions.length > 0) {
        const newSuggested: SuggestedContact[] = [];
        for (const suggestion of suggestions) {
          const contact = contacts.find((c) => c.id === suggestion.contactId);
          if (contact) {
            newSuggested.push({
              contact,
              dynamicWhyNow: suggestion.reason,
            });
          }
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

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchContacts = async () => {
    try {
      const res = await fetch("/api/contacts?limit=100");
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
          c.name.toLowerCase().includes(query) ||
          c.email?.toLowerCase().includes(query) ||
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

  const displayedContacts = getFilteredContacts();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D0D0F] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#C9A227]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0D0F]">
      <div className="flex h-screen">
        {/* Chat Panel */}
        <div className="w-[45%] flex flex-col border-r border-white/[0.08]">
          {/* Header */}
          <div className="p-4 border-b border-white/[0.08]">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <MessageSquare size={20} className="text-[#C9A227]" />
              Explore Your Network
            </h2>
            <p className="text-sm text-zinc-500 mt-1">
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
                <span className="text-[#C9A227]">
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
