import React, { useState } from 'react';
import { Search, Plus, X, Sparkles, Filter, Check, Users, Mail, User, Clock, MapPin, Loader2 } from 'lucide-react';

const gold = '#D4A84B';

const mockContacts = [
  { id: 1, name: 'Sarah Chen', role: 'Founder & CEO', company: 'Nexus AI', location: 'Austin, TX', tags: ['AI/ML', 'Founder', 'Series A'], relationship: 4, lastContact: '2 days ago', bio: 'Former ML lead at Google. Building enterprise automation tools.', whyRelevant: 'Raising Series A, deep AI implementation expertise, local' },
  { id: 2, name: 'Marcus Williams', role: 'Managing Partner', company: 'Foundry Capital', location: 'San Francisco, CA', tags: ['Investor', 'AI', 'Series A+'], relationship: 3, lastContact: '1 week ago', bio: 'Early investor in AI/ML companies.', whyRelevant: 'Actively looking for AI-native deals' },
  { id: 3, name: 'David Park', role: 'Angel Investor', company: 'Independent', location: 'San Francisco, CA', tags: ['Investor', 'AI', 'F&F'], relationship: 3, lastContact: '2 weeks ago', bio: 'Former engineering lead at Google.', whyRelevant: 'Invested in 5 AI startups' },
  { id: 4, name: 'Lisa Wang', role: 'VP Engineering', company: 'Stripe', location: 'San Francisco, CA', tags: ['Enterprise', 'Hiring', 'Technical'], relationship: 2, lastContact: '1 month ago', bio: 'Built Stripe\'s ML infrastructure team.', whyRelevant: 'Hiring expertise, enterprise AI experience' },
  { id: 5, name: 'James Liu', role: 'CTO', company: 'DataFlow', location: 'Austin, TX', tags: ['Technical', 'Austin', 'Founder'], relationship: 4, lastContact: '3 days ago', bio: 'Serial entrepreneur. Third startup.', whyRelevant: 'Local founder, complementary background' },
];

const filterTags = ['All', 'Investor', 'Founder', 'AI/ML', 'Austin', 'Recently met'];

const RelationshipIndicator = ({ strength }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4].map(i => (
      <div key={i} className="w-1.5 h-4 rounded-full" style={{ backgroundColor: i <= strength ? gold : '#3f3f46' }} />
    ))}
  </div>
);

const ContactCard = ({ contact, onAdd, isExpanded, onToggleExpand }) => (
  <div className="rounded-xl overflow-hidden transition-all duration-300" style={{ backgroundColor: '#18181b', border: isExpanded ? `1px solid rgba(212,168,75,0.3)` : '1px solid #3f3f46' }}>
    <div className="p-4 cursor-pointer" onClick={onToggleExpand}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center font-medium" style={{ background: 'linear-gradient(135deg, rgba(212,168,75,0.3), rgba(212,168,75,0.1))', color: gold }}>
            {contact.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <h4 className="text-white font-medium">{contact.name}</h4>
            <p className="text-sm" style={{ color: '#71717a' }}>{contact.role}, {contact.company}</p>
          </div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onAdd(contact); }} className="p-2 rounded-lg transition-colors" style={{ backgroundColor: 'rgba(212,168,75,0.1)', color: gold }}>
          <Plus size={16} />
        </button>
      </div>
      <div className="flex items-center gap-4 mt-3 text-xs" style={{ color: '#71717a' }}>
        <RelationshipIndicator strength={contact.relationship} />
        <div className="flex items-center gap-1"><Clock size={12} />{contact.lastContact}</div>
        <div className="flex items-center gap-1"><MapPin size={12} />{contact.location}</div>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-3">
        {contact.tags.slice(0, 3).map(tag => (
          <span key={tag} className="px-2 py-0.5 text-xs rounded-full" style={{ backgroundColor: '#27272a', color: '#a1a1aa' }}>{tag}</span>
        ))}
      </div>
    </div>
    {isExpanded && (
      <div className="px-4 pb-4 pt-2" style={{ borderTop: '1px solid #3f3f46' }}>
        <div className="mb-3">
          <h5 className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: gold }}>Background</h5>
          <p className="text-sm" style={{ color: '#a1a1aa' }}>{contact.bio}</p>
        </div>
        <div className="p-3 rounded-lg" style={{ backgroundColor: '#09090b' }}>
          <h5 className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: '#4ade80' }}>Why Relevant</h5>
          <p className="text-sm" style={{ color: '#a1a1aa' }}>{contact.whyRelevant}</p>
        </div>
        <div className="flex gap-2 mt-3">
          <button className="flex-1 py-2 px-4 text-sm rounded-lg" style={{ backgroundColor: '#27272a', color: '#a1a1aa' }}>View Profile</button>
          <button onClick={() => onAdd(contact)} className="flex-1 py-2 px-4 text-sm font-medium rounded-lg" style={{ backgroundColor: gold, color: 'black' }}>Add to List</button>
        </div>
      </div>
    )}
  </div>
);

