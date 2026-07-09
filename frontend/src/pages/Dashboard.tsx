import { useEffect, useState } from 'react';
import { trackerApi, ApplicationCard, resumeApi, ResumeAnalysis } from '../api';
import {
  Sparkles,
  TrendingUp,
  FileCheck,
  Calendar,
  Layers,
  ArrowRight,
  Briefcase,
  AlertCircle
} from 'lucide-react';
import Card from '../components/Card';
import MetricBar from '../components/MetricBar';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [apps, setApps] = useState<ApplicationCard[]>([]);
  const [latestResume, setLatestResume] = useState<ResumeAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([trackerApi.list(), resumeApi.getLatest()])
      .then(([appsRes, resumeRes]) => {
        setApps(appsRes);
        setLatestResume(resumeRes);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const totalApps = apps.length;
  const interviewsCount = apps.filter(a => a.status === 'INTERVIEW' || a.interviewDate).length;
  const upcomingInterviews = apps.filter(a => {
    if (a.status === 'INTERVIEW') return true;
    if (!a.interviewDate) return false;
    return new Date(a.interviewDate) >= new Date(new Date().setHours(0,0,0,0));
  });

  // Calculate scores dynamically from the active database resume
  const activeAtsScore = latestResume ? latestResume.atsScore : 0;
  const activeResumeScore = latestResume ? latestResume.score : 0;
  const overallCareerScore = latestResume ? Math.round((activeResumeScore + activeAtsScore) / 2) : 0;

  // Generate recommendations dynamically from active database state
  const getDynamicRecommendations = () => {
    const recs = [];

    if (!latestResume) {
      recs.push({
        id: 'rec-upload',
        title: 'Upload Your First Resume',
        desc: 'You do not have any active resume in the database. Upload a PDF or DOCX file to diagnose ATS parsing compatibility.',
        link: '/analyzer'
      });
    } else {
      const missingSkills = latestResume.skillAnalysis?.missingSkills || [];
      if (missingSkills.length > 0) {
        recs.push({
          id: 'rec-skills',
          title: 'Address Critical Skill Gaps',
          desc: `Your active resume is missing keywords found in modern postings: ${missingSkills.slice(0, 3).join(', ')}. Add them to boost your score.`,
          link: '/analyzer'
        });
      }

      if (latestResume.suggestions && latestResume.suggestions.length > 0) {
        recs.push({
          id: 'rec-suggestions',
          title: 'Improve Formatting Alignment',
          desc: latestResume.suggestions[0],
          link: '/analyzer'
        });
      }
    }

    const nextInterview = apps.find(a => a.status === 'INTERVIEW' || a.interviewDate);
    if (nextInterview) {
      recs.push({
        id: 'rec-prep',
        title: `Prepare for ${nextInterview.company} Interview`,
        desc: `You have an interview scheduled for the ${nextInterview.role} role. Run a mock prep session now to review feedback.`,
        link: '/interview'
      });
    }

    const unoptimizedApp = apps.find(a => a.status === 'APPLIED' || a.status === 'ASSESSMENT');
    if (unoptimizedApp) {
      recs.push({
        id: 'rec-tailor',
        title: `Tailor Resume for ${unoptimizedApp.company}`,
        desc: `Optimize your keywords and bullet points specifically for the ${unoptimizedApp.role} description to increase your callback rate.`,
        link: '/tailor'
      });
    }

    if (recs.length === 0) {
      recs.push({
        id: 'rec-default',
        title: 'Check Job Compatibility',
        desc: 'Paste a target job posting in the Job Matcher to instantly calculate your match compatibility score.',
        link: '/matcher'
      });
    }

    return recs;
  };

  const recommendations = getDynamicRecommendations();

  return (
    <div>
      <header className="dashboard-header">
        <div>
          <h1>Career Dashboard</h1>
          <p>Welcome back! Here is a summary of your career copilot activities and progress.</p>
        </div>
        <Link to="/analyzer" className="btn btn-primary" style={{ flexShrink: 0 }}>
          <Sparkles size={16} />
          <span>Optimize Resume</span>
        </Link>
      </header>

      <style>{`
        .dashboard-header {
          margin-bottom: 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
        }
        .dashboard-scroll-list {
          max-height: 320px;
          overflow-y: auto;
        }
        .dashboard-scroll-list-sm {
          max-height: 220px;
          overflow-y: auto;
        }
        @media (max-width: 640px) {
          .dashboard-header {
            flex-direction: column;
            align-items: flex-start;
          }
          .dashboard-header a {
            width: 100%;
            justify-content: center;
          }
        }
        @media (max-width: 768px) {
          .dashboard-scroll-list,
          .dashboard-scroll-list-sm {
            max-height: none;
            overflow-y: visible;
          }
        }
      `}</style>

      {/* Main Metric Cards Row */}
      <div className="grid-4" style={{ marginBottom: '2rem' }}>
        <Card>
          <div className="metric-title">Overall Career Score</div>
          <div className="metric-value">{loading ? '...' : `${overallCareerScore}%`}</div>
          <MetricBar label="Combined Performance" value={overallCareerScore} colorType="accent" />
        </Card>
        <Card>
          <div className="metric-title">Active ATS Score</div>
          <div className="metric-value">{loading ? '...' : `${activeAtsScore}%`}</div>
          <MetricBar label="ATS Compatibility" value={activeAtsScore} colorType="dynamic" />
        </Card>
        <Card>
          <div className="metric-title">Applications Sent</div>
          <div className="metric-value">{loading ? '...' : totalApps}</div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <TrendingUp size={14} style={{ color: 'var(--success)' }} />
            <span>Connected to database applications</span>
          </div>
        </Card>
        <Card>
          <div className="metric-title">Interviews Received</div>
          <div className="metric-value">{loading ? '...' : interviewsCount}</div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <Calendar size={14} style={{ color: 'var(--accent)' }} />
            <span>{(totalApps > 0 ? (interviewsCount / totalApps) * 100 : 0).toFixed(0)}% Conversion Rate</span>
          </div>
        </Card>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        {/* Left Column: AI Recommendations */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <Card title="AI Copilot Recommendations" subtitle="Tailored insights based on database uploads and applications">
            <div className="dashboard-scroll-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingRight: '0.25rem' }}>
              {recommendations.map(rec => (
                <div
                  key={rec.id}
                  style={{
                    display: 'flex',
                    gap: '1rem',
                    padding: '1rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-app)',
                    position: 'relative'
                  }}
                >
                  <AlertCircle size={20} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                      {rec.title}
                    </h4>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                      {rec.desc}
                    </p>
                    <Link
                      to={rec.link}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: 'var(--accent)',
                        textDecoration: 'none'
                      }}
                    >
                      <span>Take Action</span>
                      <ArrowRight size={12} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Column: Upcoming Interviews & Resume Versions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <Card title="Upcoming Interviews" subtitle="Key dates for scheduled recruitment stages">
            {loading ? (
              <p>Loading interviews...</p>
            ) : upcomingInterviews.length > 0 ? (
              <div className="dashboard-scroll-list-sm" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '0.25rem' }}>
                {upcomingInterviews.map(app => (
                  <div
                    key={app.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.75rem 1rem',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      flexWrap: 'wrap',
                      gap: '0.75rem'
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{app.company}</span>
                      <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{app.role}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className={app.interviewDate ? "badge badge-primary" : "badge badge-warning"} style={{ fontSize: '0.7rem' }}>
                        {app.interviewDate || 'To be scheduled'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
                <Calendar size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                <p style={{ fontSize: '0.85rem' }}>No upcoming interviews scheduled yet.</p>
                <Link to="/tracker" style={{ fontSize: '0.75rem', color: 'var(--accent)', textDecoration: 'none', fontWeight: 500, display: 'inline-block', marginTop: '0.5rem' }}>
                  Open Application Tracker
                </Link>
              </div>
            )}
          </Card>

          <Card title="Active Resume Documents" subtitle="Manage your database parsed resumes">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {latestResume ? (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '0.75rem 1rem', 
                  border: '1px solid var(--border)', 
                  borderRadius: 'var(--radius-sm)',
                  flexWrap: 'wrap',
                  gap: '0.75rem'
                }}>
                  <div>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{latestResume.title}</span>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Active parsed resume</span>
                  </div>
                  <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>Score {latestResume.score}</span>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No resumes uploaded in database. Go to Resume Analyzer to upload one.
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
