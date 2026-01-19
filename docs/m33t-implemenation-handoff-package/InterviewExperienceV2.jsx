import React, { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, GripVertical, Check, Sparkles, Edit3, User, Target, Users, ArrowRight } from 'lucide-react';

const gold = '#D4A84B';

// ============================================================================
// QUESTION TYPE COMPONENTS
// ============================================================================

// Open Text Question (Required for Goals & Ideal Connections)
const OpenTextQuestion = ({ question, value, onChange, context, onContextChange }) => (
  <div className="space-y-6">
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: gold, letterSpacing: '0.15em' }}>
        {question.category}
      </p>
      <h2 className="text-2xl sm:text-3xl font-serif text-white leading-tight mb-2">
        {question.title}
      </h2>
      {question.subtitle && (
        <p className="text-base" style={{ color: '#a1a1aa' }}>{question.subtitle}</p>
      )}
    </div>
    
    <textarea
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={question.placeholder || 'Share your thoughts...'}
      className="w-full p-4 rounded-xl text-white text-lg resize-none focus:outline-none focus:ring-2 transition-all"
      style={{ 
        backgroundColor: '#18181b', 
        border: '1px solid #3f3f46',
        minHeight: '140px',
        focusRing: gold
      }}
      rows={4}
    />
    
    {question.hint && (
      <p className="text-sm" style={{ color: '#71717a' }}>{question.hint}</p>
    )}
    
    <ContextAdder context={context} onContextChange={onContextChange} />
  </div>
);

// Slider Question
const SliderQuestion = ({ question, value, onChange, context, onContextChange }) => {
  const sliderValue = value ?? 50;
  
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: gold, letterSpacing: '0.15em' }}>
          {question.category}
        </p>
        <h2 className="text-2xl sm:text-3xl font-serif text-white leading-tight">
          {question.title}
        </h2>
      </div>
      
      <div className="pt-4">
        <div className="flex justify-between mb-2">
          <span className="text-sm" style={{ color: '#a1a1aa' }}>{question.leftLabel}</span>
          <span className="text-2xl font-semibold" style={{ color: gold }}>{sliderValue}</span>
          <span className="text-sm" style={{ color: '#a1a1aa' }}>{question.rightLabel}</span>
        </div>
        
        <div className="relative h-2 rounded-full" style={{ backgroundColor: '#27272a' }}>
          <div 
            className="absolute h-full rounded-full transition-all"
            style={{ width: `${sliderValue}%`, backgroundColor: gold }}
          />
          <input
            type="range"
            min="0"
            max="100"
            value={sliderValue}
            onChange={(e) => onChange(parseInt(e.target.value))}
            className="absolute w-full h-full opacity-0 cursor-pointer"
          />
          <div 
            className="absolute w-5 h-5 rounded-full border-2 -translate-y-1/2 top-1/2 transition-all"
            style={{ 
              left: `calc(${sliderValue}% - 10px)`, 
              backgroundColor: '#60a5fa',
              borderColor: '#60a5fa'
            }}
          />
        </div>
      </div>
      
      <ContextAdder context={context} onContextChange={onContextChange} />
    </div>
  );
};

