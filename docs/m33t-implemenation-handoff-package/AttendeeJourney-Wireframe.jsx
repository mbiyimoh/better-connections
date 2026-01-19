import React, { useState, useEffect } from 'react';

/**
 * ATTENDEE JOURNEY WIREFRAME
 * 
 * Interactive prototype showing all screens across four phases:
 * - Phase 1: Pre-Event Intake
 * - Phase 2: Match Reveal
 * - Phase 3: At-Event
 * - Phase 4: Post-Event
 */

// ============================================
// MOCK DATA
// ============================================

const EVENT = {
  name: "RE Summit 2025",
  fullName: "33 Strategies Real Estate Summit",
  date: "March 15, 2025",
  time: "6:00 PM",
  location: "The LINE Austin",
  host: "Brandon"
};

const USER = {
  name: "Marcus",
  fullName: "Marcus Chen"
};

const MATCHES = [
  {
    id: 1,
    name: "Sarah Kim",
    headline: "PropTech investor backing infrastructure picks & shovels",
    role: "Partner",
    company: "Foundation Ventures",
    location: "San Francisco",
    expertise: ["PropTech", "Series A/B", "B2B SaaS"],
    seeking: "Founders in CRE software, LP co-invest opportunities",
    offering: "GTM strategy for PropTech, Intro to Zillow team",
    matchReason: "She invests in the space you operate in—potential LP or portfolio intro",
    prompts: [
      "Ask about her thesis on construction tech",
      "She was a PM at Zillow—discuss PropTech GTM",
      "Explore LP co-invest for your Fund III"
    ],
    hook: "Trail runner, board game enthusiast"
  },
  {
    id: 2,
    name: "James Park",
    headline: "Nashville multifamily operator, 200+ units",
    role: "Principal",
    company: "Park Capital",
    location: "Nashville",
    expertise: ["Multifamily ops", "Nashville market", "Value-add"],
    seeking: "Equity partners for next acquisition, Property management talent",
    offering: "Nashville market intel, Operator perspective on deals",
    matchReason: "He has the Nashville experience you're looking for—potential JV partner",
    prompts: [
      "Deep dive on Nashville submarkets",
      "Discuss JV structure for your expansion",
      "Get his take on BTR vs traditional multifamily"
    ],
    hook: "Former pro golfer, BBQ competition judge"
  },
  {
    id: 3,
    name: "Lisa Martinez",
    headline: "Family office allocator, $500M RE portfolio",
    role: "Director of Investments",
    company: "Horizon Family Office",
    location: "Miami → Austin",
    expertise: ["LP investing", "Fund evaluation", "Direct deals"],
    seeking: "Emerging managers with differentiated strategy, Co-invest opportunities",
    offering: "LP perspective on fundraising, Family office network intros",
    matchReason: "She writes the check sizes you're targeting for Fund III",
    prompts: [
      "What's she seeing in emerging manager landscape?",
      "Her take on BTR as an asset class",
      "What makes a Fund III pitch compelling?"
    ],
    hook: "Miami native, serious about pickleball"
  }
];

const ALL_ATTENDEES = [
  ...MATCHES,
  { id: 4, name: "Alex Chen", headline: "Development finance at regional bank", role: "VP", company: "First Texas Bank", location: "Dallas", expertise: ["Construction lending", "Bridge loans"] },
  { id: 5, name: "Rachel Stone", headline: "CRE attorney specializing in JV structures", role: "Partner", company: "Stone & Associates", location: "Austin", expertise: ["JV agreements", "Fund formation"] },
  { id: 6, name: "Michael Torres", headline: "Multifamily broker, Texas markets", role: "Managing Director", company: "CBRE", location: "Austin", expertise: ["Deal sourcing", "Market analysis"] },
  { id: 7, name: "Jennifer Wu", headline: "PropTech founder, property management software", role: "CEO", company: "ManageFlow", location: "Austin", expertise: ["PropTech", "Property management"] },
];

// ============================================
// UTILITY COMPONENTS
// ============================================

const PhaseIndicator = ({ phase, screen }) => (
  <div style={{
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    background: 'rgba(0,0,0,0.8)',
    color: 'white',
    padding: '8px 16px',
    fontSize: '11px',
    display: 'flex',
    justifyContent: 'space-between',
    zIndex: 100,
  }}>
    <span>Phase {phase}</span>
    <span>{screen}</span>
  </div>
);

const ProgressDots = ({ total, current }) => (
  <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', padding: '12px' }}>
    {Array.from({ length: total }).map((_, i) => (
      <div
        key={i}
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: i === current ? 'white' : 'rgba(255,255,255,0.4)',
          transition: 'background 0.2s',
        }}
      />
    ))}
  </div>
);

const Button = ({ children, primary, onClick, style = {} }) => (
  <button
    onClick={onClick}
    style={{
      width: '100%',
      padding: '16px 24px',
      borderRadius: '12px',
      border: 'none',
      background: primary ? 'white' : 'rgba(255,255,255,0.2)',
      color: primary ? '#1a1a1a' : 'white',
      fontSize: '16px',
      fontWeight: 600,
      cursor: 'pointer',
      ...style,
    }}
  >
    {children}
  </button>
);

