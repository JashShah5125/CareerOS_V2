import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { getUserIdFromRequest } from './auth.controller';
import { queryOllama, cleanJsonText } from '../utils/ollama';
import { extractTextFromBuffer } from '../services/parser.service';

const normalizeDepartment = (track: string): string => {
  const t = track.toLowerCase();
  if (t.includes('sales') || t.includes('selling') || t.includes('business development') || t.includes('bd') || t.includes('account manager') || t.includes('revenue') || t.includes('sales executive')) {
    return 'sales';
  }
  if (t.includes('software') || t.includes('developer') || t.includes('engineer') || t.includes('coding') || t.includes('tech') || t.split(/\s+/).includes('it') || t.includes('information technology') || t.includes('programmer') || t.includes('sysadmin') || t.includes('devops')) {
    return 'tech';
  }
  if (t.includes('hr') || t.includes('recruitment') || t.includes('recruiting') || t.includes('talent') || t.includes('human resources') || t.includes('payroll')) {
    return 'hr';
  }
  if (t.includes('medical') || t.includes('nurse') || t.includes('nursing') || t.includes('doctor') || t.includes('healthcare') || t.includes('clinical')) {
    return 'healthcare';
  }
  if (t.includes('accountant') || t.includes('accounting') || t.includes('finance') || t.includes('bookkeeper') || t.includes('auditor') || t.includes('tax')) {
    return 'finance';
  }
  if (t.includes('design') || t.includes('creative') || t.includes('graphic') || t.includes('illustrator') || t.includes('artist') || t.includes('ui') || t.includes('ux')) {
    return 'design';
  }
  if (t.includes('legal') || t.includes('lawyer') || t.includes('paralegal') || t.includes('compliance')) {
    return 'legal';
  }
  if (t.includes('marketing') || t.includes('advertising') || t.includes('pr') || t.includes('seo')) {
    return 'marketing';
  }
  if (t.includes('education') || t.includes('teaching') || t.includes('teacher') || t.includes('professor')) {
    return 'education';
  }
  if (t.includes('admin') || t.includes('operations') || t.includes('assistant') || t.includes('support')) {
    return 'operations';
  }
  return t;
};

// classifyTextByKeywords removed to trust LLM exclusively

