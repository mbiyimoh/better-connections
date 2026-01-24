import { generateObject } from 'ai';
import { gpt4oMini } from '@/lib/openai';
import type {
  ContactContext,
  FocusArea,
  ResearchResult,
  GeneratedRecommendation,
  SynthesizedReport,
} from './types';
import { reportSynthesisSchema, recommendationOutputSchema, VALID_RECOMMENDATION_FIELDS } from './schemas';
import { buildSearchQuery } from './queryBuilder';
import { searchTavily, extractLinkedInProfile } from './tavilyClient';
import {
  buildSynthesisPrompt,
  buildRecommendationPrompt,
  SYNTHESIS_SYSTEM_PROMPT,
  RECOMMENDATION_SYSTEM_PROMPT,
} from './prompts';
import { discoverSocialProfiles, type SocialProfileMatch } from './socialDiscovery';
import {
  MIN_CONFIDENCE_THRESHOLD,
  filterValidUrls,
  validateRecommendationUrl,
} from './constants';

function platformToFieldName(platform: 'twitter' | 'github' | 'instagram'): string {
  switch (platform) {
    case 'twitter':
      return 'twitterUrl';
    case 'github':
      return 'githubUrl';
    case 'instagram':
      return 'instagramUrl';
  }
}

export async function executeContactResearch(options: {
  contact: ContactContext;
  focusAreas: FocusArea[];
  onProgress?: (stage: string) => void | Promise<void>;
}): Promise<ResearchResult> {
  const { contact, focusAreas, onProgress } = options;
  const startTime = Date.now();

  // DEBUG: Log research start
  console.log(`[Research] ========== STARTING RESEARCH ==========`);
  console.log(`[Research] Contact: ${contact.firstName} ${contact.lastName}`);
  console.log(`[Research] Company: ${contact.company || 'none'}`);
  console.log(`[Research] Title: ${contact.title || 'none'}`);
  console.log(`[Research] Location: ${contact.location || 'none'}`);
  console.log(`[Research] LinkedIn: ${contact.linkedinUrl || 'none'}`);
  console.log(`[Research] Focus areas: ${focusAreas.join(', ')}`);

  try {
    // Step 1: Build search query
    await onProgress?.('Building search query...');
    const searchQuery = buildSearchQuery(contact, focusAreas);
    console.log(`[Research] Built search query: "${searchQuery}"`);

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

    // Step 2b: If 'social' focus area, discover social profiles
    let socialProfiles: SocialProfileMatch[] = [];
    if (focusAreas.includes('social')) {
      await onProgress?.('Discovering social profiles...');
      const socialResult = await discoverSocialProfiles(contact, onProgress);
      socialProfiles = socialResult.matches;
      console.log(`[Research] Social discovery found ${socialProfiles.length} profiles`);
      socialProfiles.forEach((p) => {
        console.log(`[Research] - ${p.platform}: ${p.url} (confidence: ${p.confidence.toFixed(2)})`);
      });
    }

    // Step 2c: Execute Tavily web search
    // Note: General web search passes fullName to filter out irrelevant results about
    // other people with similar names. This is intentional - social profile discovery
    // (Step 2b) skips name filtering because social snippets often don't include the
    // full name, and instead relies on confidence scoring in parseAndScoreProfile().
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
      console.log(`[Research] No sources found after filtering - returning empty result`);
      console.log(`[Research] Sources analyzed: ${findings.sourcesAnalyzed}`);
      return {
        success: true,
        searchQuery,
        findings,
        report: null,
        recommendations: [],
        executionTimeMs: Date.now() - startTime,
      };
    }

    console.log(`[Research] ${findings.sources.length} sources available for synthesis`);

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
      synthesisResult.object.keyFindings,
      report.sourceUrls // Pass actual source URLs so GPT doesn't hallucinate
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
    // First filter for valid field names (GPT may return fields like 'certifications' that don't exist)
    const validFieldSet = new Set(VALID_RECOMMENDATION_FIELDS);
    // Create set of valid source URLs to validate against hallucinated URLs
    const validSourceUrls = new Set(report.sourceUrls);

    const gptRecommendations: GeneratedRecommendation[] =
      recResult.object.recommendations
        // Filter out invalid field names that don't map to Contact model
        .filter((r) => {
          if (!validFieldSet.has(r.fieldName as typeof VALID_RECOMMENDATION_FIELDS[number])) {
            console.log(`[Research] Filtering out recommendation with invalid fieldName: ${r.fieldName}`);
            return false;
          }
          return true;
        })
        .filter((r) => r.confidence >= MIN_CONFIDENCE_THRESHOLD)
        .map((r) => ({
          fieldName: r.fieldName,
          action: r.action,
          currentValue: getContactFieldValue(contact, r.fieldName),
          proposedValue: r.proposedValue,
          tagCategory: r.tagCategory || undefined,
          reasoning: r.reasoning,
          confidence: r.confidence,
          // Filter sourceUrls using centralized validation
          sourceUrls: filterValidUrls(r.sourceUrls, validSourceUrls),
        }))
        // Filter out recommendations that have NO valid source URLs after filtering
        .filter((r) => {
          if (r.sourceUrls.length === 0) {
            console.log(`[Research] Filtering out recommendation with no valid sources: ${r.fieldName}`);
            return false;
          }
          return true;
        })
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

    // Step 6: Convert social profile matches to recommendations
    const socialRecommendations: GeneratedRecommendation[] = [];
    for (const profile of socialProfiles) {
      // Validate source URL before creating recommendation
      const sourceValidation = validateRecommendationUrl(profile.sourceUrl);
      if (!sourceValidation.valid) {
        console.log(`[Research] Skipping social profile with invalid source (${sourceValidation.reason}): ${profile.sourceUrl}`);
        continue;
      }

      const fieldName = platformToFieldName(profile.platform);
      const currentValue = getContactFieldValue(contact, fieldName);

      // Skip if contact already has this profile URL
      if (currentValue) {
        console.log(`[Research] Skipping ${fieldName} - already set to ${currentValue}`);
        continue;
      }

      socialRecommendations.push({
        fieldName,
        action: 'ADD',
        currentValue: null,
        proposedValue: profile.url,
        reasoning: `Found ${profile.platform} profile matching ${contact.firstName} ${contact.lastName}${profile.displayName ? ` (${profile.displayName})` : ''}${profile.bio ? `. Bio: "${profile.bio.slice(0, 100)}..."` : ''}`,
        confidence: profile.confidence,
        sourceUrls: [profile.sourceUrl],
      });
    }

    console.log(`[Research] Generated ${socialRecommendations.length} social profile recommendations`);

    // Merge GPT recommendations with social profile recommendations
    const recommendations = [...gptRecommendations, ...socialRecommendations];

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
    case 'twitterUrl':
      return contact.twitterUrl ?? null;
    case 'githubUrl':
      return contact.githubUrl ?? null;
    case 'instagramUrl':
      return contact.instagramUrl ?? null;
    case 'tags':
      return null; // Tags handled separately
    default:
      return null;
  }
}
