import React, { useState } from 'react';
import { Search, Check, Users, Mail, Bell, Clock, Calendar, Send, CheckCircle, XCircle, HelpCircle, Download, Eye, MessageSquare, ArrowUpRight, X, ChevronRight } from 'lucide-react';

const gold = '#D4A84B';

const mockGuests = [
  { id: 1, name: 'Sarah Chen', email: 'sarah@nexusai.com', role: 'Founder & CEO', company: 'Nexus AI', status: 'confirmed', interviewComplete: true, respondedAt: '2025-01-08T14:30:00', addedBy: 'You' },
  { id: 2, name: 'Marcus Williams', email: 'marcus@foundrycap.com', role: 'Managing Partner', company: 'Foundry Capital', status: 'confirmed', interviewComplete: true, respondedAt: '2025-01-07T09:15:00', addedBy: 'Emily' },
  { id: 3, name: 'David Park', email: 'david@gmail.com', role: 'Angel Investor', company: 'Independent', status: 'maybe', interviewComplete: true, respondedAt: '2025-01-09T16:45:00', addedBy: 'You' },
  { id: 4, name: 'Lisa Wang', email: 'lisa.wang@stripe.com', role: 'VP Engineering', company: 'Stripe', status: 'confirmed', interviewComplete: false, respondedAt: '2025-01-06T11:00:00', addedBy: 'You' },
  { id: 5, name: 'James Liu', email: 'james@dataflow.io', role: 'CTO', company: 'DataFlow', status: 'no-response', interviewComplete: false, respondedAt: null, addedBy: 'Emily' },
  { id: 6, name: 'Amanda Foster', email: 'amanda@openai.com', role: 'Chief of Staff', company: 'OpenAI', status: 'no-response', interviewComplete: false, respondedAt: null, addedBy: 'You' },
  { id: 7, name: 'Robert Kim', email: 'robert@a16z.com', role: 'Partner', company: 'a16z', status: 'declined', interviewComplete: false, respondedAt: '2025-01-05T08:30:00', addedBy: 'You' },
  { id: 8, name: 'Elena Rodriguez', email: 'elena@acmelabs.com', role: 'Founder', company: 'Acme Labs', status: 'confirmed', interviewComplete: true, respondedAt: '2025-01-10T10:20:00', addedBy: 'Emily' },
];

const mockActivity = [
  { id: 1, type: 'rsvp', name: 'Elena Rodriguez', action: 'confirmed', time: '2 hours ago' },
  { id: 2, type: 'interview', name: 'Elena Rodriguez', action: 'completed interview', time: '1 hour ago' },
  { id: 3, type: 'reminder', action: 'Reminder sent to 2 guests', time: '3 hours ago' },
  { id: 4, type: 'rsvp', name: 'David Park', action: 'responded maybe', time: 'Yesterday' },
  { id: 5, type: 'rsvp', name: 'Robert Kim', action: 'declined', time: '2 days ago' },
];

const StatusBadge = ({ status, size = 'default' }) => {
  const styles = { confirmed: { bg: 'rgba(74,222,128,0.2)', color: '#4ade80' }, maybe: { bg: 'rgba(251,191,36,0.2)', color: '#fbbf24' }, 'no-response': { bg: 'rgba(113,113,122,0.2)', color: '#71717a' }, declined: { bg: 'rgba(239,68,68,0.2)', color: '#ef4444' } };
  const icons = { confirmed: CheckCircle, maybe: HelpCircle, 'no-response': Clock, declined: XCircle };
  const labels = { confirmed: 'Confirmed', maybe: 'Maybe', 'no-response': 'No Response', declined: 'Declined' };
  const Icon = icons[status];
  const sizeClasses = size === 'large' ? 'px-3 py-1.5 text-sm' : 'px-2 py-0.5 text-xs';
  return <span className={`inline-flex items-center gap-1 rounded-full font-medium ${sizeClasses}`} style={{ backgroundColor: styles[status].bg, color: styles[status].color }}><Icon size={size === 'large' ? 14 : 12} />{labels[status]}</span>;
};

const StatCard = ({ label, value, total, color, icon: Icon, trend }) => {
  const percentage = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className="p-4 rounded-xl" style={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}>
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-lg" style={{ backgroundColor: color.bg, color: color.text }}><Icon size={18} /></div>
        {trend && <span className="text-xs flex items-center gap-0.5" style={{ color: '#4ade80' }}><ArrowUpRight size={12} />{trend}</span>}
      </div>
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      <div className="flex items-center justify-between">
        <span className="text-sm" style={{ color: '#71717a' }}>{label}</span>
        <span className="text-sm" style={{ color: '#a1a1aa' }}>{percentage}%</span>
      </div>
      <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#3f3f46' }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${percentage}%`, backgroundColor: color.text }} />
      </div>
    </div>
  );
};

