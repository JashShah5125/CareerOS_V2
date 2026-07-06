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
          <div className="grid-3">
            <Card style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '2rem 1.5rem' }}>
              <span className="metric-title" style={{ marginBottom: '1rem' }}>Overall Resume Score</span>
              <div style={{
                position: 'relative',
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                border: '8px solid var(--border)',
                borderTopColor: 'var(--success)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem'
              }}>
                <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--success)' }}>{analysis.score || 0}</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Ranked top 15% for modern SaaS developer roles</p>
            </Card>

            <Card style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '2rem 1.5rem' }}>
              <span className="metric-title" style={{ marginBottom: '1rem' }}>ATS Parser Score</span>
              <div style={{
                position: 'relative',
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                border: '8px solid var(--border)',
                borderTopColor: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem'
              }}>
                <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent)' }}>{analysis.atsScore || 0}</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Standard parse compatibility metrics met</p>
            </Card>

            {/* Sub-criteria Scores */}
            <Card title="Structural Diagnostics">
              <MetricBar label="Formatting & Layout" value={analysis.formattingAnalysis?.score || 0} />
              <MetricBar label="Grammar & Spellcheck" value={analysis.grammarAnalysis?.score || 0} />
              <MetricBar label="Project Descriptions" value={analysis.projectAnalysis?.score || 0} />
              <MetricBar label="Work Experience Depth" value={analysis.experienceAnalysis?.score || 0} />
              <MetricBar label="Achievement Metrics" value={analysis.achievementAnalysis?.score || 0} />
            </Card>
          </div>

          <div className="grid-2">
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

            {/* Recommendations */}
            <Card title="Actionable Improvement Steps">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {(analysis.suggestions || []).map((sug, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      gap: '0.75rem',
                      padding: '1rem',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--bg-app)',
                      border: '1px solid var(--border)'
                    }}
                  >
                    <Lightbulb size={18} style={{ color: 'var(--warning)', flexShrink: 0, marginTop: '2px' }} />
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: '1.4' }}>{sug}</span>
                  </div>
                ))}
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
