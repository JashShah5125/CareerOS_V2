import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
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
  uploadedFileName: string;
  setUploadedFileName: (val: string) => void;
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
  setResult,
  uploadedFileName,
  setUploadedFileName
}: ResumeBuilderProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [savedResumes, setSavedResumes] = useState<any[]>([]);
  const [viewingSavedList, setViewingSavedList] = useState(false);

  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const [selectedTemplate, setSelectedTemplate] = useState<'academic' | 'modern'>('academic');

  const location = useLocation();

  useEffect(() => {
    if (location.state) {
      const { role: passedRole, company: passedCompany } = location.state as { role?: string; company?: string };
      if (passedRole) setRole(passedRole);
      if (passedCompany) setCompany(passedCompany);
    }
  }, [location.state, setRole, setCompany]);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  const [parsingFile, setParsingFile] = useState(false);

  const handleFileUploaderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setParsingFile(true);
      
      resumeApi.parseFile(file)
        .then(res => {
          setResumeText(res.text); // Set the resumeText state for backend tailoring
          setUploadedFileName(file.name);
          showToast(`Successfully parsed and loaded ${file.name}`, 'success');
        })
        .catch(err => {
          console.error(err);
          showToast('Failed to parse the selected file. Please verify it is a valid PDF or DOCX.', 'error');
        })
        .finally(() => {
          setParsingFile(false);
        });
    }
  };

  const handleRemoveUploadedFile = () => {
    setResumeText('');
    setUploadedFileName('');
    showToast('Uploaded resume cleared.', 'success');
  };

  useEffect(() => {
    // Load previously tailored resumes
    resumeApi.listTailored()
      .then(res => setSavedResumes(res))
      .catch(err => console.error(err));
  }, []);

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!company || !role || !jobDescription) {
      showToast('Please fill out the Company, Role, and Job Description fields.', 'error');
      return;
    }

    setLoading(true);
    resumeApi.tailor({ company, role, jobDescription, resumeText })
      .then(res => {
        setResult(res);
        showToast('AI Tailored Resume Generated Successfully!', 'success');
      })
      .catch(err => {
        console.error(err);
        showToast(err.message || 'Resume tailoring failed.', 'error');
      })
      .finally(() => setLoading(false));
  };

  const handleSaveToDb = () => {
    if (!result) return;
    if (!validatePersonalInfo()) return;
    setSaving(true);
    resumeApi.saveTailored({
      company: result.company,
      role: result.role,
      content: result.content
    })
      .then(() => {
        showToast('Tailored resume saved to your profile!', 'success');
        // Refresh saved list
        resumeApi.listTailored().then(res => setSavedResumes(res));
      })
      .catch(err => {
        console.error(err);
        showToast('Failed to save tailored resume.', 'error');
      })
      .finally(() => setSaving(false));
  };

  const handleDeleteSaved = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmId(id);
  };

  // Compile and Download PDF with professional A4 print formatting rules
  // Compile and Download PDF with professional A4 print formatting rules
  const handleDownloadPdf = () => {
    if (!result) return;
    if (!validatePersonalInfo()) return;
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

    const fontName = selectedTemplate === 'modern' ? 'helvetica' : 'times';

    // Helper to print line
    const printLine = (text: string, size: number, style: 'normal' | 'bold' | 'italic' = 'normal', align: 'left' | 'center' = 'left') => {
      doc.setFont(fontName, style);
      doc.setFontSize(size);
      if (align === 'center') {
        const textWidth = doc.getTextWidth(text);
        const x = (pageWidth - textWidth) / 2;
        doc.text(text, x, cursorY);
      } else {
        doc.text(text, margin, cursorY);
      }
      cursorY += size * 0.35 + 2;
    };

    // Helper to print section header
    const printSectionHeader = (title: string) => {
      cursorY += 4;
      doc.setFont(fontName, 'bold');
      doc.setFontSize(11);
      if (selectedTemplate === 'modern') {
        doc.setTextColor(99, 102, 241); // Indigo color #6366f1
      } else {
        doc.setTextColor(17, 17, 17);
      }
      doc.text(title, margin, cursorY);
      doc.setTextColor(17, 17, 17); // Reset
      cursorY += 2.2;
      doc.setDrawColor(selectedTemplate === 'modern' ? 220 : 80, selectedTemplate === 'modern' ? 220 : 80, selectedTemplate === 'modern' ? 220 : 80);
      doc.setLineWidth(selectedTemplate === 'modern' ? 0.35 : 0.2);
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
    if (selectedTemplate === 'modern') {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text(personalInfo.fullName.toUpperCase(), margin, cursorY);
      cursorY += 7;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      const contacts = [personalInfo.email, personalInfo.phone, personalInfo.location].filter(Boolean);
      const socials = [personalInfo.linkedin, personalInfo.github].filter(Boolean);
      const line1 = contacts.join('  |  ');
      const line2 = socials.join('  |  ');
      doc.text(line1, margin, cursorY);
      cursorY += 4.5;
      if (line2) {
        doc.text(line2, margin, cursorY);
        cursorY += 4.5;
      }
      cursorY += 2;
    } else {
      printLine(personalInfo.fullName.toUpperCase(), 16, 'bold', 'center');
      
      const contactParts = [];
      if (personalInfo.email) contactParts.push(personalInfo.email);
      if (personalInfo.phone) contactParts.push(personalInfo.phone);
      if (personalInfo.location) contactParts.push(personalInfo.location);
      printLine(contactParts.join('  |  '), 10, 'normal', 'center');

      const linkParts = [];
      if (personalInfo.linkedin) linkParts.push(personalInfo.linkedin);
      if (personalInfo.github) linkParts.push(personalInfo.github);
      if (linkParts.length > 0) {
        printLine(linkParts.join('  |  '), 9.5, 'normal', 'center');
      }
      cursorY += 2;
    }

    // 2. Summary
    if (summary) {
      printSectionHeader('PROFESSIONAL SUMMARY');
      doc.setFont(fontName, 'normal');
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
      doc.setFont(fontName, 'normal');
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
        doc.setFont(fontName, 'bold');
        doc.setFontSize(10);
        
        // Left details: Role, Company
        doc.text(`${exp.role}  -  ${exp.company}`, margin, cursorY);
        
        // Right details: Duration
        const durWidth = doc.getTextWidth(exp.duration);
        doc.text(exp.duration, pageWidth - margin - durWidth, cursorY);
        cursorY += 4.5;

        doc.setFont(fontName, 'normal');
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
        doc.setFont(fontName, 'bold');
        doc.setFontSize(10);
        
        doc.text(proj.title, margin, cursorY);
        
        if (proj.technologies) {
          doc.setFont(fontName, 'italic');
          const techStr = ` (Tech Stack: ${proj.technologies})`;
          const titleWidth = doc.getTextWidth(proj.title);
          doc.text(techStr, margin + titleWidth, cursorY);
        }
        cursorY += 4.5;

        doc.setFont(fontName, 'normal');
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
        doc.setFont(fontName, 'bold');
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

  const validatePersonalInfo = (): boolean => {
    if (!result) return false;
    const { fullName, email, phone } = result.content.personalInfo;
    
    const nameRegex = /^[a-zA-Z\s]+$/;
    if (!fullName || !nameRegex.test(fullName)) {
      showToast('Validation Error: Name must contain only letters and spaces.', 'error');
      return false;
    }
    
    if (!email || !email.includes('@')) {
      showToast('Validation Error: Email must contain @ symbol.', 'error');
      return false;
    }
    
    const phoneClean = phone.trim();
    const allowedClean = phoneClean.replace(/[\s\+\-\(\)]/g, '');
    const hasNonDigits = /[^\d]/.test(allowedClean);
    if (hasNonDigits) {
      showToast('Validation Error: Phone number must contain only numbers.', 'error');
      return false;
    }
    
    let coreDigits = allowedClean;
    if (coreDigits.length === 12 && coreDigits.startsWith('91')) {
      coreDigits = coreDigits.substring(2);
    }
    
    if (coreDigits.length !== 10) {
      showToast('Validation Error: Phone number must be exactly 10 digits.', 'error');
      return false;
    }
    
    return true;
  };

  // Local helper to update nested JSON values
  const updatePersonalInfo = (field: string, value: string) => {
    if (!result) return;

    if (field === 'fullName') {
      const nameRegex = /^[a-zA-Z\s]*$/;
      if (!nameRegex.test(value)) {
        setNameError('Name must contain only letters and spaces.');
      } else {
        setNameError('');
      }
    }

    if (field === 'email') {
      if (value && !value.includes('@')) {
        setEmailError('Email is compulsory and must contain @ symbol.');
      } else {
        setEmailError('');
      }
    }

    if (field === 'phone') {
      const phoneClean = value.trim();
      const allowedClean = phoneClean.replace(/[\s\+\-\(\)]/g, '');
      const hasNonDigits = /[^\d]/.test(allowedClean);
      
      let coreDigits = allowedClean;
      if (coreDigits.length === 12 && coreDigits.startsWith('91')) {
        coreDigits = coreDigits.substring(2);
      }

      if (hasNonDigits) {
        setPhoneError('Phone number must contain only numbers.');
      } else if (coreDigits.length > 0 && coreDigits.length !== 10) {
        setPhoneError('Phone number must be exactly 10 digits.');
      } else {
        setPhoneError('');
      }
    }

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

  const sectionHeaderStyle = selectedTemplate === 'modern' ? {
    fontWeight: 'bold',
    borderBottom: '1px solid #ddd',
    color: '#6366f1',
    paddingBottom: '2.5px',
    textTransform: 'uppercase' as const,
    fontSize: '0.75rem',
    letterSpacing: '0.05em'
  } : {
    fontWeight: 'bold',
    borderBottom: '1px solid #666',
    paddingBottom: '2px',
    textTransform: 'uppercase' as const,
    fontSize: '0.75rem',
    letterSpacing: '0.05em'
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1.5rem' }}>
        <div className="builder-header-row">
          <h1 style={{ margin: 0 }}>AI Resume Builder</h1>
          <button
            type="button"
            onClick={() => {
              setViewingSavedList(!viewingSavedList);
              setResult(null);
            }}
            className="btn btn-secondary"
            style={{ fontSize: '0.8rem', padding: '0.5rem 1rem', flexShrink: 0 }}
          >
            {viewingSavedList ? 'Back to Generator' : `View Saved Resumes (${savedResumes.length})`}
          </button>
        </div>
        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
          Align and optimize your resume keywords dynamically for a specific job application.
        </p>
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
              <label className="form-label">Upload Current Resume File (.pdf, .docx, .txt)</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt"
                    onChange={handleFileUploaderChange}
                    style={{ display: 'none' }}
                    id="builder-file-upload"
                  />
                  <button
                    type="button"
                    onClick={() => document.getElementById('builder-file-upload')?.click()}
                    className="btn btn-secondary"
                    style={{ flexGrow: 1, height: '44px', gap: '0.5rem', justifyContent: 'center' }}
                    disabled={parsingFile}
                  >
                    {parsingFile ? (
                      <>
                        <span className="spin-animation" style={{ display: 'inline-block' }}>⚙️</span>
                        <span>Parsing Document & Extracting Details...</span>
                      </>
                    ) : (
                      <>
                        <FileText size={16} />
                        <span>{uploadedFileName ? uploadedFileName : 'Choose Resume File'}</span>
                      </>
                    )}
                  </button>
                  {uploadedFileName && (
                    <button
                      type="button"
                      onClick={handleRemoveUploadedFile}
                      className="btn btn-danger"
                      style={{ height: '44px', minWidth: '44px', padding: 0 }}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                {uploadedFileName && !parsingFile && (
                  <div style={{
                    fontSize: '0.75rem',
                    color: 'var(--success, #22c55e)',
                    backgroundColor: 'var(--success-light, #dcfce7)',
                    padding: '0.5rem 0.75rem',
                    borderRadius: 'var(--radius-sm, 4px)',
                    fontWeight: 600
                  }}>
                    ✓ Loaded: {uploadedFileName}
                  </div>
                )}
              </div>
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
        <div className="builder-workspace">
          
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
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', padding: '0.4rem 0.8rem', color: 'var(--success)' }}
              >
                <Download size={14} />
                <span>Export PDF</span>
              </button>
            </div>

            {/* 1. Personal Info Editor */}
            <Card title="1. Personal Info" subtitle="Your candidate identification details">
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.7rem' }}>Full Name</label>
                  <input
                    type="text"
                    value={result.content.personalInfo.fullName}
                    onChange={e => updatePersonalInfo('fullName', e.target.value)}
                    className="form-input"
                    style={{ borderColor: nameError ? 'var(--danger)' : 'var(--border)' }}
                  />
                  {nameError && <span style={{ color: 'var(--danger)', fontSize: '0.65rem', display: 'block', marginTop: '0.25rem' }}>{nameError}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.7rem' }}>Email</label>
                  <input
                    type="email"
                    value={result.content.personalInfo.email}
                    onChange={e => updatePersonalInfo('email', e.target.value)}
                    className="form-input"
                    style={{ borderColor: emailError ? 'var(--danger)' : 'var(--border)' }}
                  />
                  {emailError && <span style={{ color: 'var(--danger)', fontSize: '0.65rem', display: 'block', marginTop: '0.25rem' }}>{emailError}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.7rem' }}>Phone</label>
                  <input
                    type="text"
                    value={result.content.personalInfo.phone}
                    onChange={e => updatePersonalInfo('phone', e.target.value)}
                    className="form-input"
                    style={{ borderColor: phoneError ? 'var(--danger)' : 'var(--border)' }}
                  />
                  {phoneError && <span style={{ color: 'var(--danger)', fontSize: '0.65rem', display: 'block', marginTop: '0.25rem' }}>{phoneError}</span>}
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
              <div className="grid-2" style={{ marginTop: '0.5rem' }}>
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
            </Card>

            {/* 2. Professional Summary Editor */}
            <Card title="2. Professional Summary" subtitle="Elevator pitch aligning to the JD keywords">
              <div className="form-group">
                <textarea
                  value={result.content.summary}
                  onChange={e => updateSummary(e.target.value)}
                  className="form-input form-textarea"
                  style={{ height: '110px' }}
                />
              </div>
            </Card>

            {/* 3. Technical Skills Editor */}
            <Card title="3. Technical Skills" subtitle="Comma-separated competencies for search scanners">
              <div className="form-group">
                <textarea
                  value={result.content.skills.join(', ')}
                  onChange={e => updateSkills(e.target.value)}
                  className="form-input form-textarea"
                  style={{ height: '70px' }}
                  placeholder="React, TypeScript, Node.js..."
                />
              </div>
            </Card>

            {/* 4. Experience Editor */}
            <Card title="4. Professional Experience" subtitle="Quantified bullet points matching job tasks">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {result.content.experience.map((exp, idx) => (
                  <div key={idx} style={{ borderBottom: idx < result.content.experience.length - 1 ? '1px solid var(--border)' : 'none', paddingBottom: '1rem' }}>
                    <div className="grid-2">
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.7rem' }}>Role</label>
                        <input
                          type="text"
                          value={exp.role}
                          onChange={e => updateExperience(idx, 'role', e.target.value)}
                          className="form-input"
                          style={{ fontSize: '0.75rem' }}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.7rem' }}>Company</label>
                        <input
                          type="text"
                          value={exp.company}
                          onChange={e => updateExperience(idx, 'company', e.target.value)}
                          className="form-input"
                          style={{ fontSize: '0.75rem' }}
                        />
                      </div>
                    </div>
                    <input
                      type="text"
                      value={exp.duration}
                      onChange={e => updateExperience(idx, 'duration', e.target.value)}
                      className="form-input"
                      style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}
                    />
                    
                    {/* Experience Bullets Editor */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.5rem' }}>
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
                          const newBullets = [...exp.bullets, ''];
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
          <div className="builder-preview-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', gap: '1rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Live Print-Ready ATS Document Preview:
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Template:</span>
                <select
                  value={selectedTemplate}
                  onChange={e => setSelectedTemplate(e.target.value as 'academic' | 'modern')}
                  style={{
                    backgroundColor: 'var(--bg-card, #1e1e38)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  <option value="academic">Classic Academic (Serif)</option>
                  <option value="modern">Modern Minimalist (Sans-Serif)</option>
                </select>
              </div>
            </div>
            
            {/* Sheet wrapper */}
            <div style={{
              background: '#ffffff',
              color: '#111111',
              fontFamily: selectedTemplate === 'modern' ? "'Inter', system-ui, sans-serif" : "Georgia, serif",
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
              {selectedTemplate === 'modern' ? (
                <div style={{ textAlign: 'left', borderBottom: '2px solid var(--accent, #6366f1)', paddingBottom: '0.75rem' }}>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold', margin: '0 0 0.35rem 0', color: '#111111' }}>
                    {result.content.personalInfo.fullName.toUpperCase()}
                  </h2>
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.7rem', color: '#444444' }}>
                    {[
                      result.content.personalInfo.email,
                      result.content.personalInfo.phone,
                      result.content.personalInfo.location,
                      result.content.personalInfo.linkedin,
                      result.content.personalInfo.github
                    ].filter(Boolean).map((text, idx) => (
                      <span key={idx}>{text}</span>
                    ))}
                  </div>
                </div>
              ) : (
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
              )}

              {/* Summary Section */}
              {result.content.summary && (
                <div>
                  <div style={sectionHeaderStyle}>
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
                  <div style={sectionHeaderStyle}>
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
                  <div style={sectionHeaderStyle}>
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
                  <div style={sectionHeaderStyle}>
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
                  <div style={sectionHeaderStyle}>
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
          {toast.type === 'error' ? <Trash2 size={16} /> : <CheckCircle2 size={16} />}
          <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{toast.message}</span>
        </div>
      )}

      {deleteConfirmId && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            background: 'var(--bg-card, #1e1e38)',
            border: '1px solid var(--border, #3b3b5c)',
            padding: '1.5rem',
            borderRadius: '12px',
            maxWidth: '400px',
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)',
            animation: 'scaleIn 0.2s ease-out'
          }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Confirm Deletion</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Are you sure you want to delete this saved resume? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="btn btn-secondary"
                style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const id = deleteConfirmId;
                  setDeleteConfirmId(null);
                  resumeApi.deleteTailored(id)
                    .then(() => {
                      setSavedResumes(prev => prev.filter(r => r.id !== id));
                      showToast('Saved resume deleted successfully.', 'success');
                    })
                    .catch(err => {
                      console.error(err);
                      showToast('Failed to delete resume.', 'error');
                    });
                }}
                className="btn btn-danger"
                style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
