import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function LoginPage({ mode }: { mode: 'login' | 'register' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: Location } | null)?.from?.pathname || '/dashboard';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
      navigate(from, { replace: true });
    } catch (err) {
      setError(String((err as Error).message || err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="screen splash" style={{ padding: 24 }}>
      <div className="cloud-wrap">
        <div className="cloud cl" style={{ top: '9%', animationDuration: '26s' }}>
          <svg viewBox="0 0 220 110" width="230"><ellipse cx="90" cy="65" rx="80" ry="48" fill="#4FB3AC" /></svg>
        </div>
        <div className="cloud cr" style={{ top: '64%', animationDuration: '32s', animationDelay: '-12s' }}>
          <svg viewBox="0 0 200 100" width="200"><ellipse cx="80" cy="60" rx="70" ry="42" fill="#D1316B" /></svg>
        </div>
      </div>
      <div className="q-card" style={{ maxWidth: 400, width: '100%', position: 'relative', zIndex: 2 }}>
        <div className="q-num">CIRRUS</div>
        <div className="q-title" style={{ fontSize: 22 }}>{mode === 'login' ? 'Welcome back' : 'Create your account'}</div>
        <div className="q-hint">{mode === 'login' ? 'Log in to see your saved lab designs.' : 'Set up an account to save and revisit your lab designs.'}</div>

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="field-wrap">
              <label className="field-label">Name</label>
              <input className="field-input" style={{ width: '100%' }} type="text" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
          )}
          <div className="field-wrap">
            <label className="field-label">Email</label>
            <input className="field-input" style={{ width: '100%' }} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field-wrap">
            <label className="field-label">Password</label>
            <input className="field-input" style={{ width: '100%' }} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          </div>

          {error && <div className="rep-err" style={{ marginBottom: 12 }}>{error}</div>}

          <button className="btn-teal" style={{ width: '100%', padding: 13 }} type="submit" disabled={submitting}>
            {submitting ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--mid)' }}>
          {mode === 'login' ? (
            <>Don't have an account? <a href="/register" onClick={(e) => { e.preventDefault(); navigate('/register'); }} style={{ color: 'var(--td)', fontWeight: 700 }}>Sign up</a></>
          ) : (
            <>Already have an account? <a href="/login" onClick={(e) => { e.preventDefault(); navigate('/login'); }} style={{ color: 'var(--td)', fontWeight: 700 }}>Log in</a></>
          )}
        </div>
      </div>
    </div>
  );
}