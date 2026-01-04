"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { MessageContent } from "./MessageContent";

interface ChatMessageProps {
  content: string;
  isUser: boolean;
  onContactHover?: (id: string | null) => void;
  onContactClick?: (id: string) => void;
}

export function ChatMessage({
  content,
  isUser,
  onContactHover,
  onContactClick,
}: ChatMessageProps) {
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
            ? "bg-gold-primary text-black rounded-[16px_16px_4px_16px]"
            : "bg-white/10 text-white rounded-[16px_16px_16px_4px]"
        )}
      >
        {isUser ? (
          content
        ) : (
          <MessageContent
            content={content}
            onContactHover={onContactHover ?? (() => {})}
            onContactClick={onContactClick ?? (() => {})}
          />
        )}
      </div>
    </motion.div>
  );
}