const MiniCard = ({ person, onClick, status }) => {
  const hue = person.name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  const initials = person.name.split(' ').map(n => n[0]).join('');
  
  return (
    <div
      onClick={onClick}
      style={{
        background: 'white',
        borderRadius: '12px',
        padding: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        position: 'relative',
      }}
    >
      {status && (
        <div style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          fontSize: '10px',
          padding: '2px 6px',
          borderRadius: '4px',
          background: status === 'met' ? '#dcfce7' : status === 'current' ? '#dbeafe' : '#f3f4f6',
          color: status === 'met' ? '#166534' : status === 'current' ? '#1d4ed8' : '#666',
        }}>
          {status === 'met' ? '✓ Met' : status === 'current' ? 'Now' : 'Up next'}
        </div>
      )}
      <div style={{
        width: '44px',
        height: '44px',
        borderRadius: '50%',
        background: `linear-gradient(135deg, hsl(${hue}, 60%, 90%) 0%, hsl(${hue}, 60%, 80%) 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '14px',
        fontWeight: 600,
        color: `hsl(${hue}, 60%, 35%)`,
      }}>
        {initials}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '14px', color: '#1a1a1a' }}>{person.name}</div>
        <div style={{ fontSize: '12px', color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {person.headline}
        </div>
      </div>
      <div style={{ color: '#ccc', fontSize: '18px' }}>›</div>
    </div>
  );
};

const CompactCard = ({ person, onClick, note }) => {
  const hue = person.name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  const initials = person.name.split(' ').map(n => n[0]).join('');
  
  return (
    <div
      onClick={onClick}
      style={{
        background: 'white',
        borderRadius: '12px',
        padding: '16px',
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          background: `linear-gradient(135deg, hsl(${hue}, 60%, 90%) 0%, hsl(${hue}, 60%, 80%) 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          fontWeight: 600,
          color: `hsl(${hue}, 60%, 35%)`,
        }}>
          {initials}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: '15px', color: '#1a1a1a' }}>{person.name}</div>
          <div style={{ fontSize: '13px', color: '#666', marginTop: '2px' }}>{person.headline}</div>
          <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
            {person.role} · {person.location}
          </div>
        </div>
        <div style={{ color: '#ccc', fontSize: '20px' }}>›</div>
      </div>
      {person.expertise && (
        <div style={{ display: 'flex', gap: '6px', marginTop: '12px', flexWrap: 'wrap' }}>
          {person.expertise.slice(0, 3).map((tag, i) => (
            <span key={i} style={{
              background: `hsl(${hue}, 60%, 95%)`,
              color: `hsl(${hue}, 60%, 35%)`,
              padding: '4px 8px',
              borderRadius: '100px',
              fontSize: '11px',
              fontWeight: 500,
            }}>
              {tag}
            </span>
          ))}
        </div>
      )}
      {note && (
        <div style={{
          marginTop: '12px',
          padding: '8px 12px',
          background: '#f9fafb',
          borderRadius: '8px',
          fontSize: '12px',
          color: '#666',
        }}>
          📝 {note}
        </div>
      )}
    </div>
  );
};

// ============================================
// PHASE 1: PRE-EVENT INTAKE
// ============================================

const InviteLanding = ({ onNext }) => (
  <div style={{
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)',
    color: 'white',
    display: 'flex',
    flexDirection: 'column',
  }}>
    <PhaseIndicator phase={1} screen="Invite Landing" />
    
    {/* Hero Image Placeholder */}
    <div style={{
      height: '45vh',
      background: 'linear-gradient(135deg, #334155 0%, #1e293b 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '14px',
      color: 'rgba(255,255,255,0.5)',
    }}>
      [Venue Image]
    </div>
    
    {/* Content */}
    <div style={{ padding: '32px 24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        You're Invited
      </div>
      <h1 style={{ fontSize: '28px', fontWeight: 700, margin: '0 0 8px', lineHeight: 1.2 }}>
        {EVENT.fullName}
      </h1>
      <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.8)', margin: '0 0 16px' }}>
        {EVENT.date} · {EVENT.location}
      </p>
      <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
        An evening of curated connections with {EVENT.host}'s network of real estate investors, operators, and capital partners.
      </p>
      
      <div style={{ flex: 1 }} />
      
      <Button primary onClick={onNext}>
        Get Started
      </Button>
    </div>
  </div>
);

