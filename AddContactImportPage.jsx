import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Plus, Upload, FileText, Check, X, AlertCircle,
  ChevronDown, ChevronRight, Sparkles, Users, Mail, Linkedin,
  Cloud, Smartphone, Building2, Loader2
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
    relationship: { bg: 'rgba(59, 130, 246, 0.2)', text: '#60A5FA', border: 'rgba(59, 130, 246, 0.3)' },
    opportunity: { bg: 'rgba(34, 197, 94, 0.2)', text: '#4ADE80', border: 'rgba(34, 197, 94, 0.3)' },
    expertise: { bg: 'rgba(168, 85, 247, 0.2)', text: '#C084FC', border: 'rgba(168, 85, 247, 0.3)' },
    interest: { bg: 'rgba(245, 158, 11, 0.2)', text: '#FBBF24', border: 'rgba(245, 158, 11, 0.3)' },
  },
  border: 'rgba(255, 255, 255, 0.08)',
  success: '#4ADE80',
  error: '#EF4444',
  warning: '#FBBF24',
  // Brand colors for integrations
  google: '#4285F4',
  apple: '#A2AAAD',
  linkedin: '#0A66C2',
  microsoft: '#00A4EF',
};

// ============================================================================
// SHARED COMPONENTS
// ============================================================================

const GlassCard = ({ children, style = {}, hover = false, onClick }) => {
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

const Button = ({ children, variant = 'primary', size = 'md', onClick, disabled, style = {}, fullWidth = false }) => {
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
        width: fullWidth ? '100%' : 'auto',
        ...variants[variant],
        ...sizes[size],
        ...style,
      }}
    >
      {children}
    </button>
  );
};

const Input = ({ label, type = 'text', value, onChange, placeholder, required, error }) => (
  <div style={{ marginBottom: 20 }}>
    <label style={{
      display: 'block',
      fontSize: 13,
      fontWeight: 500,
      color: colors.text.secondary,
      marginBottom: 6,
    }}>
      {label} {required && <span style={{ color: colors.gold.primary }}>*</span>}
    </label>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%',
        background: 'rgba(255,255,255,0.05)',
        border: `1px solid ${error ? colors.error : colors.border}`,
        borderRadius: 8,
        padding: '12px 14px',
        color: '#fff',
        fontSize: 14,
        outline: 'none',
        transition: 'border-color 0.15s ease',
        boxSizing: 'border-box',
      }}
      onFocus={e => e.target.style.borderColor = colors.gold.primary}
      onBlur={e => e.target.style.borderColor = error ? colors.error : colors.border}
    />
    {error && (
      <p style={{ fontSize: 12, color: colors.error, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
        <AlertCircle size={12} /> {error}
      </p>
    )}
  </div>
);

const TextArea = ({ label, value, onChange, placeholder, rows = 3 }) => (
  <div style={{ marginBottom: 20 }}>
    <label style={{
      display: 'block',
      fontSize: 13,
      fontWeight: 500,
      color: colors.text.secondary,
      marginBottom: 6,
    }}>
      {label}
    </label>
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{
        width: '100%',
        background: 'rgba(255,255,255,0.05)',
        border: `1px solid ${colors.border}`,
        borderRadius: 8,
        padding: '12px 14px',
        color: '#fff',
        fontSize: 14,
        outline: 'none',
        resize: 'vertical',
        boxSizing: 'border-box',
        lineHeight: 1.5,
      }}
      onFocus={e => e.target.style.borderColor = colors.gold.primary}
      onBlur={e => e.target.style.borderColor = colors.border}
    />
  </div>
);

const Checkbox = ({ checked, onChange, label }) => (
  <label style={{
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    cursor: 'pointer',
    fontSize: 14,
    color: colors.text.secondary,
  }}>
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: 20,
        height: 20,
        borderRadius: 4,
        border: `2px solid ${checked ? colors.gold.primary : 'rgba(255,255,255,0.2)'}`,
        background: checked ? colors.gold.primary : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.15s ease',
        flexShrink: 0,
      }}
    >
      {checked && <Check size={14} color="#000" strokeWidth={3} />}
    </div>
    {label}
  </label>
);

const Badge = ({ children, category }) => {
  const c = colors.category[category] || { bg: 'rgba(255,255,255,0.1)', text: '#fff', border: 'rgba(255,255,255,0.2)' };
  
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 10px',
      borderRadius: 12,
      fontSize: 12,
      fontWeight: 500,
      background: c.bg,
      color: c.text,
      border: `1px solid ${c.border}`,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.text }} />
      {children}
    </span>
  );
};

// ============================================================================
// TAB NAVIGATION
// ============================================================================