const GuestCard = ({ guest, onRemove, selected, onSelect }) => (
  <div onClick={() => onSelect(guest.id)} className="p-3 rounded-xl cursor-pointer transition-all" style={{ backgroundColor: selected ? 'rgba(212,168,75,0.1)' : '#27272a', border: selected ? `1px solid rgba(212,168,75,0.5)` : '1px solid #3f3f46' }}>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 rounded flex items-center justify-center transition-all" style={{ backgroundColor: selected ? gold : 'transparent', border: selected ? `1px solid ${gold}` : '1px solid #3f3f46' }}>
          {selected && <Check size={12} className="text-black" />}
        </div>
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs" style={{ backgroundColor: '#3f3f46', color: '#a1a1aa' }}>
          {guest.name.split(' ').map(n => n[0]).join('')}
        </div>
        <div>
          <h4 className="text-white text-sm font-medium">{guest.name}</h4>
          <p className="text-xs" style={{ color: '#71717a' }}>{guest.role}, {guest.company}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: guest.status === 'sent' ? 'rgba(74,222,128,0.2)' : '#3f3f46', color: guest.status === 'sent' ? '#4ade80' : '#71717a' }}>
          {guest.status === 'sent' ? 'Sent ✓' : 'Not sent'}
        </span>
        <button onClick={(e) => { e.stopPropagation(); onRemove(guest.id); }} className="p-1 transition-colors" style={{ color: '#71717a' }}>
          <X size={14} />
        </button>
      </div>
    </div>
    <div className="flex items-center gap-2 mt-2 ml-8 text-xs" style={{ color: '#71717a' }}>
      <User size={10} />Added by: {guest.addedBy}
    </div>
  </div>
);

