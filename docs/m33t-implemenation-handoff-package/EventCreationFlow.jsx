import React, { useState } from 'react';
import { Calendar, Clock, MapPin, Users, Settings, Eye, ChevronRight, ChevronLeft, X, Check, Plus, Search, Upload } from 'lucide-react';

const gold = '#D4A84B';

const StepIndicator = ({ steps, currentStep, onStepClick }) => (
  <div className="flex items-center justify-between mb-8 px-4">
    {steps.map((step, index) => (
      <React.Fragment key={step.id}>
        <button
          onClick={() => index < currentStep && onStepClick(index)}
          className={`flex flex-col items-center gap-2 transition-all duration-300 ${index < currentStep ? 'cursor-pointer' : 'cursor-default'}`}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300"
            style={{
              backgroundColor: index === currentStep ? gold : index < currentStep ? 'rgba(212,168,75,0.2)' : '#27272a',
              color: index === currentStep ? 'black' : index < currentStep ? gold : '#71717a',
              border: index < currentStep ? `1px solid ${gold}` : index > currentStep ? '1px solid #3f3f46' : 'none',
              transform: index === currentStep ? 'scale(1.1)' : 'scale(1)'
            }}
          >
            {index < currentStep ? <Check size={16} /> : index + 1}
          </div>
          <span className="text-xs font-medium hidden sm:block" style={{ color: index === currentStep ? gold : '#71717a' }}>
            {step.label}
          </span>
        </button>
        {index < steps.length - 1 && (
          <div className="flex-1 h-px mx-2" style={{ backgroundColor: index < currentStep ? gold : '#3f3f46' }} />
        )}
      </React.Fragment>
    ))}
  </div>
);

const Input = ({ label, placeholder, value, onChange, type = 'text', required }) => (
  <div className="space-y-2">
    <label className="text-sm font-medium" style={{ color: '#a1a1aa' }}>
      {label} {required && <span style={{ color: gold }}>*</span>}
    </label>
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-4 py-3 rounded-xl text-white focus:outline-none transition-all"
      style={{ backgroundColor: '#27272a', border: '1px solid #3f3f46' }}
    />
  </div>
);

const Textarea = ({ label, placeholder, value, onChange, rows = 3, maxLength }) => (
  <div className="space-y-2">
    <div className="flex justify-between">
      <label className="text-sm font-medium" style={{ color: '#a1a1aa' }}>{label}</label>
      {maxLength && <span className="text-xs" style={{ color: '#71717a' }}>{value?.length || 0}/{maxLength}</span>}
    </div>
    <textarea
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      maxLength={maxLength}
      className="w-full px-4 py-3 rounded-xl text-white focus:outline-none transition-all resize-none"
      style={{ backgroundColor: '#27272a', border: '1px solid #3f3f46' }}
    />
  </div>
);

