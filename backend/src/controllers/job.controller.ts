import { Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '../prisma';
import { getUserIdFromRequest } from './auth.controller';

const getGenAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'AIzaSyYourGeminiApiKeyHere' || apiKey.includes('YourGeminiApiKey')) {
    return null;
  }
  return new GoogleGenerativeAI(apiKey);
};

export const analyzeJob = async (req: Request, res: Response) => {
  try {
    const { jobDescription, resumeText, company, title } = req.body;
    const genAI = getGenAI();
    const userId = await getUserIdFromRequest(req);

    const jobTitle = title || 'Target Role';
    const companyName = company || 'Target Company';

    if (!genAI) {
      console.warn('[Job Controller] Gemini API key not found. Using mock job matching fallback.');
      
      const mockResult = {
        id: `mock-job-analysis-${Date.now()}`,
        matchScore: 68,
        requiredSkills: ['React', 'TypeScript', 'Vanilla CSS', 'Node.js', 'PostgreSQL', 'Docker', 'AWS'],
        missingSkills: ['Docker', 'AWS'],
        experienceMatch: {
          status: 'Partial Match',
          required: '3+ years of development experience',
          detected: '2 years of professional experience',
          feedback: 'You meet the core duration, but lack cloud scaling specifics.'
        },
        educationMatch: {
          status: 'Match',
          required: 'B.S. in Computer Science',
          detected: 'B.S. in Computer Science',
          feedback: 'Educational credentials fully satisfy this posting.'
        },
        recommendationSummary: 'Your resume shows strong React foundation, but you are missing Docker and AWS deployment details. We recommend tailoring your resume to include these container elements.',
        jobInsights: {
          salaryEstimate: '$120,000 - $140,000',
          roleLevel: 'Mid-Level',
          companyInsight: 'Strong tech-centric developer culture with containerized deployments.'
        }
      };

      // Save to database
      try {
        await prisma.job.create({
          data: {
            userId,
            title: jobTitle,
            company: companyName,
            description: jobDescription || 'Mock description',
            matchScore: mockResult.matchScore,
            reqSkills: mockResult.requiredSkills,
            missingSkills: mockResult.missingSkills,
            expMatch: mockResult.experienceMatch.feedback,
            eduMatch: mockResult.educationMatch.feedback,
            recommendationSummary: mockResult.recommendationSummary
          }
        });
      } catch (dbErr) {
        console.warn('[Job Controller] Failed to save mock job in database:', dbErr);
      }

      return res.json(mockResult);
    }

    if (!jobDescription) {
      return res.status(400).json({ error: 'jobDescription is required.' });
    }

    const defaultResume = `
      JANE DOE | (123) 456-7890 | jane.doe@example.com
      SUMMARY: Frontend Software Engineer with 4 years experience in React, TypeScript, and Vanilla CSS. 
      EXPERIENCE: TechCorp Inc. (React integrations, API links, REST architectures).
      SKILLS: React, TypeScript, Node.js, Express, Vanilla CSS, REST APIs, PostgreSQL, Git.
    `;

    const inputResume = resumeText || defaultResume;

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: 'application/json' }
    });

    const systemPrompt = `
      You are an expert technical parser. Compare the user's resume details with the target job posting description.
      You must respond in strict JSON format. Output raw JSON matching this interface:

      interface JobMatchResult {
        matchScore: number; // 0 to 100
        requiredSkills: string[];
        missingSkills: string[];
        experienceMatch: { status: string; required: string; detected: string; feedback: string };
        educationMatch: { status: string; required: string; detected: string; feedback: string };
        recommendationSummary: string;
        jobInsights: { salaryEstimate: string; roleLevel: string; companyInsight: string };
      }
    `;

    const response = await model.generateContent([
      { text: systemPrompt },
      { text: `Resume Content:\n${inputResume}\n\nJob Description:\n${jobDescription}` }
    ]);

    const resultObj = JSON.parse(response.response.text());
    resultObj.id = `job-match-${Date.now()}`;

    // Save to database
    try {
      await prisma.job.create({
        data: {
          userId,
          title: jobTitle,
          company: companyName,
          description: jobDescription,
          matchScore: resultObj.matchScore,
          reqSkills: resultObj.requiredSkills || [],
          missingSkills: resultObj.missingSkills || [],
          expMatch: resultObj.experienceMatch?.feedback || '',
          eduMatch: resultObj.educationMatch?.feedback || '',
          recommendationSummary: resultObj.recommendationSummary || ''
        }
      });
    } catch (dbErr) {
      console.warn('[Job Controller] Failed to save job in database:', dbErr);
    }

    return res.json(resultObj);
  } catch (error: any) {
    console.error('[Job Controller] Error analyzing job:', error);
    return res.status(500).json({ error: 'Job description scan failed.', message: error.message });
  }
};
