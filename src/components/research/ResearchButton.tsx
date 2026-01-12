'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ResearchOptionsModal } from './ResearchOptionsModal';

interface ResearchButtonProps {
  contactId: string;
  contactName: string;
  disabled?: boolean;
  onResearchComplete?: () => void;
}

export function ResearchButton({
  contactId,
  contactName,
  disabled = false,
  onResearchComplete,
}: ResearchButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsModalOpen(true)}
        disabled={disabled}
        className="gap-2"
      >
        <Search className="h-4 w-4" />
        Research
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
