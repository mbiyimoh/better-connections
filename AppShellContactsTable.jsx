import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Sparkles, MessageSquare, Settings, Search, Filter,
  ChevronDown, ChevronLeft, ChevronRight, MoreHorizontal,
  Plus, Check, X, Mail, Edit, Trash2, Download, Tag,
  Menu, LogOut, User, ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';

// ============================================================================
// DESIGN TOKENS
// ============================================================================

const colors = {
  bg: {
    primary: '#0D0D0F',
    secondary: '#1A1A1F',
    tertiary: '#252529',
    hover: 'rgba(255, 255, 255, 0.03)',
    selected: 'rgba(201, 162, 39, 0.08)',
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
    relationship: '#3B82F6',
    opportunity: '#22C55E',
    expertise: '#A855F7',
    interest: '#F59E0B',
  },
  border: 'rgba(255, 255, 255, 0.08)',
  success: '#4ADE80',
  error: '#EF4444',
};

// ============================================================================
// SAMPLE DATA
// ============================================================================

const sampleContacts = [
  {
    id: '1',
    name: 'Sarah Chen',
    email: 'sarah@example.com',
    title: 'Angel Investor',
    company: 'Independent',
    location: 'San Francisco',
    tags: [
      { text: 'Potential LP', category: 'opportunity' },
      { text: 'Warm', category: 'relationship' },
    ],
    relationshipStrength: 3,
    lastContactDate: new Date('2024-09-15'),
    enrichmentScore: 85,
  },
  {
    id: '2',
    name: 'David Park',
    email: 'david@vcfirm.com',
    title: 'Partner',
    company: 'Horizon Ventures',
    location: 'Austin',
    tags: [
      { text: 'F&F Investor', category: 'opportunity' },
      { text: 'AI Enthusiast', category: 'interest' },
    ],
    relationshipStrength: 2,
    lastContactDate: new Date('2024-06-20'),
    enrichmentScore: 72,
  },
  {
    id: '3',
    name: 'Marcus Chen',
    email: 'marcus@acme.io',
    title: 'Founder & CEO',
    company: 'Acme Corp',
    location: 'New York',
    tags: [
      { text: 'SaaS Expert', category: 'expertise' },
    ],
    relationshipStrength: 4,
    lastContactDate: new Date('2024-11-01'),
    enrichmentScore: 45,
  },
  {
    id: '4',
    name: 'Lisa Wong',
    email: 'lisa.wong@bigtech.com',
    title: 'VP Engineering',
    company: 'BigTech Inc',
    location: 'Seattle',
    tags: [
      { text: 'Technical', category: 'expertise' },
      { text: 'Connector', category: 'relationship' },
    ],
    relationshipStrength: 3,
    lastContactDate: new Date('2024-10-10'),
    enrichmentScore: 68,
  },
  {
    id: '5',
    name: 'James Miller',
    email: 'james@startup.co',
    title: 'Co-founder',
    company: 'Startup Co',
    location: 'Denver',
    tags: [
      { text: 'Potential Client', category: 'opportunity' },
    ],
    relationshipStrength: 1,
    lastContactDate: new Date('2024-04-05'),
    enrichmentScore: 30,
  },
  {
    id: '6',
    name: 'Emily Rodriguez',
    email: 'emily@design.studio',
    title: 'Creative Director',
    company: 'Design Studio',
    location: 'Los Angeles',
    tags: [
      { text: 'Creative', category: 'interest' },
      { text: 'Warm', category: 'relationship' },
    ],
    relationshipStrength: 3,
    lastContactDate: new Date('2024-08-22'),
    enrichmentScore: 55,
  },
  {
    id: '7',
    name: 'Michael Torres',
    email: 'mtorres@finance.com',
    title: 'CFO',
    company: 'Finance Corp',
    location: 'Chicago',
    tags: [
      { text: 'Finance Expert', category: 'expertise' },
    ],
    relationshipStrength: 2,
    lastContactDate: new Date('2024-07-18'),
    enrichmentScore: 62,
  },
  {
    id: '8',
    name: 'Amanda Foster',
    email: 'amanda@consulting.io',
    title: 'Managing Partner',
    company: 'Strategy Consulting',
    location: 'Boston',
    tags: [
      { text: 'Advisor', category: 'relationship' },
      { text: 'Strategy', category: 'expertise' },
    ],
    relationshipStrength: 4,
    lastContactDate: new Date('2024-11-20'),
    enrichmentScore: 90,
  },
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const getRelativeTime = (date) => {
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
};

const getInitials = (name) => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

// ============================================================================
// SHARED COMPONENTS
// ============================================================================

const Avatar = ({ name, size = 40 }) => {
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
      fontSize: size * 0.4,
      fontWeight: 600,
      color: 'rgba(255,255,255,0.9)',
      flexShrink: 0,
    }}>
      {initials}
    </div>
  );
};

