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

const classifyTextByKeywords = (text: string, defaultCategory: string): string => {
  const t = text.toLowerCase();
  
  const techKeywords = ['developer', 'engineer', 'programmer', 'coding', 'software', 'fullstack', 'frontend', 'backend', 'php', 'laravel', 'javascript', 'typescript', 'python', 'java', 'react', 'node', 'mysql', 'postgresql', 'tech stack', 'web dev', 'git', 'data analyst', 'data scientist', 'tableau', 'power bi', 'sql', 'excel', 'statistics', 'pandas', 'analytics', 'data analysis', 'data science', 'machine learning', 'ai'];
  const salesKeywords = ['sales', 'selling', 'business development', 'bd', 'account executive', 'account manager', 'cold calling', 'sales executive', 'sales representative', 'lead generation', 'pipeline management', 'saas sales', 'deal closing', 'b2b sales', 'sales head', 'sales manager'];
  const hrKeywords = ['recruiter', 'recruitment', 'recruiting', 'talent acquisition', 'human resources', ' hr ', ' payroll ', 'hris', 'employee relations'];
  const financeKeywords = ['accounting', 'accountant', 'finance', 'bookkeeper', 'auditor', 'taxation', 'financial analyst', 'ledger', 'balance sheet', 'p&l'];
  const designKeywords = ['graphic design', 'illustrator', 'photoshop', 'figma', 'ui/ux', 'canvas', 'creative director', 'artwork'];
  const marketingKeywords = ['marketing', 'seo', 'sem', 'social media', 'advertising', 'branding', 'campaign', 'copywriter', 'content writing'];
  const legalKeywords = ['legal', 'lawyer', 'paralegal', 'compliance', 'contract drafting', 'litigation', 'attorney'];

  let techScore = 0;
  let salesScore = 0;
  let hrScore = 0;
  let financeScore = 0;
  let designScore = 0;
  let marketingScore = 0;
  let legalScore = 0;

  techKeywords.forEach(kw => {
    const matches = t.split(kw).length - 1;
    techScore += matches;
  });

  salesKeywords.forEach(kw => {
    const matches = t.split(kw).length - 1;
    salesScore += matches;
  });

  hrKeywords.forEach(kw => {
    const matches = t.split(kw).length - 1;
    hrScore += matches;
  });

  financeKeywords.forEach(kw => {
    const matches = t.split(kw).length - 1;
    financeScore += matches;
  });

  designKeywords.forEach(kw => {
    const matches = t.split(kw).length - 1;
    designScore += matches;
  });

  marketingKeywords.forEach(kw => {
    const matches = t.split(kw).length - 1;
    marketingScore += matches;
  });

  legalKeywords.forEach(kw => {
    const matches = t.split(kw).length - 1;
    legalScore += matches;
  });

  const maxScore = Math.max(techScore, salesScore, hrScore, financeScore, designScore, marketingScore, legalScore);
  if (maxScore >= 2) {
    if (maxScore === techScore) return 'Software Engineering/Tech';
    if (maxScore === salesScore) return 'Sales/Business Development';
    if (maxScore === hrScore) return 'HR/Recruitment';
    if (maxScore === financeScore) return 'Accounting/Finance';
    if (maxScore === designScore) return 'Graphic Design/Creative';
    if (maxScore === marketingScore) return 'Marketing';
    if (maxScore === legalScore) return 'Legal';
  }
  
  return defaultCategory;
};

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
      console.warn('[ATS Controller] Ollama custom analysis failed. Falling back to dynamic Javascript matching:', apiError);
      
      const cleanTextJs = (t: string) => t.toLowerCase().replace(/[^a-z0-9\s#+\-\.]/g, ' ').replace(/\s+/g, ' ');
      const cleanResume = cleanTextJs(resumeText);
      const cleanJd = cleanTextJs(jobDescription);
      const resumeWords = new Set(cleanResume.split(' '));
      const jdWords = cleanJd.split(' ');
      
      const sections = ['experience', 'education', 'skills', 'projects', 'summary'];
      const sectionSynonyms: Record<string, string[]> = {
        experience: ['experience', 'employment', 'work history', 'career history', 'background', 'professional history', 'work experience', 'history'],
        education: ['education', 'academic', 'qualification', 'qualifications', 'degree', 'university', 'college', 'studies', 'schooling', 'academics'],
        skills: ['skills', 'competencies', 'expertise', 'capabilities', 'technologies', 'technical stack', 'tools', 'proficiencies', 'abilities', 'tech stack'],
        projects: ['projects', 'key projects', 'academic projects', 'personal projects', 'work projects', 'accomplishments', 'creations'],
        summary: ['summary', 'objective', 'profile', 'about me', 'about']
      };

      const detectedSections = sections.filter(sec => {
        const synonyms = sectionSynonyms[sec] || [sec];
        return synonyms.some(syn => cleanResume.includes(syn));
      });
      
      const metricsMatches = resumeText.match(/(?:\b\d+(?:\.\d+)?\+?\s*%\s*(?:\+)?\b|\b(?:usd|inr|rs\.?|\$|₹|£|€)\s*\d+(?:[,\.]\d+)*\+?\s*(?:[kKmMCrRlL])?\b|\b\d+(?:\.\d+)?\+?\s*(?:k|m|cr|l|lakh|lakhs|crore|crores|million|billion|trillion|percent|users|clients|accounts|leads|deals|projects|employees|team|members|regions|territories|quota)\b|\b\d+(?:\.\d+)?\+?\s*(?:[kKmMCrRlL])\+?\b)/gi) || [];
      const metricsCount = metricsMatches.length;
      
      const actionVerbsList = [
        // --- Tech & Engineering ---
        'developed', 'designed', 'engineered', 'optimized', 'built', 'implemented', 'created',
        'scaled', 'resolved', 'automated', 'integrated', 'architected', 'spearheaded', 'programmed',
        'deployed', 'monitored', 'refactored', 'migrated', 'debugged', 'configured', 'administered',
        // --- Sales, BD & Marketing ---
        'closed', 'achieved', 'generated', 'drove', 'negotiated', 'exceeded', 'increased', 'secured',
        'grew', 'launched', 'expanded', 'prospected', 'pitched', 'partnered', 'presented', 'acquired',
        'won', 'retained', 'established', 'initiated', 'targeted', 'maximized', 'capitalized', 'promoted',
        // --- Management, Leadership & Operations ---
        'led', 'managed', 'improved', 'delivered', 'collaborated', 'supervised', 'coordinated',
        'directed', 'organized', 'guided', 'facilitated', 'executed', 'conducted', 'supported',
        'mentored', 'trained', 'delegated', 'recruited', 'restructured', 'budgeted', 'scheduled',
        // --- Finance, Legal & Compliance ---
        'audited', 'analyzed', 'drafted', 'reviewed', 'forecasted', 'balanced', 'allocated',
        'enforced', 'mitigated', 'assessed', 'negotiated', 'authorized', 'reconciled',
        // --- Healthcare, Service & Support ---
        'assisted', 'administered', 'monitored', 'diagnosed', 'treated', 'counseled', 'resolved',
        'advocated', 'dispatched', 'coordinated', 'inspected', 'maintained', 'standardized'
      ];
      const wordsArr = cleanResume.split(' ');
      const verbCount = wordsArr.filter(w => actionVerbsList.includes(w)).length;
      
      const skillsList = [
        'javascript', 'typescript', 'python', 'java', 'c#', 'c++', 'go', 'rust', 'ruby', 'php', 'c', 'scala', 'kotlin', 'swift', 'objective-c', 'dart', 'r', 'perl', 'bash', 'cobol',
        'react', 'next.js', 'vue', 'angular', 'redux', 'tailwind', 'bootstrap', 'css', 'html', 'webpack', 'sass', 'less',
        'node.js', 'express', 'django', 'flask', 'laravel', 'spring boot', 'fastapi', 'rails', 'asp.net',
        'postgresql', 'mongodb', 'mysql', 'sql', 'redis', 'graphql', 'sqlite', 'cassandra', 'mariadb', 'oracle', 'dynamodb', 'elasticsearch',
        'docker', 'aws', 'kubernetes', 'jenkins', 'terraform', 'cloud', 'gcp', 'azure', 'ci/cd', 'ansible', 'circleci', 'github actions', 'linux', 'nginx', 'apache', 'serverless',
        'git', 'github', 'gitlab', 'bitbucket', 'prisma', 'sequelize', 'testing', 'jest', 'cypress', 'selenium', 'mocha', 'chai', 'playwright', 'postman', 'junit',
        'sales', 'revenue', 'quota', 'crm', 'salesforce', 'hubspot', 'lead generation', 'cold calling', 'b2b sales', 'b2c sales', 'pipeline management', 'account management', 'deal closing', 'customer success', 'prospecting', 'negotiation', 'contracts', 'annual contract value', 'acv', 'contract value', 'saas', 'enterprise sales', 'growth hacking', 'branding', 'marketing strategy', 'seo', 'sem', 'copywriting', 'google analytics', 'social media marketing', 'email marketing', 'market research', 'digital marketing', 'lead scoring', 'conversion rate optimization', 'cro',
        'product management', 'project management', 'agile', 'scrum', 'jira', 'figma', 'ui/ux', 'photoshop', 'illustrator', 'system design', 'microservices', 'wireframing', 'sketching', 'adobe creative suite', 'indesign', 'branding', 'canva', 'trello', 'asana', 'product roadmap', 'user research', 'information architecture', 'prototyping', 'storyboarding',
        'financial modeling', 'budgeting', 'forecasting', 'quickbooks', 'sap', 'auditing', 'taxation', 'accounting', 'excel', 'valuation', 'portfolio management', 'risk assessment', 'general ledger', 'accounts payable', 'accounts receivable', 'cost analysis', 'financial reporting', 'invoice management', 'compliance auditing', 'p&l management',
        'talent acquisition', 'recruitment', 'hris', 'payroll', 'employee relations', 'workforce planning', 'sourcing', 'conflict resolution', 'benefits administration', 'performance management', 'labor laws', 'background checks', 'talent mapping',
        'supply chain', 'inventory management', 'logistics', 'procurement', 'lean', 'six sigma', 'operations management', 'vendor management', 'purchasing', 'warehouse operations', 'order fulfillment', 'quality control', 'process improvement',
        'hipaa', 'patient care', 'electronic health records', 'ehr', 'emr', 'nursing', 'medical terminology', 'clinical trials', 'diagnostics', 'healthcare administration', 'patient relationship', 'cpr', 'first aid', 'patient charting', 'triage', 'pharmacology',
        'contract negotiation', 'legal research', 'litigation', 'compliance', 'corporate law', 'risk management', 'contract drafting', 'regulatory affairs', 'intellectual property', 'audit risk', 'due diligence'
      ];
      
      const jdSkillsMatched = skillsList.filter(skill => {
        if (skill.match(/^[a-z0-9]+$/)) {
          return jdWords.includes(skill);
        } else {
          return cleanJd.includes(skill);
        }
      });
      
      let finalJdSkills = jdSkillsMatched;
      if (finalJdSkills.length === 0) {
        const stopWords = new Set(['a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'do', 'does', 'doing', 'dont', 'down', 'for', 'from', 'have', 'has', 'had', 'in', 'into', 'is', 'it', 'its', 'no', 'nor', 'not', 'of', 'on', 'or', 'other', 'our', 'out', 'over', 'same', 'she', 'should', 'so', 'some', 'such', 'than', 'that', 'the', 'their', 'them', 'then', 'there', 'these', 'they', 'this', 'those', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'with', 'you', 'your']);
        const words = cleanJd.split(' ').filter(w => !stopWords.has(w) && w.length > 3);
        const freqs: Record<string, number> = {};
        words.forEach(w => { freqs[w] = (freqs[w] || 0) + 1; });
        finalJdSkills = Object.keys(freqs).sort((a, b) => freqs[b] - freqs[a]).slice(0, 6);
      }
      
      const keywordDensity = finalJdSkills.slice(0, 8).map(skill => {
        const countInJd = cleanJd.split(' ').filter(w => w === skill).length || 3;
        const countInResume = cleanResume.split(' ').filter(w => w === skill).length;
        const isMatch = countInResume > 0;
        const keywordCap = skill.charAt(0).toUpperCase() + skill.slice(1);
        return {
          keyword: keywordCap,
          countInJd,
          countInResume,
          importance: 'HIGH' as const,
          explanation: isMatch
            ? `Matched! '${keywordCap}' is present in your resume (${countInResume}x).`
            : `Gap! '${keywordCap}' appears in the JD (${countInJd}x) but is missing from your resume.`
        };
      });
      
      const matchedKeywords = keywordDensity.filter(k => k.countInResume > 0).map(k => k.keyword.toLowerCase());
      const missingKeywords = keywordDensity.filter(k => k.countInResume === 0).map(k => k.keyword.toLowerCase());
      
      const scoreDeductions = missingKeywords.slice(0, 2).map(kw => ({
        factor: `Not yet directly evidenced: ${kw.charAt(0).toUpperCase() + kw.slice(1)}`,
        points: -4,
        pointsDisplay: "0/4",
        description: `'${kw.charAt(0).toUpperCase() + kw.slice(1)}' is not yet directly evidenced in the resume. Consider highlighting relevant projects or experiences.`
      }));
      
      const actual_matched = keywordDensity.filter(k => k.countInResume > 0).map(k => k.keyword);
      const actual_missing = keywordDensity.filter(k => k.countInResume === 0).map(k => k.keyword);
      const bullets: Array<{ section: string; originalContext: string; suggestedBullet: string }> = [];
      
      const cleanJdLower = cleanJd.toLowerCase();
      const isTech = cleanJdLower.includes('developer') || cleanJdLower.includes('engineer') || cleanJdLower.includes('programmer') || cleanJdLower.includes('coding') || cleanJdLower.includes('frontend') || cleanJdLower.includes('backend') || cleanJdLower.includes('fullstack') || cleanJdLower.includes('data scientist');

      if (actual_missing.length > 0) {
        let suggestedBullet = '';
        if (isTech) {
          suggestedBullet = `If you have experience with ${actual_missing[0]}: Describe a project where you built routing or API endpoint integrations. If not, recommend setting up a basic application using ${actual_missing[0]}.`;
        } else {
          suggestedBullet = `Outline a past experience, task, or deliverable where you utilized ${actual_missing[0]}, including the tool and the quantifiable result of your action.`;
        }
        bullets.push({
          section: 'Suggested Skills Action',
          originalContext: `Skill '${actual_missing[0]}' not yet directly evidenced`,
          suggestedBullet: suggestedBullet
        });
      } else {
        const matched_str = actual_matched.slice(0, 3).join(', ') || 'your core skills';
        bullets.push({
          section: 'Action Recommendation',
          originalContext: 'No major skills gaps identified',
          suggestedBullet: `Incorporate metrics, sizes, and outcomes for your existing project stacks (e.g. ${matched_str}) to highlight your impact.`
        });
      }
      
      const formattingScore = Math.min(100, 50 + (detectedSections.length * 12));
      const totalKeywords = keywordDensity.length || 1;
      const matchedKeywordsCount = keywordDensity.filter(k => k.countInResume > 0).length;
      const keywordMatchScore = Math.round((matchedKeywordsCount / totalKeywords) * 100);
      const resumeQualityScore = Math.min(100, Math.round((verbCount * 6) + (metricsCount * 15)));
      const overallScore = keywordMatchScore;

      // Programmatic track classification for the Javascript fallback
      const candidateTrackJs = classifyTextByKeywords(resumeText, '');
      const jobTrackJs = classifyTextByKeywords(jobDescription, '');
      
      const normalizedCandidateJs = normalizeDepartment(candidateTrackJs);
      const normalizedJobJs = normalizeDepartment(jobTrackJs);

      let isDomainMismatchJs = false;
      let domainMismatchMessageJs = '';

      if (normalizedCandidateJs !== normalizedJobJs) {
        isDomainMismatchJs = true;
        domainMismatchMessageJs = `Candidate's track (${candidateTrackJs}) does not match the target JD track (${jobTrackJs}).`;
      }

      resultObj = {
        overallScore: isDomainMismatchJs ? 0 : overallScore,
        candidateTrack: candidateTrackJs,
        jobTrack: jobTrackJs,
        isDomainMismatch: isDomainMismatchJs,
        domainMismatchMessage: domainMismatchMessageJs,
        atsCompatibility: formattingScore,
        jobMatchScore: isDomainMismatchJs ? 0 : keywordMatchScore,
        resumeQuality: isDomainMismatchJs ? 0 : resumeQualityScore,
        subScores: {
          formatting: formattingScore,
          keywordMatch: isDomainMismatchJs ? 0 : keywordMatchScore,
          experienceMatch: isDomainMismatchJs ? 0 : 65,
          projects: isDomainMismatchJs ? 0 : 70,
          education: isDomainMismatchJs ? 0 : 90,
          softSkills: isDomainMismatchJs ? 0 : 80
        },
        strengthMetrics: {
          atsParsing: formattingScore,
          technicalSkills: keywordMatchScore,
          projects: 70,
          experience: 50,
          quantifiedResults: Math.min(100, metricsCount * 25)
        },
        keywordDensity,
        scoreDeductions,
        tailoredBulletPoints: bullets,
        matchedKeywords,
        missingKeywords,
        redFlags: missingKeywords.length > 0 ? [`Missing technical keywords required by JD: ${missingKeywords.join(', ')}`] : [],
        complianceChecklist: {
          hasContactInfo: true,
          isSingleColumn: true,
          hasWorkHistory: true,
          hasSkillsSection: true,
          noGraphics: true,
          hasSummarySection: true,
          hasAddress: false,
          friendlyHeadings: true,
          standardDateFormats: false,
          jobTitleMentioned: matchedKeywords.length > 0,
          quantifiedAchievements: false,
          idealWordCount: true
        },
        improvementSuggestions: missingKeywords.map(kw => `Add experience details referencing target keyword: '${kw.charAt(0).toUpperCase() + kw.slice(1)}'.`)
      };
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
