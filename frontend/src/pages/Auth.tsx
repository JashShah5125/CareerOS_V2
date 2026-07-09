import { useState, useEffect } from 'react';
import { authApi, UserProfile } from '../api';
import { Sparkles, Mail, Lock, User, ArrowRight, Github } from 'lucide-react';
import Card from '../components/Card';

interface AuthProps {
  onLoginSuccess: (user: UserProfile, token: string) => void;
}

export default function Auth({ onLoginSuccess }: AuthProps) {
  const [view, setView] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const handleGoogleCallback = (response: any) => {
      setLoading(true);
      setError('');
      authApi.googleLogin(response.credential)
        .then(res => {
          onLoginSuccess(res.user, res.token);
        })
        .catch(err => {
          setError(err.message || 'Google Sign-In failed.');
        })
        .finally(() => setLoading(false));
    };

    const initializeGoogle = () => {
      const google = (window as any).google;
      if (google && google.accounts && google.accounts.id) {
        google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '591999660576-rurvqabs4ok694i5nv30r2tb8rn4n46t.apps.googleusercontent.com',
          callback: handleGoogleCallback
        });

        // Calculate responsive width for Google Button on mobile
        const container = document.getElementById('google-signin-btn-div');
        const containerWidth = container ? container.offsetWidth : 380;
        const buttonWidth = Math.max(200, Math.min(400, containerWidth || 320));

        google.accounts.id.renderButton(
          document.getElementById('google-signin-btn-div'),
          { 
            theme: 'outline', 
            size: 'large', 
            width: buttonWidth 
          }
        );
        return true;
      }
      return false;
    };

    // Try initializing immediately
    if (!initializeGoogle()) {
      // If script not loaded yet, check every 300ms until loaded
      const interval = setInterval(() => {
        if (initializeGoogle()) {
          clearInterval(interval);
        }
      }, 300);
      return () => clearInterval(interval);
    }
  }, [view]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    if (view === 'login') {
      authApi.login({ email, password })
        .then(res => {
          onLoginSuccess(res.user, res.token);
        })
        .catch(err => {
          setError(err.message || 'Login failed');
        })
        .finally(() => setLoading(false));
    } else if (view === 'register') {
      authApi.register({ email, password, firstName, lastName })
        .then(res => {
          onLoginSuccess(res.user, res.token);
        })
        .catch(err => {
          setError(err.message || 'Registration failed');
        })
        .finally(() => setLoading(false));
    } else {
      authApi.forgotPassword(email)
        .then(res => {
          setMessage(res.message);
        })
        .catch(err => {
          setError(err.message || 'Forgot password request failed');
        })
        .finally(() => setLoading(false));
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card-container">
        {/* Brand logo top */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            backgroundColor: 'var(--accent-light)',
            color: 'var(--accent)',
            marginBottom: '0.75rem'
          }}>
            <Sparkles size={26} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
            CareerOS
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Optimize Resumes • Match Jobs • Master Interviews
          </p>
        </div>

        <Card style={{ padding: '2rem 1.75rem', boxShadow: 'var(--shadow-lg)' }}>
          {error && (
            <div className="badge badge-danger" style={{ display: 'block', padding: '0.75rem', width: '100%', marginBottom: '1rem', borderRadius: '4px', textAlign: 'center' }}>
              {error}
            </div>
          )}

          {message && (
            <div className="badge badge-success" style={{ display: 'block', padding: '0.75rem', width: '100%', marginBottom: '1rem', borderRadius: '4px', textAlign: 'center' }}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {view === 'register' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">First Name</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    className="form-input"
                    placeholder="Jane"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    className="form-input"
                    placeholder="Doe"
                  />
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '10px', top: '11px', color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="form-input"
                  placeholder="name@company.com"
                  style={{ paddingLeft: '2.25rem' }}
                />
              </div>
            </div>

            {view !== 'forgot' && (
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Password</label>
                  {view === 'login' && (
                    <button
                      type="button"
                      onClick={() => setView('forgot')}
                      style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer' }}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '10px', top: '11px', color: 'var(--text-muted)' }} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="form-input"
                    placeholder="••••••••"
                    style={{ paddingLeft: '2.25rem' }}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', height: '40px', marginTop: '0.5rem' }}
            >
              {loading ? (
                'Processing...'
              ) : view === 'login' ? (
                'Sign In with Email'
              ) : view === 'register' ? (
                'Create Account'
              ) : (
                'Send Reset Password Link'
              )}
            </button>
          </form>

          {/* Social OAuth Dividers */}
          {view !== 'forgot' && (
            <>
              <div className="divider-line">
                <span>or continue with</span>
              </div>

              <div
                id="google-signin-btn-div"
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  width: '100%',
                  marginTop: '0.5rem',
                  minHeight: '40px'
                }}
              />
            </>
          )}

          {/* View Toggles */}
          <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {view === 'login' ? (
              <>
                New to AI Career Copilot?{' '}
                <button
                  type="button"
                  onClick={() => setView('register')}
                  style={{ background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 600, cursor: 'pointer' }}
                >
                  Create an account
                </button>
              </>
            ) : view === 'register' ? (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setView('login')}
                  style={{ background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 600, cursor: 'pointer' }}
                >
                  Sign in
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setView('login')}
                style={{ background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 600, cursor: 'pointer' }}
              >
                Back to Sign In
              </button>
            )}
          </div>
        </Card>
      </div>

      <style>{`
        .auth-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background-color: var(--bg-app);
          padding: 1.5rem;
        }
        .auth-card-container {
          width: 100%;
          max-width: 440px;
        }
        .divider-line {
          display: flex;
          align-items: center;
          text-align: center;
          margin: 1.25rem 0;
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .divider-line::before, .divider-line::after {
          content: '';
          flex: 1;
          border-bottom: 1px solid var(--border);
        }
        .divider-line::before {
          margin-right: .5em;
        }
        .divider-line::after {
          margin-left: .5em;
        }
        @media (max-width: 480px) {
          .auth-wrapper {
            padding: 1rem 0.75rem;
          }
          .auth-wrapper .card {
            padding: 1.5rem 1.15rem !important;
          }
          .auth-card-container h2 {
            font-size: 1.35rem !important;
          }
        }
      `}</style>
    </div>
  );
}