// Single Select Question
const SingleSelectQuestion = ({ question, value, onChange, context, onContextChange }) => (
  <div className="space-y-6">
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: gold, letterSpacing: '0.15em' }}>
        {question.category}
      </p>
      <h2 className="text-2xl sm:text-3xl font-serif text-white leading-tight">
        {question.title}
      </h2>
    </div>
    
    <div className="space-y-3">
      {question.options.map((option, idx) => (
        <button
          key={idx}
          onClick={() => onChange(option.value)}
          className="w-full p-4 rounded-xl text-left transition-all"
          style={{ 
            backgroundColor: value === option.value ? '#27272a' : '#18181b',
            border: value === option.value ? `2px solid ${gold}` : '1px solid #3f3f46'
          }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
              style={{ 
                borderColor: value === option.value ? gold : '#3f3f46',
                backgroundColor: value === option.value ? gold : 'transparent'
              }}
            >
              {value === option.value && <Check size={12} color="black" />}
            </div>
            <div>
              <p className="text-white font-medium">{option.label}</p>
              {option.description && (
                <p className="text-sm mt-0.5" style={{ color: '#71717a' }}>{option.description}</p>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
    
    <ContextAdder context={context} onContextChange={onContextChange} />
  </div>
);

// Multi Select Question
const MultiSelectQuestion = ({ question, value, onChange, context, onContextChange }) => {
  const selected = value || [];
  const maxSelections = question.maxSelections || 3;
  
  const toggleOption = (optionValue) => {
    if (selected.includes(optionValue)) {
      onChange(selected.filter(v => v !== optionValue));
    } else if (selected.length < maxSelections) {
      onChange([...selected, optionValue]);
    }
  };
  
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: gold, letterSpacing: '0.15em' }}>
          {question.category}
        </p>
        <h2 className="text-2xl sm:text-3xl font-serif text-white leading-tight">
          {question.title}
        </h2>
      </div>
      
      <p className="text-sm" style={{ color: '#71717a' }}>Select up to {maxSelections}</p>
      
      <div className="space-y-2">
        {question.options.map((option, idx) => {
          const isSelected = selected.includes(option.value);
          return (
            <button
              key={idx}
              onClick={() => toggleOption(option.value)}
              className="w-full p-4 rounded-xl text-left transition-all"
              style={{ 
                backgroundColor: isSelected ? 'rgba(212,168,75,0.15)' : '#18181b',
                border: isSelected ? `1px solid ${gold}` : '1px solid #3f3f46'
              }}
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                  style={{ 
                    backgroundColor: isSelected ? gold : 'transparent',
                    border: isSelected ? 'none' : '2px solid #3f3f46'
                  }}
                >
                  {isSelected && <Check size={12} color="black" />}
                </div>
                <span className="text-white">{option.label}</span>
              </div>
            </button>
          );
        })}
      </div>
      
      <p className="text-sm" style={{ color: '#71717a' }}>
        {selected.length} of {maxSelections} selected
      </p>
      
      <ContextAdder context={context} onContextChange={onContextChange} />
    </div>
  );
};

// Mad-Lib Question
const MadLibQuestion = ({ question, value, onChange, context, onContextChange }) => {
  const values = value || {};
  
  const updateField = (fieldId, fieldValue) => {
    onChange({ ...values, [fieldId]: fieldValue });
  };
  
  // Parse template into segments
  const renderTemplate = () => {
    const parts = question.template.split(/(\{[^}]+\})/);
    return parts.map((part, idx) => {
      const match = part.match(/\{([^}]+)\}/);
      if (match) {
        const field = question.fields.find(f => f.id === match[1]);
        return (
          <input
            key={idx}
            type="text"
            value={values[field.id] || ''}
            onChange={(e) => updateField(field.id, e.target.value)}
            placeholder={field.placeholder}
            className="inline-block px-3 py-1 mx-1 rounded-lg text-white text-lg focus:outline-none focus:ring-2"
            style={{ 
              backgroundColor: '#27272a',
              border: 'none',
              borderBottom: `2px solid ${gold}`,
              minWidth: '180px',
              maxWidth: '250px'
            }}
          />
        );
      }
      return <span key={idx} className="text-white text-lg">{part}</span>;
    });
  };
  
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: gold, letterSpacing: '0.15em' }}>
          {question.category}
        </p>
        <h2 className="text-2xl sm:text-3xl font-serif text-white leading-tight">
          {question.title}
        </h2>
      </div>
      
      <div className="p-6 rounded-xl leading-loose" style={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}>
        {renderTemplate()}
      </div>
      
      <ContextAdder context={context} onContextChange={onContextChange} />
    </div>
  );
};

