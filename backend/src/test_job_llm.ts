/// <reference path="./types/pdf-parse-fork.d.ts" />
import { queryOllama, cleanJsonText } from './utils/ollama';
import dotenv from 'dotenv';
dotenv.config();

const test = async () => {
  const systemPrompt = `
You are an expert technical recruiter AI. Your task is to compare a candidate's Resume Text against a target Job Description and output a detailed match analysis in strict JSON format.

Output raw JSON matching this exact structure:
{
  "matchScore": 85,
  "requiredSkills": ["React", "TypeScript"],
  "missingSkills": ["Docker"],
  "experienceMatch": {
    "status": "Match",
    "required": "Brief summary",
    "detected": "Brief summary",
    "feedback": "Feedback details"
  },
  "educationMatch": {
    "status": "Match",
    "required": "Education details",
    "detected": "Education details",
    "feedback": "Feedback details"
  },
  "recommendationSummary": "Tailor recommendation here",
  "jobInsights": {
    "salaryEstimate": "Not Specified",
    "roleLevel": "Mid-Level",
    "companyInsight": "Company stack details"
  }
}

Do not include any markdown comments, explanation text, or backticks outside the JSON. Respond with strict, valid JSON only.
`;

  const userPrompt = `
Job Title: Backend PHP Developer
Company: Tech Corp

Target Job Description:
We want a PHP Developer.

Candidate Resume Text:
I am a Sales Executive with SaaS experience.
`;

  try {
    console.log("Sending query to LLM...");
    const text = await queryOllama(systemPrompt, userPrompt);
    console.log("Response text:", text);
    const clean = cleanJsonText(text);
    const json = JSON.parse(clean);
    console.log("Parsed successfully! Overall matchScore:", json.matchScore);
  } catch (err: any) {
    console.error("FAILED with error:", err.message);
  }
};

test().catch(console.error);