export const analyzeAtsCustom = async (req: Request, res: Response) => {
  try {
    let { resumeText, jobDescription, fileBase64, fileType } = req.body;

    if (req.file) {
      resumeText = await extractTextFromBuffer(req.file.buffer, req.file.mimetype);
    } else if (fileBase64) {
      const buffer = Buffer.from(fileBase64, 'base64');
      resumeText = await extractTextFromBuffer(buffer, fileType || 'application/pdf');
    }

    if (!resumeText || !jobDescription) {
      return res.status(400).json({ error: 'Both resumeText and jobDescription are required.' });
    }

    // Initial validation passed. Domain mismatch checks are delegated to Groq semantic analysis.

    const systemPrompt = `
      You are an advanced ATS (Applicant Tracking System) parser and ranking algorithm.
      Compare the candidate's Resume Text against the target Job Description.
      Perform a deep, contextual analysis.
      
      CRITICAL INSTRUCTIONS FOR ANALYSIS:
      1. CONTEXTUAL KEYWORD MATCHING:
         - Do not perform simple substring searches. Understand synonyms and context.
         - E.g., if the resume says "Managed codebase on GitHub" or "Created repositories", count this as a match for the keyword "Git".
         - E.g., if the resume says "Utilized Model-View-Controller design pattern", count this as a match for the keyword "MVC".
      2. WEIGHTED KEYWORDS:
         - Identify the top keywords in the Job Description. Give core skills higher importance weights (e.g. core frameworks get CRITICAL/HIGH, styling details get MEDIUM/LOW).
      3. DETECT EXPERIENCE PATTERNS:
         - Look for experience indicators (e.g., terms like "version control", "pull requests", "schemas", "unit testing") to check if they have real experience.
      4. WEIGHTED ATS SCORE FORMULA:
         - Calculate the "overallScore" based strictly on the percentage of keywords and skills matched and present in the resume relative to the requirements in the job description (keywordMatch score). Ignore formatting, experience years, projects, or education in the overall score calculation.
         - overallScore = keywordMatch score.
      5. KEYWORD DENSITY MATRIX:
         - Extract at least 15 distinct core keywords, tools, frameworks, skills, or certifications from the Job Description (or as many as possible if the Job Description is very short).
         - Count the frequency of each of these keywords in the Job Description vs the Resume.
         - Provide explanations for each (e.g., "Laravel appears 10 times in the JD but is missing from your resume").
      6. SCORE DEDUCTIONS LEDGER:
         - Generate a list of positive score boosts (e.g., +10 for Summary, +12 for Contact info) and negative deductions (e.g. -18 for Missing Laravel, -8 for low word count) explaining exactly how the score was calculated.
      7. DETECT KEYWORD STUFFING:
         - If the resume repeats the same keyword multiple times in an unnatural layout (like spam lists), penalize the score and log a warning in redFlags.
      8. CUSTOM COPY-PASTE Bullet Suggestions:
         - Read the candidate's projects/experience contexts and output highly personalized, tailored resume bullet point suggestions that integrate missing keywords and metrics.
         - HUMAN-WRITING STYLE: Avoid obvious AI buzzwords and clichés (do NOT use: "spearhead", "revolutionize", "testament", "proven track record", "highly skilled", "synergy", "dynamic", "streamline", "foster", "leverage", "passionately", "expertly"). Use direct, simple action verbs (e.g. "Built", "Developed", "Wrote", "Reduced", "Optimized", "Integrated", "Fixed", "Coordinated"). E.g., "• Developed MVC modules using PHP...".
      9. CANDIDATE & JOB METADATA EXTRACTION:
         - Precisely extract the candidate's full name, email, and phone number from the Resume Text.
         - Extract or guess the target company name and role/job title from the Job Description.
      10. DOMAIN MISMATCH CHECK (CRITICAL & STRICT):
          - Categorize both the candidate's primary background and the target Job Description into exactly one of these closed-list functional departments:
            * "Software Engineering/Tech"
            * "Sales/Business Development"
            * "HR/Recruitment"
            * "Medical/Healthcare"
            * "Accounting/Finance"
            * "Graphic Design/Creative"
            * "Legal"
            * "Marketing"
            * "Education/Teaching"
            * "Administrative/Operations"
          - Be extremely precise. For example, "Field Sales Executive", "Sales Representative", and "IT Software Sales" all map to "Sales/Business Development" (NOT Software Engineering/Tech). A "PHP Developer" maps to "Software Engineering/Tech".
          - Set "isDomainMismatch" to true ONLY if the chosen department category for the candidate's resume is different from the chosen department category for the Job Description. Otherwise, set it to false.
          - Example of mismatch (isDomainMismatch = true): Resume is "Software Engineering/Tech" but JD is "Sales/Business Development".
          - Example of match (isDomainMismatch = false): Resume is "Sales/Business Development" (Sales and Operations) and JD is "Sales/Business Development" (IT Software Sales).

      You must respond in strict JSON format. Output raw JSON matching this exact interface:

      interface AtsAnalysisResult {
        overallScore: number; // 0 to 100 calculated using the matched skills percentage
        candidateTrack: string; // The candidate's primary track (one of the closed-list departments)
        jobTrack: string; // The target job description's track (one of the closed-list departments)
        isDomainMismatch: boolean; // Set to true ONLY if chosen department categories are different
        domainMismatchMessage: string; // Friendly warning message explaining the mismatch (e.g. "Candidate's track (Software Engineering/Tech) does not match the target JD track (Sales/Business Development)")
        subScores: {
          formatting: number; // 0 to 100 (30% weight)
          keywordMatch: number; // 0 to 100 (30% weight)
          experienceMatch: number; // 0 to 100 (20% weight)
          projects: number; // 0 to 100 (10% weight)
          education: number; // 0 to 100 (5% weight)
          softSkills: number; // 0 to 100 (5% weight)
        };
        strengthMetrics: {
          atsParsing: number; // 0 to 100
          technicalSkills: number; // 0 to 100
          projects: number; // 0 to 100
          experience: number; // 0 to 100
          quantifiedResults: number; // 0 to 100
        };
        keywordDensity: Array<{
          keyword: string;
          countInJd: number;
          countInResume: number;
          importance: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
          explanation: string;
        }>;
        scoreDeductions: Array<{
          factor: string; // E.g., "Missing Laravel", "Professional Summary Found"
          points: number; // Positive/negative integer (e.g., -18, +10)
          description: string;
        }>;
        tailoredBulletPoints: Array<{
          section: string; // "Experience" or "Projects"
          originalContext: string; // What section in resume is being improved
          suggestedBullet: string; // The copy-pasteable bullet starting with bullet point: "• ..."
        }>;
        matchedKeywords: string[];
        missingKeywords: string[];
        redFlags: string[];
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
        candidateDetails: {
          candidateName: string;
          candidateEmail: string;
          candidatePhone: string;
        };
        jobDetails: {
          company: string;
          role: string;
        };
      }
    `;

    let resultObj;

    try {
      const responseText = await queryOllama(
        systemPrompt,
        `Candidate Resume Text:\n${resumeText}\n\nJob Description:\n${jobDescription}`
      );
      const cleaned = cleanJsonText(responseText);
      resultObj = JSON.parse(cleaned);

      // Programmatic override to prevent LLM logic hallucinations
      const candidateTrack = (resultObj.candidateTrack || '').trim();
      let jobTrack = (resultObj.jobTrack || '').trim();

      // Programmatic track classification relies directly on the LLM's returned tracks

      // Programmatic score calculation to resolve LLM division math failures
      if (Array.isArray(resultObj.matchedKeywords) && Array.isArray(resultObj.missingKeywords)) {
        const totalKeywords = resultObj.matchedKeywords.length + resultObj.missingKeywords.length;
        if (totalKeywords > 0) {
          const calculatedScore = Math.round((resultObj.matchedKeywords.length / totalKeywords) * 100);
          resultObj.overallScore = calculatedScore;
          if (resultObj.subScores) {
            resultObj.subScores.keywordMatch = calculatedScore;
          }
        }
      }
        if (candidateTrack && jobTrack) {
        const normalizedCandidate = normalizeDepartment(candidateTrack);
        const normalizedJob = normalizeDepartment(jobTrack);
        
        if (normalizedCandidate && normalizedJob && normalizedCandidate !== normalizedJob) {
          resultObj.isDomainMismatch = true;
          resultObj.domainMismatchMessage = `Candidate's track (${candidateTrack}) does not match the target JD track (${jobTrack}).`;
        } else {
          resultObj.isDomainMismatch = false;
          resultObj.domainMismatchMessage = '';
          
          // Clear any AI deductions or red flags mentioning domain/track mismatch
          if (Array.isArray(resultObj.scoreDeductions)) {
            resultObj.scoreDeductions = resultObj.scoreDeductions.filter((d: any) => 
              !d.factor?.toLowerCase().includes('domain') && 
              !d.description?.toLowerCase().includes('domain') &&
              !d.factor?.toLowerCase().includes('track') &&
              !d.description?.toLowerCase().includes('track')
            );
          }
          if (Array.isArray(resultObj.redFlags)) {
            resultObj.redFlags = resultObj.redFlags.filter((f: string) => 
              !f.toLowerCase().includes('domain') && 
              !f.toLowerCase().includes('track')
            );
          }
        }
      }

      // Force score to 0 if Groq detects a domain mismatch
      if (resultObj.isDomainMismatch) {
        resultObj.overallScore = 0;
        if (resultObj.subScores) {
          resultObj.subScores.keywordMatch = 0;
          resultObj.subScores.experienceMatch = 0;
          resultObj.subScores.education = 0;
        }
      }
    } catch (apiError: any) {
      console.error('[ATS Controller] Error running custom ATS evaluation:', apiError);
      return res.status(500).json({ error: 'Custom ATS analysis failed.', message: apiError.message });
    }

    // 1. Robust candidate details extraction from resume text
    const cleanSingleLineText = resumeText.replace(/\r?\n/g, ' ');
    const emailMatch = cleanSingleLineText.match(/[a-zA-Z0-9._%+-]+\s*(?:@|\[at\]|\(at\))\s*[a-zA-Z0-9.-]+\s*\.\s*[a-zA-Z]{2,}/i);
    const candidateEmail = emailMatch ? emailMatch[0].replace(/\s+/g, '').replace(/\[at\]|\(at\)/gi, '@') : '';

    const phoneMatch = resumeText.match(/(?:\+?\d{1,3}[\s-]?)?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}|\+?\d{10,12}/);
    const candidatePhone = phoneMatch ? phoneMatch[0] : '';

    const nameBlocklist = [
      'management', 'experience', 'skills', 'competencies', 'summary', 
      'developer', 'engineer', 'professional', 'profile', 'objective', 
      'contact', 'education', 'projects', 'history', 'technical', 
      'employment', 'career', 'qualifications', 'certifications', 'about',
      'work', 'hiring', 'recruiting', 'talent', 'acquisition', 'core',
      'operations', 'relations', 'development', 'sales', 'marketing',
      'lead', 'generation', 'negotiation', 'logistics', 'hrms', 'crm',
      'curriculum', 'vitae', 'resume', 'cv', 'details', 'info', 'address',
      'phone', 'email', 'mobile', 'customer', 'relationship', 'client',
      'services', 'service', 'user', 'product', 'project', 'team',
      'business', 'systems', 'system', 'software', 'solution', 'solutions',
      'information', 'technology', 'freshers', 'fresher', 'hobbies',
      'languages', 'declaration', 'personal', 'summary'
    ];

    const resumeLines = resumeText.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
    let candidateName = '';
    
    // First pass: look for a capitalized line with 2-4 words (names start with capital letters, no punctuation)
    for (let i = 0; i < Math.min(10, resumeLines.length); i++) {
      const line = resumeLines[i];
      const words = line.split(/\s+/);
      if (words.length >= 2 && words.length <= 4) {
        const hasBlocklist = words.some((w: string) => nameBlocklist.includes(w.toLowerCase()));
        const isCapitalized = words.every((w: string) => /^[A-Z][a-zA-Z.]*$/.test(w));
        if (!hasBlocklist && isCapitalized) {
          candidateName = line;
          break;
        }
      }
    }

    // Second pass fallback: check first 5 non-empty lines, grab the first short line (<35 chars) without blocklisted headers
    if (!candidateName) {
      for (let i = 0; i < Math.min(5, resumeLines.length); i++) {
        const line = resumeLines[i];
        const hasBlocklist = line.split(/\s+/).some((w: string) => nameBlocklist.includes(w.toLowerCase()));
        if (!hasBlocklist && line.length > 3 && line.length < 35) {
          candidateName = line;
          break;
        }
      }
    }

    console.log('[ATS Controller] parsed candidateEmail:', candidateEmail);
    console.log('[ATS Controller] parsed candidatePhone:', candidatePhone);
    console.log('[ATS Controller] parsed candidateName:', candidateName);

    // 2. Robust job details extraction from job description
    const jdLines = jobDescription.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
    let companyGuess = '';
    let roleGuess = '';

    for (const line of jdLines) {
      const companyLabelMatch = line.match(/^(?:company|company\s+name|organization|employer)\s*:\s*(.+)/i);
      if (companyLabelMatch) {
        companyGuess = companyLabelMatch[1].trim();
      }
      
      const roleLabelMatch = line.match(/^(?:job\s+title|title|role|position|job\s+role)\s*:\s*(.+)/i);
      if (roleLabelMatch) {
        roleGuess = roleLabelMatch[1].trim();
      }
    }

    if (!roleGuess && jdLines.length > 0) {
      const firstLine = jdLines[0];
      if (firstLine.length < 50 && !firstLine.toLowerCase().includes('hiring') && !firstLine.toLowerCase().includes('looking')) {
        roleGuess = firstLine;
      }
    }

    if (!roleGuess) {
      const titleKeywords = ['developer', 'engineer', 'manager', 'executive', 'specialist', 'analyst', 'head', 'lead', 'coordinator', 'officer', 'representative'];
      for (const line of jdLines) {
        if (line.length < 60) {
          const words = line.toLowerCase().split(/\s+/);
          const hasTitleWord = words.some((w: string) => titleKeywords.includes(w));
          if (hasTitleWord && !line.toLowerCase().includes('experience') && !line.toLowerCase().includes('requirement')) {
            roleGuess = line;
            break;
          }
        }
      }
    }

    if (!companyGuess) {
      const hiringMatch = jobDescription.match(/(?:hiring\s+for|join\s+the\s+team\s+at|at)\s+([A-Z][a-zA-Z0-9\s.]{1,20})/i);
      if (hiringMatch) {
        const candidate = hiringMatch[1].trim();
        const commonWords = ['our', 'the', 'a', 'an', 'this', 'leading', 'growing', 'fast', 'innovative', 'dynamic'];
        const firstWord = candidate.split(/\s+/)[0]?.toLowerCase();
        if (!commonWords.includes(firstWord)) {
          companyGuess = candidate;
        }
      }
    }

    // 3. Merge LLM-extracted metadata with robust fallbacks
    const finalCandidateName = resultObj.candidateDetails?.candidateName || candidateName;
    const finalCandidateEmail = resultObj.candidateDetails?.candidateEmail || candidateEmail;
    const finalCandidatePhone = resultObj.candidateDetails?.candidatePhone || candidatePhone;
    const finalCompany = resultObj.jobDetails?.company || companyGuess;
    const finalRole = resultObj.jobDetails?.role || roleGuess;

    resultObj.candidateDetails = {
      candidateName: finalCandidateName,
      candidateEmail: finalCandidateEmail,
      candidatePhone: finalCandidatePhone
    };

    resultObj.jobDetails = {
      company: finalCompany,
      role: finalRole
    };

    // Deduct 1 credit for ATS scan
    try {
      const userId = await getUserIdFromRequest(req);
      await prisma.user.update({
        where: { id: userId },
        data: { credits: { decrement: 1 } }
      });
    } catch (e) {
      console.warn('[ATS Controller] Failed to decrement user credits:', e);
    }

    return res.json(resultObj);
  } catch (error: any) {
    console.error('[ATS Controller] Error running custom ATS evaluation:', error);
    return res.status(500).json({ error: 'Custom ATS analysis failed.', message: error.message });
  }
};

// Classification checking is fully managed contextually by the LLM (Groq)
