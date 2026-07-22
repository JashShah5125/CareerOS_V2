import { useState } from 'react';
import { resumeApi, CoverLetterResult } from '../api';
import { Sparkles, FileText, Download, Check, AlertCircle } from 'lucide-react';
import Card from './Card';
import Editor from './Editor';
import { jsPDF } from 'jspdf';

export default function CoverLetterGenerator() {
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CoverLetterResult | null>(null);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!company || !role) {
      showToast('Please fill out the Company and Role fields.', 'error');
      return;
    }

    setLoading(true);
    resumeApi.generateCoverLetter({ company, role, jobDescription })
      .then(res => {
        setResult(res);
        showToast('Cover letter generated successfully!', 'success');
      })
      .catch(err => {
        console.error(err);
        showToast('Cover letter generation failed.', 'error');
      })
      .finally(() => setLoading(false));
  };

  const handleDownload = (content: string) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    const margin = 20; // 20mm margins
    const pageHeight = doc.internal.pageSize.height; // 297mm
    const pageWidth = doc.internal.pageSize.width; // 210mm
    const maxLineWidth = pageWidth - margin * 2; // 170mm
    
    let cursorY = margin;
    const lines = content.split('\n');
    
    doc.setFont('Times', 'normal');
    doc.setFontSize(10.5);
    
    lines.forEach((rawLine, idx) => {
      const line = rawLine.trim();
      if (!line) {
        cursorY += 3; // blank line spacing
        return;
      }
      
      const isName = idx === 0 && line.length < 40 && !line.includes('@');
      
      if (cursorY + 6 > pageHeight - margin) {
        doc.addPage();
        cursorY = margin;
      }
      
      if (isName) {
        doc.setFont('Times', 'bold');
        doc.setFontSize(14);
        doc.text(line, margin, cursorY);
        cursorY += 6;
        doc.setFont('Times', 'normal');
        doc.setFontSize(10.5);
      } else {
        const wrappedLines = doc.splitTextToSize(line, maxLineWidth);
        wrappedLines.forEach((wLine: string) => {
          if (cursorY + 5.5 > pageHeight - margin) {
            doc.addPage();
            cursorY = margin;
          }
          doc.text(wLine, margin, cursorY);
          cursorY += 5.5;
        });
      }
    });
    
    const filename = 'Cover_Letter_' + company.replace(/\s+/g, '_') + '.pdf';
    doc.save(filename);
  };

  const handleSave = (content: string) => {
    if (result) {
      setResult({ ...result, content });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {!result ? (
        <Card title="AI Cover Letter Generator" subtitle="Instantly draft a personalized cover letter matching your profile and target job">
          <form onSubmit={handleGenerate}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Company Name *</label>
                <input
                  type="text"
                  required
                  value={company}
                  onChange={e => setCompany(e.target.value)}
                  className="form-input"
                  placeholder="e.g. Stripe"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Target Role *</label>
                <input
                  type="text"
                  required
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="form-input"
                  placeholder="e.g. Senior Frontend Engineer"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Target Job Description (Optional)</label>
              <textarea
                value={jobDescription}
                onChange={e => setJobDescription(e.target.value)}
                className="form-input form-textarea"
                placeholder="Paste the job description context so the AI can extract qualifications to highlight..."
                style={{ height: '150px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button
                type="submit"
                disabled={loading || !company || !role}
                className="btn btn-primary"
                style={{ width: '100%', height: '42px', gap: '0.5rem' }}
              >
                {loading ? (
                  <span>Drafting Cover Letter...</span>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>Generate Cover Letter</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Header alert/info */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'var(--success-light)',
            border: '1px solid var(--success)',
            padding: '1rem 1.5rem',
            borderRadius: 'var(--radius-sm)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--success)' }}>
              <FileText size={20} />
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Cover letter drafted for {result.role} at {result.company}</span>
            </div>
            <button onClick={() => setResult(null)} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
              Create New Letter
            </button>
          </div>

          {/* Interactive Document Editor */}
          <Card title="Interactive Document Workspace" subtitle="Refine, edit, and download your letter">
            <Editor
              initialValue={result.content}
              onSave={handleSave}
              onDownloadPdf={handleDownload}
            />
          </Card>
        </div>
      )}

      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          backgroundColor: toast.type === 'error' ? '#fee2e2' : '#dcfce7',
          border: `1px solid ${toast.type === 'error' ? '#ef4444' : '#22c55e'}`,
          padding: '0.85rem 1.5rem',
          borderRadius: '8px',
          color: toast.type === 'error' ? '#b91c1c' : '#15803d',
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.15), 0 4px 6px -4px rgba(0,0,0,0.1)',
          animation: 'slideIn 0.3s ease-out'
        }}>
          {toast.type === 'error' ? <AlertCircle size={16} /> : <Check size={16} />}
          <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
