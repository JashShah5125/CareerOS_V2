import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { resumeApi } from '../api';
import {
  MessageSquareCode,
  Sparkles,
  HelpCircle,
  Clock,
  PlayCircle,
  ChevronRight,
  TrendingUp,
  UserCheck,
  CheckCircle,
  FileCode,
  History,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import Card from '../components/Card';
import MetricBar from '../components/MetricBar';

interface Question {
  id: string;
  type: string;
  question: string;
  idealAnswer: string;
}

interface Feedback {
  questionId: string;
  score: number;
  evaluation: string;
  suggestions: string[];
  modelAnswer: string;
  starScores?: {
    context: number;
    task: number;
    action: number;
    result: number;
  };
}

export default function InterviewPrep() {
  const [role, setRole] = useState('');
  const [company, setCompany] = useState('');
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, Feedback>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  const [history, setHistory] = useState<any[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const location = useLocation();

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  useEffect(() => {
    if (location.state) {
      const { role: passedRole, company: passedCompany } = location.state as { role?: string; company?: string };
      if (passedRole) setRole(passedRole);
      if (passedCompany) setCompany(passedCompany);
    }
  }, [location.state]);

  const loadHistory = () => {
    resumeApi.getInterviewHistory()
      .then(res => setHistory(res))
      .catch(err => console.warn('Failed to load interview history:', err));
  };

  useEffect(() => {
    loadHistory();
  }, []);

  // Debounced auto-save of typed responses to database
  useEffect(() => {
    if (!activeSessionId) return;
    if (Object.keys(answers).length === 0) return;

    const delayDebounce = setTimeout(() => {
      resumeApi.saveInterviewAnswers(activeSessionId, answers)
        .catch(err => console.warn('[Interview Prep] Auto-save answers failed:', err));
    }, 1000);

    return () => clearTimeout(delayDebounce);
  }, [answers, activeSessionId]);

  const handleSelectPastSession = (sessionId: string) => {
    setLoading(true);
    resumeApi.getInterviewSessionDetail(sessionId)
      .then(res => {
        setQuestions(res.questions);
        setActiveSessionId(res.id);
        setSelectedIdx(0);
        
        const historyMeta = res.meta || {};
        const savedAnswers = historyMeta.answers || {};
        
        const loadedAnswers: Record<string, string> = { ...savedAnswers };
        const loadedFeedback: Record<string, Feedback> = {};
        
        Object.keys(res.feedback).forEach(qId => {
          const fb = res.feedback[qId];
          loadedFeedback[qId] = fb;
          if (!loadedAnswers[qId] && fb.userAnswer) {
            loadedAnswers[qId] = fb.userAnswer;
          }
        });
        
        setAnswers(loadedAnswers);
        setFeedback(loadedFeedback);
      })
      .catch(err => {
        console.error(err);
        showToast('Could not load past practice session.', 'error');
      })
      .finally(() => setLoading(false));
  };

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback({});
    setAnswers({});
    setSelectedIdx(0);
    resumeApi.generateInterviewQuestions({ role, company })
      .then(res => {
        setQuestions(res.questions);
        setActiveSessionId(res.id);
        loadHistory();
        showToast('Practice questions generated successfully!', 'success');
      })
      .catch(err => {
        console.error(err);
        showToast('Could not generate questions.', 'error');
      })
      .finally(() => setLoading(false));
  };

  const handleEvaluate = (question: Question) => {
    const userAnswer = answers[question.id];
    if (!userAnswer || !userAnswer.trim()) {
      showToast('Please type in an answer first before submitting for AI feedback.', 'error');
      return;
    }

    setSubmitting(question.id);
    resumeApi.submitAnswerFeedback({
      sessionId: activeSessionId || undefined,
      questionId: question.id,
      questionText: question.question,
      userAnswer: userAnswer
    })
      .then(res => {
        setFeedback(prev => ({
          ...prev,
          [question.id]: res
        }));
        loadHistory();
        showToast('AI Feedback generated successfully!', 'success');
      })
      .catch(err => {
        console.error(err);
        showToast('Feedback evaluation failed.', 'error');
      })
      .finally(() => setSubmitting(null));
  };

  const activeQuestion = questions[selectedIdx];

  return (
    <div>
      <header style={{ marginBottom: '2rem' }}>
        <h1>Interview Preparation</h1>
      </header>

      {questions.length === 0 ? (
        <div className="grid-3" style={{ alignItems: 'start' }}>
          {/* Main Form */}
          <div style={{ gridColumn: 'span 2' }}>
            <Card title="Initialize Practice Session" subtitle="Set your parameters for targeted questions">
              <form onSubmit={handleGenerate}>
                <div className="form-group">
                  <label className="form-label">Target Role *</label>
                  <input
                    type="text"
                    required
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    className="form-input"
                    placeholder="e.g. Frontend Engineer"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Company Target (Optional)</label>
                  <input
                    type="text"
                    value={company}
                    onChange={e => setCompany(e.target.value)}
                    className="form-input"
                    placeholder="e.g. Linear"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: '1rem', height: '42px', gap: '0.5rem' }}
                >
                  {loading ? 'Generating Structured Questions...' : 'Start Preparation Session'}
                </button>
              </form>
            </Card>
          </div>

          {/* History */}
          <Card title="Session History" subtitle="Your past practice scores">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {history.length === 0 ? (
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>
                  No practice sessions saved yet. Start your first session to track scores!
                </span>
              ) : (
                history.map(item => (
                  <div
                    key={item.id}
                    onClick={() => handleSelectPastSession(item.id)}
                    onMouseEnter={e => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                      e.currentTarget.style.borderColor = 'var(--accent)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.borderColor = 'var(--border)';
                    }}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.75rem',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', color: 'var(--text-primary)' }}>{item.company}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.role} • {item.date}</span>
                    </div>
                    <span className={`badge ${item.score > 0 ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.7rem' }}>
                      {item.score > 0 ? `Avg: ${item.score}%` : 'Pending'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '1.5rem', alignItems: 'start' }}>
          {/* Left: Sidebar selector of questions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', paddingLeft: '0.5rem' }}>Questions</h3>
            {questions.map((q, idx) => (
              <button
                key={q.id}
                onClick={() => setSelectedIdx(idx)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  border: '1px solid var(--border)',
                  backgroundColor: selectedIdx === idx ? 'var(--accent-light)' : 'var(--bg-card)',
                  color: selectedIdx === idx ? 'var(--accent)' : 'var(--text-primary)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontWeight: selectedIdx === idx ? 600 : 500,
                  fontSize: '0.8125rem'
                }}
              >
                <span>{q.type} Question</span>
                {feedback[q.id] ? (
                  <span className="badge badge-success" style={{ fontSize: '0.65rem', padding: '0.15rem 0.35rem' }}>
                    {feedback[q.id].score}%
                  </span>
                ) : answers[q.id] ? (
                  <span className="badge badge-warning" style={{ fontSize: '0.65rem', padding: '0.15rem 0.35rem' }}>Draft</span>
                ) : null}
              </button>
            ))}

            <button
              onClick={() => setQuestions([])}
              className="btn btn-secondary"
              style={{ marginTop: '1rem', width: '100%', fontSize: '0.8rem', height: '36px' }}
            >
              Reset Session
            </button>
          </div>

          {/* Right: Question Answer Area */}
          {activeQuestion && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <Card title={`${activeQuestion.type} QUESTION`} subtitle="Formulate your response below">
                <p style={{ fontSize: '1.05rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                  "{activeQuestion.question}"
                </p>

                <div className="form-group">
                  <label className="form-label">Your Response</label>
                  <textarea
                    value={answers[activeQuestion.id] || ''}
                    onChange={e => setAnswers({ ...answers, [activeQuestion.id]: e.target.value })}
                    className="form-input form-textarea"
                    placeholder="Type your mock interview answer here. Be structured, detailed, and cite actions..."
                    style={{ height: '180px' }}
                    disabled={!!feedback[activeQuestion.id]}
                  />
                </div>

                {!feedback[activeQuestion.id] && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => handleEvaluate(activeQuestion)}
                      className="btn btn-primary"
                      disabled={submitting === activeQuestion.id}
                    >
                      {submitting === activeQuestion.id ? 'Evaluating Answer...' : 'Evaluate with AI'}
                    </button>
                  </div>
                )}
              </Card>

              {/* AI Feedback Section */}
              {feedback[activeQuestion.id] && (
                <Card style={{ border: '1px solid var(--accent)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Sparkles size={18} style={{ color: 'var(--accent)' }} />
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>AI Feedback & Evaluation</h3>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Score:</span>
                      <span className="badge badge-success" style={{ fontSize: '0.9rem', fontWeight: 700 }}>
                        {feedback[activeQuestion.id].score}%
                      </span>
                    </div>
                  </div>

                  <div style={{ marginBottom: '1.25rem' }}>
                    <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>EVALUATION</span>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: '1.5' }}>
                      {feedback[activeQuestion.id].evaluation}
                    </p>
                  </div>

                  {(() => {
                    const activeFb = feedback[activeQuestion.id];
                    if (!activeFb || !activeFb.starScores) return null;
                    return (
                      <div style={{ marginBottom: '1.25rem', padding: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-app)' }}>
                        <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>STAR Method Diagnostic Breakdown</span>
                        <div className="grid-2" style={{ gap: '1rem' }}>
                          <div>
                            <MetricBar label="Situation (Context Completeness)" value={activeFb.starScores.context} />
                            <MetricBar label="Task (Ownership / Goal)" value={activeFb.starScores.task} />
                          </div>
                          <div>
                            <MetricBar label="Action (Concrete Specificity)" value={activeFb.starScores.action} />
                            <MetricBar label="Result (Measurable Outcome)" value={activeFb.starScores.result} />
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <div style={{ marginBottom: '1.25rem' }}>
                    <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>KEY IMPROVEMENT SUGGESTIONS</span>
                    <ul style={{ paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      {feedback[activeQuestion.id].suggestions.map((sug, i) => (
                        <li key={i}>{sug}</li>
                      ))}
                    </ul>
                  </div>

                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '1rem' }}>
                    <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>IDEAL RESPONSE / MODEL ANSWER</span>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: '1.5' }}>
                      "{feedback[activeQuestion.id].modelAnswer}"
                    </p>
                  </div>
                </Card>
              )}
            </div>
          )}
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
          {toast.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
          <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
