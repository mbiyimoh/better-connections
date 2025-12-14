import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Mail, Lock, Download, Trash2, Shield, Bell, Link2,
  Check, X, AlertTriangle, Eye, EyeOff, Loader2, ExternalLink,
  Smartphone, Building2, Linkedin, ChevronRight, LogOut
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
  border: 'rgba(255, 255, 255, 0.08)',
  success: '#4ADE80',
  error: '#EF4444',
  warning: '#FBBF24',
  google: '#4285F4',
  apple: '#A2AAAD',
  linkedin: '#0A66C2',
  microsoft: '#00A4EF',
};

// ============================================================================
// SHARED COMPONENTS
// ============================================================================

const GlassCard = ({ children, style = {} }) => (
  <div style={{
    background: colors.bg.glass,
    backdropFilter: 'blur(20px)',
    borderRadius: 12,
    border: `1px solid ${colors.border}`,
    ...style,
  }}>
    {children}
  </div>
);

const Button = ({ children, variant = 'primary', size = 'md', onClick, disabled, loading, style = {} }) => {
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
      border: `1px solid ${isHovered ? '#DC2626' : colors.error}`,
    },
  };
  
  const sizes = {
    sm: { padding: '8px 14px', fontSize: 13 },
    md: { padding: '10px 18px', fontSize: 14 },
    lg: { padding: '14px 28px', fontSize: 15 },
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderRadius: 8,
        border: variant === 'danger' ? undefined : 'none',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.15s ease',
        fontWeight: 500,
        ...variants[variant],
        ...sizes[size],
        ...style,
      }}
    >
      {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : children}
    </button>
  );
};

