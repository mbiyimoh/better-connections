import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';
import { ContactDetail } from '@/components/contacts/ContactDetail';

interface ContactPageProps {
  params: Promise<{ id: string }>;
}

export default async function ContactPage({ params }: ContactPageProps) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const contact = await prisma.contact.findFirst({
    where: {
      id,
      userId: user.id,
    },
    include: {
      tags: true,
    },
  });

  if (!contact) {
    notFound();
  }

  // Serialize dates for client component
  const serializedContact = {
    ...contact,
    createdAt: contact.createdAt.toISOString(),
    updatedAt: contact.updatedAt.toISOString(),
    lastContactDate: contact.lastContactDate?.toISOString() || null,
    lastEnrichedAt: contact.lastEnrichedAt?.toISOString() || null,
  };

  return <ContactDetail contact={serializedContact} />;
}
