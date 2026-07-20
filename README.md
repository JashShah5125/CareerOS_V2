# AI Career Copilot (CareerOS)

AI Career Copilot is a complete, production-ready SaaS application that helps candidates optimize resumes, check Applicant Tracking System (ATS) compatibility scores using semantic cloud AI evaluations, track recruitment stages in a Kanban board, and practice interviews with dynamic feedback.

The project is built on a modern serverless three-tier architecture:
1. **Frontend**: React (Vite) + TypeScript + Vanilla CSS styled with a premium dark neon glassmorphic layout.
2. **Backend Server**: Node.js + Express.js + TypeScript + Prisma Client.
3. **AI Layer**: Groq Cloud API running the advanced **`llama-3.3-70b-versatile`** model for structured scoring.
4. **Database**: MongoDB Atlas (Cloud database) for persistent storage and secure result caching.

---

## 🚀 Port Configuration
* **Frontend Developer Server**: `http://localhost:3000`
* **Node.js Backend API**: `http://localhost:5001`
* **MongoDB Atlas Connection**: Managed via Prisma ORM (`DATABASE_URL`)

---

## 🛠️ Local Development Setup

Follow these steps to run the application components locally:

### Prerequisites
* **Node.js** (v18+)
* **MongoDB Atlas Connection URL** (in your `.env` file)
* **Groq API Key** (in your `.env` file)

---

### Step 1: Set Up and Run Backend Server (Node.js)
1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Configure your Environment Variables by creating a `.env` file inside `backend/`:
   ```env
   PORT=5001
   DATABASE_URL="your_mongodb_atlas_connection_string"
   JWT_SECRET="your_jwt_secret_key"
   GROQ_API_KEY="your_groq_cloud_api_key"
   GOOGLE_CLIENT_ID="your_google_oauth_client_id"
   ```
4. Generate the Prisma client:
   ```bash
   npx prisma generate
   ```
5. Synchronize the database collections:
   ```bash
   npx prisma db push
   ```
6. Start the Node backend in development mode (with hot reloading):
   ```bash
   npm run dev
   ```

---

### Step 2: Set Up and Run Frontend Client (Vite)
1. Navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Start the Vite React client:
   ```bash
   npm run dev
   ```
   The application will boot on `http://localhost:3000` and automatically proxy database requests to the backend server running on port `5001`.

---

## 🌟 Tech Stack Highlights
* **Prisma (MongoDB)**: Scalable document modeling with active collections mappings.
* **Groq Llama 3.3 70B**: Enterprise-grade cloud AI model running structured semantic scans.
* **Secure Database Caching**: Computes SHA-256 hashes of inputs to cache scans in MongoDB Atlas. Duplicates load instantly in under 10ms with zero extra AI token charges.
* **Domain Mismatch alerts**: Automatically checks track alignment (e.g. Sales JD vs HR resume) and blocks mismatches.
