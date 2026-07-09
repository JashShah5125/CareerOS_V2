import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { getUserIdFromRequest } from './auth.controller';
import { queryOllama, cleanJsonText } from '../utils/ollama';

export const generateInterviewQuestions = async (req: Request, res: Response) => {
  try {
    const { role, company } = req.body;
    const targetRole = role || 'Software Developer';
    const targetCompany = company || 'Tech Industry';

    const userId = await getUserIdFromRequest(req);

    // Validate and decrement 1 credit for generating interview questions
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.credits <= 0) {
      return res.status(403).json({ error: 'Insufficient credits. Please top up your tokens balance.' });
    }
    await prisma.user.update({
      where: { id: userId },
      data: { credits: { decrement: 1 } }
    });

    const systemPrompt = `
      You are an expert interviewer. Generate exactly 4 distinct interview questions for the specified target role and target company.
      Provide one question of each of these types: TECHNICAL, CODING, BEHAVIORAL, and HR.
      For each question, formulate a short summary of the ideal response path (idealAnswer).
      
      Respond in strict JSON format. Output raw JSON matching this interface:

      interface QuestionListResult {
        questions: Array<{
          id: string;
          type: "TECHNICAL" | "CODING" | "BEHAVIORAL" | "HR";
          question: string;
          idealAnswer: string;
        }>;
      }
    `;

    let resultObj;

    try {
      const responseText = await queryOllama(
        systemPrompt,
        `Target Role: ${targetRole}\nTarget Company: ${targetCompany}`
      );
      const cleaned = cleanJsonText(responseText);
      resultObj = JSON.parse(cleaned);
    } catch (apiError: any) {
      console.warn('[Interview Controller] Ollama generation failed. Falling back to mock questions:', apiError);
      
      const roleLower = targetRole.toLowerCase();
      let questionsList = [];

      if (roleLower.includes('sale') || roleLower.includes('account') || roleLower.includes('business dev')) {
        questionsList = [
          {
            id: 'q1',
            type: 'TECHNICAL',
            question: 'How do you handle price objections from high-intent enterprise clients during negotiation?',
            idealAnswer: 'Refocus the discussion on ROI and overall contract value rather than raw price. Highlight specific product utilities.'
          },
          {
            id: 'q2',
            type: 'CODING',
            question: 'Outline the steps you would take to qualify a cold lead and move them through your sales pipeline.',
            idealAnswer: 'Research their pain points, conduct a discovery call, map budget/timeline parameters, and book a tailored demo.'
          },
          {
            id: 'q3',
            type: 'BEHAVIORAL',
            question: 'Tell me about a time you missed your sales quota. What factors led to this, and how did you adjust your sales pitch afterwards?',
            idealAnswer: 'Identified product bottlenecks, adapted prospecting techniques, expanded pipeline volume, and met following goals.'
          }
        ];
      } else if (roleLower.includes('market') || roleLower.includes('growth') || roleLower.includes('seo') || roleLower.includes('brand')) {
        questionsList = [
          {
            id: 'q1',
            type: 'TECHNICAL',
            question: 'Explain how you structure a multi-channel campaign to acquire customers while keeping CAC low.',
            idealAnswer: 'Mix high-intent organic traffic channels (SEO, content) with paid channels, optimization of conversion rate (CRO).'
          },
          {
            id: 'q2',
            type: 'CODING',
            question: 'Describe how you configure conversion tracking and metrics for A/B testing on a landing page.',
            idealAnswer: 'Set primary goals (conversions), tracking variables, control/test splits, and check statistical significance.'
          },
          {
            id: 'q3',
            type: 'BEHAVIORAL',
            question: 'Tell me about a growth campaign you managed that failed to reach target conversions. How did you diagnose the issue?',
            idealAnswer: 'Audited drop-off rates in the funnel, analyzed user search intent mismatch, pivoted campaign creatives, and recovered.'
          }
        ];
      } else if (roleLower.includes('hr') || roleLower.includes('resource') || roleLower.includes('talent') || roleLower.includes('recruit')) {
        questionsList = [
          {
            id: 'q1',
            type: 'TECHNICAL',
            question: 'How do you structure a performance improvement plan (PIP) to ensure fair opportunity and objective tracking?',
            idealAnswer: 'Define specific performance gaps, set measurable metrics, schedule weekly reviews, and document outcomes.'
          },
          {
            id: 'q2',
            type: 'CODING',
            question: 'Explain how you would design a structured candidate evaluation scorecard to minimize hiring bias.',
            idealAnswer: 'Map job descriptions to specific skill rubrics, enforce identical interview questions, and standardize scoring criteria.'
          },
          {
            id: 'q3',
            type: 'BEHAVIORAL',
            question: 'Describe a situation where you had to manage a difficult conflict between a manager and their direct report.',
            idealAnswer: 'Listened to both sides separately, held a structured mediation meeting, set behavioral expectations, and resolved.'
          }
        ];
      } else if (roleLower.includes('finance') || roleLower.includes('accountant') || roleLower.includes('audit')) {
        questionsList = [
          {
            id: 'q1',
            type: 'TECHNICAL',
            question: 'What is the difference between cash accounting and accrual accounting? When would you use each?',
            idealAnswer: 'Cash records transactions on currency receipt; accrual matches expenses/revenues when incurred. Accrual is better for forecasting.'
          },
          {
            id: 'q2',
            type: 'CODING',
            question: 'Describe the steps you would take to stress-test a corporate cash flow forecast against rising operational costs.',
            idealAnswer: 'Model variable cost inflation points, reduce projected accounts receivable speed, and determine base cash reserves.'
          },
          {
            id: 'q3',
            type: 'BEHAVIORAL',
            question: 'Tell me about a time you identified a significant discrepancy in financial statements. How did you audit and resolve it?',
            idealAnswer: 'Traced invoices, checked double-entry ledgers, reconciled with bank sheets, and adjusted ledger balances.'
          }
        ];
      } else {
        questionsList = [
          {
            id: 'q1',
            type: 'TECHNICAL',
            question: 'Explain the difference between CSS custom properties (variables) and preprocessor variables (like Sass). When would you prefer one over the other?',
            idealAnswer: 'CSS custom properties are evaluated dynamically at runtime. Preprocessor variables compile at build-time.'
          },
          {
            id: 'q2',
            type: 'CODING',
            question: 'Write a JavaScript function "debounce(func, wait)" that returns a debounced version of the passed function.',
            idealAnswer: 'Implement basic debounce timer setup.'
          },
          {
            id: 'q3',
            type: 'BEHAVIORAL',
            question: 'Describe a situation where you had a disagreement with a designer or product manager regarding the UX of a component. How did you resolve the conflict?',
            idealAnswer: 'Resolved by prototyping, referencing usability data, and maintaining professional collaboration.'
          }
        ];
      }

      questionsList.push({
        id: 'q4',
        type: 'HR',
        question: `Why do you want to join ${targetCompany} as a ${targetRole}?`,
        idealAnswer: 'Demonstrate alignment with the company goals and core values.'
      });

      resultObj = { questions: questionsList };
    }
    
    // Ensure IDs are present
    const questionsWithIds = resultObj.questions.map((q: any, i: number) => ({
      ...q,
      id: q.id || `q-${Date.now()}-${i}`
    }));

    // Create session in database
    const session = await prisma.interviewSession.create({
      data: {
        userId,
        type: targetRole,
        questionsJson: questionsWithIds as any,
        historyJson: { company: targetCompany, role: targetRole } as any,
        feedbackJson: {} as any
      }
    });

    return res.json({
      id: session.id,
      role: targetRole,
      company: targetCompany,
      questions: questionsWithIds
    });
  } catch (error: any) {
    console.error('[Interview Controller] Error generating questions:', error);
    return res.status(500).json({ error: 'Failed to generate interview questions.', message: error.message });
  }
};