const GuestRow = ({ guest, selected, onSelect }) => {
  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };
  return (
    <tr style={{ borderBottom: '1px solid #3f3f46' }}>
      <td className="py-3 px-4">
        <button onClick={() => onSelect(guest.id)} className="w-5 h-5 rounded flex items-center justify-center transition-all" style={{ backgroundColor: selected ? gold : 'transparent', border: selected ? `1px solid ${gold}` : '1px solid #3f3f46' }}>
          {selected && <Check size={12} className="text-black" />}
        </button>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium" style={{ backgroundColor: '#27272a', color: '#a1a1aa' }}>{guest.name.split(' ').map(n => n[0]).join('')}</div>
          <div><div className="text-white font-medium">{guest.name}</div><div className="text-xs" style={{ color: '#71717a' }}>{guest.email}</div></div>
        </div>
      </td>
      <td className="py-3 px-4"><div className="text-sm" style={{ color: '#a1a1aa' }}>{guest.role}</div><div className="text-xs" style={{ color: '#71717a' }}>{guest.company}</div></td>
      <td className="py-3 px-4"><StatusBadge status={guest.status} /></td>
      <td className="py-3 px-4"><span className="inline-flex items-center gap-1 text-xs" style={{ color: guest.interviewComplete ? '#4ade80' : '#71717a' }}>{guest.interviewComplete ? <><CheckCircle size={12} />Complete</> : <><Clock size={12} />Pending</>}</span></td>
      <td className="py-3 px-4 text-sm" style={{ color: '#71717a' }}>{formatDate(guest.respondedAt)}</td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-1">
          <button className="p-1.5 rounded transition-colors" style={{ color: '#71717a' }}><Eye size={14} /></button>
          <button className="p-1.5 rounded transition-colors" style={{ color: '#71717a' }}><Mail size={14} /></button>
        </div>
      </td>
    </tr>
  );
};

const ActivityItem = ({ activity }) => {
  const getIcon = () => { if (activity.type === 'rsvp') return activity.action === 'confirmed' ? CheckCircle : activity.action === 'declined' ? XCircle : HelpCircle; if (activity.type === 'interview') return MessageSquare; return Bell; };
  const getColor = () => { if (activity.action === 'confirmed' || activity.action === 'completed interview') return '#4ade80'; if (activity.action === 'declined') return '#ef4444'; if (activity.action === 'responded maybe') return '#fbbf24'; return '#71717a'; };
  const Icon = getIcon();
  return (
    <div className="flex items-start gap-3 py-3" style={{ borderBottom: '1px solid #3f3f46' }}>
      <div className="p-1.5 rounded-lg" style={{ backgroundColor: '#27272a', color: getColor() }}><Icon size={14} /></div>
      <div className="flex-1"><p className="text-sm" style={{ color: '#a1a1aa' }}>{activity.name && <span className="text-white font-medium">{activity.name}</span>}{activity.name ? ` ${activity.action}` : activity.action}</p><p className="text-xs mt-0.5" style={{ color: '#71717a' }}>{activity.time}</p></div>
    </div>
  );
};

const ReminderModal = ({ isOpen, onClose, selectedCount, onSend }) => {
  const [channel, setChannel] = useState('email');
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}>
      <div className="rounded-2xl w-full max-w-lg" style={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}>
        <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid #3f3f46' }}><h3 className="text-white font-medium">Send Reminder</h3><button onClick={onClose} style={{ color: '#71717a' }}><X size={20} /></button></div>
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-2 p-3 rounded-lg" style={{ backgroundColor: '#27272a' }}><Users size={16} style={{ color: gold }} /><span className="text-sm" style={{ color: '#a1a1aa' }}>Sending to <span className="text-white font-medium">{selectedCount}</span> guest{selectedCount !== 1 && 's'}</span></div>
          <div className="space-y-2">
            <label className="text-sm" style={{ color: '#a1a1aa' }}>Send via</label>
            <div className="flex gap-2">{['email', 'sms', 'both'].map(ch => <button key={ch} onClick={() => setChannel(ch)} className="flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all" style={{ backgroundColor: channel === ch ? gold : '#27272a', color: channel === ch ? 'black' : '#a1a1aa' }}>{ch === 'email' ? 'Email' : ch === 'sms' ? 'SMS' : 'Both'}</button>)}</div>
          </div>
          <div className="space-y-2">
            <label className="text-sm" style={{ color: '#a1a1aa' }}>Message</label>
            <textarea defaultValue={`Hi {name},\n\nJust a friendly reminder about AI Summit 2025 on March 30th! We'd love to know if you can make it.\n\nPlease RSVP: {rsvp_link}`} className="w-full px-4 py-3 rounded-xl text-white text-sm resize-none" style={{ backgroundColor: '#27272a', border: '1px solid #3f3f46' }} rows={6} />
          </div>
        </div>
        <div className="flex gap-3 p-4" style={{ borderTop: '1px solid #3f3f46' }}>
          <button onClick={onClose} className="flex-1 py-3 px-4 rounded-xl text-white" style={{ backgroundColor: '#27272a' }}>Cancel</button>
          <button onClick={() => { onSend(); onClose(); }} className="flex-1 py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2" style={{ backgroundColor: gold, color: 'black' }}><Send size={16} />Send Reminder</button>
        </div>
      </div>
    </div>
  );
};