const Badge = ({ children, category, small = false }) => {
  const categoryColors = {
    relationship: { bg: 'rgba(59, 130, 246, 0.2)', dot: '#60A5FA' },
    opportunity: { bg: 'rgba(34, 197, 94, 0.2)', dot: '#4ADE80' },
    expertise: { bg: 'rgba(168, 85, 247, 0.2)', dot: '#C084FC' },
    interest: { bg: 'rgba(245, 158, 11, 0.2)', dot: '#FBBF24' },
  };
  
  const c = categoryColors[category] || { bg: 'rgba(255,255,255,0.1)', dot: '#fff' };
  
  if (small) {
    return (
      <span style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: c.dot,
        display: 'inline-block',
      }} title={children} />
    );
  }
  
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
      color: c.dot,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot }} />
      {children}
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
      background: isHovered ? '#DC2626' : colors.error,
      color: '#fff',
    },
  };
  
  const sizes = {
    sm: { padding: '6px 12px', fontSize: 13 },
    md: { padding: '8px 16px', fontSize: 14 },
    lg: { padding: '12px 24px', fontSize: 15 },
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

const Checkbox = ({ checked, onChange, indeterminate = false }) => {
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
      style={{
        width: 18,
        height: 18,
        borderRadius: 4,
        border: `2px solid ${checked || indeterminate ? colors.gold.primary : 'rgba(255,255,255,0.2)'}`,
        background: checked || indeterminate ? colors.gold.primary : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
    >
      {checked && <Check size={12} color="#000" strokeWidth={3} />}
      {indeterminate && !checked && <div style={{ width: 8, height: 2, background: '#000', borderRadius: 1 }} />}
    </div>
  );
};

const Dropdown = ({ trigger, children, isOpen, onToggle, align = 'left' }) => {
  return (
    <div style={{ position: 'relative' }}>
      <div onClick={onToggle}>{trigger}</div>
      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              style={{ position: 'fixed', inset: 0, zIndex: 40 }} 
              onClick={onToggle}
            />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'absolute',
                top: '100%',
                [align]: 0,
                marginTop: 4,
                background: colors.bg.secondary,
                border: `1px solid ${colors.border}`,
                borderRadius: 8,
                padding: 4,
                minWidth: 180,
                zIndex: 50,
                boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
              }}
            >
              {children}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

const DropdownItem = ({ children, onClick, danger = false, icon: Icon }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        padding: '8px 12px',
        borderRadius: 6,
        fontSize: 14,
        color: danger ? colors.error : colors.text.primary,
        background: isHovered ? 'rgba(255,255,255,0.05)' : 'transparent',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        transition: 'background 0.1s ease',
      }}
    >
      {Icon && <Icon size={16} style={{ opacity: 0.7 }} />}
      {children}
    </div>
  );
};

// ============================================================================
// SIDEBAR COMPONENT
// ============================================================================

