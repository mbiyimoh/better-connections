import React, { useState } from 'react';
import { Search, ChevronDown, ChevronRight, Check, Users, Sparkles, RefreshCw, GripVertical, X, Edit3, Plus, MessageSquare, Target, Briefcase, Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const gold = '#D4A84B';

const mockAttendees = [
  {
    id: 1, name: 'Sarah Chen', role: 'Founder & CEO', company: 'Nexus AI', rsvpStatus: 'confirmed', interviewComplete: true,
    goals: ['Find Series A investors', 'Meet AI implementation experts'], expertise: ['AI/ML', 'Product Strategy', 'Enterprise Sales'],
    matches: [
      { id: 101, matchId: 2, name: 'Marcus Williams', role: 'Managing Partner', company: 'Foundry Capital', position: 1, score: 94, scoreBreakdown: { goalAlignment: 98, expertiseFit: 92, relationship: 85, availability: 100 }, whyMatch: ['Marcus actively invests in AI/ML at Series A', 'Previous portfolio includes similar enterprise tools', 'Both available for 1:1 during networking hour'], conversationStarters: ['Ask about his thesis on vertical AI', 'Discuss enterprise sales motion challenges'], collaborationPotential: 'High potential for investment discussion', status: 'pending', isManual: false, isLateAddition: false },
      { id: 102, matchId: 5, name: 'James Liu', role: 'CTO', company: 'DataFlow', position: 2, score: 89, scoreBreakdown: { goalAlignment: 85, expertiseFit: 95, relationship: 90, availability: 85 }, whyMatch: ['Both building AI-native products', 'Complementary technical backgrounds', 'James has fundraising experience to share'], conversationStarters: ['Compare approaches to data pipeline architecture', 'Discuss Austin tech scene growth'], collaborationPotential: 'Technical partnership or advisor relationship', status: 'approved', isManual: false, isLateAddition: false },
      { id: 103, matchId: 8, name: 'Elena Rodriguez', role: 'Founder', company: 'Acme Labs', position: 3, score: 82, scoreBreakdown: { goalAlignment: 78, expertiseFit: 88, relationship: 75, availability: 90 }, whyMatch: ['Both Austin-based founders', 'Elena has strong GTM expertise Sarah needs', 'Similar stage companies can share learnings'], conversationStarters: ['Ask about her Salesforce-to-founder journey', 'Compare B2B sales strategies'], collaborationPotential: 'Peer mentorship and local founder support', status: 'pending', isManual: false, isLateAddition: false },
    ],
  },
  { id: 2, name: 'Marcus Williams', role: 'Managing Partner', company: 'Foundry Capital', rsvpStatus: 'confirmed', interviewComplete: true, goals: ['Find AI-native startups to invest', 'Meet technical founders'], expertise: ['Investing', 'Board Governance', 'Fundraising Strategy'], matches: [{ id: 201, matchId: 1, name: 'Sarah Chen', role: 'Founder & CEO', company: 'Nexus AI', position: 1, score: 96, scoreBreakdown: { goalAlignment: 99, expertiseFit: 94, relationship: 90, availability: 100 }, whyMatch: ['Sarah is raising Series A in AI/ML space', 'Enterprise focus matches Marcus\'s thesis', 'Strong founder-market fit'], conversationStarters: ['Ask about her Google ML background', 'Discuss enterprise automation market size'], collaborationPotential: 'High-probability investment opportunity', status: 'approved', isManual: false, isLateAddition: false }] },
  { id: 3, name: 'David Park', role: 'Angel Investor', company: 'Independent', rsvpStatus: 'maybe', interviewComplete: true, goals: ['Source early-stage deals'], expertise: ['Engineering Leadership', 'Angel Investing'], matches: [] },
  { id: 4, name: 'Lisa Wang', role: 'VP Engineering', company: 'Stripe', rsvpStatus: 'confirmed', interviewComplete: false, goals: [], expertise: ['Engineering Management', 'ML Infrastructure'], matches: [] },
  { id: 5, name: 'Robert Kim', role: 'Partner', company: 'a16z', rsvpStatus: 'no-response', interviewComplete: false, goals: [], expertise: [], matches: [] },
];

const StatusBadge = ({ status }) => {
  const styles = { confirmed: { bg: 'rgba(74,222,128,0.2)', color: '#4ade80' }, maybe: { bg: 'rgba(251,191,36,0.2)', color: '#fbbf24' }, 'no-response': { bg: 'rgba(113,113,122,0.2)', color: '#71717a' }, declined: { bg: 'rgba(239,68,68,0.2)', color: '#ef4444' } };
  const labels = { confirmed: 'Confirmed', maybe: 'Maybe', 'no-response': 'No Response', declined: 'Declined' };
  return <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: styles[status].bg, color: styles[status].color }}>{labels[status]}</span>;
};