// Ranking Question
const RankingQuestion = ({ question, value, onChange, context, onContextChange }) => {
  const items = value || question.items.map(item => item.id);
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);
  
  const handleDragStart = (idx) => {
    dragItem.current = idx;
  };
  
  const handleDragEnter = (idx) => {
    dragOverItem.current = idx;
  };
  
  const handleDragEnd = () => {
    const newItems = [...items];
    const draggedItem = newItems[dragItem.current];
    newItems.splice(dragItem.current, 1);
    newItems.splice(dragOverItem.current, 0, draggedItem);
    dragItem.current = null;
    dragOverItem.current = null;
    onChange(newItems);
  };
  
  const moveItem = (fromIdx, toIdx) => {
    if (toIdx < 0 || toIdx >= items.length) return;
    const newItems = [...items];
    const item = newItems[fromIdx];
    newItems.splice(fromIdx, 1);
    newItems.splice(toIdx, 0, item);
    onChange(newItems);
  };
  
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: gold, letterSpacing: '0.15em' }}>
          {question.category}
        </p>
        <h2 className="text-2xl sm:text-3xl font-serif text-white leading-tight">
          {question.title}
        </h2>
      </div>
      
      <p className="text-sm" style={{ color: '#71717a' }}>Drag to reorder by priority (most important at top)</p>
      
      <div className="space-y-2">
        {items.map((itemId, idx) => {
          const item = question.items.find(i => i.id === itemId);
          return (
            <div
              key={itemId}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragEnter={() => handleDragEnter(idx)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => e.preventDefault()}
              className="flex items-center gap-3 p-4 rounded-xl cursor-grab active:cursor-grabbing transition-all"
              style={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}
            >
              <div className="flex items-center gap-2">
                <GripVertical size={18} style={{ color: '#71717a' }} />
                <span 
                  className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ backgroundColor: idx === 0 ? gold : '#27272a', color: idx === 0 ? 'black' : '#a1a1aa' }}
                >
                  {idx + 1}
                </span>
              </div>
              <span className="text-white flex-1">{item.label}</span>
              <div className="flex gap-1">
                <button 
                  onClick={() => moveItem(idx, idx - 1)}
                  disabled={idx === 0}
                  className="p-1 rounded opacity-50 hover:opacity-100 disabled:opacity-20"
                >
                  <ChevronLeft size={18} style={{ color: '#a1a1aa' }} />
                </button>
                <button 
                  onClick={() => moveItem(idx, idx + 1)}
                  disabled={idx === items.length - 1}
                  className="p-1 rounded opacity-50 hover:opacity-100 disabled:opacity-20"
                >
                  <ChevronRight size={18} style={{ color: '#a1a1aa' }} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      
      <ContextAdder context={context} onContextChange={onContextChange} />
    </div>
  );
};

// Context Adder Component (appears on every question)
const ContextAdder = ({ context, onContextChange }) => {
  const [isOpen, setIsOpen] = useState(!!context);
  
  return (
    <div className="pt-4" style={{ borderTop: '1px solid #27272a' }}>
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="text-sm flex items-center gap-2 hover:opacity-80 transition-opacity"
          style={{ color: '#71717a' }}
        >
          <span>Want to add any context?</span>
          <span style={{ color: gold }}>(optional)</span>
        </button>
      ) : (
        <div className="space-y-2">
          <label className="text-sm" style={{ color: '#71717a' }}>
            Additional context <span style={{ color: gold }}>(optional)</span>
          </label>
          <textarea
            value={context || ''}
            onChange={(e) => onContextChange(e.target.value)}
            placeholder="Share any relevant details..."
            className="w-full p-3 rounded-xl text-white text-sm resize-none focus:outline-none"
            style={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}
            rows={2}
          />
        </div>
      )}
    </div>
  );
};

// ============================================================================
// PRE-FILL COMPONENT (for existing Better Contacts users)
// ============================================================================

const PreFillReview = ({ profile, onConfirm, onEdit }) => (
  <div className="space-y-6">
    <div className="text-center">
      <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'rgba(212,168,75,0.2)' }}>
        <Sparkles size={28} style={{ color: gold }} />
      </div>
      <h2 className="text-2xl font-serif text-white mb-2">Welcome back, {profile.name.split(' ')[0]}!</h2>
      <p style={{ color: '#a1a1aa' }}>We found your profile. Let's make sure it's up to date.</p>
    </div>
    
    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}>
      <div className="p-4 flex items-center gap-4" style={{ borderBottom: '1px solid #27272a' }}>
        <div 
          className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold"
          style={{ background: 'linear-gradient(135deg, rgba(212,168,75,0.3), rgba(212,168,75,0.1))', color: gold }}
        >
          {profile.name.split(' ').map(n => n[0]).join('')}
        </div>
        <div className="flex-1">
          <p className="text-white font-semibold">{profile.name}</p>
          <p className="text-sm" style={{ color: '#71717a' }}>{profile.role} at {profile.company}</p>
        </div>
        <button 
          onClick={onEdit}
          className="p-2 rounded-lg hover:bg-white/5 transition-colors"
        >
          <Edit3 size={18} style={{ color: '#71717a' }} />
        </button>
      </div>
      
      <div className="p-4 space-y-3">
        <div>
          <p className="text-xs uppercase tracking-wider mb-1" style={{ color: '#71717a' }}>Expertise</p>
          <div className="flex flex-wrap gap-1.5">
            {profile.expertise.map((exp, i) => (
              <span key={i} className="px-2 py-1 text-xs rounded-full" style={{ backgroundColor: '#27272a', color: '#a1a1aa' }}>
                {exp}
              </span>
            ))}
          </div>
        </div>
        
        <div>
          <p className="text-xs uppercase tracking-wider mb-1" style={{ color: '#71717a' }}>Location</p>
          <p className="text-sm text-white">{profile.location}</p>
        </div>
      </div>
    </div>
    
    <p className="text-sm text-center" style={{ color: '#71717a' }}>
      This info comes from your Better Contacts profile
    </p>
    
    <button
      onClick={onConfirm}
      className="w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2"
      style={{ backgroundColor: gold, color: 'black' }}
    >
      Looks Good — Continue <ArrowRight size={18} />
    </button>
  </div>
);

