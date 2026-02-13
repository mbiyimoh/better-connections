// src/lib/clarity-canvas/prompts.ts
// System prompt builder for Explore chat with Clarity Canvas integration

import type { BaseSynthesis } from './types';

/**
 * Core instructions for contact evaluation that apply whether or not
 * Clarity Canvas is connected. This ensures the AI always has thoughtful
 * guidance on HOW to evaluate and recommend contacts.
 */
const CONTACT_EVALUATION_GUIDANCE = `
## How to Evaluate and Recommend Contacts

When analyzing the user's contact list and their query, consider these dimensions:

1. **Relevance to Query**: How directly does this contact's expertise, role, industry, or network relate to what the user is asking about?

2. **Relationship Context**: What do we know about how they met (howWeMet), the nature of their relationship (relationshipStrength), and when they last connected (lastContactDate)? Stronger, more recent relationships are often easier to activate.

3. **Expertise & Interests**: What domains does this contact specialize in (expertise)? What are they passionate about or curious about (interests)? Match these to the user's needs.

4. **Current Relevance (Why Now)**: Look at the whyNow field - this captures why this contact matters RIGHT NOW. If present, use this context heavily in your recommendation.

5. **Strategic Value**: Consider not just direct help but indirect value - can this contact make introductions, provide insider knowledge, or open doors to others?

6. **Actionability**: Prioritize contacts the user can realistically reach out to. A warm connection they haven't talked to in a month is often better than a cold connection they met briefly years ago.

## Crafting the "Why Now" Reason

For each contact you recommend, your explanation should answer:
- **What** makes this contact relevant to the user's query
- **Why** reaching out NOW (vs later) makes sense
- **How** specifically this contact can help (be concrete, not vague)

Bad example: "John Smith - He's in tech and might be helpful"
Good example: "John Smith - He led enterprise sales at a Series B startup and now advises on go-to-market strategy. His experience scaling from 10 to 100 enterprise customers directly relates to your current challenge."
`;

/**
 * Build an enhanced system prompt for Explore chat
 * Injects Clarity Canvas context to personalize recommendations
 */
export function buildExploreSystemPrompt(
  synthesis: BaseSynthesis | null
): string {
  const baseInstructions = `You are an AI assistant helping a user explore and leverage their professional network strategically.

When suggesting contacts, ALWAYS format them using this exact format:
[CONTACT: {contact_id}] {name} - {reason_for_suggestion}`;

  if (!synthesis) {
    // Non-Clarity-Canvas prompt: Full guidance without personalized context
    return `${baseInstructions}

## Your Role

You're helping a professional discover who in their network can help with whatever they're working on. You have access to their contact list with rich context about each relationship.

${CONTACT_EVALUATION_GUIDANCE}

## What You Don't Know

The user hasn't connected their Clarity Canvas profile, so you don't have context about:
- Their specific business goals and priorities
- Active projects they're working on
- Target personas or customer profiles they're trying to reach
- Strategic challenges they're facing

**Work with what you have**: Use their query plus the contact data (expertise, interests, whyNow, howWeMet, tags, etc.) to make smart recommendations. Ask clarifying questions if their query is too vague to make good matches.

## Output Format

For each contact suggestion, provide:
[CONTACT: {id}] {Name} - {Specific reason this contact is relevant to their query}

Focus on being helpful with the information available. If you need more context to make better recommendations, ask.`;
  }

  // Build Clarity Canvas context using natural language that handles sparse data gracefully
  const identityContext = buildIdentityContext(synthesis);
  const focusContext = buildFocusContext(synthesis);
  const audienceContext = buildAudienceContext(synthesis);
  const challengesContext = buildChallengesContext(synthesis);

  return `${baseInstructions}

## Who You're Helping

${identityContext}

${focusContext}

${audienceContext}

${challengesContext}

${CONTACT_EVALUATION_GUIDANCE}

## Using Their Clarity Canvas Context

You have rich context about this user from their Clarity Canvas profile. Use it to:

1. **Prioritize Strategic Fit**: Suggest contacts who directly align with their stated goals, target personas, or can help with their challenges.

2. **Make Connections Explicit**: When a contact relates to something in their profile (a goal, a persona, a challenge), call that out explicitly.

3. **Be Project-Aware**: If they have active projects, consider who can accelerate progress on those specifically.

4. **Consider Their Audience**: If a contact matches or can introduce them to someone in their target audience, highlight this.

## Output Format

For each contact suggestion, provide:
[CONTACT: {id}] {Name} - {Strategic reason tied to their goals/context}

The reason should explicitly connect to their Clarity Canvas context when relevant.`;
}

