import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Play, SkipForward, Clock, AlertCircle, Check,
  ChevronRight, Filter, TrendingUp, Users, Zap, ArrowRight,
  Calendar, Mail, User
} from 'lucide-react';

// ============================================================================
// DESIGN TOKENS
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
    relationship: { bg: 'rgba(59, 130, 246, 0.2)', text: '#60A5FA' },
    opportunity: { bg: 'rgba(34, 197, 94, 0.2)', text: '#4ADE80' },
    expertise: { bg: 'rgba(168, 85, 247, 0.2)', text: '#C084FC' },
    interest: { bg: 'rgba(245, 158, 11, 0.2)', text: '#FBBF24' },
  },
  border: 'rgba(255, 255, 255, 0.08)',
  success: '#4ADE80',
  warning: '#FBBF24',
  error: '#EF4444',
};

// ============================================================================
// SAMPLE DATA
// ============================================================================

const sampleQueueContacts = [
  {
    id: '1',
    name: 'Marcus Chen',
    email: 'marcus@acme.io',
    title: 'Founder & CEO',
    company: 'Acme Corp',
    reason: 'Added 2 days ago — no context captured yet',
    priority: 'high',
    enrichmentScore: 15,
    addedDate: new Date('2024-12-06'),
    source: 'manual',
  },
  {
    id: '2',
    name: 'Lisa Wong',
    email: 'lisa@bigtech.com',
    title: 'VP Engineering',
    company: 'BigTech Inc',
    reason: 'Only has email — needs relationship context',
    priority: 'high',
    enrichmentScore: 22,
    addedDate: new Date('2024-12-05'),
    source: 'csv',
  },
  {
    id: '3',
    name: 'James Miller',
    email: 'james@startup.co',
    title: 'Co-founder',
    company: 'Startup Co',
    reason: 'Imported from CSV — missing key details',
    priority: 'medium',
    enrichmentScore: 30,
    addedDate: new Date('2024-12-01'),
    source: 'csv',
  },
  {
    id: '4',
    name: 'Rachel Green',
    email: 'rachel@venture.vc',
    title: 'Principal',
    company: 'Venture Capital',
    reason: 'No "Why Now" context — add relevance',
    priority: 'medium',
    enrichmentScore: 45,
    addedDate: new Date('2024-11-28'),
    source: 'manual',
  },
  {
    id: '5',
    name: 'Tom Bradley',
    email: 'tom@agency.co',
    title: 'Creative Director',
    company: 'The Agency',
    reason: 'Missing expertise and interests',
    priority: 'low',
    enrichmentScore: 52,
    addedDate: new Date('2024-11-20'),
    source: 'google',
  },
  {
    id: '6',
    name: 'Nina Patel',
    email: 'nina@consulting.com',
    title: 'Partner',
    company: 'Strategy Co',
    reason: 'Relationship history incomplete',
    priority: 'low',
    enrichmentScore: 58,
    addedDate: new Date('2024-11-15'),
    source: 'linkedin',
  },
];

const stats = {
  total: 142,
  enriched: 95,
  pending: 47,
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const getInitials = (name) => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

const getRelativeTime = (date) => {
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
};

// ============================================================================
// SHARED COMPONENTS
// ============================================================================

const GlassCard = ({ children, style = {}, onClick, hover = false }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: isHovered && hover ? colors.bg.tertiary : colors.bg.glass,
        backdropFilter: 'blur(20px)',
        borderRadius: 12,
        border: `1px solid ${isHovered && hover ? 'rgba(255,255,255,0.12)' : colors.border}`,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.15s ease',
        ...style,
      }}
    >
      {children}
    </div>
  );
};

const Avatar = ({ name, size = 44 }) => {
  const initials = getInitials(name);
  const hue = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360;
  
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: `linear-gradient(135deg, hsl(${hue}, 60%, 40%), hsl(${(hue + 60) % 360}, 60%, 30%))`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: size * 0.38,
      fontWeight: 600,
      color: 'rgba(255,255,255,0.9)',
      flexShrink: 0,
    }}>
      {initials}
    </div>
  );
};