// ============================================================================
// MAIN INTERVIEW COMPONENT
// ============================================================================

export default function InterviewExperienceV2() {
  const [step, setStep] = useState(0); // 0 = pre-fill review, 1+ = questions
  const [answers, setAnswers] = useState({});
  const [contexts, setContexts] = useState({});
  const [showComplete, setShowComplete] = useState(false);

  // Existing user profile (null for new users)
  const existingProfile = {
    name: 'Sarah Chen',
    role: 'Founder & CEO',
    company: 'Nexus AI',
    expertise: ['AI/ML', 'Product Strategy', 'Enterprise Sales', 'Fundraising'],
    location: 'San Francisco, CA'
  };

  // Sample questionnaire configuration (this would come from organizer setup)
  const questions = [
    // REQUIRED: Goals (always first, open text)
    {
      id: 'goals',
      type: 'open_text',
      category: 'GOALS',
      title: "What are your biggest current goals?",
      subtitle: "What are you actively working toward right now — professionally or personally?",
      placeholder: "e.g., Raising a seed round, hiring a technical co-founder, expanding into new markets...",
      hint: "The more specific you are, the better we can match you.",
      required: true
    },
    // REQUIRED: Ideal Connections (always second, open text)
    {
      id: 'ideal_connections',
      type: 'open_text',
      category: 'CONNECTIONS',
      title: "Who would be your ideal connections at this event?",
      subtitle: "Describe the type of people you'd most like to meet.",
      placeholder: "e.g., Early-stage VCs focused on AI, operators who've scaled from 10 to 100 employees...",
      hint: "Think about who could help with your goals, or who you could help.",
      required: true
    },
    // Example: Slider
    {
      id: 'tech_savvy',
      type: 'slider',
      category: 'IDENTITY',
      title: "How tech-savvy do you consider yourself when navigating new platforms and tools?",
      leftLabel: "Prefers simplicity",
      rightLabel: "Power user",
      required: false
    },
    // Example: Single Select
    {
      id: 'experience_level',
      type: 'single_select',
      category: 'BACKGROUND',
      title: "Which best describes your professional stage?",
      options: [
        { value: 'early', label: 'Early Career', description: '0-5 years, still exploring' },
        { value: 'mid', label: 'Mid-Career', description: '5-15 years, established expertise' },
        { value: 'senior', label: 'Senior / Executive', description: '15+ years, leadership roles' },
        { value: 'founder', label: 'Founder', description: 'Building your own company' }
      ],
      required: false
    },
    // Example: Multi Select
    {
      id: 'conversation_topics',
      type: 'multi_select',
      category: 'PREFERENCES',
      title: "What topics are you most excited to discuss?",
      maxSelections: 3,
      options: [
        { value: 'ai_ml', label: 'AI & Machine Learning' },
        { value: 'fundraising', label: 'Fundraising & Investment' },
        { value: 'product', label: 'Product Development' },
        { value: 'growth', label: 'Growth & Marketing' },
        { value: 'hiring', label: 'Hiring & Team Building' },
        { value: 'operations', label: 'Operations & Scale' },
        { value: 'industry', label: 'Industry Trends' },
        { value: 'personal', label: 'Personal Development' }
      ],
      required: false
    },
    // Example: Mad-Lib
    {
      id: 'current_challenge',
      type: 'mad_lib',
      category: 'GOALS',
      title: "Tell us about a challenge you're facing.",
      template: "Right now, I'm trying to {action} , but it's difficult because {blocker} .",
      fields: [
        { id: 'action', placeholder: 'what are you trying to do?' },
        { id: 'blocker', placeholder: 'what\'s in the way?' }
      ],
      required: false
    },
    // Example: Ranking
    {
      id: 'priorities',
      type: 'ranking',
      category: 'GOALS',
      title: "Rank what you're hoping to get from this event.",
      items: [
        { id: 'investors', label: 'Meet potential investors' },
        { id: 'partners', label: 'Find business partners' },
        { id: 'learn', label: 'Learn from peers' },
        { id: 'hire', label: 'Find talent to hire' },
        { id: 'fun', label: 'Have fun and socialize' }
      ],
      required: false
    }
  ];

  const currentQuestion = questions[step - 1];
  const totalSteps = questions.length + 1; // +1 for pre-fill review
  const progress = (step / totalSteps) * 100;

  const updateAnswer = (value) => {
    setAnswers({ ...answers, [currentQuestion.id]: value });
  };

  const updateContext = (value) => {
    setContexts({ ...contexts, [currentQuestion.id]: value });
  };

  const handleNext = () => {
    if (step < totalSteps - 1) {
      setStep(step + 1);
    } else {
      setShowComplete(true);
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const canContinue = () => {
    if (step === 0) return true; // Pre-fill review
    const q = currentQuestion;
    if (!q.required) return true;
    const answer = answers[q.id];
    if (!answer) return false;
    if (typeof answer === 'string') return answer.trim().length > 0;
    if (Array.isArray(answer)) return answer.length > 0;
    return true;
  };

  const renderQuestion = () => {
    const q = currentQuestion;
    const value = answers[q.id];
    const context = contexts[q.id];
    
    const props = { 
      question: q, 
      value, 
      onChange: updateAnswer, 
      context, 
      onContextChange: updateContext 
    };
    
    switch (q.type) {
      case 'open_text': return <OpenTextQuestion {...props} />;
      case 'slider': return <SliderQuestion {...props} />;
      case 'single_select': return <SingleSelectQuestion {...props} />;
      case 'multi_select': return <MultiSelectQuestion {...props} />;
      case 'mad_lib': return <MadLibQuestion {...props} />;
      case 'ranking': return <RankingQuestion {...props} />;
      default: return null;
    }
  };

  if (showComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: '#09090b' }}>
        <div className="max-w-md mx-auto text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: 'rgba(74,222,128,0.2)' }}>
            <Sparkles size={36} style={{ color: '#4ade80' }} />
          </div>
          <h1 className="text-3xl font-serif text-white mb-3">You're All Set!</h1>
          <p className="text-lg mb-6" style={{ color: '#a1a1aa' }}>
            We're analyzing your responses to find your best connections.
          </p>
          <p className="text-sm" style={{ color: '#71717a' }}>
            You'll receive your curated matches 24-48 hours before the event.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#09090b', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 z-50" style={{ backgroundColor: '#27272a' }}>
        <div 
          className="h-full transition-all duration-300"
          style={{ width: `${progress}%`, backgroundColor: gold }}
        />
      </div>
      
      {/* Header */}
      <div className="px-6 pt-8 pb-4">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={18} style={{ color: gold }} />
            <span className="text-white font-medium">M33T</span>
          </div>
          <span className="text-sm" style={{ color: '#71717a' }}>
            {step} of {totalSteps - 1}
          </span>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 px-6 py-8">
        <div className="max-w-xl mx-auto">
          {step === 0 ? (
            <PreFillReview 
              profile={existingProfile}
              onConfirm={handleNext}
              onEdit={() => alert('Open profile editor')}
            />
          ) : (
            renderQuestion()
          )}
        </div>
      </div>
      
      {/* Footer Navigation */}
      {step > 0 && (
        <div className="px-6 py-6" style={{ borderTop: '1px solid #27272a' }}>
          <div className="max-w-xl mx-auto flex items-center justify-between">
            <button
              onClick={handleBack}
              className="flex items-center gap-1 text-sm hover:opacity-80 transition-opacity"
              style={{ color: '#71717a' }}
            >
              <ChevronLeft size={18} /> Back
            </button>
            
            <div className="flex items-center gap-4">
              {!currentQuestion?.required && (
                <button
                  onClick={handleNext}
                  className="text-sm hover:opacity-80 transition-opacity"
                  style={{ color: '#71717a' }}
                >
                  Skip this question
                </button>
              )}
              
              <button
                onClick={handleNext}
                disabled={!canContinue()}
                className="px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all disabled:opacity-50"
                style={{ backgroundColor: gold, color: 'black' }}
              >
                Continue <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
