"use client";

import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  BUBBLE_CATEGORY_COLORS,
  BUBBLE_CATEGORY_LABELS,
  type BubbleCategory,
} from "@/lib/design-system";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { EnrichmentBubble } from "./EnrichmentBubbles";

interface EditableBubbleProps {
  bubble: EnrichmentBubble;
  index: number;
  onUpdate: (id: string, updates: Partial<EnrichmentBubble>) => void;
  onDelete: (id: string) => void;
}

export function EditableBubble({ bubble, index, onUpdate, onDelete }: EditableBubbleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(bubble.text);
  const inputRef = useRef<HTMLInputElement>(null);

  const styles = BUBBLE_CATEGORY_COLORS[bubble.category];
  const dotColor = styles.dot;

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    if (editText.trim() && editText !== bubble.text) {
      onUpdate(bubble.id, { text: editText.trim() });
    } else {
      setEditText(bubble.text);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") {
      setEditText(bubble.text);
      setIsEditing(false);
    }
  };

  return (
    <motion.div
      initial={{ scale: 0.6, opacity: 0, y: 10 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.8, opacity: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 25, delay: index * 0.08 }}
      className="group relative"
    >
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium border cursor-pointer",
          styles.bg, styles.text, styles.border,
          "hover:ring-2 hover:ring-white/20"
        )}
      >
        {/* Category dot - clickable to change category */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn("w-1.5 h-1.5 rounded-full hover:ring-2 hover:ring-white/30", dotColor)} />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-zinc-900 border-zinc-700">
            {(Object.keys(BUBBLE_CATEGORY_LABELS) as BubbleCategory[]).map((cat) => (
              <DropdownMenuItem
                key={cat}
                onClick={() => onUpdate(bubble.id, { category: cat })}
                className={cn(bubble.category === cat && "bg-zinc-800")}
              >
                <span className={cn("w-2 h-2 rounded-full mr-2", BUBBLE_CATEGORY_COLORS[cat].dot)} />
                {BUBBLE_CATEGORY_LABELS[cat]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Text - click to edit */}
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="bg-transparent border-none outline-none w-24 text-inherit"
          />
        ) : (
          <span onClick={() => setIsEditing(true)}>{bubble.text}</span>
        )}

        {/* Delete button */}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(bubble.id); }}
          className="opacity-0 group-hover:opacity-100 ml-1 hover:text-red-400 transition-opacity"
        >
          <X size={12} />
        </button>
      </span>
    </motion.div>
  );
}