const StoriesIntro = ({ onNext }) => {
  const [slide, setSlide] = useState(0);
  
  const slides = [
    {
      title: `Welcome to ${EVENT.name}`,
      subtitle: `${EVENT.date} · ${EVENT.location}`,
      icon: "🏢"
    },
    {
      title: "Meet the Right People",
      subtitle: "We'll help you find the most valuable connections—no random mingling",
      icon: "🎯"
    },
    {
      title: "How It Works",
      subtitle: "Answer a few questions, and we'll match you with 2-3 people you should meet",
      icon: "✨"
    },
    {
      title: "Ready?",
      subtitle: "This takes about 4 minutes. Your answers help us find your best matches.",
      icon: "🚀"
    }
  ];
  
  const handleTap = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isRightSide = x > rect.width / 2;
    
    if (isRightSide) {
      if (slide < slides.length - 1) {
        setSlide(slide + 1);
      } else {
        onNext();
      }
    } else {
      if (slide > 0) {
        setSlide(slide - 1);
      }
    }
  };
  
  return (
    <div
      onClick={handleTap}
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
      }}
    >
      <PhaseIndicator phase={1} screen="Stories Intro" />
      
      {/* Progress Bar */}
      <div style={{ padding: '40px 16px 0', display: 'flex', gap: '4px' }}>
        {slides.map((_, i) => (
          <div key={i} style={{
            flex: 1,
            height: '3px',
            borderRadius: '2px',
            background: i <= slide ? 'white' : 'rgba(255,255,255,0.3)',
            transition: 'background 0.3s',
          }} />
        ))}
      </div>
      
      {/* Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 32px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '64px', marginBottom: '24px' }}>{slides[slide].icon}</div>
        <h2 style={{ fontSize: '26px', fontWeight: 700, margin: '0 0 16px', lineHeight: 1.3 }}>
          {slides[slide].title}
        </h2>
        <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.85)', margin: 0, lineHeight: 1.5 }}>
          {slides[slide].subtitle}
        </p>
      </div>
      
      {/* Bottom */}
      <div style={{ padding: '24px', textAlign: 'center' }}>
        {slide === slides.length - 1 ? (
          <Button primary style={{ background: 'white', color: '#4f46e5' }}>
            Let's Go
          </Button>
        ) : (
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
            Tap to continue
          </p>
        )}
      </div>
    </div>
  );
};

const ChatInterview = ({ onNext }) => {
  const [messages, setMessages] = useState([
    { from: 'system', text: `Hey ${USER.name}! Excited to have you at ${EVENT.name}. I'm going to ask you a few questions so we can connect you with the right people. Should take about 4 minutes. Ready?` }
  ]);
  const [input, setInput] = useState('');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  
  const questions = [
    "Give me the quick version—what do you do and what are you focused on right now?",
    "How do you know Brandon / what brought you to this event?",
    "If you could leave this event with one connection or opportunity locked in, what would it be?",
    "What's something you could help someone else with? Could be intros, expertise, opportunities.",
    "Describe your ideal person to meet. Who would make you think 'that was worth coming for'?",
    "Last one—anything interesting about you that's not on your LinkedIn?"
  ];
  
  const handleSend = () => {
    if (!input.trim()) return;
    
    setMessages([...messages, { from: 'user', text: input }]);
    setInput('');
    setIsTyping(true);
    
    setTimeout(() => {
      setIsTyping(false);
      if (questionIndex < questions.length) {
        setMessages(prev => [...prev, { from: 'system', text: questions[questionIndex] }]);
        setQuestionIndex(questionIndex + 1);
      } else {
        setMessages(prev => [...prev, { from: 'system', text: "Perfect! Let me put together your profile..." }]);
        setTimeout(onNext, 1500);
      }
    }, 1000);
  };
  
  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f5f5',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <PhaseIndicator phase={1} screen="Chat Interview" />
      
      {/* Header */}
      <div style={{
        background: 'white',
        padding: '48px 20px 16px',
        borderBottom: '1px solid #eee',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
          }}>
            ✨
          </div>
          <span style={{ fontWeight: 600, fontSize: '15px' }}>{EVENT.name}</span>
        </div>
        <span style={{ fontSize: '13px', color: '#888' }}>
          {questionIndex + 1} / {questions.length + 1}
        </span>
      </div>
      
      {/* Messages */}
      <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: msg.from === 'user' ? 'flex-end' : 'flex-start',
            marginBottom: '12px',
          }}>
            <div style={{
              maxWidth: '80%',
              padding: '12px 16px',
              borderRadius: msg.from === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              background: msg.from === 'user' ? '#6366f1' : 'white',
              color: msg.from === 'user' ? 'white' : '#1a1a1a',
              fontSize: '14px',
              lineHeight: 1.5,
              boxShadow: msg.from === 'system' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}>
              {msg.text}
            </div>
          </div>
        ))}
        {isTyping && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '12px' }}>
            <div style={{
              padding: '12px 16px',
              borderRadius: '16px 16px 16px 4px',
              background: 'white',
              fontSize: '14px',
              color: '#888',
            }}>
              typing...
            </div>
          </div>
        )}
      </div>
      
      {/* Input */}
      <div style={{
        padding: '12px 16px 32px',
        background: 'white',
        borderTop: '1px solid #eee',
        display: 'flex',
        gap: '12px',
      }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type your answer..."
          style={{
            flex: 1,
            padding: '12px 16px',
            borderRadius: '24px',
            border: '1px solid #e5e5e5',
            fontSize: '14px',
            outline: 'none',
          }}
        />
        <button
          onClick={handleSend}
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            border: 'none',
            background: '#6366f1',
            color: 'white',
            fontSize: '18px',
            cursor: 'pointer',
          }}
        >
          ↑
        </button>
      </div>
    </div>
  );
};