const Button = ({ children, variant = 'primary', size = 'md', onClick, disabled, style = {} }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const variants = {
    primary: {
      background: isHovered ? colors.gold.light : colors.gold.primary,
      color: '#000',
      fontWeight: 600,
    },
    secondary: {
      background: isHovered ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.08)',
      color: '#fff',
    },
    ghost: {
      background: isHovered ? 'rgba(255,255,255,0.05)' : 'transparent',
      color: isHovered ? '#fff' : colors.text.secondary,
    },
  };
  
  const sizes = {
    sm: { padding: '8px 14px', fontSize: 13 },
    md: { padding: '12px 20px', fontSize: 14 },
    lg: { padding: '16px 32px', fontSize: 15 },
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
        transition: 'all 0.15s ease',
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

const PriorityBadge = ({ priority }) => {
  const styles = {
    high: { bg: 'rgba(239, 68, 68, 0.15)', color: colors.error, label: 'High Priority' },
    medium: { bg: 'rgba(251, 191, 36, 0.15)', color: colors.warning, label: 'Medium' },
    low: { bg: 'rgba(255, 255, 255, 0.08)', color: colors.text.tertiary, label: 'Low' },
  };
  
  const s = styles[priority] || styles.low;
  
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '4px 8px',
      borderRadius: 6,
      fontSize: 11,
      fontWeight: 600,
      background: s.bg,
      color: s.color,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    }}>
      {priority === 'high' && <Zap size={10} />}
      {s.label}
    </span>
  );
};

const SourceBadge = ({ source }) => {
  const labels = {
    manual: 'Manual',
    csv: 'CSV Import',
    google: 'Google',
    linkedin: 'LinkedIn',
    icloud: 'iCloud',
  };
  
  return (
    <span style={{
      fontSize: 11,
      color: colors.text.tertiary,
      background: 'rgba(255,255,255,0.05)',
      padding: '2px 6px',
      borderRadius: 4,
    }}>
      {labels[source] || source}
    </span>
  );
};

// ============================================================================
// STATS CARD
// ============================================================================

