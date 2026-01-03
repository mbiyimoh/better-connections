"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SearchContact {
  id: string;
  firstName: string;
  lastName: string | null;
  company: string | null;
  title: string | null;
}

interface ContactSearchModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (contactId: string) => void;
  contextHint?: string;
}

export function ContactSearchModal({
  open,
  onClose,
  onSelect,
  contextHint,
}: ContactSearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchContact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setError(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/contacts?search=${encodeURIComponent(query)}&limit=10`
        );
        if (!res.ok) {
          throw new Error("Search failed");
        }
        const data = await res.json();
        setResults(data.contacts || []);
      } catch (err) {
        console.error("Search error:", err);
        setError("Search failed. Please try again.");
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  // Reset and focus on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      // Focus input after animation
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-zinc-900 border border-zinc-700 rounded-lg w-full max-w-md max-h-[80vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 border-b border-zinc-700">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-medium text-white">
                Search & Link Contact
              </h3>
              <button
                onClick={onClose}
                className="p-1 rounded hover:bg-zinc-700 text-zinc-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Context hint */}
            {contextHint && (
              <p className="text-xs text-zinc-500 mb-3">
                Context: &quot;
                {contextHint.length > 100
                  ? contextHint.slice(0, 100) + "..."
                  : contextHint}
                &quot;
              </p>
            )}

            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search contacts by name, company..."
                className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
              />
            </div>
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto p-2">
            {isLoading && (
              <div className="text-center py-4 text-zinc-500">Searching...</div>
            )}

            {!isLoading && error && (
              <div className="text-center py-4 text-red-400 text-sm">
                {error}
              </div>
            )}

            {!isLoading && !error && query && results.length === 0 && (
              <div className="text-center py-4 text-zinc-500">
                No contacts found
              </div>
            )}

            {!isLoading && results.length > 0 && (
              <div className="space-y-1">
                {results.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => onSelect(contact.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-md hover:bg-zinc-800 text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center">
                      <User className="w-4 h-4 text-zinc-400" />
                    </div>
                    <div>
                      <div className="text-sm text-white">
                        {contact.firstName} {contact.lastName}
                      </div>
                      {(contact.title || contact.company) && (
                        <div className="text-xs text-zinc-500">
                          {contact.title}
                          {contact.title && contact.company && " at "}
                          {contact.company}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {!query && (
              <div className="text-center py-4 text-zinc-500 text-sm">
                Type to search your contacts
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
