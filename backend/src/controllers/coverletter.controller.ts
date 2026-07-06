import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { getUserIdFromRequest } from './auth.controller';
import { queryOllama, cleanJsonText } from '../utils/ollama';

// Helper function to dynamically construct custom fallback cover letter content based on job description
const buildDynamicCoverLetter = (
  firstName: string,
  lastName: string,
  email: string,
  headline: string,
  company: string,
  role: string,
  jobDescription: string
): string => {
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  
  // Extract keywords from JD to customize fallback letter
  const techPool = [
    'React', 'Node.js', 'TypeScript', 'JavaScript', 'Python', 'Java', 'C#', 
    'PHP', 'Laravel', 'Docker', 'AWS', 'Kubernetes', 'SQL', 'PostgreSQL', 
    'MongoDB', 'Vue', 'Angular', 'Next.js', 'Express', 'Django'
  ];
  const matchedTech: string[] = [];
  
  if (jobDescription) {
    techPool.forEach(tech => {
      const regex = new RegExp(`\\b${tech}\\b`, 'i');
      if (regex.test(jobDescription)) {
        matchedTech.push(tech);
      }
    });
  }
  
  // Choose dynamically tailored sentences
  let techSentence = "With my background in software engineering and modern development practices, I am confident I can make an immediate contribution to your engineering team.";
  if (matchedTech.length > 0) {
    const skillsList = matchedTech.slice(0, 4).join(', ');
    techSentence = `My expertise with key technologies mentioned in your description—specifically ${skillsList}—makes me a strong match for this role. I have successfully built and deployed systems utilizing these tools in my previous work.`;
  }
  
  // Contextual paragraph based on soft skills or keywords in JD
  let contextualParagraph = "Throughout my career, I have focused on writing clean, maintainable code and solving complex problems. I enjoy working in collaborative environments where I can build impactful products.";
  if (jobDescription) {
    const jdLower = jobDescription.toLowerCase();
    if (jdLower.includes('scale') || jdLower.includes('performance') || jdLower.includes('scalable')) {
      contextualParagraph = "In my past projects, I have specialized in building scalable architectures and optimizing performance, which aligns with the requirements outlined in your job post.";
    } else if (jdLower.includes('lead') || jdLower.includes('mentor') || jdLower.includes('manage')) {
      contextualParagraph = "I have experience mentoring junior engineers and leading development cycles, matching your need for a technical professional who can drive project deliverables.";
    } else if (jdLower.includes('agile') || jdLower.includes('scrum') || jdLower.includes('collaborat')) {
      contextualParagraph = "I thrive in collaborative Agile teams, participating in sprints and retrospectives to ship high-quality software features iteratively.";
    }
  }

  return `
${firstName} ${lastName}
${email} | ${headline}

${dateStr}

Hiring Manager
${company}

Dear Hiring Manager,

I am writing to express my strong interest in the ${role} position at ${company}. Having reviewed the details of your job description, I am excited about the opportunity to bring my technical skills and professional drive to your organization.

${techSentence}

${contextualParagraph}

I look forward to discussing how my experience and skill set align with the goals of ${company}. Thank you for your time and consideration.

Sincerely,
${firstName} ${lastName}
  `.trim();
};

export const generateCoverLetter = async (req: Request, res: Response) => {
  try {
    const { company, role, jobDescription, resumeText } = req.body;

    // Fetch actual logged in user profile parameters from PostgreSQL database
    const userId = await getUserIdFromRequest(req);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true }
    });

    const firstName = user?.profile?.firstName || 'Jash';
    const lastName = user?.profile?.lastName || 'Shah';
    const email = user?.email || 'jashshah@gmail.com';
    const headline = user?.profile?.headline || 'Tech Professional';

    if (!company || !role) {
      return res.status(400).json({ error: 'company and role are required.' });
    }

    const defaultResume = `
      ${firstName} ${lastName} | ${email} | ${headline}
      SUMMARY: Software Engineer with experience in development processes.
    `;
    const inputResume = resumeText || defaultResume;

    let resultObj;

    // Run within a safe try-catch wrapper to fallback gracefully if API key is invalid/expired
    try {
      const systemPrompt = `
        You are an expert career consultant and professional resume writer.
        Generate a tailored cover letter based on the candidate's resume and target job.
        
        Candidate Profile:
        - Name: ${firstName} ${lastName}
        - Email: ${email}
        - Headline/Title: ${headline}

        You must format the cover letter with standard professional business headings.
        Respond in strict JSON format. Output raw JSON matching this exact interface:

        interface CoverLetterResult {
          id: string;
          company: string;
          role: string;
          content: string; // The generated letter body text, formatted with paragraphs and line breaks
          downloadUrl: string;
        }
      `;

      const responseText = await queryOllama(
        systemPrompt,
        `Candidate Resume:\n${inputResume}\n\nJob description context:\nCompany: ${company}\nRole: ${role}\nJD Detail:\n${jobDescription}`
      );

      const cleanedText = cleanJsonText(responseText);
      resultObj = JSON.parse(cleanedText);
      resultObj.id = `cover-letter-${Date.now()}`;
      resultObj.downloadUrl = '/api/cover-letter/download/mock-letter.pdf';
    } catch (apiError: any) {
      console.warn('[Cover Letter Controller] Ollama live generation failed. Falling back to personalized mock generator:', apiError);
      
      const fallbackContent = buildDynamicCoverLetter(
        firstName,
        lastName,
        email,
        headline,
        company,
        role,
        jobDescription || ''
      );

      resultObj = {
        id: `mock-cover-letter-${Date.now()}`,
        company: company || 'Target Company',
        role: role || 'Software Developer',
        content: fallbackContent,
        downloadUrl: '/api/cover-letter/download/mock-letter.pdf'
      };
    }

    // Save cover letter to database
    try {
      await prisma.coverLetter.create({
        data: {
          userId,
          jobTitle: role,
          company: company,
          content: resultObj.content
        }
      });
    } catch (dbErr) {
      console.warn('[Cover Letter Controller] Failed to save cover letter in database:', dbErr);
    }

    // Deduct 1 credit for cover letter generation
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { credits: { decrement: 1 } }
      });
    } catch (e) {
      console.warn('[Cover Letter Controller] Failed to decrement user credits:', e);
    }

    return res.json(resultObj);
  } catch (error: any) {
    console.error('[Cover Letter Controller] Error generating cover letter:', error);
    return res.status(500).json({ error: 'Cover letter generation failed.', message: error.message });
  }
};
