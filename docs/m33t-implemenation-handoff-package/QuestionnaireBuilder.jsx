import React, { useState } from 'react';
import { Plus, GripVertical, Trash2, Edit3, Eye, ChevronDown, ChevronUp, Copy, Check, Settings, Sparkles, Lock, AlertCircle, LayoutTemplate, FileText } from 'lucide-react';

const gold = '#D4A84B';

// ============================================================================
// QUESTION TYPE DEFINITIONS
// ============================================================================

const QUESTION_TYPES = [
  { id: 'open_text', label: 'Open Text', icon: '📝', description: 'Free-form text response' },
  { id: 'slider', label: 'Slider', icon: '🎚️', description: 'Spectrum between two poles' },
  { id: 'single_select', label: 'Single Select', icon: '⭕', description: 'Choose one option' },
  { id: 'multi_select', label: 'Multi Select', icon: '☑️', description: 'Choose multiple options' },
  { id: 'mad_lib', label: 'Mad-Lib', icon: '🧩', description: 'Fill-in-the-blank sentence' },
  { id: 'ranking', label: 'Ranking', icon: '📊', description: 'Drag to order by priority' }
];

const FIXED_CATEGORIES = [
  { id: 'goals', label: 'GOALS', description: 'What they want to achieve', required: true },
  { id: 'connections', label: 'CONNECTIONS', description: 'Who they want to meet', required: true },
  { id: 'identity', label: 'IDENTITY', description: 'Who they are', required: false },
  { id: 'background', label: 'BACKGROUND', description: 'Professional context', required: false },
  { id: 'preferences', label: 'PREFERENCES', description: 'How they like to interact', required: false }
];

// ============================================================================
// STARTER QUESTIONS (Essential defaults)
// ============================================================================

const REQUIRED_QUESTIONS = [
  {
    id: 'goals',
    type: 'open_text',
    category: 'goals',
    title: "What are your biggest current goals?",
    subtitle: "What are you actively working toward right now — professionally or personally?",
    placeholder: "e.g., Raising a seed round, hiring a technical co-founder, expanding into new markets...",
    hint: "The more specific you are, the better we can match you.",
    required: true,
    locked: true // Cannot be removed
  },
  {
    id: 'ideal_connections',
    type: 'open_text',
    category: 'connections',
    title: "Who would be your ideal connections at this event?",
    subtitle: "Describe the type of people you'd most like to meet.",
    placeholder: "e.g., Early-stage VCs focused on AI, operators who've scaled from 10 to 100 employees...",
    hint: "Think about who could help with your goals, or who you could help.",
    required: true,
    locked: true // Cannot be removed
  }
];

const STARTER_QUESTIONS = [
  ...REQUIRED_QUESTIONS,
  {
    id: 'experience_level',
    type: 'single_select',
    category: 'background',
    title: "Which best describes your professional stage?",
    options: [
      { value: 'early', label: 'Early Career', description: '0-5 years, still exploring' },
      { value: 'mid', label: 'Mid-Career', description: '5-15 years, established expertise' },
      { value: 'senior', label: 'Senior / Executive', description: '15+ years, leadership roles' },
      { value: 'founder', label: 'Founder', description: 'Building your own company' }
    ],
    required: false,
    locked: false
  },
  {
    id: 'conversation_topics',
    type: 'multi_select',
    category: 'preferences',
    title: "What topics are you most excited to discuss?",
    maxSelections: 3,
    options: [
      { value: 'ai_ml', label: 'AI & Machine Learning' },
      { value: 'fundraising', label: 'Fundraising & Investment' },
      { value: 'product', label: 'Product Development' },
      { value: 'growth', label: 'Growth & Marketing' },
      { value: 'hiring', label: 'Hiring & Team Building' },
      { value: 'operations', label: 'Operations & Scale' }
    ],
    required: false,
    locked: false
  }
];

// ============================================================================
// QUESTION CARD COMPONENT
// ============================================================================

