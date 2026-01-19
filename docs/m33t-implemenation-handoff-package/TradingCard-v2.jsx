import React, { useState, useEffect } from 'react';

/**
 * TRADING CARD COMPONENT (v2)
 * 
 * Progressive disclosure levels:
 * - L1 (mini): Glanceable - photo, name, headline, location
 * - L2 (compact): Scannable - + role, expertise tags, seeking/offering summary
 * - L3 (full): Readable - + current focus, background, ideal match, personal
 * - L4 (expanded): Deep-dive - expandable sections with full detail
 */

// Sample full profile data (what we'd get from the backend)
const sampleProfile = {
  identity: {
    name: "Marcus Chen",
    photo_url: null,
    location: { primary: "Austin, TX", secondary: "Nashville, TN" }
  },
  professional: {
    current: {
      role: "Managing Partner",
      company: "Redline Capital",
      industry: "Real Estate"
    },
    expertise: {
      primary: ["Ground-up development", "LP fundraising", "BTR operations"],
      detailed: [
        {
          skill: "Ground-up Development",
          depth: "expert",
          years: 8,
          evidence: "Led entitlement and construction on 500-unit Austin project",
          context: "2,000+ units delivered across Texas"
        },
        {
          skill: "LP Fundraising",
          depth: "deep",
          years: 5,
          evidence: "Raised Fund I ($30M) and Fund II ($50M)",
          context: "Know what institutional LPs want to see in decks"
        },
        {
          skill: "BTR Operations",
          depth: "working",
          years: 3,
          evidence: "Currently operating 400 BTR units",
          context: "Built operational playbook from scratch"
        }
      ]
    },
    track_record: [
      { description: "Built 2,000+ multifamily units across Texas", metrics: "$150M+ total project value" },
      { description: "Raised two funds totaling $80M", metrics: "15+ LP relationships" }
    ]
  },
  event_context: {
    current_focus: {
      summary: "Raising Fund III ($75M) for BTR projects, expanding to Southeast",
      details: "Fund II almost fully deployed. Targeting family offices for larger check sizes. Evaluating Nashville and Memphis markets for expansion."
    },
    relevant_background: {
      summary: "Built 2,000+ units across Texas over 8 years. Former investment banker, pivoted to RE post-2008."
    }
  },
  goals: {
    seeking: {
      primary: {
        description: "Family office intros",
        detail: "Targeting $5M+ LP checks for Fund III",
        urgency: "active"
      },
      secondary: [
        { description: "Nashville market operator", detail: "Looking for JV partner with 50+ units local experience", urgency: "active" },
        { description: "Construction lender relationships", detail: "For Fund III projects", urgency: "exploratory" }
      ]
    }
  },
  offerings: {
    can_help_with: {
      primary: [
        { description: "LP deck review", detail: "Raised 2 funds, have strong opinions on what works", availability: "open" },
        { description: "Austin market diligence", detail: "Deep knowledge of submarkets, operators, and deal flow", availability: "open" },
        { description: "Entitlement strategy", detail: "Know the Texas process well, happy to share war stories", availability: "selective" }
      ]
    },
    willing_to: {
      partner: { interested: true, type: "JV or Co-GP in target markets" },
      advise: { interested: true, capacity: "Limited bandwidth, selective" }
    }
  },
  personal: {
    interests: {
      hobbies: ["Youth baseball coaching", "Bourbon collecting (200+ bottles)"],
      professional_adjacent: ["Angel investing in proptech"]
    },
    background: {
      notable_experiences: ["Former D1 baseball player at UT", "Started in investment banking pre-2008"]
    },
    conversation_hooks: [
      { topic: "Baseball", why: "Played D1, now coaches son's team" },
      { topic: "Bourbon", why: "Serious collector, 200+ bottles" },
      { topic: "2008 career pivot", why: "Left banking for RE during crisis" }
    ]
  },
  matching: {
    ideal_match: {
      description: "Someone who's done 50+ BTR units in Nashville or Memphis and can help me avoid rookie mistakes in the market"
    }
  },
  collaboration: {
    communication_style: { primary: "direct", pace: "fast" },
    working_style: { decision_making: "instinctive", follow_through: "executor" },
    preferences: ["Responsive communication", "Do what you say", "Bias to action"],
    dealbreakers: ["Slow responders", "Over-promisers", "Endless debaters"]
  }
};

// Generate accent color from name
const generateColor = (name) => {
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return hash % 360;
};

// Format location
const formatLocation = (location) => {
  if (location.secondary) {
    return `${location.primary.split(',')[0]} → ${location.secondary.split(',')[0]}`;
  }
  return location.primary;
};

