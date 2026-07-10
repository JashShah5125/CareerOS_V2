// Client API utilities for AI Career Copilot

const API_BASE = ''; // Relies on Vite local proxy setup

async function request<T>(path: string, options: RequestInit = {}, retries = 2): Promise<T> {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'API Request failed');
    }

    return response.json();
  } catch (error: any) {
    if (retries > 0) {
      console.warn(`[API Client] Request to ${path} failed. Retrying in 500ms... (Remaining retries: ${retries})`, error);
      await new Promise(resolve => setTimeout(resolve, 500));
      return request<T>(path, options, retries - 1);
    }
    throw error;
  }
}

export interface UserProfile {
  id: string;
  email: string;
  credits: number;
  firstName: string;
  lastName: string;
  headline: string;
  targetRole: string;
  avatarUrl: string | null;
  isGoogleUser?: boolean;
  plan?: string;
}

export const authApi = {
  login: (credentials: any) => request<{ token: string; user: UserProfile }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials)
  }),
  register: (data: any) => request<{ token: string; user: UserProfile }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  googleLogin: (credential: string) => request<{ token: string; user: UserProfile }>('/api/auth/google', {
    method: 'POST',
    body: JSON.stringify({ credential })
  }),
  forgotPassword: (email: string) => request<{ message: string }>('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email })
  }),
  getProfile: () => request<UserProfile>('/api/auth/profile'),
  updateProfile: (profile: Partial<UserProfile>) => request<{ message: string; user: UserProfile }>('/api/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(profile)
  }),
  addCredits: (amount: number, transactionId?: string, price?: number) => request<{ credits: number }>('/api/auth/add-credits', {
    method: 'POST',
    body: JSON.stringify({ amount, transactionId, price })
  })
};

export interface ResumeAnalysis {
  id: string;
  title: string;
  score: number;
  atsScore: number;
  formattingAnalysis: { rating: string; score: number; issues: string[]; details: string };
  grammarAnalysis: { rating: string; score: number; issues: string[]; details: string };
  skillAnalysis: { rating: string; score: number; identifiedSkills: string[]; missingSkills: string[]; details: string };
  projectAnalysis: { rating: string; score: number; details: string; recommendations: string[] };
  experienceAnalysis: { rating: string; score: number; details: string; recommendations: string[] };
  achievementAnalysis: { rating: string; score: number; details: string; recommendations: string[] };
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
}

export interface JobMatchAnalysis {
  id: string;
  matchScore: number;
  requiredSkills: string[];
  missingSkills: string[];
  experienceMatch: { status: string; required: string; detected: string; feedback: string };
  educationMatch: { status: string; required: string; detected: string; feedback: string };
  recommendationSummary: string;
  jobInsights?: { salaryEstimate: string; roleLevel: string; companyInsight: string };
}

export interface CoverLetterResult {
  id: string;
  company: string;
  role: string;
  content: string;
  downloadUrl: string;
}

