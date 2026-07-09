# AI Career Copilot

AI Career Copilot is a complete, containerization-ready SaaS application that helps developers optimize resumes, match candidate scores against job descriptions using custom NLP algorithms, track recruitment stages in a Kanban board, and practice interviews with dynamic, role-specific feedback.

The project is built as a three-tier architecture:
1. **Frontend**: React (Vite) + Vanilla CSS styled with a premium dark/light glassmorphic layout.
2. **Backend Server**: Node.js + Express + TypeScript + Prisma Client.
3. **NLP Microservice**: Python FastAPI service running local scikit-learn cosine similarity matching.
4. **Database**: MongoDB (runs on port `27017`).

---

## Architecture Port Configuration
* **Frontend Developer Server**: `http://localhost:3000`
* **Node.js Backend API**: `http://localhost:5001`
* **Python FastAPI Service**: `http://localhost:8000`
* **MongoDB Instance**: `mongodb://localhost:27017`

---

## Local Development Setup

Follow these steps to run all components of the application locally:

### Prerequisites
* **Node.js** (v18+)
* **Python** (v3.10+)
* **MongoDB** (running locally or in a Docker container on port `27017`)

---

### Step 1: Start MongoDB
Ensure your MongoDB instance is running. If you are using Docker, you can start it with:
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

---

### Step 2: Set Up and Run Python FastAPI NLP Service
1. Navigate to the NLP folder:
   ```bash
   cd fastapi-nlp-service
   ```
2. Create and activate a virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI microservice:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000
   ```

---

### Step 3: Set Up and Run Backend Server (Node.js)
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
   DATABASE_URL="mongodb://localhost:27017/ai-career-copilot"
   JWT_SECRET="your_jwt_secret_key"
   NLP_SERVICE_URL="http://localhost:8000"
   ```
4. Generate the Prisma database client:
   ```bash
   npx prisma generate
   ```
5. Seed initial dashboard configurations (optional):
   ```bash
   npm run seed
   ```
6. Start the Node backend in development mode (with hot reloading):
   ```bash
   npm run dev
   ```

---

### Step 4: Set Up and Run Frontend Client (Vite)
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

## Tech Stack Highlights
* **Prisma (MongoDB)**: Scalable document modeling with relations mapping.
* **Cosine Similarity & TF-IDF Vectorizers**: Local scikit-learn models run within the FastAPI microservice offline, ensuring 100% data privacy.
* **Auto-Retries**: Automated proxy handshakes prevent cold-start gateway timeouts.
