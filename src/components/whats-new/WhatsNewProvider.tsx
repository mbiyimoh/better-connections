'use client';

import { useState, useEffect } from 'react';
import { WhatsNewModal } from './WhatsNewModal';
import type { Update } from '@/lib/updates/types';

interface WhatsNewProviderProps {
  latestUpdate: Update | null;
  userLastSeenVersion: string | null;
}

const LOCAL_STORAGE_KEY = 'lastSeenUpdateVersion';

export function WhatsNewProvider({
  latestUpdate,
  userLastSeenVersion,
}: WhatsNewProviderProps) {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!latestUpdate) return;

    // Check localStorage first for instant feedback
    const localLastSeen = localStorage.getItem(LOCAL_STORAGE_KEY);
    const lastSeen = userLastSeenVersion || localLastSeen;

    // Compare versions (string comparison works for ISO dates)
    if (!lastSeen || latestUpdate.version > lastSeen) {
      setShowModal(true);
    }
  }, [latestUpdate, userLastSeenVersion]);

  const handleMarkSeen = async (version: string) => {
    // Update localStorage immediately for instant feedback
    localStorage.setItem(LOCAL_STORAGE_KEY, version);

    // Update database
    try {
      await fetch('/api/user/seen-update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version }),
      });
    } catch (error) {
      console.error('Failed to mark update as seen:', error);
    }

    setShowModal(false);
  };

  if (!latestUpdate || !showModal) return null;

  return (
    <WhatsNewModal
      update={latestUpdate}
      isOpen={showModal}
      onClose={() => handleMarkSeen(latestUpdate.version)}
      onMarkSeen={handleMarkSeen}
    />
  );
}