const CardPreview = ({ onNext }) => {
  const hue = USER.fullName.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  const initials = USER.fullName.split(' ').map(n => n[0]).join('');
  
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      padding: '60px 20px 32px',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <PhaseIndicator phase={1} screen="Card Preview" />
      
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{ fontSize: '32px', marginBottom: '8px' }}>✨</div>
        <h2 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 8px', color: '#1a1a1a' }}>
          Looking good, {USER.name}!
        </h2>
        <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
          Here's how we'll introduce you
        </p>
      </div>
      
      {/* Trading Card Preview */}
      <div style={{
        background: 'white',
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
        marginBottom: '24px',
      }}>
        <div style={{
          background: `linear-gradient(135deg, hsl(${hue}, 65%, 50%) 0%, hsl(${hue}, 65%, 40%) 100%)`,
          padding: '20px 20px 40px',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute',
            bottom: '-1px',
            left: 0,
            right: 0,
            height: '20px',
            background: 'white',
            borderRadius: '20px 20px 0 0',
          }} />
          <div style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: `linear-gradient(135deg, hsl(${hue}, 60%, 95%) 0%, white 100%)`,
            border: '3px solid white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            fontWeight: 700,
            color: `hsl(${hue}, 65%, 45%)`,
            margin: '0 auto -36px',
            position: 'relative',
            zIndex: 2,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}>
            {initials}
          </div>
        </div>
        
        <div style={{ padding: '44px 20px 20px', textAlign: 'center' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 4px', color: '#1a1a1a' }}>
            {USER.fullName}
          </h3>
          <p style={{ fontSize: '14px', color: '#666', margin: '0 0 8px' }}>
            Build-to-rent developer scaling into Southeast
          </p>
          <p style={{ fontSize: '13px', color: '#888', margin: '0 0 16px' }}>
            Managing Partner at Redline Capital · Austin → Nashville
          </p>
          
          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
            {['Ground-up dev', 'LP fundraising', 'BTR ops'].map((tag, i) => (
              <span key={i} style={{
                background: `hsl(${hue}, 60%, 95%)`,
                color: `hsl(${hue}, 60%, 35%)`,
                padding: '4px 10px',
                borderRadius: '100px',
                fontSize: '11px',
                fontWeight: 500,
              }}>
                {tag}
              </span>
            ))}
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', textAlign: 'left' }}>
            <div style={{ padding: '12px', borderRadius: '10px', background: '#fef9c3' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#92400e', marginBottom: '4px' }}>🎯 LOOKING FOR</div>
              <div style={{ fontSize: '12px', color: '#444' }}>Family office intros, Nashville operator</div>
            </div>
            <div style={{ padding: '12px', borderRadius: '10px', background: '#dcfce7' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#166534', marginBottom: '4px' }}>🤝 CAN HELP</div>
              <div style={{ fontSize: '12px', color: '#444' }}>LP deck review, Austin diligence</div>
            </div>
          </div>
        </div>
      </div>
      
      <p style={{ fontSize: '13px', color: '#888', textAlign: 'center', marginBottom: '16px' }}>
        Tap any section to edit
      </p>
      
      <div style={{ flex: 1 }} />
      
      <button
        onClick={onNext}
        style={{
          width: '100%',
          padding: '16px',
          borderRadius: '12px',
          border: 'none',
          background: '#1a1a1a',
          color: 'white',
          fontSize: '16px',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Looks Good
      </button>
    </div>
  );
};

const IntakeConfirmation = ({ onNext }) => (
  <div style={{
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    color: 'white',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 24px 32px',
    textAlign: 'center',
  }}>
    <PhaseIndicator phase={1} screen="Confirmation" />
    
    <div style={{ fontSize: '64px', marginBottom: '24px' }}>🎉</div>
    <h2 style={{ fontSize: '26px', fontWeight: 700, margin: '0 0 12px' }}>
      You're all set!
    </h2>
    <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.85)', marginBottom: '32px', lineHeight: 1.5 }}>
      We'll send your matches 1-2 days before the event. Get ready to meet some great people.
    </p>
    
    <div style={{
      background: 'rgba(255,255,255,0.15)',
      borderRadius: '16px',
      padding: '20px',
      width: '100%',
      marginBottom: '32px',
    }}>
      <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginBottom: '8px' }}>EVENT DETAILS</div>
      <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>{EVENT.fullName}</div>
      <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.85)' }}>{EVENT.date} · {EVENT.time}</div>
      <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.85)' }}>{EVENT.location}</div>
    </div>
    
    <Button style={{ background: 'rgba(255,255,255,0.2)', marginBottom: '12px' }}>
      📅 Add to Calendar
    </Button>
    
    <div style={{ flex: 1 }} />
    
    <button
      onClick={onNext}
      style={{
        background: 'none',
        border: 'none',
        color: 'rgba(255,255,255,0.7)',
        fontSize: '14px',
        cursor: 'pointer',
        padding: '12px',
      }}
    >
      Continue to Match Reveal →
    </button>
  </div>
);

// ============================================
// PHASE 2: MATCH REVEAL
// ============================================

const MatchRevealIntro = ({ onNext }) => (
  <div style={{
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
    color: 'white',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 24px 32px',
    textAlign: 'center',
  }}>
    <PhaseIndicator phase={2} screen="Reveal Intro" />
    
    <div style={{ fontSize: '64px', marginBottom: '24px' }}>🎯</div>
    <h2 style={{ fontSize: '26px', fontWeight: 700, margin: '0 0 12px' }}>
      Your Matches Are Ready
    </h2>
    <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.85)', marginBottom: '8px' }}>
      {EVENT.name} · {EVENT.date}
    </p>
    <p style={{ fontSize: '18px', marginBottom: '40px' }}>
      We found <strong>3 people</strong> you should meet
    </p>
    
    <Button primary onClick={onNext} style={{ background: 'white', color: '#5b21b6' }}>
      Show Me My Matches
    </Button>
  </div>
);

