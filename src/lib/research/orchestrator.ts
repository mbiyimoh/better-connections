import { generateObject } from 'ai';
import { gpt4oMini } from '@/lib/openai';
import type {
  ContactContext,
  FocusArea,
  ResearchResult,
  GeneratedRecommendation,
  SynthesizedReport,
} from './types';
import { reportSynthesisSchema, recommendationOutputSchema } from './schemas';
import { buildSearchQuery } from './queryBuilder';
import { searchTavily, extractLinkedInProfile } from './tavilyClient';
import {
  buildSynthesisPrompt,
  buildRecommendationPrompt,
  SYNTHESIS_SYSTEM_PROMPT,
  RECOMMENDATION_SYSTEM_PROMPT,
} from './prompts';

const MIN_CONFIDENCE_THRESHOLD = 0.5;

export async function executeContactResearch(options: {
  contact: ContactContext;
  focusAreas: FocusArea[];
  onProgress?: (stage: string) => void | Promise<void>;
}): Promise<ResearchResult> {
  const { contact, focusAreas, onProgress } = options;
  const startTime = Date.now();

  try {
    // Step 1: Build search query
    await onProgress?.('Building search query...');
    const searchQuery = buildSearchQuery(contact, focusAreas);

    // Step 2a: If LinkedIn URL provided, extract profile content directly
    let linkedInContent: string | null = null;
    if (contact.linkedinUrl) {
      await onProgress?.('Extracting LinkedIn profile...');
      const linkedInResult = await extractLinkedInProfile(contact.linkedinUrl);
      if (linkedInResult.success && linkedInResult.rawContent) {
        linkedInContent = linkedInResult.rawContent;
        console.log(`[Research] LinkedIn extraction succeeded for ${contact.firstName} ${contact.lastName}`);
      } else {
        console.log(`[Research] LinkedIn extraction failed: ${linkedInResult.error}`);
      }
    }

    // Step 2b: Execute Tavily web search
    await onProgress?.('Searching the web...');
    const fullName = `${contact.firstName} ${contact.lastName}`.trim();
    const findings = await searchTavily(searchQuery, fullName);

    // Add LinkedIn as a source if we have content
    if (linkedInContent && contact.linkedinUrl) {
      findings.sources.unshift({
        url: contact.linkedinUrl,
        title: `LinkedIn Profile - ${fullName}`,
        content: linkedInContent.slice(0, 5000), // Limit content size
        score: 1.0, // High relevance since it's the actual profile
        publishedDate: undefined,
      });
      console.log(`[Research] Added LinkedIn as primary source`);
    }

    if (findings.sources.length === 0) {
      return {
        success: true,
        searchQuery,
        findings,
        report: null,
        recommendations: [],
        executionTimeMs: Date.now() - startTime,
      };
    }

    // Step 3: Synthesize report with GPT
    await onProgress?.('Analyzing findings...');
    const synthesisPrompt = buildSynthesisPrompt(
      contact,
      focusAreas,
      findings.sources
    );

    let synthesisResult;
    try {
      synthesisResult = await generateObject({
        model: gpt4oMini(),
        system: SYNTHESIS_SYSTEM_PROMPT,
        prompt: synthesisPrompt,
        schema: reportSynthesisSchema,
      });
    } catch (synthesisError) {
      console.error('Synthesis generation failed:', synthesisError);
      // Retry with a simpler prompt
      synthesisResult = await generateObject({
        model: gpt4oMini(),
        system: SYNTHESIS_SYSTEM_PROMPT,
        prompt: `${synthesisPrompt}\n\nIMPORTANT: You MUST return a valid JSON object with summary (string), fullReport (string), and keyFindings (array). Even if limited information is found, provide your best analysis.`,
        schema: reportSynthesisSchema,
      });
    }

    const report: SynthesizedReport = {
      summary: synthesisResult.object.summary,
      fullReport: synthesisResult.object.fullReport,
      sourceUrls: [...new Set(findings.sources.map((s) => s.url))],
    };

    // Step 4: Generate recommendations
    await onProgress?.('Generating recommendations...');
    const recommendationPrompt = buildRecommendationPrompt(
      contact,
      report.fullReport,
      synthesisResult.object.keyFindings
    );

    let recResult;
    try {
      recResult = await generateObject({
        model: gpt4oMini(),
        system: RECOMMENDATION_SYSTEM_PROMPT,
        prompt: recommendationPrompt,
        schema: recommendationOutputSchema,
      });
    } catch (recError) {
      console.error('Recommendation generation failed:', recError);
      // Retry with explicit instructions
      recResult = await generateObject({
        model: gpt4oMini(),
        system: RECOMMENDATION_SYSTEM_PROMPT,
        prompt: `${recommendationPrompt}\n\nIMPORTANT: Return a valid JSON with recommendations array. Each recommendation must have: fieldName, action, proposedValue, reasoning, confidence, sourceUrls. If no recommendations apply, return { "recommendations": [], "noRecommendationsReason": "explanation" }`,
        schema: recommendationOutputSchema,
      });
    }

    // Step 5: Filter and enrich recommendations
    const recommendations: GeneratedRecommendation[] =
      recResult.object.recommendations
        .filter((r) => r.confidence >= MIN_CONFIDENCE_THRESHOLD)
        .map((r) => ({
          fieldName: r.fieldName,
          action: r.action,
          currentValue: getContactFieldValue(contact, r.fieldName),
          proposedValue: r.proposedValue,
          tagCategory: r.tagCategory || undefined,
          reasoning: r.reasoning,
          confidence: r.confidence,
          sourceUrls: r.sourceUrls,
        }))
        // Filter out duplicate recommendations (proposed value same as current)
        .filter((r) => {
          if (!r.currentValue) return true; // No current value, keep recommendation
          const current = r.currentValue.trim().toLowerCase();
          const proposed = r.proposedValue.trim().toLowerCase();
          // Reject if identical or if proposed is already contained in current
          if (current === proposed) return false;
          if (current.includes(proposed)) return false;
          return true;
        });

    await onProgress?.('Research complete!');

    return {
      success: true,
      searchQuery,
      findings,
      report,
      recommendations,
      executionTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    console.error('Research orchestrator error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    // Log more details for debugging
    if (error instanceof Error && error.cause) {
      console.error('Error cause:', error.cause);
    }
    return {
      success: false,
      searchQuery: '',
      findings: null,
      report: null,
      recommendations: [],
      executionTimeMs: Date.now() - startTime,
      error: errorMessage,
    };
  }
}

function getContactFieldValue(
  contact: ContactContext,
  fieldName: string
): string | null {
  switch (fieldName) {
    case 'expertise':
      return contact.expertise;
    case 'interests':
      return contact.interests;
    case 'whyNow':
      return contact.whyNow;
    case 'notes':
      return contact.notes;
    case 'title':
      return contact.title;
    case 'organizationalTitle':
      return contact.organizationalTitle;
    case 'company':
      return contact.company;
    case 'location':
      return contact.location;
    case 'tags':
      return null; // Tags handled separately
    default:
      return null;
  }
}