/**
 * Build identity context with graceful handling of missing fields
 */
function buildIdentityContext(synthesis: BaseSynthesis): string {
  const { identity } = synthesis;

  const parts: string[] = [];

  if (identity.name) {
    parts.push(`**${identity.name}**`);
  }

  if (identity.role && identity.company) {
    parts.push(`is a ${identity.role} at ${identity.company}`);
  } else if (identity.role) {
    parts.push(`works as a ${identity.role}`);
  } else if (identity.company) {
    parts.push(`works at ${identity.company}`);
  }

  if (identity.companyStage && identity.companyStage !== 'unknown') {
    parts.push(`(${identity.companyStage}-stage company)`);
  }

  if (identity.industry) {
    parts.push(`in the ${identity.industry} space`);
  }

  return parts.length > 0
    ? parts.join(' ') + '.'
    : 'A professional looking to leverage their network strategically.';
}

/**
 * Build focus context (goals, projects, priorities) with natural language
 */
function buildFocusContext(synthesis: BaseSynthesis): string {
  const sections: string[] = [];

  // Goals
  const immediateGoals = synthesis.goals?.filter(g => g.timeframe === 'immediate') ?? [];
  const mediumTermGoals = synthesis.goals?.filter(g => g.timeframe === 'medium-term') ?? [];

  if (immediateGoals.length > 0 || mediumTermGoals.length > 0) {
    sections.push('## Their Current Focus\n');

    if (immediateGoals.length > 0) {
      sections.push('**Right now, they\'re focused on:**');
      immediateGoals.forEach(g => {
        sections.push(`- ${g.goal}${g.priority === 'high' ? ' (high priority)' : ''}`);
      });
      sections.push('');
    }

    if (mediumTermGoals.length > 0) {
      sections.push('**Coming up on their radar:**');
      mediumTermGoals.forEach(g => {
        sections.push(`- ${g.goal}`);
      });
      sections.push('');
    }
  }

  // Active Projects
  const activeProjects = synthesis.activeProjects?.filter(p => p.status === 'active') ?? [];
  if (activeProjects.length > 0) {
    sections.push('**Active projects:**');
    activeProjects.forEach(p => {
      const desc = p.description ? `: ${p.description}` : '';
      sections.push(`- ${p.name}${desc}`);
    });
    sections.push('');
  }

  // Strategic Priorities
  if (synthesis.strategicPriorities?.length > 0) {
    sections.push('**Strategic priorities:**');
    synthesis.strategicPriorities.forEach(p => {
      sections.push(`- ${p}`);
    });
    sections.push('');
  }

  return sections.length > 0
    ? sections.join('\n')
    : '## Their Current Focus\n\nNo specific goals or projects have been defined yet. Focus on understanding their query to make relevant recommendations.';
}

/**
 * Build audience context (personas, decision dynamics)
 */
function buildAudienceContext(synthesis: BaseSynthesis): string {
  const sections: string[] = [];

  // Personas
  if (synthesis.personas?.length > 0) {
    sections.push('## Who They\'re Trying to Reach\n');
    sections.push('**Target personas:**');
    synthesis.personas.forEach(p => {
      sections.push(`\n**${p.name}** (${p.role})`);
      if (p.primaryGoal) sections.push(`- Their goal: ${p.primaryGoal}`);
      if (p.topFrustration) sections.push(`- Key frustration: ${p.topFrustration}`);
    });
    sections.push('');
  }

  // Decision Dynamics
  const decisionMakers = synthesis.decisionDynamics?.decisionMakers ?? [];
  const influencers = synthesis.decisionDynamics?.keyInfluencers ?? [];

  if (decisionMakers.length > 0 || influencers.length > 0) {
    if (sections.length === 0) {
      sections.push('## Who They\'re Trying to Reach\n');
    }

    if (decisionMakers.length > 0) {
      sections.push(`**Key decision-makers:** ${decisionMakers.join(', ')}`);
    }
    if (influencers.length > 0) {
      sections.push(`**Important influencers:** ${influencers.join(', ')}`);
    }
    sections.push('');
  }

  return sections.length > 0
    ? sections.join('\n')
    : '';
}

/**
 * Build challenges context (pain points)
 */
function buildChallengesContext(synthesis: BaseSynthesis): string {
  if (!synthesis.painPoints?.length) {
    return '';
  }

  const sections: string[] = ['## Their Challenges\n'];

  synthesis.painPoints.forEach(p => {
    const severity = p.severity ? ` (${p.severity})` : '';
    sections.push(`- ${p.pain}${severity}`);
  });

  return sections.join('\n');
}
