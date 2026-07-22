import { useState, useEffect } from 'react';
import { resumeApi, TailoredResumeResult } from '../api';
import Card from '../components/Card';
import { Sparkles, Download, Save, Plus, Trash2, ArrowLeft, FileText, CheckCircle2 } from 'lucide-react';
import { jsPDF } from 'jspdf';

interface ResumeBuilderProps {
  company: string;
  setCompany: (val: string) => void;
  role: string;
  setRole: (val: string) => void;
  jobDescription: string;
  setJobDescription: (val: string) => void;
  resumeText: string;
  setResumeText: (val: string) => void;
  result: TailoredResumeResult | null;
  setResult: (val: TailoredResumeResult | null) => void;
}

export default function ResumeBuilder({
  company,
  setCompany,
  role,
  setRole,
  jobDescription,
  setJobDescription,
  resumeText,
  setResumeText,
  result,
  setResult
}: ResumeBuilderProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [savedResumes, setSavedResumes] = useState<any[]>([]);
  const [viewingSavedList, setViewingSavedList] = useState(false);

  useEffect(() => {
    // Load previously tailored resumes
    resumeApi.listTailored()
      .then(res => setSavedResumes(res))
      .catch(err => console.error(err));
  }, []);

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!company || !role || !jobDescription) {
      alert('Please fill out the Company, Role, and Job Description fields.');
      return;
    }

    setLoading(true);
    resumeApi.tailor({ company, role, jobDescription, resumeText })
      .then(res => {
        setResult(res);
        setSuccessMsg('AI Tailored Resume Generated Successfully! (1 Credit Deducted)');
        setTimeout(() => setSuccessMsg(''), 5000);
      })
      .catch(err => {
        console.error(err);
        alert(err.message || 'Resume tailoring failed.');
      })
      .finally(() => setLoading(false));
  };

  const handleSaveToDb = () => {
    if (!result) return;
    setSaving(true);
    resumeApi.saveTailored({
      company: result.company,
      role: result.role,
      content: result.content
    })
      .then(() => {
        setSuccessMsg('Tailored resume saved to your profile!');
        // Refresh saved list
        resumeApi.listTailored().then(res => setSavedResumes(res));
        setTimeout(() => setSuccessMsg(''), 4000);
      })
      .catch(err => {
        console.error(err);
        alert('Failed to save tailored resume.');
      })
      .finally(() => setSaving(false));
  };

  const handleDeleteSaved = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this saved resume?')) return;
    resumeApi.deleteTailored(id)
      .then(() => {
        setSavedResumes(prev => prev.filter(r => r.id !== id));
      })
      .catch(err => console.error(err));
  };

  // Compile and Download PDF with professional A4 print formatting rules
  const handleDownloadPdf = () => {
    if (!result) return;
    const { personalInfo, summary, skills, experience, projects, education } = result.content;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const margin = 20; // 20mm margins
    const pageWidth = doc.internal.pageSize.width; // 210mm
    const pageHeight = doc.internal.pageSize.height; // 297mm
    const maxWidth = pageWidth - margin * 2; // 170mm
    let cursorY = margin;

    // Helper to print centered line
    const printCentered = (text: string, size: number, style: 'normal' | 'bold' = 'normal') => {
      doc.setFont('times', style);
      doc.setFontSize(size);
      const textWidth = doc.getTextWidth(text);
      const x = (pageWidth - textWidth) / 2;
      doc.text(text, x, cursorY);
      cursorY += size * 0.35 + 2;
    };

    // Helper to print section header
    const printSectionHeader = (title: string) => {
      cursorY += 4;
      doc.setFont('times', 'bold');
      doc.setFontSize(11);
      doc.text(title, margin, cursorY);
      cursorY += 2;
      // Draw horizontal dividing line
      doc.setDrawColor(80, 80, 80);
      doc.setLineWidth(0.2);
      doc.line(margin, cursorY, pageWidth - margin, cursorY);
      cursorY += 4;
    };

    // Helper to check page bounds
    const checkPageBounds = (neededHeight: number) => {
      if (cursorY + neededHeight > pageHeight - margin) {
        doc.addPage();
        cursorY = margin;
      }
    };

    // 1. Personal Info
    printCentered(personalInfo.fullName.toUpperCase(), 16, 'bold');
    
    const contactParts = [];
    if (personalInfo.email) contactParts.push(personalInfo.email);
    if (personalInfo.phone) contactParts.push(personalInfo.phone);
    if (personalInfo.location) contactParts.push(personalInfo.location);
    printCentered(contactParts.join('  |  '), 10, 'normal');

    const linkParts = [];
    if (personalInfo.linkedin) linkParts.push(personalInfo.linkedin);
    if (personalInfo.github) linkParts.push(personalInfo.github);
    if (linkParts.length > 0) {
      printCentered(linkParts.join('  |  '), 9.5, 'normal');
    }
    cursorY += 2;

    // 2. Summary
    if (summary) {
      printSectionHeader('PROFESSIONAL SUMMARY');
      doc.setFont('times', 'normal');
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(summary, maxWidth);
      lines.forEach((line: string) => {
        checkPageBounds(4.5);
        doc.text(line, margin, cursorY);
        cursorY += 4.5;
      });
      cursorY += 1.5;
    }

    // 3. Skills
    if (skills && skills.length > 0) {
      printSectionHeader('TECHNICAL SKILLS');
      doc.setFont('times', 'normal');
      doc.setFontSize(10);
      const skillsStr = skills.join(', ');
      const lines = doc.splitTextToSize(skillsStr, maxWidth);
      lines.forEach((line: string) => {
        checkPageBounds(4.5);
        doc.text(line, margin, cursorY);
        cursorY += 4.5;
      });
      cursorY += 1.5;
    }

    // 4. Experience
    if (experience && experience.length > 0) {
      printSectionHeader('PROFESSIONAL EXPERIENCE');
      experience.forEach(exp => {
        checkPageBounds(15);
        doc.setFont('times', 'bold');
        doc.setFontSize(10);
        
        // Left details: Role, Company
        doc.text(`${exp.role}  -  ${exp.company}`, margin, cursorY);
        
        // Right details: Duration
        const durWidth = doc.getTextWidth(exp.duration);
        doc.text(exp.duration, pageWidth - margin - durWidth, cursorY);
        cursorY += 4.5;

        doc.setFont('times', 'normal');
        exp.bullets.forEach(bullet => {
          const lines = doc.splitTextToSize(bullet, maxWidth - 4);
          lines.forEach((line: string, lineIdx: number) => {
            checkPageBounds(4.5);
            // Draw bullet dot on first line of bullet
            if (lineIdx === 0) {
              doc.text('•', margin + 1.5, cursorY);
            }
            doc.text(line, margin + 5, cursorY);
            cursorY += 4.5;
          });
        });
        cursorY += 2;
      });
    }

    // 5. Projects
    if (projects && projects.length > 0) {
      printSectionHeader('TECHNICAL PROJECTS');
      projects.forEach(proj => {
        checkPageBounds(15);
        doc.setFont('times', 'bold');
        doc.setFontSize(10);
        
        doc.text(proj.title, margin, cursorY);
        
        if (proj.technologies) {
          doc.setFont('times', 'italic');
          const techStr = ` (Tech Stack: ${proj.technologies})`;
          const titleWidth = doc.getTextWidth(proj.title);
          doc.text(techStr, margin + titleWidth, cursorY);
        }
        cursorY += 4.5;

        doc.setFont('times', 'normal');
        proj.bullets.forEach(bullet => {
          const lines = doc.splitTextToSize(bullet, maxWidth - 4);
          lines.forEach((line: string, lineIdx: number) => {
            checkPageBounds(4.5);
            if (lineIdx === 0) {
              doc.text('•', margin + 1.5, cursorY);
            }
            doc.text(line, margin + 5, cursorY);
            cursorY += 4.5;
          });
        });
        cursorY += 2;
      });
    }

    // 6. Education
    if (education && education.length > 0) {
      printSectionHeader('EDUCATION');
      education.forEach(edu => {
        checkPageBounds(8);
        doc.setFont('times', 'bold');
        doc.setFontSize(10);
        doc.text(`${edu.degree}  -  ${edu.school}`, margin, cursorY);
        
        const durWidth = doc.getTextWidth(edu.duration);
        doc.text(edu.duration, pageWidth - margin - durWidth, cursorY);
        cursorY += 5;
      });
    }

    const filename = `Tailored_Resume_${result.company.replace(/\s+/g, '_')}.pdf`;
    doc.save(filename);
  };

  // Local helper to update nested JSON values
  const updatePersonalInfo = (field: string, value: string) => {
    if (!result) return;
    setResult({
      ...result,
      content: {
        ...result.content,
        personalInfo: {
          ...result.content.personalInfo,
          [field]: value
        }
      }
    });
  };

  const updateSummary = (value: string) => {
    if (!result) return;
    setResult({
      ...result,
      content: { ...result.content, summary: value }
    });
  };

  const updateSkills = (value: string) => {
    if (!result) return;
    const skillsArr = value.split(',').map(s => s.trim());
    setResult({
      ...result,
      content: { ...result.content, skills: skillsArr }
    });
  };

  const updateExperience = (index: number, field: string, value: any) => {
    if (!result) return;
    const updated = [...result.content.experience];
    updated[index] = { ...updated[index], [field]: value };
    setResult({
      ...result,
      content: { ...result.content, experience: updated }
    });
  };

  const updateProject = (index: number, field: string, value: any) => {
    if (!result) return;
    const updated = [...result.content.projects];
    updated[index] = { ...updated[index], [field]: value };
    setResult({
      ...result,
      content: { ...result.content, projects: updated }
    });
  };

  const updateEducation = (index: number, field: string, value: string) => {
    if (!result) return;
    const updated = [...result.content.education];
    updated[index] = { ...updated[index], [field]: value };
    setResult({
      ...result,
      content: { ...result.content, education: updated }
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Notifications Header */}
      {successMsg && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          backgroundColor: 'var(--success-light)',
          border: '1px solid var(--success)',
          padding: '0.75rem 1.25rem',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--success)',
          fontWeight: 600,
          fontSize: '0.85rem'
        }}>
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Mode Selection Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>AI Resume Builder</h1>
          <p>Align and optimize your resume keywords dynamically for a specific job application.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setViewingSavedList(!viewingSavedList);
            setResult(null);
          }}
          className="btn btn-secondary"
          style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}
        >
          {viewingSavedList ? 'Back to Generator' : `View Saved Resumes (${savedResumes.length})`}
        </button>
      </div>

      {viewingSavedList ? (
        /* Saved Tailored Resumes List View */
        <Card title="Saved Tailored Resumes" subtitle="Review and download previously optimized drafts">
          {savedResumes.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No saved tailored resumes found. Create one using the AI generator tab!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {savedResumes.map(r => (
                <div
                  key={r.id}
                  onClick={() => {
                    setResult(r);
                    setViewingSavedList(false);
                  }}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1rem',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-card)',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s'
                  }}
                  className="saved-resume-item"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <FileText size={24} style={{ color: 'var(--accent)' }} />
                    <div>
                      <strong style={{ display: 'block', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                        {r.role} at {r.company}
                      </strong>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                        Optimized: {new Date(r.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDeleteSaved(r.id, e)}
                    className="btn btn-danger"
                    style={{ padding: '0.35rem', borderRadius: '50%', minWidth: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      ) : !result ? (
        /* Generator Input Form */
        <Card title="AI Resizing & Tailoring Prompt" subtitle="Provide your current profile and target job description to build a custom matching layout">
          <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Company Name *</label>
                <input
                  type="text"
                  required
                  value={company}
                  onChange={e => setCompany(e.target.value)}
                  className="form-input"
                  placeholder="e.g. Google"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Target Role / Title *</label>
                <input
                  type="text"
                  required
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="form-input"
                  placeholder="e.g. Senior Software Engineer"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Target Job Description *</label>
              <textarea
                required
                value={jobDescription}
                onChange={e => setJobDescription(e.target.value)}
                className="form-input form-textarea"
                placeholder="Paste the job description keywords, qualifications, and core duties to let Llama analyze and prioritize..."
                style={{ height: '140px' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Current Base Resume Text (Optional)</label>
              <textarea
                value={resumeText}
                onChange={e => setResumeText(e.target.value)}
                className="form-input form-textarea"
                placeholder="Paste your raw resume text. If left blank, CareerOS will extract details from your profile summary automatically."
                style={{ height: '140px' }}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !company || !role || !jobDescription}
              className="btn btn-primary animate-pulse"
              style={{ height: '44px', width: '100%', gap: '0.5rem', marginTop: '1rem' }}
            >
              {loading ? (
                <span>Generating Print-Ready Resume...</span>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Generate Tailored Resume</span>
                </>
              )}
            </button>
          </form>
        </Card>
      ) : (
        /* Dynamic Split-Screen Editor & Preview Workspace */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
          
          {/* Left Panel: Real-time Editor Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setResult(null)}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
              >
                <ArrowLeft size={14} />
                <span>New Draft</span>
              </button>
              <button
                onClick={handleSaveToDb}
                disabled={saving}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
              >
                <Save size={14} />
                <span>{saving ? 'Saving...' : 'Save Draft'}</span>
              </button>
              <button
                onClick={handleDownloadPdf}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', padding: '0.4rem 0.8rem', backgroundColor: 'var(--success-light)', color: 'var(--success)', border: '1px solid var(--success)' }}
              >
                <Download size={14} />
                <span>Export PDF</span>
              </button>
            </div>

            {/* Section A: Contact Details */}
            <Card title="1. Personal Info" subtitle="Your candidate identification details">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.7rem' }}>Full Name</label>
                  <input
                    type="text"
                    value={result.content.personalInfo.fullName}
                    onChange={e => updatePersonalInfo('fullName', e.target.value)}
                    className="form-input"
                  />
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.7rem' }}>Email</label>
                    <input
                      type="email"
                      value={result.content.personalInfo.email}
                      onChange={e => updatePersonalInfo('email', e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.7rem' }}>Phone</label>
                    <input
                      type="text"
                      value={result.content.personalInfo.phone}
                      onChange={e => updatePersonalInfo('phone', e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.7rem' }}>Location</label>
                  <input
                    type="text"
                    value={result.content.personalInfo.location}
                    onChange={e => updatePersonalInfo('location', e.target.value)}
                    className="form-input"
                  />
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.7rem' }}>LinkedIn</label>
                    <input
                      type="text"
                      value={result.content.personalInfo.linkedin}
                      onChange={e => updatePersonalInfo('linkedin', e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.7rem' }}>GitHub</label>
                    <input
                      type="text"
                      value={result.content.personalInfo.github}
                      onChange={e => updatePersonalInfo('github', e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Section B: Executive Summary */}
            <Card title="2. Profile Summary" subtitle="Elevator pitch aligning you to this specific JD">
              <textarea
                value={result.content.summary}
                onChange={e => updateSummary(e.target.value)}
                className="form-input form-textarea"
                style={{ height: '100px', fontSize: '0.8rem', lineHeight: '1.4' }}
              />
            </Card>

            {/* Section C: Skills List */}
            <Card title="3. Core Skills" subtitle="Comma-separated keywords matched for this role">
              <input
                type="text"
                value={result.content.skills.join(', ')}
                onChange={e => updateSkills(e.target.value)}
                className="form-input"
                style={{ fontSize: '0.8rem' }}
              />
            </Card>

            {/* Section D: Experience List */}
            <Card title="4. Professional History" subtitle="Quantified bullet descriptions showing role alignments">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {result.content.experience.map((exp, idx) => (
                  <div key={idx} style={{ padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div className="grid-2">
                      <input
                        type="text"
                        value={exp.role}
                        onChange={e => updateExperience(idx, 'role', e.target.value)}
                        className="form-input"
                        placeholder="Role"
                        style={{ fontSize: '0.75rem' }}
                      />
                      <input
                        type="text"
                        value={exp.company}
                        onChange={e => updateExperience(idx, 'company', e.target.value)}
                        className="form-input"
                        placeholder="Company"
                        style={{ fontSize: '0.75rem' }}
                      />
                    </div>
                    <input
                      type="text"
                      value={exp.duration}
                      onChange={e => updateExperience(idx, 'duration', e.target.value)}
                      className="form-input"
                      placeholder="Duration"
                      style={{ fontSize: '0.75rem' }}
                    />
                    
                    {/* Experience Bullets Editor */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.25rem' }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 600 }}>Quantified Achievement Bullets:</span>
                      {exp.bullets.map((bullet, bulletIdx) => (
                        <div key={bulletIdx} style={{ display: 'flex', gap: '0.25rem' }}>
                          <textarea
                            value={bullet}
                            onChange={e => {
                              const newBullets = [...exp.bullets];
                              newBullets[bulletIdx] = e.target.value;
                              updateExperience(idx, 'bullets', newBullets);
                            }}
                            className="form-input"
                            style={{ fontSize: '0.75rem', height: '54px', padding: '0.25rem', lineHeight: '1.3' }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newBullets = exp.bullets.filter((_, bIdx) => bIdx !== bulletIdx);
                              updateExperience(idx, 'bullets', newBullets);
                            }}
                            className="btn btn-secondary"
                            style={{ height: '32px', minWidth: '32px', padding: 0 }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          const newBullets = [...exp.bullets, 'New tailored achievement bullet describing project duties...'];
                          updateExperience(idx, 'bullets', newBullets);
                        }}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.65rem', padding: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'center' }}
                      >
                        <Plus size={12} />
                        <span>Add Bullet Point</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

          </div>

          {/* Right Panel: Live Print Preview Sheet */}
          <div style={{ position: 'sticky', top: '1.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
              Live Print-Ready ATS Document Preview (Georgia Font):
            </span>
            
            {/* Sheet wrapper */}
            <div style={{
              background: '#ffffff',
              color: '#111111',
              fontFamily: 'Georgia, serif',
              padding: '2rem 1.5rem',
              borderRadius: 'var(--radius-sm)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              fontSize: '0.75rem',
              lineHeight: '1.35',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              textAlign: 'left'
            }}>
              
              {/* Header */}
              <div style={{ textAlign: 'center' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: '0 0 0.25rem 0', color: '#111111' }}>
                  {result.content.personalInfo.fullName.toUpperCase()}
                </h2>
                <div style={{ fontSize: '0.7rem', color: '#333333' }}>
                  {[
                    result.content.personalInfo.email,
                    result.content.personalInfo.phone,
                    result.content.personalInfo.location
                  ].filter(Boolean).join('  |  ')}
                </div>
                <div style={{ fontSize: '0.65rem', color: '#555555', marginTop: '0.15rem' }}>
                  {[
                    result.content.personalInfo.linkedin,
                    result.content.personalInfo.github
                  ].filter(Boolean).join('  |  ')}
                </div>
              </div>

              {/* Summary Section */}
              {result.content.summary && (
                <div>
                  <div style={{ fontWeight: 'bold', borderBottom: '1px solid #666', paddingBottom: '2px', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                    Professional Summary
                  </div>
                  <p style={{ margin: '0.35rem 0 0 0', textAlign: 'justify', color: '#222222', fontSize: '0.7rem' }}>
                    {result.content.summary}
                  </p>
                </div>
              )}

              {/* Skills Section */}
              {result.content.skills && result.content.skills.length > 0 && (
                <div>
                  <div style={{ fontWeight: 'bold', borderBottom: '1px solid #666', paddingBottom: '2px', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                    Technical Skills
                  </div>
                  <p style={{ margin: '0.35rem 0 0 0', color: '#222222', fontSize: '0.7rem' }}>
                    {result.content.skills.join(', ')}
                  </p>
                </div>
              )}

              {/* Experience Section */}
              {result.content.experience && result.content.experience.length > 0 && (
                <div>
                  <div style={{ fontWeight: 'bold', borderBottom: '1px solid #666', paddingBottom: '2px', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                    Professional Experience
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.35rem' }}>
                    {result.content.experience.map((exp, idx) => (
                      <div key={idx}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '0.7rem' }}>
                          <span>{exp.role}  —  {exp.company}</span>
                          <span>{exp.duration}</span>
                        </div>
                        <ul style={{ margin: '0.2rem 0 0 0', paddingLeft: '1.2rem', color: '#222222', fontSize: '0.68rem' }}>
                          {exp.bullets.map((bullet, bulletIdx) => (
                            <li key={bulletIdx} style={{ marginBottom: '0.15rem' }}>{bullet}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Projects Section */}
              {result.content.projects && result.content.projects.length > 0 && (
                <div>
                  <div style={{ fontWeight: 'bold', borderBottom: '1px solid #666', paddingBottom: '2px', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                    Technical Projects
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.35rem' }}>
                    {result.content.projects.map((proj, idx) => (
                      <div key={idx}>
                        <div style={{ fontWeight: 'bold', fontSize: '0.7rem' }}>
                          <span>{proj.title}</span>
                          {proj.technologies && (
                            <span style={{ fontStyle: 'italic', fontWeight: 'normal', color: '#444' }}>
                              {' '}
                              (Tech: {proj.technologies})
                            </span>
                          )}
                        </div>
                        <ul style={{ margin: '0.2rem 0 0 0', paddingLeft: '1.2rem', color: '#222222', fontSize: '0.68rem' }}>
                          {proj.bullets.map((bullet, bulletIdx) => (
                            <li key={bulletIdx} style={{ marginBottom: '0.15rem' }}>{bullet}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Education Section */}
              {result.content.education && result.content.education.length > 0 && (
                <div>
                  <div style={{ fontWeight: 'bold', borderBottom: '1px solid #666', paddingBottom: '2px', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                    Education
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.35rem' }}>
                    {result.content.education.map((edu, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                        <span style={{ fontWeight: 'bold' }}>{edu.degree}  —  {edu.school}</span>
                        <span style={{ fontWeight: 'bold' }}>{edu.duration}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>
      )}
    </div>
  );
}
