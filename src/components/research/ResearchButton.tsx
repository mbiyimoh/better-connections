'use client';

import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ResearchOptionsModal } from './ResearchOptionsModal';

interface ResearchButtonProps {
  contactId: string;
  contactName: string;
  disabled?: boolean;
  onResearchComplete?: () => void;
  className?: string;
  label?: string;
  autoOpen?: boolean;
}

export function ResearchButton({
  contactId,
  contactName,
  disabled = false,
  onResearchComplete,
  className,
  label = "Research",
  autoOpen = false,
}: ResearchButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Auto-open modal if autoOpen prop is true
  useEffect(() => {
    if (autoOpen && !disabled) {
      setIsModalOpen(true);
    }
  }, [autoOpen, disabled]);

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setIsModalOpen(true)}
        disabled={disabled}
        className={cn("gap-2", className)}
      >
        <Search className="h-4 w-4" />
        {label}
      </Button>

      <ResearchOptionsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        contactId={contactId}
        contactName={contactName}
        onResearchComplete={onResearchComplete}
      />
    </>
  );
}
