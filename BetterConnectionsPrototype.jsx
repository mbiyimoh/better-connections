import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, Plus, User, Mail, MapPin, Calendar,
  ChevronRight, X, Pause, Play, ArrowRight, Sparkles,
  MessageSquare, Send, Pin, Copy, RefreshCw
} from 'lucide-react';

// ============================================================================
// DESIGN TOKENS (used for inline styles)
// ============================================================================

const colors = {
  bg: {
    primary: '#0D0D0F',
    secondary: '#1A1A1F',
    tertiary: '#252529',
    glass: 'rgba(26, 26, 31, 0.85)',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#A0A0A8',
    tertiary: '#606068',
  },
  gold: {
    primary: '#C9A227',
    light: '#E5C766',
    subtle: 'rgba(201, 162, 39, 0.15)',
  },
  category: {
    relationship: '#3B82F6',
    opportunity: '#22C55E',
    expertise: '#A855F7',
    interest: '#F59E0B',
  },
  border: 'rgba(255, 255, 255, 0.08)',
};

// ============================================================================
// SHARED COMPONENTS
// ============================================================================

const GlassCard = ({ children, style = {}, hover = false, onClick, onMouseEnter, onMouseLeave }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div
      onClick={onClick}
      onMouseEnter={(e) => { setIsHovered(true); onMouseEnter?.(e); }}
      onMouseLeave={(e) => { setIsHovered(false); onMouseLeave?.(e); }}
      style={{
        background: isHovered && hover ? colors.bg.tertiary : colors.bg.glass,
        backdropFilter: 'blur(20px)',
        borderRadius: 12,
        border: `1px solid ${isHovered && hover ? 'rgba(255,255,255,0.12)' : colors.border}`,
        transition: 'all 0.2s ease',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      {children}
    </div>
  );
};

const Badge = ({ children, category }) => {
  const categoryColors = {
    relationship: { bg: 'rgba(59, 130, 246, 0.2)', text: '#60A5FA', border: 'rgba(59, 130, 246, 0.3)' },
    opportunity: { bg: 'rgba(34, 197, 94, 0.2)', text: '#4ADE80', border: 'rgba(34, 197, 94, 0.3)' },
    expertise: { bg: 'rgba(168, 85, 247, 0.2)', text: '#C084FC', border: 'rgba(168, 85, 247, 0.3)' },
    interest: { bg: 'rgba(245, 158, 11, 0.2)', text: '#FBBF24', border: 'rgba(245, 158, 11, 0.3)' },
  };
  
  const c = categoryColors[category] || { bg: 'rgba(255,255,255,0.1)', text: '#fff', border: 'rgba(255,255,255,0.2)' };
  
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '6px 12px',
      borderRadius: 20,
      fontSize: 13,
      fontWeight: 500,
      background: c.bg,
      color: c.text,
      border: `1px solid ${c.border}`,
    }}>
      <span style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: c.text,
      }} />
      {children}
    </span>
  );
};

const Button = ({ children, variant = 'primary', size = 'md', onClick, disabled, style = {} }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const variants = {
    primary: {
      background: isHovered ? colors.gold.light : colors.gold.primary,
      color: '#000',
      fontWeight: 600,
      boxShadow: '0 0 20px rgba(201, 162, 39, 0.3)',
    },
    secondary: {
      background: isHovered ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.1)',
      color: '#fff',
      border: '1px solid rgba(255,255,255,0.1)',
    },
    ghost: {
      background: isHovered ? 'rgba(255,255,255,0.05)' : 'transparent',
      color: isHovered ? '#fff' : 'rgba(255,255,255,0.7)',
    },
  };
  
  const sizes = {
    sm: { padding: '6px 12px', fontSize: 13 },
    md: { padding: '8px 16px', fontSize: 14 },
    lg: { padding: '12px 24px', fontSize: 15 },
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderRadius: 8,
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.2s ease',
        fontWeight: 500,
        ...variants[variant],
        ...sizes[size],
        ...style,
      }}
    >
      {children}
    </button>
  );
};

// ============================================================================
// EXPERIENCE 1: GAMIFIED ENRICHMENT
// ============================================================================

