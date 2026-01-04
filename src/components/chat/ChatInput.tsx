"use client";

import { useState, KeyboardEvent } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = "Type a message...",
}: ChatInputProps) {
  const [value, setValue] = useState("");

  const handleSend = () => {
    if (!value.trim() || disabled) return;
    onSend(value.trim());
    setValue("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 bg-white/5 border border-white/[0.08] rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-white/20 transition-colors placeholder:text-zinc-500 disabled:opacity-50"
      />
      <Button
        onClick={handleSend}
        disabled={!value.trim() || disabled}
        className="bg-gold-primary hover:bg-gold-light text-black"
      >
        <Send size={16} />
      </Button>
    </div>
  );
}
