from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from nlp_engine import (
    calculate_ats_match,
    analyze_resume_diagnostics,
    generate_tailored_cover_letter,
    get_role_questions,
    evaluate_interview_response,
    calculate_custom_ats_analysis,
    tailor_resume_nlp,
    calculate_job_matching_nlp
)

app = FastAPI(
    title="CareerOS NLP API Service",
    description="Custom local API for TF-IDF Cosine Similarity and Resume Diagnostics",
    version="1.0.0"
)

# Enable CORS for local backend API queries
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- REQUEST BODY MODELS ---

class ATSScoreRequest(BaseModel):
    resumeText: str
    jobDescription: str

class ResumeTailorRequest(BaseModel):
    resumeText: str
    jobDescription: str

class ResumeAnalyzeRequest(BaseModel):
    resumeText: str

class CoverLetterRequest(BaseModel):
    firstName: str
    lastName: str
    email: str
    headline: str
    company: str
    role: str
    resumeText: str
    jobDescription: str

class JobMatchRequest(BaseModel):
    resumeText: str
    jobDescription: str
    company: str
    role: str

class InterviewQuestionsRequest(BaseModel):
    role: str
    company: str

class InterviewEvaluateRequest(BaseModel):
    questionText: str
    userAnswer: str

# --- ROUTE HANDLERS ---

@app.get("/")
def read_root():
    return {
        "status": "ONLINE",
        "service": "CareerOS Local NLP Engine",
        "engine": "TF-IDF + Cosine Similarity Math (scikit-learn)"
    }

@app.post("/api/v1/ats/score")
def get_ats_score(req: ATSScoreRequest):
    try:
        # Calculate full analysis matching expected AtsAnalysisResult schema
        analysis = calculate_custom_ats_analysis(req.resumeText, req.jobDescription)
        
        # Add backward-compatibility keys for old AtsScoreResult expected by other backend route controllers
        analysis["score"] = analysis["overallScore"]
        analysis["keywordScore"] = analysis["subScores"]["keywordMatch"]
        analysis["formattingScore"] = analysis["subScores"]["formatting"]
        analysis["structureScore"] = analysis["subScores"]["formatting"]
        
        return analysis
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/resume/tailor")
def tailor_resume(req: ResumeTailorRequest):
    try:
        result = tailor_resume_nlp(req.resumeText, req.jobDescription)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/job/match")
def match_job(req: JobMatchRequest):
    try:
        result = calculate_job_matching_nlp(req.resumeText, req.jobDescription, req.company, req.role)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/resume/analyze")
def analyze_resume(req: ResumeAnalyzeRequest):
    try:
        diagnostics = analyze_resume_diagnostics(req.resumeText)
        return diagnostics
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/cover-letter/generate")
def generate_cover_letter(req: CoverLetterRequest):
    try:
        letter_content = generate_tailored_cover_letter(
            first_name=req.firstName,
            last_name=req.lastName,
            email=req.email,
            headline=req.headline,
            company=req.company,
            role=req.role,
            resume_text=req.resumeText,
            job_description=req.jobDescription
        )
        return {
            "content": letter_content
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/interview/questions")
def generate_interview_questions(req: InterviewQuestionsRequest):
    try:
        questions = get_role_questions(req.role, req.company)
        return {
            "questions": questions
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/interview/evaluate")
def evaluate_interview(req: InterviewEvaluateRequest):
    try:
        evaluation = evaluate_interview_response(req.questionText, req.userAnswer)
        return evaluation
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/status")
def get_service_status():
    return {
        "status": "ONLINE",
        "model": "Local Cosine Similarity Matrix",
        "endpoint": "http://localhost:8000",
        "engine": "FastAPI scikit-learn",
        "modelsPulled": ["TF-IDF Tokenizer", "Stop Words Analyzer"]
    }