const TabNav = ({ tabs, activeTab, onChange }) => (
  <div style={{
    display: 'flex',
    gap: 4,
    padding: 4,
    background: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    marginBottom: 24,
  }}>
    {tabs.map(tab => (
      <button
        key={tab.id}
        onClick={() => onChange(tab.id)}
        style={{
          flex: 1,
          padding: '12px 20px',
          borderRadius: 8,
          border: 'none',
          fontSize: 14,
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          background: activeTab === tab.id ? colors.gold.primary : 'transparent',
          color: activeTab === tab.id ? '#000' : colors.text.secondary,
        }}
      >
        {tab.icon && <tab.icon size={18} />}
        {tab.label}
      </button>
    ))}
  </div>
);

// ============================================================================
// MANUAL ENTRY TAB
// ============================================================================

const ManualEntryTab = ({ onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    title: '',
    company: '',
    location: '',
    linkedinUrl: '',
    howWeMet: '',
    tags: [],
  });
  const [startEnrichment, setStartEnrichment] = useState(true);
  const [errors, setErrors] = useState({});
  
  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };
  
  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = () => {
    if (validate()) {
      onSave?.(formData, startEnrichment);
    }
  };
  
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Input
          label="Name"
          value={formData.name}
          onChange={v => updateField('name', v)}
          placeholder="Full name"
          required
          error={errors.name}
        />
        <Input
          label="Email"
          type="email"
          value={formData.email}
          onChange={v => updateField('email', v)}
          placeholder="email@example.com"
        />
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Input
          label="Title / Role"
          value={formData.title}
          onChange={v => updateField('title', v)}
          placeholder="e.g., VP of Engineering"
        />
        <Input
          label="Company"
          value={formData.company}
          onChange={v => updateField('company', v)}
          placeholder="Company name"
        />
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Input
          label="Location"
          value={formData.location}
          onChange={v => updateField('location', v)}
          placeholder="City, State"
        />
        <Input
          label="LinkedIn URL"
          value={formData.linkedinUrl}
          onChange={v => updateField('linkedinUrl', v)}
          placeholder="https://linkedin.com/in/..."
        />
      </div>
      
      <TextArea
        label="How do you know them?"
        value={formData.howWeMet}
        onChange={v => updateField('howWeMet', v)}
        placeholder="Where/how did you meet? Any shared context..."
        rows={3}
      />
      
      <div style={{ 
        padding: 16, 
        background: 'rgba(255,255,255,0.03)', 
        borderRadius: 8, 
        marginBottom: 24,
        border: `1px solid ${colors.border}`,
      }}>
        <Checkbox
          checked={startEnrichment}
          onChange={setStartEnrichment}
          label="Start enrichment session after saving"
        />
        <p style={{ fontSize: 12, color: colors.text.tertiary, marginTop: 8, marginLeft: 30, marginBottom: 0 }}>
          Add more context about this contact through a quick voice session
        </p>
      </div>
      
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSubmit}>
          <Plus size={18} /> Save Contact
        </Button>
      </div>
    </div>
  );
};

// ============================================================================
// IMPORT TAB - INTEGRATIONS
// ============================================================================

const IntegrationCard = ({ icon: Icon, name, description, color, connected, onConnect, contactCount }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <GlassCard
      hover
      style={{ padding: 20 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: `${color}20`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon size={24} color={color} />
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#fff', margin: '0 0 4px 0' }}>
            {name}
          </h3>
          <p style={{ fontSize: 13, color: colors.text.tertiary, margin: 0 }}>
            {description}
          </p>
          {connected && contactCount && (
            <p style={{ fontSize: 13, color: colors.success, margin: '8px 0 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Check size={14} /> {contactCount} contacts available
            </p>
          )}
        </div>
        <Button
          variant={connected ? 'secondary' : 'primary'}
          size="sm"
          onClick={onConnect}
        >
          {connected ? 'Import' : 'Connect'}
        </Button>
      </div>
    </GlassCard>
  );
};

const FileDropZone = ({ onFileDrop, acceptedTypes = '.csv,.vcf,.xlsx', isProcessing }) => {
  const [isDragging, setIsDragging] = useState(false);
  
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onFileDrop(files[0]);
    }
  };
  
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      onFileDrop(files[0]);
    }
  };
  
  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        border: `2px dashed ${isDragging ? colors.gold.primary : colors.border}`,
        borderRadius: 12,
        padding: 40,
        textAlign: 'center',
        background: isDragging ? colors.gold.subtle : 'rgba(255,255,255,0.02)',
        transition: 'all 0.2s ease',
        cursor: 'pointer',
      }}
      onClick={() => document.getElementById('file-input').click()}
    >
      <input
        id="file-input"
        type="file"
        accept={acceptedTypes}
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      
      {isProcessing ? (
        <div>
          <Loader2 size={40} color={colors.gold.primary} style={{ marginBottom: 16, animation: 'spin 1s linear infinite' }} />
          <p style={{ fontSize: 16, color: '#fff', marginBottom: 4 }}>Processing file...</p>
        </div>
      ) : (
        <>
          <Upload size={40} color={isDragging ? colors.gold.primary : colors.text.tertiary} style={{ marginBottom: 16 }} />
          <p style={{ fontSize: 16, color: '#fff', marginBottom: 4 }}>
            Drag & drop your file here
          </p>
          <p style={{ fontSize: 14, color: colors.text.tertiary, marginBottom: 16 }}>
            or click to browse
          </p>
          <p style={{ fontSize: 13, color: colors.text.tertiary }}>
            Supports: CSV, vCard (.vcf), Excel (.xlsx)
          </p>
        </>
      )}
      
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