const EnrichmentBubble = ({ text, category, index }) => (
  <motion.div
    initial={{ scale: 0.6, opacity: 0, y: 10 }}
    animate={{ scale: 1, opacity: 1, y: 0 }}
    exit={{ scale: 0.8, opacity: 0 }}
    transition={{
      type: 'spring',
      stiffness: 400,
      damping: 25,
      delay: index * 0.08,
    }}
  >
    <Badge category={category}>{text}</Badge>
  </motion.div>
);

const CircularTimer = ({ duration, isPlaying, onComplete, remainingTime, setRemainingTime }) => {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const progress = remainingTime / duration;
  const strokeDashoffset = circumference * (1 - progress);
  
  useEffect(() => {
    if (!isPlaying || remainingTime <= 0) return;
    
    const interval = setInterval(() => {
      setRemainingTime(prev => {
        if (prev <= 1) {
          onComplete?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isPlaying, remainingTime, onComplete, setRemainingTime]);
  
  const isWarning = remainingTime <= 10;
  const strokeColor = isWarning ? '#EF4444' : colors.gold.primary;
  
  return (
    <div style={{ position: 'relative', width: 128, height: 128, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={128} height={128} style={{ transform: 'rotate(-90deg)' }} viewBox="0 0 120 120">
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="8"
        />
        <motion.circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.5, ease: 'linear' }}
          style={{
            filter: isWarning ? 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.5))' : 'drop-shadow(0 0 8px rgba(201, 162, 39, 0.3))',
          }}
        />
      </svg>
      <motion.div
        style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        animate={isWarning ? { scale: [1, 1.05, 1] } : {}}
        transition={{ duration: 1, repeat: isWarning ? Infinity : 0 }}
      >
        <span style={{
          fontSize: 32,
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          color: isWarning ? '#F87171' : '#fff',
        }}>
          :{remainingTime.toString().padStart(2, '0')}
        </span>
      </motion.div>
    </div>
  );
};

const GamifiedEnrichment = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [remainingTime, setRemainingTime] = useState(30);
  const [bubbles, setBubbles] = useState([]);
  const [sessionComplete, setSessionComplete] = useState(false);
  
  const contact = {
    name: 'Marcus Chen',
    email: 'marcus@example.com',
  };
  
  const simulateBubble = useCallback(() => {
    const sampleBubbles = [
      { text: 'Potential LP', category: 'opportunity' },
      { text: 'Met at Google program', category: 'relationship' },
      { text: 'Connected to Sequoia', category: 'opportunity' },
      { text: 'Board game enthusiast', category: 'interest' },
      { text: 'SaaS expertise', category: 'expertise' },
      { text: 'Based in SF', category: 'relationship' },
      { text: 'Angel investor', category: 'opportunity' },
      { text: 'Sold company in 2021', category: 'expertise' },
    ];
    
    if (bubbles.length < sampleBubbles.length) {
      setBubbles(prev => [...prev, sampleBubbles[prev.length]]);
    }
  }, [bubbles.length]);
  
  useEffect(() => {
    if (isRecording && isPlaying) {
      const interval = setInterval(simulateBubble, 1500);
      return () => clearInterval(interval);
    }
  }, [isRecording, isPlaying, simulateBubble]);
  
  const handleStart = () => {
    setIsRecording(true);
    setIsPlaying(true);
  };
  
  const handleAddTime = () => {
    setRemainingTime(prev => Math.min(prev + 30, 60));
  };
  
  const handleComplete = () => {
    setIsPlaying(false);
    setIsRecording(false);
    setSessionComplete(true);
  };
  
  if (sessionComplete) {
    return (
      <GlassCard style={{ padding: 32, maxWidth: 500, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'rgba(34, 197, 94, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <Sparkles size={32} color="#4ADE80" />
          </motion.div>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: '#fff', marginBottom: 4 }}>
            {contact.name} enriched
          </h2>
          <p style={{ color: colors.text.secondary, fontSize: 14 }}>
            We captured {bubbles.length} insights
          </p>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          {['relationship', 'opportunity', 'interest', 'expertise'].map(cat => {
            const catBubbles = bubbles.filter(b => b.category === cat);
            return (
              <div key={cat}>
                <h3 style={{ fontSize: 11, fontWeight: 600, color: colors.text.tertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                  {cat}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {catBubbles.length > 0 ? (
                    catBubbles.map((b, i) => (
                      <div key={i} style={{ fontSize: 13, color: colors.text.secondary }}>• {b.text}</div>
                    ))
                  ) : (
                    <div style={{ fontSize: 13, color: colors.text.tertiary, fontStyle: 'italic' }}>(none captured)</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 16, marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <MessageSquare size={20} color={colors.gold.primary} style={{ marginTop: 2, flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 14, color: colors.text.secondary, marginBottom: 12 }}>
                What does Marcus do professionally? Any specific expertise areas?
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button size="sm" variant="secondary">Answer quickly</Button>
                <Button size="sm" variant="ghost">Skip</Button>
              </div>
            </div>
          </div>
        </div>
        
        <Button 
          size="lg" 
          style={{ width: '100%' }}
          onClick={() => {
            setBubbles([]);
            setRemainingTime(30);
            setSessionComplete(false);
          }}
        >
          <ArrowRight size={16} />
          Next Contact
        </Button>
      </GlassCard>
    );
  }
  
  return (
    <div style={{ maxWidth: 500, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Contact Info */}
      <GlassCard style={{ padding: 24, textAlign: 'center' }}>
        <div style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(201,162,39,0.3), rgba(168,85,247,0.3))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
        }}>
          <User size={40} color="rgba(255,255,255,0.6)" />
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 600, color: '#fff', marginBottom: 4 }}>{contact.name}</h2>
        <p style={{ color: colors.text.tertiary, fontSize: 14 }}>{contact.email}</p>
      </GlassCard>
      
      {/* Timer & Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <CircularTimer
          duration={30}
          isPlaying={isPlaying}
          remainingTime={remainingTime}
          setRemainingTime={setRemainingTime}
          onComplete={handleComplete}
        />
        
        <div style={{ display: 'flex', gap: 12 }}>
          <Button variant="secondary" size="sm" onClick={handleAddTime} disabled={!isPlaying}>
            <Plus size={16} />
            +30 sec
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setIsPlaying(!isPlaying)} disabled={!isRecording}>
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            {isPlaying ? 'Pause' : 'Resume'}
          </Button>
        </div>
      </div>
      
      {/* Bubble Canvas */}
      <GlassCard style={{ padding: 24, minHeight: 180 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
          <AnimatePresence mode="popLayout">
            {bubbles.map((bubble, i) => (
              <EnrichmentBubble
                key={`${bubble.text}-${i}`}
                text={bubble.text}
                category={bubble.category}
                index={i}
              />
            ))}
          </AnimatePresence>
          
          {bubbles.length === 0 && !isRecording && (
            <p style={{ color: colors.text.tertiary, textAlign: 'center', padding: '32px 0' }}>
              Start recording to see insights appear here
            </p>
          )}
        </div>
      </GlassCard>
      
      {/* Microphone Button */}
      {!isRecording ? (
        <Button size="lg" style={{ width: '100%' }} onClick={handleStart}>
          <Mic size={20} />
          Start Session
        </Button>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: colors.text.secondary }}>
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{ width: 12, height: 12, borderRadius: '50%', background: '#EF4444' }}
          />
          Listening...
        </div>
      )}
    </div>
  );
};

// ============================================================================
// EXPERIENCE 2: CONTACT CARD
// ============================================================================

const ContactCard = ({ contact, isExpanded, onToggle, onDraft }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <motion.div layout>
      <GlassCard
        hover
        onClick={onToggle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ overflow: 'hidden' }}
      >
        <div style={{ padding: 16 }}>
          {/* Header */}
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(59,130,246,0.3), rgba(168,85,247,0.3))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <User size={24} color="rgba(255,255,255,0.6)" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{ fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {contact.name}
              </h3>
              <p style={{ fontSize: 14, color: colors.text.tertiary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {contact.title}
              </p>
            </div>
            <motion.div
              animate={{ rotate: isExpanded ? 90 : 0 }}
              style={{ color: colors.text.tertiary }}
            >
              <ChevronRight size={20} />
            </motion.div>
          </div>
          
          {/* Why Now Section */}
          <div style={{
            marginTop: 16,
            padding: 12,
            borderRadius: 8,
            background: colors.gold.subtle,
            border: `1px solid rgba(201, 162, 39, 0.25)`,
          }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: colors.gold.primary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
              Why Now
            </p>
            <p style={{ fontSize: 14, color: colors.text.secondary, lineHeight: 1.5 }}>
              {contact.whyNow}
            </p>
          </div>
          
          {/* Hover Preview */}
          <AnimatePresence>
            {isHovered && !isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${colors.border}` }}
              >
                <div style={{ display: 'flex', gap: 16, fontSize: 13, color: colors.text.tertiary }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MapPin size={14} />
                    {contact.location}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Calendar size={14} />
                    {contact.lastContact}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Expanded Content */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}
              >
                {/* Relationship */}
                <div>
                  <h4 style={{ fontSize: 11, fontWeight: 600, color: colors.text.tertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                    Relationship
                  </h4>
                  <p style={{ fontSize: 14, color: colors.text.secondary, lineHeight: 1.5 }}>
                    {contact.relationship}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8, fontSize: 13 }}>
                    <span style={{ color: colors.text.tertiary }}>Last contact: {contact.lastContact}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ display: 'flex' }}>
                        {[1,2,3,4].map(i => (
                          <div
                            key={i}
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background: i <= 3 ? '#4ADE80' : 'rgba(255,255,255,0.2)',
                              marginLeft: i > 1 ? -2 : 0,
                            }}
                          />
                        ))}
                      </div>
                      <span style={{ color: '#4ADE80', fontSize: 12, marginLeft: 4 }}>Strong</span>
                    </div>
                  </div>
                </div>
                
                {/* Profile */}
                <div>
                  <h4 style={{ fontSize: 11, fontWeight: 600, color: colors.text.tertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                    Profile
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14, color: colors.text.secondary }}>
                    <p><span style={{ color: colors.text.tertiary }}>Expertise:</span> {contact.expertise}</p>
                    <p><span style={{ color: colors.text.tertiary }}>Interests:</span> {contact.interests}</p>
                    <p><span style={{ color: colors.text.tertiary }}>Location:</span> {contact.location}</p>
                  </div>
                </div>
                
                {/* Tags */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {contact.tags.map((tag, i) => (
                    <Badge key={i} category={tag.category}>{tag.text}</Badge>
                  ))}
                </div>
                
                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, paddingTop: 8 }}>
                  <Button size="sm" onClick={(e) => { e.stopPropagation(); onDraft?.(); }}>
                    <Mail size={16} />
                    Draft Intro
                  </Button>
                  <Button size="sm" variant="secondary">
                    <Pin size={16} />
                    Pin
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </GlassCard>
    </motion.div>
  );
};

// ============================================================================
// EXPERIENCE 3: CHAT EXPLORATION
// ============================================================================

const ChatMessage = ({ message, isUser }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}
  >
    <div style={{
      maxWidth: '80%',
      padding: '12px 16px',
      borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
      background: isUser ? colors.gold.primary : 'rgba(255,255,255,0.1)',
      color: isUser ? '#000' : '#fff',
    }}>
      <p style={{ fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{message.text}</p>
    </div>
  </motion.div>
);

const ChatExploration = ({ onDraftIntro }) => {
  const [messages, setMessages] = useState([
    { id: 1, text: "What are you looking for?", isUser: false },
    { id: 2, text: "I'm trying to raise a small friends and family round for 33 Strategies", isUser: true },
    { id: 3, text: "Great — a few quick questions to help me surface the best contacts:\n\n• What's the target raise amount?\n• Are you looking for capital, advice, or both?", isUser: false },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [expandedContact, setExpandedContact] = useState(null);
  
  const contacts = [
    {
      id: 1,
      name: 'Sarah Chen',
      title: 'Angel investor · Sold SaaS 2021',
      whyNow: 'F&F round experience, warm relationship, you helped her with analytics last year',
      location: 'San Francisco',
      lastContact: '3 months ago',
      relationship: 'Met at Google AI program (2023). Collaborated on analytics needs — she was impressed with speed of delivery.',
      expertise: 'SaaS operations, B2B sales, early-stage fundraising',
      interests: 'Trail running, mentoring founders, wine',
      tags: [
        { text: 'Potential LP', category: 'opportunity' },
        { text: 'Warm relationship', category: 'relationship' },
      ],
    },
    {
      id: 2,
      name: 'David Park',
      title: 'Wrote $25K F&F checks before',
      whyNow: 'Has deployed F&F capital before, interested in AI/automation',
      location: 'Austin',
      lastContact: '6 months ago',
      relationship: 'Connected through mutual friend. Had coffee twice discussing AI trends.',
      expertise: 'Venture capital, startup operations',
      interests: 'Chess, podcasts, hiking',
      tags: [
        { text: 'F&F investor', category: 'opportunity' },
        { text: 'AI enthusiast', category: 'interest' },
      ],
    },
  ];
  
  const handleSend = () => {
    if (!inputValue.trim()) return;
    setMessages(prev => [...prev, { id: Date.now(), text: inputValue, isUser: true }]);
    setInputValue('');
    
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: "Based on that, here are people who could help with both. I've sorted by warmth of relationship + relevance to early-stage fundraising.",
        isUser: false,
      }]);
    }, 1000);
  };
  
  return (
    <div style={{
      display: 'flex',
      height: 600,
      gap: 1,
      background: colors.bg.primary,
      borderRadius: 12,
      overflow: 'hidden',
      border: `1px solid ${colors.border}`,
    }}>
      {/* Chat Panel */}
      <div style={{ width: '45%', display: 'flex', flexDirection: 'column', borderRight: `1px solid ${colors.border}` }}>
        <div style={{ padding: 16, borderBottom: `1px solid ${colors.border}` }}>
          <h2 style={{ fontWeight: 600, color: '#fff' }}>Explore Your Network</h2>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {messages.map(msg => (
            <ChatMessage key={msg.id} message={msg} isUser={msg.isUser} />
          ))}
        </div>
        
        <div style={{ padding: 16, borderTop: `1px solid ${colors.border}` }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Type a message..."
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${colors.border}`,
                borderRadius: 8,
                padding: '10px 16px',
                color: '#fff',
                fontSize: 14,
                outline: 'none',
              }}
            />
            <Button onClick={handleSend}>
              <Send size={16} />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Contacts Panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: 16, borderBottom: `1px solid ${colors.border}` }}>
          <p style={{ fontSize: 14, color: colors.text.tertiary }}>
            Showing contacts relevant to: <span style={{ color: colors.gold.primary }}>"friends and family round"</span>
          </p>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {contacts.map(contact => (
            <ContactCard
              key={contact.id}
              contact={contact}
              isExpanded={expandedContact === contact.id}
              onToggle={() => setExpandedContact(expandedContact === contact.id ? null : contact.id)}
              onDraft={() => onDraftIntro?.(contact)}
            />
          ))}
          
          <GlassCard style={{ padding: 16, textAlign: 'center' }}>
            <p style={{ color: colors.text.tertiary, fontSize: 14 }}>4 more contacts</p>
            <Button variant="ghost" size="sm" style={{ marginTop: 8 }}>Show more</Button>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// EXPERIENCE 4: INTRO DRAFT MODAL
// ============================================================================

const IntroDraftModal = ({ contact, onClose }) => {
  const generateDraft = (c) => `Hey ${c.name.split(' ')[0]},

Hope you've been well — been thinking about our last conversation. Your perspective on ${c.expertise?.split(',')[0] || 'business'} stuck with me.

I'm starting something new (AI consulting practice called 33 Strategies) and putting together a small friends & family round. Given your experience, I'd love to get your take — and if it's interesting, potentially have you involved.

Any chance you have 20 minutes this week or next?`;

  const [draft, setDraft] = useState(generateDraft(contact));
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        zIndex: 50,
      }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 520 }}
      >
        <GlassCard style={{ overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ padding: 16, borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontWeight: 600, color: '#fff' }}>Draft Introduction</h2>
            <button 
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: colors.text.tertiary, cursor: 'pointer', padding: 4 }}
            >
              <X size={20} />
            </button>
          </div>
          
          {/* Content */}
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Connecting */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: colors.text.tertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                Connecting
              </p>
              <p style={{ color: '#fff' }}>You → {contact.name}</p>
            </div>
            
            {/* Context */}
            <div style={{ padding: 12, borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: `1px solid ${colors.border}` }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: colors.text.tertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                Context (from your exploration)
              </p>
              <p style={{ fontSize: 14, color: colors.text.secondary, lineHeight: 1.5 }}>
                Looking for: Friends & family round, $150K target<br />
                Why {contact.name.split(' ')[0]}: {contact.whyNow}
              </p>
            </div>
            
            {/* Draft */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: colors.text.tertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                Draft
              </p>
              <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 8, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
                <div style={{ padding: '8px 12px', borderBottom: `1px solid ${colors.border}`, fontSize: 14, color: colors.text.secondary }}>
                  Subject: Quick catch-up + something I'm working on
                </div>
                <textarea
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    padding: 12,
                    fontSize: 14,
                    color: 'rgba(255,255,255,0.9)',
                    lineHeight: 1.6,
                    resize: 'none',
                    outline: 'none',
                    minHeight: 180,
                  }}
                />
              </div>
            </div>
            
            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="ghost" size="sm" onClick={() => setDraft(generateDraft(contact))}>
                  <RefreshCw size={16} />
                  Regenerate
                </Button>
                <Button variant="ghost" size="sm">
                  Try different angle
                </Button>
              </div>
              <Button size="sm" onClick={() => navigator.clipboard?.writeText(draft)}>
                <Copy size={16} />
                Copy to send
              </Button>
            </div>
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
};