const MatchCards = ({ onSelectMatch, onNext }) => {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f5f5',
      padding: '60px 20px 32px',
    }}>
      <PhaseIndicator phase={2} screen="Match Cards" />
      
      <h2 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 8px', color: '#1a1a1a' }}>
        Your Matches
      </h2>
      <p style={{ fontSize: '14px', color: '#666', margin: '0 0 24px' }}>
        Tap to learn more about each person
      </p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        {MATCHES.map((match, i) => (
          <div key={match.id}>
            <CompactCard person={match} onClick={() => onSelectMatch(match)} />
            <div style={{
              padding: '8px 12px',
              background: '#ede9fe',
              borderRadius: '0 0 12px 12px',
              marginTop: '-8px',
              fontSize: '12px',
              color: '#5b21b6',
            }}>
              💡 {match.matchReason}
            </div>
          </div>
        ))}
      </div>
      
      <button
        onClick={onNext}
        style={{
          width: '100%',
          padding: '16px',
          borderRadius: '12px',
          border: 'none',
          background: '#1a1a1a',
          color: 'white',
          fontSize: '16px',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Got It — See You There!
      </button>
    </div>
  );
};

const MatchDetail = ({ match, onBack }) => {
  const hue = match.name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  const initials = match.name.split(' ').map(n => n[0]).join('');
  
  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f5f5',
    }}>
      <PhaseIndicator phase={2} screen="Match Detail" />
      
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, hsl(${hue}, 65%, 50%) 0%, hsl(${hue}, 65%, 40%) 100%)`,
        padding: '48px 20px 60px',
        position: 'relative',
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '14px',
            cursor: 'pointer',
            marginBottom: '16px',
          }}
        >
          ← Back
        </button>
        
        <div style={{
          position: 'absolute',
          bottom: '-1px',
          left: 0,
          right: 0,
          height: '24px',
          background: '#f5f5f5',
          borderRadius: '24px 24px 0 0',
        }} />
        
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: `linear-gradient(135deg, hsl(${hue}, 60%, 95%) 0%, white 100%)`,
          border: '4px solid white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '28px',
          fontWeight: 700,
          color: `hsl(${hue}, 65%, 45%)`,
          margin: '0 auto -40px',
          position: 'relative',
          zIndex: 2,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}>
          {initials}
        </div>
      </div>
      
      {/* Content */}
      <div style={{ padding: '48px 20px 32px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 4px', color: '#1a1a1a' }}>
            {match.name}
          </h2>
          <p style={{ fontSize: '14px', color: '#666', margin: '0 0 4px' }}>
            {match.headline}
          </p>
          <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>
            {match.role} at {match.company} · {match.location}
          </p>
        </div>
        
        {/* Match Reason */}
        <div style={{
          background: '#ede9fe',
          padding: '16px',
          borderRadius: '12px',
          marginBottom: '20px',
        }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#5b21b6', marginBottom: '4px' }}>
            WHY YOU'RE MATCHED
          </div>
          <div style={{ fontSize: '14px', color: '#1a1a1a' }}>
            {match.matchReason}
          </div>
        </div>
        
        {/* Conversation Prompts */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#888', marginBottom: '12px', textTransform: 'uppercase' }}>
            Conversation Starters
          </div>
          {match.prompts.map((prompt, i) => (
            <div key={i} style={{
              background: 'white',
              padding: '12px 16px',
              borderRadius: '10px',
              marginBottom: '8px',
              fontSize: '14px',
              color: '#444',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}>
              💡 {prompt}
            </div>
          ))}
        </div>
        
        {/* Exchange */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
          <div style={{ background: '#fef9c3', padding: '12px', borderRadius: '10px' }}>
            <div style={{ fontSize: '10px', fontWeight: 600, color: '#92400e', marginBottom: '4px' }}>THEY'RE LOOKING FOR</div>
            <div style={{ fontSize: '12px', color: '#444' }}>{match.seeking}</div>
          </div>
          <div style={{ background: '#dcfce7', padding: '12px', borderRadius: '10px' }}>
            <div style={{ fontSize: '10px', fontWeight: 600, color: '#166534', marginBottom: '4px' }}>THEY CAN HELP WITH</div>
            <div style={{ fontSize: '12px', color: '#444' }}>{match.offering}</div>
          </div>
        </div>
        
        {/* Personal Hook */}
        <div style={{
          background: 'white',
          padding: '12px 16px',
          borderRadius: '10px',
          fontSize: '13px',
          color: '#666',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}>
          <strong>Beyond work:</strong> {match.hook}
        </div>
      </div>
    </div>
  );
};

// ============================================
// PHASE 3: AT-EVENT
// ============================================

const EventDashboard = ({ onSelectMatch, currentMatchIndex, onComplete }) => {
  const [timer, setTimer] = useState(754); // 12:34 in seconds
  
  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(t => t > 0 ? t - 1 : 0);
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  
  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  
  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f5f5',
      padding: '60px 20px 32px',
    }}>
      <PhaseIndicator phase={3} screen="Event Dashboard" />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 4px', color: '#1a1a1a' }}>
            {EVENT.name}
          </h2>
          <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>Curated Networking</p>
        </div>
        <div style={{
          background: 'white',
          padding: '8px 12px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: 600,
          color: timer < 60 ? '#dc2626' : '#1a1a1a',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          ⏱ {formatTime(timer)}
        </div>
      </div>
      
      {/* Match Status */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        {MATCHES.map((match, i) => {
          const status = i < currentMatchIndex ? 'met' : i === currentMatchIndex ? 'current' : null;
          const hue = match.name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
          const initials = match.name.split(' ').map(n => n[0]).join('');
          
          return (
            <div
              key={match.id}
              onClick={() => i === currentMatchIndex && onSelectMatch(match)}
              style={{
                flex: 1,
                background: 'white',
                borderRadius: '12px',
                padding: '12px',
                textAlign: 'center',
                cursor: i === currentMatchIndex ? 'pointer' : 'default',
                boxShadow: i === currentMatchIndex ? '0 4px 12px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.05)',
                border: i === currentMatchIndex ? '2px solid #6366f1' : '2px solid transparent',
              }}
            >
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: status === 'met' ? '#dcfce7' : `linear-gradient(135deg, hsl(${hue}, 60%, 90%) 0%, hsl(${hue}, 60%, 80%) 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: status === 'met' ? '16px' : '14px',
                fontWeight: 600,
                color: status === 'met' ? '#166534' : `hsl(${hue}, 60%, 35%)`,
                margin: '0 auto 8px',
              }}>
                {status === 'met' ? '✓' : initials}
              </div>
              <div style={{ fontSize: '12px', fontWeight: 500, color: '#1a1a1a' }}>
                {match.name.split(' ')[0]}
              </div>
              <div style={{
                fontSize: '10px',
                color: status === 'met' ? '#166534' : status === 'current' ? '#6366f1' : '#888',
                fontWeight: 500,
                marginTop: '2px',
              }}>
                {status === 'met' ? 'Met' : status === 'current' ? 'Now' : 'Up next'}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Current Match Card */}
      {currentMatchIndex < MATCHES.length && (
        <>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#888', marginBottom: '12px', textTransform: 'uppercase' }}>
            Currently Meeting
          </div>
          <CompactCard person={MATCHES[currentMatchIndex]} onClick={() => onSelectMatch(MATCHES[currentMatchIndex])} />
          
          <button
            onClick={() => onSelectMatch(MATCHES[currentMatchIndex])}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: '12px',
              border: 'none',
              background: '#6366f1',
              color: 'white',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
              marginTop: '16px',
            }}
          >
            View Conversation Prompts
          </button>
        </>
      )}
      
      {currentMatchIndex >= MATCHES.length && (
        <div style={{
          background: '#dcfce7',
          padding: '24px',
          borderRadius: '16px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎉</div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 8px', color: '#166534' }}>
            All done!
          </h3>
          <p style={{ fontSize: '14px', color: '#166534', margin: '0 0 16px' }}>
            You've met all your curated matches. Enjoy the rest of the event!
          </p>
          <button
            onClick={onComplete}
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              border: 'none',
              background: '#166534',
              color: 'white',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Continue to Post-Event →
          </button>
        </div>
      )}
    </div>
  );
};

