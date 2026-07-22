import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import ResumeAnalyzer from './pages/ResumeAnalyzer';
import JobMatcher from './pages/JobMatcher';
import ApplicationTracker from './pages/ApplicationTracker';
import InterviewPrep from './pages/InterviewPrep';
import CareerAnalytics from './pages/CareerAnalytics';
import Settings from './pages/Settings';
import Auth from './pages/Auth';
import AtsAnalyzer from './pages/AtsAnalyzer';
import CoverLetter from './pages/CoverLetter';
import ResumeBuilder from './pages/ResumeBuilder';
import { UserProfile, authApi } from './api';

function PageTitleUpdater() {
  const location = useLocation();

  useEffect(() => {
    let title = 'CareerOS';
    switch (location.pathname) {
      case '/':
        title = 'Dashboard | CareerOS';
        break;
      case '/analyzer':
        title = 'Resume Analyzer | CareerOS';
        break;
      case '/ats-analyzer':
        title = 'ATS Analyzer | CareerOS';
        break;
      case '/matcher':
        title = 'Job Matcher | CareerOS';
        break;
      case '/tracker':
        title = 'Application Tracker | CareerOS';
        break;
      case '/interview':
        title = 'Interview Prep | CareerOS';
        break;
      case '/cover-letter':
        title = 'Cover Letter Generator | CareerOS';
        break;
      case '/builder':
        title = 'AI Resume Builder | CareerOS';
        break;
      case '/analytics':
        title = 'Career Analytics | CareerOS';
        break;
      case '/settings':
        title = 'Settings | CareerOS';
        break;
      default:
        title = 'CareerOS';
    }
    document.title = title;
  }, [location]);

  return null;
}

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  const [matcherResumeText, setMatcherResumeText] = useState('');
  const [atsResumeText, setAtsResumeText] = useState('');
  const [atsFile, setAtsFile] = useState<File | null>(null);
  const [atsJobDescription, setAtsJobDescription] = useState('');
  const [atsResult, setAtsResult] = useState<any>(null);

  const [matcherJobDescription, setMatcherJobDescription] = useState('');
  const [matcherResult, setMatcherResult] = useState<any>(null);

  const [builderCompany, setBuilderCompany] = useState('');
  const [builderRole, setBuilderRole] = useState('');
  const [builderJobDescription, setBuilderJobDescription] = useState('');
  const [builderResumeText, setBuilderResumeText] = useState('');
  const [builderResult, setBuilderResult] = useState<any>(null);

  const refreshUser = () => {
    const savedToken = localStorage.getItem('token') || token;
    if (savedToken) {
      authApi.getProfile()
        .then(profile => {
          setUser(profile);
          localStorage.setItem('user', JSON.stringify(profile));
        })
        .catch(err => console.error('[App] Failed to refresh profile:', err));
    }
  };

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (savedToken) {
      setToken(savedToken);
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
      authApi.getProfile()
        .then(profile => {
          setUser(profile);
          localStorage.setItem('user', JSON.stringify(profile));
        })
        .catch(err => console.error('[App] Failed to refresh profile:', err))
        .finally(() => setCheckingSession(false));
    } else {
      setCheckingSession(false);
    }
  }, []);

  const handleLoginSuccess = (loggedInUser: UserProfile, jwtToken: string) => {
    setUser(loggedInUser);
    setToken(jwtToken);
    localStorage.setItem('token', jwtToken);
    localStorage.setItem('user', JSON.stringify(loggedInUser));
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  if (checkingSession) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: 'var(--bg-app)' }}>
        <p style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Initializing Career Copilot Session...</p>
      </div>
    );
  }

  // If user is not authenticated, display the Auth page
  if (!token || !user) {
    return <Auth onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <Router>
      <PageTitleUpdater />
      <div className="app-container">
        {/* Navigation Sidebar */}
        <Sidebar user={user} onLogout={handleLogout} />

        {/* Core Workspace Window */}
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/analyzer" element={<ResumeAnalyzer />} />
            <Route path="/matcher" element={
              <JobMatcher 
                resumeText={matcherResumeText}
                setResumeText={setMatcherResumeText}
                jobDescription={matcherJobDescription} 
                setJobDescription={setMatcherJobDescription}
                result={matcherResult} 
                setResult={setMatcherResult}
                refreshUser={refreshUser}
              />
            } />
            <Route path="/tracker" element={<ApplicationTracker />} />
            <Route path="/interview" element={<InterviewPrep />} />
            <Route path="/cover-letter" element={<CoverLetter />} />
            <Route path="/builder" element={
              <ResumeBuilder
                company={builderCompany}
                setCompany={setBuilderCompany}
                role={builderRole}
                setRole={setBuilderRole}
                jobDescription={builderJobDescription}
                setJobDescription={setBuilderJobDescription}
                resumeText={builderResumeText}
                setResumeText={setBuilderResumeText}
                result={builderResult}
                setResult={setBuilderResult}
              />
            } />
            <Route path="/analytics" element={<CareerAnalytics />} />
            <Route path="/settings" element={<Settings refreshUser={refreshUser} />} />
            <Route path="/ats-analyzer" element={
              <AtsAnalyzer 
                resumeText={atsResumeText} 
                setResumeText={setAtsResumeText}
                jobDescription={atsJobDescription} 
                setJobDescription={setAtsJobDescription}
                result={atsResult} 
                setResult={setAtsResult}
                refreshUser={refreshUser}
                file={atsFile}
                setFile={setAtsFile}
              />
            } />
            {/* Fallback route */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
