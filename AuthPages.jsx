import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Mail, Lock, User, ArrowLeft, Eye, EyeOff, Check, AlertCircle, Loader2
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
};

// ============================================================================
// SHARED COMPONENTS
// ============================================================================

const GlassCard = ({ children, style = {} }) => (
  <div style={{
    background: colors.bg.glass,
    backdropFilter: 'blur(20px)',
    borderRadius: 16,
    border: `1px solid ${colors.border}`,
    ...style,
  }}>
    {children}
  </div>
);

const Button = ({ children, variant = 'primary', onClick, disabled, loading, style = {} }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const variants = {
    primary: {
      background: isHovered ? colors.gold.light : colors.gold.primary,
      color: '#000',
      fontWeight: 600,
    },
    ghost: {
      background: isHovered ? 'rgba(255,255,255,0.05)' : 'transparent',
      color: isHovered ? '#fff' : colors.text.secondary,
    },
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: '100%',
        padding: '14px 24px',
        borderRadius: 10,
        border: 'none',
        fontSize: 15,
        fontWeight: 600,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.15s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        ...variants[variant],
        ...style,
      }}
    >
      {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : children}
    </button>
  );
};

const Input = ({ 
  label, 
  type = 'text', 
  value, 
  onChange, 
  placeholder, 
  error,
  icon: Icon,
  showPasswordToggle = false,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  
  const inputType = showPasswordToggle ? (showPassword ? 'text' : 'password') : type;
  
  return (
    <div style={{ marginBottom: 20 }}>
      {label && (
        <label style={{
          display: 'block',
          fontSize: 13,
          fontWeight: 500,
          color: colors.text.secondary,
          marginBottom: 8,
        }}>
          {label}
        </label>
      )}
      <div style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
      }}>
        {Icon && (
          <Icon 
            size={18} 
            color={isFocused ? colors.gold.primary : colors.text.tertiary}
            style={{
              position: 'absolute',
              left: 14,
              transition: 'color 0.15s ease',
            }}
          />
        )}
        <input
          type={inputType}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.05)',
            border: `1px solid ${error ? colors.error : isFocused ? colors.gold.primary : colors.border}`,
            borderRadius: 10,
            padding: '14px 16px',
            paddingLeft: Icon ? 44 : 16,
            paddingRight: showPasswordToggle ? 44 : 16,
            color: '#fff',
            fontSize: 15,
            outline: 'none',
            transition: 'border-color 0.15s ease',
            boxSizing: 'border-box',
          }}
        />
        {showPasswordToggle && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: 'absolute',
              right: 14,
              background: 'none',
              border: 'none',
              color: colors.text.tertiary,
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
            }}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {error && (
        <p style={{ 
          fontSize: 12, 
          color: colors.error, 
          marginTop: 6, 
          display: 'flex', 
          alignItems: 'center', 
          gap: 4 
        }}>
          <AlertCircle size={12} /> {error}
        </p>
      )}
    </div>
  );
};

const Divider = ({ text }) => (
  <div style={{ 
    display: 'flex', 
    alignItems: 'center', 
    gap: 16, 
    margin: '24px 0',
  }}>
    <div style={{ flex: 1, height: 1, background: colors.border }} />
    <span style={{ fontSize: 13, color: colors.text.tertiary }}>{text}</span>
    <div style={{ flex: 1, height: 1, background: colors.border }} />
  </div>
);

const SocialButton = ({ icon: Icon, label, color, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        flex: 1,
        padding: '12px 16px',
        borderRadius: 10,
        border: `1px solid ${colors.border}`,
        background: isHovered ? 'rgba(255,255,255,0.05)' : 'transparent',
        color: '#fff',
        fontSize: 14,
        fontWeight: 500,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        transition: 'all 0.15s ease',
      }}
    >
      <Icon size={18} color={color} />
      {label}
    </button>
  );
};

// ============================================================================
// AUTH WRAPPER
// ============================================================================

