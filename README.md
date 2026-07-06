# AI Career Copilot SaaS Web Application

AI Career Copilot is a responsive SaaS web application built with React (Vite) + Vanilla CSS on the frontend and Express + TypeScript + Prisma on the backend. It offers structured tools to optimize resumes, scan jobs, generate cover letters, track applications in a Kanban board, and practice interviews.

## Features

- **Theme Toggling**: Dark and Light themes matching Stripe / Notion Dashboards natively.
- **Resume Analyzer**: Scans layouts, grammar, skill margins, formatting compatibility.
- **Resume Tailor**: Infuses description keywords, suggests edits, and triggers PDF downloads.
- **Cover Letter Generator**: Fully interactive document editor with draft generations.
- **Application Tracker**: Full Kanban board with stages (Applied, Assessment, Interview, Offer, Rejected).
- **Interview Prep**: Simulates HR, behavioral, technical, and coding interview practice with scoring metrics and suggested answers.
- **Career Analytics**: Generates analytics, conversion funnels, and skill growth index.
- **PostgreSQL Database Schema**: Documented modeling inside `backend/prisma/schema.prisma`.

## Setup & Running

1. **Install dependencies**:
   ```bash
   npm run install:all
   ```

2. **Database configuration**:
   Define your PostgreSQL URI inside the `backend/.env` file:
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ai_career_copilot?schema=public"
   ```

3. **Run development servers**:
   In the root workspace folder, trigger:
   ```bash
   npm run dev:backend
   ```
   (Starts Node.js API listener on port `5001`).

   In another terminal, trigger:
   ```bash
   npm run dev:frontend
   ```
   (Starts Vite React dev server on port `3000` with automated proxies).
