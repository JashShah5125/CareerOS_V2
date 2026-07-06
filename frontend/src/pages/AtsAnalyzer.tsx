import { useState, useEffect } from 'react';
import { atsApi, resumeApi, AtsAnalysisResult } from '../api';
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
  AlertCircle
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
}

export default function AtsAnalyzer({
  resumeText,
  setResumeText,
  jobDescription,
  setJobDescription,
  result,
  setResult
}: AtsAnalyzerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fetchingLatest, setFetchingLatest] = useState(false);
  const [parsingFile, setParsingFile] = useState(false);
  
  // State to track copied bullet point feedback indexes
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setParsingFile(true);
      setError('');
      
      atsApi.parseFile(file)
        .then(res => {
          setResumeText(res.text);
        })
        .catch(err => {
          setError(err.message || 'Failed to extract text from file.');
        })
        .finally(() => setParsingFile(false));
    }
  };

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resumeText.trim() || !jobDescription.trim()) {
      setError('Please provide both your resume text and target job description.');
      return;
    }

    setLoading(true);
    setError('');
    atsApi.analyzeCustom(resumeText, jobDescription)
      .then(res => {
        setResult(res);
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

  const checkItem = (passed: boolean, label: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
      <span className={`badge ${passed ? 'badge-success' : 'badge-danger'}`} style={{ padding: '0.25rem' }}>
        {passed ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
      </span>
      <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{label}</span>
    </div>
  );

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
                <textarea
                  value={resumeText}
                  onChange={e => setResumeText(e.target.value)}
                  placeholder="Paste resume content here..."
                  className="form-input form-textarea"
                  style={{ height: '300px' }}
                />
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
                  style={{ height: '372px' }}
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
          <div className="grid-3" style={{ alignItems: 'stretch' }}>
            {/* Overall Score Ring */}
            <Card style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem 1.5rem' }}>
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
              <h4 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Overall ATS Score</h4>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Weighted algorithm calculation</p>
            </Card>

            {/* Resume Strength Meter */}
            <Card title="Resume Strength Meter" subtitle="Key parsing compliance indexes">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginTop: '0.5rem' }}>
                <MetricBar label="ATS Parsing Readability" value={result.strengthMetrics.atsParsing} colorType="accent" />
                <MetricBar label="Technical Skill Density" value={result.strengthMetrics.technicalSkills} colorType="dynamic" />
                <MetricBar label="Projects Optimization" value={result.strengthMetrics.projects} colorType="accent" />
                <MetricBar label="Experience Mappings" value={result.strengthMetrics.experience} colorType="dynamic" />
                <MetricBar label="Quantified Results / Metrics" value={result.strengthMetrics.quantifiedResults} colorType="accent" />
              </div>
            </Card>

            {/* Action panel controls */}
            <Card style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <button
                onClick={() => setResult(null)}
                className="btn btn-primary"
                style={{ width: '100%', height: '44px', gap: '0.5rem', justifyContent: 'center' }}
              >
                <RefreshCw size={16} />
                <span>Run New ATS Evaluation</span>
              </button>
              <button
                onClick={() => {
                  setResult(null);
                  setResumeText('');
                  setJobDescription('');
                }}
                className="btn btn-secondary"
                style={{ width: '100%', marginTop: '0.5rem', height: '36px', fontSize: '0.8rem', justifyContent: 'center' }}
              >
                Clear All Fields
              </button>
            </Card>
          </div>

          {/* Section 2: Section-Wise Scores Breakdown */}
          <Card title="Section-Wise Weighted Scores Breakdown" subtitle="Scoring weights mapped to recruiters evaluation methods">
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

          {/* Section 3: Score Deductions Ledger & Structural Checks */}
          <div className="grid-2">
            {/* Deductions Ledger */}
            <Card title="Score Accounting Ledger" subtitle="Positive contributions and score deductions explained">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem', maxHeight: '380px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                {result.scoreDeductions.map((ded, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-card)' }}>
                    <div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{ded.factor}</span>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>{ded.description}</p>
                    </div>
                    <span className={`badge ${ded.points >= 0 ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.8rem', fontWeight: 700, padding: '0.35rem 0.65rem', minWidth: '48px', textAlign: 'center' }}>
                      {ded.points >= 0 ? `+${ded.points}` : ded.points}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Structure compliance */}
            <Card title="Structure Compliance Checks" subtitle="Verify document layout complies with parser expectations">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                {checkItem(result.complianceChecklist.hasContactInfo, 'Contact Details Identified')}
                {checkItem(result.complianceChecklist.hasAddress, 'Postal Address / Location Identified')}
                {checkItem(result.complianceChecklist.hasSummarySection, 'Professional Summary / Objective Found')}
                {checkItem(result.complianceChecklist.isSingleColumn, 'Clean Single-Column Layout')}
                {checkItem(result.complianceChecklist.hasWorkHistory, 'Professional Experience Segment')}
                {checkItem(result.complianceChecklist.friendlyHeadings, 'ATS-Friendly Standard Headings')}
                {checkItem(result.complianceChecklist.standardDateFormats, 'Standard Date Formats (MM/YYYY)')}
                {checkItem(result.complianceChecklist.hasSkillsSection, 'Skills & Competencies Header')}
                {checkItem(result.complianceChecklist.jobTitleMentioned, 'Target Job Title Mentioned')}
                {checkItem(result.complianceChecklist.quantifiedAchievements, 'Quantified / Measurable Achievements')}
                {checkItem(result.complianceChecklist.noGraphics, 'Free of Graphics / Textbox Tables')}
                {checkItem(result.complianceChecklist.idealWordCount, 'Ideal Resume Length (>200 words)')}
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

          {/* Section 6: Additional red flags and guidelines */}
          <div className="grid-2">
            {result.redFlags.length > 0 && (
              <Card title="ATS Red Flags" subtitle="Warnings that may cause reading issues for parsers" style={{ border: '1px solid var(--danger-light)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {result.redFlags.map((flag, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', fontSize: '0.8rem', color: 'var(--danger)' }}>
                      <span style={{ fontSize: '1rem', lineHeight: '1' }}>⚠️</span>
                      <span>{flag}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <Card title="Improvement Recommendations" subtitle="Actions to take to improve call-back compatibility scores">
              <ul style={{ paddingLeft: '1.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                {result.improvementSuggestions.map((sug, idx) => (
                  <li key={idx}>{sug}</li>
                ))}
              </ul>
            </Card>
          </div>
          
        </div>
      )}
    </div>
  );
}