const AuthWrapper = ({ children }) => (
  <div style={{
    minHeight: '100vh',
    background: colors.bg.primary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  }}>
    {/* Background glow */}
    <div style={{
      position: 'fixed',
      top: '30%',
      left: '50%',
      transform: 'translateX(-50%)',
      width: 600,
      height: 400,
      background: `radial-gradient(ellipse, ${colors.gold.subtle} 0%, transparent 70%)`,
      pointerEvents: 'none',
    }} />
    
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}
    >
      {children}
    </motion.div>
    
    <style>{`
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

const Logo = () => (
  <div style={{ textAlign: 'center', marginBottom: 32 }}>
    <div style={{
      width: 56,
      height: 56,
      borderRadius: 14,
      background: `linear-gradient(135deg, ${colors.gold.primary}, ${colors.gold.light})`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 16px',
      fontSize: 22,
      fontWeight: 700,
      color: '#000',
    }}>
      BC
    </div>
    <h1 style={{ fontSize: 26, fontWeight: 700, color: '#fff', margin: '0 0 6px 0' }}>
      Better Connections
    </h1>
    <p style={{ fontSize: 14, color: colors.text.tertiary, margin: 0 }}>
      Your contacts are flat. Give them some depth.
    </p>
  </div>
);

// ============================================================================
// LOGIN PAGE
// ============================================================================

const LoginPage = ({ onNavigate, onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  
  const validate = () => {
    const newErrors = {};
    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Enter a valid email';
    if (!password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        onLogin?.();
      }, 1500);
    }
  };
  
  return (
    <AuthWrapper>
      <Logo />
      
      <GlassCard style={{ padding: 32 }}>
        <form onSubmit={handleSubmit}>
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="you@example.com"
            icon={Mail}
            error={errors.email}
          />
          
          <Input
            label="Password"
            value={password}
            onChange={setPassword}
            placeholder="Enter your password"
            icon={Lock}
            showPasswordToggle
            error={errors.password}
          />
          
          <div style={{ textAlign: 'right', marginTop: -12, marginBottom: 24 }}>
            <button
              type="button"
              onClick={() => onNavigate?.('forgot')}
              style={{
                background: 'none',
                border: 'none',
                color: colors.gold.primary,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Forgot password?
            </button>
          </div>
          
          <Button type="submit" loading={loading}>
            Log In
          </Button>
        </form>
        
        <Divider text="or continue with" />
        
        <div style={{ display: 'flex', gap: 12 }}>
          <SocialButton 
            icon={({ size, color }) => (
              <svg width={size} height={size} viewBox="0 0 24 24">
                <path fill={color} d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            label="Google"
            onClick={() => console.log('Google login')}
          />
          <SocialButton 
            icon={({ size }) => (
              <svg width={size} height={size} viewBox="0 0 24 24" fill="#fff">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
            )}
            label="Apple"
            onClick={() => console.log('Apple login')}
          />
        </div>
      </GlassCard>
      
      <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: colors.text.secondary }}>
        Don't have an account?{' '}
        <button
          onClick={() => onNavigate?.('signup')}
          style={{
            background: 'none',
            border: 'none',
            color: colors.gold.primary,
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Sign up
        </button>
      </p>
    </AuthWrapper>
  );
};

// ============================================================================
// SIGNUP PAGE
// ============================================================================

const SignupPage = ({ onNavigate, onSignup }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  
  const validate = () => {
    const newErrors = {};
    if (!name.trim()) newErrors.name = 'Name is required';
    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Enter a valid email';
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 8) newErrors.password = 'Must be at least 8 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        onSignup?.();
      }, 1500);
    }
  };
  
  const passwordStrength = () => {
    if (!password) return null;
    if (password.length < 8) return { label: 'Too short', color: colors.error };
    if (password.length < 12) return { label: 'Good', color: colors.gold.primary };
    return { label: 'Strong', color: colors.success };
  };
  
  const strength = passwordStrength();
  
  return (
    <AuthWrapper>
      <Logo />
      
      <GlassCard style={{ padding: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: '#fff', margin: '0 0 24px 0', textAlign: 'center' }}>
          Create your account
        </h2>
        
        <form onSubmit={handleSubmit}>
          <Input
            label="Full Name"
            value={name}
            onChange={setName}
            placeholder="Your name"
            icon={User}
            error={errors.name}
          />
          
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="you@example.com"
            icon={Mail}
            error={errors.email}
          />
          
          <Input
            label="Password"
            value={password}
            onChange={setPassword}
            placeholder="Create a password"
            icon={Lock}
            showPasswordToggle
            error={errors.password}
          />
          
          {strength && !errors.password && (
            <div style={{ marginTop: -12, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  width: password.length < 8 ? '33%' : password.length < 12 ? '66%' : '100%',
                  height: '100%',
                  background: strength.color,
                  transition: 'all 0.3s ease',
                }} />
              </div>
              <span style={{ fontSize: 12, color: strength.color }}>{strength.label}</span>
            </div>
          )}
          
          <Button type="submit" loading={loading}>
            Create Account
          </Button>
        </form>
        
        <Divider text="or continue with" />
        
        <div style={{ display: 'flex', gap: 12 }}>
          <SocialButton 
            icon={({ size, color }) => (
              <svg width={size} height={size} viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            label="Google"
            onClick={() => console.log('Google signup')}
          />
          <SocialButton 
            icon={({ size }) => (
              <svg width={size} height={size} viewBox="0 0 24 24" fill="#fff">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
            )}
            label="Apple"
            onClick={() => console.log('Apple signup')}
          />
        </div>
        
        <p style={{ fontSize: 12, color: colors.text.tertiary, textAlign: 'center', marginTop: 20, marginBottom: 0 }}>
          By signing up, you agree to our{' '}
          <a href="#" style={{ color: colors.text.secondary }}>Terms of Service</a>
          {' '}and{' '}
          <a href="#" style={{ color: colors.text.secondary }}>Privacy Policy</a>
        </p>
      </GlassCard>
      
      <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: colors.text.secondary }}>
        Already have an account?{' '}
        <button
          onClick={() => onNavigate?.('login')}
          style={{
            background: 'none',
            border: 'none',
            color: colors.gold.primary,
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Log in
        </button>
      </p>
    </AuthWrapper>
  );
};

// ============================================================================
// FORGOT PASSWORD PAGE
// ============================================================================

const ForgotPasswordPage = ({ onNavigate }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Enter a valid email');
      return;
    }
    
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSent(true);
    }, 1500);
  };
  
  if (sent) {
    return (
      <AuthWrapper>
        <GlassCard style={{ padding: 40, textAlign: 'center' }}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'rgba(74, 222, 128, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
            }}
          >
            <Check size={36} color={colors.success} />
          </motion.div>
          
          <h2 style={{ fontSize: 22, fontWeight: 600, color: '#fff', margin: '0 0 8px 0' }}>
            Check your email
          </h2>
          <p style={{ fontSize: 14, color: colors.text.secondary, marginBottom: 8 }}>
            We sent a password reset link to
          </p>
          <p style={{ fontSize: 15, color: '#fff', fontWeight: 500, marginBottom: 32 }}>
            {email}
          </p>
          
          <Button onClick={() => onNavigate?.('login')}>
            Back to Login
          </Button>
          
          <p style={{ fontSize: 13, color: colors.text.tertiary, marginTop: 20, marginBottom: 0 }}>
            Didn't receive the email?{' '}
            <button
              onClick={() => setSent(false)}
              style={{
                background: 'none',
                border: 'none',
                color: colors.gold.primary,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
          </p>
        </GlassCard>
      </AuthWrapper>
    );
  }
  
  return (
    <AuthWrapper>
      <GlassCard style={{ padding: 32 }}>
        <button
          onClick={() => onNavigate?.('login')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'none',
            border: 'none',
            color: colors.text.secondary,
            fontSize: 14,
            cursor: 'pointer',
            padding: 0,
            marginBottom: 24,
          }}
        >
          <ArrowLeft size={18} /> Back to login
        </button>
        
        <h2 style={{ fontSize: 22, fontWeight: 600, color: '#fff', margin: '0 0 8px 0' }}>
          Reset your password
        </h2>
        <p style={{ fontSize: 14, color: colors.text.secondary, marginBottom: 24 }}>
          Enter your email and we'll send you a link to reset your password.
        </p>
        
        <form onSubmit={handleSubmit}>
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(v) => { setEmail(v); setError(''); }}
            placeholder="you@example.com"
            icon={Mail}
            error={error}
          />
          
          <Button type="submit" loading={loading}>
            Send Reset Link
          </Button>
        </form>
      </GlassCard>
    </AuthWrapper>
  );
};

// ============================================================================
// DEMO WRAPPER WITH NAVIGATION
// ============================================================================

const AuthDemo = () => {
  const [currentPage, setCurrentPage] = useState('login');
  
  const handleNavigate = (page) => {
    setCurrentPage(page);
  };
  
  const handleLogin = () => {
    console.log('Logged in! Redirect to /contacts');
  };
  
  const handleSignup = () => {
    console.log('Signed up! Redirect to /contacts');
  };
  
  switch (currentPage) {
    case 'signup':
      return <SignupPage onNavigate={handleNavigate} onSignup={handleSignup} />;
    case 'forgot':
      return <ForgotPasswordPage onNavigate={handleNavigate} />;
    default:
      return <LoginPage onNavigate={handleNavigate} onLogin={handleLogin} />;
  }
};

export default AuthDemo;