const QuestionCard = ({ question, index, onEdit, onDelete, onDuplicate, onToggleRequired, onMoveUp, onMoveDown, isFirst, isLast }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const questionType = QUESTION_TYPES.find(t => t.id === question.type);
  const category = FIXED_CATEGORIES.find(c => c.id === question.category) || { label: question.category.toUpperCase() };
  
  return (
    <div 
      className="rounded-xl overflow-hidden transition-all"
      style={{ backgroundColor: '#18181b', border: question.locked ? `1px solid ${gold}40` : '1px solid #3f3f46' }}
    >
      {/* Header */}
      <div className="p-4 flex items-start gap-3">
        <div className="flex flex-col items-center gap-1 pt-1">
          {!question.locked && (
            <GripVertical size={18} style={{ color: '#71717a' }} className="cursor-grab" />
          )}
          {question.locked && (
            <Lock size={14} style={{ color: gold }} />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium px-2 py-0.5 rounded" style={{ backgroundColor: '#27272a', color: gold }}>
              {category.label}
            </span>
            <span className="text-xs" style={{ color: '#71717a' }}>
              {questionType?.icon} {questionType?.label}
            </span>
            {question.required && (
              <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(239,68,68,0.2)', color: '#ef4444' }}>
                Required
              </span>
            )}
          </div>
          
          <p className="text-white font-medium leading-snug line-clamp-2">
            {question.title}
          </p>
          
          {question.subtitle && (
            <p className="text-sm mt-1 line-clamp-1" style={{ color: '#71717a' }}>
              {question.subtitle}
            </p>
          )}
        </div>
        
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 rounded hover:bg-white/5"
        >
          {isExpanded ? <ChevronUp size={18} style={{ color: '#71717a' }} /> : <ChevronDown size={18} style={{ color: '#71717a' }} />}
        </button>
      </div>
      
      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3" style={{ borderTop: '1px solid #27272a' }}>
          <div className="pt-3">
            {/* Question-type specific preview */}
            {question.type === 'single_select' && question.options && (
              <div className="space-y-1">
                <p className="text-xs mb-2" style={{ color: '#71717a' }}>Options:</p>
                {question.options.map((opt, i) => (
                  <div key={i} className="text-sm text-white pl-4">• {opt.label}</div>
                ))}
              </div>
            )}
            
            {question.type === 'multi_select' && question.options && (
              <div className="space-y-1">
                <p className="text-xs mb-2" style={{ color: '#71717a' }}>Options (select up to {question.maxSelections || 3}):</p>
                {question.options.map((opt, i) => (
                  <div key={i} className="text-sm text-white pl-4">☐ {opt.label}</div>
                ))}
              </div>
            )}
            
            {question.type === 'slider' && (
              <div className="flex items-center gap-4 text-sm" style={{ color: '#a1a1aa' }}>
                <span>{question.leftLabel || 'Low'}</span>
                <div className="flex-1 h-2 rounded-full" style={{ backgroundColor: '#27272a' }}>
                  <div className="w-1/2 h-full rounded-full" style={{ backgroundColor: gold }} />
                </div>
                <span>{question.rightLabel || 'High'}</span>
              </div>
            )}
            
            {question.type === 'mad_lib' && question.template && (
              <div className="text-sm p-3 rounded-lg" style={{ backgroundColor: '#27272a', color: '#a1a1aa' }}>
                {question.template}
              </div>
            )}
            
            {question.type === 'ranking' && question.items && (
              <div className="space-y-1">
                <p className="text-xs mb-2" style={{ color: '#71717a' }}>Items to rank:</p>
                {question.items.map((item, i) => (
                  <div key={i} className="text-sm text-white pl-4">{i + 1}. {item.label}</div>
                ))}
              </div>
            )}
            
            {question.placeholder && (
              <p className="text-sm mt-2" style={{ color: '#71717a' }}>
                Placeholder: "{question.placeholder}"
              </p>
            )}
          </div>
          
          {/* Actions */}
          <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid #27272a' }}>
            <div className="flex items-center gap-2">
              {!question.locked && (
                <>
                  <button
                    onClick={() => onMoveUp(index)}
                    disabled={isFirst || index <= 1} // Can't move above required questions
                    className="p-2 rounded-lg hover:bg-white/5 disabled:opacity-30 transition-all"
                  >
                    <ChevronUp size={16} style={{ color: '#71717a' }} />
                  </button>
                  <button
                    onClick={() => onMoveDown(index)}
                    disabled={isLast}
                    className="p-2 rounded-lg hover:bg-white/5 disabled:opacity-30 transition-all"
                  >
                    <ChevronDown size={16} style={{ color: '#71717a' }} />
                  </button>
                </>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {!question.locked && (
                <button
                  onClick={() => onToggleRequired(index)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{ 
                    backgroundColor: question.required ? 'rgba(239,68,68,0.2)' : '#27272a',
                    color: question.required ? '#ef4444' : '#a1a1aa'
                  }}
                >
                  {question.required ? 'Required' : 'Optional'}
                </button>
              )}
              
              <button
                onClick={() => onDuplicate(index)}
                className="p-2 rounded-lg hover:bg-white/5 transition-all"
                title="Duplicate"
              >
                <Copy size={16} style={{ color: '#71717a' }} />
              </button>
              
              <button
                onClick={() => onEdit(index)}
                className="p-2 rounded-lg hover:bg-white/5 transition-all"
                title="Edit"
              >
                <Edit3 size={16} style={{ color: '#71717a' }} />
              </button>
              
              {!question.locked && (
                <button
                  onClick={() => onDelete(index)}
                  className="p-2 rounded-lg hover:bg-red-500/10 transition-all"
                  title="Delete"
                >
                  <Trash2 size={16} style={{ color: '#ef4444' }} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// ADD QUESTION MODAL
// ============================================================================

const AddQuestionModal = ({ onAdd, onClose }) => {
  const [selectedType, setSelectedType] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    category: 'identity',
    required: false,
    // Type-specific
    placeholder: '',
    hint: '',
    leftLabel: '',
    rightLabel: '',
    options: [{ value: '', label: '', description: '' }],
    maxSelections: 3,
    template: '',
    fields: [{ id: 'field1', placeholder: '' }],
    items: [{ id: 'item1', label: '' }]
  });

  const updateFormData = (key, value) => {
    setFormData({ ...formData, [key]: value });
  };

  const addOption = () => {
    updateFormData('options', [...formData.options, { value: '', label: '', description: '' }]);
  };

  const updateOption = (index, field, value) => {
    const newOptions = [...formData.options];
    newOptions[index][field] = value;
    if (field === 'label') newOptions[index].value = value.toLowerCase().replace(/\s+/g, '_');
    updateFormData('options', newOptions);
  };

  const removeOption = (index) => {
    updateFormData('options', formData.options.filter((_, i) => i !== index));
  };

  const addRankingItem = () => {
    updateFormData('items', [...formData.items, { id: `item${formData.items.length + 1}`, label: '' }]);
  };

  const updateRankingItem = (index, label) => {
    const newItems = [...formData.items];
    newItems[index].label = label;
    updateFormData('items', newItems);
  };

  const handleSubmit = () => {
    const question = {
      id: `q_${Date.now()}`,
      type: selectedType,
      category: formData.category,
      title: formData.title,
      subtitle: formData.subtitle || undefined,
      required: formData.required,
      locked: false
    };

    // Add type-specific fields
    if (selectedType === 'open_text') {
      question.placeholder = formData.placeholder;
      question.hint = formData.hint;
    } else if (selectedType === 'slider') {
      question.leftLabel = formData.leftLabel;
      question.rightLabel = formData.rightLabel;
    } else if (selectedType === 'single_select' || selectedType === 'multi_select') {
      question.options = formData.options.filter(o => o.label);
      if (selectedType === 'multi_select') question.maxSelections = formData.maxSelections;
    } else if (selectedType === 'mad_lib') {
      question.template = formData.template;
      question.fields = formData.fields.filter(f => f.placeholder);
    } else if (selectedType === 'ranking') {
      question.items = formData.items.filter(i => i.label).map((item, idx) => ({ ...item, id: `item${idx}` }));
    }

    onAdd(question);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
      <div 
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl"
        style={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}
      >
        <div className="p-6 sticky top-0 z-10" style={{ backgroundColor: '#18181b', borderBottom: '1px solid #27272a' }}>
          <h2 className="text-xl font-semibold text-white">
            {selectedType ? 'Configure Question' : 'Add Question'}
          </h2>
        </div>

        <div className="p-6">
          {!selectedType ? (
            // Type Selection
            <div className="grid grid-cols-2 gap-3">
              {QUESTION_TYPES.map(type => (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(type.id)}
                  className="p-4 rounded-xl text-left transition-all hover:scale-102"
                  style={{ backgroundColor: '#27272a', border: '1px solid #3f3f46' }}
                >
                  <span className="text-2xl mb-2 block">{type.icon}</span>
                  <p className="text-white font-medium">{type.label}</p>
                  <p className="text-xs mt-1" style={{ color: '#71717a' }}>{type.description}</p>
                </button>
              ))}
            </div>
          ) : (
            // Question Configuration
            <div className="space-y-4">
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => updateFormData('category', e.target.value)}
                  className="w-full p-3 rounded-xl text-white"
                  style={{ backgroundColor: '#27272a', border: '1px solid #3f3f46' }}
                >
                  {FIXED_CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">Question Title *</label>
                <textarea
                  value={formData.title}
                  onChange={(e) => updateFormData('title', e.target.value)}
                  placeholder="What do you want to ask?"
                  className="w-full p-3 rounded-xl text-white resize-none"
                  style={{ backgroundColor: '#27272a', border: '1px solid #3f3f46' }}
                  rows={2}
                />
              </div>

              {/* Subtitle */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">Subtitle (optional)</label>
                <input
                  type="text"
                  value={formData.subtitle}
                  onChange={(e) => updateFormData('subtitle', e.target.value)}
                  placeholder="Additional context or instructions"
                  className="w-full p-3 rounded-xl text-white"
                  style={{ backgroundColor: '#27272a', border: '1px solid #3f3f46' }}
                />
              </div>

              {/* Type-specific fields */}
              {selectedType === 'open_text' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Placeholder</label>
                    <input
                      type="text"
                      value={formData.placeholder}
                      onChange={(e) => updateFormData('placeholder', e.target.value)}
                      placeholder="e.g., Share your thoughts..."
                      className="w-full p-3 rounded-xl text-white"
                      style={{ backgroundColor: '#27272a', border: '1px solid #3f3f46' }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Hint (optional)</label>
                    <input
                      type="text"
                      value={formData.hint}
                      onChange={(e) => updateFormData('hint', e.target.value)}
                      placeholder="Helper text shown below the input"
                      className="w-full p-3 rounded-xl text-white"
                      style={{ backgroundColor: '#27272a', border: '1px solid #3f3f46' }}
                    />
                  </div>
                </>
              )}

              {selectedType === 'slider' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Left Label</label>
                    <input
                      type="text"
                      value={formData.leftLabel}
                      onChange={(e) => updateFormData('leftLabel', e.target.value)}
                      placeholder="e.g., Low"
                      className="w-full p-3 rounded-xl text-white"
                      style={{ backgroundColor: '#27272a', border: '1px solid #3f3f46' }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Right Label</label>
                    <input
                      type="text"
                      value={formData.rightLabel}
                      onChange={(e) => updateFormData('rightLabel', e.target.value)}
                      placeholder="e.g., High"
                      className="w-full p-3 rounded-xl text-white"
                      style={{ backgroundColor: '#27272a', border: '1px solid #3f3f46' }}
                    />
                  </div>
                </div>
              )}

              {(selectedType === 'single_select' || selectedType === 'multi_select') && (
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Options</label>
                  <div className="space-y-2">
                    {formData.options.map((opt, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          type="text"
                          value={opt.label}
                          onChange={(e) => updateOption(idx, 'label', e.target.value)}
                          placeholder={`Option ${idx + 1}`}
                          className="flex-1 p-2 rounded-lg text-white text-sm"
                          style={{ backgroundColor: '#27272a', border: '1px solid #3f3f46' }}
                        />
                        <input
                          type="text"
                          value={opt.description}
                          onChange={(e) => updateOption(idx, 'description', e.target.value)}
                          placeholder="Description (optional)"
                          className="flex-1 p-2 rounded-lg text-white text-sm"
                          style={{ backgroundColor: '#27272a', border: '1px solid #3f3f46' }}
                        />
                        <button
                          onClick={() => removeOption(idx)}
                          className="p-2 rounded-lg hover:bg-red-500/10"
                        >
                          <Trash2 size={14} style={{ color: '#ef4444' }} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={addOption}
                      className="text-sm flex items-center gap-1 mt-2"
                      style={{ color: gold }}
                    >
                      <Plus size={14} /> Add option
                    </button>
                  </div>
                  
                  {selectedType === 'multi_select' && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-white mb-2">Max Selections</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={formData.maxSelections}
                        onChange={(e) => updateFormData('maxSelections', parseInt(e.target.value))}
                        className="w-20 p-2 rounded-lg text-white text-center"
                        style={{ backgroundColor: '#27272a', border: '1px solid #3f3f46' }}
                      />
                    </div>
                  )}
                </div>
              )}

              {selectedType === 'mad_lib' && (
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Template <span className="text-xs" style={{ color: '#71717a' }}>(use {'{field_id}'} for blanks)</span>
                  </label>
                  <textarea
                    value={formData.template}
                    onChange={(e) => updateFormData('template', e.target.value)}
                    placeholder="Right now, I'm trying to {action} , but it's difficult because {blocker} ."
                    className="w-full p-3 rounded-xl text-white resize-none text-sm"
                    style={{ backgroundColor: '#27272a', border: '1px solid #3f3f46' }}
                    rows={3}
                  />
                  <p className="text-xs mt-2" style={{ color: '#71717a' }}>
                    Example: "I want to {'{goal}'} within {'{timeframe}'}"
                  </p>
                </div>
              )}

              {selectedType === 'ranking' && (
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Items to Rank</label>
                  <div className="space-y-2">
                    {formData.items.map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <span className="w-6 text-center text-sm" style={{ color: '#71717a' }}>{idx + 1}.</span>
                        <input
                          type="text"
                          value={item.label}
                          onChange={(e) => updateRankingItem(idx, e.target.value)}
                          placeholder={`Item ${idx + 1}`}
                          className="flex-1 p-2 rounded-lg text-white text-sm"
                          style={{ backgroundColor: '#27272a', border: '1px solid #3f3f46' }}
                        />
                      </div>
                    ))}
                    <button
                      onClick={addRankingItem}
                      className="text-sm flex items-center gap-1 mt-2"
                      style={{ color: gold }}
                    >
                      <Plus size={14} /> Add item
                    </button>
                  </div>
                </div>
              )}

              {/* Required Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: '#27272a' }}>
                <span className="text-white">Required question</span>
                <button
                  onClick={() => updateFormData('required', !formData.required)}
                  className="w-12 h-6 rounded-full transition-all relative"
                  style={{ backgroundColor: formData.required ? gold : '#3f3f46' }}
                >
                  <div 
                    className="absolute w-5 h-5 rounded-full bg-white top-0.5 transition-all"
                    style={{ left: formData.required ? '26px' : '2px' }}
                  />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 flex justify-between" style={{ borderTop: '1px solid #27272a' }}>
          <button
            onClick={selectedType ? () => setSelectedType(null) : onClose}
            className="px-4 py-2 rounded-xl"
            style={{ backgroundColor: '#27272a', color: '#a1a1aa' }}
          >
            {selectedType ? 'Back' : 'Cancel'}
          </button>
          
          {selectedType && (
            <button
              onClick={handleSubmit}
              disabled={!formData.title}
              className="px-6 py-2 rounded-xl font-medium disabled:opacity-50"
              style={{ backgroundColor: gold, color: 'black' }}
            >
              Add Question
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN QUESTIONNAIRE BUILDER COMPONENT
// ============================================================================

export default function QuestionnaireBuilder() {
  const [questions, setQuestions] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);

  // Initialize with starter or scratch
  const startWithEssentials = () => {
    setQuestions([...STARTER_QUESTIONS]);
    setSetupComplete(true);
  };

  const startFromScratch = () => {
    setQuestions([...REQUIRED_QUESTIONS]);
    setSetupComplete(true);
  };

  const addQuestion = (question) => {
    setQuestions([...questions, question]);
  };

  const deleteQuestion = (index) => {
    if (questions[index].locked) return;
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const duplicateQuestion = (index) => {
    const original = questions[index];
    const duplicate = { 
      ...original, 
      id: `${original.id}_copy_${Date.now()}`,
      locked: false,
      required: false
    };
    setQuestions([...questions.slice(0, index + 1), duplicate, ...questions.slice(index + 1)]);
  };

  const toggleRequired = (index) => {
    if (questions[index].locked) return;
    const newQuestions = [...questions];
    newQuestions[index].required = !newQuestions[index].required;
    setQuestions(newQuestions);
  };

  const moveQuestion = (fromIndex, toIndex) => {
    if (toIndex < 2) return; // Can't move above required questions
    const newQuestions = [...questions];
    const [removed] = newQuestions.splice(fromIndex, 1);
    newQuestions.splice(toIndex, 0, removed);
    setQuestions(newQuestions);
  };

  const editQuestion = (index) => {
    alert(`Edit question: ${questions[index].title}\n\n(Full edit modal would open here)`);
  };

  // Setup Screen
  if (!setupComplete) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ backgroundColor: '#09090b' }}>
        <div className="max-w-lg w-full text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: 'rgba(212,168,75,0.2)' }}>
            <Sparkles size={28} style={{ color: gold }} />
          </div>
          
          <h1 className="text-3xl font-serif text-white mb-3">Configure Your Questionnaire</h1>
          <p className="mb-8" style={{ color: '#a1a1aa' }}>
            Choose how to start building your attendee intake experience.
          </p>
          
          <div className="space-y-4">
            <button
              onClick={startWithEssentials}
              className="w-full p-5 rounded-xl text-left transition-all hover:scale-102"
              style={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(212,168,75,0.2)' }}>
                  <LayoutTemplate size={24} style={{ color: gold }} />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg">Start with Essentials</h3>
                  <p className="text-sm mt-1" style={{ color: '#71717a' }}>
                    4 pre-configured questions covering goals, connections, background, and preferences. Edit and add more as needed.
                  </p>
                </div>
              </div>
            </button>
            
            <button
              onClick={startFromScratch}
              className="w-full p-5 rounded-xl text-left transition-all hover:scale-102"
              style={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl" style={{ backgroundColor: '#27272a' }}>
                  <FileText size={24} style={{ color: '#a1a1aa' }} />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg">Build from Scratch</h3>
                  <p className="text-sm mt-1" style={{ color: '#71717a' }}>
                    Start with just the 2 required questions (Goals & Ideal Connections) and build your own from there.
                  </p>
                </div>
              </div>
            </button>
          </div>
          
          <div className="mt-8 p-4 rounded-xl" style={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}>
            <div className="flex items-start gap-3">
              <AlertCircle size={18} style={{ color: gold }} className="flex-shrink-0 mt-0.5" />
              <p className="text-sm text-left" style={{ color: '#a1a1aa' }}>
                <strong className="text-white">Two questions are always required:</strong> "What are your goals?" and "Who are your ideal connections?" These are essential for us to generate meaningful match recommendations.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#09090b', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <div className="px-6 py-4" style={{ borderBottom: '1px solid #27272a' }}>
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">Questionnaire Builder</h1>
            <p className="text-sm" style={{ color: '#71717a' }}>{questions.length} questions configured</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPreview(true)}
              className="px-4 py-2 rounded-xl flex items-center gap-2"
              style={{ backgroundColor: '#27272a', color: '#a1a1aa' }}
            >
              <Eye size={16} /> Preview
            </button>
            <button
              className="px-4 py-2 rounded-xl flex items-center gap-2 font-medium"
              style={{ backgroundColor: gold, color: 'black' }}
            >
              <Check size={16} /> Save
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-8">
        <div className="max-w-3xl mx-auto space-y-4">
          {/* Questions List */}
          {questions.map((question, index) => (
            <QuestionCard
              key={question.id}
              question={question}
              index={index}
              onEdit={editQuestion}
              onDelete={deleteQuestion}
              onDuplicate={duplicateQuestion}
              onToggleRequired={toggleRequired}
              onMoveUp={() => moveQuestion(index, index - 1)}
              onMoveDown={() => moveQuestion(index, index + 1)}
              isFirst={index === 0}
              isLast={index === questions.length - 1}
            />
          ))}

          {/* Add Question Button */}
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full p-4 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 transition-all hover:border-solid"
            style={{ borderColor: '#3f3f46', color: '#71717a' }}
          >
            <Plus size={20} />
            <span>Add Question</span>
          </button>
        </div>
      </div>

      {/* Add Question Modal */}
      {showAddModal && (
        <AddQuestionModal
          onAdd={addQuestion}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* Preview Modal (simplified) */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}>
          <div className="w-full max-w-md text-center">
            <p className="text-white mb-4">Preview Mode</p>
            <p className="text-sm mb-6" style={{ color: '#71717a' }}>
              (Full interactive preview would render here showing the attendee experience)
            </p>
            <button
              onClick={() => setShowPreview(false)}
              className="px-6 py-3 rounded-xl"
              style={{ backgroundColor: gold, color: 'black' }}
            >
              Close Preview
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