const AICurationPanel = ({ onAddContacts, suggestions }) => {
  const [prompt, setPrompt] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  return (
    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}>
      <div className="p-4" style={{ borderBottom: '1px solid #3f3f46' }}>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={18} style={{ color: gold }} />
          <h3 className="text-white font-medium">AI-Powered Curation</h3>
        </div>
        <p className="text-sm mb-3" style={{ color: '#71717a' }}>Describe who you're looking to invite:</p>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Founders and investors interested in AI implementation..."
          className="w-full px-4 py-3 rounded-xl text-white text-sm resize-none"
          style={{ backgroundColor: '#27272a', border: '1px solid #3f3f46' }}
          rows={3}
        />
        <div className="flex gap-2 mt-3">
          <button onClick={() => setShowSuggestions(true)} disabled={!prompt.trim()} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all" style={{ backgroundColor: prompt.trim() ? gold : '#3f3f46', color: prompt.trim() ? 'black' : '#71717a' }}>
            <Sparkles size={16} />Generate Suggestions
          </button>
        </div>
      </div>
      {showSuggestions && suggestions.length > 0 && (
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm" style={{ color: '#a1a1aa' }}>Suggestions ({suggestions.length} matches)</span>
            <button onClick={() => onAddContacts(suggestions)} className="text-xs hover:underline" style={{ color: gold }}>Add All</button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {suggestions.map(contact => (
              <div key={contact.id} className="p-3 rounded-lg" style={{ backgroundColor: '#27272a', border: '1px solid #3f3f46' }}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs" style={{ backgroundColor: '#3f3f46', color: '#a1a1aa' }}>{contact.name.split(' ').map(n => n[0]).join('')}</div>
                    <div><h4 className="text-white text-sm">{contact.name}</h4><p className="text-xs" style={{ color: '#71717a' }}>{contact.role} · {contact.location}</p></div>
                  </div>
                  <button onClick={() => onAddContacts([contact])} className="p-1.5 rounded transition-colors" style={{ backgroundColor: 'rgba(212,168,75,0.1)', color: gold }}><Plus size={14} /></button>
                </div>
                <div className="mt-2 p-2 rounded text-xs" style={{ backgroundColor: '#09090b', color: '#a1a1aa' }}>
                  <span style={{ color: '#4ade80' }} className="font-medium">WHY:</span> {contact.whyRelevant}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const AddNewContactModal = ({ isOpen, onClose, onAdd }) => {
  const [formData, setFormData] = useState({ name: '', email: '', company: '', role: '' });
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}>
      <div className="rounded-2xl w-full max-w-md" style={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}>
        <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid #3f3f46' }}>
          <h3 className="text-white font-medium">Add Someone New</h3>
          <button onClick={onClose} style={{ color: '#71717a' }}><X size={20} /></button>
        </div>
        <div className="p-4 space-y-4">
          <p className="text-sm" style={{ color: '#71717a' }}>This person will be added to your Better Contacts AND invited to the event.</p>
          <div className="space-y-2">
            <label className="text-sm" style={{ color: '#a1a1aa' }}>Name <span style={{ color: gold }}>*</span></label>
            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3 rounded-xl text-white" style={{ backgroundColor: '#27272a', border: '1px solid #3f3f46' }} />
          </div>
          <div className="space-y-2">
            <label className="text-sm" style={{ color: '#a1a1aa' }}>Email <span style={{ color: gold }}>*</span></label>
            <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-3 rounded-xl text-white" style={{ backgroundColor: '#27272a', border: '1px solid #3f3f46' }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm" style={{ color: '#a1a1aa' }}>Company</label>
              <input type="text" value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} className="w-full px-4 py-3 rounded-xl text-white" style={{ backgroundColor: '#27272a', border: '1px solid #3f3f46' }} />
            </div>
            <div className="space-y-2">
              <label className="text-sm" style={{ color: '#a1a1aa' }}>Role</label>
              <input type="text" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="w-full px-4 py-3 rounded-xl text-white" style={{ backgroundColor: '#27272a', border: '1px solid #3f3f46' }} />
            </div>
          </div>
        </div>
        <div className="flex gap-3 p-4" style={{ borderTop: '1px solid #3f3f46' }}>
          <button onClick={onClose} className="flex-1 py-3 px-4 rounded-xl text-white" style={{ backgroundColor: '#27272a' }}>Cancel</button>
          <button onClick={() => { onAdd({ ...formData, id: Date.now(), status: 'not-sent', addedBy: 'You' }); onClose(); }} disabled={!formData.name || !formData.email} className="flex-1 py-3 px-4 rounded-xl font-medium" style={{ backgroundColor: formData.name && formData.email ? gold : '#3f3f46', color: formData.name && formData.email ? 'black' : '#71717a' }}>Add to List</button>
        </div>
      </div>
    </div>
  );
};

export default function GuestListCuration() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [expandedContact, setExpandedContact] = useState(null);
  const [selectedGuests, setSelectedGuests] = useState(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [guests, setGuests] = useState([
    { id: 101, name: 'Sarah Chen', role: 'Founder & CEO', company: 'Nexus AI', status: 'not-sent', addedBy: 'You' },
    { id: 102, name: 'Marcus Williams', role: 'Managing Partner', company: 'Foundry Capital', status: 'sent', addedBy: 'Emily' },
  ]);

  const filteredContacts = mockContacts.filter(contact => {
    const matchesSearch = contact.name.toLowerCase().includes(searchQuery.toLowerCase()) || contact.company.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilter === 'All' || contact.tags.includes(activeFilter) || (activeFilter === 'Recently met' && contact.relationship >= 3);
    const notInGuestList = !guests.find(g => g.name === contact.name);
    return matchesSearch && matchesFilter && notInGuestList;
  });

  const aiSuggestions = mockContacts.filter(c => c.tags.includes('AI/ML') || c.tags.includes('Investor')).filter(c => !guests.find(g => g.name === c.name)).slice(0, 4);

  const addGuest = (contact) => {
    if (!guests.find(g => g.name === contact.name)) {
      setGuests([...guests, { id: contact.id || Date.now(), name: contact.name, role: contact.role, company: contact.company, status: 'not-sent', addedBy: 'You' }]);
    }
  };

  const addMultipleGuests = (contacts) => {
    const newGuests = contacts.filter(c => !guests.find(g => g.name === c.name)).map(c => ({ id: c.id || Date.now() + Math.random(), name: c.name, role: c.role, company: c.company, status: 'not-sent', addedBy: 'You' }));
    setGuests([...guests, ...newGuests]);
  };

  const removeGuest = (id) => { setGuests(guests.filter(g => g.id !== id)); setSelectedGuests(prev => { const next = new Set(prev); next.delete(id); return next; }); };
  const toggleSelectGuest = (id) => { setSelectedGuests(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; }); };
  const selectAll = () => { if (selectedGuests.size === guests.length) setSelectedGuests(new Set()); else setSelectedGuests(new Set(guests.map(g => g.id))); };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#09090b', color: 'white' }}>
      <div style={{ borderBottom: '1px solid #3f3f46', backgroundColor: '#18181b' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold">AI Summit 2025 — <span style={{ color: gold }}>Guest List</span></h1>
              <p className="text-sm mt-1" style={{ color: '#71717a' }}>Build your invite list from Better Contacts</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="px-4 py-2 rounded-xl text-sm text-white" style={{ backgroundColor: '#27272a' }}>Save Draft</button>
              <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium" style={{ backgroundColor: gold, color: 'black' }}><Mail size={16} />Send Invites</button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-white flex items-center gap-2"><Search size={18} style={{ color: gold }} />Find Guests</h2>
            <AICurationPanel onAddContacts={addMultipleGuests} suggestions={aiSuggestions} />
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={18} style={{ color: '#71717a' }} />
                <input type="text" placeholder="Search your contacts..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl text-white" style={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }} />
              </div>
              <div className="flex flex-wrap gap-2">
                {filterTags.map(tag => (
                  <button key={tag} onClick={() => setActiveFilter(tag)} className="px-3 py-1.5 rounded-full text-sm transition-all" style={{ backgroundColor: activeFilter === tag ? gold : '#27272a', color: activeFilter === tag ? 'black' : '#a1a1aa' }}>{tag}</button>
                ))}
              </div>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              <div className="text-sm" style={{ color: '#71717a' }}>Showing {filteredContacts.length} contacts</div>
              {filteredContacts.map(contact => (
                <ContactCard key={contact.id} contact={contact} onAdd={addGuest} isExpanded={expandedContact === contact.id} onToggleExpand={() => setExpandedContact(expandedContact === contact.id ? null : contact.id)} />
              ))}
              {filteredContacts.length === 0 && <div className="text-center py-8" style={{ color: '#71717a' }}><Users size={32} className="mx-auto mb-2 opacity-50" /><p>No contacts match your search</p></div>}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-white flex items-center gap-2"><Users size={18} style={{ color: gold }} />Invited Guests ({guests.length})</h2>
            </div>
            <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}>
              {guests.length > 0 ? (
                <>
                  <div className="p-3 space-y-2 max-h-96 overflow-y-auto">{guests.map(guest => <GuestCard key={guest.id} guest={guest} onRemove={removeGuest} selected={selectedGuests.has(guest.id)} onSelect={toggleSelectGuest} />)}</div>
                  <div className="p-3" style={{ borderTop: '1px solid #3f3f46', backgroundColor: '#09090b' }}>
                    <div className="flex flex-wrap items-center gap-2">
                      <button onClick={selectAll} className="px-3 py-1.5 text-sm rounded-lg" style={{ backgroundColor: '#27272a', color: '#a1a1aa' }}>{selectedGuests.size === guests.length ? 'Deselect All' : 'Select All'}</button>
                      {selectedGuests.size > 0 && (
                        <>
                          <span className="text-sm" style={{ color: '#71717a' }}>{selectedGuests.size} selected</span>
                          <button className="px-3 py-1.5 text-sm rounded-lg" style={{ backgroundColor: 'rgba(239,68,68,0.2)', color: '#ef4444' }}>Remove Selected</button>
                          <button className="px-3 py-1.5 text-sm rounded-lg" style={{ backgroundColor: 'rgba(212,168,75,0.2)', color: gold }}>Send Invites</button>
                        </>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-8 text-center"><Users size={32} className="mx-auto mb-2 opacity-50" style={{ color: '#71717a' }} /><p style={{ color: '#71717a' }}>No guests added yet</p></div>
              )}
            </div>
            <button onClick={() => setShowAddModal(true)} className="w-full p-4 rounded-xl text-center transition-colors group" style={{ border: '1px dashed #3f3f46' }}>
              <div className="flex items-center justify-center gap-2" style={{ color: '#71717a' }}><Plus size={18} /><span>Add Someone New</span></div>
              <p className="text-xs mt-1" style={{ color: '#71717a' }}>Not in your contacts? Add them manually</p>
            </button>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-4 rounded-xl text-center" style={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}><div className="text-2xl font-semibold text-white">{guests.length}</div><div className="text-xs" style={{ color: '#71717a' }}>Total Invited</div></div>
              <div className="p-4 rounded-xl text-center" style={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}><div className="text-2xl font-semibold" style={{ color: '#4ade80' }}>{guests.filter(g => g.status === 'sent').length}</div><div className="text-xs" style={{ color: '#71717a' }}>Invites Sent</div></div>
              <div className="p-4 rounded-xl text-center" style={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}><div className="text-2xl font-semibold" style={{ color: '#fbbf24' }}>{guests.filter(g => g.status === 'not-sent').length}</div><div className="text-xs" style={{ color: '#71717a' }}>Pending</div></div>
            </div>
          </div>
        </div>
      </div>
      <AddNewContactModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} onAdd={addGuest} />
    </div>
  );
}