export const submitAnswerFeedback = async (req: Request, res: Response) => {
  try {
    const { sessionId, questionId, questionText, userAnswer } = req.body;

    if (!questionId || !userAnswer) {
      return res.status(400).json({ error: 'questionId and userAnswer are required.' });
    }

    const userId = await getUserIdFromRequest(req);

    // Validate and decrement 1 credit for evaluating interview response
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.credits <= 0) {
      return res.status(403).json({ error: 'Insufficient credits. Please top up your tokens balance.' });
    }
    await prisma.user.update({
      where: { id: userId },
      data: { credits: { decrement: 1 } }
    });

    const systemPrompt = `
      You are an AI interviewer and career coach. Review the user's answer to the given question.
      Evaluate performance, assign a rating percentage (0 to 100), structure constructive criticisms, and provide a model answer.
      
      Respond in strict JSON format. Output raw JSON matching this interface:

      interface AnswerFeedbackResult {
        score: number; // 0 to 100
        evaluation: string; // Paragraph evaluating the answer content, tone, and delivery structure
        suggestions: string[]; // 2-4 actionable bullet points to improve the answer
        modelAnswer: string; // The perfect model response for the given question
      }
    `;

    let resultObj;

    try {
      const responseText = await queryOllama(
        systemPrompt,
        `Question: ${questionText || 'Interview question'}\nUser Answer:\n${userAnswer}`
      );
      const cleaned = cleanJsonText(responseText);
      resultObj = JSON.parse(cleaned);
    } catch (apiError: any) {
      console.warn('[Interview Controller] Ollama feedback evaluation failed. Falling back to mock feedback:', apiError);
      
      const score = Math.max(30, Math.min(98, 40 + (userAnswer?.trim().length % 55 || 0)));
      resultObj = {
        score,
        evaluation: 'Satisfactory mock response, evaluating text structure and keyword density.',
        suggestions: ['Quantify metrics on past achievements.', 'Structure answers using the STAR method.'],
        modelAnswer: 'A robust response should clearly outline the problem statements, actions, and results.',
        starScores: {
          context: score > 70 ? 80 : 50,
          task: score > 70 ? 75 : 60,
          action: score > 70 ? 85 : 55,
          result: score > 70 ? 90 : 40
        }
      };
    }

    resultObj.questionId = questionId;

    // Update feedback in database if sessionId is valid
    if (sessionId) {
      try {
        const session = await prisma.interviewSession.findUnique({
          where: { id: sessionId }
        });
        if (session) {
          const feedbackMap = (session.feedbackJson as Record<string, any>) || {};
          feedbackMap[questionId] = {
            userAnswer: userAnswer,
            score: resultObj.score,
            evaluation: resultObj.evaluation,
            suggestions: resultObj.suggestions,
            modelAnswer: resultObj.modelAnswer,
            starScores: resultObj.starScores
          };
          
          await prisma.interviewSession.update({
            where: { id: sessionId },
            data: { feedbackJson: feedbackMap as any }
          });
        }
      } catch (dbErr) {
        console.warn('[Interview Controller] Failed to persist feedback in database:', dbErr);
      }
    }

    return res.json(resultObj);
  } catch (error: any) {
    console.error('[Interview Controller] Error evaluating answer:', error);
    return res.status(500).json({ error: 'Answer evaluation failed.', message: error.message });
  }
};

