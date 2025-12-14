import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Mail, MapPin, Linkedin, ExternalLink, Edit, MoreHorizontal,
  Sparkles, Send, Bell, X, Plus, Check, Trash2, Save
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
    border: 'rgba(201, 162, 39, 0.25)',
  },
  category: {
    relationship: { bg: 'rgba(59, 130, 246, 0.2)', text: '#60A5FA', border: 'rgba(59, 130, 246, 0.3)' },
    opportunity: { bg: 'rgba(34, 197, 94, 0.2)', text: '#4ADE80', border: 'rgba(34, 197, 94, 0.3)' },
    expertise: { bg: 'rgba(168, 85, 247, 0.2)', text: '#C084FC', border: 'rgba(168, 85, 247, 0.3)' },
    interest: { bg: 'rgba(245, 158, 11, 0.2)', text: '#FBBF24', border: 'rgba(245, 158, 11, 0.3)' },
  },
  border: 'rgba(255, 255, 255, 0.08)',
  success: '#4ADE80',
  error: '#EF4444',
};

// ============================================================================
// SAMPLE CONTACT DATA
// ============================================================================

const sampleContact = {
  id: '1',
  name: 'Sarah Chen',
  email: 'sarah@example.com',
  title: 'Angel Investor',
  company: 'Independent',
  location: 'San Francisco, CA',
  linkedinUrl: 'https://linkedin.com/in/sarahchen',
  
  whyNow: 'F&F round experience, warm relationship, you helped her with analytics last year. She mentioned her fund is deploying in Q1 — good timing to reconnect.',
  
  howWeMet: 'Google AI Accelerator program, Fall 2023',
  relationshipStrength: 3,
  lastContactDate: new Date('2024-09-15'),
  relationshipHistory: 'Met during the Google AI program cohort. She was impressed by the shipping cost analysis work and asked for help with her portfolio company analytics. Delivered in 2 weeks, she was thrilled with the speed.',
  
  expertise: 'SaaS operations, B2B sales, early-stage fundraising, go-to-market strategy',
  interests: 'Trail running, mentoring first-time founders, natural wine, podcasts',
  
  tags: [
    { id: '1', text: 'Potential LP', category: 'opportunity' },
    { id: '2', text: 'Warm Relationship', category: 'relationship' },
    { id: '3', text: 'SaaS Expert', category: 'expertise' },
  ],
  
  notes: 'Follow up after the holidays about the F&F round. She prefers early morning calls (before 8am PT). Her assistant is Jamie — cc on scheduling emails.',
  
  enrichmentScore: 85,
  createdAt: new Date('2023-10-15'),
  lastEnrichedAt: new Date('2024-11-01'),
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const getRelativeTime = (date) => {
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
};

const getInitials = (name) => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

const formatDate = (date) => {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// ============================================================================
// SHARED COMPONENTS
// ============================================================================

const Avatar = ({ name, size = 80 }) => {
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
      fontSize: size * 0.35,
      fontWeight: 600,
      color: 'rgba(255,255,255,0.9)',
      flexShrink: 0,
    }}>
      {initials}
    </div>
  );
};

const GlassCard = ({ children, style = {}, gold = false }) => (
  <div style={{
    background: gold ? colors.gold.subtle : colors.bg.glass,
    backdropFilter: 'blur(20px)',
    borderRadius: 12,
    border: `1px solid ${gold ? colors.gold.border : colors.border}`,
    ...style,
  }}>
    {children}
  </div>
);

const Badge = ({ children, category, onRemove }) => {
  const c = colors.category[category] || { bg: 'rgba(255,255,255,0.1)', text: '#fff', border: 'rgba(255,255,255,0.2)' };
  
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '6px 10px',
      paddingRight: onRemove ? 6 : 10,
      borderRadius: 16,
      fontSize: 13,
      fontWeight: 500,
      background: c.bg,
      color: c.text,
      border: `1px solid ${c.border}`,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.text }} />
      {children}
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          style={{
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            marginLeft: 2,
          }}
        >
          <X size={10} color={c.text} />
        </button>
      )}
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
    },
    secondary: {
      background: isHovered ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.08)',
      color: '#fff',
    },
    ghost: {
      background: isHovered ? 'rgba(255,255,255,0.05)' : 'transparent',
      color: isHovered ? '#fff' : colors.text.secondary,
    },
    danger: {
      background: isHovered ? '#DC2626' : 'transparent',
      color: isHovered ? '#fff' : colors.error,
    },
  };
  
  const sizes = {
    sm: { padding: '6px 12px', fontSize: 13 },
    md: { padding: '10px 18px', fontSize: 14 },
    lg: { padding: '14px 28px', fontSize: 15 },
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

const SectionHeader = ({ children, action }) => (
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  }}>
    <h3 style={{
      fontSize: 11,
      fontWeight: 600,
      color: colors.text.tertiary,
      textTransform: 'uppercase',
      letterSpacing: 1,
      margin: 0,
    }}>
      {children}
    </h3>
    {action}
  </div>
);