const Select = ({ label, value, onChange, options, required }) => (
  <div className="space-y-2">
    <label className="text-sm font-medium" style={{ color: '#a1a1aa' }}>
      {label} {required && <span style={{ color: gold }}>*</span>}
    </label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-4 py-3 rounded-xl text-white focus:outline-none transition-all appearance-none cursor-pointer"
      style={{ backgroundColor: '#27272a', border: '1px solid #3f3f46' }}
    >
      <option value="">Select...</option>
      {options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
  </div>
);

const Toggle = ({ label, description, checked, onChange }) => (
  <div className="flex items-center justify-between p-4 rounded-xl" style={{ backgroundColor: '#27272a', border: '1px solid #3f3f46' }}>
    <div>
      <div className="text-sm font-medium text-white">{label}</div>
      {description && <div className="text-xs mt-1" style={{ color: '#71717a' }}>{description}</div>}
    </div>
    <button
      onClick={() => onChange(!checked)}
      className="w-12 h-6 rounded-full transition-all duration-300"
      style={{ backgroundColor: checked ? gold : '#3f3f46' }}
    >
      <div className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300 ${checked ? 'translate-x-6' : 'translate-x-0.5'}`} />
    </button>
  </div>
);

const Chip = ({ label, selected, onClick }) => (
  <button
    onClick={onClick}
    className="px-4 py-2 rounded-full text-sm font-medium transition-all duration-200"
    style={{
      backgroundColor: selected ? gold : '#27272a',
      color: selected ? 'black' : '#a1a1aa',
      border: selected ? 'none' : '1px solid #3f3f46'
    }}
  >
    {label}
  </button>
);

const Checkbox = ({ label, checked, onChange }) => (
  <button onClick={() => onChange(!checked)} className="flex items-center gap-3 text-left w-full">
    <div
      className="w-5 h-5 rounded flex items-center justify-center transition-all"
      style={{
        backgroundColor: checked ? gold : 'transparent',
        border: checked ? `1px solid ${gold}` : '1px solid #3f3f46'
      }}
    >
      {checked && <Check size={12} className="text-black" />}
    </div>
    <span className="text-sm" style={{ color: '#a1a1aa' }}>{label}</span>
  </button>
);

const OrganizerCard = ({ name, role, company, isYou, permissions, onPermissionChange, onRemove }) => (
  <div className="p-4 rounded-xl" style={{ backgroundColor: '#27272a', border: '1px solid #3f3f46' }}>
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center font-medium" style={{ backgroundColor: 'rgba(212,168,75,0.2)', color: gold }}>
          {name.charAt(0)}
        </div>
        <div>
          <div className="text-white font-medium">{name}</div>
          <div className="text-xs" style={{ color: '#71717a' }}>{role}, {company}</div>
        </div>
      </div>
      {!isYou && (
        <button onClick={onRemove} className="transition-colors" style={{ color: '#71717a' }}>
          <X size={16} />
        </button>
      )}
    </div>
    {isYou ? (
      <div className="text-xs flex items-center gap-1" style={{ color: '#4ade80' }}>
        <Check size={12} /> All permissions (Super Admin)
      </div>
    ) : (
      <div className="space-y-2 mt-3 pt-3" style={{ borderTop: '1px solid #3f3f46' }}>
        <Checkbox label="Can invite from their contacts" checked={permissions?.canInvite} onChange={(v) => onPermissionChange('canInvite', v)} />
        <Checkbox label="Can curate connections" checked={permissions?.canCurate} onChange={(v) => onPermissionChange('canCurate', v)} />
        <Checkbox label="Can edit event details" checked={permissions?.canEdit} onChange={(v) => onPermissionChange('canEdit', v)} />
      </div>
    )}
  </div>
);

const ProfileFieldCheckbox = ({ label, checked, onChange }) => (
  <button onClick={() => onChange(!checked)} className="flex items-center gap-3 p-3 rounded-lg w-full text-left transition-colors hover:bg-zinc-800">
    <div
      className="w-5 h-5 rounded flex items-center justify-center transition-all"
      style={{ backgroundColor: checked ? gold : 'transparent', border: checked ? `1px solid ${gold}` : '1px solid #3f3f46' }}
    >
      {checked && <Check size={12} className="text-black" />}
    </div>
    <span className="text-sm text-white">{label}</span>
  </button>
);

const TradingCardPreview = ({ fields }) => (
  <div className="rounded-2xl p-6 relative overflow-hidden" style={{ backgroundColor: '#0a0a0a', border: '1px solid #3f3f46' }}>
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 rounded-full blur-3xl" style={{ backgroundColor: 'rgba(212,168,75,0.1)' }} />
    <div className="relative">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-16 h-16 rounded-xl flex items-center justify-center text-xl font-bold" style={{ background: 'linear-gradient(135deg, rgba(212,168,75,0.3), rgba(212,168,75,0.1))', color: gold }}>SC</div>
        <div>
          <h3 className="text-white font-semibold text-lg">Sarah Chen</h3>
          {fields.role && <p className="text-sm" style={{ color: '#a1a1aa' }}>Founder & CEO</p>}
          {fields.company && <p className="text-sm" style={{ color: '#71717a' }}>Nexus AI</p>}
        </div>
      </div>
      {fields.lookingFor && (
        <div className="mb-3">
          <div className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: gold }}>Looking For</div>
          <p className="text-sm" style={{ color: '#a1a1aa' }}>Series A investors in AI/ML</p>
        </div>
      )}
      {fields.canHelp && (
        <div className="mb-3">
          <div className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: gold }}>Can Help With</div>
          <p className="text-sm" style={{ color: '#a1a1aa' }}>AI product strategy, hiring</p>
        </div>
      )}
      {fields.whyNow && (
        <div className="p-3 rounded-lg" style={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}>
          <div className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: '#4ade80' }}>Why Meet</div>
          <p className="text-sm" style={{ color: '#a1a1aa' }}>Raised similar round last year, connected through Google program</p>
        </div>
      )}
    </div>
  </div>
);

export default function EventCreationFlow() {
  const [currentStep, setCurrentStep] = useState(0);
  const [eventData, setEventData] = useState({
    name: '', date: '', startTime: '', endTime: '', eventType: '', description: '', goals: [],
    venueName: '', address: '', parkingNotes: '', dressCode: '', additionalNotes: '',
    organizers: [{ id: 1, name: 'You', role: 'CEO', company: '33 Strategies', isYou: true }],
    rsvpDeadline: '', allowPlusOnes: false, maxPlusOnes: 1, capacityLimit: '', enableWaitlist: false, requireApproval: false,
    reminders: { twoWeeks: true, oneWeek: true, oneDay: true, dayOf: false },
    profileFields: { role: true, company: true, industry: true, expertise: true, lookingFor: true, canHelp: true, interests: false, funFacts: false, whyNow: true, mutualConnections: true, conversationStarters: true },
  });

  const steps = [
    { id: 'basics', label: 'Basics' }, { id: 'venue', label: 'Venue' }, { id: 'organizers', label: 'Team' },
    { id: 'rsvp', label: 'RSVP' }, { id: 'cards', label: 'Cards' }, { id: 'questionnaire', label: 'Questions' }, { id: 'review', label: 'Review' },
  ];
  
  // Questionnaire configuration state
  const [questionnaireConfig, setQuestionnaireConfig] = useState({
    useEssentials: true, // true = start with essentials, false = scratch
    questions: [] // Will be populated based on choice
  });

  const eventTypes = [{ value: 'networking', label: 'Networking' }, { value: 'conference', label: 'Conference' }, { value: 'workshop', label: 'Workshop' }];
  const goalOptions = ['Fundraising', 'Hiring', 'Partnerships', 'Learning', 'Community'];
  const dressCodeOptions = [{ value: 'casual', label: 'Casual' }, { value: 'business-casual', label: 'Business Casual' }, { value: 'formal', label: 'Formal' }];
  const mockContacts = [{ id: 2, name: 'Sarah Chen', role: 'Founder', company: 'Nexus AI' }, { id: 3, name: 'Marcus Williams', role: 'Partner', company: 'Foundry Capital' }];

  const [searchQuery, setSearchQuery] = useState('');
  const filteredContacts = mockContacts.filter(c => !eventData.organizers.find(o => o.id === c.id) && c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const updateEventData = (field, value) => setEventData(prev => ({ ...prev, [field]: value }));
  const toggleGoal = (goal) => updateEventData('goals', eventData.goals.includes(goal) ? eventData.goals.filter(g => g !== goal) : [...eventData.goals, goal]);
  const addOrganizer = (contact) => updateEventData('organizers', [...eventData.organizers, { ...contact, permissions: { canInvite: true, canCurate: true, canEdit: false } }]);
  const removeOrganizer = (id) => updateEventData('organizers', eventData.organizers.filter(o => o.id !== id));
  const updateOrganizerPermission = (id, permission, value) => updateEventData('organizers', eventData.organizers.map(o => o.id === id ? { ...o, permissions: { ...o.permissions, [permission]: value } } : o));
  const toggleProfileField = (field) => updateEventData('profileFields', { ...eventData.profileFields, [field]: !eventData.profileFields[field] });
  const canProceed = () => currentStep === 0 ? eventData.name && eventData.date && eventData.startTime && eventData.endTime && eventData.eventType : currentStep === 1 ? eventData.venueName && eventData.address : true;

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div><h2 className="text-2xl font-semibold text-white mb-1">Event Basics</h2><p style={{ color: '#71717a' }}>Let's start with the essential details</p></div>
            <Input label="Event Name" placeholder="AI Summit 2025" value={eventData.name} onChange={(v) => updateEventData('name', v)} required />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input label="Date" type="date" value={eventData.date} onChange={(v) => updateEventData('date', v)} required />
              <Input label="Start Time" type="time" value={eventData.startTime} onChange={(v) => updateEventData('startTime', v)} required />
              <Input label="End Time" type="time" value={eventData.endTime} onChange={(v) => updateEventData('endTime', v)} required />
            </div>
            <Select label="Event Type" value={eventData.eventType} onChange={(v) => updateEventData('eventType', v)} options={eventTypes} required />
            <Textarea label="Description" placeholder="An intimate evening exploring how AI changes what's possible..." value={eventData.description} onChange={(v) => updateEventData('description', v)} maxLength={500} />
            <div className="space-y-2">
              <label className="text-sm font-medium" style={{ color: '#a1a1aa' }}>Event Goals</label>
              <div className="flex flex-wrap gap-2">{goalOptions.map(goal => <Chip key={goal} label={goal} selected={eventData.goals.includes(goal)} onClick={() => toggleGoal(goal)} />)}</div>
            </div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-6">
            <div><h2 className="text-2xl font-semibold text-white mb-1">Venue & Logistics</h2><p style={{ color: '#71717a' }}>Where and how will guests arrive?</p></div>
            <Input label="Venue Name" placeholder="The Domain" value={eventData.venueName} onChange={(v) => updateEventData('venueName', v)} required />
            <Input label="Address" placeholder="123 Innovation Way, Austin, TX" value={eventData.address} onChange={(v) => updateEventData('address', v)} required />
            {eventData.address && (
              <div className="h-40 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#27272a', border: '1px solid #3f3f46' }}>
                <div className="text-center"><MapPin className="mx-auto mb-2" style={{ color: gold }} /><span className="text-sm" style={{ color: '#71717a' }}>Map preview</span></div>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Textarea label="Parking Notes" placeholder="Validated parking in garage B" value={eventData.parkingNotes} onChange={(v) => updateEventData('parkingNotes', v)} rows={2} />
              <Select label="Dress Code" value={eventData.dressCode} onChange={(v) => updateEventData('dressCode', v)} options={dressCodeOptions} />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <div><h2 className="text-2xl font-semibold text-white mb-1">Co-Organizers</h2><p style={{ color: '#71717a' }}>Invite others to help curate guests</p></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#71717a' }} size={18} />
                  <input type="text" placeholder="Search your contacts..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl text-white" style={{ backgroundColor: '#27272a', border: '1px solid #3f3f46' }} />
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {filteredContacts.map(contact => (
                    <button key={contact.id} onClick={() => addOrganizer(contact)} className="w-full flex items-center justify-between p-3 rounded-xl transition-colors" style={{ backgroundColor: '#27272a', border: '1px solid #3f3f46' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm" style={{ backgroundColor: '#3f3f46', color: '#a1a1aa' }}>{contact.name.charAt(0)}</div>
                        <div className="text-left"><div className="text-white text-sm">{contact.name}</div><div className="text-xs" style={{ color: '#71717a' }}>{contact.role}, {contact.company}</div></div>
                      </div>
                      <Plus size={16} style={{ color: gold }} />
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-sm font-medium" style={{ color: '#a1a1aa' }}>Co-Organizers ({eventData.organizers.length})</h3>
                <div className="space-y-3">{eventData.organizers.map(org => <OrganizerCard key={org.id} {...org} onRemove={() => removeOrganizer(org.id)} onPermissionChange={(perm, value) => updateOrganizerPermission(org.id, perm, value)} />)}</div>
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <div><h2 className="text-2xl font-semibold text-white mb-1">RSVP Settings</h2><p style={{ color: '#71717a' }}>Configure how guests can respond</p></div>
            <Input label="RSVP Deadline" type="date" value={eventData.rsvpDeadline} onChange={(v) => updateEventData('rsvpDeadline', v)} />
            <div className="space-y-3">
              <Toggle label="Allow Plus-Ones" description="Guests can bring additional attendees" checked={eventData.allowPlusOnes} onChange={(v) => updateEventData('allowPlusOnes', v)} />
              <Input label="Capacity Limit" type="number" placeholder="Leave empty for no limit" value={eventData.capacityLimit} onChange={(v) => updateEventData('capacityLimit', v)} />
              <Toggle label="Enable Waitlist" description="Allow RSVPs beyond capacity" checked={eventData.enableWaitlist} onChange={(v) => updateEventData('enableWaitlist', v)} />
              <Toggle label="Require Approval" description="You must approve each RSVP" checked={eventData.requireApproval} onChange={(v) => updateEventData('requireApproval', v)} />
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-6">
            <div><h2 className="text-2xl font-semibold text-white mb-1">Trading Card Display</h2><p style={{ color: '#71717a' }}>Choose what attendees see on each other's cards</p></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div><h3 className="text-sm font-medium uppercase tracking-wider mb-2" style={{ color: gold }}>Professional</h3><div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}><ProfileFieldCheckbox label="Current Role & Company" checked={eventData.profileFields.role} onChange={() => toggleProfileField('role')} /><ProfileFieldCheckbox label="Industry" checked={eventData.profileFields.industry} onChange={() => toggleProfileField('industry')} /><ProfileFieldCheckbox label="Expertise Areas" checked={eventData.profileFields.expertise} onChange={() => toggleProfileField('expertise')} /></div></div>
                <div><h3 className="text-sm font-medium uppercase tracking-wider mb-2" style={{ color: gold }}>Event-Specific</h3><div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}><ProfileFieldCheckbox label="Looking For" checked={eventData.profileFields.lookingFor} onChange={() => toggleProfileField('lookingFor')} /><ProfileFieldCheckbox label="Can Help With" checked={eventData.profileFields.canHelp} onChange={() => toggleProfileField('canHelp')} /></div></div>
                <div><h3 className="text-sm font-medium uppercase tracking-wider mb-2" style={{ color: gold }}>Context</h3><div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}><ProfileFieldCheckbox label='"Why Now" contextual relevance' checked={eventData.profileFields.whyNow} onChange={() => toggleProfileField('whyNow')} /><ProfileFieldCheckbox label="Conversation starters" checked={eventData.profileFields.conversationStarters} onChange={() => toggleProfileField('conversationStarters')} /></div></div>
              </div>
              <div><h3 className="text-sm font-medium mb-3" style={{ color: '#a1a1aa' }}>Live Preview</h3><TradingCardPreview fields={eventData.profileFields} /><p className="text-xs mt-3 text-center" style={{ color: '#71717a' }}>This is how attendee cards will appear</p></div>
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-6">
            <div><h2 className="text-2xl font-semibold text-white mb-1">Attendee Questionnaire</h2><p style={{ color: '#71717a' }}>Configure what you ask guests when they RSVP</p></div>
            
            {/* Setup Choice */}
            {!questionnaireConfig.questions.length ? (
              <div className="space-y-4">
                <button
                  onClick={() => setQuestionnaireConfig({ useEssentials: true, questions: [
                    { id: 'goals', type: 'open_text', category: 'GOALS', title: "What are your biggest current goals?", required: true, locked: true },
                    { id: 'connections', type: 'open_text', category: 'CONNECTIONS', title: "Who would be your ideal connections at this event?", required: true, locked: true },
                    { id: 'experience', type: 'single_select', category: 'BACKGROUND', title: "Which best describes your professional stage?", required: false },
                    { id: 'topics', type: 'multi_select', category: 'PREFERENCES', title: "What topics are you most excited to discuss?", required: false }
                  ]})}
                  className="w-full p-5 rounded-xl text-left transition-all hover:border-opacity-100"
                  style={{ backgroundColor: '#27272a', border: '1px solid #3f3f46' }}
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(212,168,75,0.2)' }}>
                      <Settings size={24} style={{ color: gold }} />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-lg">Start with Essentials</h3>
                      <p className="text-sm mt-1" style={{ color: '#71717a' }}>4 pre-configured questions covering goals, connections, background, and preferences. Edit and add more as needed.</p>
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={() => setQuestionnaireConfig({ useEssentials: false, questions: [
                    { id: 'goals', type: 'open_text', category: 'GOALS', title: "What are your biggest current goals?", required: true, locked: true },
                    { id: 'connections', type: 'open_text', category: 'CONNECTIONS', title: "Who would be your ideal connections at this event?", required: true, locked: true }
                  ]})}
                  className="w-full p-5 rounded-xl text-left transition-all"
                  style={{ backgroundColor: '#27272a', border: '1px solid #3f3f46' }}
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl" style={{ backgroundColor: '#3f3f46' }}>
                      <Plus size={24} style={{ color: '#a1a1aa' }} />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-lg">Build from Scratch</h3>
                      <p className="text-sm mt-1" style={{ color: '#71717a' }}>Start with just the 2 required questions (Goals & Ideal Connections) and build your own.</p>
                    </div>
                  </div>
                </button>
                
                <div className="p-4 rounded-xl flex items-start gap-3" style={{ backgroundColor: 'rgba(212,168,75,0.1)', border: '1px solid rgba(212,168,75,0.3)' }}>
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: gold }}>
                    <span className="text-xs font-bold text-black">!</span>
                  </div>
                  <p className="text-sm" style={{ color: '#a1a1aa' }}>
                    <strong className="text-white">Two questions are always required:</strong> "What are your goals?" and "Who are your ideal connections?" These are essential for generating meaningful match recommendations.
                  </p>
                </div>
              </div>
            ) : (
              /* Questionnaire Summary */
              <div className="space-y-4">
                <div className="p-4 rounded-xl" style={{ backgroundColor: '#27272a', border: '1px solid #3f3f46' }}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-medium">{questionnaireConfig.questions.length} Questions Configured</h3>
                    <button 
                      onClick={() => alert('Full Questionnaire Builder would open here')}
                      className="text-sm px-3 py-1.5 rounded-lg"
                      style={{ backgroundColor: '#3f3f46', color: gold }}
                    >
                      Edit in Builder
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {questionnaireConfig.questions.map((q, idx) => (
                      <div key={q.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: '#18181b' }}>
                        <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium" style={{ backgroundColor: q.locked ? gold : '#3f3f46', color: q.locked ? 'black' : '#a1a1aa' }}>
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm truncate">{q.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs" style={{ color: '#71717a' }}>{q.type.replace('_', ' ')}</span>
                            {q.locked && <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(212,168,75,0.2)', color: gold }}>Required</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <button
                  onClick={() => setQuestionnaireConfig({ useEssentials: false, questions: [] })}
                  className="text-sm"
                  style={{ color: '#71717a' }}
                >
                  ← Start over
                </button>
              </div>
            )}
          </div>
        );
      case 6:
        return (
          <div className="space-y-6">
            <div><h2 className="text-2xl font-semibold text-white mb-1">Review & Create</h2><p style={{ color: '#71717a' }}>Confirm your event details</p></div>
            <div className="space-y-4">
              <div className="p-4 rounded-xl" style={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}>
                <div className="flex justify-between items-start mb-3"><h3 className="text-sm font-medium uppercase tracking-wider" style={{ color: gold }}>Event Details</h3><button onClick={() => setCurrentStep(0)} className="text-xs hover:underline" style={{ color: gold }}>Edit</button></div>
                <p className="text-white font-medium text-lg">{eventData.name || 'Untitled Event'}</p>
                <div className="flex items-center gap-4 text-sm mt-2" style={{ color: '#a1a1aa' }}><span className="flex items-center gap-1"><Calendar size={14} /> {eventData.date || 'No date'}</span><span className="flex items-center gap-1"><Clock size={14} /> {eventData.startTime} - {eventData.endTime}</span></div>
              </div>
              <div className="p-4 rounded-xl" style={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}>
                <div className="flex justify-between items-start mb-3"><h3 className="text-sm font-medium uppercase tracking-wider" style={{ color: gold }}>Venue</h3><button onClick={() => setCurrentStep(1)} className="text-xs hover:underline" style={{ color: gold }}>Edit</button></div>
                <div className="flex items-start gap-2"><MapPin size={16} style={{ color: '#71717a' }} /><div><p className="text-white">{eventData.venueName || 'No venue'}</p><p className="text-sm" style={{ color: '#71717a' }}>{eventData.address}</p></div></div>
              </div>
              <div className="p-4 rounded-xl" style={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}>
                <div className="flex justify-between items-start mb-3"><h3 className="text-sm font-medium uppercase tracking-wider" style={{ color: gold }}>Team</h3><button onClick={() => setCurrentStep(2)} className="text-xs hover:underline" style={{ color: gold }}>Edit</button></div>
                <div className="flex items-center gap-2"><Users size={16} style={{ color: '#71717a' }} /><span className="text-white">{eventData.organizers.length} organizer{eventData.organizers.length !== 1 && 's'}</span></div>
              </div>
              <div className="p-4 rounded-xl" style={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}>
                <div className="flex justify-between items-start mb-3"><h3 className="text-sm font-medium uppercase tracking-wider" style={{ color: gold }}>Questionnaire</h3><button onClick={() => setCurrentStep(5)} className="text-xs hover:underline" style={{ color: gold }}>Edit</button></div>
                <div className="flex items-center gap-2"><Settings size={16} style={{ color: '#71717a' }} /><span className="text-white">{questionnaireConfig.questions.length} question{questionnaireConfig.questions.length !== 1 && 's'} configured</span></div>
              </div>
            </div>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-6" style={{ backgroundColor: '#09090b', color: 'white' }}>
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold mb-2"><span style={{ color: gold }}>Create</span> Event</h1>
          <p style={{ color: '#71717a' }}>Set up your networking event in minutes</p>
        </div>
        <StepIndicator steps={steps} currentStep={currentStep} onStepClick={setCurrentStep} />
        <div className="rounded-2xl p-6 mb-6" style={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}>{renderStep()}</div>
        <div className="flex justify-between">
          <button onClick={() => setCurrentStep(Math.max(0, currentStep - 1))} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${currentStep === 0 ? 'opacity-0 pointer-events-none' : ''}`} style={{ backgroundColor: '#27272a', color: 'white' }}><ChevronLeft size={18} /> Back</button>
          {currentStep < steps.length - 1 ? (
            <button onClick={() => setCurrentStep(currentStep + 1)} disabled={!canProceed()} className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all" style={{ backgroundColor: canProceed() ? gold : '#3f3f46', color: canProceed() ? 'black' : '#71717a', cursor: canProceed() ? 'pointer' : 'not-allowed' }}>Continue <ChevronRight size={18} /></button>
          ) : (
            <button className="flex items-center gap-2 px-8 py-3 rounded-xl font-medium" style={{ backgroundColor: gold, color: 'black' }}><Check size={18} /> Create Event</button>
          )}
        </div>
      </div>
    </div>
  );
}