// ============================================================================
// MAIN APP
// ============================================================================

const BetterConnectionsPrototype = () => {
  const [activeTab, setActiveTab] = useState('enrich');
  const [draftContact, setDraftContact] = useState(null);
  
  const handleDraftIntro = (contact) => {
    setDraftContact(contact);
  };
  
  return (
    <div style={{
      minHeight: '100vh',
      background: colors.bg.primary,
      color: '#fff',
      padding: 24,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      {/* Header */}
      <div style={{ maxWidth: 900, margin: '0 auto 32px' }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>
          Better <span style={{ color: colors.gold.primary }}>Connections</span>
        </h1>
        <p style={{ color: colors.text.tertiary }}>
          Your contacts are flat. Give them some depth.
        </p>
      </div>
      
      {/* Tab Navigation */}
      <div style={{ maxWidth: 900, margin: '0 auto 32px' }}>
        <div style={{
          display: 'inline-flex',
          gap: 4,
          padding: 4,
          background: 'rgba(255,255,255,0.05)',
          borderRadius: 8,
        }}>
          {[
            { id: 'enrich', label: 'Gamified Enrichment' },
            { id: 'explore', label: 'Chat Exploration' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '8px 16px',
                borderRadius: 6,
                border: 'none',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: activeTab === tab.id ? colors.gold.primary : 'transparent',
                color: activeTab === tab.id ? '#000' : colors.text.secondary,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Content */}
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <AnimatePresence mode="wait">
          {activeTab === 'enrich' && (
            <motion.div
              key="enrich"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <GamifiedEnrichment />
            </motion.div>
          )}
          
          {activeTab === 'explore' && (
            <motion.div
              key="explore"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <ChatExploration onDraftIntro={handleDraftIntro} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Draft Modal */}
      <AnimatePresence>
        {draftContact && (
          <IntroDraftModal
            contact={draftContact}
            onClose={() => setDraftContact(null)}
          />
        )}
      </AnimatePresence>
      
      {/* Footer */}
      <div style={{ maxWidth: 900, margin: '48px auto 0', textAlign: 'center' }}>
        <p style={{ fontSize: 12, color: colors.text.tertiary }}>
          Better Connections V1 Prototype • 33 Strategies
        </p>
      </div>
    </div>
  );
};

export default BetterConnectionsPrototype;
