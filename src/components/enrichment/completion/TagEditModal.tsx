'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { TAG_CATEGORY_COLORS } from '@/lib/design-system';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import type { TagCategory } from '@/types/contact';

interface TagEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialText: string;
  initialCategory: TagCategory;
  onSave: (text: string, category: TagCategory) => void;
}

const CATEGORY_DESCRIPTIONS: Record<TagCategory, { label: string; description: string }> = {
  RELATIONSHIP: {
    label: 'Relationship',
    description: 'How you know this person (e.g., "met at conference", "former colleague")',
  },
  OPPORTUNITY: {
    label: 'Opportunity',
    description: 'Business potential or why to reach out now (e.g., "potential investor", "hiring")',
  },
  EXPERTISE: {
    label: 'Expertise',
    description: 'Their professional skills and domain knowledge (e.g., "marketing expert", "fintech background")',
  },
  INTEREST: {
    label: 'Interest',
    description: 'Personal hobbies and passions outside of work (e.g., "hiking", "wine collecting")',
  },
};

export function TagEditModal({
  isOpen,
  onClose,
  initialText,
  initialCategory,
  onSave,
}: TagEditModalProps) {
  const [text, setText] = useState(initialText);
  const [category, setCategory] = useState<TagCategory>(initialCategory);

  const handleSave = () => {
    try {
      if (text.trim()) {
        onSave(text.trim(), category);
      }
    } catch (error) {
      console.error('Failed to save tag edit:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-zinc-900 border-zinc-700 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Edit Tag</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Text Input */}
          <div className="space-y-2">
            <Label htmlFor="tag-text" className="text-zinc-400">
              Tag Text
            </Label>
            <Input
              id="tag-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white"
              maxLength={50}
            />
          </div>

          {/* Category Selection */}
          <div className="space-y-3">
            <Label className="text-zinc-400">Category</Label>
            <TooltipProvider>
              <RadioGroup
                value={category}
                onValueChange={(v: string) => setCategory(v as TagCategory)}
                className="grid grid-cols-2 gap-3"
              >
                {(Object.keys(CATEGORY_DESCRIPTIONS) as TagCategory[]).map((cat) => {
                  const colors = TAG_CATEGORY_COLORS[cat];
                  const { label, description } = CATEGORY_DESCRIPTIONS[cat];

                  return (
                    <div key={cat} className="flex items-center space-x-2">
                      <RadioGroupItem
                        value={cat}
                        id={cat}
                        className={cn(
                          'border-2',
                          category === cat && colors.border
                        )}
                      />
                      <Label
                        htmlFor={cat}
                        className={cn(
                          'flex items-center gap-1.5 cursor-pointer text-sm',
                          category === cat ? colors.text : 'text-zinc-400'
                        )}
                      >
                        <span className={cn('h-2 w-2 rounded-full', colors.dot)} />
                        {label}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-zinc-500" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <p className="text-sm">{description}</p>
                          </TooltipContent>
                        </Tooltip>
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>
            </TooltipProvider>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!text.trim()}
            className="bg-gold-primary hover:bg-gold-light text-black"
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