const Sidebar = ({ currentPage, onNavigate, isCollapsed, onToggleCollapse }) => {
  const [hoveredItem, setHoveredItem] = useState(null);
  
  const navItems = [
    { id: 'contacts', label: 'Contacts', icon: Users, badge: '142' },
    { id: 'enrich', label: 'Enrich', icon: Sparkles, badge: '47' },
    { id: 'explore', label: 'Explore', icon: MessageSquare },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];
  
  return (
    <div style={{
      width: isCollapsed ? 64 : 240,
      height: '100vh',
      background: colors.bg.primary,
      borderRight: `1px solid ${colors.border}`,
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.2s ease',
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{
        padding: isCollapsed ? '20px 12px' : '20px 16px',
        borderBottom: `1px solid ${colors.border}`,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          background: `linear-gradient(135deg, ${colors.gold.primary}, ${colors.gold.light})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: 16,
          color: '#000',
          flexShrink: 0,
        }}>
          BC
        </div>
        {!isCollapsed && (
          <span style={{ fontWeight: 600, color: '#fff', fontSize: 15 }}>
            Better Connections
          </span>
        )}
      </div>
      
      {/* Nav Items */}
      <nav style={{ flex: 1, padding: '12px 8px' }}>
        {navItems.map(item => {
          const isActive = currentPage === item.id;
          const isHovered = hoveredItem === item.id;
          
          return (
            <div
              key={item.id}
              onClick={() => onNavigate(item.id)}
              onMouseEnter={() => setHoveredItem(item.id)}
              onMouseLeave={() => setHoveredItem(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: isCollapsed ? '12px' : '10px 12px',
                marginBottom: 4,
                borderRadius: 8,
                cursor: 'pointer',
                background: isActive ? colors.gold.subtle : isHovered ? 'rgba(255,255,255,0.03)' : 'transparent',
                borderLeft: isActive ? `3px solid ${colors.gold.primary}` : '3px solid transparent',
                transition: 'all 0.15s ease',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
              }}
            >
              <item.icon 
                size={20} 
                style={{ 
                  color: isActive ? colors.gold.primary : colors.text.secondary,
                  flexShrink: 0,
                }} 
              />
              {!isCollapsed && (
                <>
                  <span style={{ 
                    flex: 1,
                    color: isActive ? '#fff' : colors.text.secondary,
                    fontSize: 14,
                    fontWeight: isActive ? 500 : 400,
                  }}>
                    {item.label}
                  </span>
                  {item.badge && (
                    <span style={{
                      fontSize: 12,
                      color: colors.text.tertiary,
                      background: 'rgba(255,255,255,0.05)',
                      padding: '2px 8px',
                      borderRadius: 10,
                    }}>
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </div>
          );
        })}
      </nav>
      
      {/* User Menu */}
      <div style={{
        padding: isCollapsed ? '12px 8px' : '12px 16px',
        borderTop: `1px solid ${colors.border}`,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '8px',
          borderRadius: 8,
          cursor: 'pointer',
          justifyContent: isCollapsed ? 'center' : 'flex-start',
        }}>
          <Avatar name="Mbiyimoh Ghogomu" size={32} />
          {!isCollapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Beems
              </div>
              <div style={{ fontSize: 12, color: colors.text.tertiary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                beems@33strategies.com
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// CONTACTS TABLE COMPONENT
// ============================================================================

const ContactsTable = ({ onViewContact }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState({ categories: [], strength: null });
  const [actionMenuId, setActionMenuId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  
  // Filter and sort contacts
  const filteredContacts = useMemo(() => {
    let result = [...sampleContacts];
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(c => 
        c.name.toLowerCase().includes(query) ||
        c.email.toLowerCase().includes(query) ||
        c.company?.toLowerCase().includes(query) ||
        c.tags.some(t => t.text.toLowerCase().includes(query))
      );
    }
    
    // Category filter
    if (activeFilters.categories.length > 0) {
      result = result.filter(c => 
        c.tags.some(t => activeFilters.categories.includes(t.category))
      );
    }
    
    // Strength filter
    if (activeFilters.strength) {
      result = result.filter(c => c.relationshipStrength >= activeFilters.strength);
    }
    
    // Sort
    result.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      
      if (sortConfig.key === 'lastContactDate') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }
      
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    
    return result;
  }, [searchQuery, sortConfig, activeFilters]);
  
  // Pagination
  const totalPages = Math.ceil(filteredContacts.length / itemsPerPage);
  const paginatedContacts = filteredContacts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };
  
  const handleSelectAll = () => {
    if (selectedIds.size === paginatedContacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedContacts.map(c => c.id)));
    }
  };
  
  const handleSelectOne = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };
  
  const toggleCategoryFilter = (category) => {
    setActiveFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category],
    }));
  };
  
  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) {
      return <ArrowUpDown size={14} style={{ opacity: 0.3 }} />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp size={14} style={{ color: colors.gold.primary }} />
      : <ArrowDown size={14} style={{ color: colors.gold.primary }} />;
  };
  
  return (
    <div style={{ padding: 24, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#fff', margin: 0 }}>Contacts</h1>
        <Button onClick={() => {}}>
          <Plus size={18} />
          Add Contact
        </Button>
      </div>
      
      {/* Search & Filter Bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {/* Search */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: colors.bg.secondary,
          border: `1px solid ${colors.border}`,
          borderRadius: 8,
          padding: '0 14px',
        }}>
          <Search size={18} color={colors.text.tertiary} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            placeholder="Search contacts..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#fff',
              fontSize: 14,
              padding: '12px 0',
            }}
          />
          {searchQuery && (
            <X 
              size={16} 
              color={colors.text.tertiary} 
              style={{ cursor: 'pointer' }}
              onClick={() => setSearchQuery('')}
            />
          )}
        </div>
        
        {/* Filter Dropdown */}
        <Dropdown
          isOpen={filterOpen}
          onToggle={() => setFilterOpen(!filterOpen)}
          trigger={
            <Button variant="secondary" style={{ gap: 6 }}>
              <Filter size={16} />
              Filter
              {(activeFilters.categories.length > 0 || activeFilters.strength) && (
                <span style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: colors.gold.primary,
                  color: '#000',
                  fontSize: 11,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {activeFilters.categories.length + (activeFilters.strength ? 1 : 0)}
                </span>
              )}
              <ChevronDown size={16} />
            </Button>
          }
        >
          <div style={{ padding: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: colors.text.tertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, padding: '0 8px' }}>
              Category
            </div>
            {['relationship', 'opportunity', 'expertise', 'interest'].map(cat => (
              <div
                key={cat}
                onClick={() => toggleCategoryFilter(cat)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 12px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  background: activeFilters.categories.includes(cat) ? 'rgba(255,255,255,0.05)' : 'transparent',
                }}
              >
                <Checkbox checked={activeFilters.categories.includes(cat)} onChange={() => {}} />
                <Badge category={cat} small />
                <span style={{ fontSize: 14, color: colors.text.primary, textTransform: 'capitalize' }}>{cat}</span>
              </div>
            ))}
            
            {(activeFilters.categories.length > 0 || activeFilters.strength) && (
              <>
                <div style={{ height: 1, background: colors.border, margin: '8px 0' }} />
                <div
                  onClick={() => setActiveFilters({ categories: [], strength: null })}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 14,
                    color: colors.error,
                    textAlign: 'center',
                  }}
                >
                  Clear filters
                </div>
              </>
            )}
          </div>
        </Dropdown>
      </div>
      
      {/* Table */}
      <div style={{
        flex: 1,
        background: colors.bg.secondary,
        border: `1px solid ${colors.border}`,
        borderRadius: 12,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Table Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '48px 2fr 1.5fr 150px 100px 48px',
          alignItems: 'center',
          padding: '12px 16px',
          background: colors.bg.tertiary,
          borderBottom: `1px solid ${colors.border}`,
          fontSize: 12,
          fontWeight: 600,
          color: colors.text.tertiary,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}>
          <div>
            <Checkbox 
              checked={selectedIds.size === paginatedContacts.length && paginatedContacts.length > 0}
              indeterminate={selectedIds.size > 0 && selectedIds.size < paginatedContacts.length}
              onChange={handleSelectAll}
            />
          </div>
          <div 
            style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
            onClick={() => handleSort('name')}
          >
            Name <SortIcon columnKey="name" />
          </div>
          <div>Title</div>
          <div>Tags</div>
          <div 
            style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
            onClick={() => handleSort('lastContactDate')}
          >
            Last <SortIcon columnKey="lastContactDate" />
          </div>
          <div></div>
        </div>
        
        {/* Table Body */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {paginatedContacts.length === 0 ? (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              padding: 60,
              color: colors.text.tertiary,
            }}>
              <Users size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
              <p style={{ fontSize: 16, fontWeight: 500, color: colors.text.secondary, marginBottom: 4 }}>
                {searchQuery ? 'No results found' : 'No contacts yet'}
              </p>
              <p style={{ fontSize: 14 }}>
                {searchQuery ? 'Try adjusting your search or filters' : 'Add your first contact to get started'}
              </p>
            </div>
          ) : (
            paginatedContacts.map(contact => {
              const isSelected = selectedIds.has(contact.id);
              
              return (
                <div
                  key={contact.id}
                  onClick={() => onViewContact?.(contact)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '48px 2fr 1.5fr 150px 100px 48px',
                    alignItems: 'center',
                    padding: '14px 16px',
                    borderBottom: `1px solid ${colors.border}`,
                    background: isSelected ? colors.bg.selected : 'transparent',
                    cursor: 'pointer',
                    transition: 'background 0.1s ease',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = colors.bg.hover; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                >
                  <div onClick={e => e.stopPropagation()}>
                    <Checkbox checked={isSelected} onChange={() => handleSelectOne(contact.id)} />
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                    <Avatar name={contact.name} size={36} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 500, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {contact.name}
                      </div>
                      <div style={{ fontSize: 13, color: colors.text.tertiary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {contact.email}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ color: colors.text.secondary, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {contact.title}{contact.company ? ` · ${contact.company}` : ''}
                  </div>
                  
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    {contact.tags.slice(0, 3).map((tag, i) => (
                      <Badge key={i} category={tag.category} small>{tag.text}</Badge>
                    ))}
                    {contact.tags.length > 3 && (
                      <span style={{ fontSize: 12, color: colors.text.tertiary }}>+{contact.tags.length - 3}</span>
                    )}
                  </div>
                  
                  <div style={{ fontSize: 14, color: colors.text.tertiary }}>
                    {getRelativeTime(contact.lastContactDate)}
                  </div>
                  
                  <div onClick={e => e.stopPropagation()}>
                    <Dropdown
                      isOpen={actionMenuId === contact.id}
                      onToggle={() => setActionMenuId(actionMenuId === contact.id ? null : contact.id)}
                      align="right"
                      trigger={
                        <div style={{
                          width: 32,
                          height: 32,
                          borderRadius: 6,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          color: colors.text.tertiary,
                        }}>
                          <MoreHorizontal size={18} />
                        </div>
                      }
                    >
                      <DropdownItem icon={User} onClick={() => onViewContact?.(contact)}>View Profile</DropdownItem>
                      <DropdownItem icon={Sparkles} onClick={() => {}}>Quick Enrich</DropdownItem>
                      <DropdownItem icon={Mail} onClick={() => {}}>Draft Intro</DropdownItem>
                      <DropdownItem icon={Edit} onClick={() => {}}>Edit</DropdownItem>
                      <div style={{ height: 1, background: colors.border, margin: '4px 0' }} />
                      <DropdownItem icon={Trash2} danger onClick={() => {}}>Delete</DropdownItem>
                    </Dropdown>
                  </div>
                </div>
              );
            })
          )}
        </div>
        
        {/* Pagination */}
        {filteredContacts.length > 0 && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 16px',
            borderTop: `1px solid ${colors.border}`,
            fontSize: 14,
            color: colors.text.tertiary,
          }}>
            <span>
              Showing {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredContacts.length)} of {filteredContacts.length} contacts
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button 
                variant="ghost" 
                size="sm" 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
              >
                <ChevronLeft size={16} />
                Previous
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
              >
                Next
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}
      </div>
      
      {/* Bulk Actions Bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            style={{
              position: 'fixed',
              bottom: 24,
              left: '50%',
              transform: 'translateX(-50%)',
              background: colors.bg.tertiary,
              border: `1px solid ${colors.border}`,
              borderRadius: 12,
              padding: '12px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
            }}
          >
            <span style={{ color: '#fff', fontWeight: 500 }}>
              {selectedIds.size} selected
            </span>
            <div style={{ width: 1, height: 24, background: colors.border }} />
            <Button variant="ghost" size="sm"><Tag size={16} /> Add Tags</Button>
            <Button variant="ghost" size="sm"><Download size={16} /> Export</Button>
            <Button variant="ghost" size="sm" style={{ color: colors.error }}><Trash2 size={16} /> Delete</Button>
            <div style={{ width: 1, height: 24, background: colors.border }} />
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
              <X size={16} /> Clear
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================================
// PLACEHOLDER PAGES
// ============================================================================

const PlaceholderPage = ({ title, description }) => (
  <div style={{ 
    padding: 24, 
    display: 'flex', 
    flexDirection: 'column', 
    alignItems: 'center', 
    justifyContent: 'center',
    height: '100%',
  }}>
    <h1 style={{ fontSize: 28, fontWeight: 700, color: '#fff', marginBottom: 8 }}>{title}</h1>
    <p style={{ color: colors.text.tertiary }}>{description}</p>
  </div>
);

// ============================================================================
// MAIN APP
// ============================================================================

const AppShell = () => {
  const [currentPage, setCurrentPage] = useState('contacts');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  
  const renderPage = () => {
    switch (currentPage) {
      case 'contacts':
        return <ContactsTable onViewContact={(c) => console.log('View:', c)} />;
      case 'enrich':
        return <PlaceholderPage title="Enrichment Queue" description="47 contacts need your attention" />;
      case 'explore':
        return <PlaceholderPage title="Explore" description="Chat-based network exploration" />;
      case 'settings':
        return <PlaceholderPage title="Settings" description="Manage your account" />;
      default:
        return <ContactsTable />;
    }
  };
  
  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      background: colors.bg.primary,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      <Sidebar 
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <main style={{ flex: 1, overflow: 'hidden' }}>
        {renderPage()}
      </main>
    </div>
  );
};

export default AppShell;
