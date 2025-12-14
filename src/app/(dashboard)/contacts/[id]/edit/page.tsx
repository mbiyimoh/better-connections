import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';
import { ContactForm } from '@/components/contacts/ContactForm';

interface EditContactPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditContactPage({ params }: EditContactPageProps) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const contact = await prisma.contact.findFirst({
    where: { id, userId: user.id },
    include: { tags: true },
  });

  if (!contact) {
    notFound();
  }

  // Convert the contact to the expected format
  const formattedContact = {
    ...contact,
    lastContactDate: contact.lastContactDate?.toISOString() ?? null,
    createdAt: contact.createdAt.toISOString(),
    updatedAt: contact.updatedAt.toISOString(),
    lastEnrichedAt: contact.lastEnrichedAt?.toISOString() ?? null,
  };

  return <ContactForm contact={formattedContact} isEditing />;
}
