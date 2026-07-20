# CareerOS: System Design & Technical Specifications

---

## 1. Project Executive Summary & Strategic Goals
CareerOS is a production-grade career optimization copilot developed to streamline candidates' resume alignment, Applicant Tracking System (ATS) parsing diagnostics, cover letter builds, and mock interview preparations. The system provides immediate, actionable feedback to candidates to maximize their recruitment success ratios.

To resolve the engineering challenges of slow round-trip latencies, security/syntax crashes, and high token billing costs of raw AI queries, CareerOS incorporates a high-speed Express.js server linked to the **Groq Llama 3.3 70B LPU cloud API** protected by a secure, real-time **MongoDB Atlas caching database layer**. This architecture guarantees sub-second response times on cached runs with zero redundant token costs.

---

## 2. Technology Stack

The system is divided into three distinct operational layers:

### 2.1 Frontend Interface Layer (React Client)
* **Vite Client Compiler**: React 18 using TypeScript and Vite for optimized compilation.
* **User Interface Styling**: Cascading Style Sheets (CSS) with custom design system variables supporting modern, mobile-responsive dark themes and neon glassmorphism backgrounds.
* **Components**: Lucide React for vector icons, and the **Razorpay SDK** for dynamic B2C credit purchase dialogs.

### 2.2 Gateway & Persistence Layer (Express Backend)
* **Runtime Environment**: Node.js (written in TypeScript).
* **Server Engine**: Express.js exposing RESTful API routes and validation middleware.
* **Database & ORM**: **MongoDB Atlas (Cloud Cluster)**, queried securely via **Prisma ORM**.
* **Security & Authentication**: JSON Web Tokens (JWT) for session authorization, BCrypt/SHA-256 cryptos for secure user records, and **Google OAuth** (`google-auth-library`) for verified credential logins.
* **Text Parsers**: `pdf-parse` and `mammoth` libraries to extract raw text buffers from uploaded PDF and Word documents.

### 2.3 Artificial Intelligence Layer
* **API Provider**: **Groq Cloud API** (high-speed LPU server).
* **Model**: **`llama-3.3-70b-versatile`** (advanced 70B parameter model).
* **Deterministic Inference**: Prompts configured with a strict temperature of `0.1` and explicit JSON schema formats to eliminate score fluctuations and ensure robust JSON parsing.

---

## 3. System Architecture & Component Workings

### 3.1 User Authentication & Credits Store
When a user registers or logs in, their credentials are encrypted. Credits are tracked inside the `User` model on MongoDB Atlas. Each API call (ATS evaluation, resume audit, cover letter generation, or interview session) deducts exactly **1 credit** from the user's active credit balance.

### 3.2 PDF Line-Sanitization & Cleansing
Document uploads are read into raw text buffers. Because PDF extraction creates fragmented lines and hanging bullet points, we implement regular expression text sanitizers to collapse space gaps, align bullet points, and clean candidate contact details (regex-matching email/phone inputs safely).

### 3.3 Dynamic Keyword Matching & Scoring
Rather than simple string searches (which fail on spelling variations or synonyms), the system prompts Llama 3.3 70B to perform semantic keyword evaluation. For example, GitHub exposure matches "Git", and MVC design pattern matches "MVC". 

The overall score is programmatically calculated on the server as the direct ratio of matched-to-total keywords:
$$\text{Overall Score} = \text{round}\left( \frac{\text{Matched Keywords}}{\text{Matched Keywords} + \text{Missing Keywords}} \times 100 \right)$$

### 3.4 Secure Database Caching
To stabilize scores and prevent duplicate token billing, the backend computes a SHA-256 hash of the combined `resumeText + jobDescription + ATS_CACHE_VERSION`. 
* If a cached entry exists in the `AtsCache` collection, it loads the saved report in **under 10ms** and bypasses the AI completely.
* If it is a new combination, it queries Groq, saves the parsed JSON report to MongoDB Atlas, and returns it.

### 3.5 Domain Mismatch Safeguards
During analysis, the LLM classifies both the candidate's background and target JD into a closed list of departments (e.g., "Software Engineering/Tech", "Sales/Business Development", "HR/Recruitment"). 
* If a mismatch is detected (such as uploading an HR resume to a Sales JD), the backend sets `isDomainMismatch = true` and forces the match score to **0%**.
* The React client displays a red **"Resume Not Applicable to this JD"** warning card, preventing candidates from applying to completely wrong professional fields.

---

## 4. Operational Flow Diagram

```
[React Frontend Client]
        │ (Resume File + JD Text)
        ▼
[Node.js + Express Backend Gateway]
        │
        ├── (Compute SHA-256 Hash) ──► [Check AtsCache in MongoDB Atlas] (Success: Return Cached Result)
        │
        ▼ (Cache Miss: Send Semantic Prompts)
[Groq Cloud API (Llama 3.3 70B)]
        │ (Extract structured keywords, subscores, and track properties)
        ▼
[Prisma ORM Client]
        │ (Store report in AtsCache collection; Decrement 1 User credit)
        ▼
[MongoDB Atlas Database]
        │
        ▼ (Render Dashboard Analytics and Bullet Suggestions)
[React Dashboard UI]
```