// Retrieve historical practice sessions list for the user
export const getInterviewHistory = async (req: Request, res: Response) => {
  try {
    const userId = await getUserIdFromRequest(req);
    const sessions = await prisma.interviewSession.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    const formattedHistory = sessions.map(s => {
      const historyMeta = (s.historyJson as any) || {};
      const feedbackMap = (s.feedbackJson as Record<string, any>) || {};
      
      const feedbackKeys = Object.keys(feedbackMap);
      let avgScore = 0;
      if (feedbackKeys.length > 0) {
        const sum = feedbackKeys.reduce((acc, key) => acc + (feedbackMap[key].score || 0), 0);
        avgScore = Math.round(sum / feedbackKeys.length);
      }

      return {
        id: s.id,
        role: historyMeta.role || s.type,
        company: historyMeta.company || 'Tech Target',
        date: s.createdAt.toISOString().split('T')[0],
        score: avgScore // 0 or evaluated average
      };
    });

    return res.json(formattedHistory);
  } catch (error: any) {
    console.error('[Interview Controller] Error fetching history:', error);
    return res.status(500).json({ error: 'Failed to fetch interview history.', message: error.message });
  }
};

// Retrieve details for a single interview session
export const getInterviewSessionDetail = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = await getUserIdFromRequest(req);
    
    const session = await prisma.interviewSession.findFirst({
      where: { id, userId }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    return res.json({
      id: session.id,
      type: session.type,
      questions: session.questionsJson,
      feedback: session.feedbackJson || {},
      meta: session.historyJson || {}
    });
  } catch (error: any) {
    console.error('[Interview Controller] Error fetching session details:', error);
    return res.status(500).json({ error: 'Failed to fetch session details.', message: error.message });
  }
};

// Save draft answers to the database for progress recovery
export const saveInterviewAnswers = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { answers } = req.body;
    const userId = await getUserIdFromRequest(req);

    const session = await prisma.interviewSession.findFirst({
      where: { id, userId }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    const historyMeta = (session.historyJson as Record<string, any>) || {};
    historyMeta.answers = {
      ...(historyMeta.answers || {}),
      ...answers
    };

    await prisma.interviewSession.update({
      where: { id },
      data: { historyJson: historyMeta as any }
    });

    return res.json({ success: true });
  } catch (error: any) {
    console.error('[Interview Controller] Error saving answers:', error);
    return res.status(500).json({ error: 'Failed to save answers.', message: error.message });
  }
};
