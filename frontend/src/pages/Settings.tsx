import { useEffect, useState } from 'react';
import { settingsApi, authApi, modelApi, SettingsData, UserProfile, ModelStatusData } from '../api';
import {
  Settings as SettingsIcon,
  Bell,
  CreditCard,
  User,
  Layers,
  Terminal,
  BookOpen,
  Award,
  Check,
  DollarSign,
  Activity,
  ArrowRight,
  Shield,
  HelpCircle,
  RefreshCw,
  FileText
} from 'lucide-react';
import Card from '../components/Card';
import MetricBar from '../components/MetricBar';

interface SettingsProps {
  refreshUser?: () => void;
}

export default function Settings({ refreshUser }: SettingsProps) {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');

  // Custom business model simulator states
  const [activeTab, setActiveTab] = useState<'profile' | 'billing' | 'credits' | 'marketplace' | 'developer'>('profile');
  const [activePlan, setActivePlan] = useState<'Free' | 'Pro' | 'Premium'>('Free');
  const [credits, setCredits] = useState(250);
  const [apiKey, setApiKey] = useState('sk_ats_live_f7823ab9182cd3ef4e5');
  const [modelStatus, setModelStatus] = useState<ModelStatusData | null>(null);

  const checkModelStatus = () => {
    modelApi.getStatus()
      .then(res => setModelStatus(res))
      .catch(err => console.warn('Failed to fetch local model status:', err));
  };

  useEffect(() => {
    Promise.all([settingsApi.get(), authApi.getProfile()])
      .then(([setRes, profRes]) => {
        setSettings(setRes);
        setProfile(profRes);
        setCredits(profRes.credits);

        // Sync active plan from database settings
        if (setRes.subscription?.plan) {
          if (setRes.subscription.plan.includes('Pro')) {
            setActivePlan('Pro');
          } else if (setRes.subscription.plan.includes('Premium')) {
            setActivePlan('Premium');
          } else {
            setActivePlan('Free');
          }
        }
      })
      .catch(err => {
        console.warn('[Settings Page] Database query failed or returned empty profile, using resilient fallback states:', err);
        // Fallback settings to ensure page interaction
        setSettings({
          theme: 'dark',
          notifications: { emailAlerts: true, deadlineReminders: true, weeklySummary: false },
          subscription: { plan: 'Free Plan', status: 'ACTIVE', billingPeriod: 'monthly', price: '₹0', nextBillingDate: '2026-07-28' },
          billing: { cardBrand: 'Visa', last4: '4242', billingEmail: 'jashshah@gmail.com' }
        });
        // Fallback profile
        setProfile({
          id: 'fallback-user-1',
          email: 'jashshah@gmail.com',
          credits: 250,
          firstName: 'Jash',
          lastName: 'Shah',
          headline: 'Tech Professional',
          targetRole: 'Senior Frontend Engineer',
          avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'
        });
        setCredits(250);
      })
      .finally(() => {
        setLoading(false);
        checkModelStatus();
      });
  }, []);

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    authApi.updateProfile(profile)
      .then((res) => {
        setSuccessMsg('Profile updated successfully.');
        if (res.user) {
          setProfile(res.user);
        }
        if (refreshUser) refreshUser();
        setTimeout(() => setSuccessMsg(''), 3000);
      })
      .catch(err => {
        console.warn('[Settings Page] Could not persist profile update to DB, saving locally:', err);
        setSuccessMsg('Profile updated successfully (local workspace saved).');
        setTimeout(() => setSuccessMsg(''), 3000);
      });
  };

  const handleNotificationToggle = (key: keyof SettingsData['notifications']) => {
    if (!settings) return;

    const updated = {
      ...settings,
      notifications: {
        ...settings.notifications,
        [key]: !settings.notifications[key]
      }
    };

    setSettings(updated);
    settingsApi.update(updated).catch(err => {
      console.warn('[Settings Page] Could not save notification toggle in database, saving locally:', err);
    });
  };

  const buyCredits = (amount: number, price: number) => {
    const rzpAmount = price * 100; // Razorpay expects amount in paise
    const scriptId = 'razorpay-checkout-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    const openCheckout = () => {
      const options = {
        key: "rzp_test_T53dL4o847GrZD", // Razorpay Key ID
        amount: rzpAmount,
        currency: "INR",
        name: "CareerOS",
        description: `Purchase ${amount} AI Credits Bundle`,
        image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120",
        handler: function (response: any) {
          // Payment successful callback: update credits in database
          authApi.addCredits(amount, response.razorpay_payment_id, price)
            .then(res => {
              setCredits(res.credits);
              setSuccessMsg(`Successfully purchased ${amount} AI Credits for ₹${price}! (Payment ID: ${response.razorpay_payment_id})`);
              if (refreshUser) refreshUser();
              window.scrollTo({ top: 0, behavior: 'smooth' });
              setTimeout(() => setSuccessMsg(''), 5000);
            })
            .catch(err => {
              console.warn('[Settings Page] Failed to persist credit top-up in database, updating locally:', err);
              setCredits(prev => prev + amount);
              setSuccessMsg(`Successfully purchased ${amount} AI Credits for ₹${price}! (Payment ID: ${response.razorpay_payment_id})`);
              if (refreshUser) refreshUser();
              window.scrollTo({ top: 0, behavior: 'smooth' });
              setTimeout(() => setSuccessMsg(''), 5000);
            });
        },
        prefill: {
          name: profile ? `${profile.firstName} ${profile.lastName}` : "Jash Shah",
          email: profile?.email || "jashshah@gmail.com",
        },
        theme: {
          color: "#c084fc", // Cosmic Purple fuchsia accent
        },
        modal: {
          ondismiss: function () {
            console.log("Razorpay checkout overlay dismissed by user.");
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = openCheckout;
      script.onerror = () => {
        alert('Failed to load Razorpay checkout SDK. Please check your internet connection.');
      };
      document.body.appendChild(script);
    } else {
      openCheckout();
    }
  };

  const initiateRazorpayPayment = (plan: 'Pro' | 'Premium', amount: number) => {
    const scriptId = 'razorpay-checkout-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    const openCheckout = () => {
      const options = {
        key: "rzp_test_T53dL4o847GrZD", // To be replaced by the user with their Razorpay key
        amount: amount,
        currency: "INR",
        name: "CareerOS",
        description: `${plan} Subscription Upgrade`,
        image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120",
        handler: function (response: any) {
          // Success callback: update active subscription locally and save status in settings
          setActivePlan(plan);
          setSuccessMsg(`Payment Successful! Upgraded to ${plan} Plan. (Payment ID: ${response.razorpay_payment_id})`);

          if (settings) {
            const updated = {
              ...settings,
              subscription: {
                ...settings.subscription,
                plan: `${plan} Plan`,
                price: `₹${amount / 100}/mo`,
                transactionId: response.razorpay_payment_id,
                paymentAmount: amount / 100
              }
            };
            setSettings(updated);
            settingsApi.update(updated)
              .then(() => {
                if (refreshUser) refreshUser();
              })
              .catch(err => {
                console.warn('[Settings Page] Could not save updated subscription plan in database:', err);
                if (refreshUser) refreshUser();
              });
          }

          window.scrollTo({ top: 0, behavior: 'smooth' });
          setTimeout(() => setSuccessMsg(''), 5000);
        },
        prefill: {
          name: profile ? `${profile.firstName} ${profile.lastName}` : "Jash Shah",
          email: profile?.email || "jashshah@gmail.com",
        },
        theme: {
          color: "#c084fc", // Cosmic Purple accent
        },
        modal: {
          ondismiss: function () {
            console.log("Razorpay checkout overlay dismissed by user.");
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = openCheckout;
      script.onerror = () => {
        alert('Failed to load Razorpay checkout SDK. Please check your internet connection.');
      };
      document.body.appendChild(script);
    } else {
      openCheckout();
    }
  };

  const selectSubscriptionPlan = (plan: 'Free' | 'Pro' | 'Premium') => {
    if (plan === 'Free') {
      setActivePlan('Free');
      setSuccessMsg(`Your subscription plan has been updated to the Free Plan!`);

      if (settings) {
        const updated = {
          ...settings,
          subscription: {
            ...settings.subscription,
            plan: 'Free Plan',
            price: '₹0'
          }
        };
        setSettings(updated);
        settingsApi.update(updated)
          .then(() => {
            if (refreshUser) refreshUser();
          })
          .catch(err => {
            console.warn('[Settings Page] Could not save updated subscription plan in database:', err);
            if (refreshUser) refreshUser();
          });
      }

      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => setSuccessMsg(''), 4000);
      return;
    }

    const priceAmount = plan === 'Pro' ? 49900 : 119900; // in paise
    initiateRazorpayPayment(plan, priceAmount);
  };

  const regenerateApiKey = () => {
    const randomHex = Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    setApiKey(`sk_ats_live_${randomHex}`);
    setSuccessMsg('A new Developer API Key has been generated successfully.');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  if (loading || !settings || !profile) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <p>Loading settings console...</p>
      </div>
    );
  }

  // Active tab styling helper
  const tabStyle = (tab: typeof activeTab) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '0.625rem',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-sm)',
    color: activeTab === tab ? 'var(--accent)' : 'var(--text-secondary)',
    backgroundColor: activeTab === tab ? 'var(--accent-light)' : 'transparent',
    fontWeight: activeTab === tab ? 600 : 500,
    fontSize: '0.85rem',
    border: 'none',
    width: '100%',
    textAlign: 'left' as const,
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  });

  return (
    <div>
      <header style={{ marginBottom: '2rem' }}>
        <h1>Settings & Billing Portal</h1>
        <p>Manage profile fields, billing models, enterprise licensing, credits checkout, and developer API hubs.</p>
      </header>

      {successMsg && (
        <div className="badge badge-success" style={{ display: 'block', padding: '1rem', width: '100%', marginBottom: '1.5rem', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
          {successMsg}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '2rem', alignItems: 'start' }}>
        {/* Navigation Sidebar */}
        <Card style={{ padding: '0.75rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '0.5rem', fontWeight: 600, letterSpacing: '0.05em' }}>PREFERENCES</span>
            <button style={tabStyle('profile')} onClick={() => setActiveTab('profile')}>
              <User size={16} />
              <span>Account & Profile</span>
            </button>
            <button style={tabStyle('billing')} onClick={() => setActiveTab('billing')}>
              <CreditCard size={16} />
              <span>Subscriptions & B2B</span>
            </button>
            <button style={tabStyle('credits')} onClick={() => setActiveTab('credits')}>
              <Award size={16} />
              <span>Premium AI Credits</span>
            </button>
            <button style={tabStyle('marketplace')} onClick={() => setActiveTab('marketplace')}>
              <Layers size={16} />
              <span>Marketplace & Affiliates</span>
            </button>
            <button style={tabStyle('developer')} onClick={() => setActiveTab('developer')}>
              <Terminal size={16} />
              <span>Developer API Platform</span>
            </button>
          </div>
        </Card>

        {/* Configurations workspace panels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          {/* TAB 1: Account Profile */}
          {activeTab === 'profile' && (
            <>
              <Card title="Account Profile" subtitle="Configure public headlines and target roles">
                <form onSubmit={handleProfileSave}>
                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">First Name</label>
                      <input
                        type="text"
                        value={profile.firstName || ''}
                        onChange={e => setProfile({ ...profile, firstName: e.target.value })}
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Last Name</label>
                      <input
                        type="text"
                        value={profile.lastName || ''}
                        onChange={e => setProfile({ ...profile, lastName: e.target.value })}
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Email Address (Read-only)</label>
                    <input
                      type="email"
                      disabled
                      value={profile.email || ''}
                      className="form-input"
                      style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-muted)' }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Professional Headline</label>
                    <input
                      type="text"
                      value={profile.headline || ''}
                      onChange={e => setProfile({ ...profile, headline: e.target.value })}
                      className="form-input"
                      placeholder="e.g. Senior Frontend Engineer"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Target Role</label>
                    <input
                      type="text"
                      value={profile.targetRole || ''}
                      onChange={e => setProfile({ ...profile, targetRole: e.target.value })}
                      className="form-input"
                      placeholder="e.g. Staff UI Architect"
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                    <button type="submit" className="btn btn-primary">
                      Save Changes
                    </button>
                  </div>
                </form>
              </Card>

              <Card title="Notification Alerts" subtitle="Control emails and deadline triggers">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                    <div>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>Email Alerts</span>
                      <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Get email notices when resume scanning reports complete.</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.notifications.emailAlerts}
                      onChange={() => handleNotificationToggle('emailAlerts')}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                  </label>

                  <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                    <div>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>Deadline Reminders</span>
                      <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Receive warnings 24 hours prior to application deadlines.</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.notifications.deadlineReminders}
                      onChange={() => handleNotificationToggle('deadlineReminders')}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                  </label>
                </div>
              </Card>
            </>
          )}

          {/* TAB 2: Subscriptions & B2B Licensing */}
          {activeTab === 'billing' && (
            <>
              {/* Revenue Stream 1: B2C Subscriptions matrix */}
              <Card title="Revenue Stream 1: Subscription Tiers (B2C)" subtitle="Choose the plan that matches your job hunt pace">
                <div className="grid-3" style={{ gap: '1rem', marginTop: '0.5rem' }}>
                  {/* Free Plan */}
                  <div style={{
                    border: activePlan === 'Free' ? '2px solid var(--accent)' : '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '1.25rem',
                    backgroundColor: 'var(--bg-card)',
                    position: 'relative'
                  }}>
                    {activePlan === 'Free' && <span className="badge badge-primary" style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '0.65rem' }}>Active</span>}
                    <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Free Plan</h3>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0.5rem 0' }}>₹0</div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Perfect for initial trials and basic resume scoring tests.</p>
                    <ul style={{ paddingLeft: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1.5rem' }}>
                      <li>1 Resume Upload</li>
                      <li>Basic ATS Score</li>
                      <li>10 AI Chats/month</li>
                      <li>Basic Dashboard</li>
                    </ul>
                    <button
                      type="button"
                      onClick={() => selectSubscriptionPlan('Free')}
                      className={`btn ${activePlan === 'Free' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ width: '100%', fontSize: '0.75rem', opacity: (activePlan === 'Pro' || activePlan === 'Premium') ? 0.5 : 1, cursor: (activePlan === 'Pro' || activePlan === 'Premium') ? 'not-allowed' : 'pointer' }}
                      disabled={activePlan === 'Pro' || activePlan === 'Premium'}
                    >
                      {activePlan === 'Free' ? 'Current Plan' : (activePlan === 'Pro' || activePlan === 'Premium') ? 'Downgrade Disabled' : 'Select Free'}
                    </button>
                  </div>

                  {/* Pro Plan */}
                  <div style={{
                    border: activePlan === 'Pro' ? '2px solid var(--accent)' : '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '1.25rem',
                    backgroundColor: 'var(--bg-card)',
                    position: 'relative'
                  }}>
                    {activePlan === 'Pro' && <span className="badge badge-primary" style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '0.65rem' }}>Active</span>}
                    <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Pro Plan</h3>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0.5rem 0' }}>₹499<span style={{ fontSize: '0.8rem', fontWeight: 500 }}>/mo</span></div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Best for students & active job applicants seeking callback boosts.</p>
                    <ul style={{ paddingLeft: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1.5rem' }}>
                      <li>Unlimited Tailoring</li>
                      <li>Unlimited ATS Runs</li>
                      <li>AI Cover Letters</li>
                      <li>Interview Preparation</li>
                      <li>Follow-up Reminders</li>
                    </ul>
                    <button
                      type="button"
                      onClick={() => selectSubscriptionPlan('Pro')}
                      className={`btn ${activePlan === 'Pro' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ width: '100%', fontSize: '0.75rem', opacity: activePlan === 'Premium' ? 0.5 : 1, cursor: activePlan === 'Premium' ? 'not-allowed' : 'pointer' }}
                      disabled={activePlan === 'Premium'}
                    >
                      {activePlan === 'Pro' ? 'Current Plan' : activePlan === 'Premium' ? 'Downgrade Disabled' : 'Select Pro'}
                    </button>
                  </div>

                  {/* Premium Plan */}
                  <div style={{
                    border: activePlan === 'Premium' ? '2px solid var(--accent)' : '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '1.25rem',
                    backgroundColor: 'var(--bg-card)',
                    position: 'relative'
                  }}>
                    {activePlan === 'Premium' && <span className="badge badge-primary" style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '0.65rem' }}>Active</span>}
                    <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Premium Plan</h3>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0.5rem 0' }}>₹1,199<span style={{ fontSize: '0.8rem', fontWeight: 500 }}>/mo</span></div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>For career switchers needing high-touch support & fast queues.</p>
                    <ul style={{ paddingLeft: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1.5rem' }}>
                      <li>Everything in Pro</li>
                      <li>Voice Mock Interviews</li>
                      <li>Salary Negotiator</li>
                      <li>Priority AI queues</li>
                      <li>Learning Roadmaps</li>
                    </ul>
                    <button
                      type="button"
                      onClick={() => selectSubscriptionPlan('Premium')}
                      className={`btn ${activePlan === 'Premium' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ width: '100%', fontSize: '0.75rem' }}
                    >
                      {activePlan === 'Premium' ? 'Current Plan' : 'Select Premium'}
                    </button>
                  </div>
                </div>
              </Card>

              {/* Revenue Stream 2 & 3: B2B Enterprise Portals */}
              <div className="grid-2" style={{ gap: '1.5rem' }}>
                {/* University Placement Licensing */}
                <Card title="Revenue Stream 2: B2B University Licensing" subtitle="Sell placement review licenses to colleges">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', height: '100%', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>College Enterprise</span>
                        <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>₹2 Lakh / Year</span>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                        Allows universities to buy bulk portfolios providing automated student review dashboards, company-wise preparation mock modules, and centralized placement analytics reports.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => alert('Demo proposal request sent to University Sales Desk!')}
                      className="btn btn-secondary"
                      style={{ width: '100%', fontSize: '0.75rem', height: '36px' }}
                    >
                      Request Campus License Demo
                    </button>
                  </div>
                </Card>

                {/* Recruiter Dashboard Portal */}
                <Card title="Revenue Stream 3: Recruiter Candidate Dashboards" subtitle="Enable companies to shortlist applicants quickly">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', height: '100%', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Recruiter Search Tier</span>
                        <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>₹10k - ₹50k / month</span>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                        Empowers hiring managers and recruiters to filter candidate databases via AI resume parsing ranking, automated skill-match indexing, and shortlist recommendation indexes.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => alert('Recruiter trial key request sent!')}
                      className="btn btn-secondary"
                      style={{ width: '100%', fontSize: '0.75rem', height: '36px' }}
                    >
                      Get Recruiter Access Key
                    </button>
                  </div>
                </Card>
              </div>
            </>
          )}

          {/* TAB 3: Premium AI Credits Shop */}
          {activeTab === 'credits' && (
            <Card title="Revenue Stream 6: Premium AI Credits shop" subtitle="Top up credits for single-use advanced evaluations without subscriptions">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', backgroundColor: 'var(--bg-app)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem' }}>
                <div>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Active AI Credits Balance</span>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent)', marginTop: '0.25rem' }}>{credits} Credits</div>
                </div>
                {/* <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                  Used for premium voice analysis<br />and salary negotiator chats.
                </div> */}
              </div>

              <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>Buy AI Credits Bundle</h4>
              <div className="grid-2" style={{ gap: '1.5rem' }}>
                {/* 100 Credits */}
                <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '1.25rem', textAlign: 'center', backgroundColor: 'var(--bg-card)' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Starter Top-Up</span>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0.5rem 0' }}>100 Credits</h3>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>₹199</div>
                  <button
                    type="button"
                    onClick={() => buyCredits(100, 199)}
                    className="btn btn-primary"
                    style={{ width: '100%', fontSize: '0.75rem', height: '36px' }}
                  >
                    Buy 100 Credits
                  </button>
                </div>

                {/* 500 Credits */}
                <div style={{ border: '2px solid var(--accent)', borderRadius: 'var(--radius-sm)', padding: '1.25rem', textAlign: 'center', backgroundColor: 'var(--bg-card)', position: 'relative' }}>
                  <span className="badge badge-primary" style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', fontSize: '0.6rem' }}>Best Value</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Pro Top-Up</span>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0.5rem 0' }}>500 Credits</h3>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>₹799</div>
                  <button
                    type="button"
                    onClick={() => buyCredits(500, 799)}
                    className="btn btn-primary"
                    style={{ width: '100%', fontSize: '0.75rem', height: '36px' }}
                  >
                    Buy 500 Credits
                  </button>
                </div>
              </div>
            </Card>
          )}

          {/* TAB 4: Marketplace & Affiliates */}
          {activeTab === 'marketplace' && (
            <>
              {/* Revenue Stream 4: Marketplace Bookings */}
              <Card title="Revenue Stream 4: 1-on-1 Career Services Marketplace" subtitle="Schedule priority reviews with verified career partners">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>

                  {/* Service 1: Resume Writer */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                    <div>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>Professional Resume Writing</span>
                      <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Get a customized document overhaul from expert technical writers.</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>₹1,999</span>
                      <button
                        onClick={() => alert('Connecting you to partner Resume Writers... (15% platform commission applies)')}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', height: '24px', marginTop: '0.25rem' }}
                      >
                        Book Session
                      </button>
                    </div>
                  </div>

                  {/* Service 2: Mock Interviewer */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                    <div>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>1-on-1 Coding Mock Interview</span>
                      <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Practice mock panels with senior developers at top-tier FAANG companies.</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>₹2,499</span>
                      <button
                        onClick={() => alert('Connecting you to partner Interview Coaches... (15% platform commission applies)')}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', height: '24px', marginTop: '0.25rem' }}
                      >
                        Book Session
                      </button>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', marginTop: '1rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  <HelpCircle size={12} />
                  <span>Platform matches bookings securely. Partners pay a 15–20% referral commission to AI Career Copilot.</span>
                </div>
              </Card>

              {/* Revenue Stream 5: Affiliate Partnerships */}
              <Card title="Revenue Stream 5: Affiliate Partnerships & Resources" subtitle="Recommended resources for professional growth and credentials">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>

                  {/* Course Partner */}
                  <div style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-app)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>AWS Cloud Architect Specialization</span>
                      <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>20% Partner Discount</span>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                      Highly recommended training to address cloud engineering skills deficits highlighted by the ATS Analyzer.
                    </p>
                    <a
                      href="#aws-specialization"
                      onClick={(e) => { e.preventDefault(); alert('Redirecting to partner certification course via affiliate link.'); }}
                      style={{ fontSize: '0.75rem', color: 'var(--accent)', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                    >
                      <span>Explore Certification Program</span>
                      <ArrowRight size={12} />
                    </a>
                  </div>

                  {/* Practice Partner */}
                  <div style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-app)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Premium Coding Practice Subscription</span>
                      <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>₹100 Referral Reward</span>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                      Interactive platform to sharpen data structures and algorithms preparation before technical interviews.
                    </p>
                    <a
                      href="#coding-platform"
                      onClick={(e) => { e.preventDefault(); alert('Redirecting to partner coding platform via referral program.'); }}
                      style={{ fontSize: '0.75rem', color: 'var(--accent)', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                    >
                      <span>Subscribe & Practice</span>
                      <ArrowRight size={12} />
                    </a>
                  </div>
                </div>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '1rem', fontStyle: 'italic' }}>
                  Affiliate Disclosure: Career Copilot recommends verified external platforms. Purchases made via links award commissions.
                </p>
              </Card>
            </>
          )}

          {/* TAB 5: Developer API Portal */}
          {activeTab === 'developer' && (
            <Card title="Developer AI Model & API Platform" subtitle="Manage your local LLM engine configurations and public developer APIs">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '0.5rem' }}>

                {/* Local AI Model Status Indicator Card */}
                <div style={{
                  border: '1px solid var(--border)',
                  padding: '1.5rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(255,255,255,0.01)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>AI Engine Status</h3>
                    <button
                      type="button"
                      onClick={checkModelStatus}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem', height: '28px' }}
                    >
                      Refresh Connection
                    </button>
                  </div>

                  {modelStatus ? (
                    (() => {
                      const isGroq = modelStatus.ollamaUrl.includes('groq.com');
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              backgroundColor: modelStatus.status === 'ONLINE' ? 'var(--success)' : 'var(--danger)',
                              display: 'inline-block',
                              boxShadow: modelStatus.status === 'ONLINE' ? '0 0 8px var(--success)' : '0 0 8px var(--danger)'
                            }} />
                            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                              {isGroq ? 'Groq Status' : 'Ollama Status'}: {modelStatus.status}
                            </span>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            <span>{isGroq ? 'Target Model' : 'Target Local Model'}:</span>
                            <strong style={{ color: 'var(--text-primary)' }}>{modelStatus.model}</strong>

                            <span>{isGroq ? 'API Endpoint' : 'Ollama Host URL'}:</span>
                            <code style={{ fontFamily: 'monospace' }}>{modelStatus.ollamaUrl}</code>

                            <span>{isGroq ? 'API Connection Status' : 'Model Pulled locally'}:</span>
                            <strong style={{ color: modelStatus.modelPulled ? 'var(--success)' : 'var(--warning)' }}>
                              {isGroq
                                ? (modelStatus.modelPulled ? '✓ Active Groq LPU Engine' : '⚠ Key Configuration Error')
                                : (modelStatus.modelPulled ? '✓ Configured Model Found' : '⚠ Model Not Found')
                              }
                            </strong>
                          </div>

                          {modelStatus.status === 'OFFLINE' && (
                            <div style={{
                              backgroundColor: 'var(--danger-light)',
                              border: '1px solid var(--danger)',
                              padding: '0.75rem 1rem',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '0.75rem',
                              color: 'var(--text-primary)',
                              marginTop: '0.5rem',
                              lineHeight: '1.4'
                            }}>
                              <strong>How to start:</strong> Run <code>ollama serve</code> to launch the local model.<br />
                              <span style={{ display: 'block', marginTop: '0.25rem', color: 'var(--text-secondary)' }}>
                                💡 <em>Or, configure a <code>GROQ_API_KEY</code> in your <code>backend/.env</code> file to run high-speed Llama models for free via Groq Cloud!</em>
                              </span>
                            </div>
                          )}

                          {modelStatus.status === 'ONLINE' && !modelStatus.modelPulled && !isGroq && (
                            <div style={{
                              backgroundColor: 'var(--warning-light)',
                              border: '1px solid var(--warning)',
                              padding: '0.75rem 1rem',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '0.75rem',
                              color: 'var(--text-primary)',
                              marginTop: '0.5rem'
                            }}>
                              <strong>Required step:</strong> The model is not pulled yet. Open your terminal and run:<br />
                              <code style={{ display: 'block', marginTop: '0.25rem', padding: '0.25rem', backgroundColor: 'rgba(0,0,0,0.1)', fontFamily: 'monospace' }}>
                                ollama pull {modelStatus.model}
                              </code>
                            </div>
                          )}

                          {modelStatus.status === 'ONLINE' && modelStatus.availableModels.length > 0 && (
                            <div style={{ marginTop: '0.5rem' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem', color: 'var(--text-primary)' }}>
                                {isGroq ? 'Supported Models' : 'Available Models Pulled'}:
                              </span>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                {modelStatus.availableModels.map(name => (
                                  <span key={name} className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
                                    {name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Checking AI engine status...</span>
                  )}
                </div>

                {/* API Key configuration card */}
                <div style={{ border: '1px solid var(--border)', padding: '1.25rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-app)' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
                    Active Developer API Secret Key
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      readOnly
                      value={apiKey}
                      className="form-input"
                      style={{ fontFamily: 'monospace', fontSize: '0.8rem', letterSpacing: '0.05em', backgroundColor: 'var(--bg-card)' }}
                    />
                    <button
                      type="button"
                      onClick={regenerateApiKey}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                    >
                      Regenerate
                    </button>
                  </div>
                </div>

                {/* API Pricing tiers */}
                <div>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>API Cost Structure</h4>
                  <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-app)', fontSize: '0.8rem', fontWeight: 600 }}>
                      <span>API Call Type</span>
                      <span>Rate per 1,000 requests</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', fontSize: '0.75rem' }}>
                      <span>Resume Analysis & Parsing API</span>
                      <span>₹499</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', fontSize: '0.75rem' }}>
                      <span>Job Description Matcher API</span>
                      <span>₹299</span>
                    </div>
                  </div>
                </div>

                {/* Documentation curl example */}
                <div>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Developer Quickstart Documentation</h4>
                  <pre style={{
                    backgroundColor: '#1E1E2E',
                    color: '#A6ADC8',
                    padding: '1rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.75rem',
                    overflowX: 'auto',
                    fontFamily: 'monospace',
                    lineHeight: '1.4'
                  }}>
                    {`# Execute an ATS Compatibility rating query via cURL\ncurl -X POST https://api.careercopilot.in/v1/ats/analyze \\ \n  -H "Authorization: Bearer ${apiKey}" \\ \n  -H "Content-Type: application/json" \\ \n  -d '{\n    "resumeText": "...",\n    "jobDescription": "..."\n  }'`}
                  </pre>
                </div>
              </div>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}
