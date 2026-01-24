import React, { useState, useEffect, useRef } from 'react';

/**
 * M33T PLATFORM DECK v2
 * 
 * 6-section scrollytelling narrative:
 * 1. The Problem (reframed - relevance, not volume)
 * 2. The Missed Opportunity + Product Tease (match card between "what if" questions)
 * 3. Introducing M33T (brand moment with iPhone mockups)
 * 4. How It Works (Before + At Event)
 * 5. The Result + CTA
 * 
 * Design: 33 Strategies brand (gold accent, dark theme)
 */

// ============================================================================
// DESIGN TOKENS - 33 Strategies Brand
// ============================================================================
const GOLD = '#D4A84B';
const GOLD_DIM = '#B8923F';
const GOLD_LIGHT = '#E4C06B';
const GOLD_GLOW = 'rgba(212, 168, 75, 0.15)';
const GOLD_MUTED = 'rgba(212, 168, 75, 0.12)';
const BG_PRIMARY = '#0a0a0a';
const BG_SURFACE = '#111111';
const BG_ELEVATED = '#1a1a1a';
const TEXT_PRIMARY = '#ffffff';
const TEXT_SECONDARY = '#a3a3a3';
const TEXT_MUTED = '#737373';
const TEXT_DIM = '#525252';

// ============================================================================
// MATCH CARD COMPONENT (Product Tease)
// ============================================================================
const MatchCardTease = () => (
  <div style={{
    background: BG_SURFACE,
    borderRadius: 16,
    padding: 20,
    border: `1px solid rgba(212, 168, 75, 0.2)`,
    maxWidth: 340,
    margin: '0 auto',
    boxShadow: `0 8px 32px rgba(0,0,0,0.3), 0 0 60px ${GOLD_GLOW}`,
    textAlign: 'left',
  }}>
    {/* Header */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
      <div style={{
        width: 48,
        height: 48,
        borderRadius: '50%',
        background: GOLD,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 16,
        fontWeight: 600,
        color: BG_PRIMARY,
      }}>
        KD
      </div>
      <div>
        <div style={{ fontSize: 16, fontWeight: 600, color: TEXT_PRIMARY }}>Kenny Dichter</div>
        <div style={{ fontSize: 13, color: TEXT_SECONDARY }}>Founder & Chairman</div>
        <div style={{ fontSize: 13, color: GOLD }}>REAL SLX</div>
      </div>
    </div>
    
    {/* Why You Match */}
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      borderRadius: 12,
      padding: 14,
      marginBottom: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 14 }}>🎯</span>
        <span style={{ fontSize: 10, fontWeight: 600, color: TEXT_MUTED, letterSpacing: '0.05em' }}>WHY YOU MATCH</span>
      </div>
      <p style={{ fontSize: 13, color: TEXT_SECONDARY, margin: 0, lineHeight: 1.5 }}>
        Kenny's track record building premium membership businesses and your interest in sports tech partnerships create natural synergy.
      </p>
    </div>
    
    {/* Talk About */}
    <div style={{
      background: GOLD_MUTED,
      borderRadius: 12,
      padding: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 14 }}>💬</span>
        <span style={{ fontSize: 10, fontWeight: 600, color: GOLD, letterSpacing: '0.05em' }}>TALK ABOUT</span>
      </div>
      <p style={{ fontSize: 14, color: GOLD_LIGHT, margin: 0, fontWeight: 500 }}>
        Building premium membership models in sports
      </p>
    </div>
  </div>
);