export default function RSVPOrganizerDashboard() {
  const [guests] = useState(mockGuests);
  const [selectedGuests, setSelectedGuests] = useState(new Set());
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showReminderModal, setShowReminderModal] = useState(false);

  const stats = { total: guests.length, confirmed: guests.filter(g => g.status === 'confirmed').length, maybe: guests.filter(g => g.status === 'maybe').length, noResponse: guests.filter(g => g.status === 'no-response').length, declined: guests.filter(g => g.status === 'declined').length, interviewComplete: guests.filter(g => g.interviewComplete).length };

  const filteredGuests = guests.filter(g => {
    const matchesSearch = g.name.toLowerCase().includes(searchQuery.toLowerCase()) || g.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || g.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const toggleSelectGuest = (id) => { setSelectedGuests(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; }); };
  const selectAll = () => { if (selectedGuests.size === filteredGuests.length) setSelectedGuests(new Set()); else setSelectedGuests(new Set(filteredGuests.map(g => g.id))); };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#09090b', color: 'white' }}>
      <div style={{ borderBottom: '1px solid #3f3f46', backgroundColor: '#18181b' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div><h1 className="text-2xl font-semibold">AI Summit 2025 — <span style={{ color: gold }}>RSVP Management</span></h1><p className="text-sm mt-1" style={{ color: '#71717a' }}>Track responses and send reminders</p></div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block"><div className="text-xs" style={{ color: '#71717a' }}>RSVP Deadline</div><div className="text-sm font-medium flex items-center gap-1" style={{ color: '#fbbf24' }}><Clock size={14} />12 days left</div></div>
              <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-white" style={{ backgroundColor: '#27272a' }}><Download size={16} />Export</button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Confirmed" value={stats.confirmed} total={stats.total} color={{ bg: 'rgba(74,222,128,0.2)', text: '#4ade80' }} icon={CheckCircle} trend="+3 today" />
          <StatCard label="Maybe" value={stats.maybe} total={stats.total} color={{ bg: 'rgba(251,191,36,0.2)', text: '#fbbf24' }} icon={HelpCircle} />
          <StatCard label="No Response" value={stats.noResponse} total={stats.total} color={{ bg: 'rgba(113,113,122,0.2)', text: '#71717a' }} icon={Clock} />
          <StatCard label="Interview Done" value={stats.interviewComplete} total={stats.confirmed + stats.maybe} color={{ bg: 'rgba(96,165,250,0.2)', text: '#60a5fa' }} icon={MessageSquare} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={18} style={{ color: '#71717a' }} />
                <input type="text" placeholder="Search guests..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl text-white text-sm" style={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }} />
              </div>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-4 py-2.5 rounded-xl text-sm" style={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', color: '#a1a1aa' }}>
                <option value="all">All Statuses</option><option value="confirmed">Confirmed</option><option value="maybe">Maybe</option><option value="no-response">No Response</option><option value="declined">Declined</option>
              </select>
            </div>

            {selectedGuests.size > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: 'rgba(212,168,75,0.1)', border: `1px solid rgba(212,168,75,0.3)` }}>
                <span className="text-sm" style={{ color: gold }}>{selectedGuests.size} guest{selectedGuests.size !== 1 && 's'} selected</span>
                <div className="flex gap-2 ml-auto">
                  <button onClick={() => setShowReminderModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg" style={{ backgroundColor: gold, color: 'black' }}><Bell size={14} />Send Reminder</button>
                  <button onClick={() => setSelectedGuests(new Set())} className="px-3 py-1.5 text-sm" style={{ color: '#71717a' }}>Clear</button>
                </div>
              </div>
            )}

            <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid #3f3f46', backgroundColor: '#09090b' }}>
                      <th className="py-3 px-4 text-left">
                        <button onClick={selectAll} className="w-5 h-5 rounded flex items-center justify-center transition-all" style={{ backgroundColor: selectedGuests.size === filteredGuests.length && filteredGuests.length > 0 ? gold : 'transparent', border: selectedGuests.size === filteredGuests.length && filteredGuests.length > 0 ? `1px solid ${gold}` : '1px solid #3f3f46' }}>
                          {selectedGuests.size === filteredGuests.length && filteredGuests.length > 0 && <Check size={12} className="text-black" />}
                        </button>
                      </th>
                      <th className="py-3 px-4 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#71717a' }}>Guest</th>
                      <th className="py-3 px-4 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#71717a' }}>Role</th>
                      <th className="py-3 px-4 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#71717a' }}>Status</th>
                      <th className="py-3 px-4 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#71717a' }}>Interview</th>
                      <th className="py-3 px-4 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#71717a' }}>Responded</th>
                      <th className="py-3 px-4 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#71717a' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>{filteredGuests.map(guest => <GuestRow key={guest.id} guest={guest} selected={selectedGuests.has(guest.id)} onSelect={toggleSelectGuest} />)}</tbody>
                </table>
              </div>
              {filteredGuests.length === 0 && <div className="p-8 text-center"><Users size={32} className="mx-auto mb-2 opacity-50" style={{ color: '#71717a' }} /><p style={{ color: '#71717a' }}>No guests match your filters</p></div>}
              <div className="flex items-center justify-between p-4" style={{ borderTop: '1px solid #3f3f46' }}>
                <span className="text-sm" style={{ color: '#71717a' }}>Showing {filteredGuests.length} of {guests.length} guests</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1 space-y-4">
            <div className="p-4 rounded-xl" style={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}>
              <h3 className="text-white font-medium mb-4 flex items-center gap-2"><Clock size={16} style={{ color: gold }} />Recent Activity</h3>
              <div>{mockActivity.map(activity => <ActivityItem key={activity.id} activity={activity} />)}</div>
              <button className="w-full mt-4 py-2 text-sm hover:underline" style={{ color: gold }}>View all activity</button>
            </div>

            <div className="p-4 rounded-xl" style={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}>
              <h3 className="text-white font-medium mb-4 flex items-center gap-2"><Bell size={16} style={{ color: gold }} />Quick Actions</h3>
              <div className="space-y-2">
                <button onClick={() => { setSelectedGuests(new Set(guests.filter(g => g.status === 'no-response').map(g => g.id))); setShowReminderModal(true); }} className="w-full flex items-center justify-between p-3 rounded-lg transition-colors" style={{ backgroundColor: '#27272a' }}>
                  <div className="flex items-center gap-2"><Mail size={14} style={{ color: '#71717a' }} /><span className="text-sm" style={{ color: '#a1a1aa' }}>Remind non-responders</span></div>
                  <span className="text-xs" style={{ color: '#71717a' }}>{stats.noResponse}</span>
                </button>
                <button className="w-full flex items-center justify-between p-3 rounded-lg transition-colors" style={{ backgroundColor: '#27272a' }}>
                  <div className="flex items-center gap-2"><MessageSquare size={14} style={{ color: '#71717a' }} /><span className="text-sm" style={{ color: '#a1a1aa' }}>Nudge for interview</span></div>
                  <span className="text-xs" style={{ color: '#71717a' }}>{stats.confirmed + stats.maybe - stats.interviewComplete}</span>
                </button>
              </div>
            </div>

            <div className="p-4 rounded-xl" style={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}>
              <h3 className="text-white font-medium mb-3">Capacity</h3>
              <div className="flex items-center justify-between mb-2"><span className="text-sm" style={{ color: '#71717a' }}>Confirmed + Maybe</span><span className="text-sm text-white font-medium">{stats.confirmed + stats.maybe} / 50</span></div>
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#3f3f46' }}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${((stats.confirmed + stats.maybe) / 50) * 100}%`, background: 'linear-gradient(to right, #4ade80, #fbbf24)' }} />
              </div>
              <p className="text-xs mt-2" style={{ color: '#71717a' }}>{50 - stats.confirmed - stats.maybe} spots remaining</p>
            </div>
          </div>
        </div>
      </div>
      <ReminderModal isOpen={showReminderModal} onClose={() => setShowReminderModal(false)} selectedCount={selectedGuests.size} onSend={() => setSelectedGuests(new Set())} />
    </div>
  );
}
