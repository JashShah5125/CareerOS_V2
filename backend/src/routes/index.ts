import { Router } from 'express';
import { login, register, googleLogin, forgotPassword, getProfile, updateProfile, addCredits } from '../controllers/auth.controller';
import { analyzeResume, tailorResume, calculateAtsScore, getLatestResume } from '../controllers/resume.controller';
import { analyzeJob } from '../controllers/job.controller';
import { generateCoverLetter } from '../controllers/coverletter.controller';
import { generateInterviewQuestions, submitAnswerFeedback, getInterviewHistory, getInterviewSessionDetail, saveInterviewAnswers } from '../controllers/interview.controller';
import { getApplications, createApplication, updateApplication, deleteApplication } from '../controllers/tracker.controller';
import { getSettings, updateSettings, getModelStatus } from '../controllers/settings.controller';
import { analyzeAtsCustom } from '../controllers/ats.controller';
import { extractTextFromBuffer } from '../services/parser.service';

import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Exact root-level placeholders as requested by prompt
router.post('/analyze_resume', upload.single('file'), analyzeResume);
router.post('/analyze_job', analyzeJob);
router.post('/generate_cover_letter', generateCoverLetter);
router.post('/tailor_resume', tailorResume);
router.post('/generate_interview_questions', generateInterviewQuestions);
router.post('/calculate_ats_score', calculateAtsScore);

// Modular Routes Grouped
// Auth
router.post('/api/auth/login', login);
router.post('/api/auth/register', register);
router.post('/api/auth/google', googleLogin);
router.post('/api/auth/forgot-password', forgotPassword);
router.get('/api/auth/profile', getProfile);
router.put('/api/auth/profile', updateProfile);
router.post('/api/auth/add-credits', addCredits);

// Resume aliases for nested modular design
router.post('/api/resume/analyze', upload.single('file'), analyzeResume);
router.post('/api/resume/tailor', tailorResume);
router.post('/api/resume/calculate-ats', calculateAtsScore);
router.get('/api/resume/latest', getLatestResume);
router.post('/api/ats/analyze', analyzeAtsCustom);
router.post('/api/ats/parse-file', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }
  try {
    const text = await extractTextFromBuffer(req.file.buffer, req.file.mimetype);
    return res.json({ text });
  } catch (error: any) {
    console.error('[ATS Routes] File parsing failed:', error);
    return res.status(500).json({ error: 'Failed to parse file text.', message: error.message });
  }
});

// Job aliases
router.post('/api/job/analyze', analyzeJob);

// Cover Letter
router.post('/api/cover-letter/generate', generateCoverLetter);

// Interview
router.post('/api/interview/generate', generateInterviewQuestions);
router.post('/api/interview/feedback', submitAnswerFeedback);
router.get('/api/interview/history', getInterviewHistory);
router.get('/api/interview/session/:id', getInterviewSessionDetail);
router.post('/api/interview/session/:id/answers', saveInterviewAnswers);

// Applications Tracker (Kanban)
router.get('/api/applications', getApplications);
router.post('/api/applications', createApplication);
router.put('/api/applications/:id', updateApplication);
router.delete('/api/applications/:id', deleteApplication);

// Settings
router.get('/api/settings', getSettings);
router.put('/api/settings', updateSettings);
router.get('/api/model/status', getModelStatus);

export default router;
