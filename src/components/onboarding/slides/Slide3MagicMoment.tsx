"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare } from "lucide-react";

const QUERY = "I'm raising a seed round for a D2C brand and I'll be in NYC next week. Who should I meet?";

const CONTACTS = [
  {
    name: "Sarah Chen",
    role: "Partner @ Founder Collective",
    detail: "Backed 3 D2C brands",
    why: "Met at SaaStr 2024, offered to intro to her LP network"
  },
  {
    name: "Marcus Johnson",
    role: "Angel · Exited D2C founder",
    detail: "Based in NYC",
    why: "Sold his brand to P&G, now writes $50-100k checks"
  }
];

export function Slide3MagicMoment() {
  const [typedText, setTypedText] = useState("");
  const [showShimmer, setShowShimmer] = useState(false);
  const [visibleContacts, setVisibleContacts] = useState(0);

  useEffect(() => {
    let charIndex = 0;
    const typeInterval = setInterval(() => {
      if (charIndex < QUERY.length) {
        setTypedText(QUERY.slice(0, charIndex + 1));
        charIndex++;
      } else {
        clearInterval(typeInterval);
        setShowShimmer(true);
        setTimeout(() => setShowShimmer(false), 500);
        setTimeout(() => setVisibleContacts(1), 500);
        setTimeout(() => setVisibleContacts(2), 2000);
      }
    }, 25);

    return () => clearInterval(typeInterval);
  }, []);

  return (
    <div className="flex flex-col items-center w-full max-w-md px-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`w-full rounded-xl border border-white/10 bg-white/5 p-4 mb-6 ${showShimmer ? "animate-pulse" : ""}`}
      >
        <div className="flex items-start gap-3">
          <MessageSquare className="w-5 h-5 text-gold-primary mt-1 flex-shrink-0" />
          <p className="text-white/90 text-sm leading-relaxed min-h-[40px]">
            {typedText}
            <span className="animate-pulse">|</span>
          </p>
        </div>
      </motion.div>

      {visibleContacts > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-gold-primary text-xl mb-4">
          ↓ ↓ ↓
        </motion.div>
      )}

      <div className="w-full space-y-3">
        <AnimatePresence>
          {CONTACTS.slice(0, visibleContacts).map((contact, index) => (
            <motion.div
              key={contact.name}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 25, delay: index * 0.1 }}
              className="w-full rounded-xl border border-white/10 bg-white/5 p-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full border-2 border-gold-primary bg-gold-subtle flex items-center justify-center flex-shrink-0">
                  <span className="text-gold-primary font-bold text-sm">
                    {contact.name.split(" ").map(n => n[0]).join("")}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold">{contact.name}</h3>
                  <p className="text-white/60 text-sm">{contact.role} · {contact.detail}</p>
                  <p className="text-gold-primary/80 text-sm italic mt-1">&quot;{contact.why}&quot;</p>
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <span className="text-gold-primary text-sm font-medium">Draft Intro →</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {visibleContacts >= 2 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-center mt-8">
          <h1 className="font-display text-2xl text-white mb-2">Ask. Discover. Connect.</h1>
          <p className="font-body text-[#A0A0A8]">The right people from your network, served up instantly.</p>
        </motion.div>
      )}
    </div>
  );
}