// ============================================================================
// IPHONE MOCKUP COMPONENT
// ============================================================================
const IPhoneMockup = ({ children, label }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
    <div style={{
      width: 280,
      height: 580,
      position: 'relative',
      filter: 'drop-shadow(0 25px 50px rgba(0,0,0,0.5))',
    }}>
      {/* iPhone Frame Background */}
      <svg 
        width="280" 
        height="580" 
        viewBox="0 0 280 580" 
        fill="none" 
        style={{ position: 'absolute', top: 0, left: 0, zIndex: 1 }}
      >
        {/* Outer body */}
        <rect x="0" y="0" width="280" height="580" rx="40" fill="#1a1a1a"/>
        
        {/* Side buttons - left */}
        <rect x="-2" y="100" width="3" height="24" rx="1" fill="#2a2a2a"/>
        <rect x="-2" y="140" width="3" height="40" rx="1" fill="#2a2a2a"/>
        <rect x="-2" y="186" width="3" height="40" rx="1" fill="#2a2a2a"/>
        
        {/* Side button - right */}
        <rect x="279" y="150" width="3" height="60" rx="1" fill="#2a2a2a"/>
        
        {/* Inner bezel */}
        <rect x="4" y="4" width="272" height="572" rx="36" fill="#0d0d0d"/>
        
        {/* Subtle top highlight */}
        <path d="M50 2 L230 2" stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeLinecap="round"/>
        
        {/* Subtle edge highlights */}
        <rect x="1" y="60" width="1" height="100" rx="0.5" fill="rgba(255,255,255,0.03)"/>
        <rect x="278" y="60" width="1" height="100" rx="0.5" fill="rgba(255,255,255,0.03)"/>
      </svg>
      
      {/* Screen content area */}
      <div style={{
        position: 'absolute',
        top: 8,
        left: 8,
        width: 264,
        height: 564,
        borderRadius: 32,
        overflow: 'hidden',
        background: BG_PRIMARY,
        zIndex: 2,
      }}>
        {children}
      </div>
      
      {/* Dynamic Island and home bar overlay - on top of content */}
      <svg 
        width="280" 
        height="580" 
        viewBox="0 0 280 580" 
        fill="none" 
        style={{ position: 'absolute', top: 0, left: 0, zIndex: 3, pointerEvents: 'none' }}
      >
        {/* Dynamic Island */}
        <rect x="90" y="18" width="100" height="28" rx="14" fill="#000000"/>
        
        {/* Camera lens */}
        <circle cx="158" cy="32" r="6" fill="#1a1a1a"/>
        <circle cx="158" cy="32" r="4" fill="#0a1a2a"/>
        <circle cx="156" cy="30" r="1" fill="rgba(255,255,255,0.1)"/>
        
        {/* Bottom home indicator */}
        <rect x="100" y="554" width="80" height="4" rx="2" fill="rgba(255,255,255,0.15)"/>
      </svg>
    </div>
    {label && (
      <p style={{ fontSize: 15, color: TEXT_PRIMARY, textAlign: 'center', maxWidth: 260, lineHeight: 1.5, fontWeight: 500 }}>{label}</p>
    )}
  </div>
);

