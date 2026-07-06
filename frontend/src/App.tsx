import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import ResumeAnalyzer from './pages/ResumeAnalyzer';
import ResumeTailor from './pages/ResumeTailor';
import JobMatcher from './pages/JobMatcher';
import ApplicationTracker from './pages/ApplicationTracker';
import InterviewPrep from './pages/InterviewPrep';
import CareerAnalytics from './pages/CareerAnalytics';
import Settings from './pages/Settings';
import Auth from './pages/Auth';
import AtsAnalyzer from './pages/AtsAnalyzer';
import { UserProfile } from './api';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  // Parent-level memory state preservation across sidebar navigation clicks
  const [tailorResumeText, setTailorResumeText] = useState('');
  const [tailorJobDescription, setTailorJobDescription] = useState('');
  const [tailorResult, setTailorResult] = useState<any>(null);

  const [atsResumeText, setAtsResumeText] = useState('');
  const [atsJobDescription, setAtsJobDescription] = useState('');
  const [atsResult, setAtsResult] = useState<any>(null);

  const [matcherJobDescription, setMatcherJobDescription] = useState('');
  const [matcherResult, setMatcherResult] = useState<any>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setCheckingSession(false);
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
      <div className="app-container">
        {/* Navigation Sidebar */}
        <Sidebar user={user} onLogout={handleLogout} />

        {/* Core Workspace Window */}
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/analyzer" element={<ResumeAnalyzer />} />
            <Route path="/tailor" element={
              <ResumeTailor 
                resumeText={tailorResumeText} 
                setResumeText={setTailorResumeText}
                jobDescription={tailorJobDescription} 
                setJobDescription={setTailorJobDescription}
                result={tailorResult} 
                setResult={setTailorResult}
              />
            } />
            <Route path="/matcher" element={
              <JobMatcher 
                jobDescription={matcherJobDescription} 
                setJobDescription={setMatcherJobDescription}
                result={matcherResult} 
                setResult={setMatcherResult}
              />
            } />
            <Route path="/tracker" element={<ApplicationTracker />} />
            <Route path="/interview" element={<InterviewPrep />} />
            <Route path="/analytics" element={<CareerAnalytics />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/ats-analyzer" element={
              <AtsAnalyzer 
                resumeText={atsResumeText} 
                setResumeText={setAtsResumeText}
                jobDescription={atsJobDescription} 
                setJobDescription={setAtsJobDescription}
                result={atsResult} 
                setResult={setAtsResult}
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
