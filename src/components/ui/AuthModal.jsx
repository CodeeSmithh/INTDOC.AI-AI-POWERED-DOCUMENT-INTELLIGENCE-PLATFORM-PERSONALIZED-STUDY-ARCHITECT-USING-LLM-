import { useState } from 'react';
import { X, Mail, Lock, User, Loader2, Zap } from 'lucide-react';
import { login, register } from '../../services/authService';

export default function AuthModal({ isOpen, onClose, onSuccess }) {
  const [tab, setTab] = useState('signin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (!isOpen) return null;

  const resetForm = () => {
    setError('');
    setName('');
    setEmail('');
    setPassword('');
  };

  const switchTab = (t) => {
    setTab(t);
    resetForm();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let user;
      if (tab === 'signin') {
        user = await login(email, password);
      } else {
        if (!name.trim()) throw new Error('Please enter your full name.');
        user = await register(name.trim(), email, password);
      }
      resetForm();
      onSuccess(user);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          width: '100%', maxWidth: '420px',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '1.5rem',
          padding: '2.5rem',
          boxShadow: '0 25px 80px rgba(0,208,255,0.15), 0 0 0 1px rgba(0,208,255,0.05)',
          position: 'relative',
          animation: 'fadeInUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '1.2rem', right: '1.2rem',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '0.5rem', width: '34px', height: '34px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--text-muted)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,45,120,0.15)'; e.currentTarget.style.color = 'var(--accent-pink)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
        >
          <X size={16} />
        </button>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '2rem' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #00d0ff, #ff2d78)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={22} color="white" />
          </div>
          <span style={{ fontSize: '1.3rem', fontWeight: '800', letterSpacing: '-0.02em' }}>IntDoc.ai</span>
        </div>

        {/* Tab switcher */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          background: 'rgba(255,255,255,0.04)', borderRadius: '0.8rem',
          padding: '4px', marginBottom: '2rem',
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          {['signin', 'signup'].map((t) => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              style={{
                padding: '0.65rem',
                borderRadius: '0.6rem',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.9rem',
                transition: 'all 0.25s ease',
                background: tab === t ? 'linear-gradient(135deg, #00d0ff22, #ff2d7822)' : 'transparent',
                color: tab === t ? 'white' : 'var(--text-muted)',
                boxShadow: tab === t ? '0 0 0 1px rgba(0,208,255,0.25)' : 'none',
              }}
            >
              {t === 'signin' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        {/* Heading */}
        <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '0.4rem', letterSpacing: '-0.02em' }}>
          {tab === 'signin' ? 'Welcome back' : 'Create account'}
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.8rem' }}>
          {tab === 'signin'
            ? 'Sign in to access your document history.'
            : 'Join IntDoc and start analyzing documents instantly.'}
        </p>

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(255,45,120,0.1)', border: '1px solid rgba(255,45,120,0.3)',
            borderRadius: '0.6rem', padding: '0.8rem 1rem',
            color: '#ff6b9d', fontSize: '0.875rem', marginBottom: '1.2rem',
            display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
          }}>
            <span style={{ marginTop: '1px' }}>⚠</span>
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {tab === 'signup' && (
            <div style={{ position: 'relative' }}>
              <User size={16} style={{
                position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)',
                color: 'var(--text-muted)', pointerEvents: 'none',
              }} />
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="form-input"
                style={{
                  width: '100%',
                  padding: '0.8rem 1rem 0.8rem 3.5rem',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '0.8rem',
                  color: 'white', boxSizing: 'border-box',
                  outline: 'none',
                  textAlign: 'left'
                }}
              />
            </div>
          )}

          <div style={{ position: 'relative' }}>
            <Mail size={16} style={{
              position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)',
              color: 'var(--text-muted)', pointerEvents: 'none',
            }} />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="form-input"
              style={{
                width: '100%', padding: '0.8rem 1rem 0.8rem 3.5rem', borderRadius: '0.8rem', outline: 'none', textAlign: 'left',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'white', boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ position: 'relative' }}>
            <Lock size={16} style={{
              position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)',
              color: 'var(--text-muted)', pointerEvents: 'none',
            }} />
            <input
              type="password"
              placeholder={tab === 'signup' ? 'Password (min 6 chars)' : 'Password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="form-input"
              style={{
                width: '100%', padding: '0.8rem 1rem 0.8rem 3.5rem', borderRadius: '0.8rem', outline: 'none', textAlign: 'left',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'white', boxSizing: 'border-box',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{
              width: '100%', justifyContent: 'center',
              marginTop: '0.5rem', padding: '0.85rem',
              fontSize: '1rem', fontWeight: '700',
              background: loading
                ? 'rgba(0,208,255,0.3)'
                : 'linear-gradient(135deg, #00d0ff, #0080ff)',
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', gap: '0.5rem',
            }}
          >
            {loading ? (
              <>
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                {tab === 'signin' ? 'Signing in...' : 'Creating account...'}
              </>
            ) : (
              tab === 'signin' ? 'Sign In' : 'Create Account'
            )}
          </button>
        </form>

        {/* Switch tab link */}
        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          {tab === 'signin' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => switchTab(tab === 'signin' ? 'signup' : 'signin')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--accent-blue)', fontWeight: '600', fontSize: '0.875rem',
              textDecoration: 'underline', textUnderlineOffset: '2px',
            }}
          >
            {tab === 'signin' ? 'Sign Up' : 'Sign In'}
          </button>
        </p>

        <style>{`
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px) scale(0.97); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
