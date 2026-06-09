import React, { useState } from 'react';
import api from '../api/client';
import { Loader, Lock, User, AlertCircle, Sparkles } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (username: string) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError('');

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';
    try {
      const res = await api.post(endpoint, {
        username: username.trim(),
        password: password.trim(),
      });

      if (res.data.success) {
        // Authenticate the session
        const loggedUsername = res.data.username;
        localStorage.setItem('storyweaver_username', loggedUsername);
        localStorage.setItem('storyweaver_session_id', loggedUsername);
        
        // Re-configure the API client dynamically by updating the headers/reloading
        // Or simply trigger the success callback to re-render App.tsx
        onLoginSuccess(loggedUsername);
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'radial-gradient(circle at center, #0f0f1a 0%, #0a0a0f 100%)',
      padding: '20px',
    }}>
      <div className="card fade-in" style={{
        width: '100%',
        maxWidth: '420px',
        padding: '36px 32px',
        borderRadius: 'var(--radius-xl)',
        background: 'rgba(18, 18, 31, 0.65)',
        backdropFilter: 'blur(20px)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-lg), var(--shadow-glow)',
      }}>
        {/* Logo Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'var(--gradient-purple)',
            marginBottom: 16,
            boxShadow: 'var(--shadow-glow)',
          }}>
            <Sparkles size={24} color="white" />
          </div>
          <h2 style={{
            fontFamily: 'Space Grotesk',
            fontSize: '24px',
            fontWeight: 700,
            background: 'var(--gradient-hero)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: 6,
          }}>
            Story-Weaver AI
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            {isLogin ? 'Welcome back! Sign in to your workspace' : 'Create your creative sandbox workspace'}
          </p>
        </div>

        {/* Tab Selector */}
        <div style={{
          display: 'flex',
          background: 'var(--bg-secondary)',
          padding: '4px',
          borderRadius: 'var(--radius-md)',
          marginBottom: 24,
          border: '1px solid var(--border)',
        }}>
          <button
            type="button"
            onClick={() => { setIsLogin(true); setError(''); }}
            style={{
              flex: 1,
              padding: '10px',
              background: isLogin ? 'var(--gradient-purple)' : 'transparent',
              color: isLogin ? 'white' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all var(--transition)',
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsLogin(false); setError(''); }}
            style={{
              flex: 1,
              padding: '10px',
              background: !isLogin ? 'var(--gradient-purple)' : 'transparent',
              color: !isLogin ? 'white' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all var(--transition)',
            }}
          >
            Register
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="alert alert-error fade-in" style={{ marginBottom: 20, padding: '10px 14px' }}>
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: 5 }}>
              <User size={12} /> Username
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. shubham"
              value={username}
              onChange={e => setUsername(e.target.value)}
              disabled={loading}
              autoComplete="username"
            />
          </div>

          <div className="form-group" style={{ marginBottom: 28 }}>
            <label className="form-label" style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Lock size={12} /> Password
            </label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', height: '44px', borderRadius: 'var(--radius-md)' }}
            disabled={loading}
          >
            {loading ? (
              <Loader size={18} style={{ animation: 'spin 0.8s linear infinite' }} />
            ) : (
              isLogin ? 'Sign In to Dashboard' : 'Register Account'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
