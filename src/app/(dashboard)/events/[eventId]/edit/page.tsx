import { redirect, notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';
import { EventEditor } from '@/components/events/editor';

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

  const event = await prisma.event.findFirst({
    where: { id: eventId, userId: user.id },
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
