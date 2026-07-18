import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { LogIn, Mail, ShieldCheck } from 'lucide-react';
import { Logo } from '../components/Logo';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { user, loading, isDemoMode, signInDemo, signInGoogle, signInEmail } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('author@example.com');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  if (!loading && user) return <Navigate to="/app" replace />;

  const emailLogin = async () => {
    setError('');
    setMessage('');
    if (!email.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    if (isDemoMode) {
      signInDemo(email, name || email.split('@')[0]);
      navigate('/app');
      return;
    }
    try {
      await signInEmail(email);
      setMessage('Check your email for a secure ArcBinder sign-in link.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Email sign-in failed.');
    }
  };

  const googleLogin = async () => {
    setError('');
    try {
      await signInGoogle();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Google sign-in failed.');
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-panel">
        <Logo />
        <div className="auth-copy"><p className="eyebrow">Welcome to ArcBinder</p><h1>Bring the whole book together.</h1><p>Plan the structure, write the prose, track the world, and prepare the manuscript without losing the thread.</p></div>
        <ul className="auth-benefits"><li>Import outlines into chapters, scenes, and beats</li><li>Generate complete prose using your chosen AI provider</li><li>Keep every revision and project backup under your control</li></ul>
      </div>
      <section className="auth-card">
        <div><p className="eyebrow">Author access</p><h2>Sign in to your workspace</h2><p className="muted">Your projects remain private to your account.</p></div>
        {!isDemoMode && <button className="button button-google" onClick={() => void googleLogin()}><ShieldCheck size={18} /> Continue with Google</button>}
        {!isDemoMode && <div className="divider"><span>or</span></div>}
        {isDemoMode && <><label className="field-label">Name</label><input className="field" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name or pen name" /></>}
        <label className="field-label">Email</label>
        <input className="field" value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
        {error && <p className="error-text">{error}</p>}
        {message && <div className="notice notice-secure"><Mail size={17} /><span>{message}</span></div>}
        <button className="button button-primary full-width" onClick={() => void emailLogin()}><LogIn size={18} /> {isDemoMode ? 'Enter local workspace' : 'Email me a sign-in link'}</button>
        {isDemoMode && <p className="demo-note">This build is running in local demo mode. Add Supabase environment variables to activate persistent accounts and Google sign-in.</p>}
      </section>
    </main>
  );
}
