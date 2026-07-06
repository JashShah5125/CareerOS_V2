import { useState } from 'react';
import { ApplicationCard } from '../api';
import { Calendar, DollarSign, Clock, FileText, ChevronRight, ChevronLeft, Trash2, Plus } from 'lucide-react';
import Card from './Card';

interface KanbanProps {
  applications: ApplicationCard[];
  onUpdateStatus: (id: string, newStatus: ApplicationCard['status']) => void;
  onDelete: (id: string) => void;
  onAddCardClick: (status: ApplicationCard['status']) => void;
  onCardClick: (app: ApplicationCard) => void;
}

const COLUMNS: Array<{ key: ApplicationCard['status']; label: string; badgeClass: string }> = [
  { key: 'APPLIED', label: 'Applied', badgeClass: 'badge-primary' },
  { key: 'ASSESSMENT', label: 'Assessment', badgeClass: 'badge-warning' },
  { key: 'INTERVIEW', label: 'Interview', badgeClass: 'badge-primary' },
  { key: 'OFFER', label: 'Offer', badgeClass: 'badge-success' },
  { key: 'REJECTED', label: 'Rejected', badgeClass: 'badge-danger' }
];

export default function Kanban({ applications, onUpdateStatus, onDelete, onAddCardClick, onCardClick }: KanbanProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const handleDragStart = (id: string) => {
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (status: ApplicationCard['status']) => {
    if (draggedId) {
      onUpdateStatus(draggedId, status);
      setDraggedId(null);
    }
  };

  const shiftStatus = (app: ApplicationCard, direction: 'left' | 'right') => {
    const currentIndex = COLUMNS.findIndex(col => col.key === app.status);
    let nextIndex = currentIndex + (direction === 'left' ? -1 : 1);
    if (nextIndex >= 0 && nextIndex < COLUMNS.length) {
      onUpdateStatus(app.id, COLUMNS[nextIndex].key);
    }
  };

  return (
    <div className="kanban-board">
      {COLUMNS.map((column) => {
        const columnApps = applications.filter(app => app.status === column.key);
        
        return (
          <div
            key={column.key}
            className="kanban-column"
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(column.key)}
          >
            <div className="kanban-column-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className={`badge ${column.badgeClass}`}>{column.label}</span>
                <span className="kanban-column-count">{columnApps.length}</span>
              </div>
              <button
                onClick={() => onAddCardClick(column.key)}
                className="btn btn-secondary"
                style={{ padding: '0.25rem', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title={`Add card to ${column.label}`}
              >
                <Plus size={14} />
              </button>
            </div>

            <div className="kanban-cards-container">
              {columnApps.map(app => (
                <div
                  key={app.id}
                  className="kanban-card"
                  draggable
                  onDragStart={() => handleDragStart(app.id)}
                  onClick={() => onCardClick(app)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{app.company}</h4>
                    <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--accent)' }}>{app.salary}</span>
                  </div>
                  
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', fontWeight: 500 }}>{app.role}</p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <Calendar size={12} />
                      <span>Applied: {app.applicationDate}</span>
                    </div>
                    {app.deadline && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <Clock size={12} />
                        <span>Deadline: {app.deadline}</span>
                      </div>
                    )}
                    {app.interviewDate && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--accent)' }}>
                        <Calendar size={12} />
                        <span>Interview: {app.interviewDate}</span>
                      </div>
                    )}
                  </div>

                  {app.notes && (
                    <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'flex-start', fontSize: '0.75rem', backgroundColor: 'var(--bg-app)', padding: '0.375rem', borderRadius: '4px', marginBottom: '0.75rem' }}>
                      <FileText size={12} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--text-muted)' }} />
                      <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1.3' }}>
                        {app.notes}
                      </span>
                    </div>
                  )}

                  {/* Card Actions / Shift controls */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '0.5rem', marginTop: '0.5rem' }} onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => onDelete(app.id)}
                      className="btn"
                      style={{ padding: '0.25rem', background: 'none', border: 'none', color: 'var(--danger)' }}
                      title="Delete Application"
                    >
                      <Trash2 size={13} />
                    </button>
                    
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button
                        onClick={() => shiftStatus(app, 'left')}
                        className="btn btn-secondary"
                        style={{ padding: '0.15rem 0.3rem', height: '22px', fontSize: '0.7rem' }}
                        disabled={app.status === 'APPLIED'}
                      >
                        <ChevronLeft size={12} />
                      </button>
                      <button
                        onClick={() => shiftStatus(app, 'right')}
                        className="btn btn-secondary"
                        style={{ padding: '0.15rem 0.3rem', height: '22px', fontSize: '0.7rem' }}
                        disabled={app.status === 'REJECTED'}
                      >
                        <ChevronRight size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {columnApps.length === 0 && (
                <div style={{
                  border: '2px dashed var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '1.5rem 1rem',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem',
                  justifyContent: 'center',
                  alignItems: 'center',
                  minHeight: '100px'
                }}>
                  <span>Drag items here</span>
                  <span>or click + above</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
