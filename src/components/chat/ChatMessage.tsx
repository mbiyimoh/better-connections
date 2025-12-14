"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  content: string;
  isUser: boolean;
}

export function ChatMessage({ content, isUser }: ChatMessageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[80%] px-4 py-3 whitespace-pre-wrap text-sm leading-relaxed",
          isUser
            ? "bg-[#C9A227] text-black rounded-[16px_16px_4px_16px]"
            : "bg-white/10 text-white rounded-[16px_16px_16px_4px]"
        )}
      >
        {content}
      </div>
    </motion.div>
  );
}
