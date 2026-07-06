import { useState } from 'react';
import { resumeApi, atsApi, TailoredResumeResult } from '../api';
import { Wand2, Download, Check, HelpCircle, Sparkles, FileText } from 'lucide-react';
import { jsPDF } from 'jspdf';
import Card from '../components/Card';
import MetricBar from '../components/MetricBar';
import CoverLetterGenerator from '../components/CoverLetterGenerator';

interface ResumeTailorProps {
  resumeText: string;
  setResumeText: (val: string) => void;
  jobDescription: string;
  setJobDescription: (val: string) => void;
  result: TailoredResumeResult | null;
  setResult: (val: TailoredResumeResult | null) => void;
}

export default function ResumeTailor({
  resumeText,
  setResumeText,
  jobDescription,
  setJobDescription,
  result,
  setResult
}: ResumeTailorProps) {
  const [activeTab, setActiveTab] = useState<'resume' | 'coverletter'>('resume');
  const [loading, setLoading] = useState(false);
  const [parsingFile, setParsingFile] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setParsingFile(true);
      atsApi.parseFile(file)
        .then(res => {
          setResumeText(res.text);
        })
        .catch(err => {
          alert(err.message || 'Failed to extract text from file.');
        })
        .finally(() => setParsingFile(false));
    }
  };

  const handleTailor = () => {
    if (!jobDescription) {
      alert('Please paste the target Job Description first.');
      return;
    }

    setLoading(true);
    resumeApi.tailor(resumeText, jobDescription)
      .then(res => {
        setResult(res);
      })
      .catch(err => {
        console.error(err);
        alert('Resume tailoring service failed.');
      })
      .finally(() => setLoading(false));
  };

  const handleDownloadDoc = () => {
    if (!result || !result.tailoredResumeText) return;
    
    const lines = result.tailoredResumeText.split('\n');
    let htmlContent = '';
    
    lines.forEach((rawLine, idx) => {
      const line = rawLine.trim();
      if (!line) {
        htmlContent += '<p style="margin: 0; height: 10px;"></p>';
        return;
      }
      
      const isName = idx === 0 && line.length < 40 && !line.includes('@');
      const isContact = (line.includes('@') || line.includes('|') || line.includes('Phone') || line.includes('Location')) && idx < 4;
      const isHeader = /^(SUMMARY|EXPERIENCE|PROJECTS|EDUCATION|SKILLS|LANGUAGES|CERTIFICATIONS|ACCOMPLISHMENTS|WORK HISTORY)$/i.test(line) ||
                       (line === line.toUpperCase() && line.length < 35 && idx > 0 && !line.includes('|') && !line.includes('@'));
                       
      if (isName) {
        htmlContent += `<h1 style="text-align: center; font-size: 18pt; margin: 0 0 4px 0; font-family: 'Times New Roman'; font-weight: bold; color: #000000;">${line}</h1>`;
      } else if (isContact) {
        htmlContent += `<p style="text-align: center; font-size: 9.5pt; margin: 0 0 8px 0; color: #444444; font-family: 'Times New Roman';">${line}</p>`;
      } else if (isHeader) {
        htmlContent += `
          <h2 style="font-size: 11.5pt; font-weight: bold; border-bottom: 1px solid #777777; margin: 16px 0 6px 0; padding-bottom: 2px; text-transform: uppercase; font-family: 'Times New Roman'; color: #000000;">
            ${line}
          </h2>
        `;
      } else if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
        const text = line.substring(1).trim();
        htmlContent += `<li style="font-size: 10pt; margin-left: 20px; margin-bottom: 3px; font-family: 'Times New Roman'; line-height: 1.35; color: #111111;">${text}</li>`;
      } else {
        htmlContent += `<p style="font-size: 10pt; margin: 0 0 5px 0; line-height: 1.35; font-family: 'Times New Roman'; color: #111111;">${line}</p>`;
      }
    });

    const html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <title>Tailored Resume</title>
        <style>
          body { font-family: 'Times New Roman', Times, serif; padding: 45px; }
          li { font-family: 'Times New Roman', Times, serif; }
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
      </html>
    `;
    const blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'tailored-resume.doc');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPdf = () => {
    if (!result || !result.tailoredResumeText) return;
    
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    const margin = 20; // 20mm margins
    const pageHeight = doc.internal.pageSize.height; // 297mm
    const pageWidth = doc.internal.pageSize.width; // 210mm
    
    let cursorY = margin;
    const lines = result.tailoredResumeText.split('\n');
    
    lines.forEach((rawLine, idx) => {
      const line = rawLine.trim();
      if (!line) {
        cursorY += 2.5; // blank line spacing
        return;
      }
      
      const isName = idx === 0 && line.length < 40 && !line.includes('@');
      const isContact = (line.includes('@') || line.includes('|') || line.includes('Phone') || line.includes('Location')) && idx < 4;
      const isHeader = /^(SUMMARY|EXPERIENCE|PROJECTS|EDUCATION|SKILLS|LANGUAGES|CERTIFICATIONS|ACCOMPLISHMENTS|WORK HISTORY)$/i.test(line) ||
                       (line === line.toUpperCase() && line.length < 35 && idx > 0 && !line.includes('|') && !line.includes('@'));
                       
      // Safety height check prior to print
      if (cursorY + (isHeader ? 12 : 6) > pageHeight - margin) {
        doc.addPage();
        cursorY = margin;
      }
      
      if (isName) {
        doc.setFont('Times', 'bold');
        doc.setFontSize(16);
        doc.text(line, pageWidth / 2, cursorY, { align: 'center' });
        cursorY += 7;
      } else if (isContact) {
        doc.setFont('Times', 'normal');
        doc.setFontSize(9.5);
        doc.text(line, pageWidth / 2, cursorY, { align: 'center' });
        cursorY += 6;
      } else if (isHeader) {
        cursorY += 3;
        doc.setFont('Times', 'bold');
        doc.setFontSize(11.5);
        doc.text(line.toUpperCase(), margin, cursorY);
        cursorY += 1.5;
        // Horizontal separation divider line matching Jobscan format rules
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.3);
        doc.line(margin, cursorY, pageWidth - margin, cursorY);
        cursorY += 5;
      } else {
        doc.setFont('Times', 'normal');
        doc.setFontSize(10);
        
        const isBullet = line.startsWith('•') || line.startsWith('-') || line.startsWith('*');
        const textMargin = isBullet ? margin + 4 : margin;
        
        let printText = line;
        if (isBullet) {
          doc.text('•', margin + 1, cursorY);
          printText = line.substring(1).trim();
        }
        
        const wrappedLines = doc.splitTextToSize(printText, pageWidth - textMargin - margin);
        wrappedLines.forEach((wLine: string) => {
          if (cursorY + 5.2 > pageHeight - margin) {
            doc.addPage();
            cursorY = margin;
          }
          doc.text(wLine, textMargin, cursorY);
          cursorY += 5.2;
        });
      }
    });
    
    doc.save('tailored-resume.pdf');
  };

  return (
    <div>
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Resume & Document Tailor</h1>
          <p>Optimize your resume keywords or generate highly-personalized cover letters matching target job descriptions.</p>
        </div>
        
        {/* Toggle Tabs */}
        <div style={{
          display: 'inline-flex',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.25rem'
        }}>
          <button
            onClick={() => setActiveTab('resume')}
            className={`btn ${activeTab === 'resume' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.4rem 1rem', border: 'none', boxShadow: 'none' }}
          >
            <Wand2 size={14} />
            <span>Tailor Resume</span>
          </button>
          <button
            onClick={() => setActiveTab('coverletter')}
            className={`btn ${activeTab === 'coverletter' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.4rem 1rem', border: 'none', boxShadow: 'none' }}
          >
            <Sparkles size={14} />
            <span>Cover Letter Generator</span>
          </button>
        </div>
      </header>

      {activeTab === 'coverletter' ? (
        <CoverLetterGenerator />
      ) : !result ? (
        <div className="grid-2">
          <Card title="Current Resume Content" subtitle="Paste or upload your existing resume to optimize">
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Upload Resume File (.pdf, .docx)</label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="file"
                  accept=".pdf,.docx"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                  id="tailor-file-upload"
                />
                <button
                  type="button"
                  onClick={() => document.getElementById('tailor-file-upload')?.click()}
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
                placeholder="Paste your plain-text resume here (e.g. Profile details, past roles, skills)..."
                className="form-input form-textarea"
                style={{ height: '350px' }}
              />
            </div>
          </Card>
 
          <Card title="Target Job Description" subtitle="Paste the job description of your target application">
            <div className="form-group">
              <textarea
                value={jobDescription}
                onChange={e => setJobDescription(e.target.value)}
                placeholder="Paste the target job description (e.g. Responsibilities, qualifications, required skills)..."
                className="form-input form-textarea"
                style={{ height: '350px' }}
              />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button
                type="button"
                onClick={handleTailor}
                className="btn btn-primary animate-pulse"
                disabled={loading || !resumeText.trim()}
                style={{ height: '44px', gap: '0.5rem' }}
              >
                {loading ? (
                  <>
                    <span className="spin-animation" style={{ display: 'inline-block' }}>⚙️</span>
                    <span>Tailoring Resume content...</span>
                  </>
                ) : (
                  <>
                    <Wand2 size={16} />
                    <span>Run AI Document Tailoring</span>
                  </>
                )}
              </button>
            </div>
          </Card>
        </div>
      ) : (
        <div>
          {/* Analysis metrics row */}
          <div className="grid-3" style={{ marginBottom: '2rem' }}>
            <Card style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'var(--danger-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--danger)',
                fontSize: '1.25rem',
                fontWeight: 700
              }}>
                {result.matchScoreBefore}%
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Original Match Score</span>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span>Low Compatibility</span>
                </h4>
              </div>
            </Card>

            <Card style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', border: '1px solid var(--accent)' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'var(--success-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--success)',
                fontSize: '1.25rem',
                fontWeight: 700
              }}>
                {result.matchScoreAfter}%
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Tailored Match Score</span>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span>Excellent Match</span>
                </h4>
              </div>
            </Card>

            <Card style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', justifyContent: 'center' }}>
              <button onClick={handleDownloadDoc} className="btn btn-primary" style={{ width: '100%', height: '40px', gap: '0.5rem', justifyContent: 'center' }}>
                <FileText size={16} />
                <span>Download Word (.doc)</span>
              </button>
              <button onClick={handleDownloadPdf} className="btn btn-primary" style={{ width: '100%', height: '40px', gap: '0.5rem', justifyContent: 'center', backgroundColor: 'var(--success)', border: 'none' }}>
                <Download size={16} />
                <span>Download PDF (.pdf)</span>
              </button>
              <button
                onClick={() => setResult(null)}
                className="btn btn-secondary"
                style={{ width: '100%', height: '36px', fontSize: '0.8rem', justifyContent: 'center' }}
              >
                Restart Tailor Process
              </button>
            </Card>
          </div>

          <div className="grid-2">
            {/* Tailored Output Display */}
            <Card title="Tailored Resume Output" subtitle="Review or edit your newly generated resume document">
              <textarea
                value={result.tailoredResumeText}
                readOnly
                className="form-input form-textarea"
                style={{
                  height: '450px',
                  fontFamily: 'monospace',
                  fontSize: '0.8rem',
                  lineHeight: '1.5',
                  backgroundColor: 'var(--bg-app)'
                }}
              />
            </Card>

            {/* Keyword Integration and improvements */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {result.evidenceStatements && result.evidenceStatements.length > 0 && (
                <Card title="Tailoring Evidence Tracker" subtitle="AI claims verification audits to ensure interview readiness">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem', maxHeight: '250px', overflowY: 'auto' }}>
                    {result.evidenceStatements.map((ev, i) => {
                      let badgeColor = 'var(--text-muted)';
                      let badgeBg = 'var(--border)';
                      let badgeText = ev.evidenceType as string;

                      if (ev.evidenceType === 'VERIFIED') {
                        badgeColor = 'var(--success)';
                        badgeBg = 'var(--success-light)';
                        badgeText = '✅ Verified in Resume';
                      } else if (ev.evidenceType === 'PROJECT_MATCH') {
                        badgeColor = 'var(--accent)';
                        badgeBg = 'var(--accent-light)';
                        badgeText = '✅ Verified in Projects';
                      } else if (ev.evidenceType === 'SUGGESTED') {
                        badgeColor = 'var(--warning)';
                        badgeBg = 'var(--warning-light)';
                        badgeText = '🟡 Suggested recommendation';
                      } else if (ev.evidenceType === 'NOT_ADDED') {
                        badgeColor = 'var(--danger)';
                        badgeBg = 'var(--danger-light)';
                        badgeText = '🔴 Excluded: No Evidence';
                      }

                      return (
                        <div key={i} style={{ padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-card)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.25rem' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {ev.statement}
                            </span>
                            <span className="badge" style={{ fontSize: '0.65rem', color: badgeColor, backgroundColor: badgeBg, border: 'none' }}>
                              {badgeText}
                            </span>
                          </div>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ev.details}</p>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}

              <Card title="Keywords Integrated" subtitle="The system automatically incorporated the following missing keywords">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '250px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                  {result.keywordSuggestions.map((kw, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.75rem',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--bg-card)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="badge badge-success" style={{ padding: '0.25rem' }}><Check size={12} /></span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{kw.keyword}</span>
                      </div>
                      <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
                        Added {kw.occurrencesAdded}x ({kw.impact})
                      </span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card title="Drafting Enhancements" subtitle="AI improvements mapped to CV sections">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '250px', overflowY: 'auto' }}>
                  {result.sectionImprovements.map((imp, i) => (
                    <div key={i} style={{ borderBottom: i < result.sectionImprovements.length - 1 ? '1px solid var(--border)' : 'none', paddingBottom: '1rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase' }}>{imp.section}</span>
                      <div style={{ marginTop: '0.25rem', fontSize: '0.8rem' }}>
                        <span style={{ display: 'block', color: 'var(--text-secondary)' }}><strong>Before:</strong> "{imp.original}"</span>
                        <span style={{ display: 'block', color: 'var(--text-primary)', marginTop: '0.25rem' }}><strong>After:</strong> "{imp.improved}"</span>
                      </div>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem', fontStyle: 'italic' }}>
                        Reason: {imp.reason}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
