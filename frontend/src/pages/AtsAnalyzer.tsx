import { useState, useEffect } from 'react';
import { atsApi, resumeApi, AtsAnalysisResult, jobApi, trackerApi, JobDescriptionRecord, ApplicationCard } from '../api';
import {
  Sparkles,
  FileCheck,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Plus,
  ArrowRight,
  RefreshCw,
  FileText,
  Search,
  Check,
  Copy,
  ChevronRight,
  AlertCircle,
  X
} from 'lucide-react';
import Card from '../components/Card';
import MetricBar from '../components/MetricBar';

interface AtsAnalyzerProps {
  resumeText: string;
  setResumeText: (val: string) => void;
  jobDescription: string;
  setJobDescription: (val: string) => void;
  result: AtsAnalysisResult | null;
  setResult: (val: AtsAnalysisResult | null) => void;
  refreshUser?: () => void;
}

export default function AtsAnalyzer({
  resumeText,
  setResumeText,
  jobDescription,
  setJobDescription,
  result,
  setResult,
  refreshUser
}: AtsAnalyzerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fetchingLatest, setFetchingLatest] = useState(false);
  const [parsingFile, setParsingFile] = useState(false);

  // State to track copied bullet point feedback indexes
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // States for adding to Application Tracker
  const [jobs, setJobs] = useState<JobDescriptionRecord[]>([]);
  const [isTrackerModalOpen, setIsTrackerModalOpen] = useState(false);
  const [trackerSuccessMessage, setTrackerSuccessMessage] = useState('');
  const [trackerFormData, setTrackerFormData] = useState<Partial<ApplicationCard>>({
    jobId: null,
    candidateName: '',
    candidateEmail: '',
    candidatePhone: '',
    company: '',
    role: '',
    salary: '',
    status: 'APPLIED',
    deadline: '',
    applicationDate: new Date().toISOString().split('T')[0],
    interviewDate: '',
    notes: ''
  });

  const fetchJobs = () => {
    jobApi.list()
      .then(res => setJobs(res))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const openAddToTracker = () => {
    if (!result) return;

    // Fetch latest jobs list to ensure it's up to date
    jobApi.list()
      .then(res => {
        setJobs(res);
      })
      .catch(err => console.error(err));

    // Pre-fill details from parsed result candidateDetails & jobDetails
    // General Tracker Board is selected initially, so company and role are empty by default
    setTrackerFormData({
      jobId: null,
      candidateName: result.candidateDetails?.candidateName || '',
      candidateEmail: result.candidateDetails?.candidateEmail || '',
      candidatePhone: result.candidateDetails?.candidatePhone || '',
      company: '',
      role: '',
      salary: '',
      status: 'APPLIED',
      deadline: '',
      applicationDate: new Date().toISOString().split('T')[0],
      interviewDate: '',
      notes: `[ATS Match Score: ${result.overallScore}%]\n`
    });
    setTrackerSuccessMessage('');
    setIsTrackerModalOpen(true);
  };

  const handleJobBoardChange = (jobIdVal: string) => {
    const isGeneral = jobIdVal === 'general';
    const selectedJob = isGeneral ? null : jobs.find(j => j.id === jobIdVal);

    setTrackerFormData(prev => ({
      ...prev,
      jobId: selectedJob ? selectedJob.id : null,
      company: selectedJob ? selectedJob.company : '',
      role: selectedJob ? selectedJob.title : ''
    }));
  };

  const handleTrackerSave = (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSave = {
      ...trackerFormData,
      deadline: trackerFormData.deadline || null,
      interviewDate: trackerFormData.interviewDate || null
    };

    trackerApi.create(dataToSave)
      .then(() => {
        setTrackerSuccessMessage('Candidate successfully added to tracking board!');
        setTimeout(() => {
          setIsTrackerModalOpen(false);
          setTrackerSuccessMessage('');
        }, 2000);
      })
      .catch(err => {
        console.error(err);
        alert('Failed to add candidate to tracker.');
      });
  };

  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setResumeText(selected.name); // set placeholder name
      setError('');
    }
  };

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!file && !resumeText.trim()) || !jobDescription.trim()) {
      setError('Please provide both your resume and target job description.');
      return;
    }

    setLoading(true);
    setError('');

    const payload = file || resumeText;
    atsApi.analyzeCustom(payload, jobDescription)
      .then(res => {
        setResult(res);
        if (refreshUser) refreshUser();
      })
      .catch(err => {
        setError(err.message || 'ATS analysis failed.');
      })
      .finally(() => setLoading(false));
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
      })
      .catch(err => console.error('Could not copy text: ', err));
  };



  return (
    <div>
      <header style={{ marginBottom: '2rem' }}>
        <h1>Custom ATS Score Analyzer</h1>
        <p>Audit compliance and check keyword matrices against specific job descriptions before sending.</p>
      </header>

      {error && (
        <div className="badge badge-danger" style={{ display: 'block', padding: '1rem', width: '100%', marginBottom: '1.5rem', borderRadius: 'var(--radius-sm)' }}>
          {error}
        </div>
      )}

      {!result ? (
        <form onSubmit={handleAnalyze}>
          <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
            {/* Input Resume */}
            <Card title="Candidate Resume content" subtitle="Provide the resume text or select a document file to scan">
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Upload Resume File (.pdf, .docx)</label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="file"
                    accept=".pdf,.docx"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                    id="ats-file-upload"
                  />
                  <button
                    type="button"
                    onClick={() => document.getElementById('ats-file-upload')?.click()}
                    className="btn btn-secondary"
                    style={{ flexGrow: 1, height: '40px', gap: '0.5rem', justifyContent: 'center' }}
                    disabled={parsingFile}
                  >
                    {parsingFile ? (
                      <>
                        <span className="spin-animation" style={{ display: 'inline-block' }}>⚙️</span>
                        <span>Parsing Document...</span>
                      </>
                    ) : (
                      <>
                        <FileText size={16} />
                        <span>Choose Resume File</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="form-group">
                {file ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    gap: '1rem',
                    padding: '1.5rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-app)',
                    height: '300px'
                  }}>
                    <FileText size={48} style={{ color: 'var(--accent)' }} />
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', display: 'block', wordBreak: 'break-all' }}>{file.name}</span>
                      <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Binary Document Ready for Evaluation</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFile(null);
                        setResumeText('');
                      }}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem' }}
                    >
                      Remove File
                    </button>
                  </div>
                ) : (
                  <textarea
                    value={resumeText}
                    onChange={e => setResumeText(e.target.value)}
                    placeholder="Paste resume content here..."
                    className="form-input form-textarea"
                    style={{ height: '300px', resize: 'none' }}
                  />
                )}
              </div>
            </Card>

            {/* Input Job Description */}
            <Card title="Target Job Description" subtitle="Paste the target application requirements to match keywords">
              <div className="form-group">
                <textarea
                  value={jobDescription}
                  onChange={e => setJobDescription(e.target.value)}
                  placeholder="Paste job description details here..."
                  className="form-input form-textarea"
                  style={{ height: '372px', resize: 'none' }}
                />
              </div>
            </Card>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              className="btn btn-primary animate-pulse"
              disabled={loading || !resumeText.trim() || !jobDescription.trim()}
              style={{ height: '44px', gap: '0.5rem' }}
            >
              {loading ? (
                <>
                  <span className="spin-animation" style={{ display: 'inline-block' }}>⚙️</span>
                  <span>Performing ATS Scan...</span>
                </>
              ) : (
                <>
                  <Search size={16} />
                  <span>Analyze Compatibility Score</span>
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          {/* Section 1: Main Score and Controls */}
          <div className="grid-2" style={{ alignItems: 'stretch' }}>
            {/* Overall Score Ring */}
            <Card style={{ padding: '2rem 1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', width: '100%' }}>
                <div style={{ position: 'relative', width: '110px', height: '110px', marginBottom: '0.75rem' }}>
                  <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%' }}>
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="var(--border)"
                      strokeWidth="3"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke={result.overallScore >= 80 ? 'var(--success)' : result.overallScore >= 60 ? 'var(--warning)' : 'var(--danger)'}
                      strokeDasharray={`${result.overallScore}, 100`}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    fontSize: '1.75rem',
                    fontWeight: 800,
                    color: 'var(--text-primary)'
                  }}>
                    {result.overallScore}%
                  </div>
                </div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Application Match Score</h4>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.25rem', lineHeight: '1.3' }}>
                  This score estimates relative resume-to-job-description alignment; it is not a hiring probability.
                </p>
                <div style={{ width: '100%', marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <button
                    onClick={openAddToTracker}
                    className="btn btn-primary"
                    style={{ width: '100%', height: '38px', gap: '0.5rem', justifyContent: 'center', fontSize: '0.85rem', background: 'linear-gradient(135deg, var(--accent) 0%, #6366f1 100%)' }}
                  >
                    <Plus size={14} />
                    <span>Add to Tracker</span>
                  </button>
                  <button
                    onClick={() => setResult(null)}
                    className="btn btn-secondary"
                    style={{ width: '100%', height: '34px', gap: '0.5rem', justifyContent: 'center', fontSize: '0.8rem' }}
                  >
                    <RefreshCw size={14} />
                    <span>Run New ATS Evaluation</span>
                  </button>
                  <button
                    onClick={() => {
                      setResult(null);
                      setResumeText('');
                      setJobDescription('');
                      setFile(null);
                    }}
                    className="btn btn-secondary"
                    style={{ width: '100%', height: '34px', fontSize: '0.8rem', justifyContent: 'center' }}
                  >
                    Clear All Fields
                  </button>
                </div>
              </div>
            </Card>

            {/* Application Matching Matrix */}
            <Card title="Application Matching Matrix" subtitle="Separated scoring dimensions mapping layout compliance and relative skill alignments">
              <div style={{ overflowX: 'auto', width: '100%' }}>
                <table style={{ width: '100%', minWidth: '480px', borderCollapse: 'collapse', marginTop: '0.25rem', fontSize: '0.78rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                      <th style={{ padding: '0.35rem 0.25rem', color: 'var(--text-secondary)' }}>Metric</th>
                      <th style={{ padding: '0.35rem 0.25rem', color: 'var(--text-secondary)' }}>What it measures</th>
                      <th style={{ padding: '0.35rem 0.25rem', textAlign: 'right', color: 'var(--text-secondary)' }}>Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.45rem 0.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>ATS-friendly Formatting (Heuristics)</td>
                      <td style={{ padding: '0.45rem 0.25rem', color: 'var(--text-secondary)' }}>Heuristic checks for headings, standard date formats, columns structure, and graphics</td>
                      <td style={{ padding: '0.45rem 0.25rem', textAlign: 'right', fontWeight: 700, color: 'var(--accent)' }}>
                        {result.atsCompatibility ?? 80}/100
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.45rem 0.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>Job Match Score</td>
                      <td style={{ padding: '0.45rem 0.25rem', color: 'var(--text-secondary)' }}>Relative checks for skills, experience, education, projects vs. target JD</td>
                      <td style={{ padding: '0.45rem 0.25rem', textAlign: 'right', fontWeight: 700, color: 'var(--accent)' }}>
                        {result.jobMatchScore ?? 64}/100
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.45rem 0.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>Resume Quality</td>
                      <td style={{ padding: '0.45rem 0.25rem', color: 'var(--text-secondary)' }}>Action verbs, quantitative metrics, clarity, achievements</td>
                      <td style={{ padding: '0.45rem 0.25rem', textAlign: 'right', fontWeight: 700, color: 'var(--accent)' }}>
                        {result.resumeQuality ?? 58}/100
                      </td>
                    </tr>
                    <tr style={{ fontWeight: 700, backgroundColor: 'var(--bg-app)' }}>
                      <td style={{ padding: '0.5rem 0.25rem', color: 'var(--text-primary)' }}>Application Match</td>
                      <td style={{ padding: '0.5rem 0.25rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>Weighted combo (30% Formatting + 50% Match + 20% Quality)</td>
                      <td style={{ padding: '0.5rem 0.25rem', textAlign: 'right', color: 'var(--success)' }}>
                        {result.overallScore}/100
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Section 2: Section-Wise Scores Breakdown */}
          <Card title="Section-Wise Weighted Scores Breakdown" subtitle="CareerOS Application Match Score — based on configurable resume-quality and job-alignment criteria.">
            <div style={{ padding: '0.75rem 1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-card)', marginBottom: '1.25rem', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Calculation Formula:</span>
              <code style={{ color: 'var(--accent)', fontWeight: 700, fontFamily: 'monospace' }}>
                Application Match = (Formatting × 30%) + (Keyword Match × 30%) + (Experience × 20%) + (Projects × 10%) + (Education × 5%) + (Soft Skills × 5%)
              </code>
            </div>
            <div className="grid-3" style={{ gap: '1.25rem', marginTop: '0.5rem' }}>
              <div style={{ padding: '0.85rem 1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-app)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>ATS Formatting</span>
                  <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>30% Weight</span>
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>{result.subScores.formatting}%</div>
              </div>

              <div style={{ padding: '0.85rem 1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-app)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Keyword Match</span>
                  <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>30% Weight</span>
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>{result.subScores.keywordMatch}%</div>
              </div>

              <div style={{ padding: '0.85rem 1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-app)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Experience Match</span>
                  <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>20% Weight</span>
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>{result.subScores.experienceMatch}%</div>
              </div>

              <div style={{ padding: '0.85rem 1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-app)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Projects Optimization</span>
                  <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>10% Weight</span>
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>{result.subScores.projects}%</div>
              </div>

              <div style={{ padding: '0.85rem 1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-app)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Education Alignment</span>
                  <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>5% Weight</span>
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>{result.subScores.education}%</div>
              </div>

              <div style={{ padding: '0.85rem 1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-app)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Soft Skills</span>
                  <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>5% Weight</span>
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>{result.subScores.softSkills}%</div>
              </div>
            </div>
          </Card>



          {/* Section: Matched vs Missing Skills Summary */}
          <div className="grid-2" style={{ gap: '1.5rem', marginBottom: '1.5rem' }}>
            <Card title="Skills Found in Resume & JD" subtitle="Matches successfully identified by parser checks">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                {(() => {
                  const matched = result.keywordDensity.filter(row => row.countInResume > 0);
                  if (matched.length === 0) {
                    return <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No matching keywords identified.</span>;
                  }
                  return matched.map((row, idx) => (
                    <span key={idx} className="badge badge-success" style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem', borderRadius: '20px' }}>
                      {row.keyword} ({row.countInResume}x)
                    </span>
                  ));
                })()}
              </div>
            </Card>

            <Card title="Skills Missing from Resume" subtitle="Keywords required in JD but absent from your resume text">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                {(() => {
                  const missing = result.keywordDensity.filter(row => row.countInResume === 0);
                  if (missing.length === 0) {
                    return <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>All keywords are fully matched! Great job.</span>;
                  }
                  return missing.map((row, idx) => (
                    <span key={idx} className="badge badge-danger" style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem', borderRadius: '20px' }}>
                      {row.keyword} (JD: {row.countInJd}x)
                    </span>
                  ));
                })()}
              </div>
            </Card>
          </div>

          {/* Section 4: Keyword Density Matrix */}
          <Card title="Keyword Density Gap Matrix" subtitle="Detailed frequency metrics from job description versus your resume">
            <div style={{ maxHeight: '350px', overflowY: 'auto', overflowX: 'auto', marginTop: '0.5rem', paddingRight: '0.25rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)', paddingBottom: '0.5rem' }}>
                    <th style={{ padding: '0.75rem' }}>Keyword</th>
                    <th style={{ padding: '0.75rem' }}>JD Count</th>
                    <th style={{ padding: '0.75rem' }}>Resume Count</th>
                    <th style={{ padding: '0.75rem' }}>Importance</th>
                    <th style={{ padding: '0.75rem' }}>Explanation & Gap Fix</th>
                  </tr>
                </thead>
                <tbody>
                  {result.keywordDensity.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border)', backgroundColor: idx % 2 === 0 ? 'transparent' : 'var(--bg-app)' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>{row.keyword}</td>
                      <td style={{ padding: '0.75rem' }}>{row.countInJd}x</td>
                      <td style={{ padding: '0.75rem', color: row.countInResume > 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                        {row.countInResume}x
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <span className={`badge ${row.importance === 'CRITICAL' ? 'badge-danger' : row.importance === 'HIGH' ? 'badge-warning' : row.importance === 'MEDIUM' ? 'badge-primary' : 'badge-secondary'}`} style={{ fontSize: '0.65rem' }}>
                          {row.importance}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{row.explanation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Section 5: Copy-Pasteable Suggested Resume Bullets */}
          {result.tailoredBulletPoints.length > 0 && (
            <Card title="AI-Tailored Copy-Pasteable Resume Bullets" subtitle="Directly incorporate these context-appropriate keywords and metrics suggestions">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '0.5rem', maxHeight: '350px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                {result.tailoredBulletPoints.map((bullet, idx) => (
                  <div key={idx} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '1rem', backgroundColor: 'var(--bg-app)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase' }}>
                        {bullet.section} Section • Context: "{bullet.originalContext}"
                      </span>
                      <button
                        onClick={() => copyToClipboard(bullet.suggestedBullet, idx)}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', height: '24px', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                      >
                        {copiedIndex === idx ? (
                          <>
                            <Check size={12} style={{ color: 'var(--success)' }} />
                            <span style={{ color: 'var(--success)' }}>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={12} />
                            <span>Copy Bullet</span>
                          </>
                        )}
                      </button>
                    </div>
                    <pre style={{
                      margin: 0,
                      padding: '0.75rem',
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-xs)',
                      fontFamily: 'inherit',
                      fontSize: '0.825rem',
                      color: 'var(--text-primary)',
                      whiteSpace: 'pre-wrap',
                      lineHeight: '1.5'
                    }}>
                      {bullet.suggestedBullet}
                    </pre>
                  </div>
                ))}
              </div>
            </Card>
          )}



        </div>
      )}

      {/* Modal Dialog Form Overlay for Adding Candidate to Application Tracker */}
      {isTrackerModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>🚀 Add to Application Tracker</h3>
              <button onClick={() => setIsTrackerModalOpen(false)} className="close-btn"><X size={18} /></button>
            </div>

            {trackerSuccessMessage ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem', gap: '1rem', color: 'var(--success)' }}>
                <CheckCircle size={48} />
                <p style={{ fontWeight: 600, fontSize: '1rem', textAlign: 'center' }}>{trackerSuccessMessage}</p>
              </div>
            ) : (
              <form onSubmit={handleTrackerSave}>
                {/* ATS Match Score Indicator Banner */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  backgroundColor: 'rgba(99, 102, 241, 0.1)',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: '1.25rem'
                }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Calculated ATS Score:</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Sparkles size={16} />
                    {result?.overallScore || 0}% Match
                  </span>
                </div>

                <div className="form-grid">
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Add to Target Job Board *</label>
                    <select
                      value={trackerFormData.jobId || 'general'}
                      onChange={e => handleJobBoardChange(e.target.value)}
                      className="form-input"
                      required
                    >
                      <option value="general">📁 General Tracker Board</option>
                      {jobs.map(j => (
                        <option key={j.id} value={j.id}>💼 {j.company} - {j.title}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Applicant Name *</label>
                    <input
                      type="text"
                      required
                      value={trackerFormData.candidateName || ''}
                      onChange={e => setTrackerFormData({ ...trackerFormData, candidateName: e.target.value })}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Applicant Email</label>
                    <input
                      type="email"
                      value={trackerFormData.candidateEmail || ''}
                      onChange={e => setTrackerFormData({ ...trackerFormData, candidateEmail: e.target.value })}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Applicant Phone</label>
                    <input
                      type="text"
                      value={trackerFormData.candidatePhone || ''}
                      onChange={e => setTrackerFormData({ ...trackerFormData, candidatePhone: e.target.value })}
                      className="form-input"
                      placeholder="e.g. +91 8793435992"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Company Name *</label>
                    <input
                      type="text"
                      required
                      value={trackerFormData.company || ''}
                      onChange={e => setTrackerFormData({ ...trackerFormData, company: e.target.value })}
                      className="form-input"
                      placeholder="e.g. Stripe"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Job Title / Role *</label>
                    <input
                      type="text"
                      required
                      value={trackerFormData.role || ''}
                      onChange={e => setTrackerFormData({ ...trackerFormData, role: e.target.value })}
                      className="form-input"
                      placeholder="e.g. Frontend Developer"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Salary Expectation</label>
                    <input
                      type="text"
                      value={trackerFormData.salary || ''}
                      onChange={e => setTrackerFormData({ ...trackerFormData, salary: e.target.value })}
                      className="form-input"
                      placeholder="e.g. $120k/yr"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Recruitment Status</label>
                    <select
                      value={trackerFormData.status || 'APPLIED'}
                      onChange={e => setTrackerFormData({ ...trackerFormData, status: e.target.value as ApplicationCard['status'] })}
                      className="form-input"
                    >
                      <option value="APPLIED">Applied</option>
                      <option value="ASSESSMENT">Assessment</option>
                      <option value="INTERVIEW">Interview</option>
                      <option value="OFFER">Offer</option>
                      <option value="REJECTED">Rejected</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Application Date</label>
                    <input
                      type="date"
                      value={trackerFormData.applicationDate || ''}
                      onChange={e => setTrackerFormData({ ...trackerFormData, applicationDate: e.target.value })}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Response Deadline</label>
                    <input
                      type="date"
                      value={trackerFormData.deadline || ''}
                      onChange={e => setTrackerFormData({ ...trackerFormData, deadline: e.target.value })}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Interview Date</label>
                    <input
                      type="date"
                      value={trackerFormData.interviewDate || ''}
                      onChange={e => setTrackerFormData({ ...trackerFormData, interviewDate: e.target.value })}
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label className="form-label">Internal Recruiter Notes</label>
                  <textarea
                    value={trackerFormData.notes || ''}
                    onChange={e => setTrackerFormData({ ...trackerFormData, notes: e.target.value })}
                    className="form-input form-textarea"
                    placeholder="Paste candidate background details, feedback, or follow-up timelines..."
                    style={{ height: '80px' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                  <button type="button" onClick={() => setIsTrackerModalOpen(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Add Applicant
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          backdrop-filter: blur(4px);
        }
        .modal-content {
          background-color: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          width: 90%;
          max-width: 600px;
          padding: 1.5rem;
          box-shadow: var(--shadow-lg);
          max-height: 90vh;
          overflow-y: auto;
          text-align: left;
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          border-bottom: 1px solid var(--border);
          padding-bottom: 0.75rem;
        }
        .close-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
        }
        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }
        @media (max-width: 640px) {
          .form-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