// ============================================================================
// FIELD MAPPING STEP
// ============================================================================

const FieldMappingStep = ({ columns, sampleData, onImport, onCancel }) => {
  const [mappings, setMappings] = useState(() => {
    // Auto-detect mappings based on column names
    const autoMap = {};
    const fields = ['name', 'email', 'title', 'company', 'location', 'phone', 'notes'];
    columns.forEach(col => {
      const lower = col.toLowerCase();
      fields.forEach(field => {
        if (lower.includes(field) || (field === 'name' && (lower.includes('full') || lower === 'name'))) {
          autoMap[col] = field;
        }
      });
    });
    return autoMap;
  });
  
  const fieldOptions = [
    { value: '', label: 'Skip this column' },
    { value: 'name', label: 'Name' },
    { value: 'email', label: 'Email' },
    { value: 'title', label: 'Title / Role' },
    { value: 'company', label: 'Company' },
    { value: 'location', label: 'Location' },
    { value: 'phone', label: 'Phone' },
    { value: 'linkedin', label: 'LinkedIn URL' },
    { value: 'notes', label: 'Notes / How We Met' },
  ];
  
  const updateMapping = (column, field) => {
    setMappings(prev => ({ ...prev, [column]: field }));
  };
  
  const totalRows = sampleData.length;
  const mappedName = Object.values(mappings).includes('name');
  
  return (
    <div>
      <h3 style={{ fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 8, marginTop: 0 }}>
        Map Your Columns
      </h3>
      <p style={{ fontSize: 14, color: colors.text.secondary, marginBottom: 24 }}>
        We detected {columns.length} columns. Map them to contact fields below.
      </p>
      
      <GlassCard style={{ marginBottom: 24, overflow: 'hidden' }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr auto 1fr', 
          gap: 16,
          padding: '12px 16px',
          background: colors.bg.tertiary,
          borderBottom: `1px solid ${colors.border}`,
          fontSize: 12,
          fontWeight: 600,
          color: colors.text.tertiary,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}>
          <div>Your Column</div>
          <div></div>
          <div>Maps To</div>
        </div>
        
        {columns.map((col, i) => (
          <div 
            key={col}
            style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr auto 1fr', 
              gap: 16,
              padding: '14px 16px',
              borderBottom: i < columns.length - 1 ? `1px solid ${colors.border}` : 'none',
              alignItems: 'center',
            }}
          >
            <div style={{ color: '#fff', fontSize: 14 }}>{col}</div>
            <ChevronRight size={16} color={colors.text.tertiary} />
            <select
              value={mappings[col] || ''}
              onChange={e => updateMapping(col, e.target.value)}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${colors.border}`,
                borderRadius: 6,
                padding: '8px 12px',
                color: mappings[col] ? '#fff' : colors.text.tertiary,
                fontSize: 14,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {fieldOptions.map(opt => (
                <option key={opt.value} value={opt.value} style={{ background: colors.bg.secondary }}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </GlassCard>
      
      {/* Preview */}
      <div style={{ marginBottom: 24 }}>
        <h4 style={{ fontSize: 13, fontWeight: 600, color: colors.text.tertiary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Preview (first 3 rows)
        </h4>
        <GlassCard style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: colors.bg.tertiary }}>
                  {columns.filter(c => mappings[c]).map(col => (
                    <th key={col} style={{ padding: '10px 12px', textAlign: 'left', color: colors.text.secondary, fontWeight: 500 }}>
                      {mappings[col]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sampleData.slice(0, 3).map((row, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${colors.border}` }}>
                    {columns.filter(c => mappings[c]).map(col => (
                      <td key={col} style={{ padding: '10px 12px', color: colors.text.secondary }}>
                        {row[col] || '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>
      
      {/* Summary */}
      <GlassCard style={{ padding: 16, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 14, color: '#fff', marginBottom: 4 }}>
              <strong>{totalRows}</strong> contacts found
            </p>
            <p style={{ fontSize: 13, color: colors.text.tertiary, margin: 0 }}>
              {Object.values(mappings).filter(Boolean).length} of {columns.length} columns mapped
            </p>
          </div>
          {!mappedName && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: colors.warning }}>
              <AlertCircle size={18} />
              <span style={{ fontSize: 13 }}>Name column required</span>
            </div>
          )}
        </div>
      </GlassCard>
      
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button onClick={onImport} disabled={!mappedName}>
          <Upload size={18} /> Import {totalRows} Contacts
        </Button>
      </div>
    </div>
  );
};

