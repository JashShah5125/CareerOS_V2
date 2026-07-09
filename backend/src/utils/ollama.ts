// Client proxy utility to route all completions tasks directly to the Python FastAPI NLP Microservice on Port 8000

export const cleanJsonText = (text: string): string => {
  return text.trim();
};

const fetchWithRetry = async (url: string, init: RequestInit, retries = 3): Promise<Response> => {
  try {
    const res = await fetch(url, init);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    return res;
  } catch (err) {
    if (retries > 0) {
      console.warn(`[NLP Service Fetch] Failed to connect to ${url}. Retrying in 1000ms... (Remaining retries: ${retries})`, err);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return fetchWithRetry(url, init, retries - 1);
    }
    throw err;
  }
};

export const queryOllama = async (systemPrompt: string, userPrompt: string): Promise<string> => {
  const nlpServiceUrl = process.env.NLP_SERVICE_URL || 'http://localhost:8000';

  try {
    // 0. ROUTE FOR TAILORED RESUME GENERATOR
    if (systemPrompt.includes('TailoredResumeResult')) {
      const resumeMatch = userPrompt.match(/Original Resume:\s*([\s\S]+?)(?=\n\nTarget Job Description|$)/i);
      const jdMatch = userPrompt.match(/Target Job Description:\s*([\s\S]+)/i);

      const resumeText = (resumeMatch ? resumeMatch[1] : '').trim();
      const jobDescription = (jdMatch ? jdMatch[1] : '').trim();

      const response = await fetchWithRetry(`${nlpServiceUrl}/api/v1/resume/tailor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText, jobDescription })
      });
      const data = await response.json();
      return JSON.stringify(data);
    }

    // 1. ROUTE FOR ATS MATCH COMPATIBILITY SCORE
    if (systemPrompt.includes('JobMatchResult') || userPrompt.includes('Job Description:')) {
      const resumeText = userPrompt.split(/Job Description:/i)[0].replace(/Resume Content:/i, '').trim();
      const jobDescription = userPrompt.split(/Job Description:/i)[1]?.trim() || '';

      const response = await fetchWithRetry(`${nlpServiceUrl}/api/v1/ats/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText, jobDescription })
      });
      const data = await response.json();
      return JSON.stringify(data);
    }

    // 2. ROUTE FOR RESUME STRUCTURE & DIAGNOSTICS ANALYSIS
    if (systemPrompt.includes('suggestions') || userPrompt.includes('Resume Content:')) {
      const resumeText = userPrompt.replace(/Resume Content:/i, '').trim();

      const response = await fetchWithRetry(`${nlpServiceUrl}/api/v1/resume/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText })
      });
      const data = await response.json();
      return JSON.stringify(data);
    }

    // 3. ROUTE FOR TAILORED COVER LETTER GENERATOR
    if (systemPrompt.includes('CoverLetterResult') || systemPrompt.includes('Candidate Profile:')) {
      const nameMatch = systemPrompt.match(/Name:\s*([^\n]+)/i);
      const emailMatch = systemPrompt.match(/Email:\s*([^\n]+)/i);
      const headlineMatch = systemPrompt.match(/Headline\/Title:\s*([^\n]+)/i);
      
      const companyMatch = userPrompt.match(/Company:\s*([^\n]+)/i);
      const roleMatch = userPrompt.match(/Role:\s*([^\n]+)/i);
      const jdMatch = userPrompt.match(/JD Detail:\s*([\s\S]+)/i) || userPrompt.match(/Job Description:\s*([\s\S]+)/i) || userPrompt.match(/Job description context:\s*([\s\S]+)/i);
      const resumeMatch = userPrompt.match(/Candidate Resume:\s*([\s\S]+?)(?=\n\nJob description|$)/i) || userPrompt.match(/Original Resume:\s*([\s\S]+?)(?=\n\nJob description|$)/i);

      const fullName = (nameMatch ? nameMatch[1] : 'Jane Doe').trim();
      const nameParts = fullName.split(/\s+/);
      const firstName = nameParts[0] || 'Jane';
      const lastName = nameParts.slice(1).join(' ') || 'Doe';

      const reqBody = {
        firstName,
        lastName,
        email: (emailMatch ? emailMatch[1] : 'jane.doe@example.com').trim(),
        headline: (headlineMatch ? headlineMatch[1] : 'Software Engineer').trim(),
        company: (companyMatch ? companyMatch[1] : 'Target Company').trim(),
        role: (roleMatch ? roleMatch[1] : 'Software Developer').trim(),
        resumeText: (resumeMatch ? resumeMatch[1] : '').trim(),
        jobDescription: (jdMatch ? jdMatch[1] : '').trim()
      };

      const response = await fetchWithRetry(`${nlpServiceUrl}/api/v1/cover-letter/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqBody)
      });
      const data = await response.json();
      
      // Wrap content inside JSON matching the expected controller interface
      return JSON.stringify({
        id: `cover-letter-${Date.now()}`,
        company: reqBody.company,
        role: reqBody.role,
        content: data.content,
        downloadUrl: '/api/cover-letter/download/mock-letter.pdf'
      });
    }

    // 4. ROUTE FOR INTERVIEW PRACTICE QUESTIONS
    if (systemPrompt.includes('QuestionListResult') || userPrompt.includes('Target Role:')) {
      const roleMatch = userPrompt.match(/Target Role:\s*([^\n]+)/i) || userPrompt.match(/role:\s*([^\n,]+)/i);
      const companyMatch = userPrompt.match(/Target Company:\s*([^\n]+)/i) || userPrompt.match(/company:\s*([^\n]+)/i);

      const role = (roleMatch ? roleMatch[1] : 'Frontend Engineer').trim();
      const company = (companyMatch ? companyMatch[1] : 'Tech Company').trim();

      const response = await fetchWithRetry(`${nlpServiceUrl}/api/v1/interview/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, company })
      });
      const data = await response.json();
      return JSON.stringify(data);
    }

    // 5. ROUTE FOR INTERVIEW RESPONSE EVALUATIONS (STAR METHOD)
    if (systemPrompt.includes('AnswerFeedbackResult') || userPrompt.includes('Question:')) {
      const qMatch = userPrompt.match(/Question:\s*([\s\S]+?)(?=\nUser Answer|$)/);
      const aMatch = userPrompt.match(/User Answer:\s*([\s\S]+)/);

      const questionText = (qMatch ? qMatch[1] : 'Interview Question').trim();
      const userAnswer = (aMatch ? aMatch[1] : '').trim();

      const response = await fetchWithRetry(`${nlpServiceUrl}/api/v1/interview/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionText, userAnswer })
      });
      const data = await response.json();
      return JSON.stringify(data);
    }

    // Fallback error if no route matches the prompt pattern
    throw new Error(`Unmatched NLP prompt pattern matching requirements.`);

  } catch (err: any) {
    console.error('[NLP Adapter Client] Query redirect to Python FastAPI failed:', err);
    throw new Error(`NLP API microservice query failed: ${err.message}`);
  }
};
