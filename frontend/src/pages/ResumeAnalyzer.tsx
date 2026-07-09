import { useState } from 'react';
import { resumeApi, ResumeAnalysis } from '../api';
import { Upload, FileText, CheckCircle2, AlertTriangle, Lightbulb, ChevronRight, RefreshCw } from 'lucide-react';
import Card from '../components/Card';
import MetricBar from '../components/MetricBar';

export default function ResumeAnalyzer() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (selectedFile: File) => {
    const validExtensions = ['.pdf', '.docx'];
    const extension = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();
    
    if (!validExtensions.includes(extension)) {
      alert('Please upload a PDF or DOCX file.');
      return;
    }

    setFile(selectedFile);
    triggerAnalysis(selectedFile);
  };

  const triggerAnalysis = (fileObj: File) => {
    setLoading(true);
    resumeApi.analyze(fileObj)
      .then(res => setAnalysis(res))
      .catch(err => {
        console.error(err);
        alert('Resume analysis failed.');
      })
      .finally(() => setLoading(false));
  };

  const resetAnalyzer = () => {
    setFile(null);
    setAnalysis(null);
  };

  return (
    <div>
      <header style={{ marginBottom: '2rem' }}>
        <h1>Resume Analyzer</h1>
        <p>Upload your resume to receive immediate scoring, formatting optimization and keyword diagnostics.</p>
      </header>

      {!analysis ? (
        <Card style={{ padding: '3rem 2rem' }}>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-lg)',
              padding: '4rem 2rem',
              textAlign: 'center',
              cursor: 'pointer',
              backgroundColor: dragOver ? 'var(--accent-light)' : 'transparent',
              transition: 'all 0.15s ease'
            }}
            onClick={() => document.getElementById('file-upload-input')?.click()}
          >
            <input
              type="file"
              id="file-upload-input"
              style={{ display: 'none' }}
              onChange={handleFileChange}
              accept=".pdf,.docx"
            />
            
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                <RefreshCw size={48} className="spin-icon" style={{ color: 'var(--accent)' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Analyzing Resume Structure...</h3>
                <p style={{ maxWidth: '400px', fontSize: '0.875rem' }}>Our AI parsing engine is scanning formatting nodes, grammar structures, and target experience matches.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent)'
                }}>
                  <Upload size={32} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Upload your resume</h3>
                <p style={{ maxWidth: '400px', fontSize: '0.875rem' }}>Drag and drop your PDF or DOCX file here, or click to browse files from your computer.</p>
                <span className="badge badge-primary" style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
                  Supports up to 10MB
                </span>
              </div>
            )}
          </div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Active File Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'var(--bg-card)',
            padding: '1rem 1.5rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <FileText size={24} style={{ color: 'var(--accent)' }} />
              <div>
                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{file?.name || 'resume.pdf'}</span>
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Analysis Completed Successfully</span>
              </div>
            </div>
            <button onClick={resetAnalyzer} className="btn btn-secondary" style={{ display: 'inline-flex', gap: '0.375rem' }}>
              <RefreshCw size={14} />
              <span>Upload New</span>
            </button>
          </div>

          {/* Scores Overview Row */}
          {/* Scores Overview Row */}
          <div className="grid-2" style={{ alignItems: 'stretch', gap: '1.5rem' }}>
            {/* Left Column: Circular Progress Rings Stack */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', justifyContent: 'space-between' }}>
              <Card style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '2rem 1.5rem', height: '48%' }}>
                <span className="metric-title" style={{ marginBottom: '1rem' }}>Resume Quality Score</span>
                <div style={{ position: 'relative', width: '110px', height: '110px', marginBottom: '1rem' }}>
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
                      stroke={analysis.score >= 80 ? 'var(--success)' : analysis.score >= 60 ? 'var(--warning)' : 'var(--danger)'}
                      strokeDasharray={`${analysis.score || 0}, 100`}
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
                    color: analysis.score >= 80 ? 'var(--success)' : analysis.score >= 60 ? 'var(--warning)' : 'var(--danger)'
                  }}>
                    {analysis.score || 0}
                  </div>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.3' }}>
                  This score estimates relative resume alignment; it is not a hiring probability.
                </p>
              </Card>

              <Card style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '2rem 1.5rem', height: '48%' }}>
                <span className="metric-title" style={{ marginBottom: '1rem' }}>ATS-friendly Formatting (Heuristics)</span>
                <div style={{ position: 'relative', width: '110px', height: '110px', marginBottom: '1rem' }}>
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
                      stroke="var(--accent)"
                      strokeDasharray={`${analysis.atsScore || 0}, 100`}
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
                    color: 'var(--accent)'
                  }}>
                    {analysis.atsScore || 0}
                  </div>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.3' }}>
                  Heuristic checks for headings, standard dates, column structures, and graphics.
                </p>
              </Card>
            </div>

            {/* Right Column: Detailed Diagnostics */}
            <Card title="Structural Diagnostics" subtitle="Formula: (Structure × 40%) + (Verbs × 30%) + (Metrics × 30%)">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <MetricBar label="Formatting & Layout" value={analysis.formattingAnalysis?.score || 0} />
                  {analysis.formattingAnalysis?.details && (
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.25rem', paddingLeft: '0.25rem', lineHeight: '1.4' }}>
                      {analysis.formattingAnalysis.details}
                    </p>
                  )}
                  {analysis.formattingAnalysis?.issues && analysis.formattingAnalysis.issues.length > 0 && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--danger)', marginTop: '0.15rem', paddingLeft: '0.25rem', fontWeight: 500 }}>
                      ⚠️ {analysis.formattingAnalysis.issues.join(', ')}
                    </div>
                  )}
                </div>

                <div>
                  <MetricBar label="Grammar & Spellcheck" value={analysis.grammarAnalysis?.score || 0} />
                  {analysis.grammarAnalysis?.details && (
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.25rem', paddingLeft: '0.25rem', lineHeight: '1.4' }}>
                      {analysis.grammarAnalysis.details}
                    </p>
                  )}
                  {analysis.grammarAnalysis?.issues && analysis.grammarAnalysis.issues.length > 0 && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--danger)', marginTop: '0.15rem', paddingLeft: '0.25rem', fontWeight: 500 }}>
                      ⚠️ {analysis.grammarAnalysis.issues.join(', ')}
                    </div>
                  )}
                </div>

                <div>
                  <MetricBar 
                    label={
                      analysis.projectAnalysis?.rating === 'Sales' ? "Sales & Deal Pipelines" :
                      analysis.projectAnalysis?.rating === 'HR' ? "HR & Talent Programs" :
                      analysis.projectAnalysis?.rating === 'Marketing' ? "Campaigns & Lead Acquisition" :
                      analysis.projectAnalysis?.rating === 'Finance' ? "Financial & Analytical Modeling" :
                      analysis.projectAnalysis?.rating === 'Operations' ? "Operational Efficiency & ERP" :
                      analysis.projectAnalysis?.rating === 'Healthcare' ? "Clinical & Regulatory Compliance" :
                      analysis.projectAnalysis?.rating === 'Legal' ? "Legal & Compliance Auditing" :
                      analysis.projectAnalysis?.rating === 'General' ? "Professional & Core Competencies" :
                      "Project Descriptions"
                    } 
                    value={analysis.projectAnalysis?.score || 0} 
                  />
                  {analysis.projectAnalysis?.details && (
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.25rem', paddingLeft: '0.25rem', lineHeight: '1.4' }}>
                      {analysis.projectAnalysis.details}
                    </p>
                  )}
                  {analysis.projectAnalysis?.recommendations && analysis.projectAnalysis.recommendations.length > 0 && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--accent)', marginTop: '0.15rem', paddingLeft: '0.25rem' }}>
                      💡 {analysis.projectAnalysis.recommendations.join(' ')}
                    </div>
                  )}
                </div>

                <div>
                  <MetricBar label="Work Experience Depth" value={analysis.experienceAnalysis?.score || 0} />
                  {analysis.experienceAnalysis?.details && (
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.25rem', paddingLeft: '0.25rem', lineHeight: '1.4' }}>
                      {analysis.experienceAnalysis.details}
                    </p>
                  )}
                  {analysis.experienceAnalysis?.recommendations && analysis.experienceAnalysis.recommendations.length > 0 && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--accent)', marginTop: '0.15rem', paddingLeft: '0.25rem' }}>
                      💡 {analysis.experienceAnalysis.recommendations.join(' ')}
                    </div>
                  )}
                </div>

                <div>
                  <MetricBar label="Achievement Metrics" value={analysis.achievementAnalysis?.score || 0} />
                  {analysis.achievementAnalysis?.details && (
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.25rem', paddingLeft: '0.25rem', lineHeight: '1.4' }}>
                      {analysis.achievementAnalysis.details}
                    </p>
                  )}
                  {analysis.achievementAnalysis?.recommendations && analysis.achievementAnalysis.recommendations.length > 0 && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--accent)', marginTop: '0.15rem', paddingLeft: '0.25rem' }}>
                      💡 {analysis.achievementAnalysis.recommendations.join(' ')}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>

          <div style={{ marginTop: '0.5rem' }}>
            {/* Strengths & Weaknesses */}
            <Card title="Resume Strengths & Weaknesses">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--success)', fontWeight: 600, marginBottom: '0.75rem' }}>
                    <CheckCircle2 size={18} />
                    <span>Identified Strengths</span>
                  </h4>
                  <ul style={{ paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {(analysis.strengths || []).map((str, idx) => <li key={idx}>{str}</li>)}
                  </ul>
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--danger)', fontWeight: 600, marginBottom: '0.75rem' }}>
                    <AlertTriangle size={18} />
                    <span>Identified Weaknesses</span>
                  </h4>
                  <ul style={{ paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {(analysis.weaknesses || []).map((weak, idx) => <li key={idx}>{weak}</li>)}
                  </ul>
                </div>
              </div>
            </Card>
          </div>

          {/* Deep Breakdown Tabs / Accordions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h2 style={{ marginBottom: '0.5rem' }}>Deep Parsing Analysis</h2>
            
            <div className="grid-2">
              <Card title="Grammar & Spellcheck" subtitle={analysis.grammarAnalysis?.rating || 'Unrated'}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  {analysis.grammarAnalysis?.details || 'Grammar checked successfully.'}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {(analysis.grammarAnalysis?.issues || []).map((iss, i) => (
                    <span key={i} className="badge badge-warning" style={{ fontSize: '0.75rem', padding: '0.5rem' }}>{iss}</span>
                  ))}
                </div>
              </Card>

              <Card title="Formatting & ATS Parser Parsing" subtitle={analysis.formattingAnalysis?.rating || 'Unrated'}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  {analysis.formattingAnalysis?.details || 'Formatting checked successfully.'}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {(analysis.formattingAnalysis?.issues || []).map((iss, i) => (
                    <span key={i} className="badge badge-danger" style={{ fontSize: '0.75rem', padding: '0.5rem' }}>{iss}</span>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .spin-icon {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          100% { transform: rotate(300deg); }
        }
      `}</style>
    </div>
  );
}
