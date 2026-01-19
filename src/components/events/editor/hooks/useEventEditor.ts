'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { Event } from '@prisma/client';
import { toast } from 'sonner';
import {
  type EventWizardData,
  type ValidationStatus,
  DEFAULT_EVENT_DATA,
  mapEventToWizardData,
  eventWizardDataToApiPayload,
  getValidationStatus,
} from '@/lib/events';

interface UseEventEditorReturn {
  data: EventWizardData;
  update: (updates: Partial<EventWizardData>) => void;
  isDirty: boolean;
  isSaving: boolean;
  save: () => Promise<void>;
  validationStatus: Record<string, ValidationStatus>;
}

export function useEventEditor(
  initialEvent?: Event,
  initialOrganizers?: EventWizardData['organizers']
): UseEventEditorReturn {
  // Create initial data with organizers
  const getInitialData = useCallback((): EventWizardData => {
    if (initialEvent) {
      const eventData = mapEventToWizardData(initialEvent);
      return { ...eventData, organizers: initialOrganizers || [] };
    }
    return DEFAULT_EVENT_DATA;
  }, [initialEvent, initialOrganizers]);

  const [data, setData] = useState<EventWizardData>(getInitialData);
  const [originalData, setOriginalData] = useState<EventWizardData>(getInitialData);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  // Track original organizers for diffing
  const originalOrganizersRef = useRef<EventWizardData['organizers']>(initialOrganizers || []);

  const isDirty = useMemo(
    () => JSON.stringify(data) !== JSON.stringify(originalData),
    [data, originalData]
  );

  // Warn user before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const update = useCallback((updates: Partial<EventWizardData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  const validationStatus = useMemo(
    () => getValidationStatus(data),
    [data]
  );

  // Sync organizer changes to the API
  const syncOrganizers = useCallback(async (eventId: string) => {
    const originalOrganizers = originalOrganizersRef.current;
    const currentOrganizers = data.organizers;

    // Find organizers to add (in current but not in original)
    const toAdd = currentOrganizers.filter(
      (org) => !originalOrganizers.some((o) => o.odId === org.odId)
    );

    // Find organizers to remove (in original but not in current)
    const toRemove = originalOrganizers.filter(
      (org) => !currentOrganizers.some((o) => o.odId === org.odId)
    );

    // Find organizers with permission changes
    const toUpdate = currentOrganizers.filter((org) => {
      const original = originalOrganizers.find((o) => o.odId === org.odId);
      if (!original || !org.id) return false;
      return (
        original.permissions.canInvite !== org.permissions.canInvite ||
        original.permissions.canCurate !== org.permissions.canCurate ||
        original.permissions.canEdit !== org.permissions.canEdit ||
        original.permissions.canManage !== org.permissions.canManage
      );
    });

    // Add new organizers
    for (const org of toAdd) {
      const response = await fetch(`/api/events/${eventId}/organizers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: org.odId,
          canInvite: org.permissions.canInvite,
          canCurate: org.permissions.canCurate,
          canEdit: org.permissions.canEdit,
          canManage: org.permissions.canManage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to add organizer ${org.name}`);
      }
    }

    // Update organizers with permission changes
    for (const org of toUpdate) {
      const response = await fetch(
        `/api/events/${eventId}/organizers?id=${org.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            canInvite: org.permissions.canInvite,
            canCurate: org.permissions.canCurate,
            canEdit: org.permissions.canEdit,
            canManage: org.permissions.canManage,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to update permissions for ${org.name}`);
      }
    }

    // Remove old organizers
    for (const org of toRemove) {
      if (org.id) {
        const response = await fetch(
          `/api/events/${eventId}/organizers?id=${org.id}`,
          { method: 'DELETE' }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to remove organizer ${org.name}`);
        }
      }
    }
  }, [data.organizers]);

  const save = useCallback(async () => {
    setIsSaving(true);
    try {
      const url = initialEvent ? `/api/events/${initialEvent.id}` : '/api/events';
      const method = initialEvent ? 'PUT' : 'POST';

      const apiData = eventWizardDataToApiPayload(data);

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save');
      }

      const savedEvent = await response.json();

      // Sync organizer changes
      await syncOrganizers(savedEvent.id);

      toast.success(initialEvent ? 'Event updated!' : 'Event created!');

      if (initialEvent) {
        // In edit mode: update original data to reflect saved state, stay on page
        setOriginalData(data);
        originalOrganizersRef.current = data.organizers;
      } else {
        // New event: redirect to event detail page
        router.push(`/events/${savedEvent.id}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save event');
    } finally {
      setIsSaving(false);
    }
  }, [data, initialEvent, router, syncOrganizers]);

  return { data, update, isDirty, isSaving, save, validationStatus };
}