// ============================================================================
// INTERVIEW SCREEN MOCKUP
// ============================================================================
const InterviewScreenMockup = () => (
  <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: BG_PRIMARY, textAlign: 'left' }}>
    {/* iOS Status Bar */}
    <div style={{ 
      padding: '14px 20px 8px 20px', 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      paddingTop: 50, // Account for Dynamic Island
    }}>
      <span style={{ fontSize: 9, fontWeight: 600, color: TEXT_PRIMARY }}>9:41</span>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        {/* Signal bars */}
        <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
          <rect x="0" y="6" width="2.5" height="4" rx="0.5" fill={TEXT_PRIMARY}/>
          <rect x="3.5" y="4" width="2.5" height="6" rx="0.5" fill={TEXT_PRIMARY}/>
          <rect x="7" y="2" width="2.5" height="8" rx="0.5" fill={TEXT_PRIMARY}/>
          <rect x="10.5" y="0" width="2.5" height="10" rx="0.5" fill={TEXT_PRIMARY}/>
        </svg>
        {/* WiFi */}
        <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
          <path d="M6 2C8.5 2 10.5 3.5 11.5 5L10 6.5C9.2 5.3 7.7 4.5 6 4.5C4.3 4.5 2.8 5.3 2 6.5L0.5 5C1.5 3.5 3.5 2 6 2Z" fill={TEXT_PRIMARY}/>
          <path d="M6 5.5C7.4 5.5 8.6 6.3 9.2 7.2L7.8 8.6C7.4 8 6.7 7.5 6 7.5C5.3 7.5 4.6 8 4.2 8.6L2.8 7.2C3.4 6.3 4.6 5.5 6 5.5Z" fill={TEXT_PRIMARY}/>
          <circle cx="6" cy="9.5" r="1" fill={TEXT_PRIMARY}/>
        </svg>
        {/* Battery */}
        <svg width="18" height="9" viewBox="0 0 18 9" fill="none">
          <rect x="0.5" y="0.5" width="14" height="8" rx="2" stroke={TEXT_PRIMARY} strokeWidth="1"/>
          <rect x="2" y="2" width="10" height="5" rx="1" fill={TEXT_PRIMARY}/>
          <rect x="15" y="2.5" width="2" height="4" rx="0.5" fill={TEXT_PRIMARY}/>
        </svg>
      </div>
    </div>
    
    {/* App Header */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px 12px 16px' }}>
      <div style={{
        width: 28,
        height: 28,
        borderRadius: 6,
        background: GOLD,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 10,
        fontWeight: 700,
        color: BG_PRIMARY,
      }}>33</div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: TEXT_PRIMARY }}>M33T Concierge</div>
        <div style={{ fontSize: 9, color: TEXT_MUTED }}>Finding your connections</div>
      </div>
    </div>
    
    {/* Messages */}
    <div style={{ flex: 1, padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 6, overflow: 'hidden' }}>
      {/* Bot message */}
      <div style={{
        background: BG_ELEVATED,
        borderRadius: 12,
        borderTopLeftRadius: 4,
        padding: 10,
        maxWidth: '85%',
        fontSize: 10,
        color: TEXT_PRIMARY,
        lineHeight: 1.45,
      }}>
        I'll ask a few questions to connect you with the right people. Takes about 3 minutes.
      </div>
      
      {/* Bot message */}
      <div style={{
        background: BG_ELEVATED,
        borderRadius: 12,
        borderTopLeftRadius: 4,
        padding: 10,
        maxWidth: '85%',
        fontSize: 10,
        color: TEXT_PRIMARY,
        lineHeight: 1.45,
      }}>
        What's your current role and what brings you to the event?
      </div>
      
      {/* User message */}
      <div style={{
        background: GOLD,
        borderRadius: 12,
        borderTopRightRadius: 4,
        padding: 10,
        maxWidth: '75%',
        alignSelf: 'flex-end',
        fontSize: 10,
        color: BG_PRIMARY,
        fontWeight: 500,
        lineHeight: 1.45,
      }}>
        Founder - looking for investors
      </div>
      
      {/* Bot message */}
      <div style={{
        background: BG_ELEVATED,
        borderRadius: 12,
        borderTopLeftRadius: 4,
        padding: 10,
        maxWidth: '85%',
        fontSize: 10,
        color: TEXT_PRIMARY,
        lineHeight: 1.45,
      }}>
        If you could make one ideal connection at this event, who would that be?
      </div>
      
      {/* User message */}
      <div style={{
        background: GOLD,
        borderRadius: 12,
        borderTopRightRadius: 4,
        padding: 10,
        maxWidth: '75%',
        alignSelf: 'flex-end',
        fontSize: 10,
        color: BG_PRIMARY,
        fontWeight: 500,
        lineHeight: 1.45,
      }}>
        Series A investors in SaaS
      </div>
      
      {/* Bot message */}
      <div style={{
        background: BG_ELEVATED,
        borderRadius: 12,
        borderTopLeftRadius: 4,
        padding: 10,
        maxWidth: '85%',
        fontSize: 10,
        color: TEXT_PRIMARY,
        lineHeight: 1.45,
      }}>
        What's something you could help others with? What do you bring to the table?
      </div>
      
      {/* Typing indicator */}
      <div style={{
        background: BG_ELEVATED,
        borderRadius: 12,
        borderTopLeftRadius: 4,
        padding: 10,
        width: 44,
        display: 'flex',
        gap: 4,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ width: 4, height: 4, borderRadius: '50%', background: TEXT_MUTED, animation: 'pulse 1s infinite' }} />
        <div style={{ width: 4, height: 4, borderRadius: '50%', background: TEXT_MUTED, animation: 'pulse 1s infinite 0.2s' }} />
        <div style={{ width: 4, height: 4, borderRadius: '50%', background: TEXT_MUTED, animation: 'pulse 1s infinite 0.4s' }} />
      </div>
    </div>
    
    {/* Input area hint */}
    <div style={{ padding: '12px 12px 20px 12px' }}>
      <div style={{
        background: BG_ELEVATED,
        borderRadius: 20,
        padding: '10px 14px',
        fontSize: 9,
        color: TEXT_DIM,
      }}>
        Type your response...
      </div>
    </div>
  </div>
);

