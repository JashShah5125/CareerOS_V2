import { useEffect, useState } from 'react';
import { trackerApi, resumeApi, ApplicationCard, ResumeAnalysis } from '../api';
import Card from '../components/Card';
import MetricBar from '../components/MetricBar';
import { TrendingUp, Layers, Compass, CheckCircle, Calendar, Briefcase, Award } from 'lucide-react';

export default function CareerAnalytics() {
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
  const assessmentCount = apps.filter(a => a.status === 'ASSESSMENT' || a.status === 'INTERVIEW' || a.status === 'OFFER').length;
  const interviewCount = apps.filter(a => a.status === 'INTERVIEW' || a.status === 'OFFER' || a.interviewDate).length;
  const offerCount = apps.filter(a => a.status === 'OFFER').length;

  // Calculate live conversion percentages
  const interviewRate = totalApps > 0 ? (interviewCount / totalApps) * 100 : 0;
  const offerRate = totalApps > 0 ? (offerCount / totalApps) * 100 : 0;

  // Calculate dynamic resume tier from Postgres resume score
  const resumeScore = latestResume ? latestResume.score : 0;
  let resumeGrade = 'C Tier';
  let resumePercentile = 'Analyze resume to see compatibility';
  if (resumeScore >= 90) {
    resumeGrade = 'A+ Tier';
    resumePercentile = 'Top 5% compatibility score';
  } else if (resumeScore >= 80) {
    resumeGrade = 'A Tier';
    resumePercentile = 'Top 15% compatibility score';
  } else if (resumeScore >= 70) {
    resumeGrade = 'B Tier';
    resumePercentile = 'Top 35% compatibility score';
  } else if (resumeScore > 0) {
    resumeGrade = 'C Tier';
    resumePercentile = 'Resume requires optimizations';
  }

  // Calculate the 6-Month Trend dynamically from application dates
  const getLast6Months = () => {
    const months = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        month: monthNames[d.getMonth()],
        year: d.getFullYear(),
        count: 0,
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      });
    }
    return months;
  };

  const trendData = getLast6Months();
  apps.forEach(app => {
    const dateStr = app.applicationDate;
    if (dateStr) {
      const parts = dateStr.split('-');
      if (parts.length >= 2) {
        const appKey = `${parts[0]}-${parts[1]}`; // "YYYY-MM"
        const monthObj = trendData.find(m => m.key === appKey);
        if (monthObj) {
          monthObj.count += 1;
        }
      }
    }
  });

  // Calculate coordinates for the SVG trend line chart
  const maxCount = Math.max(5, ...trendData.map(d => d.count));
  const points = trendData.map((d, i) => {
    const x = 40 + i * 88;
    const y = 170 - (d.count / maxCount) * 130;
    return { x, y, count: d.count, month: d.month };
  });

  const linePathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPathD = points.length > 0 ? `${linePathD} L ${points[points.length - 1].x} 170 L ${points[0].x} 170 Z` : '';

  // Calculate funnel conversions percentages
  const appliedRate = totalApps > 0 ? 100 : 0;
  const assessmentRate = totalApps > 0 ? Math.round((assessmentCount / totalApps) * 100) : 0;
  const interviewRateRound = totalApps > 0 ? Math.round((interviewCount / totalApps) * 100) : 0;
  const offerRateRound = totalApps > 0 ? Math.round((offerCount / totalApps) * 100) : 0;

  // Parse dynamic skills matrix from parsed resume
  const defaultSkills = [
    { name: 'React / Frontend Architectures', value: 85 },
    { name: 'TypeScript Type Safety', value: 80 },
    { name: 'Express / Backend REST APIs', value: 75 },
    { name: 'PostgreSQL Schema Configurations', value: 70 },
    { name: 'Git Version Collaboration', value: 65 },
    { name: 'Docker Container Orchestration', value: 30 }
  ];

  const getSkillsMatrix = () => {
    if (!latestResume || !latestResume.skillAnalysis?.identifiedSkills || latestResume.skillAnalysis.identifiedSkills.length === 0) {
      return defaultSkills;
    }
    const identified = latestResume.skillAnalysis.identifiedSkills;
    // Map identified skills to progress metrics dynamically
    return identified.slice(0, 6).map((skill, idx) => ({
      name: skill,
      value: Math.max(45, 95 - idx * 7)
    }));
  };

  const skillsMatrix = getSkillsMatrix();

  // Create dynamic milestones timeline from active database application status changes
  const getTimelineMilestones = () => {
    const milestones: Array<{ id: string; title: string; date: string; statusText: string; color: string }> = [];

    // Check for offers
    apps.filter(a => a.status === 'OFFER').forEach(app => {
      milestones.push({
        id: `milestone-offer-${app.id}`,
        title: `${app.company} Job Offer Received!`,
        date: app.interviewDate || app.applicationDate,
        statusText: 'Stage: Offer Negotiation',
        color: 'var(--success)'
      });
    });

    // Check for interviews
    apps.filter(a => a.status === 'INTERVIEW').forEach(app => {
      milestones.push({
        id: `milestone-interview-${app.id}`,
        title: `${app.company} Technical Panels`,
        date: app.interviewDate || app.applicationDate,
        statusText: 'Stage: In Progress',
        color: 'var(--accent)'
      });
    });

    // Sort chronologically (latest first)
    milestones.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Add baseline account configuration milestone
    milestones.push({
      id: 'milestone-init',
      title: 'Initialized AI Career Copilot Profile',
      date: 'Account Ready',
      statusText: 'Status: Setup Completed',
      color: 'var(--border)'
    });

    return milestones.slice(0, 4);
  };

  const timelineMilestones = getTimelineMilestones();

  return (
    <div>
      <header style={{ marginBottom: '2rem' }}>
        <h1>Career Analytics</h1>
        <p>Monitor your job application flow, interview conversions, resume performance ratings, and professional skill metrics.</p>
      </header>

      {/* Conversion Rate Overview Cards */}
      <div className="grid-3" style={{ marginBottom: '2rem' }}>
        <Card style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--accent-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent)',
            flexShrink: 0
          }}>
            <Layers size={22} />
          </div>
          <div>
            <span className="metric-title" style={{ fontSize: '0.7rem' }}>Interview Conversion Rate</span>
            <div className="metric-value" style={{ fontSize: '1.5rem', marginTop: '0.25rem' }}>
              {loading ? '...' : `${interviewRate.toFixed(1)}%`}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Industry Avg: 15%</span>
          </div>
        </Card>

        <Card style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--success-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--success)',
            flexShrink: 0
          }}>
            <CheckCircle size={22} />
          </div>
          <div>
            <span className="metric-title" style={{ fontSize: '0.7rem' }}>Offer Conversion Rate</span>
            <div className="metric-value" style={{ fontSize: '1.5rem', marginTop: '0.25rem' }}>
              {loading ? '...' : `${offerRate.toFixed(1)}%`}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Industry Avg: 3%</span>
          </div>
        </Card>

        <Card style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--warning-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--warning)',
            flexShrink: 0
          }}>
            <TrendingUp size={22} />
          </div>
          <div>
            <span className="metric-title" style={{ fontSize: '0.7rem' }}>Resume Performance</span>
            <div className="metric-value" style={{ fontSize: '1.5rem', marginTop: '0.25rem' }}>
              {loading ? '...' : resumeGrade}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{loading ? '...' : resumePercentile}</span>
          </div>
        </Card>
      </div>

      <div className="grid-2" style={{ marginBottom: '2rem' }}>
        {/* SVG Line Chart: Application Trends */}
        <Card title="Applications Sent (6-Month Trend)">
          <div style={{ width: '100%', height: '240px', position: 'relative', marginTop: '1rem' }}>
            {loading ? (
              <p>Loading application data trends...</p>
            ) : points.length > 0 ? (
              <svg viewBox="0 0 500 200" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                {/* Grid Lines */}
                <line x1="40" y1="20" x2="480" y2="20" stroke="var(--border)" strokeDasharray="4" />
                <line x1="40" y1="70" x2="480" y2="70" stroke="var(--border)" strokeDasharray="4" />
                <line x1="40" y1="120" x2="480" y2="120" stroke="var(--border)" strokeDasharray="4" />
                <line x1="40" y1="170" x2="480" y2="170" stroke="var(--border)" />

                {/* Line and Gradient */}
                <defs>
                  <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d={linePathD}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <path
                  d={areaPathD}
                  fill="url(#chartGrad)"
                />

                {/* Data points dots */}
                {points.map((p, idx) => (
                  <g key={idx}>
                    <circle cx={p.x} cy={p.y} r="5" fill="var(--accent)" stroke="var(--bg-card)" strokeWidth="2" />
                    {/* Tooltip text showing numbers */}
                    <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="9" fontWeight="600" fill="var(--text-primary)">
                      {p.count}
                    </text>
                  </g>
                ))}

                {/* Axes labels */}
                {points.map((p, idx) => (
                  <text key={idx} x={p.x} y="190" textAnchor="middle" fontSize="10" fill="var(--text-muted)">
                    {p.month}
                  </text>
                ))}
              </svg>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                No database records to plot trends yet.
              </div>
            )}
          </div>
        </Card>

        {/* SVG Column Chart: Application Funnel */}
        <Card title="Funnel Conversion Rate (%)">
          <div style={{ width: '100%', height: '240px', position: 'relative', marginTop: '1rem' }}>
            {loading ? (
              <p>Loading conversion rates funnel...</p>
            ) : (
              <svg viewBox="0 0 500 200" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                <line x1="40" y1="170" x2="480" y2="170" stroke="var(--border)" />
                
                {/* Applied */}
                <rect x="70" y={170 - (appliedRate / 100) * 150} width="40" height={(appliedRate / 100) * 150} fill="var(--accent)" rx="3" style={{ opacity: 0.8 }} />
                <text x="90" y={170 - (appliedRate / 100) * 150 - 5} textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--text-primary)">{appliedRate}%</text>
                <text x="90" y="190" textAnchor="middle" fontSize="10" fill="var(--text-muted)">Applied</text>

                {/* Assessment */}
                <rect x="170" y={170 - (assessmentRate / 100) * 150} width="40" height={(assessmentRate / 100) * 150} fill="var(--warning)" rx="3" style={{ opacity: 0.8 }} />
                <text x="190" y={170 - (assessmentRate / 100) * 150 - 5} textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--text-primary)">{assessmentRate}%</text>
                <text x="190" y="190" textAnchor="middle" fontSize="10" fill="var(--text-muted)">Assessment</text>

                {/* Interview */}
                <rect x="270" y={170 - (interviewRateRound / 100) * 150} width="40" height={(interviewRateRound / 100) * 150} fill="var(--accent)" rx="3" style={{ opacity: 0.85 }} />
                <text x="290" y={170 - (interviewRateRound / 100) * 150 - 5} textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--text-primary)">{interviewRateRound}%</text>
                <text x="290" y="190" textAnchor="middle" fontSize="10" fill="var(--text-muted)">Interview</text>

                {/* Offer */}
                <rect x="370" y={170 - (offerRateRound / 100) * 150} width="40" height={(offerRateRound / 100) * 150} fill="var(--success)" rx="3" style={{ opacity: 0.9 }} />
                <text x="390" y={170 - (offerRateRound / 100) * 150 - 5} textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--text-primary)">{offerRateRound}%</text>
                <text x="390" y="190" textAnchor="middle" fontSize="10" fill="var(--text-muted)">Offer</text>
              </svg>
            )}
          </div>
        </Card>
      </div>

      <div className="grid-2">
        {/* Skill Growth Metrics */}
        <Card title="Skill Growth Metrics (Compatibility Index)" subtitle="Top identified skills parsed from your active database resume">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.5rem', maxHeight: '250px', overflowY: 'auto', paddingRight: '0.25rem' }}>
            {skillsMatrix.map((skill, idx) => (
              <MetricBar key={idx} label={skill.name} value={skill.value} colorType="accent" />
            ))}
          </div>
        </Card>

        {/* Career Progress Timeline */}
        <Card title="Career Milestones Timeline" subtitle="Dynamic timeline compiled from active interviews and offers">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingLeft: '0.5rem', marginTop: '0.75rem', maxHeight: '250px', overflowY: 'auto', paddingRight: '0.25rem' }}>
            {loading ? (
              <p>Loading milestones...</p>
            ) : timelineMilestones.map((milestone, idx) => (
              <div key={milestone.id} style={{ display: 'flex', gap: '1rem', position: 'relative' }}>
                {idx < timelineMilestones.length - 1 && (
                  <div style={{
                    position: 'absolute',
                    left: '9px',
                    top: '20px',
                    bottom: '-25px',
                    width: '2px',
                    backgroundColor: 'var(--border)'
                  }} />
                )}
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  border: '4px solid var(--bg-card)',
                  backgroundColor: milestone.color,
                  zIndex: 2,
                  flexShrink: 0
                }} />
                <div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{milestone.title}</span>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {milestone.date} • {milestone.statusText}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
