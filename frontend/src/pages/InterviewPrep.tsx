import { useState, useEffect, useRef } from 'react';
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
  CheckCircle2,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Volume2,
  Activity,
  Award,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  VideoIcon
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

interface SessionEvaluation {
  passed: boolean;
  score: number;
  summary: string;
  technicalDepth: number;
  communicationStyle: number;
  behavioralAlignment: number;
  strengths: string[];
  weaknesses: string[];
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

  // New Live Video Interview States
  const [sessionMode, setSessionMode] = useState<'written' | 'live-video'>('written');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isBotSpeaking, setIsBotSpeaking] = useState(false);
  const [isUserAnswering, setIsUserAnswering] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [recognitionInstance, setRecognitionInstance] = useState<any>(null);
  const [overallEvaluation, setOverallEvaluation] = useState<SessionEvaluation | null>(null);
  const [isEvaluatingSession, setIsEvaluatingSession] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [isMediaReady, setIsMediaReady] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lobbyVideoRef = useRef<HTMLVideoElement | null>(null);

  // Manage video stream bindings to avoid re-assigning buffer on re-renders
  useEffect(() => {
    const videoEl = videoRef.current;
    if (videoEl && stream && !cameraOff) {
      if (videoEl.srcObject !== stream) {
        videoEl.srcObject = stream;
        videoEl.play().catch(err => console.warn('[Video] Play error:', err));
      }
    }
  }, [stream, isMediaReady, cameraOff]);

  useEffect(() => {
    const lobbyEl = lobbyVideoRef.current;
    if (lobbyEl && stream && !cameraOff) {
      if (lobbyEl.srcObject !== stream) {
        lobbyEl.srcObject = stream;
        lobbyEl.play().catch(err => console.warn('[Lobby Video] Play error:', err));
      }
    }
  }, [stream, isMediaReady, cameraOff]);

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

  // Clean up media streams and speech synthesis on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      if (recognitionInstance) {
        try { recognitionInstance.stop(); } catch (e) {}
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream, recognitionInstance]);

  // Live Video Mode voice loop trigger
  useEffect(() => {
    if (sessionMode !== 'live-video' || questions.length === 0 || overallEvaluation || !isMediaReady) return;
    
    // Reset and speak new question
    window.speechSynthesis.cancel();
    stopListening();
    setLiveTranscript('');

    const activeQuestion = questions[selectedIdx];
    if (!activeQuestion) return;

    setIsBotSpeaking(true);
    const utterance = new SpeechSynthesisUtterance(activeQuestion.question);
    
    // Fetch and assign an English voice
    let voices = window.speechSynthesis.getVoices();
    let englishVoice = voices.find(v => v.lang.startsWith('en-'));
    
    if (!englishVoice) {
      // Chrome sometimes loads voices asynchronously
      setTimeout(() => {
        voices = window.speechSynthesis.getVoices();
        englishVoice = voices.find(v => v.lang.startsWith('en-'));
        if (englishVoice) utterance.voice = englishVoice;
        utterance.rate = 0.95;
        utterance.onend = () => {
          setIsBotSpeaking(false);
          startListening();
        };
        utterance.onerror = () => {
          setIsBotSpeaking(false);
          startListening();
        };
        window.speechSynthesis.speak(utterance);
      }, 200);
    } else {
      utterance.voice = englishVoice;
      utterance.rate = 0.95;
      utterance.onend = () => {
        setIsBotSpeaking(false);
        startListening();
      };
      utterance.onerror = () => {
        setIsBotSpeaking(false);
        startListening();
      };
      window.speechSynthesis.speak(utterance);
    }

    return () => {
      window.speechSynthesis.cancel();
    };
  }, [selectedIdx, questions.length, sessionMode, overallEvaluation, isMediaReady]);

  // Start webcam and mic stream
  const startWebcam = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(mediaStream);
      setCameraOff(false);
      setMicMuted(false);
    } catch (err) {
      console.warn('Failed to get camera/microphone feed:', err);
      showToast('Camera or Microphone access was denied. Running in audio-only / typing fallback mode.', 'error');
    }
  };

  const stopWebcam = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const toggleMic = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleCamera = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCameraOff(!videoTrack.enabled);
      }
    }
  };

  // Web Speech API STT listeners
  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('Speech recognition is not supported in this browser. Please type your answers.', 'error');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsUserAnswering(true);
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const activeQ = questions[selectedIdx];
      if (!activeQ) return;

      const baseText = answers[activeQ.id] || '';
      const textBuffer = (baseText + ' ' + finalTranscript + ' ' + interimTranscript).trim().replace(/\s+/g, ' ');
      
      setLiveTranscript(textBuffer);
      setAnswers(prev => ({
        ...prev,
        [activeQ.id]: textBuffer
      }));
    };

    recognition.onerror = (err: any) => {
      console.warn('Speech recognition error:', err);
    };

    recognition.onend = () => {
      setIsUserAnswering(false);
    };

    recognition.start();
    setRecognitionInstance(recognition);
  };

  const stopListening = () => {
    if (recognitionInstance) {
      try {
        recognitionInstance.stop();
      } catch (e) {}
      setRecognitionInstance(null);
    }
    setIsUserAnswering(false);
  };

  const handleSelectPastSession = (sessionId: string) => {
    setLoading(true);
    setOverallEvaluation(null);
    setIsMediaReady(false);
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
          if (qId === 'overallEvaluation') {
            setOverallEvaluation(res.feedback[qId]);
          } else {
            const fb = res.feedback[qId];
            loadedFeedback[qId] = fb;
            if (!loadedAnswers[qId] && fb.userAnswer) {
              loadedAnswers[qId] = fb.userAnswer;
            }
          }
        });
        
        setAnswers(loadedAnswers);
        setFeedback(loadedFeedback);

        if (res.feedback && res.feedback.overallEvaluation) {
          setSessionMode('live-video');
        } else {
          setSessionMode('written');
        }
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
    setOverallEvaluation(null);
    setIsMediaReady(false);
    resumeApi.generateInterviewQuestions({ role, company })
      .then(res => {
        setQuestions(res.questions);
        setActiveSessionId(res.id);
        loadHistory();
        showToast('Practice questions generated successfully!', 'success');
        
        if (sessionMode === 'live-video') {
          startWebcam();
        }
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

  // Submit complete live interview session for evaluation
  const handleEvaluateSession = () => {
    if (!activeSessionId) return;

    window.speechSynthesis.cancel();
    stopListening();

    setIsEvaluatingSession(true);
    resumeApi.evaluateSession(activeSessionId)
      .then(res => {
        setOverallEvaluation(res);
        loadHistory();
        showToast('AI Mock Interview evaluation completed successfully! 🎉', 'success');
        stopWebcam();
      })
      .catch(err => {
        console.error(err);
        showToast('AI session evaluation failed.', 'error');
      })
      .finally(() => setIsEvaluatingSession(false));
  };

  const activeQuestion = questions[selectedIdx];

  // Helper radial render function
  const renderGauge = (label: string, score: number, color: string) => {
    const radius = 30;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{ position: 'relative', width: '80px', height: '80px' }}>
          <svg style={{ transform: 'rotate(-90deg)', width: '80px', height: '80px' }}>
            <circle
              cx="40"
              cy="40"
              r={radius}
              stroke="var(--border)"
              strokeWidth="6"
              fill="transparent"
            />
            <circle
              cx="40"
              cy="40"
              r={radius}
              stroke={color}
              strokeWidth="6"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
            />
          </svg>
          <span style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '0.85rem',
            fontWeight: 700,
            color: 'var(--text-primary)'
          }}>
            {score}%
          </span>
        </div>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center' }}>{label}</span>
      </div>
    );
  };

  return (
    <div>
      <header style={{ marginBottom: '2rem' }}>
        <h1>Interview Preparation</h1>
      </header>

      {/* Styled global voice elements */}
      <style>{`
        @keyframes pulseVoice {
          0% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.15); opacity: 0.85; }
          100% { transform: scale(1); opacity: 0.4; }
        }
        .voice-pulse-circle {
          animation: pulseVoice 1.4s infinite ease-in-out;
        }
      `}</style>

      {/* 1. Overall Session Evaluation Dashboard */}
      {overallEvaluation ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Verdict Banner Card */}
          <Card style={{
            background: overallEvaluation.passed
              ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(168, 85, 247, 0.05) 100%)'
              : 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(168, 85, 247, 0.05) 100%)',
            border: `1px solid ${overallEvaluation.passed ? 'var(--success)' : 'var(--danger)'}`,
            padding: '2rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
              <div>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  padding: '0.25rem 0.625rem',
                  borderRadius: '12px',
                  backgroundColor: overallEvaluation.passed ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: overallEvaluation.passed ? 'var(--success)' : 'var(--danger)',
                  marginBottom: '0.75rem'
                }}>
                  {overallEvaluation.passed ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
                  Decision: {overallEvaluation.passed ? 'PASS' : 'FAIL'}
                </span>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {overallEvaluation.passed
                    ? 'Congratulations! You passed the live panel criteria.'
                    : 'Unsuccessful this time. Optimized coaching points recommended below.'}
                </h2>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem', maxWidth: '600px', lineHeight: '1.5' }}>
                  {overallEvaluation.summary}
                </p>
              </div>

              {/* Radial Gauges Grid */}
              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                {renderGauge('Overall Fit', overallEvaluation.score, 'var(--accent)')}
                {renderGauge('Technical Depth', overallEvaluation.technicalDepth, 'var(--success)')}
                {renderGauge('Communication', overallEvaluation.communicationStyle, 'var(--warning)')}
                {renderGauge('Behavioral', overallEvaluation.behavioralAlignment, 'rgba(168, 85, 247, 1)')}
              </div>
            </div>
          </Card>

          {/* Strengths & Weaknesses Grid */}
          <div className="grid-2">
            <Card title="Key Strengths" subtitle="Positive performance metrics parsed from responses">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '0.5rem' }}>
                {overallEvaluation.strengths.map((str, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '0.625rem', alignItems: 'start' }}>
                    <ThumbsUp size={16} style={{ color: 'var(--success)', marginTop: '0.125rem', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: '1.4' }}>{str}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Areas of Improvement" subtitle="Qualitative feedback targets for next practice run">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '0.5rem' }}>
                {overallEvaluation.weaknesses.map((weak, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '0.625rem', alignItems: 'start' }}>
                    <ThumbsDown size={16} style={{ color: 'var(--warning)', marginTop: '0.125rem', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: '1.4' }}>{weak}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Timeline Transcript View */}
          <Card title="Live Interview Conversation Transcript" subtitle="Full breakdown of spoken questions and transcribed responses">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '0.5rem' }}>
              {questions.map((q, idx) => (
                <div key={q.id} style={{ borderBottom: idx < questions.length - 1 ? '1px solid var(--border)' : 'none', paddingBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      backgroundColor: 'var(--accent-light)',
                      color: 'var(--accent)',
                      padding: '0.15rem 0.375rem',
                      borderRadius: 'var(--radius-sm)'
                    }}>{q.type}</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Q{idx + 1}. {q.question}</span>
                  </div>
                  <div style={{
                    padding: '0.85rem 1rem',
                    backgroundColor: 'var(--bg-app)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.825rem',
                    color: 'var(--text-secondary)',
                    fontStyle: answers[q.id] ? 'normal' : 'italic',
                    lineHeight: '1.5'
                  }}>
                    {answers[q.id] ? `"${answers[q.id]}"` : '(No spoken response recorded)'}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div style={{ display: 'flex', justifyContent: 'center', margin: '1rem 0' }}>
            <button onClick={() => {
              setQuestions([]);
              setOverallEvaluation(null);
              stopWebcam();
            }} className="btn btn-primary" style={{ height: '42px', padding: '0 2rem' }}>
              Start Another Practice Session
            </button>
          </div>
        </div>
      ) : questions.length === 0 ? (
        // 2. Initialize Session View
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

                {/* Session Mode Selector */}
                <div className="form-group">
                  <label className="form-label">Interview Mode</label>
                  <div style={{ display: 'flex', gap: '2rem', marginTop: '0.375rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                      <input
                        type="radio"
                        name="sessionMode"
                        checked={sessionMode === 'written'}
                        onChange={() => setSessionMode('written')}
                        style={{ cursor: 'pointer' }}
                      />
                      Written Practice (Text editor feedback)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                      <input
                        type="radio"
                        name="sessionMode"
                        checked={sessionMode === 'live-video'}
                        onChange={() => setSessionMode('live-video')}
                        style={{ cursor: 'pointer' }}
                      />
                      Live Video AI Interview (Mic & Camera)
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: '1.5rem', height: '42px', gap: '0.5rem' }}
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
      ) : sessionMode === 'live-video' && !isMediaReady ? (
        // Render Lobby / Ready Room Screen
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: '1.5rem', width: '100%' }}>
          <Card style={{ maxWidth: '600px', width: '100%', padding: '2rem', textAlign: 'center' }} title="AI Interview Ready Room" subtitle="Configure and test your camera & mic before launching the session">
            
            {/* Camera Preview Box in Lobby */}
            <div style={{ position: 'relative', width: '100%', height: '260px', borderRadius: 'var(--radius-md)', overflow: 'hidden', backgroundColor: '#0f0f15', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
              {stream && !cameraOff ? (
                <video
                  ref={lobbyVideoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', color: 'var(--text-muted)' }}>
                  <VideoOff size={40} />
                  <span style={{ fontSize: '0.85rem' }}>Camera preview is inactive</span>
                </div>
              )}

              {/* Status Overlay */}
              <div style={{
                position: 'absolute',
                top: '12px',
                left: '12px',
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                backdropFilter: 'blur(8px)',
                padding: '0.3rem 0.625rem',
                borderRadius: '8px',
                fontSize: '0.7rem',
                fontWeight: 700,
                color: stream ? 'var(--success)' : 'var(--danger)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem'
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: stream ? 'var(--success)' : 'var(--danger)' }} />
                {stream ? 'DEVICE CONNECTED' : 'AWAITING PERMISSIONS'}
              </div>
            </div>

            {/* Guide Instructions */}
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '1.5rem' }}>
              Once you enter the interview room, the AI interviewer bot will begin reading the first question aloud. You can speak your answer directly into the microphone.
            </p>

            {/* Lobby Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {stream ? (
                <button
                  type="button"
                  onClick={() => setIsMediaReady(true)}
                  className="btn btn-primary"
                  style={{ width: '100%', height: '42px', gap: '0.5rem', justifyContent: 'center' }}
                >
                  <PlayCircle size={18} />
                  <span>Start Live AI Interview Session</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startWebcam}
                  className="btn btn-primary"
                  style={{ width: '100%', height: '42px', gap: '0.5rem', justifyContent: 'center', backgroundColor: 'var(--accent)' }}
                >
                  <Video size={18} />
                  <span>Grant Camera & Mic Access</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  stopWebcam();
                  setSessionMode('written');
                }}
                className="btn btn-secondary"
                style={{ width: '100%', height: '42px', justifyContent: 'center' }}
              >
                Practice in Written Mode Instead
              </button>
            </div>

          </Card>
        </div>
      ) : sessionMode === 'live-video' && isMediaReady ? (
        // 3. NEW: Live Video Interview Interface
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start' }}>
          
          {/* Left Panel: Camera Stream Feed */}
          <Card title="Live WebCam Video Feed" subtitle="Ensure your face is centered and lit properly">
            <div style={{ position: 'relative', width: '100%', height: '340px', borderRadius: 'var(--radius-md)', overflow: 'hidden', backgroundColor: '#0f0f15', border: '1px solid var(--border)' }}>
              
              {/* Webcam Feed Video */}
              {stream && !cameraOff ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', color: 'var(--text-muted)' }}>
                  <VideoOff size={44} style={{ color: 'var(--text-muted)' }} />
                  <span style={{ fontSize: '0.85rem' }}>Webcam is turned off or blocked</span>
                </div>
              )}

              {/* Glassmorphic overlays */}
              <div style={{
                position: 'absolute',
                top: '12px',
                left: '12px',
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.08)',
                padding: '0.375rem 0.75rem',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: stream ? 'var(--success)' : 'var(--danger)'
              }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: stream ? 'var(--success)' : 'var(--danger)'
                }} />
                {stream ? 'LIVE FEED ACTIVE' : 'VIDEO INACTIVE'}
              </div>

              {/* Feed Controls Overlay */}
              {stream && (
                <div style={{
                  position: 'absolute',
                  bottom: '12px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  display: 'flex',
                  gap: '0.75rem',
                  backgroundColor: 'rgba(15, 23, 42, 0.7)',
                  backdropFilter: 'blur(10px)',
                  padding: '0.5rem 1rem',
                  borderRadius: '20px',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>
                  <button type="button" onClick={toggleMic} style={{
                    backgroundColor: micMuted ? 'var(--danger)' : 'rgba(255, 255, 255, 0.1)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}>
                    {micMuted ? <MicOff size={16} /> : <Mic size={16} />}
                  </button>
                  <button type="button" onClick={toggleCamera} style={{
                    backgroundColor: cameraOff ? 'var(--danger)' : 'rgba(255, 255, 255, 0.1)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}>
                    {cameraOff ? <VideoOff size={16} /> : <Video size={16} />}
                  </button>
                </div>
              )}
            </div>

            {/* Video Help Guide */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', padding: '0.85rem 1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-app)' }}>
              <Sparkles size={16} style={{ color: 'var(--accent)', marginTop: '0.15rem', flexShrink: 0 }} />
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>Live AI Coach Feedback</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>The AI evaluates structural coherence, STAR methodologies, and language keyword density based on the final transcript.</span>
              </div>
            </div>
          </Card>

          {/* Right Panel: Bot Audio Control and Real-time Speech-to-Text */}
          <Card title={`Live Panel Interrogator — Question ${selectedIdx + 1} of ${questions.length}`} subtitle="Bot interview session console">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Bot Interaction Banner */}
              <div style={{
                padding: '1.25rem',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--bg-app)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', zIndex: 2 }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: isBotSpeaking ? 'var(--accent-light)' : isUserAnswering ? 'rgba(239, 68, 68, 0.1)' : 'var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isBotSpeaking ? 'var(--accent)' : isUserAnswering ? 'var(--danger)' : 'var(--text-muted)'
                  }} className={isBotSpeaking || isUserAnswering ? 'voice-pulse-circle' : ''}>
                    {isBotSpeaking ? <Volume2 size={20} /> : isUserAnswering ? <Mic size={20} /> : <Activity size={20} />}
                  </div>
                  <div>
                    <span style={{
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      color: isBotSpeaking ? 'var(--accent)' : isUserAnswering ? 'var(--danger)' : 'var(--text-secondary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      {isBotSpeaking ? 'AI Bot Speaking...' : isUserAnswering ? '🎤 Recording Answer...' : 'Console Idle'}
                    </span>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {isBotSpeaking ? 'Listen to the interview prompt' : isUserAnswering ? 'Speak clearly into your microphone' : 'Select a question to start'}
                    </span>
                  </div>
                </div>

                {/* Pulse wave indicators */}
                {isUserAnswering && (
                  <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                    <span style={{ width: '3px', height: '14px', backgroundColor: 'var(--danger)', borderRadius: '2px', animation: 'pulseVoice 1s infinite alternate ease-in-out' }} />
                    <span style={{ width: '3px', height: '22px', backgroundColor: 'var(--danger)', borderRadius: '2px', animation: 'pulseVoice 0.8s infinite alternate ease-in-out' }} />
                    <span style={{ width: '3px', height: '12px', backgroundColor: 'var(--danger)', borderRadius: '2px', animation: 'pulseVoice 1.2s infinite alternate ease-in-out' }} />
                  </div>
                )}
              </div>

              {/* Question Text block */}
              {activeQuestion && (
                <div style={{ borderLeft: '3px solid var(--accent)', paddingLeft: '1rem', margin: '0.5rem 0' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Question {selectedIdx + 1} ({activeQuestion.type})</span>
                  <p style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.25rem', lineHeight: '1.5' }}>
                    "{activeQuestion.question}"
                  </p>
                </div>
              )}

              {/* Live Transcription Box */}
              <div className="form-group">
                <label className="form-label">Real-time Speech Transcript</label>
                <textarea
                  value={answers[activeQuestion?.id] || ''}
                  onChange={e => setAnswers({ ...answers, [activeQuestion.id]: e.target.value })}
                  className="form-input form-textarea"
                  placeholder="Your transcribed voice text will populate here in real-time as you speak..."
                  style={{ height: '150px' }}
                />
              </div>

              {/* Live Navigation Panel */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedIdx > 0) {
                      setSelectedIdx(selectedIdx - 1);
                    }
                  }}
                  disabled={selectedIdx === 0}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8rem', height: '36px' }}
                >
                  Previous Question
                </button>

                {selectedIdx < questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      stopListening();
                      setSelectedIdx(selectedIdx + 1);
                    }}
                    className="btn btn-primary"
                    style={{ fontSize: '0.8rem', height: '36px', gap: '0.375rem' }}
                  >
                    <span>Next Question</span>
                    <ChevronRight size={14} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleEvaluateSession}
                    disabled={isEvaluatingSession}
                    className="btn btn-primary"
                    style={{
                      fontSize: '0.8rem',
                      height: '36px',
                      backgroundColor: 'rgba(168, 85, 247, 1)',
                      borderColor: 'rgba(168, 85, 247, 1)',
                      color: '#fff',
                      boxShadow: '0 4px 10px rgba(168, 85, 247, 0.2)'
                    }}
                  >
                    {isEvaluatingSession ? 'Evaluating Interview...' : 'Submit Interview for Grading'}
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    window.speechSynthesis.cancel();
                    stopListening();
                    stopWebcam();
                    setQuestions([]);
                    setOverallEvaluation(null);
                  }}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Cancel Interview Session
                </button>
              </div>

            </div>
          </Card>

        </div>
      ) : (
        // 4. Written Mode view (Existing layout structure preserved)
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
              onClick={() => {
                setQuestions([]);
                setOverallEvaluation(null);
              }}
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