// ============================================================================
// MATCHES SCREEN MOCKUP
// ============================================================================
const MatchesScreenMockup = () => (
  <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: BG_PRIMARY, textAlign: 'left' }}>
    {/* iOS Status Bar */}
    <div style={{ 
      padding: '14px 20px 8px 20px', 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      paddingTop: 50, // Account for Dynamic Island
    }}>
      <span style={{ fontSize: 9, fontWeight: 600, color: TEXT_PRIMARY }}>9:41</span>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        {/* Signal bars */}
        <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
          <rect x="0" y="6" width="2.5" height="4" rx="0.5" fill={TEXT_PRIMARY}/>
          <rect x="3.5" y="4" width="2.5" height="6" rx="0.5" fill={TEXT_PRIMARY}/>
          <rect x="7" y="2" width="2.5" height="8" rx="0.5" fill={TEXT_PRIMARY}/>
          <rect x="10.5" y="0" width="2.5" height="10" rx="0.5" fill={TEXT_PRIMARY}/>
        </svg>
        {/* WiFi */}
        <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
          <path d="M6 2C8.5 2 10.5 3.5 11.5 5L10 6.5C9.2 5.3 7.7 4.5 6 4.5C4.3 4.5 2.8 5.3 2 6.5L0.5 5C1.5 3.5 3.5 2 6 2Z" fill={TEXT_PRIMARY}/>
          <path d="M6 5.5C7.4 5.5 8.6 6.3 9.2 7.2L7.8 8.6C7.4 8 6.7 7.5 6 7.5C5.3 7.5 4.6 8 4.2 8.6L2.8 7.2C3.4 6.3 4.6 5.5 6 5.5Z" fill={TEXT_PRIMARY}/>
          <circle cx="6" cy="9.5" r="1" fill={TEXT_PRIMARY}/>
        </svg>
        {/* Battery */}
        <svg width="18" height="9" viewBox="0 0 18 9" fill="none">
          <rect x="0.5" y="0.5" width="14" height="8" rx="2" stroke={TEXT_PRIMARY} strokeWidth="1"/>
          <rect x="2" y="2" width="10" height="5" rx="1" fill={TEXT_PRIMARY}/>
          <rect x="15" y="2.5" width="2" height="4" rx="0.5" fill={TEXT_PRIMARY}/>
        </svg>
      </div>
    </div>
    
    {/* Header */}
    <div style={{ padding: '4px 16px 12px 16px' }}>
      <div style={{ fontSize: 9, fontWeight: 600, color: GOLD, letterSpacing: '0.08em', marginBottom: 4 }}>YOUR MATCHES</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: TEXT_PRIMARY, marginBottom: 2 }}>We found 5 ideal connections</div>
      <div style={{ fontSize: 9, color: TEXT_MUTED }}>Tap any card to see the full profile</div>
    </div>
    
    {/* Match cards */}
    <div style={{ flex: 1, padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden' }}>
      {[
        { initials: 'KD', name: 'Kenny Dichter', role: 'Founder & Chairman', company: 'REAL SLX', showMatch: true },
        { initials: 'TB', name: 'Travis Beckum', role: 'Business Development', company: 'Badger Sports', showMatch: false },
        { initials: 'KN', name: 'Keaton Nankivil', role: 'Senior Principal', company: 'Alumni Ventures', showMatch: false },
        { initials: 'MR', name: 'Maya Rodriguez', role: 'VP Partnerships', company: 'SportsTech Co', showMatch: false },
      ].map((match, i) => (
        <div key={i} style={{
          background: BG_SURFACE,
          borderRadius: 10,
          padding: 10,
          border: `1px solid ${i === 0 ? 'rgba(212, 168, 75, 0.3)' : 'rgba(255,255,255,0.04)'}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: i === 0 ? GOLD : BG_ELEVATED,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              fontWeight: 600,
              color: i === 0 ? BG_PRIMARY : TEXT_MUTED,
            }}>
              {match.initials}
            </div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: TEXT_PRIMARY }}>{match.name}</div>
              <div style={{ fontSize: 9, color: TEXT_MUTED }}>{match.role}</div>
              <div style={{ fontSize: 9, color: GOLD }}>{match.company}</div>
            </div>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={TEXT_DIM} strokeWidth="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </div>
          {match.showMatch && (
            <div style={{
              marginTop: 8,
              padding: 8,
              background: 'rgba(255,255,255,0.02)',
              borderRadius: 6,
              fontSize: 9,
              color: TEXT_SECONDARY,
              lineHeight: 1.4,
              textAlign: 'left',
            }}>
              <span style={{ color: GOLD, fontWeight: 500 }}>Why you match:</span> Premium membership expertise aligns with your goals
            </div>
          )}
        </div>
      ))}
      
      {/* See more */}
      <div style={{ paddingTop: 2, textAlign: 'left' }}>
        <span style={{ fontSize: 9, color: TEXT_MUTED }}>+1 more connection</span>
      </div>
    </div>
    
    {/* CTA */}
    <div style={{ padding: '12px 12px 20px 12px' }}>
      <div style={{
        background: GOLD,
        borderRadius: 10,
        padding: 12,
        textAlign: 'center',
        fontSize: 11,
        fontWeight: 600,
        color: BG_PRIMARY,
      }}>
        I'm ready for the event
      </div>
    </div>
  </div>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function M33TPlatformDeck() {
  const [currentSection, setCurrentSection] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const containerRef = useRef(null);
  const sectionRefs = useRef([]);

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      const progress = scrollTop / (scrollHeight - clientHeight);
      setScrollProgress(Math.min(1, Math.max(0, progress)));
      
      const sectionHeight = clientHeight;
      const newSection = Math.min(5, Math.floor((scrollTop + sectionHeight * 0.5) / sectionHeight));
      setCurrentSection(newSection);
    };
    
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const sections = [
    { id: 'problem', label: 'The Problem' },
    { id: 'missed', label: 'What If' },
    { id: 'intro', label: 'M33T' },
    { id: 'how', label: 'How It Works' },
    { id: 'result', label: 'The Result' },
  ];

  return (
    <div 
      ref={containerRef}
      style={{ 
        height: '100vh', 
        overflowY: 'auto', 
        background: BG_PRIMARY,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* Progress bar */}
      <div style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        height: 3, 
        background: 'rgba(255,255,255,0.1)', 
        zIndex: 100 
      }}>
        <div style={{ 
          height: '100%', 
          background: GOLD, 
          width: `${scrollProgress * 100}%`, 
          transition: 'width 0.1s ease-out' 
        }} />
      </div>

      {/* Section indicator dots */}
      <div style={{
        position: 'fixed',
        right: 24,
        top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        zIndex: 100,
      }}>
        {sections.map((section, i) => (
          <div
            key={section.id}
            onClick={() => {
              sectionRefs.current[i]?.scrollIntoView({ behavior: 'smooth' });
            }}
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: currentSection === i ? GOLD : 'rgba(255,255,255,0.2)',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              transform: currentSection === i ? 'scale(1.25)' : 'scale(1)',
            }}
            title={section.label}
          />
        ))}
      </div>

      {/* ================================================================== */}
      {/* SECTION 1: THE PROBLEM (Expectation vs Reality) */}
      {/* ================================================================== */}
      <section 
        ref={el => sectionRefs.current[0] = el}
        style={{ 
          minHeight: '100vh', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          padding: '64px 24px',
          position: 'relative',
          textAlign: 'center',
        }}
      >
        <div style={{
          position: 'absolute',
          top: '30%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 400,
          height: 400,
          background: `radial-gradient(circle, ${GOLD}10 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: 500, position: 'relative', zIndex: 10 }}>
          <p style={{ 
            color: TEXT_DIM, 
            fontSize: 12, 
            letterSpacing: '0.2em', 
            textTransform: 'uppercase', 
            marginBottom: 24 
          }}>
            The networking problem
          </p>
          
          <h1 style={{ 
            fontFamily: 'Georgia, serif',
            fontSize: 36, 
            fontWeight: 400, 
            color: TEXT_PRIMARY, 
            marginBottom: 40,
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
          }}>
            Every event, the <span style={{ color: GOLD }}>same story</span>
          </h1>

          {/* Expectation vs Reality tiles */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: 16,
            marginBottom: 40,
          }}>
            {/* Expectation */}
            <div style={{ 
              background: BG_SURFACE, 
              borderRadius: 16, 
              padding: 24, 
              border: `1px solid ${GOLD}30`,
              textAlign: 'left',
            }}>
              <p style={{ 
                color: GOLD, 
                fontSize: 10, 
                letterSpacing: '0.15em', 
                textTransform: 'uppercase', 
                marginBottom: 16,
                fontWeight: 600,
              }}>
                Expectation
              </p>
              <p style={{ 
                fontFamily: 'Georgia, serif',
                color: TEXT_PRIMARY, 
                fontSize: 20, 
                lineHeight: 1.4,
                margin: 0,
              }}>
                Make 3-4 meaningful connections that could actually go somewhere
              </p>
            </div>

            {/* Reality */}
            <div style={{ 
              background: BG_SURFACE, 
              borderRadius: 16, 
              padding: 24, 
              border: '1px solid rgba(255,255,255,0.06)',
              textAlign: 'left',
            }}>
              <p style={{ 
                color: TEXT_MUTED, 
                fontSize: 10, 
                letterSpacing: '0.15em', 
                textTransform: 'uppercase', 
                marginBottom: 16,
                fontWeight: 600,
              }}>
                Reality
              </p>
              <p style={{ 
                fontFamily: 'Georgia, serif',
                color: TEXT_SECONDARY, 
                fontSize: 20, 
                lineHeight: 1.4,
                margin: 0,
              }}>
                Six random conversations that probably won't go anywhere
              </p>
            </div>
          </div>

          <p style={{ 
            color: TEXT_MUTED, 
            fontSize: 16, 
            lineHeight: 1.6,
          }}>
            The right people were probably in the room.<br/>
            <span style={{ color: TEXT_PRIMARY }}>You just had no way to find each other.</span>
          </p>
        </div>

        {/* Scroll hint */}
        <div style={{ 
          position: 'absolute', 
          bottom: 32, 
          left: '50%', 
          transform: 'translateX(-50%)',
          textAlign: 'center',
        }}>
          <p style={{ color: TEXT_DIM, fontSize: 11, letterSpacing: '0.1em', marginBottom: 8 }}>Scroll</p>
          <div style={{ 
            width: 20, 
            height: 32, 
            borderRadius: 10, 
            border: `2px solid ${TEXT_DIM}`, 
            margin: '0 auto',
            position: 'relative',
          }}>
            <div style={{ 
              width: 3, 
              height: 6, 
              borderRadius: 2, 
              background: GOLD, 
              position: 'absolute', 
              top: 6, 
              left: '50%', 
              transform: 'translateX(-50%)',
              animation: 'scrollBounce 2s ease-in-out infinite',
            }} />
          </div>
        </div>

        <style>{`
          @keyframes scrollBounce {
            0%, 100% { transform: translateX(-50%) translateY(0); opacity: 1; }
            50% { transform: translateX(-50%) translateY(8px); opacity: 0.5; }
          }
          @keyframes pulse {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 1; }
          }
        `}</style>
      </section>

      {/* ================================================================== */}
      {/* SECTION 2: WHAT IF + PRODUCT TEASE */}
      {/* ================================================================== */}
      <section 
        ref={el => sectionRefs.current[1] = el}
        style={{ 
          minHeight: '100vh', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          padding: '64px 24px',
          position: 'relative',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: 400, position: 'relative', zIndex: 10 }}>
          {/* First "What if" */}
          <p style={{ 
            color: TEXT_PRIMARY, 
            fontSize: 22, 
            lineHeight: 1.5, 
            marginBottom: 40,
            fontWeight: 500,
          }}>
            What if you knew <span style={{ color: GOLD }}>exactly who to meet</span> before you walked in?
          </p>

          {/* Match Card Tease */}
          <div style={{ marginBottom: 40 }}>
            <MatchCardTease />
          </div>

          {/* Second "What if" */}
          <p style={{ 
            color: TEXT_PRIMARY, 
            fontSize: 22, 
            lineHeight: 1.5,
            fontWeight: 500,
          }}>
            And what if <span style={{ color: GOLD }}>they</span> knew to find <span style={{ color: GOLD }}>you</span> too?
          </p>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 3: INTRODUCING M33T (Brand Moment) */}
      {/* ================================================================== */}
      <section 
        ref={el => sectionRefs.current[2] = el}
        style={{ 
          minHeight: '100vh', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          padding: '64px 24px',
          position: 'relative',
          textAlign: 'center',
        }}
      >
        {/* Gold glow behind */}
        <div style={{
          position: 'absolute',
          top: '40%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 600,
          height: 600,
          background: `radial-gradient(circle, ${GOLD}12 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: 700, position: 'relative', zIndex: 10 }}>
          <p style={{ 
            color: GOLD, 
            fontSize: 12, 
            letterSpacing: '0.2em', 
            textTransform: 'uppercase', 
            marginBottom: 16 
          }}>
            Introducing
          </p>
          
          <h2 style={{ 
            fontFamily: 'Georgia, serif',
            fontSize: 64, 
            fontWeight: 400, 
            color: TEXT_PRIMARY, 
            marginBottom: 8,
            lineHeight: 1,
          }}>
            M<span style={{ color: GOLD }}>33</span>T
          </h2>
          
          <p style={{ 
            color: TEXT_MUTED, 
            fontSize: 14, 
            letterSpacing: '0.1em', 
            marginBottom: 16,
          }}>
            by 33 Strategies
          </p>
          
          <p style={{ 
            color: TEXT_SECONDARY, 
            fontSize: 18, 
            marginBottom: 48,
          }}>
            The right people. The right context. <span style={{ color: TEXT_PRIMARY, fontWeight: 500 }}>Before you arrive.</span>
          </p>

          {/* iPhone Mockups */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: 40,
            flexWrap: 'wrap',
          }}>
            <IPhoneMockup label="AI learns about you and what you're trying to accomplish right now">
              <InterviewScreenMockup />
            </IPhoneMockup>
            <IPhoneMockup label="Then matches you with highly relevant connections before the event">
              <MatchesScreenMockup />
            </IPhoneMockup>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 4: HOW IT WORKS */}
      {/* ================================================================== */}
      <section 
        ref={el => sectionRefs.current[3] = el}
        style={{ 
          minHeight: '100vh', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          padding: '64px 24px',
          position: 'relative',
        }}
      >
        <div style={{ maxWidth: 400, width: '100%', position: 'relative', zIndex: 10 }}>
          <p style={{ 
            color: GOLD, 
            fontSize: 12, 
            letterSpacing: '0.2em', 
            textTransform: 'uppercase', 
            marginBottom: 32,
            textAlign: 'center',
          }}>
            How it works
          </p>

          {/* Before the Event */}
          <div style={{ marginBottom: 48 }}>
            <p style={{ 
              color: TEXT_DIM, 
              fontSize: 11, 
              letterSpacing: '0.15em', 
              textTransform: 'uppercase', 
              marginBottom: 20,
              textAlign: 'center',
            }}>
              Before the event
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                'Tell us what you are looking for',
                'AI builds your profile and finds matches',
                'See who to meet and why it matters',
              ].map((step, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                  <div style={{ 
                    width: 32, 
                    height: 32, 
                    borderRadius: '50%', 
                    background: BG_SURFACE,
                    border: `1px solid ${GOLD}40`,
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: GOLD,
                    fontSize: 13,
                    fontWeight: 600,
                    flexShrink: 0,
                  }}>
                    {i + 1}
                  </div>
                  <p style={{ color: TEXT_SECONDARY, fontSize: 15, paddingTop: 6 }}>{step}</p>
                </div>
              ))}
            </div>
          </div>

          {/* At the Event */}
          <div>
            <p style={{ 
              color: TEXT_DIM, 
              fontSize: 11, 
              letterSpacing: '0.15em', 
              textTransform: 'uppercase', 
              marginBottom: 20,
              textAlign: 'center',
            }}>
              At the event
            </p>
            
            {/* Mock notification card */}
            <div style={{ 
              background: BG_SURFACE, 
              borderRadius: 16, 
              padding: 20,
              border: `1px solid ${GOLD}30`,
              marginBottom: 20,
            }}>
              <p style={{ 
                color: TEXT_DIM, 
                fontSize: 10, 
                letterSpacing: '0.1em', 
                textTransform: 'uppercase', 
                marginBottom: 8,
              }}>
                Next Connection
              </p>
              <p style={{ 
                color: TEXT_PRIMARY, 
                fontSize: 18, 
                fontWeight: 500, 
                marginBottom: 4,
              }}>
                Sarah Chen
              </p>
              <p style={{ 
                color: TEXT_MUTED, 
                fontSize: 13, 
                marginBottom: 12,
              }}>
                Partner @ Sequoia Capital
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: GOLD }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 6v6l4 2"/>
                </svg>
                <span style={{ fontSize: 13, fontWeight: 500 }}>2:30 PM - Lounge Area</span>
              </div>
            </div>
            
            <p style={{ 
              color: TEXT_MUTED, 
              fontSize: 13, 
              textAlign: 'center',
              lineHeight: 1.6,
            }}>
              No wandering. No awkward approaches.<br/>
              Just meaningful conversations.
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 5: THE RESULT + CTA */}
      {/* ================================================================== */}
      <section 
        ref={el => sectionRefs.current[4] = el}
        style={{ 
          minHeight: '100vh', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          padding: '64px 24px',
          position: 'relative',
          textAlign: 'center',
        }}
      >
        <div style={{
          position: 'absolute',
          top: '40%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 500,
          height: 500,
          background: `radial-gradient(circle, ${GOLD}12 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: 400, position: 'relative', zIndex: 10 }}>
          <p style={{ 
            color: TEXT_DIM, 
            fontSize: 12, 
            letterSpacing: '0.15em', 
            textTransform: 'uppercase', 
            marginBottom: 24 
          }}>
            The result
          </p>
          
          <h2 style={{ 
            fontFamily: 'Georgia, serif',
            fontSize: 32, 
            fontWeight: 400, 
            color: TEXT_PRIMARY, 
            marginBottom: 8,
            lineHeight: 1.3,
          }}>
            More <span style={{ color: GOLD }}>relevant</span> connections.
          </h2>
          <h2 style={{ 
            fontFamily: 'Georgia, serif',
            fontSize: 32, 
            fontWeight: 400, 
            color: TEXT_PRIMARY, 
            marginBottom: 32,
            lineHeight: 1.3,
          }}>
            More <span style={{ color: GOLD }}>meaningful</span> conversations.
          </h2>
          
          <p style={{ 
            color: TEXT_SECONDARY, 
            fontSize: 16, 
            marginBottom: 48,
            lineHeight: 1.6,
          }}>
            Every introduction is intentional.<br/>
            Every conversation has context.
          </p>
          
          <div style={{ 
            width: 48, 
            height: 3, 
            background: GOLD, 
            margin: '0 auto 48px',
            borderRadius: 2,
          }} />

          <h3 style={{ 
            fontFamily: 'Georgia, serif',
            fontSize: 28, 
            fontWeight: 400, 
            color: TEXT_PRIMARY, 
            marginBottom: 32,
            lineHeight: 1.4,
          }}>
            Stop leaving<br/>
            relationships<br/>
            <span style={{ color: GOLD }}>on the table.</span>
          </h3>
          
          <p style={{ 
            color: TEXT_SECONDARY, 
            fontSize: 20, 
            marginBottom: 8,
          }}>
            M<span style={{ color: GOLD }}>33</span>T
          </p>
          
          <p style={{ 
            color: TEXT_MUTED, 
            fontSize: 13, 
            letterSpacing: '0.1em',
            marginBottom: 40,
          }}>
            by 33 Strategies
          </p>

          <button style={{
            padding: '16px 40px',
            borderRadius: 12,
            border: 'none',
            background: GOLD,
            color: BG_PRIMARY,
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: `0 8px 32px ${GOLD_GLOW}`,
          }}>
            Bring M33T to your event
          </button>
        </div>
      </section>
    </div>
  );
}