const ConversationView = ({ match, onDone }) => {
  const [timer, setTimer] = useState(525);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(t => t > 0 ? t - 1 : 0);
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  
  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  
  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f5f5',
      padding: '60px 20px 32px',
    }}>
      <PhaseIndicator phase={3} screen="Conversation View" />
      
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
      }}>
        <div style={{ fontSize: '16px', fontWeight: 600, color: '#1a1a1a' }}>
          Talking with {match.name.split(' ')[0]}
        </div>
        <button
          onClick={onDone}
          style={{
            background: '#1a1a1a',
            border: 'none',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Done
        </button>
      </div>
      
      {/* Prompts */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: '#888', marginBottom: '12px', textTransform: 'uppercase' }}>
          Conversation Starters
        </div>
        {match.prompts.map((prompt, i) => (
          <div key={i} style={{
            background: 'white',
            padding: '14px 16px',
            borderRadius: '12px',
            marginBottom: '8px',
            fontSize: '14px',
            color: '#444',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            lineHeight: 1.5,
          }}>
            💡 {prompt}
          </div>
        ))}
      </div>
      
      {/* Quick Reference */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
        <div style={{ background: '#fef9c3', padding: '12px', borderRadius: '10px' }}>
          <div style={{ fontSize: '10px', fontWeight: 600, color: '#92400e', marginBottom: '4px' }}>THEY'RE LOOKING FOR</div>
          <div style={{ fontSize: '12px', color: '#444' }}>{match.seeking}</div>
        </div>
        <div style={{ background: '#dcfce7', padding: '12px', borderRadius: '10px' }}>
          <div style={{ fontSize: '10px', fontWeight: 600, color: '#166534', marginBottom: '4px' }}>YOU CAN HELP WITH</div>
          <div style={{ fontSize: '12px', color: '#444' }}>LP deck review, Austin market diligence</div>
        </div>
      </div>
      
      {/* Icebreaker */}
      <div style={{
        background: '#ede9fe',
        padding: '12px 16px',
        borderRadius: '10px',
        fontSize: '13px',
        color: '#5b21b6',
        marginBottom: '20px',
      }}>
        🎾 Icebreaker: {match.hook}
      </div>
      
      {/* Timer */}
      <div style={{
        background: 'white',
        padding: '16px',
        borderRadius: '12px',
        textAlign: 'center',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}>
        <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>TIME REMAINING</div>
        <div style={{
          fontSize: '32px',
          fontWeight: 700,
          color: timer < 60 ? '#dc2626' : '#1a1a1a',
        }}>
          {formatTime(timer)}
        </div>
      </div>
    </div>
  );
};

// ============================================
// PHASE 4: POST-EVENT
// ============================================

const PostEventPortal = ({ onSelectAttendee }) => {
  const [search, setSearch] = useState('');
  const [view, setView] = useState('matches'); // 'matches' | 'all'
  
  const filteredAttendees = ALL_ATTENDEES.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.headline.toLowerCase().includes(search.toLowerCase()) ||
    a.company?.toLowerCase().includes(search.toLowerCase())
  );
  
  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f5f5',
      padding: '60px 20px 32px',
    }}>
      <PhaseIndicator phase={4} screen="Post-Event Portal" />
      
      <h2 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 4px', color: '#1a1a1a' }}>
        {EVENT.name} Directory
      </h2>
      <p style={{ fontSize: '14px', color: '#666', margin: '0 0 20px' }}>
        Connect with people you met
      </p>
      
      {/* Search */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '12px 16px',
        marginBottom: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Search by name, company, skill..."
          style={{
            width: '100%',
            border: 'none',
            fontSize: '14px',
            outline: 'none',
          }}
        />
      </div>
      
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button
          onClick={() => setView('matches')}
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: '8px',
            border: 'none',
            background: view === 'matches' ? '#1a1a1a' : 'white',
            color: view === 'matches' ? 'white' : '#666',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Your Matches (3)
        </button>
        <button
          onClick={() => setView('all')}
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: '8px',
            border: 'none',
            background: view === 'all' ? '#1a1a1a' : 'white',
            color: view === 'all' ? 'white' : '#666',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          All Attendees ({ALL_ATTENDEES.length})
        </button>
      </div>
      
      {/* Results */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {view === 'matches' ? (
          MATCHES.map((match, i) => (
            <CompactCard
              key={match.id}
              person={match}
              onClick={() => onSelectAttendee(match)}
              note={i === 0 ? "Great chat about Nashville JV" : null}
            />
          ))
        ) : (
          filteredAttendees.map(person => (
            <MiniCard
              key={person.id}
              person={person}
              onClick={() => onSelectAttendee(person)}
            />
          ))
        )}
      </div>
    </div>
  );
};

