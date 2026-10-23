import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { login, loginDemo } from '../services/api';

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoError, setDemoError] = useState('');

  const saveSession = (data) => {
    localStorage.setItem('token', data.token);
    if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }
    setLoading(true);
    try {
      const res = await login(email, password);
      saveSession(res.data);
      toast.success('Welcome to BrewOps AI!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async () => {
    setLoading(true);
    try {
      const res = await loginDemo();
      saveSession(res.data);
      toast.success('Demo session ready!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Demo login is unavailable.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">&#127866;</div>
        <h1 className="login-title">BrewOps AI</h1>
        <p className="login-subtitle">Craft Beverage Operations Platform</p>

        <form id="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              className="form-control"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              className="form-control"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="login-divider">or</div>

        {demoError && <div role="alert" style={{ color: '#b91c1c', marginBottom: '12px' }}>{demoError}</div>}
        <button type="button" aria-label="Fill demo credentials" className="btn-quick-login" onClick={async () => {
            if (import.meta.env.VITE_DEMO_EMAIL && import.meta.env.VITE_DEMO_PASSWORD) { setEmail(import.meta.env.VITE_DEMO_EMAIL); setPassword(import.meta.env.VITE_DEMO_PASSWORD); setDemoError(''); return; }
            try {
              const res = await fetch('/api/auth/demo-credentials', { cache: 'no-store' });
              const data = await res.json().catch(() => ({}));
              if (data.email && data.password) { setEmail(data.email); setPassword(data.password); setDemoError(''); return; }
            } catch {}
            setDemoError('Demo credentials are not configured for this environment.');
          }} disabled={loading}>
            Fill demo credentials
          </button>
        <button className="btn-quick-login" onClick={handleQuickLogin} disabled={loading}>
          {loading ? 'Starting demo…' : 'Log In as Demo'}
        </button>
      </div>
    </div>
  );
}

export default LoginPage;
