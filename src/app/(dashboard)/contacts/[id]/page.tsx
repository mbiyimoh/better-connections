import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';
import { ContactDetail, type SerializedResearchRun } from '@/components/contacts/ContactDetail';
import type { Recommendation } from '@/components/research/RecommendationCard';

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

  // Fetch last 5 research runs (not just latest) for history display
  const researchRuns = await prisma.contactResearchRun.findMany({
    where: {
      contactId: contact.id,
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      recommendations: {
        orderBy: { confidence: 'desc' },
      },
    },
  });

  // Get total contacts count for ranking
  const totalContacts = await prisma.contact.count({
    where: { userId: user.id },
  });

  // Serialize dates for client component
  const serializedContact = {
    ...contact,
    createdAt: contact.createdAt.toISOString(),
    updatedAt: contact.updatedAt.toISOString(),
    lastContactDate: contact.lastContactDate?.toISOString() || null,
    lastEnrichedAt: contact.lastEnrichedAt?.toISOString() || null,
  };

  // Serialize research runs
  const serializedResearchRuns: SerializedResearchRun[] = researchRuns.map((run) => ({
    id: run.id,
    status: run.status as 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED',
    summary: run.summary,
    fullReport: run.fullReport,
    sourceUrls: run.sourceUrls,
    executionTimeMs: run.executionTimeMs,
    createdAt: run.createdAt.toISOString(),
    completedAt: run.completedAt?.toISOString() || null,
    appliedAt: run.appliedAt?.toISOString() || null,
    appliedChangesSummary: run.appliedChangesSummary,
    previousScore: run.previousScore,
    newScore: run.newScore,
    recommendations: run.recommendations.map(
      (r): Recommendation => ({
        id: r.id,
        fieldName: r.fieldName,
        action: r.action as 'ADD' | 'UPDATE',
        currentValue: r.currentValue,
        proposedValue: r.proposedValue,
        tagCategory: r.tagCategory,
        reasoning: r.reasoning,
        confidence: r.confidence,
        sourceUrls: r.sourceUrls,
        status: r.status as 'PENDING' | 'APPROVED' | 'REJECTED' | 'APPLIED',
        editedValue: r.editedValue,
      })
    ),
  }));

  return (
    <ContactDetail
      contact={serializedContact}
      researchRuns={serializedResearchRuns}
      totalContacts={totalContacts}
    />
  );
}