export const resumeApi = {
  getLatest: () => request<ResumeAnalysis | null>('/api/resume/latest'),
  // exact root paths requested
  analyze: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('token');
    return fetch('/analyze_resume', {
      method: 'POST',
      body: formData,
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    }).then(res => {
      if (!res.ok) {
        return res.json().then(err => {
          throw new Error(err.error || 'Failed to analyze resume file.');
        });
      }
      return res.json() as Promise<ResumeAnalysis>;
    });
  },
  calculateAts: (resumeText: string, jobDescription: string) => request<{ atsScore: number; parsedSkillsFound: string[]; parsedSkillsMissing: string[]; formattingIssuesFound: string[]; compatibilityReport: string }>('/calculate_ats_score', {
    method: 'POST',
    body: JSON.stringify({ resumeText, jobDescription })
  }),
  analyzeJob: (jobDescription: string, resumeText?: string) => request<JobMatchAnalysis>('/analyze_job', {
    method: 'POST',
    body: JSON.stringify({ jobDescription, resumeText })
  }),
  generateCoverLetter: (data: { company: string; role: string; jobDescription: string; resumeText?: string }) => request<CoverLetterResult>('/api/cover-letter/generate', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  generateInterviewQuestions: (data: { role: string; company?: string; difficulty?: string }) => request<{ id: string; role: string; company: string; questions: Array<{ id: string; type: string; question: string; idealAnswer: string }> }>('/api/interview/generate', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  submitAnswerFeedback: (data: { sessionId?: string; questionId: string; questionText: string; userAnswer: string }) => request<{ questionId: string; score: number; evaluation: string; suggestions: string[]; modelAnswer: string }>('/api/interview/feedback', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  getInterviewHistory: () => request<Array<{ id: string; role: string; company: string; date: string; score: number }>>('/api/interview/history'),
  getInterviewSessionDetail: (id: string) => request<{ id: string; type: string; questions: Array<{ id: string; type: string; question: string; idealAnswer: string }>; feedback: Record<string, any>; meta: any }>(`/api/interview/session/${id}`),
  saveInterviewAnswers: (id: string, answers: Record<string, string>) => request<{ success: boolean }>(`/api/interview/session/${id}/answers`, {
    method: 'POST',
    body: JSON.stringify({ answers })
  })
};

export interface JobDescriptionRecord {
  id: string;
  title: string;
  company: string;
  description: string;
  createdAt: string;
}

export const jobApi = {
  list: () => request<JobDescriptionRecord[]>('/api/jobs'),
  create: (data: { title: string; company: string; description: string }) => request<JobDescriptionRecord>('/api/jobs', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  delete: (id: string) => request<{ message: string }>(`/api/jobs/${id}`, {
    method: 'DELETE'
  })
};

export interface ApplicationCard {
  id: string;
  jobId?: string | null;
  candidateName?: string;
  candidateEmail?: string;
  candidatePhone?: string;
  company: string;
  role: string;
  salary: string;
  status: 'APPLIED' | 'ASSESSMENT' | 'INTERVIEW' | 'OFFER' | 'REJECTED';
  deadline: string | null;
  applicationDate: string;
  interviewDate: string | null;
  notes: string;
}

export const trackerApi = {
  list: (jobId?: string) => request<ApplicationCard[]>(jobId ? `/api/applications?jobId=${jobId}` : '/api/applications'),
  create: (app: Partial<ApplicationCard>) => request<ApplicationCard>('/api/applications', {
    method: 'POST',
    body: JSON.stringify(app)
  }),
  update: (id: string, updates: Partial<ApplicationCard>) => request<ApplicationCard>(`/api/applications/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  }),
  delete: (id: string) => request<{ message: string }>(`/api/applications/${id}`, {
    method: 'DELETE'
  })
};

export interface SettingsData {
  theme: string;
  notifications: { emailAlerts: boolean; deadlineReminders: boolean; weeklySummary: boolean };
  subscription: { plan: string; status: string; billingPeriod: string; price: string; nextBillingDate: string };
  billing: { cardBrand: string; last4: string; billingEmail: string };
}

export const settingsApi = {
  get: () => request<SettingsData>('/api/settings'),
  update: (settings: Partial<SettingsData>) => request<{ message: string; updatedSettings: SettingsData }>('/api/settings', {
    method: 'PUT',
    body: JSON.stringify(settings)
  })
};

export interface AtsAnalysisResult {
  overallScore: number;
  isDomainMismatch?: boolean;
  domainMismatchMessage?: string;
  subScores: {
    formatting: number;
    keywordMatch: number;
    experienceMatch: number;
    projects: number;
    education: number;
    softSkills: number;
  };
  strengthMetrics: {
    atsParsing: number;
    technicalSkills: number;
    projects: number;
    experience: number;
    quantifiedResults: number;
  };
  keywordDensity: Array<{
    keyword: string;
    countInJd: number;
    countInResume: number;
    importance: 'REQUIRED' | 'PREFERRED' | 'CONTEXTUAL' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    explanation: string;
  }>;
  scoreDeductions: Array<{
    factor: string;
    points: number;
    pointsDisplay?: string;
    description: string;
  }>;
  tailoredBulletPoints: Array<{
    section: string;
    originalContext: string;
    suggestedBullet: string;
  }>;
  matchedKeywords: string[];
  missingKeywords: string[];
  redFlags: string[];
  atsCompatibility?: number;
  jobMatchScore?: number;
  resumeQuality?: number;
  complianceChecklist: {
    hasContactInfo: boolean;
    isSingleColumn: boolean;
    hasWorkHistory: boolean;
    hasSkillsSection: boolean;
    noGraphics: boolean;
    hasSummarySection: boolean;
    hasAddress: boolean;
    friendlyHeadings: boolean;
    standardDateFormats: boolean;
    jobTitleMentioned: boolean;
    quantifiedAchievements: boolean;
    idealWordCount: boolean;
  };
  improvementSuggestions: string[];
  candidateDetails?: {
    candidateName: string;
    candidateEmail: string;
    candidatePhone: string;
  };
  jobDetails?: {
    company: string;
    role: string;
  };
}

export const atsApi = {
  analyzeCustom: (resume: File | string, jobDescription: string) => {
    const token = localStorage.getItem('token');
    if (resume instanceof File) {
      const formData = new FormData();
      formData.append('file', resume);
      formData.append('jobDescription', jobDescription);
      return fetch('/api/ats/analyze', {
        method: 'POST',
        body: formData,
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      }).then(res => {
        if (!res.ok) throw new Error('ATS analysis failed');
        return res.json() as Promise<AtsAnalysisResult>;
      });
    } else {
      return request<AtsAnalysisResult>('/api/ats/analyze', {
        method: 'POST',
        body: JSON.stringify({ resumeText: resume, jobDescription })
      });
    }
  },
  parseFile: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('token');
    return fetch('/api/ats/parse-file', {
      method: 'POST',
      body: formData,
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    }).then(res => {
      if (!res.ok) {
        return res.json().then(err => {
          throw new Error(err.error || 'Failed to extract text from file.');
        });
      }
      return res.json() as Promise<{ text: string }>;
    });
  }
};

export interface ModelStatusData {
  status: 'ONLINE' | 'OFFLINE';
  model: string;
  ollamaUrl: string;
  modelPulled: boolean;
  availableModels: string[];
  error?: string;
}

export const modelApi = {
  getStatus: () => request<ModelStatusData>('/api/model/status')
};