const ConnectionRequest = ({ person, onSend, onBack }) => {
  const [note, setNote] = useState('');
  const hue = person.name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  const initials = person.name.split(' ').map(n => n[0]).join('');
  
  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f5f5',
      padding: '60px 20px 32px',
    }}>
      <PhaseIndicator phase={4} screen="Connection Request" />
      
      <button
        onClick={onBack}
        style={{
          background: 'white',
          border: 'none',
          padding: '8px 16px',
          borderRadius: '20px',
          fontSize: '14px',
          cursor: 'pointer',
          marginBottom: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        ← Back
      </button>
      
      <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 20px', color: '#1a1a1a' }}>
        Connect with {person.name}
      </h2>
      
      {/* Mini profile */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: `linear-gradient(135deg, hsl(${hue}, 60%, 90%) 0%, hsl(${hue}, 60%, 80%) 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
          fontWeight: 600,
          color: `hsl(${hue}, 60%, 35%)`,
        }}>
          {initials}
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: '15px', color: '#1a1a1a' }}>{person.name}</div>
          <div style={{ fontSize: '13px', color: '#666' }}>{person.role} at {person.company}</div>
        </div>
      </div>
      
      {/* Note */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '13px', fontWeight: 500, color: '#1a1a1a', marginBottom: '8px' }}>
          Add a note (optional)
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Great meeting you at the summit! Would love to continue our conversation about..."
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid #e5e5e5',
            fontSize: '14px',
            minHeight: '120px',
            resize: 'none',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>
      
      <button
        onClick={onSend}
        style={{
          width: '100%',
          padding: '16px',
          borderRadius: '12px',
          border: 'none',
          background: '#6366f1',
          color: 'white',
          fontSize: '16px',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Send Request
      </button>
    </div>
  );
};

const ConnectionSent = ({ person, onDone }) => (
  <div style={{
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    color: 'white',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 24px 32px',
    textAlign: 'center',
  }}>
    <PhaseIndicator phase={4} screen="Connection Sent" />
    
    <div style={{ fontSize: '64px', marginBottom: '24px' }}>✉️</div>
    <h2 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 12px' }}>
      Request Sent!
    </h2>
    <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.85)', marginBottom: '32px' }}>
      We'll let you know when {person.name.split(' ')[0]} responds
    </p>
    
    <Button primary onClick={onDone} style={{ background: 'white', color: '#047857' }}>
      Back to Directory
    </Button>
  </div>
);

// ============================================
// MAIN APP
// ============================================

export default function AttendeeJourney() {
  const [screen, setScreen] = useState('landing');
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [selectedAttendee, setSelectedAttendee] = useState(null);
  
  // Navigation helper
  const screens = {
    // Phase 1
    landing: <InviteLanding onNext={() => setScreen('stories')} />,
    stories: <StoriesIntro onNext={() => setScreen('chat')} />,
    chat: <ChatInterview onNext={() => setScreen('cardPreview')} />,
    cardPreview: <CardPreview onNext={() => setScreen('intakeConfirm')} />,
    intakeConfirm: <IntakeConfirmation onNext={() => setScreen('revealIntro')} />,
    
    // Phase 2
    revealIntro: <MatchRevealIntro onNext={() => setScreen('matchCards')} />,
    matchCards: <MatchCards 
      onSelectMatch={(m) => { setSelectedMatch(m); setScreen('matchDetail'); }}
      onNext={() => setScreen('eventDashboard')}
    />,
    matchDetail: <MatchDetail 
      match={selectedMatch} 
      onBack={() => setScreen('matchCards')} 
    />,
    
    // Phase 3
    eventDashboard: <EventDashboard
      currentMatchIndex={currentMatchIndex}
      onSelectMatch={(m) => { setSelectedMatch(m); setScreen('conversation'); }}
      onComplete={() => setScreen('postEvent')}
    />,
    conversation: <ConversationView
      match={selectedMatch}
      onDone={() => { 
        setCurrentMatchIndex(i => i + 1);
        setScreen('eventDashboard');
      }}
    />,
    
    // Phase 4
    postEvent: <PostEventPortal
      onSelectAttendee={(a) => { setSelectedAttendee(a); setScreen('connectionRequest'); }}
    />,
    connectionRequest: <ConnectionRequest
      person={selectedAttendee}
      onBack={() => setScreen('postEvent')}
      onSend={() => setScreen('connectionSent')}
    />,
    connectionSent: <ConnectionSent
      person={selectedAttendee}
      onDone={() => setScreen('postEvent')}
    />,
  };
  
  return (
    <div style={{ 
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      maxWidth: '420px',
      margin: '0 auto',
      minHeight: '100vh',
      background: '#000',
    }}>
      {screens[screen]}
      
      {/* Dev Navigation */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'rgba(0,0,0,0.95)',
        padding: '8px',
        display: 'flex',
        gap: '4px',
        flexWrap: 'wrap',
        justifyContent: 'center',
        maxWidth: '420px',
        margin: '0 auto',
      }}>
        {[
          { key: 'landing', label: '1.1' },
          { key: 'stories', label: '1.2' },
          { key: 'chat', label: '1.3' },
          { key: 'cardPreview', label: '1.4' },
          { key: 'intakeConfirm', label: '1.5' },
          { key: 'revealIntro', label: '2.1' },
          { key: 'matchCards', label: '2.2' },
          { key: 'eventDashboard', label: '3.1' },
          { key: 'postEvent', label: '4.1' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setScreen(key)}
            style={{
              padding: '6px 10px',
              fontSize: '11px',
              background: screen === key ? '#6366f1' : '#333',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