const ScoreBreakdown = ({ breakdown }) => {
  const categories = [{ key: 'goalAlignment', label: 'Goal Alignment', color: gold }, { key: 'expertiseFit', label: 'Expertise Fit', color: '#4ade80' }, { key: 'relationship', label: 'Relationship', color: '#60a5fa' }, { key: 'availability', label: 'Availability', color: '#a78bfa' }];
  return (
    <div className="space-y-2">
      {categories.map(cat => (
        <div key={cat.key} className="flex items-center gap-2">
          <span className="text-xs w-24" style={{ color: '#71717a' }}>{cat.label}</span>
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#3f3f46' }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${breakdown[cat.key]}%`, backgroundColor: cat.color }} />
          </div>
          <span className="text-xs w-8" style={{ color: '#a1a1aa' }}>{breakdown[cat.key]}%</span>
        </div>
      ))}
    </div>
  );
};

const MatchCard = ({ match, onApprove, onRemove, onEdit }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-xl transition-all duration-200 relative" style={{ backgroundColor: '#18181b', border: match.status === 'approved' ? '1px solid rgba(74,222,128,0.5)' : '1px solid #3f3f46' }}>
      {match.isLateAddition && <div className="absolute -top-2 -right-2 px-2 py-0.5 text-xs font-medium rounded-full" style={{ backgroundColor: gold, color: 'black' }}>Late Addition</div>}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="cursor-grab mt-1" style={{ color: '#71717a' }}><GripVertical size={16} /></div>
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-medium" style={{ background: 'linear-gradient(135deg, rgba(212,168,75,0.3), rgba(212,168,75,0.1))', color: gold }}>{match.name.split(' ').map(n => n[0]).join('')}</div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: '#09090b' }}><span className="text-xs font-bold" style={{ color: gold }}>#{match.position}</span></div>
                </div>
                <div><h4 className="text-white font-medium">{match.name}</h4><p className="text-sm" style={{ color: '#71717a' }}>{match.role}, {match.company}</p></div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold" style={{ color: match.score >= 90 ? '#4ade80' : match.score >= 80 ? gold : '#a1a1aa' }}>{match.score}%</div>
                <div className="text-xs" style={{ color: '#71717a' }}>match score</div>
              </div>
            </div>
            <div className="mt-3 p-3 rounded-lg" style={{ backgroundColor: '#09090b' }}>
              <div className="text-xs font-medium uppercase tracking-wider mb-1.5 flex items-center gap-1" style={{ color: gold }}><Sparkles size={12} />Why This Match</div>
              <ul className="space-y-1">{match.whyMatch.slice(0, 2).map((reason, i) => <li key={i} className="text-sm flex items-start gap-2" style={{ color: '#a1a1aa' }}><span style={{ color: '#4ade80' }}>•</span>{reason}</li>)}</ul>
            </div>
            <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 mt-3 text-xs transition-colors" style={{ color: '#71717a' }}>
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}{expanded ? 'Hide details' : 'Show score breakdown & conversation starters'}
            </button>
            {expanded && (
              <div className="mt-3 space-y-4">
                <ScoreBreakdown breakdown={match.scoreBreakdown} />
                <div>
                  <div className="text-xs font-medium uppercase tracking-wider mb-2 flex items-center gap-1" style={{ color: '#71717a' }}><MessageSquare size={12} />Conversation Starters</div>
                  <div className="space-y-1.5">{match.conversationStarters.map((starter, i) => <div key={i} className="text-sm p-2 rounded-lg" style={{ backgroundColor: '#27272a', color: '#a1a1aa' }}>"{starter}"</div>)}</div>
                </div>
                <div className="p-3 rounded-lg" style={{ backgroundColor: '#27272a' }}>
                  <div className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: '#71717a' }}>Collaboration Potential</div>
                  <p className="text-sm" style={{ color: '#a1a1aa' }}>{match.collaborationPotential}</p>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4 pt-3" style={{ borderTop: '1px solid #3f3f46' }}>
          {match.status === 'approved' ? (
            <div className="flex items-center gap-2 text-sm" style={{ color: '#4ade80' }}><CheckCircle size={16} /><span>Approved — Locked</span></div>
          ) : (
            <>
              <button onClick={() => onApprove(match.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors" style={{ backgroundColor: 'rgba(74,222,128,0.2)', color: '#4ade80' }}><Check size={14} />Approve</button>
              <button onClick={() => onRemove(match.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors" style={{ backgroundColor: 'rgba(239,68,68,0.2)', color: '#ef4444' }}><X size={14} />Remove</button>
            </>
          )}
          <button onClick={() => onEdit(match.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ml-auto" style={{ backgroundColor: '#27272a', color: '#a1a1aa' }}><Edit3 size={14} />Edit Reason</button>
        </div>
      </div>
    </div>
  );
};

const AttendeeRow = ({ attendee, isSelected, onClick }) => (
  <button onClick={onClick} className="w-full p-3 rounded-xl text-left transition-all" style={{ backgroundColor: isSelected ? 'rgba(212,168,75,0.1)' : '#18181b', border: isSelected ? `1px solid rgba(212,168,75,0.5)` : '1px solid #3f3f46' }}>
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full flex items-center justify-center font-medium" style={{ backgroundColor: '#27272a', color: '#a1a1aa' }}>{attendee.name.split(' ').map(n => n[0]).join('')}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2"><h4 className="text-white font-medium truncate">{attendee.name}</h4><StatusBadge status={attendee.rsvpStatus} /></div>
        <p className="text-sm truncate" style={{ color: '#71717a' }}>{attendee.role}, {attendee.company}</p>
      </div>
    </div>
    <div className="flex items-center gap-3 mt-2 text-xs">
      <span className="flex items-center gap-1" style={{ color: attendee.interviewComplete ? '#4ade80' : '#71717a' }}>{attendee.interviewComplete ? <CheckCircle size={12} /> : <Clock size={12} />}{attendee.interviewComplete ? 'Interview done' : 'Awaiting interview'}</span>
      <span style={{ color: '#71717a' }}>{attendee.matches.length} matches</span>
    </div>
  </button>
);

export default function CurateConnectionsDashboard() {
  const [attendees, setAttendees] = useState(mockAttendees);
  const [selectedAttendee, setSelectedAttendee] = useState(mockAttendees[0]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);

  const filteredAttendees = attendees.filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase()) || a.company.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || a.rsvpStatus === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const statusCounts = { all: attendees.length, confirmed: attendees.filter(a => a.rsvpStatus === 'confirmed').length, maybe: attendees.filter(a => a.rsvpStatus === 'maybe').length, 'no-response': attendees.filter(a => a.rsvpStatus === 'no-response').length };

  const handleApproveMatch = (matchId) => {
    setAttendees(prev => prev.map(a => ({ ...a, matches: a.matches.map(m => m.id === matchId ? { ...m, status: 'approved' } : m) })));
    setSelectedAttendee(prev => ({ ...prev, matches: prev.matches.map(m => m.id === matchId ? { ...m, status: 'approved' } : m) }));
  };

  const handleRemoveMatch = (matchId) => {
    setAttendees(prev => prev.map(a => ({ ...a, matches: a.matches.filter(m => m.id !== matchId) })));
    setSelectedAttendee(prev => ({ ...prev, matches: prev.matches.filter(m => m.id !== matchId) }));
  };

  const handleRegenerate = () => { setIsRegenerating(true); setTimeout(() => setIsRegenerating(false), 2000); };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#09090b', color: 'white' }}>
      <div style={{ borderBottom: '1px solid #3f3f46', backgroundColor: '#18181b' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div><h1 className="text-2xl font-semibold">AI Summit 2025 — <span style={{ color: gold }}>Curate Connections</span></h1><p className="text-sm mt-1" style={{ color: '#71717a' }}>Review and refine AI-generated matches for each attendee</p></div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ backgroundColor: '#27272a' }}><div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#4ade80' }} /><span className="text-sm" style={{ color: '#a1a1aa' }}>Real-time updates</span></div>
              <button onClick={handleRegenerate} disabled={isRegenerating} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium" style={{ backgroundColor: gold, color: 'black', opacity: isRegenerating ? 0.5 : 1 }}>{isRegenerating ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}Regenerate All</button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={18} style={{ color: '#71717a' }} />
              <input type="text" placeholder="Search attendees..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl text-white text-sm" style={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }} />
            </div>
            <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}>
              {[{ key: 'all', label: 'All' }, { key: 'confirmed', label: 'Confirmed' }, { key: 'maybe', label: 'Maybe' }, { key: 'no-response', label: 'Pending' }].map(tab => (
                <button key={tab.key} onClick={() => setFilterStatus(tab.key)} className="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all" style={{ backgroundColor: filterStatus === tab.key ? gold : 'transparent', color: filterStatus === tab.key ? 'black' : '#71717a' }}>{tab.label}<span className="ml-1 opacity-60">({statusCounts[tab.key]})</span></button>
              ))}
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {filteredAttendees.map(attendee => <AttendeeRow key={attendee.id} attendee={attendee} isSelected={selectedAttendee?.id === attendee.id} onClick={() => setSelectedAttendee(attendee)} />)}
              {filteredAttendees.length === 0 && <div className="text-center py-8" style={{ color: '#71717a' }}><Users size={32} className="mx-auto mb-2 opacity-50" /><p>No attendees match your filters</p></div>}
            </div>
          </div>

          <div className="lg:col-span-2">
            {selectedAttendee ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl" style={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold" style={{ background: 'linear-gradient(135deg, rgba(212,168,75,0.3), rgba(212,168,75,0.1))', color: gold }}>{selectedAttendee.name.split(' ').map(n => n[0]).join('')}</div>
                      <div><div className="flex items-center gap-2"><h2 className="text-xl font-semibold text-white">{selectedAttendee.name}</h2><StatusBadge status={selectedAttendee.rsvpStatus} /></div><p style={{ color: '#71717a' }}>{selectedAttendee.role}, {selectedAttendee.company}</p></div>
                    </div>
                    <button className="px-3 py-1.5 text-sm rounded-lg" style={{ backgroundColor: '#27272a', color: '#a1a1aa' }}>View Full Profile</button>
                  </div>
                  {selectedAttendee.interviewComplete && selectedAttendee.goals.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4" style={{ borderTop: '1px solid #3f3f46' }}>
                      <div>
                        <div className="text-xs font-medium uppercase tracking-wider mb-2 flex items-center gap-1" style={{ color: gold }}><Target size={12} />Event Goals</div>
                        <ul className="space-y-1">{selectedAttendee.goals.map((goal, i) => <li key={i} className="text-sm" style={{ color: '#a1a1aa' }}>• {goal}</li>)}</ul>
                      </div>
                      <div>
                        <div className="text-xs font-medium uppercase tracking-wider mb-2 flex items-center gap-1" style={{ color: gold }}><Briefcase size={12} />Expertise</div>
                        <div className="flex flex-wrap gap-1.5">{selectedAttendee.expertise.map(exp => <span key={exp} className="px-2 py-0.5 text-xs rounded-full" style={{ backgroundColor: '#27272a', color: '#a1a1aa' }}>{exp}</span>)}</div>
                      </div>
                    </div>
                  )}
                  {!selectedAttendee.interviewComplete && (
                    <div className="mt-4 p-3 rounded-lg flex items-center gap-2" style={{ backgroundColor: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)' }}><AlertCircle size={16} style={{ color: '#fbbf24' }} /><span className="text-sm" style={{ color: '#fbbf24' }}>Interview not complete — matches based on limited data</span></div>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-white flex items-center gap-2"><Sparkles size={18} style={{ color: gold }} />Recommended Connections ({selectedAttendee.matches.length})</h3>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg" style={{ backgroundColor: '#27272a', color: '#a1a1aa' }}><Plus size={14} />Add Custom Match</button>
                </div>
                {selectedAttendee.matches.length > 0 ? (
                  <div className="space-y-3">{selectedAttendee.matches.map(match => <MatchCard key={match.id} match={match} onApprove={handleApproveMatch} onRemove={handleRemoveMatch} onEdit={() => {}} />)}</div>
                ) : (
                  <div className="p-8 text-center rounded-xl" style={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}><Users size={32} className="mx-auto mb-2 opacity-50" style={{ color: '#71717a' }} /><p style={{ color: '#71717a' }}>No matches generated yet</p><p className="text-sm mt-1" style={{ color: '#71717a' }}>{selectedAttendee.rsvpStatus === 'confirmed' ? 'Waiting for interview completion' : 'Matches will generate once RSVP is confirmed'}</p></div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center rounded-xl" style={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}><Users size={32} className="mx-auto mb-2 opacity-50" style={{ color: '#71717a' }} /><p style={{ color: '#71717a' }}>Select an attendee to view their matches</p></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
