import React, { useState, useEffect, useRef } from 'react';

// Mock attendee data
const attendees = [
  {
    id: 1, name: "Sarah Chen", title: "Founder & CEO", company: "Nexus AI", location: "Austin, TX", status: "confirmed",
    background: "Former ML lead at Google. Founded Nexus AI in 2022. Series A, building enterprise automation tools.",
    whyInteresting: "Deep technical background meets operator mindset. Has built 3 AI products in the last 18 months.",
    conversationStarters: ["Their approach to enterprise sales as a technical founder", "Lessons from Google ML → startup transition", "How they're thinking about AI agents"]
  },
  {
    id: 2, name: "Marcus Williams", title: "Managing Partner", company: "Foundry Capital", location: "San Francisco, CA", status: "confirmed",
    background: "15 years in venture. Led investments in 3 unicorns. Thesis: AI-native businesses will replace incumbents.",
    whyInteresting: "Has the long view on what AI means for company building. Sees patterns across hundreds of startups.",
    conversationStarters: ["What he looks for in AI-native founders", "How valuations are shifting with AI capabilities", "His prediction on which industries flip first"]
  },
  {
    id: 3, name: "Jordan Reyes", title: "Head of Product", company: "Stripe", location: "Austin, TX", status: "confirmed",
    background: "Built payments infrastructure at scale. Previously product at Square. Obsessed with developer experience.",
    whyInteresting: "Understands how AI changes product development at the infrastructure level.",
    conversationStarters: ["How Stripe is thinking about AI in payments", "What changes when anyone can build software", "Developer tools that actually stick"]
  },
  {
    id: 4, name: "Elena Vasquez", title: "CEO", company: "Bloom Health", location: "Houston, TX", status: "confirmed",
    background: "MD turned founder. Building AI-powered health coaching. Raised $8M seed.",
    whyInteresting: "Navigating AI in healthcare's regulatory maze. Has unique clinical + tech perspective.",
    conversationStarters: ["Getting AI past healthcare compliance", "Where AI can and can't replace human judgment", "Building in regulated industries"]
  },
  {
    id: 5, name: "David Park", title: "CTO", company: "Assembly", location: "Austin, TX", status: "confirmed",
    background: "Ex-Amazon. Built Assembly's AI infrastructure from scratch. Handles 10M+ daily AI calls.",
    whyInteresting: "Knows what it takes to make AI work at scale. Practical, not theoretical.",
    conversationStarters: ["Infrastructure decisions that matter at scale", "Where AI costs actually land", "The build vs. buy decision for AI"]
  },
  {
    id: 6, name: "Priya Sharma", title: "Founder", company: "ContentForge", location: "Denver, CO", status: "maybe",
    background: "Former content strategist at HubSpot. Built ContentForge to automate brand content creation.",
    whyInteresting: "Living the 'AI eats content' thesis. Has opinions on what still requires humans.",
    conversationStarters: ["What content work AI actually replaces", "How brands should think about AI voice", "The future of content teams"]
  },
  {
    id: 7, name: "James Foster", title: "Principal", company: "Benchmark Capital", location: "San Francisco, CA", status: "maybe",
    background: "Early investor in several AI companies. Writes extensively on AI market dynamics.",
    whyInteresting: "Has conviction on where value accrues in the AI stack.",
    conversationStarters: ["His thesis on AI infrastructure vs. applications", "Which AI moats actually hold", "Patterns in successful AI company building"]
  },
  {
    id: 8, name: "Michelle Torres", title: "VP Engineering", company: "Datadog", location: "Austin, TX", status: "maybe",
    background: "Leads observability platform development. Previously built ML systems at Netflix.",
    whyInteresting: "Sees how AI changes infrastructure needs. Deep technical expertise.",
    conversationStarters: ["What observability looks like for AI systems", "Debugging AI at scale", "The tooling gap for AI development"]
  },
  {
    id: 9, name: "Ryan Mitchell", title: "Founder & CEO", company: "FleetAI", location: "Dallas, TX", status: "invited",
    background: "Building AI for logistics optimization. Ex-McKinsey, specialized in supply chain.",
    whyInteresting: "Applying AI to unglamorous but massive industries. Unique perspective on enterprise AI adoption.",
    conversationStarters: ["Selling AI to traditional industries", "Where AI creates 10x value in logistics", "The enterprise AI adoption curve"]
  },
  {
    id: 10, name: "Amanda Liu", title: "Head of AI", company: "Indeed", location: "Austin, TX", status: "invited",
    background: "Leading AI transformation at Indeed. Previously research scientist at DeepMind.",
    whyInteresting: "Rare combination of research depth and product thinking at scale.",
    conversationStarters: ["AI's impact on the future of work", "Transitioning from research to product", "What AI does to job search and hiring"]
  },
  {
    id: 11, name: "Chris Blackwell", title: "CEO", company: "Archetype Ventures", location: "Austin, TX", status: "invited",
    background: "Serial entrepreneur. Exited 2 companies. Now building studio model for AI-native businesses.",
    whyInteresting: "Strong opinions on how company building changes when anyone can build anything.",
    conversationStarters: ["The studio model for AI companies", "What moats look like post-AI", "His predictions for the next 5 years"]
  },
  {
    id: 12, name: "Nina Patel", title: "Partner", company: "Lightspeed", location: "San Francisco, CA", status: "invited",
    background: "Focuses on AI and infrastructure investments. Board member at 5 AI companies.",
    whyInteresting: "Sees the full landscape of AI company building across stages and sectors.",
    conversationStarters: ["Where she's seeing the most interesting AI companies", "What separates winners from losers", "How she evaluates AI founders"]
  },
  {
    id: 13, name: "Alex Turner", title: "Co-founder", company: "Synthesis Labs", location: "Austin, TX", status: "invited",
    background: "Building AI tools for creative professionals. Previously design lead at Figma.",
    whyInteresting: "At the intersection of AI and creative tools. Understands how AI changes design workflows.",
    conversationStarters: ["Will AI replace designers?", "The future of creative tools", "Building for creative professionals"]
  },
  {
    id: 14, name: "Rachel Kim", title: "VP Strategy", company: "OpenAI", location: "San Francisco, CA", status: "invited",
    background: "Shapes go-to-market for AI products at scale. Previously strategy at Google Cloud.",
    whyInteresting: "Sees how enterprises actually adopt AI. Has the inside view on what's coming.",
    conversationStarters: ["Enterprise AI adoption patterns", "What's next after GPT-4", "How companies should be thinking about AI strategy"]
  }
];

