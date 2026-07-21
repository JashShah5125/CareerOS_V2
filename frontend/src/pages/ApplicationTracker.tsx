import { useEffect, useState } from 'react';
import { trackerApi, ApplicationCard, jobApi, JobDescriptionRecord } from '../api';
import Kanban from '../components/Kanban';
import Card from '../components/Card';
import { Plus, X, Briefcase, Calendar, DollarSign, FileText } from 'lucide-react';

export default function ApplicationTracker() {
  const [apps, setApps] = useState<ApplicationCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeCard, setActiveCard] = useState<Partial<ApplicationCard> | null>(null);

  const [jobs, setJobs] = useState<JobDescriptionRecord[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('general');
  const [jdModalOpen, setJdModalOpen] = useState(false);
  const [newJd, setNewJd] = useState({ title: '', company: '', description: '' });

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    fetchApps();
  }, [selectedJobId]);

  const fetchJobs = () => {
    jobApi.list()
      .then(res => setJobs(res))
      .catch(err => console.error(err));
  };

  const fetchApps = () => {
    setLoading(true);
    const queryId = selectedJobId === 'general' ? 'general' : selectedJobId;
    trackerApi.list(queryId)
      .then(res => setApps(res))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  const handleUpdateStatus = (id: string, newStatus: ApplicationCard['status']) => {
    trackerApi.update(id, { status: newStatus })
      .then(() => fetchApps())
      .catch(err => console.error(err));
  };

  const handleDelete = (id: string) => {
    trackerApi.delete(id)
      .then(() => fetchApps())
      .catch(err => console.error(err));
  };

  const handleAddClick = (status: ApplicationCard['status']) => {
    const activeJob = jobs.find(j => j.id === selectedJobId);
    setActiveCard({
      jobId: selectedJobId === 'general' ? null : selectedJobId,
      company: activeJob ? activeJob.company : '',
      role: activeJob ? activeJob.title : '',
      salary: '',
      status: status,
      deadline: '',
      applicationDate: new Date().toISOString().split('T')[0],
      interviewDate: '',
      notes: ''
    });
    setModalOpen(true);
  };

  const handleCardClick = (app: ApplicationCard) => {
    setActiveCard(app);
    setModalOpen(true);
  };

  const handleModalSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCard) return;

    const dataToSave = {
      ...activeCard,
      jobId: selectedJobId === 'general' ? null : selectedJobId,
      deadline: activeCard.deadline || null,
      interviewDate: activeCard.interviewDate || null
    };

    if (activeCard.id) {
      trackerApi.update(activeCard.id, dataToSave)
        .then(() => {
          fetchApps();
          setModalOpen(false);
        })
        .catch(err => console.error(err));
    } else {
      trackerApi.create(dataToSave)
        .then(() => {
          fetchApps();
          setModalOpen(false);
        })
        .catch(err => console.error(err));
    }
  };

  const handleJdSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJd.title || !newJd.company || !newJd.description) {
      alert('Please fill in all fields.');
      return;
    }

    jobApi.create(newJd)
      .then(res => {
        setJobs([...jobs, res]);
        setSelectedJobId(res.id);
        setJdModalOpen(false);
        setNewJd({ title: '', company: '', description: '' });
      })
      .catch(err => console.error(err));
  };

  const handleDeleteJob = () => {
    if (selectedJobId === 'general') return;
    if (confirm('Are you sure you want to delete this job board? All associated tracking cards will be permanently deleted.')) {
      jobApi.delete(selectedJobId)
        .then(() => {
          setSelectedJobId('general');
          fetchJobs();
        })
        .catch(err => console.error(err));
    }
  };

  return (
    <div>
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Applicant tracking board</h1>
          <p>Organize, schedule, and track candidates applying for your open Job Descriptions across standard recruitment stages.</p>
        </div>
        <button onClick={() => handleAddClick('APPLIED')} className="btn btn-primary">
          <Plus size={16} />
          <span>Add Applicant</span>
        </button>
      </header>

      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        backgroundColor: 'var(--bg-card)', 
        border: '1px solid var(--border)', 
        borderRadius: 'var(--radius-md)', 
        padding: '1rem', 
        marginBottom: '2rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <label style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>Active Workspace Board:</label>
          <select 
            value={selectedJobId} 
            onChange={(e) => setSelectedJobId(e.target.value)}
            className="form-input"
            style={{ minWidth: '240px', height: '40px', padding: '0 0.5rem', backgroundColor: 'var(--bg-app)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)' }}
          >
            <option value="general">📁 General Tracker Board</option>
            {jobs.map(j => (
              <option key={j.id} value={j.id}>💼 {j.company} - {j.title}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => setJdModalOpen(true)} className="btn btn-secondary" style={{ height: '40px' }}>
            <Plus size={16} />
            <span>New Job Board</span>
          </button>
          
          {selectedJobId !== 'general' && (
            <button onClick={handleDeleteJob} className="btn btn-secondary" style={{ height: '40px', color: 'var(--danger)', borderColor: 'var(--danger-light)' }}>
              <X size={16} />
              <span>Delete Board</span>
            </button>
          )}
        </div>
      </div>

      {loading && apps.length === 0 ? (
        <p>Loading application cards...</p>
      ) : (
        <Kanban
          applications={apps}
          onUpdateStatus={handleUpdateStatus}
          onDelete={handleDelete}
          onAddCardClick={handleAddClick}
          onCardClick={handleCardClick}
        />
      )}

      {/* Modal Dialog Form Overlay for Application Card */}
      {modalOpen && activeCard && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{activeCard.id ? 'Edit Applicant Details' : 'Add New Candidate'}</h3>
              <button onClick={() => setModalOpen(false)} className="close-btn"><X size={18} /></button>
            </div>
            
            <form onSubmit={handleModalSave}>
              <div className="form-grid">
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Applicant Name *</label>
                  <input
                    type="text"
                    required
                    value={activeCard.candidateName || ''}
                    onChange={e => setActiveCard({ ...activeCard, candidateName: e.target.value })}
                    className="form-input"
                    placeholder="e.g. John Doe"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Applicant Email</label>
                  <input
                    type="email"
                    value={activeCard.candidateEmail || ''}
                    onChange={e => setActiveCard({ ...activeCard, candidateEmail: e.target.value })}
                    className="form-input"
                    placeholder="e.g. johndoe@example.com"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Applicant Phone</label>
                  <input
                    type="text"
                    value={activeCard.candidatePhone || ''}
                    onChange={e => setActiveCard({ ...activeCard, candidatePhone: e.target.value })}
                    className="form-input"
                    placeholder="e.g. +1 (555) 000-0000"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={activeCard.company || ''}
                    onChange={e => setActiveCard({ ...activeCard, company: e.target.value })}
                    className="form-input"
                    placeholder="e.g. Google"
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Job Title / Role *</label>
                  <input
                    type="text"
                    required
                    value={activeCard.role || ''}
                    onChange={e => setActiveCard({ ...activeCard, role: e.target.value })}
                    className="form-input"
                    placeholder="e.g. Software Engineer"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Salary Expectation</label>
                  <input
                    type="text"
                    value={activeCard.salary || ''}
                    onChange={e => setActiveCard({ ...activeCard, salary: e.target.value })}
                    className="form-input"
                    placeholder="e.g. ₹12L/yr"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Recruitment Status</label>
                  <select
                    value={activeCard.status || 'APPLIED'}
                    onChange={e => setActiveCard({ ...activeCard, status: e.target.value as ApplicationCard['status'] })}
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
                    value={activeCard.applicationDate || ''}
                    onChange={e => setActiveCard({ ...activeCard, applicationDate: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Response Deadline</label>
                  <input
                    type="date"
                    value={activeCard.deadline || ''}
                    onChange={e => setActiveCard({ ...activeCard, deadline: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Interview Date</label>
                  <input
                    type="date"
                    value={activeCard.interviewDate || ''}
                    onChange={e => setActiveCard({ ...activeCard, interviewDate: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Internal Recruiter Notes</label>
                <textarea
                  value={activeCard.notes || ''}
                  onChange={e => setActiveCard({ ...activeCard, notes: e.target.value })}
                  className="form-input form-textarea"
                  placeholder="Paste candidate background details, feedback, or follow-up timelines..."
                  style={{ height: '80px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Candidate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Dialog Form Overlay for New Job Description / Board */}
      {jdModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Create New Job Board</h3>
              <button onClick={() => setJdModalOpen(false)} className="close-btn"><X size={18} /></button>
            </div>
            
            <form onSubmit={handleJdSave}>
              <div className="form-group">
                <label className="form-label">Company Name *</label>
                <input
                  type="text"
                  required
                  value={newJd.company}
                  onChange={e => setNewJd({ ...newJd, company: e.target.value })}
                  className="form-input"
                  placeholder="e.g. Google"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Job Title / Role *</label>
                <input
                  type="text"
                  required
                  value={newJd.title}
                  onChange={e => setNewJd({ ...newJd, title: e.target.value })}
                  className="form-input"
                  placeholder="e.g. Senior Software Engineer"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Job Description (JD Details) *</label>
                <textarea
                  required
                  value={newJd.description}
                  onChange={e => setNewJd({ ...newJd, description: e.target.value })}
                  className="form-input form-textarea"
                  placeholder="Paste the target job description requirements, skills, and objectives..."
                  style={{ height: '180px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setJdModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Board
                </button>
              </div>
            </form>
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
