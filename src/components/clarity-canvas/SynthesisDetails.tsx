'use client';

import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Target,
  Users,
  Briefcase,
  AlertTriangle,
  TrendingUp,
  Building2,
  Brain,
  Heart,
  Award,
  Network,
} from 'lucide-react';
import type { BaseSynthesis } from '@/lib/clarity-canvas/types';

interface SynthesisDetailsProps {
  synthesis: BaseSynthesis;
  defaultExpanded?: boolean;
}

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  count?: number;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

function Section({
  title,
  icon,
  count,
  children,
  defaultExpanded = false,
}: SectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="border-t border-white/10 pt-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left text-sm text-white hover:text-gold-primary transition-colors"
      >
        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        {icon}
        <span className="font-medium">{title}</span>
        {count !== undefined && <span className="text-zinc-500">({count})</span>}
      </button>
      {expanded && <div className="mt-2 pl-6 space-y-1">{children}</div>}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="text-sm text-zinc-400">
      <span className="text-zinc-500">{label}:</span> {value}
    </div>
  );
}

function ListSection({ items, label }: { items: string[]; label?: string }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="text-sm text-zinc-400">
      {label && <span className="text-zinc-500">{label}: </span>}
      {items.join(', ')}
    </div>
  );
}

export function SynthesisDetails({
  synthesis,
  defaultExpanded = false,
}: SynthesisDetailsProps) {
  const {
    goals,
    personas,
    activeProjects,
    painPoints,
    strategicPriorities,
    background,
    thinkingStyle,
    workingStyle,
    values,
    roleScope,
    product,
    market,
    financials,
    successMetrics,
    team,
    supportNetwork,
    recentAccomplishments,
  } = synthesis;

  // Check which sections have content
  const hasBackground = background?.careerPath || background?.expertise?.length || background?.education;
  const hasThinking = thinkingStyle?.decisionMaking || thinkingStyle?.problemSolving || thinkingStyle?.riskTolerance;
  const hasWorking = workingStyle?.collaborationPreference || workingStyle?.communicationStyle;
  const hasValues = values?.coreValues?.length || values?.motivations?.length || values?.personalMission;
  const hasRoleScope = roleScope?.decisionAuthority || roleScope?.budgetControl || roleScope?.teamSize;
  const hasProduct = product?.coreProduct || product?.valueProposition || product?.businessModel;
  const hasMarket = market?.targetMarket || market?.customerSegments?.length || market?.competitiveLandscape;
  const hasFinancials = financials?.fundingStatus || financials?.runway || financials?.revenueStage;
  const hasMetrics = successMetrics?.northStar || successMetrics?.kpis?.length;
  const hasTeam = team?.directReports?.length || team?.keyCollaborators?.length;
  const hasSupport = supportNetwork?.advisors?.length || supportNetwork?.mentors?.length || supportNetwork?.helpNeeded?.length;
  const hasAccomplishments = recentAccomplishments?.recentWins?.length || recentAccomplishments?.lessonsLearned?.length;

  return (
    <div className="space-y-3">
      {/* Background & Expertise */}
      {hasBackground && (
        <Section
          title="Background & Expertise"
          icon={<Award size={16} className="text-gold-primary" />}
          defaultExpanded={defaultExpanded}
        >
          <DetailRow label="Career" value={background.careerPath} />
          <DetailRow label="Education" value={background.education} />
          {background.yearsExperience && (
            <DetailRow label="Experience" value={`${background.yearsExperience} years`} />
          )}
          <ListSection items={background.expertise || []} label="Expertise" />
        </Section>
      )}

      {/* Thinking Style */}
      {hasThinking && (
        <Section
          title="Thinking Style"
          icon={<Brain size={16} className="text-gold-primary" />}
          defaultExpanded={defaultExpanded}
        >
          <DetailRow label="Decision Making" value={thinkingStyle.decisionMaking} />
          <DetailRow label="Problem Solving" value={thinkingStyle.problemSolving} />
          <DetailRow label="Risk Tolerance" value={thinkingStyle.riskTolerance} />
          <DetailRow label="Learning Style" value={thinkingStyle.learningStyle} />
        </Section>
      )}

      {/* Working Style */}
      {hasWorking && (
        <Section
          title="Working Style"
          icon={<Users size={16} className="text-gold-primary" />}
          defaultExpanded={defaultExpanded}
        >
          <DetailRow label="Collaboration" value={workingStyle.collaborationPreference} />
          <DetailRow label="Communication" value={workingStyle.communicationStyle} />
          <DetailRow label="Work Pace" value={workingStyle.workPace} />
          <DetailRow label="Autonomy" value={workingStyle.autonomyLevel} />
        </Section>
      )}

      {/* Values & Motivations */}
      {hasValues && (
        <Section
          title="Values & Motivations"
          icon={<Heart size={16} className="text-gold-primary" />}
          defaultExpanded={defaultExpanded}
        >
          <ListSection items={values.coreValues || []} label="Core Values" />
          <ListSection items={values.motivations || []} label="Motivations" />
          <DetailRow label="Mission" value={values.personalMission} />
          <ListSection items={values.passions || []} label="Passions" />
        </Section>
      )}

      {/* Role & Authority */}
      {hasRoleScope && (
        <Section
          title="Role & Authority"
          icon={<Briefcase size={16} className="text-gold-primary" />}
          defaultExpanded={defaultExpanded}
        >
          <DetailRow label="Decision Authority" value={roleScope.decisionAuthority} />
          <DetailRow label="Budget Control" value={roleScope.budgetControl} />
          <DetailRow label="Strategic Input" value={roleScope.strategicInput} />
          {roleScope.teamSize && (
            <DetailRow label="Team Size" value={`${roleScope.teamSize} people`} />
          )}
        </Section>
      )}

      {/* Product & Strategy */}
      {hasProduct && (
        <Section
          title="Product & Strategy"
          icon={<Building2 size={16} className="text-gold-primary" />}
          defaultExpanded={defaultExpanded}
        >
          <DetailRow label="Core Product" value={product.coreProduct} />
          <DetailRow label="Value Proposition" value={product.valueProposition} />
          <DetailRow label="Business Model" value={product.businessModel} />
          <DetailRow label="Competitive Edge" value={product.competitiveAdvantage} />
        </Section>
      )}

      {/* Market Position */}
      {hasMarket && (
        <Section
          title="Market Position"
          icon={<TrendingUp size={16} className="text-gold-primary" />}
          defaultExpanded={defaultExpanded}
        >
          <DetailRow label="Target Market" value={market.targetMarket} />
          <ListSection items={market.customerSegments || []} label="Customer Segments" />
          <DetailRow label="Market Size" value={market.marketSize} />
          <DetailRow label="Competitive Landscape" value={market.competitiveLandscape} />
        </Section>
      )}

      {/* Financials */}
      {hasFinancials && (
        <Section
          title="Financial Context"
          icon={<TrendingUp size={16} className="text-gold-primary" />}
          defaultExpanded={defaultExpanded}
        >
          <DetailRow label="Funding Status" value={financials.fundingStatus} />
          <DetailRow label="Runway" value={financials.runway} />
          <DetailRow label="Revenue Stage" value={financials.revenueStage} />
        </Section>
      )}

      {/* Goals Section */}
      {goals.length > 0 && (
        <Section
          title="Goals"
          icon={<Target size={16} className="text-gold-primary" />}
          count={goals.length}
          defaultExpanded={defaultExpanded}
        >
          {goals.map((goal, i) => (
            <div key={i} className="text-sm text-zinc-400">
              &bull; {goal.goal}
              <span className="text-zinc-600 ml-1">
                ({goal.priority} priority, {goal.timeframe})
              </span>
            </div>
          ))}
        </Section>
      )}

      {/* Success Metrics */}
      {hasMetrics && (
        <Section
          title="Success Metrics"
          icon={<Target size={16} className="text-gold-primary" />}
          defaultExpanded={defaultExpanded}
        >
          <DetailRow label="North Star" value={successMetrics.northStar} />
          <ListSection items={successMetrics.kpis || []} label="KPIs" />
          <DetailRow label="Success Definition" value={successMetrics.successDefinition} />
        </Section>
      )}

      {/* Strategic Priorities */}
      {strategicPriorities.length > 0 && (
        <Section
          title="Strategic Priorities"
          icon={<Target size={16} className="text-gold-primary" />}
          count={strategicPriorities.length}
          defaultExpanded={defaultExpanded}
        >
          {strategicPriorities.map((priority, i) => (
            <div key={i} className="text-sm text-zinc-400">
              &bull; {priority}
            </div>
          ))}
        </Section>
      )}

      {/* Target Personas Section */}
      {personas.length > 0 && (
        <Section
          title="Target Personas"
          icon={<Users size={16} className="text-gold-primary" />}
          count={personas.length}
          defaultExpanded={defaultExpanded}
        >
          {personas.map((persona, i) => (
            <div key={i} className="text-sm mb-2">
              <div className="text-zinc-300 font-medium">&bull; {persona.name}</div>
              <div className="text-zinc-500 pl-3 text-xs">
                <div>Role: {persona.role}</div>
                <div>Goal: {persona.primaryGoal}</div>
                <div>Frustration: {persona.topFrustration}</div>
              </div>
            </div>
          ))}
        </Section>
      )}

      {/* Team & Collaborators */}
      {hasTeam && (
        <Section
          title="Team & Collaborators"
          icon={<Network size={16} className="text-gold-primary" />}
          defaultExpanded={defaultExpanded}
        >
          <ListSection items={team.directReports || []} label="Direct Reports" />
          <ListSection items={team.keyCollaborators || []} label="Key Collaborators" />
          <ListSection items={team.crossFunctional || []} label="Cross-functional" />
        </Section>
      )}

      {/* Support Network */}
      {hasSupport && (
        <Section
          title="Support Network"
          icon={<Network size={16} className="text-gold-primary" />}
          defaultExpanded={defaultExpanded}
        >
          <ListSection items={supportNetwork.advisors || []} label="Advisors" />
          <ListSection items={supportNetwork.mentors || []} label="Mentors" />
          <DetailRow label="Peer Network" value={supportNetwork.peerNetwork} />
          <ListSection items={supportNetwork.helpNeeded || []} label="Help Needed" />
        </Section>
      )}

      {/* Active Projects Section */}
      {activeProjects.length > 0 && (
        <Section
          title="Active Projects"
          icon={<Briefcase size={16} className="text-gold-primary" />}
          count={activeProjects.length}
          defaultExpanded={defaultExpanded}
        >
          {activeProjects.map((project, i) => (
            <div key={i} className="text-sm text-zinc-400">
              &bull; {project.name}
              <span className="text-zinc-600 ml-1">
                ({project.status}, {project.priority} priority)
              </span>
            </div>
          ))}
        </Section>
      )}

      {/* Recent Accomplishments */}
      {hasAccomplishments && (
        <Section
          title="Recent Accomplishments"
          icon={<Award size={16} className="text-gold-primary" />}
          defaultExpanded={defaultExpanded}
        >
          <ListSection items={recentAccomplishments.recentWins || []} label="Recent Wins" />
          <ListSection items={recentAccomplishments.lessonsLearned || []} label="Lessons Learned" />
        </Section>
      )}

      {/* Challenges Section */}
      {painPoints.length > 0 && (
        <Section
          title="Challenges"
          icon={<AlertTriangle size={16} className="text-gold-primary" />}
          count={painPoints.length}
          defaultExpanded={defaultExpanded}
        >
          {painPoints.map((pain, i) => (
            <div key={i} className="text-sm text-zinc-400">
              &bull; {pain.pain}
              <span className="text-zinc-600 ml-1">
                ({pain.severity}, {pain.category})
              </span>
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}
