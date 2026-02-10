import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const AuthPage: React.FC = () => {
  const { signIn, signInWithPassword, signUp, resetPassword, updatePassword, isRecovery } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mode, setMode] = useState<'magic' | 'password' | 'register' | 'reset'>('magic');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // If user clicked the reset link in email, show the "set new password" form
  if (isRecovery) {
    const handleUpdatePassword = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setMessage('');
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      setLoading(true);
      try {
        const { error } = await updatePassword(password);
        if (error) {
          setError(error.message);
        } else {
          setMessage('Password updated successfully! Redirecting...');
          setTimeout(() => window.location.reload(), 1500);
        }
      } catch (err: any) {
        setError(err.message || 'Something went wrong');
      } finally {
        setLoading(false);
      }
    };

    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
        padding: '20px',
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '48px',
          maxWidth: '420px',
          width: '100%',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
        }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <svg style={{ width: '48px', height: '48px', marginBottom: '12px' }} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.5">
              <path d="M22 10l-10-5L2 10l10 5 10-5z"/>
              <path d="M6 12v5c0 2 3 3 6 3s6-1 6-3v-5"/>
              <path d="M22 10v6"/>
            </svg>
            <h1 style={{ color: '#fff', fontSize: '28px', fontWeight: 700, margin: 0 }}>Set new password</h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', marginTop: '8px' }}>
              Choose a strong password for your account
            </p>
          </div>

          <form onSubmit={handleUpdatePassword}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '13px', marginBottom: '6px', fontWeight: 500 }}>
                New Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                minLength={6}
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)',
                  color: '#fff', fontSize: '15px', outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '13px', marginBottom: '6px', fontWeight: 500 }}>
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                placeholder="••••••••"
                minLength={6}
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)',
                  color: '#fff', fontSize: '15px', outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {error && (
              <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', fontSize: '13px', marginBottom: '16px' }}>
                {error}
              </div>
            )}
            {message && (
              <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#86efac', fontSize: '13px', marginBottom: '16px' }}>
                {message}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
              background: loading ? 'rgba(99, 102, 241, 0.3)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff', fontSize: '15px', fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
            }}>
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (mode === 'magic') {
        const { error } = await signIn(email);
        if (error) {
          setError(error.message);
        } else {
          setMessage('Check your email for a login link!');
        }
      } else if (mode === 'password') {
        const { error } = await signInWithPassword(email, password);
        if (error) setError(error.message);
      } else if (mode === 'reset') {
        const { error } = await resetPassword(email);
        if (error) {
          setError(error.message);
        } else {
          setMessage('Check your email for a password reset link!');
        }
      } else {
        const { error } = await signUp(email, password);
        if (error) {
          setError(error.message);
        } else {
          setMessage('Check your email to confirm your account!');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
      padding: '20px',
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(20px)',
        borderRadius: '20px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '48px',
        maxWidth: '420px',
        width: '100%',
        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <svg style={{ width: '48px', height: '48px', marginBottom: '12px' }} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.5">
            <path d="M22 10l-10-5L2 10l10 5 10-5z"/>
            <path d="M6 12v5c0 2 3 3 6 3s6-1 6-3v-5"/>
            <path d="M22 10v6"/>
          </svg>
          <h1 style={{ color: '#fff', fontSize: '28px', fontWeight: 700, margin: 0 }}>gvidtech</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', marginTop: '8px' }}>
            AI-powered learning platform
          </p>
        </div>

        {/* Mode tabs */}
        <div style={{
          display: 'flex',
          gap: '4px',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '12px',
          padding: '4px',
          marginBottom: '24px',
        }}>
          {([
            { key: 'magic', label: 'Magic Link' },
            { key: 'password', label: 'Sign In' },
            { key: 'register', label: 'Register' },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => { setMode(tab.key); setError(''); setMessage(''); }}
              style={{
                flex: 1,
                padding: '8px 12px',
                border: 'none',
                borderRadius: '10px',
                background: mode === tab.key ? 'rgba(99, 102, 241, 0.3)' : 'transparent',
                color: mode === tab.key ? '#fff' : 'rgba(255,255,255,0.5)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '13px', marginBottom: '6px', fontWeight: 500 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(255,255,255,0.05)',
                color: '#fff',
                fontSize: '15px',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(99, 102, 241, 0.5)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
            />
          </div>

          {(mode === 'password' || mode === 'register') && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '13px', marginBottom: '6px', fontWeight: 500 }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                minLength={6}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(255,255,255,0.05)',
                  color: '#fff',
                  fontSize: '15px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(99, 102, 241, 0.5)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
              />
              {mode === 'password' && (
                <button
                  type="button"
                  onClick={() => { setMode('reset'); setError(''); setMessage(''); }}
                  style={{
                    background: 'none', border: 'none', color: 'rgba(99, 102, 241, 0.8)',
                    fontSize: '12px', cursor: 'pointer', padding: '6px 0 0', fontWeight: 500,
                  }}
                >
                  Forgot password?
                </button>
              )}
            </div>
          )}

          {error && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#fca5a5',
              fontSize: '13px',
              marginBottom: '16px',
            }}>
              {error}
            </div>
          )}

          {message && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '10px',
              background: 'rgba(34, 197, 94, 0.15)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              color: '#86efac',
              fontSize: '13px',
              marginBottom: '16px',
            }}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '12px',
              border: 'none',
              background: loading ? 'rgba(99, 102, 241, 0.3)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff',
              fontSize: '15px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
            }}
          >
            {loading ? 'Please wait...' : mode === 'magic' ? 'Send Magic Link' : mode === 'register' ? 'Create Account' : mode === 'reset' ? 'Send Reset Link' : 'Sign In'}
          </button>
        </form>

        {mode === 'magic' && (
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', textAlign: 'center', marginTop: '20px' }}>
            We'll send a login link to your email — no password needed.
          </p>
        )}

        {mode === 'reset' && (
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', marginBottom: '8px' }}>
              We'll send a password reset link to your email.
            </p>
            <button
              type="button"
              onClick={() => { setMode('password'); setError(''); setMessage(''); }}
              style={{
                background: 'none', border: 'none', color: 'rgba(99, 102, 241, 0.8)',
                fontSize: '13px', cursor: 'pointer', fontWeight: 500,
              }}
            >
              ← Back to sign in
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthPage;