const StatsCard = ({ stats }) => {
  const percentage = Math.round((stats.enriched / stats.total) * 100);
  
  return (
    <GlassCard style={{ padding: 24, marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: colors.text.secondary, margin: '0 0 4px 0' }}>
            Enrichment Progress
          </h3>
          <p style={{ fontSize: 28, fontWeight: 700, color: '#fff', margin: 0 }}>
            {percentage}% <span style={{ fontSize: 14, fontWeight: 400, color: colors.text.tertiary }}>complete</span>
          </p>
        </div>
        <div style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: colors.gold.subtle,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Sparkles size={28} color={colors.gold.primary} />
        </div>
      </div>
      
      {/* Progress Bar */}
      <div style={{
        height: 8,
        background: 'rgba(255,255,255,0.1)',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 16,
      }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          style={{
            height: '100%',
            background: `linear-gradient(90deg, ${colors.gold.primary}, ${colors.gold.light})`,
            borderRadius: 4,
          }}
        />
      </div>
      
      {/* Stats Row */}
      <div style={{ display: 'flex', gap: 32 }}>
        <div>
          <p style={{ fontSize: 12, color: colors.text.tertiary, margin: '0 0 2px 0' }}>Total Contacts</p>
          <p style={{ fontSize: 18, fontWeight: 600, color: '#fff', margin: 0 }}>{stats.total}</p>
        </div>
        <div>
          <p style={{ fontSize: 12, color: colors.text.tertiary, margin: '0 0 2px 0' }}>Enriched</p>
          <p style={{ fontSize: 18, fontWeight: 600, color: colors.success, margin: 0 }}>{stats.enriched}</p>
        </div>
        <div>
          <p style={{ fontSize: 12, color: colors.text.tertiary, margin: '0 0 2px 0' }}>Need Attention</p>
          <p style={{ fontSize: 18, fontWeight: 600, color: colors.warning, margin: 0 }}>{stats.pending}</p>
        </div>
      </div>
    </GlassCard>
  );
};

// ============================================================================
// QUEUE ITEM CARD
// ============================================================================

const QueueItemCard = ({ contact, rank, onEnrich, onSkip }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.05 }}
    >
      <GlassCard
        hover
        style={{ padding: 20, marginBottom: 12 }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div style={{ display: 'flex', gap: 16 }}>
          {/* Rank */}
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: rank <= 3 ? colors.gold.subtle : 'rgba(255,255,255,0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            fontWeight: 600,
            color: rank <= 3 ? colors.gold.primary : colors.text.tertiary,
            flexShrink: 0,
          }}>
            {rank}
          </div>
          
          {/* Avatar */}
          <Avatar name={contact.name} size={44} />
          
          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#fff', margin: 0 }}>
                {contact.name}
              </h3>
              <PriorityBadge priority={contact.priority} />
            </div>
            
            <p style={{ fontSize: 14, color: colors.text.secondary, margin: '0 0 8px 0' }}>
              {contact.title} · {contact.company}
            </p>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 6, 
                fontSize: 13, 
                color: colors.warning,
                background: 'rgba(251, 191, 36, 0.1)',
                padding: '4px 8px',
                borderRadius: 6,
              }}>
                <AlertCircle size={12} />
                {contact.reason}
              </span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
              <span style={{ fontSize: 12, color: colors.text.tertiary, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Calendar size={12} /> Added {getRelativeTime(contact.addedDate)}
              </span>
              <SourceBadge source={contact.source} />
              <span style={{ fontSize: 12, color: colors.text.tertiary }}>
                Score: <span style={{ color: contact.enrichmentScore < 30 ? colors.error : colors.warning }}>{contact.enrichmentScore}%</span>
              </span>
            </div>
          </div>
          
          {/* Actions */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 8,
            opacity: isHovered ? 1 : 0.7,
            transition: 'opacity 0.15s ease',
          }}>
            <Button size="sm" onClick={() => onEnrich?.(contact)}>
              <Sparkles size={14} /> Enrich
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onSkip?.(contact)}>
              <SkipForward size={14} /> Skip
            </Button>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
};

// ============================================================================
// EMPTY STATE
// ============================================================================

const EmptyState = () => (
  <div style={{ 
    textAlign: 'center', 
    padding: 60,
  }}>
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      style={{
        width: 80,
        height: 80,
        borderRadius: '50%',
        background: 'rgba(74, 222, 128, 0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 20px',
      }}
    >
      <Check size={40} color={colors.success} />
    </motion.div>
    
    <h3 style={{ fontSize: 22, fontWeight: 600, color: '#fff', marginBottom: 8 }}>
      All caught up!
    </h3>
    <p style={{ fontSize: 15, color: colors.text.secondary, marginBottom: 24 }}>
      Every contact has been enriched. Nice work! 🎉
    </p>
    <Button variant="secondary" onClick={() => console.log('View contacts')}>
      <Users size={18} /> View All Contacts
    </Button>
  </div>
);

// ============================================================================
// FILTER TABS
// ============================================================================

const FilterTabs = ({ activeFilter, onFilterChange }) => {
  const filters = [
    { id: 'all', label: 'All', count: 47 },
    { id: 'high', label: 'High Priority', count: 12 },
    { id: 'recent', label: 'Recently Added', count: 18 },
    { id: 'imported', label: 'From Import', count: 23 },
  ];
  
  return (
    <div style={{ 
      display: 'flex', 
      gap: 8, 
      marginBottom: 20,
      overflowX: 'auto',
      paddingBottom: 4,
    }}>
      {filters.map(filter => (
        <button
          key={filter.id}
          onClick={() => onFilterChange(filter.id)}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: 'none',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: activeFilter === filter.id ? colors.gold.primary : 'rgba(255,255,255,0.05)',
            color: activeFilter === filter.id ? '#000' : colors.text.secondary,
          }}
        >
          {filter.label}
          <span style={{
            background: activeFilter === filter.id ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.1)',
            padding: '2px 6px',
            borderRadius: 4,
            fontSize: 11,
          }}>
            {filter.count}
          </span>
        </button>
      ))}
    </div>
  );
};

