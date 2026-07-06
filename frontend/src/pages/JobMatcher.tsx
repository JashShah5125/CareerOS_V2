import { useState } from 'react';
import { resumeApi, JobMatchAnalysis } from '../api';
import { Briefcase, AlertCircle, CheckCircle2, ChevronRight, HelpCircle, FileText, ArrowRight } from 'lucide-react';
import Card from '../components/Card';
import MetricBar from '../components/MetricBar';
import { useNavigate } from 'react-router-dom';

interface JobMatcherProps {
  jobDescription: string;
  setJobDescription: (val: string) => void;
  result: JobMatchAnalysis | null;
  setResult: (val: JobMatchAnalysis | null) => void;
}

export default function JobMatcher({
  jobDescription,
  setJobDescription,
  result,
  setResult
}: JobMatcherProps) {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleMatch = () => {
    if (!jobDescription.trim()) {
      alert('Please paste the target job description to match.');
      return;
    }

    setLoading(true);
    resumeApi.analyzeJob(jobDescription)
      .then(res => {
        setResult(res);
      })
      .catch(err => {
        console.error(err);
        alert('Job matching analysis failed.');
      })
      .finally(() => setLoading(false));
  };

  const handleNavigateToTailor = () => {
    navigate('/tailor');
  };

  return (
    <div>
      <header style={{ marginBottom: '2rem' }}>
        <h1>Job Matcher</h1>
        <p>Paste any job description to evaluate your resume compatibility, scan missing skills, and calculate educational or experience alignment.</p>
      </header>

      {!result ? (
        <Card title="Analyze Job Compatibility" subtitle="Enter the job description details below">
          <div className="form-group">
            <textarea
              value={jobDescription}
              onChange={e => setJobDescription(e.target.value)}
              placeholder="Paste the complete job description from LinkedIn, Indeed, or company pages here..."
              className="form-input form-textarea"
              style={{ height: '350px' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button
              onClick={handleMatch}
              className="btn btn-primary"
              disabled={loading || !jobDescription}
              style={{ width: '100%', height: '44px' }}
            >
              {loading ? 'Evaluating Match Compatibility...' : 'Scan Job Description'}
            </button>
          </div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Top Score Summary Banner */}
          <div style={{
            display: 'flex',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '1.5rem',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{
                width: '76px',
                height: '76px',
                borderRadius: '50%',
                backgroundColor: result.matchScore >= 80 ? 'var(--success-light)' : 'var(--warning-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: result.matchScore >= 80 ? 'var(--success)' : 'var(--warning)',
                fontSize: '1.5rem',
                fontWeight: 800,
                border: `3px solid ${result.matchScore >= 80 ? 'var(--success)' : 'var(--warning)'}`
              }}>
                {result.matchScore}%
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {result.matchScore >= 80 ? 'Good Match Core Compatibility' : 'Partial Keyword Match'}
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Salary Estimate: {result.jobInsights?.salaryEstimate || 'N/A'} • Role Level: {result.jobInsights?.roleLevel || 'N/A'}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => setResult(null)} className="btn btn-secondary">
                Scan Another Job
              </button>
              
              <button onClick={handleNavigateToTailor} className="btn btn-primary" style={{ gap: '0.375rem' }}>
                <span>Tailor Resume</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>

          <div className="grid-2">
            {/* Required and Missing Skills list */}
            <Card title="Skills Compatibility Breakdown" subtitle="Scanned skill requirements matching your resume keywords">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxHeight: '350px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                <div>
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--success)', marginBottom: '0.75rem' }}>
                    <CheckCircle2 size={16} />
                    <span>Skills Matched ({result.requiredSkills.filter(s => !result.missingSkills.includes(s)).length})</span>
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {result.requiredSkills
                      .filter(s => !result.missingSkills.includes(s))
                      .map((skill, idx) => (
                        <span key={idx} className="badge badge-success" style={{ fontSize: '0.75rem' }}>
                          {skill}
                        </span>
                      ))}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--danger)', marginBottom: '0.75rem' }}>
                    <AlertCircle size={16} />
                    <span>Skills Missing ({result.missingSkills.length})</span>
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {result.missingSkills.map((skill, idx) => (
                      <span key={idx} className="badge badge-danger" style={{ fontSize: '0.75rem' }}>
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* Resume optimization suggestion summaries */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <Card title="Role Compatibility Metrics">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                    <div>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600, display: 'block', color: 'var(--text-primary)' }}>Experience Requirements</span>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>Req: {result.experienceMatch.required}</p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{result.experienceMatch.feedback}</p>
                    </div>
                    <span className="badge badge-warning" style={{ fontSize: '0.7rem', flexShrink: 0 }}>
                      {result.experienceMatch.status}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                    <div>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600, display: 'block', color: 'var(--text-primary)' }}>Educational Profile</span>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>Req: {result.educationMatch.required}</p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{result.educationMatch.feedback}</p>
                    </div>
                    <span className="badge badge-success" style={{ fontSize: '0.7rem', flexShrink: 0 }}>
                      {result.educationMatch.status}
                    </span>
                  </div>
                </div>
              </Card>

              <Card title="Copilot Match Summary">
                <div style={{ display: 'flex', gap: '0.75rem', backgroundColor: 'var(--bg-app)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <HelpCircle size={18} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: '2px' }} />
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', lineHeight: '1.5' }}>
                    {result.recommendationSummary}
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