const Input = ({ label, type = 'text', value, onChange, placeholder, disabled, icon: Icon }) => {
  const [isFocused, setIsFocused] = useState(false);
  
  return (
    <div style={{ marginBottom: 16 }}>
      {label && (
        <label style={{
          display: 'block',
          fontSize: 13,
          fontWeight: 500,
          color: colors.text.secondary,
          marginBottom: 6,
        }}>
          {label}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        {Icon && (
          <Icon 
            size={16} 
            color={colors.text.tertiary}
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
          />
        )}
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={{
            width: '100%',
            background: disabled ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${isFocused ? colors.gold.primary : colors.border}`,
            borderRadius: 8,
            padding: '12px 14px',
            paddingLeft: Icon ? 40 : 14,
            color: disabled ? colors.text.tertiary : '#fff',
            fontSize: 14,
            outline: 'none',
            transition: 'border-color 0.15s ease',
            boxSizing: 'border-box',
          }}
        />
      </div>
    </div>
  );
};

const Toggle = ({ enabled, onChange, label, description }) => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    padding: '16px 0',
    borderBottom: `1px solid ${colors.border}`,
  }}>
    <div>
      <p style={{ fontSize: 14, fontWeight: 500, color: '#fff', margin: '0 0 2px 0' }}>{label}</p>
      {description && (
        <p style={{ fontSize: 13, color: colors.text.tertiary, margin: 0 }}>{description}</p>
      )}
    </div>
    <button
      onClick={() => onChange(!enabled)}
      style={{
        width: 48,
        height: 28,
        borderRadius: 14,
        border: 'none',
        background: enabled ? colors.gold.primary : 'rgba(255,255,255,0.15)',
        cursor: 'pointer',
        position: 'relative',
        transition: 'background 0.2s ease',
      }}
    >
      <motion.div
        animate={{ x: enabled ? 22 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        style={{
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: '#fff',
          position: 'absolute',
          top: 3,
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        }}
      />
    </button>
  </div>
);

const SectionHeader = ({ icon: Icon, title, description }) => (
  <div style={{ marginBottom: 20 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
      {Icon && <Icon size={20} color={colors.gold.primary} />}
      <h2 style={{ fontSize: 18, fontWeight: 600, color: '#fff', margin: 0 }}>{title}</h2>
    </div>
    {description && (
      <p style={{ fontSize: 14, color: colors.text.secondary, margin: 0, marginLeft: Icon ? 30 : 0 }}>
        {description}
      </p>
    )}
  </div>
);

// ============================================================================
// CONNECTED ACCOUNT CARD
// ============================================================================

const ConnectedAccountCard = ({ icon: Icon, name, email, color, connected, onConnect, onDisconnect }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 16px',
        background: isHovered ? 'rgba(255,255,255,0.03)' : 'transparent',
        borderRadius: 8,
        transition: 'background 0.15s ease',
      }}
    >
      <div style={{
        width: 40,
        height: 40,
        borderRadius: 10,
        background: `${color}20`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Icon size={20} color={color} />
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 14, fontWeight: 500, color: '#fff', margin: '0 0 2px 0' }}>{name}</p>
        {connected && email ? (
          <p style={{ fontSize: 12, color: colors.text.tertiary, margin: 0 }}>{email}</p>
        ) : (
          <p style={{ fontSize: 12, color: colors.text.tertiary, margin: 0 }}>Not connected</p>
        )}
      </div>
      {connected ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ 
            fontSize: 12, 
            color: colors.success, 
            display: 'flex', 
            alignItems: 'center', 
            gap: 4 
          }}>
            <Check size={14} /> Connected
          </span>
          <Button variant="ghost" size="sm" onClick={onDisconnect}>
            Disconnect
          </Button>
        </div>
      ) : (
        <Button variant="secondary" size="sm" onClick={onConnect}>
          Connect
        </Button>
      )}
    </div>
  );
};

// ============================================================================
// DELETE ACCOUNT MODAL
// ============================================================================

const DeleteAccountModal = ({ isOpen, onClose, onConfirm }) => {
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleDelete = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onConfirm?.();
    }, 2000);
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
        background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: 24,
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 440 }}
      >
        <GlassCard style={{ padding: 24 }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <AlertTriangle size={28} color={colors.error} />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 600, color: '#fff', margin: '0 0 8px 0' }}>
              Delete your account?
            </h3>
            <p style={{ fontSize: 14, color: colors.text.secondary, margin: 0 }}>
              This action cannot be undone. All your contacts and data will be permanently deleted.
            </p>
          </div>
          
          <div style={{ marginBottom: 20 }}>
            <label style={{ 
              display: 'block', 
              fontSize: 13, 
              color: colors.text.secondary, 
              marginBottom: 8 
            }}>
              Type <strong style={{ color: colors.error }}>DELETE</strong> to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder="DELETE"
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${colors.border}`,
                borderRadius: 8,
                padding: '12px 14px',
                color: '#fff',
                fontSize: 14,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
          
          <div style={{ display: 'flex', gap: 12 }}>
            <Button variant="ghost" style={{ flex: 1 }} onClick={onClose}>
              Cancel
            </Button>
            <Button 
              variant="danger" 
              style={{ flex: 1 }}
              disabled={confirmText !== 'DELETE'}
              loading={loading}
              onClick={handleDelete}
            >
              <Trash2 size={16} /> Delete Forever
            </Button>
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
};

// ============================================================================
// CHANGE PASSWORD MODAL
// ============================================================================

const ChangePasswordModal = ({ isOpen, onClose, onSave }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const handleSave = () => {
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onSave?.();
      onClose?.();
    }, 1500);
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
        background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: 24,
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 400 }}
      >
        <GlassCard style={{ padding: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: '#fff', margin: '0 0 20px 0' }}>
            Change Password
          </h3>
          
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, color: colors.text.secondary, marginBottom: 6 }}>
              Current Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.05)',
                  border: `1px solid ${colors.border}`,
                  borderRadius: 8,
                  padding: '12px 40px 12px 14px',
                  color: '#fff',
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: colors.text.tertiary,
                  cursor: 'pointer',
                }}
              >
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, color: colors.text.secondary, marginBottom: 6 }}>
              New Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={e => { setNewPassword(e.target.value); setError(''); }}
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.05)',
                  border: `1px solid ${colors.border}`,
                  borderRadius: 8,
                  padding: '12px 40px 12px 14px',
                  color: '#fff',
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: colors.text.tertiary,
                  cursor: 'pointer',
                }}
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, color: colors.text.secondary, marginBottom: 6 }}>
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${error ? colors.error : colors.border}`,
                borderRadius: 8,
                padding: '12px 14px',
                color: '#fff',
                fontSize: 14,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {error && (
              <p style={{ fontSize: 12, color: colors.error, marginTop: 6, marginBottom: 0 }}>{error}</p>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: 12 }}>
            <Button variant="ghost" style={{ flex: 1 }} onClick={onClose}>
              Cancel
            </Button>
            <Button style={{ flex: 1 }} loading={loading} onClick={handleSave}>
              Save Password
            </Button>
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
};

// ============================================================================
// SETTINGS PAGE
// ============================================================================

const SettingsPage = ({ user, onLogout }) => {
  const [name, setName] = useState(user?.name || 'Mbiyimoh Ghogomu');
  const [email, setEmail] = useState(user?.email || 'beems@33strategies.com');
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  
  // Notifications
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [enrichmentReminders, setEnrichmentReminders] = useState(false);
  
  // Modals
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Connected accounts
  const [connectedAccounts, setConnectedAccounts] = useState({
    google: { connected: true, email: 'beems@gmail.com' },
    icloud: { connected: false, email: null },
    linkedin: { connected: true, email: 'linkedin.com/in/beems' },
    outlook: { connected: false, email: null },
  });
  
  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setHasChanges(false);
    }, 1000);
  };
  
  const handleExport = () => {
    setExportLoading(true);
    setTimeout(() => {
      setExportLoading(false);
      // Trigger download
      console.log('Export complete');
    }, 2000);
  };
  
  const handleFieldChange = (setter) => (value) => {
    setter(value);
    setHasChanges(true);
  };
  
  return (
    <div style={{
      minHeight: '100vh',
      background: colors.bg.primary,
      color: '#fff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      <div style={{ maxWidth: 700, margin: '0 auto', padding: 24 }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 4px 0' }}>Settings</h1>
          <p style={{ fontSize: 15, color: colors.text.secondary, margin: 0 }}>
            Manage your account and preferences
          </p>
        </div>
        
        {/* Profile Section */}
        <GlassCard style={{ padding: 24, marginBottom: 20 }}>
          <SectionHeader icon={User} title="Profile" />
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Input
              label="Full Name"
              value={name}
              onChange={handleFieldChange(setName)}
              icon={User}
            />
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={handleFieldChange(setEmail)}
              icon={Mail}
            />
          </div>
          
          {hasChanges && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}
            >
              <Button onClick={handleSave} loading={saving}>
                <Check size={16} /> Save Changes
              </Button>
            </motion.div>
          )}
        </GlassCard>
        
        {/* Security Section */}
        <GlassCard style={{ padding: 24, marginBottom: 20 }}>
          <SectionHeader icon={Shield} title="Security" />
          
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 0',
          }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 500, color: '#fff', margin: '0 0 2px 0' }}>Password</p>
              <p style={{ fontSize: 13, color: colors.text.tertiary, margin: 0 }}>
                ••••••••••••
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setShowPasswordModal(true)}>
              <Lock size={14} /> Change Password
            </Button>
          </div>
        </GlassCard>
        
        {/* Connected Accounts */}
        <GlassCard style={{ padding: 24, marginBottom: 20 }}>
          <SectionHeader 
            icon={Link2} 
            title="Connected Accounts" 
            description="Sync contacts from these platforms"
          />
          
          <div style={{ marginTop: 8 }}>
            <ConnectedAccountCard
              icon={({ size, color }) => (
                <svg width={size} height={size} viewBox="0 0 24 24">
                  <path fill={color} d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              name="Google Contacts"
              email={connectedAccounts.google.email}
              color={colors.google}
              connected={connectedAccounts.google.connected}
              onConnect={() => console.log('Connect Google')}
              onDisconnect={() => setConnectedAccounts(prev => ({ ...prev, google: { connected: false, email: null }}))}
            />
            
            <ConnectedAccountCard
              icon={Smartphone}
              name="iCloud / iPhone"
              email={connectedAccounts.icloud.email}
              color={colors.apple}
              connected={connectedAccounts.icloud.connected}
              onConnect={() => console.log('Connect iCloud')}
              onDisconnect={() => setConnectedAccounts(prev => ({ ...prev, icloud: { connected: false, email: null }}))}
            />
            
            <ConnectedAccountCard
              icon={Linkedin}
              name="LinkedIn"
              email={connectedAccounts.linkedin.email}
              color={colors.linkedin}
              connected={connectedAccounts.linkedin.connected}
              onConnect={() => console.log('Connect LinkedIn')}
              onDisconnect={() => setConnectedAccounts(prev => ({ ...prev, linkedin: { connected: false, email: null }}))}
            />
            
            <ConnectedAccountCard
              icon={Building2}
              name="Outlook / Microsoft 365"
              email={connectedAccounts.outlook.email}
              color={colors.microsoft}
              connected={connectedAccounts.outlook.connected}
              onConnect={() => console.log('Connect Outlook')}
              onDisconnect={() => setConnectedAccounts(prev => ({ ...prev, outlook: { connected: false, email: null }}))}
            />
          </div>
        </GlassCard>
        
        {/* Notifications */}
        <GlassCard style={{ padding: 24, marginBottom: 20 }}>
          <SectionHeader icon={Bell} title="Notifications" />
          
          <div style={{ marginTop: -8 }}>
            <Toggle
              label="Email notifications"
              description="Receive updates about your contacts"
              enabled={emailNotifs}
              onChange={setEmailNotifs}
            />
            <Toggle
              label="Weekly digest"
              description="Summary of your network activity"
              enabled={weeklyDigest}
              onChange={setWeeklyDigest}
            />
            <Toggle
              label="Enrichment reminders"
              description="Nudges to keep your contacts fresh"
              enabled={enrichmentReminders}
              onChange={setEnrichmentReminders}
            />
          </div>
        </GlassCard>
        
        {/* Data Section */}
        <GlassCard style={{ padding: 24, marginBottom: 20 }}>
          <SectionHeader icon={Download} title="Your Data" />
          
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 0',
            borderBottom: `1px solid ${colors.border}`,
          }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 500, color: '#fff', margin: '0 0 2px 0' }}>Export all contacts</p>
              <p style={{ fontSize: 13, color: colors.text.tertiary, margin: 0 }}>
                Download as CSV file
              </p>
            </div>
            <Button variant="secondary" size="sm" loading={exportLoading} onClick={handleExport}>
              <Download size={14} /> Export
            </Button>
          </div>
          
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 0',
          }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 500, color: colors.error, margin: '0 0 2px 0' }}>Delete account</p>
              <p style={{ fontSize: 13, color: colors.text.tertiary, margin: 0 }}>
                Permanently delete your account and all data
              </p>
            </div>
            <Button variant="danger" size="sm" onClick={() => setShowDeleteModal(true)}>
              <Trash2 size={14} /> Delete
            </Button>
          </div>
        </GlassCard>
        
        {/* Logout */}
        <Button 
          variant="ghost" 
          style={{ width: '100%' }}
          onClick={onLogout}
        >
          <LogOut size={18} /> Log Out
        </Button>
        
        {/* Footer */}
        <p style={{ 
          textAlign: 'center', 
          fontSize: 12, 
          color: colors.text.tertiary, 
          marginTop: 32 
        }}>
          Better Connections v1.0 · Made by 33 Strategies
        </p>
      </div>
      
      {/* Modals */}
      <AnimatePresence>
        {showPasswordModal && (
          <ChangePasswordModal
            isOpen={showPasswordModal}
            onClose={() => setShowPasswordModal(false)}
            onSave={() => console.log('Password changed')}
          />
        )}
        {showDeleteModal && (
          <DeleteAccountModal
            isOpen={showDeleteModal}
            onClose={() => setShowDeleteModal(false)}
            onConfirm={() => console.log('Account deleted')}
          />
        )}
      </AnimatePresence>
      
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
// DEMO WRAPPER
// ============================================================================

const SettingsDemo = () => {
  return (
    <SettingsPage 
      user={{ name: 'Mbiyimoh Ghogomu', email: 'beems@33strategies.com' }}
      onLogout={() => console.log('Logged out')}
    />
  );
};

export default SettingsDemo;
