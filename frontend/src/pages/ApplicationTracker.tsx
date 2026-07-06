import { useEffect, useState } from 'react';
import { trackerApi, ApplicationCard } from '../api';
import Kanban from '../components/Kanban';
import Card from '../components/Card';
import { Plus, X, Briefcase, Calendar, DollarSign, FileText } from 'lucide-react';

export default function ApplicationTracker() {
  const [apps, setApps] = useState<ApplicationCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeCard, setActiveCard] = useState<Partial<ApplicationCard> | null>(null);

  useEffect(() => {
    fetchApps();
  }, []);

  const fetchApps = () => {
    setLoading(true);
    trackerApi.list()
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
    setActiveCard({
      company: '',
      role: '',
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
      // Normalize empty date inputs to null so they don't break JSON formatting
      deadline: activeCard.deadline || null,
      interviewDate: activeCard.interviewDate || null
    };

    if (activeCard.id) {
      // Edit existing
      trackerApi.update(activeCard.id, dataToSave)
        .then(() => {
          fetchApps();
          setModalOpen(false);
        })
        .catch(err => console.error(err));
    } else {
      // Create new
      trackerApi.create(dataToSave)
        .then(() => {
          fetchApps();
          setModalOpen(false);
        })
        .catch(err => console.error(err));
    }
  };

  return (
    <div>
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Application Tracker</h1>
          <p>Organize, schedule, and track job applications across standard recruitment funnel columns.</p>
        </div>
        <button onClick={() => handleAddClick('APPLIED')} className="btn btn-primary">
          <Plus size={16} />
          <span>Add Application</span>
        </button>
      </header>

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

      {/* Modal Dialog Form Overlay */}
      {modalOpen && activeCard && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{activeCard.id ? 'Edit Application Details' : 'Add New Application'}</h3>
              <button onClick={() => setModalOpen(false)} className="close-btn"><X size={18} /></button>
            </div>
            
            <form onSubmit={handleModalSave}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={activeCard.company || ''}
                    onChange={e => setActiveCard({ ...activeCard, company: e.target.value })}
                    className="form-input"
                    placeholder="e.g. Stripe"
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
                    placeholder="e.g. Frontend Engineer"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Salary Details</label>
                  <input
                    type="text"
                    value={activeCard.salary || ''}
                    onChange={e => setActiveCard({ ...activeCard, salary: e.target.value })}
                    className="form-input"
                    placeholder="e.g. $140,000/yr"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Recruitment Status</label>
                  <select
                    value={activeCard.status}
                    onChange={e => setActiveCard({ ...activeCard, status: e.target.value as ApplicationCard['status'] })}
                    className="form-input"
                    style={{ height: '38px' }}
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
                  <label className="form-label">Submission Deadline</label>
                  <input
                    type="date"
                    value={activeCard.deadline || ''}
                    onChange={e => setActiveCard({ ...activeCard, deadline: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
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
                <label className="form-label">Internal Notes & Reminders</label>
                <textarea
                  value={activeCard.notes || ''}
                  onChange={e => setActiveCard({ ...activeCard, notes: e.target.value })}
                  className="form-input form-textarea"
                  placeholder="Paste recruiter notes, links, or follow-up strategies..."
                  style={{ height: '80px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Card
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