const StrengthIndicator = ({ strength }) => {
  const labels = ['Weak', 'Casual', 'Good', 'Strong'];
  const labelColors = [colors.error, colors.text.tertiary, colors.gold.primary, colors.success];
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ display: 'flex', gap: 2 }}>
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: i <= strength ? labelColors[strength - 1] : 'rgba(255,255,255,0.15)',
              transition: 'background 0.2s ease',
            }}
          />
        ))}
      </div>
      <span style={{ fontSize: 13, color: labelColors[strength - 1], fontWeight: 500 }}>
        {labels[strength - 1]}
      </span>
    </div>
  );
};

const EditableText = ({ value, onChange, multiline = false, placeholder = '', gold = false }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  
  const handleSave = () => {
    onChange(editValue);
    setIsEditing(false);
  };
  
  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };
  
  if (isEditing) {
    const inputStyle = {
      width: '100%',
      background: 'rgba(255,255,255,0.05)',
      border: `1px solid ${colors.gold.primary}`,
      borderRadius: 8,
      padding: 12,
      color: '#fff',
      fontSize: 14,
      lineHeight: 1.6,
      outline: 'none',
      resize: 'vertical',
    };
    
    return (
      <div>
        {multiline ? (
          <textarea
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            style={{ ...inputStyle, minHeight: 100 }}
            autoFocus
          />
        ) : (
          <input
            type="text"
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            style={inputStyle}
            autoFocus
          />
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <Button size="sm" onClick={handleSave}>
            <Check size={14} /> Save
          </Button>
          <Button size="sm" variant="ghost" onClick={handleCancel}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div
      onClick={() => setIsEditing(true)}
      style={{
        padding: 12,
        borderRadius: 8,
        background: gold ? 'transparent' : 'rgba(255,255,255,0.02)',
        border: `1px solid transparent`,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        fontSize: 14,
        color: value ? colors.text.secondary : colors.text.tertiary,
        lineHeight: 1.6,
        fontStyle: value ? 'normal' : 'italic',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = colors.border}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
    >
      {value || placeholder}
      <Edit size={14} style={{ marginLeft: 8, opacity: 0.4, verticalAlign: 'middle' }} />
    </div>
  );
};

// ============================================================================
// TAG PICKER COMPONENT
// ============================================================================

const TagPicker = ({ isOpen, onClose, onAdd, existingTags }) => {
  const [newTagText, setNewTagText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('relationship');
  
  const categories = ['relationship', 'opportunity', 'expertise', 'interest'];
  
  const handleAdd = () => {
    if (newTagText.trim()) {
      onAdd({ text: newTagText.trim(), category: selectedCategory });
      setNewTagText('');
      onClose();
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: 16,
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 400,
        }}
      >
        <GlassCard style={{ padding: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 16, marginTop: 0 }}>
            Add Tag
          </h3>
          
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: colors.text.tertiary, display: 'block', marginBottom: 6 }}>
              Tag Name
            </label>
            <input
              type="text"
              value={newTagText}
              onChange={e => setNewTagText(e.target.value)}
              placeholder="e.g., Potential Advisor"
              autoFocus
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${colors.border}`,
                borderRadius: 8,
                padding: 12,
                color: '#fff',
                fontSize: 14,
                outline: 'none',
                boxSizing: 'border-box',
              }}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
          </div>
          
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: colors.text.tertiary, display: 'block', marginBottom: 8 }}>
              Category
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 20,
                    border: selectedCategory === cat 
                      ? `2px solid ${colors.category[cat].text}`
                      : `1px solid ${colors.border}`,
                    background: selectedCategory === cat ? colors.category[cat].bg : 'transparent',
                    color: selectedCategory === cat ? colors.category[cat].text : colors.text.secondary,
                    fontSize: 13,
                    fontWeight: 500,
                    textTransform: 'capitalize',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!newTagText.trim()}>Add Tag</Button>
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
};

// ============================================================================
// CONTACT DETAIL PAGE
// ============================================================================

const ContactDetailPage = ({ contact: initialContact, onBack }) => {
  const [contact, setContact] = useState(initialContact || sampleContact);
  const [tagPickerOpen, setTagPickerOpen] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  
  const updateField = (field, value) => {
    setContact(prev => ({ ...prev, [field]: value }));
  };
  
  const addTag = (tag) => {
    setContact(prev => ({
      ...prev,
      tags: [...prev.tags, { ...tag, id: Date.now().toString() }],
    }));
  };
  
  const removeTag = (tagId) => {
    setContact(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t.id !== tagId),
    }));
  };
  
  return (
    <div style={{
      minHeight: '100vh',
      background: colors.bg.primary,
      color: '#fff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      {/* Top Bar */}
      <div style={{
        position: 'sticky',
        top: 0,
        background: 'rgba(13, 13, 15, 0.9)',
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${colors.border}`,
        padding: '12px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 50,
      }}>
        <button
          onClick={onBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'none',
            border: 'none',
            color: colors.text.secondary,
            fontSize: 14,
            cursor: 'pointer',
            padding: 8,
            marginLeft: -8,
            borderRadius: 6,
            transition: 'color 0.15s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#fff'}
          onMouseLeave={e => e.currentTarget.style.color = colors.text.secondary}
        >
          <ArrowLeft size={18} />
          Back to Contacts
        </button>
        
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" size="sm">
            <Edit size={16} /> Edit
          </Button>
          <div style={{ position: 'relative' }}>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setActionMenuOpen(!actionMenuOpen)}
            >
              <MoreHorizontal size={18} />
            </Button>
            <AnimatePresence>
              {actionMenuOpen && (
                <>
                  <div 
                    style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                    onClick={() => setActionMenuOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: 4,
                      background: colors.bg.secondary,
                      border: `1px solid ${colors.border}`,
                      borderRadius: 8,
                      padding: 4,
                      minWidth: 160,
                      zIndex: 50,
                      boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
                    }}
                  >
                    <div
                      style={{
                        padding: '8px 12px',
                        borderRadius: 6,
                        fontSize: 14,
                        color: colors.error,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                      }}
                      onClick={() => {}}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <Trash2 size={16} /> Delete Contact
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
        {/* Profile Header */}
        <GlassCard style={{ padding: 24, marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
            <Avatar name={contact.name} size={80} />
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 4px 0' }}>
                {contact.name}
              </h1>
              <p style={{ fontSize: 16, color: colors.text.secondary, margin: '0 0 12px 0' }}>
                {contact.title}{contact.company && ` · ${contact.company}`}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 14, color: colors.text.tertiary }}>
                {contact.location && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MapPin size={15} /> {contact.location}
                  </span>
                )}
                {contact.email && (
                  <a 
                    href={`mailto:${contact.email}`}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, color: colors.text.tertiary, textDecoration: 'none' }}
                    onMouseEnter={e => e.currentTarget.style.color = colors.gold.primary}
                    onMouseLeave={e => e.currentTarget.style.color = colors.text.tertiary}
                  >
                    <Mail size={15} /> {contact.email}
                  </a>
                )}
                {contact.linkedinUrl && (
                  <a 
                    href={contact.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 6, color: colors.text.tertiary, textDecoration: 'none' }}
                    onMouseEnter={e => e.currentTarget.style.color = colors.gold.primary}
                    onMouseLeave={e => e.currentTarget.style.color = colors.text.tertiary}
                  >
                    <Linkedin size={15} /> LinkedIn <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>
          </div>
        </GlassCard>
        
        {/* Why Now */}
        <GlassCard gold style={{ padding: 20, marginBottom: 20 }}>
          <SectionHeader>
            <span style={{ color: colors.gold.primary }}>Why Now</span>
          </SectionHeader>
          <EditableText
            value={contact.whyNow}
            onChange={(val) => updateField('whyNow', val)}
            multiline
            placeholder="Add context about why this person is relevant right now..."
            gold
          />
        </GlassCard>
        
        {/* Two Column Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          {/* Relationship */}
          <GlassCard style={{ padding: 20 }}>
            <SectionHeader>Relationship</SectionHeader>
            
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: colors.text.tertiary, marginBottom: 6 }}>Strength</div>
              <StrengthIndicator strength={contact.relationshipStrength} />
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: colors.text.tertiary, marginBottom: 4 }}>Last Contact</div>
              <div style={{ fontSize: 14, color: colors.text.secondary }}>
                {getRelativeTime(contact.lastContactDate)} · {formatDate(contact.lastContactDate)}
              </div>
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: colors.text.tertiary, marginBottom: 4 }}>How We Met</div>
              <EditableText
                value={contact.howWeMet}
                onChange={(val) => updateField('howWeMet', val)}
                placeholder="Where/how did you meet?"
              />
            </div>
            
            <div>
              <div style={{ fontSize: 12, color: colors.text.tertiary, marginBottom: 4 }}>History</div>
              <EditableText
                value={contact.relationshipHistory}
                onChange={(val) => updateField('relationshipHistory', val)}
                multiline
                placeholder="Key interactions and context..."
              />
            </div>
          </GlassCard>
          
          {/* Profile */}
          <GlassCard style={{ padding: 20 }}>
            <SectionHeader>Profile</SectionHeader>
            
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: colors.text.tertiary, marginBottom: 4 }}>Expertise</div>
              <EditableText
                value={contact.expertise}
                onChange={(val) => updateField('expertise', val)}
                placeholder="What are they known for?"
              />
            </div>
            
            <div>
              <div style={{ fontSize: 12, color: colors.text.tertiary, marginBottom: 4 }}>Interests</div>
              <EditableText
                value={contact.interests}
                onChange={(val) => updateField('interests', val)}
                placeholder="Personal interests, hobbies..."
              />
            </div>
          </GlassCard>
        </div>
        
        {/* Tags */}
        <GlassCard style={{ padding: 20, marginBottom: 20 }}>
          <SectionHeader
            action={
              <Button variant="ghost" size="sm" onClick={() => setTagPickerOpen(true)}>
                <Plus size={14} /> Add Tag
              </Button>
            }
          >
            Tags
          </SectionHeader>
          
          {contact.tags.length === 0 ? (
            <p style={{ fontSize: 14, color: colors.text.tertiary, fontStyle: 'italic', margin: 0 }}>
              No tags yet. Add tags to categorize this contact.
            </p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {contact.tags.map(tag => (
                <Badge key={tag.id} category={tag.category} onRemove={() => removeTag(tag.id)}>
                  {tag.text}
                </Badge>
              ))}
            </div>
          )}
        </GlassCard>
        
        {/* Notes */}
        <GlassCard style={{ padding: 20, marginBottom: 20 }}>
          <SectionHeader>Notes</SectionHeader>
          <EditableText
            value={contact.notes}
            onChange={(val) => updateField('notes', val)}
            multiline
            placeholder="Add any notes about this contact..."
          />
        </GlassCard>
        
        {/* Quick Actions */}
        <GlassCard style={{ padding: 20 }}>
          <SectionHeader>Quick Actions</SectionHeader>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Button>
              <Sparkles size={18} /> Enrich Contact
            </Button>
            <Button variant="secondary">
              <Send size={18} /> Draft Intro
            </Button>
            <Button variant="secondary">
              <Bell size={18} /> Set Reminder
            </Button>
          </div>
        </GlassCard>
        
        {/* Metadata Footer */}
        <div style={{ 
          marginTop: 24, 
          padding: '16px 0', 
          borderTop: `1px solid ${colors.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 13,
          color: colors.text.tertiary,
        }}>
          <span>Added {formatDate(contact.createdAt)}</span>
          <span>Last enriched {getRelativeTime(contact.lastEnrichedAt)}</span>
        </div>
      </div>
      
      {/* Tag Picker Modal */}
      <AnimatePresence>
        {tagPickerOpen && (
          <TagPicker
            isOpen={tagPickerOpen}
            onClose={() => setTagPickerOpen(false)}
            onAdd={addTag}
            existingTags={contact.tags}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================================
// DEMO WRAPPER
// ============================================================================

const ContactDetailDemo = () => {
  return (
    <ContactDetailPage 
      contact={sampleContact}
      onBack={() => console.log('Navigate back to contacts')}
    />
  );
};

export default ContactDetailDemo;