// ============================================================================
// ENRICHMENT QUEUE PAGE
// ============================================================================

const EnrichmentQueuePage = ({ onStartSession, onEnrichContact, onSkipContact }) => {
  const [activeFilter, setActiveFilter] = useState('all');
  const [queue, setQueue] = useState(sampleQueueContacts);
  
  const handleSkip = (contact) => {
    setQueue(prev => prev.filter(c => c.id !== contact.id));
    onSkipContact?.(contact);
  };
  
  const handleEnrich = (contact) => {
    onEnrichContact?.(contact);
  };
  
  const filteredQueue = queue.filter(contact => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'high') return contact.priority === 'high';
    if (activeFilter === 'recent') {
      const daysDiff = (new Date() - contact.addedDate) / (1000 * 60 * 60 * 24);
      return daysDiff <= 7;
    }
    if (activeFilter === 'imported') return contact.source === 'csv';
    return true;
  });
  
  return (
    <div style={{
      minHeight: '100vh',
      background: colors.bg.primary,
      color: '#fff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 4px 0' }}>
              Enrichment Queue
            </h1>
            <p style={{ fontSize: 15, color: colors.text.secondary, margin: 0 }}>
              {stats.pending} contacts need your attention
            </p>
          </div>
          <Button onClick={onStartSession} size="lg">
            <Play size={18} /> Start Session
          </Button>
        </div>
        
        {/* Stats */}
        <StatsCard stats={stats} />
        
        {/* Filters */}
        <FilterTabs activeFilter={activeFilter} onFilterChange={setActiveFilter} />
        
        {/* Queue List */}
        {filteredQueue.length === 0 ? (
          <GlassCard style={{ marginTop: 20 }}>
            <EmptyState />
          </GlassCard>
        ) : (
          <div>
            {filteredQueue.map((contact, index) => (
              <QueueItemCard
                key={contact.id}
                contact={contact}
                rank={index + 1}
                onEnrich={handleEnrich}
                onSkip={handleSkip}
              />
            ))}
            
            {/* Load More */}
            {filteredQueue.length >= 6 && (
              <div style={{ textAlign: 'center', marginTop: 20 }}>
                <Button variant="ghost">
                  Show more contacts <ChevronRight size={16} />
                </Button>
              </div>
            )}
          </div>
        )}
        
        {/* Tip Card */}
        <GlassCard style={{ padding: 20, marginTop: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: 'rgba(168, 85, 247, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <TrendingUp size={22} color="#C084FC" />
          </div>
          <div style={{ flex: 1 }}>
            <h4 style={{ fontSize: 14, fontWeight: 600, color: '#fff', margin: '0 0 2px 0' }}>
              Pro tip: Build a streak
            </h4>
            <p style={{ fontSize: 13, color: colors.text.secondary, margin: 0 }}>
              Enrich 5 contacts in a row to build momentum. Small sessions add up over time.
            </p>
          </div>
          <Button variant="ghost" size="sm">
            Start Streak <ArrowRight size={14} />
          </Button>
        </GlassCard>
      </div>
    </div>
  );
};

// ============================================================================
// DEMO WRAPPER
// ============================================================================

const EnrichmentQueueDemo = () => {
  return (
    <EnrichmentQueuePage 
      onStartSession={() => console.log('Start enrichment session')}
      onEnrichContact={(c) => console.log('Enrich:', c.name)}
      onSkipContact={(c) => console.log('Skip:', c.name)}
    />
  );
};

export default EnrichmentQueueDemo;