const schedule = [
  { time: "3:00", title: "Building at the Speed of Thought", desc: "Fireside conversation on what becomes possible when constraints disappear" },
  { time: "3:50", title: "What Would You Build From Scratch?", desc: "Panel: First-principles thinking in action" },
  { time: "4:40", title: "Curated Breakouts", desc: "Small group discussions matched by M33T" },
  { time: "5:40", title: "Dinner + Demos", desc: "Products built at the speed of thought" },
  { time: "6:40", title: "Speed Networking", desc: "3 curated connections, 15 minutes each" },
  { time: "7:50", title: "Future-Casting", desc: "Where do these trends take us?" },
  { time: "8:40", title: "Closing Keynote", desc: "The bigger picture" }
];

// Profile Modal
const ProfileModal = ({ attendee, onClose }) => {
  if (!attendee) return null;
  const statusLabels = { confirmed: { text: 'Confirmed', color: 'text-emerald-400' }, maybe: { text: 'Maybe', color: 'text-amber-400' }, invited: { text: 'Invited', color: 'text-zinc-400' } };
  const initials = attendee.name.split(' ').map(n => n[0]).join('');
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-zinc-900 border border-zinc-800 rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors text-2xl">×</button>
        <div className="p-8">
          <div className="flex items-start gap-6 mb-8">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center text-xl font-medium text-zinc-400 flex-shrink-0">{initials}</div>
            <div>
              <h2 className="text-2xl text-white mb-1" style={{ fontFamily: 'Georgia, serif' }}>{attendee.name}</h2>
              <p className="text-zinc-400">{attendee.title}, {attendee.company}</p>
              <p className="text-zinc-600 text-sm">{attendee.location}</p>
              <p className={`text-sm mt-2 ${statusLabels[attendee.status].color}`}>● {statusLabels[attendee.status].text}</p>
            </div>
          </div>
          <div className="space-y-6">
            <div>
              <h3 className="text-amber-500 text-sm font-medium tracking-widest uppercase mb-3">Background</h3>
              <p className="text-zinc-300 leading-relaxed">{attendee.background}</p>
            </div>
            <div>
              <h3 className="text-amber-500 text-sm font-medium tracking-widest uppercase mb-3">Why They're Interesting</h3>
              <p className="text-zinc-300 leading-relaxed">{attendee.whyInteresting}</p>
            </div>
            <div>
              <h3 className="text-amber-500 text-sm font-medium tracking-widest uppercase mb-3">Conversation Starters</h3>
              <ul className="space-y-2">
                {attendee.conversationStarters.map((s, i) => <li key={i} className="text-zinc-400 flex items-start gap-3"><span className="text-amber-500">•</span>{s}</li>)}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Full Guest List Modal
const FullGuestListModal = ({ isOpen, onClose, attendees, onSelectAttendee }) => {
  const [activeTab, setActiveTab] = useState('confirmed');
  
  if (!isOpen) return null;
  
  const filteredAttendees = attendees.filter(a => a.status === activeTab);
  const counts = { 
    confirmed: attendees.filter(a => a.status === 'confirmed').length, 
    maybe: attendees.filter(a => a.status === 'maybe').length, 
    invited: attendees.filter(a => a.status === 'invited').length 
  };
  
  const statusColors = { confirmed: 'bg-emerald-500', maybe: 'bg-amber-500', invited: 'bg-zinc-600' };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <p className="text-amber-500 text-sm font-medium tracking-widest uppercase mb-1">The Room</p>
            <h2 className="text-2xl text-white" style={{ fontFamily: 'Georgia, serif' }}>Full Guest List</h2>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors text-2xl p-2">×</button>
        </div>
        
        <div className="p-6 border-b border-zinc-800">
          <div className="flex gap-2 bg-zinc-900 rounded-xl p-1.5 inline-flex">
            {[
              { key: 'confirmed', label: 'Confirmed', color: 'emerald' },
              { key: 'maybe', label: 'Maybe', color: 'amber' },
              { key: 'invited', label: 'Invited', color: 'zinc' }
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.key 
                    ? tab.color === 'emerald' ? 'bg-emerald-500/20 text-emerald-400' 
                      : tab.color === 'amber' ? 'bg-amber-500/20 text-amber-400' 
                      : 'bg-zinc-700/50 text-zinc-300'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}>
                {tab.label} ({counts[tab.key]})
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredAttendees.map(attendee => {
              const initials = attendee.name.split(' ').map(n => n[0]).join('');
              return (
                <div 
                  key={attendee.id}
                  onClick={() => onSelectAttendee(attendee)}
                  className="group bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 cursor-pointer hover:border-amber-500/50 hover:bg-zinc-900 transition-all duration-300"
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="relative mb-3">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center text-lg font-medium text-zinc-400 group-hover:text-amber-500 transition-colors">{initials}</div>
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full ${statusColors[attendee.status]} border-2 border-zinc-900`} />
                    </div>
                    <h3 className="font-medium text-white text-sm mb-0.5 group-hover:text-amber-500 transition-colors">{attendee.name}</h3>
                    <p className="text-xs text-zinc-500">{attendee.title}</p>
                    <p className="text-xs text-zinc-600">{attendee.company}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// Carousel Card
const CarouselCard = ({ attendee, onClick, size = 'normal' }) => {
  const statusColors = { confirmed: 'bg-emerald-500', maybe: 'bg-amber-500', invited: 'bg-zinc-600' };
  const initials = attendee.name.split(' ').map(n => n[0]).join('');
  
  const sizeClasses = size === 'small' 
    ? 'w-36 p-4' 
    : 'w-44 p-5';
  
  const avatarSize = size === 'small' ? 'w-12 h-12 text-base' : 'w-14 h-14 text-lg';
  const dotSize = size === 'small' ? 'w-3 h-3' : 'w-4 h-4';
  
  return (
    <div 
      onClick={() => onClick(attendee)}
      className={`group flex-shrink-0 ${sizeClasses} bg-zinc-900/60 border border-zinc-800 rounded-2xl cursor-pointer hover:border-amber-500/50 hover:bg-zinc-900 transition-all duration-300`}
    >
      <div className="flex flex-col items-center text-center">
        <div className="relative mb-3">
          <div className={`${avatarSize} rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center font-medium text-zinc-400 group-hover:text-amber-500 transition-colors`}>
            {initials}
          </div>
          <div className={`absolute -bottom-0.5 -right-0.5 ${dotSize} rounded-full ${statusColors[attendee.status]} border-2 border-zinc-900`} />
        </div>
        <h3 className="font-medium text-white text-sm mb-0.5 group-hover:text-amber-500 transition-colors truncate w-full">{attendee.name}</h3>
        <p className="text-xs text-zinc-500 truncate w-full">{attendee.title}</p>
        <p className="text-xs text-zinc-600 truncate w-full">{attendee.company}</p>
      </div>
    </div>
  );
};

// Horizontal Carousel
const AttendeeCarousel = ({ title, subtitle, attendees, statusColor, onSelectAttendee }) => {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  
  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };
  
  useEffect(() => {
    checkScroll();
    const ref = scrollRef.current;
    if (ref) {
      ref.addEventListener('scroll', checkScroll);
      return () => ref.removeEventListener('scroll', checkScroll);
    }
  }, []);
  
  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };
  
  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-4 px-6 md:px-12">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${statusColor}`} />
          <h3 className="text-white font-medium">{title}</h3>
          <span className="text-zinc-600 text-sm">({attendees.length})</span>
        </div>
        {subtitle && <p className="text-zinc-500 text-sm hidden md:block">{subtitle}</p>}
      </div>
      
      <div className="relative group">
        {/* Left scroll button */}
        <button 
          onClick={() => scroll('left')}
          className={`absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-zinc-900/90 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-600 transition-all ${canScrollLeft ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
          ←
        </button>
        
        {/* Carousel */}
        <div 
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide px-6 md:px-12 pb-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {attendees.map(attendee => (
            <CarouselCard key={attendee.id} attendee={attendee} onClick={onSelectAttendee} />
          ))}
        </div>
        
        {/* Right scroll button */}
        <button 
          onClick={() => scroll('right')}
          className={`absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-zinc-900/90 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-600 transition-all ${canScrollRight ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
          →
        </button>
        
        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-2 w-12 bg-gradient-to-r from-zinc-950 to-transparent pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-2 w-12 bg-gradient-to-l from-zinc-950 to-transparent pointer-events-none" />
      </div>
    </div>
  );
};

// Collapsible Invited Section
const InvitedSection = ({ attendees, onSelectAttendee }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollRef = useRef(null);
  
  return (
    <div className="mb-10">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full px-6 md:px-12 py-4 hover:bg-zinc-900/30 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-zinc-600" />
          <h3 className="text-zinc-400 font-medium group-hover:text-white transition-colors">Invited</h3>
          <span className="text-zinc-600 text-sm">({attendees.length})</span>
        </div>
        <div className="flex items-center gap-2 text-zinc-500">
          <span className="text-sm">{isExpanded ? 'Hide' : 'Show who else is invited'}</span>
          <span className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>↓</span>
        </div>
      </button>
      
      <div className={`overflow-hidden transition-all duration-500 ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="relative">
          <div 
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto scrollbar-hide px-6 md:px-12 py-4"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {attendees.map(attendee => (
              <CarouselCard key={attendee.id} attendee={attendee} onClick={onSelectAttendee} size="small" />
            ))}
          </div>
          <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-zinc-950 to-transparent pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-zinc-950 to-transparent pointer-events-none" />
        </div>
      </div>
    </div>
  );
};

// Main Component
export default function EventPage() {
  const [scrollY, setScrollY] = useState(0);
  const [selectedAttendee, setSelectedAttendee] = useState(null);
  const [showFullGuestList, setShowFullGuestList] = useState(false);
  
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  // Offset by 0.4vh so slides activate when they're ~40% up the screen, not at the very top
  const activeSlide = Math.min(Math.floor((scrollY + vh * 0.4) / vh), 4);
  const progress = Math.min((scrollY / (vh * 8)) * 100, 100);
  const showDetails = scrollY > vh * 4.5;
  
  const confirmedAttendees = attendees.filter(a => a.status === 'confirmed');
  const maybeAttendees = attendees.filter(a => a.status === 'maybe');
  const invitedAttendees = attendees.filter(a => a.status === 'invited');

  return (
    <div className="bg-zinc-950 text-white min-h-screen">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-zinc-900 z-50">
        <div className="h-full bg-gradient-to-r from-amber-600 to-amber-500 transition-all duration-150" style={{ width: `${progress}%` }} />
      </div>
      
      {/* Scrollytelling Slides */}
      
      {/* Slide 1: The Wrong Question (consolidated setup + pivot) */}
      <div className={`min-h-screen flex items-center justify-center px-6 md:px-12 transition-opacity duration-700 ${activeSlide === 0 ? 'opacity-100' : 'opacity-20'}`}>
        <div className="text-center max-w-4xl">
          <p className="text-zinc-500 text-lg md:text-xl mb-6">Everyone keeps asking the same question:</p>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-medium leading-tight mb-8" style={{ fontFamily: 'Georgia, serif' }}>
            "How do we adopt AI into our organization?"
          </h1>
          <p className="text-zinc-400 text-lg md:text-xl mb-4">But that question assumes your current way of working is the foundation worth preserving.</p>
          <p className="text-2xl md:text-3xl font-medium" style={{ fontFamily: 'Georgia, serif' }}>
            It's not. <span className="text-amber-500">It's obsolete.</span>
          </p>
        </div>
      </div>
      
      {/* Slide 2: The Thesis with Dissolving Boundary visualization */}
      <div className={`min-h-screen flex items-center justify-center px-6 md:px-12 transition-opacity duration-700 ${activeSlide === 1 ? 'opacity-100' : 'opacity-20'}`}>
        <div className="text-center max-w-4xl">
          {/* Dissolving Boundary Visualization */}
          <div className="relative w-64 h-48 mx-auto mb-12">
            <svg viewBox="0 0 200 150" className="w-full h-full">
              {/* Main rectangle frame - dissolving edges */}
              <rect 
                x="20" y="15" width="160" height="120" 
                fill="none" 
                stroke="#D4A84B" 
                strokeWidth="2"
                strokeDasharray={activeSlide === 1 ? "4,8" : "200,0"}
                className="transition-all duration-1000"
                style={{ opacity: activeSlide === 1 ? 0.4 : 0.8 }}
              />
              
              {/* Particles floating off the edges */}
              {activeSlide === 1 && [...Array(16)].map((_, i) => {
                const positions = [
                  { cx: 20, cy: 15 + i * 8 }, { cx: 180, cy: 15 + i * 8 },
                  { cx: 20 + i * 11, cy: 15 }, { cx: 20 + i * 11, cy: 135 }
                ];
                const pos = positions[i % 4];
                const delay = i * 0.15;
                const dx = (Math.random() - 0.5) * 60;
                const dy = (Math.random() - 0.5) * 40;
                return (
                  <circle
                    key={i}
                    cx={pos?.cx || 100}
                    cy={pos?.cy || 75}
                    r="2"
                    fill="#D4A84B"
                    className="animate-pulse"
                    style={{
                      animation: `float-particle 3s ease-out ${delay}s infinite`,
                      opacity: 0.6,
                    }}
                  />
                );
              })}
              
              {/* Glowing center point */}
              <circle cx="100" cy="75" r="4" fill="#D4A84B" className="animate-pulse" style={{ filter: 'blur(2px)' }} />
              <circle cx="100" cy="75" r="2" fill="#fff" />
            </svg>
            
            {/* CSS for particle animation */}
            <style>{`
              @keyframes float-particle {
                0% { transform: translate(0, 0); opacity: 0.6; }
                50% { opacity: 0.8; }
                100% { transform: translate(var(--dx, 20px), var(--dy, -30px)); opacity: 0; }
              }
            `}</style>
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium leading-tight mb-6" style={{ fontFamily: 'Georgia, serif' }}>
            The constraints you're operating under <span className="text-amber-500">no longer exist.</span>
          </h1>
          <p className="text-2xl md:text-3xl lg:text-4xl font-medium leading-tight text-zinc-300" style={{ fontFamily: 'Georgia, serif' }}>
            Where you think there are edges, <span className="text-amber-500">there aren't.</span>
          </p>
        </div>
      </div>
      
      {/* Slide 3: The Gap with Shifted Venn visualization (consolidated evidence + problem) */}
      <div className={`min-h-screen flex items-center justify-center px-6 md:px-12 transition-opacity duration-700 ${activeSlide === 2 ? 'opacity-100' : 'opacity-20'}`}>
        <div className="text-center max-w-4xl">
          {/* Text first */}
          <p className="text-zinc-500 text-lg mb-6">Speed vs cost vs quality. What requires a developer. What's "feasible" for a small team.</p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-medium leading-tight mb-8" style={{ fontFamily: 'Georgia, serif' }}>
            Those lines have <span className="text-amber-500">moved dramatically.</span>
          </h2>
          <p className="text-xl md:text-2xl text-zinc-400 mb-12" style={{ fontFamily: 'Georgia, serif' }}>
            Most people are still making decisions based on a world that no longer exists.
          </p>
          
          {/* Shifted Venn Diagram Visualization - below text */}
          {(() => {
            // Convergence triggers after scrolling ~25% into this slide (after the initial reveal moment)
            const slideStart = vh * 1.6; // Adjusted to match earlier activation
            const convergenceThreshold = slideStart + (vh * 0.25);
            const isConverged = scrollY > convergenceThreshold;
            
            return (
              <div className="relative w-80 h-64 mx-auto">
                <svg viewBox="0 0 300 220" className="w-full h-full">
                  {/* Ghost outlines - old "pick two" positions */}
                  <circle cx="100" cy="90" r="55" fill="none" stroke="#3f3f46" strokeWidth="1" strokeDasharray="4,4" opacity="0.3" />
                  <circle cx="200" cy="90" r="55" fill="none" stroke="#3f3f46" strokeWidth="1" strokeDasharray="4,4" opacity="0.3" />
                  <circle cx="150" cy="165" r="55" fill="none" stroke="#3f3f46" strokeWidth="1" strokeDasharray="4,4" opacity="0.3" />
                  
                  {/* Animated circles - start separated, then converge */}
                  <circle 
                    cx={isConverged ? "150" : "100"} 
                    cy={isConverged ? "110" : "90"} 
                    r="55" 
                    fill="rgba(212, 168, 75, 0.12)" 
                    stroke="#D4A84B" 
                    strokeWidth="2"
                    className="transition-all duration-1000 ease-out"
                  />
                  <circle 
                    cx={isConverged ? "150" : "200"} 
                    cy={isConverged ? "110" : "90"} 
                    r="55" 
                    fill="rgba(74, 222, 128, 0.08)" 
                    stroke="#4ade80" 
                    strokeWidth="2"
                    className="transition-all duration-1000 ease-out"
                    style={{ transitionDelay: '100ms' }}
                  />
                  <circle 
                    cx="150" 
                    cy={isConverged ? "110" : "165"} 
                    r="55" 
                    fill="rgba(96, 165, 250, 0.08)" 
                    stroke="#60a5fa" 
                    strokeWidth="2"
                    className="transition-all duration-1000 ease-out"
                    style={{ transitionDelay: '200ms' }}
                  />
                  
                  {/* Labels - more spacing when converged */}
                  <text 
                    x={isConverged ? "150" : "100"} 
                    y={isConverged ? "90" : "85"} 
                    textAnchor="middle" 
                    fill="#D4A84B" 
                    fontSize="12" 
                    fontWeight="600"
                    letterSpacing="0.05em"
                    className="transition-all duration-1000"
                  >
                    SPEED
                  </text>
                  <text 
                    x={isConverged ? "150" : "200"} 
                    y={isConverged ? "112" : "85"} 
                    textAnchor="middle" 
                    fill="#4ade80" 
                    fontSize="12" 
                    fontWeight="600"
                    letterSpacing="0.05em"
                    className="transition-all duration-1000"
                    style={{ transitionDelay: '100ms' }}
                  >
                    COST
                  </text>
                  <text 
                    x="150" 
                    y={isConverged ? "134" : "170"} 
                    textAnchor="middle" 
                    fill="#60a5fa" 
                    fontSize="12" 
                    fontWeight="600"
                    letterSpacing="0.05em"
                    className="transition-all duration-1000"
                    style={{ transitionDelay: '200ms' }}
                  >
                    QUALITY
                  </text>
                  
                  {/* "All three" indicator - fades in after convergence */}
                  <text 
                    x="150" 
                    y="160" 
                    textAnchor="middle" 
                    fill="#fff" 
                    fontSize="11" 
                    fontWeight="500"
                    letterSpacing="0.1em"
                    className="transition-all duration-500"
                    style={{ 
                      opacity: isConverged ? 0.8 : 0,
                      transitionDelay: isConverged ? '800ms' : '0ms'
                    }}
                  >
                    ALL THREE
                  </text>
                </svg>
              </div>
            );
          })()}
        </div>
      </div>
      
      {/* Slide 4: The Reframe */}
      <div className={`min-h-screen flex items-center justify-center px-6 md:px-12 transition-opacity duration-700 ${activeSlide === 3 ? 'opacity-100' : 'opacity-20'}`}>
        <div className="text-center max-w-4xl">
          <p className="text-zinc-400 text-lg md:text-xl mb-8">The question isn't how to fit AI into what you're doing.</p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-medium leading-tight" style={{ fontFamily: 'Georgia, serif' }}>
            The question is: <span className="text-amber-500">what would you build if you started from scratch,</span> knowing what's now possible?
          </h2>
        </div>
      </div>
      
      {/* Slide 5: The Promise */}
      <div className={`min-h-screen flex items-center justify-center px-6 md:px-12 transition-opacity duration-700 ${activeSlide === 4 ? 'opacity-100' : 'opacity-20'}`} style={{ background: 'radial-gradient(ellipse at center, rgba(212, 168, 75, 0.06) 0%, transparent 70%)' }}>
        <div className="text-center max-w-3xl">
          <p className="text-amber-500 text-sm font-medium tracking-widest uppercase mb-8">March 30, 2025 • Austin, TX</p>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-medium mb-10" style={{ fontFamily: 'Georgia, serif' }}>
            This evening is about:
          </h2>
          <div className="space-y-4 text-left max-w-lg mx-auto mb-14">
            <div className="flex gap-4 items-baseline">
              <span className="text-white text-xl md:text-2xl font-medium" style={{ fontFamily: 'Georgia, serif' }}>1.</span>
              <p className="text-xl md:text-2xl lg:text-3xl text-zinc-300" style={{ fontFamily: 'Georgia, serif' }}>Breaking down that old mental model;</p>
            </div>
            <div className="flex gap-4 items-baseline">
              <span className="text-white text-xl md:text-2xl font-medium" style={{ fontFamily: 'Georgia, serif' }}>2.</span>
              <p className="text-xl md:text-2xl lg:text-3xl text-zinc-300" style={{ fontFamily: 'Georgia, serif' }}>Rebuilding it from first principles; and</p>
            </div>
            <div className="flex gap-4 items-baseline">
              <span className="text-amber-500 text-xl md:text-2xl font-medium" style={{ fontFamily: 'Georgia, serif' }}>3.</span>
              <p className="text-xl md:text-2xl lg:text-3xl text-white" style={{ fontFamily: 'Georgia, serif' }}>Learning to imagine <span className="text-amber-500">what's now possible.</span></p>
            </div>
          </div>
          
          {/* Event Name Reveal */}
          <div className="mb-12">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium text-amber-500 tracking-wide mb-3" style={{ fontFamily: 'Georgia, serif' }}>
              NO EDGES
            </h1>
            <p className="text-lg md:text-xl text-zinc-300 italic" style={{ fontFamily: 'Georgia, serif' }}>
              The lines have moved. Have you?
            </p>
          </div>
          
          <div className="animate-bounce text-zinc-600">↓</div>
        </div>
      </div>
      
      {/* Event Details */}
      <div className={`transition-opacity duration-700 ${showDetails ? 'opacity-100' : 'opacity-0'}`}>
        
        {/* Hero */}
        <section className="min-h-screen flex flex-col items-center justify-center px-6 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-64 bg-amber-500/5 rounded-full blur-3xl" />
          <div className="text-center relative z-10">
            <h1 className="text-6xl md:text-7xl lg:text-8xl text-white font-medium tracking-wide mb-2" style={{ fontFamily: 'Georgia, serif' }}>
              <span className="text-amber-500">NO</span> EDGES
            </h1>
            <p className="text-lg md:text-xl text-zinc-400 mb-6">A <span className="text-amber-500">33</span> Strategies Launch</p>
            <p className="text-xl md:text-2xl text-zinc-300 italic mb-10" style={{ fontFamily: 'Georgia, serif' }}>
              "The lines have moved. Have you?"
            </p>
            <div className="w-20 h-px bg-gradient-to-r from-transparent via-amber-500 to-transparent mx-auto my-8" />
            <p className="text-zinc-400 tracking-widest uppercase mb-1">March 30, 2025</p>
            <p className="text-zinc-500 tracking-widest uppercase mb-1">Austin, Texas</p>
            <p className="text-zinc-600 tracking-widest uppercase mb-10">3PM — 10PM</p>
            <button className="px-8 py-4 bg-amber-500 text-black font-semibold rounded-xl hover:bg-amber-400 transition-colors">Request an Invitation</button>
          </div>
        </section>
        
        {/* Venue */}
        <section className="py-20 px-6 md:px-12">
          <div className="max-w-5xl mx-auto">
            <p className="text-amber-500 text-sm font-medium tracking-widest uppercase mb-4">The Venue</p>
            <h2 className="text-3xl md:text-4xl text-white font-medium mb-8" style={{ fontFamily: 'Georgia, serif' }}>Where Ideas Take Shape</h2>
            <div className="aspect-video bg-zinc-900 rounded-3xl mb-4 overflow-hidden border border-zinc-800 flex items-center justify-center">
              <div className="text-center text-zinc-700">
                <div className="text-4xl mb-2 opacity-50">📍</div>
                <p className="text-sm">Venue Photography Coming Soon</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[1,2,3].map(i => (
                <div key={i} className="aspect-video bg-zinc-900 rounded-xl border border-zinc-800 flex items-center justify-center text-zinc-700 text-2xl opacity-50">◻</div>
              ))}
            </div>
            <p className="text-zinc-500 text-center"><span className="text-white">Venue Name</span> • 123 Example Street • Austin, TX</p>
          </div>
        </section>
        
        {/* Who's Coming - Carousel Version */}
        <section className="py-20 bg-zinc-900/30">
          <div className="max-w-6xl mx-auto">
            <div className="px-6 md:px-12 mb-10">
              <p className="text-amber-500 text-sm font-medium tracking-widest uppercase mb-4">The Room</p>
              <h2 className="text-3xl md:text-4xl text-white font-medium" style={{ fontFamily: 'Georgia, serif' }}>Who's Coming</h2>
            </div>
            
            {/* Confirmed Carousel */}
            <AttendeeCarousel 
              title="Confirmed" 
              subtitle="They're in. Are you?"
              attendees={confirmedAttendees}
              statusColor="bg-emerald-500"
              onSelectAttendee={setSelectedAttendee}
            />
            
            {/* Maybe Carousel */}
            <AttendeeCarousel 
              title="Maybe" 
              subtitle="Still deciding"
              attendees={maybeAttendees}
              statusColor="bg-amber-500"
              onSelectAttendee={setSelectedAttendee}
            />
            
            {/* Invited - Collapsible */}
            <InvitedSection 
              attendees={invitedAttendees}
              onSelectAttendee={setSelectedAttendee}
            />
            
            {/* View Full Guest List Button */}
            <div className="text-center pt-6">
              <button 
                onClick={() => setShowFullGuestList(true)}
                className="px-6 py-3 border border-zinc-700 text-zinc-400 rounded-xl hover:border-zinc-600 hover:text-white transition-colors"
              >
                View Full Guest List
              </button>
            </div>
          </div>
        </section>
        
        {/* What to Expect */}
        <section className="py-20 px-6 md:px-12 bg-zinc-900/30">
          <div className="max-w-5xl mx-auto">
            <p className="text-amber-500 text-sm font-medium tracking-widest uppercase mb-4">The Evening</p>
            <h2 className="text-3xl md:text-4xl text-white font-medium mb-6" style={{ fontFamily: 'Georgia, serif' }}>What to Expect</h2>
            <p className="text-zinc-400 text-lg max-w-2xl mb-10">An intimate gathering of 40-50 founders, operators, and builders exploring what becomes possible when you throw out the old playbook.</p>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { icon: '◆', title: 'Sessions', desc: 'Fireside conversations and panels with builders who\'ve seen the lines move firsthand.' },
                { icon: '◆', title: 'Connections', desc: 'AI-curated introductions through our M33T platform. Every connection is intentional.' },
                { icon: '◆', title: 'Dinner', desc: 'Curated seating with purpose. Your table isn\'t random — it\'s designed to spark conversations.' },
                { icon: '◆', title: 'Demos', desc: 'Live product showcases proving the thesis. See what gets built when constraints disappear.' }
              ].map((f, i) => (
                <div key={i} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-colors">
                  <div className="text-amber-500 text-xl mb-3">{f.icon}</div>
                  <h3 className="text-white font-medium mb-2">{f.title}</h3>
                  <p className="text-zinc-500 text-sm">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        
        {/* Schedule */}
        <section className="py-20 px-6 md:px-12">
          <div className="max-w-3xl mx-auto">
            <p className="text-amber-500 text-sm font-medium tracking-widest uppercase mb-4">The Agenda</p>
            <h2 className="text-3xl md:text-4xl text-white font-medium mb-10" style={{ fontFamily: 'Georgia, serif' }}>How the Evening Unfolds</h2>
            <div className="space-y-4">
              {schedule.map((item, i) => (
                <div key={i} className="flex gap-6 pb-4 border-b border-zinc-800 last:border-0">
                  <span className="text-amber-500 font-mono text-sm w-12 flex-shrink-0">{item.time}</span>
                  <div>
                    <h3 className="text-white font-medium mb-1">{item.title}</h3>
                    <p className="text-zinc-500 text-sm">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        
        {/* Host */}
        <section className="py-20 px-6 md:px-12">
          <div className="max-w-3xl mx-auto">
            <p className="text-amber-500 text-sm font-medium tracking-widest uppercase mb-4">Your Host</p>
            <h2 className="text-3xl md:text-4xl text-white font-medium mb-8" style={{ fontFamily: 'Georgia, serif' }}>Mbiyimoh Ghogomu</h2>
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center text-2xl font-medium text-zinc-500 flex-shrink-0">MG</div>
              <div>
                <p className="text-zinc-400 mb-2">Founder, 33 Strategies • CEO, TradeBlock</p>
                <blockquote className="text-xl text-white leading-relaxed mb-4" style={{ fontFamily: 'Georgia, serif' }}>
                  "I learned AI fighting for my company's life. Now I help other founders see what's possible when you throw out the old constraints."
                </blockquote>
                <p className="text-zinc-500 text-sm">One person. Four products. Weeks, not months. No dev background. While running another company.</p>
              </div>
            </div>
          </div>
        </section>
        
        {/* Footer CTA */}
        <section className="py-24 px-6 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-56 bg-amber-500/5 rounded-full blur-3xl" />
          <div className="max-w-2xl mx-auto text-center relative z-10">
            <blockquote className="text-2xl md:text-3xl text-white mb-10 leading-relaxed" style={{ fontFamily: 'Georgia, serif' }}>
              "Where you think there are edges, <span className="text-amber-500">there aren't.</span>"
            </blockquote>
            <button className="px-10 py-5 bg-amber-500 text-black font-semibold rounded-xl hover:bg-amber-400 transition-colors text-lg">Request an Invitation</button>
            <div className="w-20 h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent mx-auto my-12" />
            <div className="mb-2">
              <span className="text-2xl md:text-3xl text-white font-medium tracking-wide" style={{ fontFamily: 'Georgia, serif' }}>
                <span className="text-amber-500">NO</span> EDGES
              </span>
            </div>
            <p className="text-zinc-500 text-sm mb-1">A <span className="text-amber-500">33</span> Strategies Launch</p>
            <p className="text-zinc-600 text-sm">March 30, 2025 • Austin, TX</p>
          </div>
        </section>
      </div>
      
      {/* Modals */}
      <ProfileModal attendee={selectedAttendee} onClose={() => setSelectedAttendee(null)} />
      <FullGuestListModal 
        isOpen={showFullGuestList} 
        onClose={() => setShowFullGuestList(false)} 
        attendees={attendees}
        onSelectAttendee={(a) => { setShowFullGuestList(false); setSelectedAttendee(a); }}
      />
    </div>
  );
}