// Expandable Section Component
const ExpandableSection = ({ title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div style={{ borderTop: '1px solid #eee', marginTop: '16px' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 0',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '11px',
          fontWeight: 600,
          color: '#666',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        <span>{title}</span>
        <span style={{ 
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease'
        }}>
          ▼
        </span>
      </button>
      <div style={{
        maxHeight: isOpen ? '500px' : '0',
        overflow: 'hidden',
        transition: 'max-height 0.3s ease',
      }}>
        <div style={{ paddingBottom: '16px' }}>
          {children}
        </div>
      </div>
    </div>
  );
};

// Detail Item Component (for L4 expanded content)
const DetailItem = ({ primary, secondary, badge, badgeColor }) => (
  <div style={{ marginBottom: '12px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
      <span style={{ fontSize: '14px', fontWeight: 500, color: '#333' }}>{primary}</span>
      {badge && (
        <span style={{
          fontSize: '10px',
          padding: '2px 6px',
          borderRadius: '4px',
          background: badgeColor || '#e5e5e5',
          color: '#666',
          fontWeight: 500,
        }}>
          {badge}
        </span>
      )}
    </div>
    {secondary && (
      <p style={{ fontSize: '13px', color: '#666', margin: 0, lineHeight: 1.4 }}>{secondary}</p>
    )}
  </div>
);

// Main Trading Card Component
const TradingCard = ({ 
  profile = sampleProfile, 
  level = 'full',  // 'mini' (L1) | 'compact' (L2) | 'full' (L3) | 'expanded' (L4)
  showActions = true,
  matchContext = null,  // { reason: "You're both raising funds", conversation_prompts: [...] }
  onConnect,
  onExpand,
}) => {
  const [currentLevel, setCurrentLevel] = useState(level);
  const [expandedSections, setExpandedSections] = useState({});
  
  // Sync level prop to state when it changes
  useEffect(() => {
    setCurrentLevel(level);
  }, [level]);
  
  const hue = generateColor(profile.identity.name);
  const initials = profile.identity.name.split(' ').map(n => n[0]).join('');
  const location = formatLocation(profile.identity.location);
  
  // Computed display data
  const headline = "Build-to-rent developer scaling into Southeast"; // Would be generated
  const seekingSummary = [
    profile.goals.seeking.primary.description,
    ...profile.goals.seeking.secondary.slice(0, 1).map(s => s.description)
  ].join(", ");
  const offeringSummary = profile.offerings.can_help_with.primary
    .slice(0, 2)
    .map(o => o.description)
    .join(", ");
  
  // Styles
  const styles = {
    container: {
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      maxWidth: currentLevel === 'mini' ? '180px' : currentLevel === 'compact' ? '400px' : '420px',
      width: '100%',
    },
    card: {
      background: 'white',
      borderRadius: '16px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 8px 30px rgba(0,0,0,0.12)',
      overflow: 'hidden',
    },
    header: {
      background: `linear-gradient(135deg, hsl(${hue}, 65%, 50%) 0%, hsl(${hue}, 65%, 40%) 100%)`,
      padding: currentLevel === 'mini' ? '16px' : '20px 20px 44px',
      position: 'relative',
    },
    headerCurve: {
      position: 'absolute',
      bottom: '-1px',
      left: 0,
      right: 0,
      height: '20px',
      background: 'white',
      borderRadius: '20px 20px 0 0',
    },
    avatar: {
      width: currentLevel === 'mini' ? '48px' : currentLevel === 'compact' ? '56px' : '72px',
      height: currentLevel === 'mini' ? '48px' : currentLevel === 'compact' ? '56px' : '72px',
      borderRadius: '50%',
      background: `linear-gradient(135deg, hsl(${hue}, 60%, 95%) 0%, white 100%)`,
      border: '3px solid white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: currentLevel === 'mini' ? '16px' : currentLevel === 'compact' ? '18px' : '24px',
      fontWeight: 700,
      color: `hsl(${hue}, 65%, 45%)`,
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      margin: currentLevel === 'compact' ? '0' : '0 auto',
      position: currentLevel === 'mini' || currentLevel === 'compact' ? 'relative' : 'relative',
      zIndex: 2,
      marginBottom: currentLevel === 'mini' || currentLevel === 'compact' ? '0' : '-36px',
    },
    content: {
      padding: currentLevel === 'mini' ? '8px 0 0' : currentLevel === 'compact' ? '0' : '44px 20px 20px',
    },
    name: {
      fontSize: currentLevel === 'mini' ? '14px' : currentLevel === 'compact' ? '16px' : '20px',
      fontWeight: 700,
      color: '#1a1a1a',
      margin: 0,
      textAlign: currentLevel === 'compact' ? 'left' : 'center',
    },
    headline: {
      fontSize: currentLevel === 'mini' ? '11px' : currentLevel === 'compact' ? '13px' : '14px',
      color: '#666',
      margin: '4px 0 0',
      lineHeight: 1.4,
      textAlign: currentLevel === 'compact' ? 'left' : 'center',
    },
    meta: {
      fontSize: '12px',
      color: '#888',
      marginTop: '4px',
      textAlign: currentLevel === 'compact' ? 'left' : 'center',
    },
    tags: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '6px',
      marginTop: '12px',
      justifyContent: currentLevel === 'compact' ? 'flex-start' : 'center',
    },
    tag: {
      background: `hsl(${hue}, 60%, 95%)`,
      color: `hsl(${hue}, 60%, 35%)`,
      padding: '4px 10px',
      borderRadius: '100px',
      fontSize: '11px',
      fontWeight: 500,
    },
    exchangeSection: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '12px',
      marginTop: '16px',
    },
    exchangeBox: (type) => ({
      padding: '12px',
      borderRadius: '10px',
      background: type === 'seeking' 
        ? 'linear-gradient(135deg, #fef9c3 0%, #fef3c7 100%)'
        : 'linear-gradient(135deg, #dcfce7 0%, #d1fae5 100%)',
    }),
    exchangeLabel: (type) => ({
      fontSize: '10px',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      marginBottom: '6px',
      color: type === 'seeking' ? '#92400e' : '#166534',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
    }),
    exchangeText: {
      fontSize: '12px',
      color: '#444',
      lineHeight: 1.4,
      margin: 0,
    },
    section: {
      marginTop: '16px',
    },
    sectionLabel: {
      fontSize: '10px',
      fontWeight: 600,
      color: '#999',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      marginBottom: '6px',
    },
    sectionContent: {
      fontSize: '13px',
      color: '#444',
      lineHeight: 1.5,
    },
    quote: {
      background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
      padding: '12px 14px',
      borderRadius: '10px',
      fontSize: '13px',
      color: '#0c4a6e',
      lineHeight: 1.5,
      fontStyle: 'italic',
      position: 'relative',
    },
    personalHooks: {
      display: 'flex',
      gap: '8px',
      flexWrap: 'wrap',
      marginTop: '16px',
      paddingTop: '16px',
      borderTop: '1px solid #eee',
    },
    hook: {
      fontSize: '12px',
      color: '#666',
      background: '#f5f5f5',
      padding: '4px 10px',
      borderRadius: '100px',
    },
    actions: {
      display: 'flex',
      gap: '8px',
      marginTop: '16px',
      paddingTop: '16px',
      borderTop: '1px solid #eee',
    },
    primaryBtn: {
      flex: 1,
      padding: '12px',
      borderRadius: '10px',
      border: 'none',
      background: `hsl(${hue}, 65%, 50%)`,
      color: 'white',
      fontSize: '14px',
      fontWeight: 600,
      cursor: 'pointer',
    },
    secondaryBtn: {
      padding: '12px 16px',
      borderRadius: '10px',
      border: 'none',
      background: '#f5f5f5',
      color: '#666',
      fontSize: '14px',
      fontWeight: 500,
      cursor: 'pointer',
    },
    expandHint: {
      textAlign: 'center',
      padding: '12px',
      fontSize: '11px',
      color: '#aaa',
      cursor: 'pointer',
    },
    matchContext: {
      background: `linear-gradient(135deg, hsl(${hue}, 60%, 97%) 0%, hsl(${hue}, 60%, 94%) 100%)`,
      padding: '12px 16px',
      borderBottom: '1px solid #eee',
      fontSize: '12px',
      color: `hsl(${hue}, 60%, 35%)`,
    },
  };

  // ========== L1: MINI (Glance) ==========
  if (currentLevel === 'mini') {
    return (
      <div style={styles.container}>
        <div 
          style={{ ...styles.card, padding: '16px', textAlign: 'center', cursor: 'pointer' }}
          onClick={() => onExpand?.('compact')}
        >
          <div style={styles.avatar}>{initials}</div>
          <div style={styles.content}>
            <h3 style={styles.name}>{profile.identity.name}</h3>
            <p style={styles.headline}>{headline}</p>
          </div>
        </div>
      </div>
    );
  }

  // ========== L2: COMPACT (Scan) ==========
  if (currentLevel === 'compact') {
    return (
      <div style={styles.container}>
        <div 
          style={{ ...styles.card, display: 'flex', padding: '16px', gap: '14px', cursor: 'pointer' }}
          onClick={() => onExpand?.('full')}
        >
          <div style={styles.avatar}>{initials}</div>
          <div style={{ flex: 1 }}>
            <h3 style={styles.name}>{profile.identity.name}</h3>
            <p style={styles.headline}>{headline}</p>
            <p style={styles.meta}>
              {profile.professional.current.role} · {location}
            </p>
            <div style={styles.tags}>
              {profile.professional.expertise.primary.slice(0, 3).map((tag, i) => (
                <span key={i} style={styles.tag}>{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ========== L3: FULL (Read) & L4: EXPANDED (Deep-dive) ==========
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Match Context Banner (if provided) */}
        {matchContext && (
          <div style={styles.matchContext}>
            <strong>Why you're matched:</strong> {matchContext.reason}
          </div>
        )}
        
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.avatar}>{initials}</div>
          <div style={styles.headerCurve}></div>
        </div>
        
        {/* Content */}
        <div style={styles.content}>
          {/* Identity */}
          <div>
            <h3 style={styles.name}>{profile.identity.name}</h3>
            <p style={styles.headline}>{headline}</p>
            <p style={styles.meta}>
              {profile.professional.current.role} at {profile.professional.current.company} · {location}
            </p>
          </div>
          
          {/* Expertise Tags */}
          <div style={styles.tags}>
            {profile.professional.expertise.primary.map((tag, i) => (
              <span key={i} style={styles.tag}>{tag}</span>
            ))}
          </div>
          
          {/* Seeking / Offering */}
          <div style={styles.exchangeSection}>
            <div style={styles.exchangeBox('seeking')}>
              <div style={styles.exchangeLabel('seeking')}>
                <span>🎯</span> Looking For
              </div>
              <p style={styles.exchangeText}>{seekingSummary}</p>
            </div>
            <div style={styles.exchangeBox('offering')}>
              <div style={styles.exchangeLabel('offering')}>
                <span>🤝</span> Can Help With
              </div>
              <p style={styles.exchangeText}>{offeringSummary}</p>
            </div>
          </div>
          
          {/* Current Focus */}
          <div style={styles.section}>
            <div style={styles.sectionLabel}>Current Focus</div>
            <div style={styles.sectionContent}>
              {profile.event_context.current_focus.summary}
            </div>
          </div>
          
          {/* Background */}
          <div style={styles.section}>
            <div style={styles.sectionLabel}>Background</div>
            <div style={styles.sectionContent}>
              {profile.event_context.relevant_background.summary}
            </div>
          </div>
          
          {/* Ideal Match Quote */}
          <div style={styles.section}>
            <div style={styles.sectionLabel}>Ideal Connection</div>
            <div style={styles.quote}>
              "{profile.matching.ideal_match.description}"
            </div>
          </div>
          
          {/* Personal Hooks */}
          <div style={styles.personalHooks}>
            {profile.personal.background.notable_experiences.map((exp, i) => (
              <span key={i} style={styles.hook}>{exp}</span>
            ))}
            {profile.personal.interests.hobbies.slice(0, 1).map((hobby, i) => (
              <span key={`h-${i}`} style={styles.hook}>{hobby}</span>
            ))}
          </div>
          
          {/* L4: Expandable Deep-Dive Sections */}
          {currentLevel === 'expanded' && (
            <>
              <ExpandableSection title="Expertise Details">
                {profile.professional.expertise.detailed.map((item, i) => (
                  <DetailItem 
                    key={i}
                    primary={item.skill}
                    secondary={item.evidence}
                    badge={`${item.years}+ years`}
                  />
                ))}
              </ExpandableSection>
              
              <ExpandableSection title="Looking For (Details)">
                <DetailItem 
                  primary={profile.goals.seeking.primary.description}
                  secondary={profile.goals.seeking.primary.detail}
                  badge={profile.goals.seeking.primary.urgency}
                  badgeColor="#fef3c7"
                />
                {profile.goals.seeking.secondary.map((item, i) => (
                  <DetailItem 
                    key={i}
                    primary={item.description}
                    secondary={item.detail}
                    badge={item.urgency}
                    badgeColor="#fef3c7"
                  />
                ))}
              </ExpandableSection>
              
              <ExpandableSection title="Can Help With (Details)">
                {profile.offerings.can_help_with.primary.map((item, i) => (
                  <DetailItem 
                    key={i}
                    primary={item.description}
                    secondary={item.detail}
                    badge={item.availability}
                    badgeColor="#dcfce7"
                  />
                ))}
              </ExpandableSection>
              
              <ExpandableSection title="Working Style">
                <p style={{ fontSize: '13px', color: '#444', marginBottom: '12px' }}>
                  {profile.collaboration.communication_style.primary}, {profile.collaboration.communication_style.pace} pace
                </p>
                <div style={styles.sectionLabel}>Values in Partnerships</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                  {profile.collaboration.preferences.map((pref, i) => (
                    <span key={i} style={{ ...styles.tag, background: '#f0fdf4', color: '#166534' }}>{pref}</span>
                  ))}
                </div>
                <div style={styles.sectionLabel}>Won't Work With</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {profile.collaboration.dealbreakers.map((db, i) => (
                    <span key={i} style={{ ...styles.tag, background: '#fef2f2', color: '#991b1b' }}>{db}</span>
                  ))}
                </div>
              </ExpandableSection>
              
              <ExpandableSection title="Conversation Starters">
                {profile.personal.conversation_hooks.map((hook, i) => (
                  <DetailItem 
                    key={i}
                    primary={hook.topic}
                    secondary={hook.why}
                  />
                ))}
              </ExpandableSection>
            </>
          )}
          
          {/* Expand Hint (L3 → L4) */}
          {currentLevel === 'full' && (
            <div 
              style={styles.expandHint}
              onClick={() => setCurrentLevel('expanded')}
            >
              Show more details ↓
            </div>
          )}
          
          {/* Collapse Hint (L4 → L3) */}
          {currentLevel === 'expanded' && (
            <div 
              style={styles.expandHint}
              onClick={() => setCurrentLevel('full')}
            >
              Show less ↑
            </div>
          )}
          
          {/* Actions */}
          {showActions && (
            <div style={styles.actions}>
              <button style={styles.primaryBtn} onClick={() => onConnect?.(profile)}>
                Request Intro
              </button>
              <button style={styles.secondaryBtn}>
                Save
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


// ========== DEMO ==========
export default function TradingCardDemo() {
  const [demoLevel, setDemoLevel] = useState('full');
  
  const levels = [
    { key: 'mini', label: 'L1: Mini', desc: 'Glanceable' },
    { key: 'compact', label: 'L2: Compact', desc: 'Scannable' },
    { key: 'full', label: 'L3: Full', desc: 'Readable' },
    { key: 'expanded', label: 'L4: Expanded', desc: 'Deep-dive' },
  ];
  
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%)',
      padding: '24px 16px',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1a1a1a', marginBottom: '4px' }}>
          Trading Card v2
        </h1>
        <p style={{ fontSize: '13px', color: '#666' }}>
          Progressive disclosure: L1 → L4
        </p>
      </div>
      
      {/* Level Selector */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        gap: '8px', 
        marginBottom: '24px',
        flexWrap: 'wrap'
      }}>
        {levels.map((l) => (
          <button
            key={l.key}
            onClick={() => setDemoLevel(l.key)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: 'none',
              background: demoLevel === l.key ? '#1a1a1a' : '#e5e5e5',
              color: demoLevel === l.key ? 'white' : '#666',
              fontWeight: 500,
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              minWidth: '80px',
            }}
          >
            <span>{l.label}</span>
            <span style={{ fontSize: '10px', opacity: 0.7 }}>{l.desc}</span>
          </button>
        ))}
      </div>
      
      {/* Card Display */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center',
        padding: '0 16px'
      }}>
        <TradingCard 
          level={demoLevel}
          showActions={demoLevel === 'full' || demoLevel === 'expanded'}
          matchContext={demoLevel === 'expanded' ? {
            reason: "Both focused on Southeast expansion, complementary LP/operator needs"
          } : null}
          onExpand={(newLevel) => setDemoLevel(newLevel)}
        />
      </div>
      
      {/* Info */}
      <div style={{
        maxWidth: '400px',
        margin: '32px auto 0',
        padding: '16px',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      }}>
        <h3 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
          When to use each level
        </h3>
        <div style={{ fontSize: '12px', color: '#666', lineHeight: 1.6 }}>
          <p style={{ marginBottom: '6px' }}><strong>L1 Mini:</strong> Match previews, notifications, inline mentions</p>
          <p style={{ marginBottom: '6px' }}><strong>L2 Compact:</strong> Search results, attendee lists</p>
          <p style={{ marginBottom: '6px' }}><strong>L3 Full:</strong> Match reveal, profile view</p>
          <p style={{ marginBottom: '0' }}><strong>L4 Expanded:</strong> Pre-meeting prep, post-event research</p>
        </div>
      </div>
    </div>
  );
}
