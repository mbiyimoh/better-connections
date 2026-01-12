"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Sparkles } from "lucide-react";
import { BUBBLE_CATEGORY_COLORS } from "@/lib/design-system";

// User's personal context (what they added)
const USER_CONTEXT = [
  { text: "Met at SaaStr", type: "user" as const },
  { text: "Interested in D2C", type: "user" as const },
];

// AI-discovered context (from research)
const AI_DISCOVERIES = [
  { text: "Now VP at Stripe", category: "opportunity" as const },
  { text: "Spoke at Fintech Summit", category: "expertise" as const },
  { text: "Writes about payments", category: "interest" as const },
];

export function Slide6AIResearch() {
  const [showUserContext, setShowUserContext] = useState(false);
  const [showSearching, setShowSearching] = useState(false);
  const [visibleDiscoveries, setVisibleDiscoveries] = useState(0);
  const [showHeadline, setShowHeadline] = useState(false);

  useEffect(() => {
    // Animation sequence
    const userContext = setTimeout(() => setShowUserContext(true), 500);
    const searching = setTimeout(() => setShowSearching(true), 1800);
    const discovery1 = setTimeout(() => {
      setShowSearching(false);
      setVisibleDiscoveries(1);
    }, 3000);
    const discovery2 = setTimeout(() => setVisibleDiscoveries(2), 3500);
    const discovery3 = setTimeout(() => setVisibleDiscoveries(3), 4000);
    const headline = setTimeout(() => setShowHeadline(true), 4800);

    return () => {
      clearTimeout(userContext);
      clearTimeout(searching);
      clearTimeout(discovery1);
      clearTimeout(discovery2);
      clearTimeout(discovery3);
      clearTimeout(headline);
    };
  }, []);

  return (
    <div className="flex flex-col items-center w-full max-w-md px-4">
      {/* Contact Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full rounded-xl border border-white/10 bg-white/5 p-4 mb-6"
      >
        {/* Contact Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full border-2 border-gold-primary bg-gold-subtle flex items-center justify-center">
            <span className="text-gold-primary font-bold">SC</span>
          </div>
          <div>
            <h3 className="text-white font-semibold">Sarah Chen</h3>
            <p className="text-white/60 text-sm">Partner @ Founder Collective</p>
          </div>
        </div>

        {/* User's Context Section */}
        <AnimatePresence>
          {showUserContext && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mb-4"
            >
              <p className="text-xs text-text-tertiary uppercase tracking-wide mb-2">Your context</p>
              <div className="flex flex-wrap gap-2">
                {USER_CONTEXT.map((item, index) => (
                  <motion.span
                    key={item.text}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: index * 0.15 }}
                    className="px-3 py-1.5 rounded-full text-xs bg-white/10 text-white/80 border border-white/20"
                  >
                    {item.text}
                  </motion.span>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI Discoveries Section */}
        <AnimatePresence>
          {(showSearching || visibleDiscoveries > 0) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-3 h-3 text-gold-primary" />
                <p className="text-xs text-gold-primary uppercase tracking-wide">AI discovered</p>
              </div>

              {showSearching && visibleDiscoveries === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 text-white/60 text-sm"
                >
                  <Search className="w-4 h-4 animate-pulse" />
                  <span className="animate-pulse">Searching the web...</span>
                </motion.div>
              )}

              <div className="flex flex-wrap gap-2">
                {AI_DISCOVERIES.slice(0, visibleDiscoveries).map((item, index) => {
                  const styles = BUBBLE_CATEGORY_COLORS[item.category];
                  return (
                    <motion.span
                      key={item.text}
                      initial={{ scale: 0.6, opacity: 0, y: 10 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25, delay: index * 0.08 }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${styles.bg} ${styles.text} ${styles.border}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
                      {item.text}
                    </motion.span>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Headline */}
      <AnimatePresence>
        {showHeadline && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="font-display text-2xl text-white mb-2">
              Add what you know. Discover what you don&apos;t.
            </h1>
            <p className="font-body text-text-secondary">
              Run AI research to fill in professional details and context you might not have.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
