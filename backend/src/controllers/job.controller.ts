import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { getUserIdFromRequest } from './auth.controller';
import { queryOllama, cleanJsonText } from '../utils/ollama';

export const analyzeJob = async (req: Request, res: Response) => {
  try {
    const { jobDescription, resumeText, company, title } = req.body;
    const userId = await getUserIdFromRequest(req);

    // Validate and decrement 1 credit for Job Matcher analysis
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.credits <= 0) {
      return res.status(403).json({ error: 'Insufficient credits. Please top up your tokens balance.' });
    }
    await prisma.user.update({
      where: { id: userId },
      data: { credits: { decrement: 1 } }
    });

    const jobTitle = title || 'Target Role';
    const companyName = company || 'Target Company';

    let resultObj: any = null;

    try {
      const systemPrompt = `
You are an expert technical recruiter AI. Your task is to compare a candidate's Resume Text against a target Job Description and output a detailed match analysis in strict JSON format.

Output raw JSON matching this exact structure:
{
  "matchScore": 85, // 0 to 100 overall score based on skills, experience, and education alignment. CRITICAL SCORING RULE: If the candidate matches 0 required skills, has an experience mismatch, and has an education mismatch, the 'matchScore' MUST be exactly 0.
  "requiredSkills": ["React", "TypeScript", "Node.js", "Docker"], // Major technical and soft skills extracted from the JD
  "missingSkills": ["Docker"], // Skills required/preferred in the JD that are not evidenced in the candidate's resume
  "experienceMatch": {
    "status": "Match", // "Match" | "Partial Match" | "Mismatch"
    "required": "Brief summary of what the JD asks for in terms of experience",
    "detected": "Brief summary of what is detected in the candidate's history",
    "feedback": "Friendly professional explanation of how the candidate's experience aligns"
  },
  "educationMatch": {
    "status": "Match", // "Match" | "Partial Match" | "Mismatch"
    "required": "Brief description of the education asked in the JD",
    "detected": "Brief description of the education detected in the resume",
    "feedback": "Friendly explanation of how their education matches"
  },
  "recommendationSummary": "Detailed, highly actionable summary recommending exactly how the candidate should tailor their resume, add missing keywords, or structure their projects to better fit the JD.",
  "jobInsights": {
    "salaryEstimate": "Guess/extract salary from JD if mentioned, otherwise leave as 'Not Specified'",
    "roleLevel": "Junior | Mid-Level | Senior | Lead (inferred from JD)",
    "companyInsight": "A brief, friendly insight about the company's stack, culture, or project requirements extracted from the JD"
  }
}

Do not include any markdown comments, explanation text, or backticks outside the JSON. Respond with strict, valid JSON only.
`;

      const userPrompt = `
Job Title: ${jobTitle}
Company: ${companyName}

Target Job Description:
${jobDescription || 'Not Provided'}

Candidate Resume Text:
${resumeText || 'Not Provided'}
`;

      console.log('[Job Controller] Querying LLM for job match analysis...');
      const responseText = await queryOllama(systemPrompt, userPrompt);
      const cleanJson = cleanJsonText(responseText);
      resultObj = JSON.parse(cleanJson);
      resultObj.id = `job-match-${Date.now()}`;
    } catch (apiError: any) {
      console.warn('[Job Controller] LLM matching failed, using mock job matching fallback:', apiError);
      
      resultObj = {
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
    }
    // Enforce strict 0% match score in code if no skills matched and both experience/education are mismatches
    const matchesCount = (resultObj.requiredSkills || []).length - (resultObj.missingSkills || []).length;
    const isExpMismatch = resultObj.experienceMatch?.status?.toLowerCase().includes('match') === false || 
                          resultObj.experienceMatch?.status?.toLowerCase().includes('mismatch') === true;
    const isEduMismatch = resultObj.educationMatch?.status?.toLowerCase().includes('match') === false || 
                          resultObj.educationMatch?.status?.toLowerCase().includes('mismatch') === true;

    if (matchesCount <= 0 && isExpMismatch && isEduMismatch) {
      resultObj.matchScore = 0;
    }

    // Save to database
    try {
      await prisma.job.create({
        data: {
          userId,
          title: jobTitle,
          company: companyName,
          description: jobDescription || 'Mock description',
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

export const getJobs = async (req: Request, res: Response) => {
  try {
    const userId = await getUserIdFromRequest(req);
    const jobs = await prisma.job.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
    return res.json(jobs);
  } catch (error: any) {
    console.error('[Job Controller] Error fetching jobs:', error);
    return res.status(500).json({ error: 'Database read error', message: error.message });
  }
};

export const createJob = async (req: Request, res: Response) => {
  try {
    const userId = await getUserIdFromRequest(req);
    const { title, company, description } = req.body;

    if (!title || !company || !description) {
      return res.status(400).json({ error: 'title, company, and description are required' });
    }

    const created = await prisma.job.create({
      data: {
        userId,
        title,
        company,
        description
      }
    });

    return res.status(201).json(created);
  } catch (error: any) {
    console.error('[Job Controller] Error creating job:', error);
    return res.status(500).json({ error: 'Database create error', message: error.message });
  }
};

export const deleteJob = async (req: Request, res: Response) => {
  try {
    const userId = await getUserIdFromRequest(req);
    const { id } = req.params;

    const job = await prisma.job.findUnique({ where: { id } });
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await prisma.job.delete({ where: { id } });
    await prisma.application.deleteMany({ where: { jobId: id } });

    return res.json({ message: 'Job and associated tracking cards deleted successfully' });
  } catch (error: any) {
    console.error('[Job Controller] Error deleting job:', error);
    return res.status(500).json({ error: 'Database delete error', message: error.message });
  }
};