// ============================================================================
// IMPORT PROGRESS
// ============================================================================

const ImportProgress = ({ total, current, onComplete }) => {
  const percentage = Math.round((current / total) * 100);
  
  return (
    <div style={{ textAlign: 'center', padding: 40 }}>
      <Loader2 
        size={48} 
        color={colors.gold.primary} 
        style={{ marginBottom: 20, animation: 'spin 1s linear infinite' }} 
      />
      <h3 style={{ fontSize: 20, fontWeight: 600, color: '#fff', marginBottom: 8 }}>
        Importing contacts...
      </h3>
      <p style={{ fontSize: 14, color: colors.text.secondary, marginBottom: 24 }}>
        {current} of {total} contacts
      </p>
      
      <div style={{
        width: '100%',
        maxWidth: 400,
        height: 8,
        background: 'rgba(255,255,255,0.1)',
        borderRadius: 4,
        margin: '0 auto',
        overflow: 'hidden',
      }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          style={{
            height: '100%',
            background: colors.gold.primary,
            borderRadius: 4,
          }}
        />
      </div>
      <p style={{ fontSize: 13, color: colors.text.tertiary, marginTop: 8 }}>
        {percentage}% complete
      </p>
    </div>
  );
};

// ============================================================================
// IMPORT SUCCESS
// ============================================================================

const ImportSuccess = ({ imported, duplicates, errors, onViewContacts, onImportMore }) => (
  <div style={{ textAlign: 'center', padding: 40 }}>
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
    
    <h3 style={{ fontSize: 24, fontWeight: 600, color: '#fff', marginBottom: 8 }}>
      Import Complete!
    </h3>
    
    <div style={{ marginBottom: 32 }}>
      <p style={{ fontSize: 16, color: colors.text.secondary, marginBottom: 8 }}>
        <strong style={{ color: colors.success }}>{imported}</strong> contacts imported
      </p>
      {duplicates > 0 && (
        <p style={{ fontSize: 14, color: colors.text.tertiary, marginBottom: 4 }}>
          {duplicates} duplicates skipped
        </p>
      )}
      {errors > 0 && (
        <p style={{ fontSize: 14, color: colors.error }}>
          {errors} errors
        </p>
      )}
    </div>
    
    <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
      <Button variant="secondary" onClick={onImportMore}>
        <Plus size={18} /> Import More
      </Button>
      <Button onClick={onViewContacts}>
        <Users size={18} /> View Contacts
      </Button>
    </div>
  </div>
);

// ============================================================================
// IMPORT TAB
// ============================================================================

const ImportTab = ({ onCancel }) => {
  const [step, setStep] = useState('select'); // select, mapping, progress, success
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Simulated data for demo
  const simulatedColumns = ['Full Name', 'Email Address', 'Job Title', 'Company Name', 'City', 'Notes'];
  const simulatedData = [
    { 'Full Name': 'Sarah Chen', 'Email Address': 'sarah@example.com', 'Job Title': 'Angel Investor', 'Company Name': 'Independent', 'City': 'San Francisco', 'Notes': 'Met at conference' },
    { 'Full Name': 'David Park', 'Email Address': 'david@vc.com', 'Job Title': 'Partner', 'Company Name': 'Horizon VC', 'City': 'Austin', 'Notes': '' },
    { 'Full Name': 'Lisa Wong', 'Email Address': 'lisa@tech.co', 'Job Title': 'VP Engineering', 'Company Name': 'TechCorp', 'City': 'Seattle', 'Notes': 'Referral from James' },
    { 'Full Name': 'Marcus Chen', 'Email Address': 'marcus@startup.io', 'Job Title': 'CEO', 'Company Name': 'StartupCo', 'City': 'NYC', 'Notes': '' },
    { 'Full Name': 'Emily Rodriguez', 'Email Address': 'emily@design.studio', 'Job Title': 'Creative Director', 'Company Name': 'Design Studio', 'City': 'LA', 'Notes': 'College friend' },
  ];
  
  const handleFileDrop = (file) => {
    setIsProcessing(true);
    setUploadedFile(file);
    
    // Simulate processing
    setTimeout(() => {
      setIsProcessing(false);
      setStep('mapping');
    }, 1500);
  };
  
  const handleImport = () => {
    setStep('progress');
    
    // Simulate import progress
    setTimeout(() => {
      setStep('success');
    }, 2000);
  };
  
  const integrations = [
    { 
      id: 'google',
      name: 'Google Contacts', 
      description: 'Import from your Google account',
      icon: Mail,
      color: colors.google,
      connected: false,
    },
    { 
      id: 'icloud',
      name: 'iCloud / iPhone', 
      description: 'Sync contacts from your Apple devices',
      icon: Smartphone,
      color: colors.apple,
      connected: false,
    },
    { 
      id: 'linkedin',
      name: 'LinkedIn', 
      description: 'Import your professional connections',
      icon: Linkedin,
      color: colors.linkedin,
      connected: false,
    },
    { 
      id: 'outlook',
      name: 'Outlook / Microsoft 365', 
      description: 'Connect your work contacts',
      icon: Building2,
      color: colors.microsoft,
      connected: false,
    },
  ];
  
  if (step === 'mapping') {
    return (
      <FieldMappingStep
        columns={simulatedColumns}
        sampleData={simulatedData}
        onImport={handleImport}
        onCancel={() => setStep('select')}
      />
    );
  }
  
  if (step === 'progress') {
    return <ImportProgress total={142} current={89} />;
  }
  
  if (step === 'success') {
    return (
      <ImportSuccess
        imported={139}
        duplicates={3}
        errors={0}
        onViewContacts={() => console.log('View contacts')}
        onImportMore={() => setStep('select')}
      />
    );
  }
  
  return (
    <div>
      {/* Integrations Section */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ 
          fontSize: 13, 
          fontWeight: 600, 
          color: colors.text.tertiary, 
          textTransform: 'uppercase', 
          letterSpacing: 1,
          marginBottom: 16,
        }}>
          Connect Your Accounts
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {integrations.map(integration => (
            <IntegrationCard
              key={integration.id}
              icon={integration.icon}
              name={integration.name}
              description={integration.description}
              color={integration.color}
              connected={integration.connected}
              onConnect={() => console.log(`Connect ${integration.id}`)}
            />
          ))}
        </div>
      </div>
      
      {/* Divider */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 16, 
        marginBottom: 32,
      }}>
        <div style={{ flex: 1, height: 1, background: colors.border }} />
        <span style={{ fontSize: 13, color: colors.text.tertiary }}>or upload a file</span>
        <div style={{ flex: 1, height: 1, background: colors.border }} />
      </div>
      
      {/* File Upload */}
      <FileDropZone 
        onFileDrop={handleFileDrop}
        isProcessing={isProcessing}
      />
      
      {/* Download Template */}
      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <button
          onClick={() => console.log('Download template')}
          style={{
            background: 'none',
            border: 'none',
            color: colors.gold.primary,
            fontSize: 14,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <FileText size={16} /> Download CSV template
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN ADD CONTACT PAGE
// ============================================================================

const AddContactPage = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState('manual');
  
  const tabs = [
    { id: 'manual', label: 'Manual Entry', icon: Plus },
    { id: 'import', label: 'Import', icon: Upload },
  ];
  
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
          }}
        >
          <ArrowLeft size={18} />
          Back to Contacts
        </button>
      </div>
      
      {/* Main Content */}
      <div style={{ maxWidth: 700, margin: '0 auto', padding: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, marginTop: 0 }}>
          Add Contacts
        </h1>
        <p style={{ fontSize: 15, color: colors.text.secondary, marginBottom: 32 }}>
          Add contacts manually or import from your existing sources.
        </p>
        
        <TabNav tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
        
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'manual' ? (
              <ManualEntryTab 
                onSave={(data, startEnrichment) => console.log('Save:', data, startEnrichment)}
                onCancel={onBack}
              />
            ) : (
              <ImportTab onCancel={onBack} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

// ============================================================================
// DEMO WRAPPER
// ============================================================================

const AddContactDemo = () => {
  return (
    <AddContactPage onBack={() => console.log('Navigate back')} />
  );
};

export default AddContactDemo;
