import { redirect, notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';
import { EventEditor } from '@/components/events/editor';
import { checkEventAccess } from '@/lib/m33t/auth';

interface EditEventPageProps {
  params: Promise<{ eventId: string }>;
}

export default async function EditEventPage({ params }: EditEventPageProps) {
  const { eventId } = await params;

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Check if user has edit permission (owner OR co-organizer with canEdit: true)
  const access = await checkEventAccess(eventId, user.id, 'edit');
  if (!access) {
    notFound();
  }

  // Fetch event data (access already verified, so no userId filter needed)
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      organizers: {
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
    },
  });

  if (!event) {
    notFound();
  }

  // Transform organizers to the format expected by EventEditor
  const organizers = event.organizers.map((org) => ({
    id: org.id,
    odId: org.userId,
    name: org.user.name || 'Unknown',
    email: org.user.email,
    permissions: {
      canInvite: org.canInvite,
      canCurate: org.canCurate,
      canEdit: org.canEdit,
      canManage: org.canManage,
    },
  }));

  return <EventEditor event={event} initialOrganizers={organizers} />;
}
