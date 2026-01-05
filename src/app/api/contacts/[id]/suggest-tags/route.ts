import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';
import { generateObject } from 'ai';
import { z } from 'zod';
import { gpt4oMini, TAG_SUGGESTION_SYSTEM_PROMPT } from '@/lib/openai';

// Schema for tag suggestions response
const tagSuggestionSchema = z.object({
  suggestions: z.array(
    z.object({
      text: z.string().max(50),
      category: z.enum(['RELATIONSHIP', 'OPPORTUNITY', 'EXPERTISE', 'INTEREST']),
    })
  ).max(5),
});

export type TagSuggestion = {
  text: string;
  category: 'RELATIONSHIP' | 'OPPORTUNITY' | 'EXPERTISE' | 'INTEREST';
};

// POST /api/contacts/[id]/suggest-tags - Get AI-powered tag suggestions
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get contact with existing tags
    const contact = await prisma.contact.findFirst({
      where: { id, userId: user.id },
      include: { tags: true },
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Build context for AI from available contact data
    const contextParts: string[] = [];

    if (contact.firstName || contact.lastName) {
      contextParts.push(`Name: ${[contact.firstName, contact.lastName].filter(Boolean).join(' ')}`);
    }
    if (contact.title) {
      contextParts.push(`Title: ${contact.title}`);
    }
    if (contact.company) {
      contextParts.push(`Company: ${contact.company}`);
    }
    if (contact.expertise) {
      contextParts.push(`Expertise: ${contact.expertise}`);
    }
    if (contact.interests) {
      contextParts.push(`Interests: ${contact.interests}`);
    }
    if (contact.howWeMet) {
      contextParts.push(`How We Met: ${contact.howWeMet}`);
    }
    if (contact.whyNow) {
      contextParts.push(`Why Now: ${contact.whyNow}`);
    }
    if (contact.notes) {
      contextParts.push(`Notes: ${contact.notes}`);
    }

    // Require at least 3 fields OR high-value fields (whyNow, notes, expertise+interests)
    const hasSubstantialContext =
      contextParts.length >= 3 ||
      contact.whyNow ||
      contact.notes ||
      (contact.expertise && contact.interests);

    if (!hasSubstantialContext) {
      return NextResponse.json({
        suggestions: [],
        message: 'Add more context (Why Now, Notes, or Expertise) to get better tag suggestions',
      });
    }

    const contactContext = contextParts.join('\n');

    // Generate suggestions using GPT-4o-mini
    const result = await generateObject({
      model: gpt4oMini,
      system: TAG_SUGGESTION_SYSTEM_PROMPT,
      prompt: `Contact Information:\n${contactContext}`,
      schema: tagSuggestionSchema,
    });

    // Filter out tags that already exist on this contact
    const existingTagTexts = new Set(
      contact.tags.map((t) => t.text.toLowerCase())
    );

    const newSuggestions = result.object.suggestions.filter(
      (suggestion) => !existingTagTexts.has(suggestion.text.toLowerCase())
    );

    return NextResponse.json({
      suggestions: newSuggestions,
    });
  } catch (error) {
    console.error('Error generating tag suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}
