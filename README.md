<div align="center">

```
 █████╗ ██╗      ██████╗  ██████╗      █████╗ ██████╗ ███████╗███╗   ██╗ █████╗ 
██╔══██╗██║     ██╔════╝ ██╔═══██╗    ██╔══██╗██╔══██╗██╔════╝████╗  ██║██╔══██╗
███████║██║     ██║  ███╗██║   ██║    ███████║██████╔╝█████╗  ██╔██╗ ██║███████║
██╔══██║██║     ██║   ██║██║   ██║    ██╔══██║██╔══██╗██╔══╝  ██║╚██╗██║██╔══██║
██║  ██║███████╗╚██████╔╝╚██████╔╝    ██║  ██║██║  ██║███████╗██║ ╚████║██║  ██║
╚═╝  ╚═╝╚══════╝ ╚═════╝  ╚═════╝    ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═══╝╚═╝  ╚═╝
```

**AI-powered quiz generation & real-time exam proctoring platform**

[![Angular](https://img.shields.io/badge/Angular-21-DD0031?style=flat-square&logo=angular)](https://angular.io)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com)
[![Vercel](https://img.shields.io/badge/Deployed-Vercel-000000?style=flat-square&logo=vercel)](https://vercel.com)
[![Groq](https://img.shields.io/badge/AI-Groq_LLaMA-F55036?style=flat-square)](https://groq.com)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

[**Live Demo**](https://algo-arena-tavx.vercel.app) · [**Report Bug**](https://github.com/Bhavish089/AlgoArena/issues) · [**Request Feature**](https://github.com/Bhavish089/AlgoArena/issues)

</div>

---

## >> WHAT IS ALGOARENA?

AlgoArena is a full-stack exam platform where admins can generate AI-powered quizzes from any syllabus or topic, publish them as live sessions, and monitor candidates in real time — all from a single dashboard.

Candidates join with a session ID and password, attempt the quiz within a time limit, and get scored instantly. Admins can review every answer, override scores manually, and detect suspicious behavior via tab-switch tracking.

```
ADMIN                          CANDIDATE
  │                               │
  ├─ Generate quiz (AI)           ├─ Sign up / Login
  ├─ Edit questions               ├─ Join session (ID + password)
  ├─ Set timer & expiry           ├─ Attempt quiz
  ├─ Publish → Supabase           ├─ Auto-submit on timeout
  ├─ Watch dashboard live         └─ Get score instantly
  ├─ View candidate logs
  ├─ Override scores
  └─ Terminate session
```

---

## >> TECH STACK

| Layer | Technology |
|---|---|
| **Frontend** | Angular 21, TypeScript, SCSS |
| **Backend (Dev)** | Node.js, Express, Socket.IO |
| **Backend (Prod)** | Vercel Serverless Functions |
| **Database** | Supabase (PostgreSQL) |
| **Auth** | Supabase Auth |
| **AI** | Groq API (LLaMA 3.1 8B Instant) |
| **Deployment** | Vercel (frontend + serverless) |
| **Compression** | Node.js zlib (gzip) |

---

## >> PROJECT STRUCTURE

```
AlgoArena/
│
├── api/                          # Vercel Serverless Functions (Production)
│   ├── generate.js               # AI quiz generation via Groq
│   ├── create-session.js         # Publish quiz → Supabase
│   ├── get-sessions.js           # Fetch admin's active sessions
│   ├── get-submissions.js        # Fetch candidates' answers + scores
│   ├── join-session.js           # Candidate join + decompress quiz
│   ├── submit-exam.js            # Grade + save submission
│   ├── update-score.js           # Manual score override
│   └── terminate-session.js      # Delete session from Supabase
│
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   ├── home/             # Landing page
│   │   │   ├── login/            # Auth — login
│   │   │   ├── signup/           # Auth — register
│   │   │   ├── dashboard/        # Admin control center
│   │   │   ├── examgen/          # Quiz builder (setup → edit → preview → publish)
│   │   │   └── candidate/        # Exam attempt interface
│   │   ├── services/
│   │   │   └── auth.ts           # Supabase auth service + session management
│   │   ├── app.routes.ts         # SPA routing
│   │   └── app.config.ts
│   ├── environments/
│   │   ├── environment.ts        # Production (Supabase + serverless)
│   │   └── environment.development.ts  # Dev (Socket.IO + proxy)
│   └── styles.css                # Global theme variables (light/dark/high-contrast)
│
├── src/server/
│   └── socket-server.js          # Express + Socket.IO server (local dev only)
│
├── proxy.conf.json               # Angular dev proxy → localhost:3000
├── vercel.json                   # Vercel build config + API rewrites
└── package.json
```

---

## >> ARCHITECTURE

### Dev vs Production

AlgoArena runs two different backends depending on environment:

```
┌─────────────────────────────────────────────────────────┐
│  DEVELOPMENT (npm run dev)                               │
│                                                         │
│  Browser → Angular (4200) → proxy → Express (3000)     │
│                                        └── Socket.IO    │
│                                        └── In-memory    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  PRODUCTION (Vercel)                                    │
│                                                         │
│  Browser → Angular (static) → vercel.json rewrites     │
│                                └── /api/*.js (serverless)│
│                                └── Supabase (persistent) │
└─────────────────────────────────────────────────────────┘
```

### Data Flow — Quiz Generation

```
Admin fills form (title, syllabus, count, timer, password)
    │
    ▼
POST /generate → api/generate.js
    │
    ▼
Groq LLaMA 3.1 8B → JSON quiz object
    │
    ▼
Normalize + pad to exact question count
    │
    ▼
Return to Angular → examgen editor
    │
    ▼
Admin edits/previews → clicks Publish
    │
    ▼
POST /create-session → api/create-session.js
    │
    ├── Verify admin token (Supabase Auth)
    ├── Check role === 'admin' in profiles table
    ├── gzip compress quiz data → base64
    └── INSERT into sessions table (Supabase)
```

### Data Flow — Candidate Attempt

```
Candidate enters session ID + name + password
    │
    ▼
POST /join-session → api/join-session.js
    │
    ├── Verify candidate token
    ├── Check session exists + not expired + not closed
    ├── Check password matches
    ├── Check no duplicate submission
    ├── Decompress (base64 → gunzip → JSON)
    └── Return questions + timer
    │
    ▼
Candidate attempts quiz (timer counts down)
    │
    ├── Tab switch detected → tabSwitches++
    └── Timer hits 0 → auto-submit
    │
    ▼
POST /submit-exam → api/submit-exam.js
    │
    ├── Verify candidate token
    ├── Decompress questions from session
    ├── Grade answers (case-insensitive match)
    ├── Calculate suspicion (CLEAN/MEDIUM/HIGH)
    └── INSERT into submissions table
```

---

## >> DATABASE SCHEMA

```sql
-- User profiles (extends Supabase Auth)
profiles
  ├── id          uuid  PK → auth.users
  ├── email       text
  ├── full_name   text
  ├── phone       text
  ├── role        text  CHECK ('admin' | 'candidate')
  └── created_at  timestamptz

-- Exam sessions
sessions
  ├── id              text  PK  (format: ALGO-XXXX)
  ├── owner_id        uuid  → auth.users
  ├── title           text
  ├── description     text
  ├── password        text
  ├── validity_start  timestamptz
  ├── expiry          timestamptz
  ├── submit_timeout  int   (minutes)
  ├── max_candidates  int
  ├── data            text  (gzip compressed + base64 encoded quiz)
  ├── closed          boolean
  └── created_at      timestamptz

-- Candidate submissions
submissions
  ├── id            uuid  PK
  ├── session_id    text  → sessions
  ├── candidate_id  uuid  → auth.users
  ├── answers       jsonb
  ├── score         int
  ├── status        text
  ├── tab_switches  int
  ├── suspicion     text  ('CLEAN' | 'MEDIUM' | 'HIGH')
  ├── time_taken    int   (seconds)
  └── submitted_at  timestamptz
```

**Auto-cleanup:** pg_cron deletes expired sessions every 10 minutes.

---

## >> API REFERENCE

All endpoints are Vercel Serverless Functions. In development they're proxied via `proxy.conf.json` to `localhost:3000`.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/generate` | — | Generate quiz via Groq AI |
| `POST` | `/create-session` | Admin token | Publish quiz to Supabase |
| `GET` | `/get-sessions` | Admin token | Fetch admin's active sessions |
| `GET` | `/get-submissions` | Admin token | Fetch session's candidate submissions |
| `POST` | `/join-session` | Candidate token | Validate + join a session |
| `POST` | `/submit-exam` | Candidate token | Grade + save answers |
| `POST` | `/update-score` | Admin token | Override candidate score |
| `POST` | `/terminate-session` | Admin token | Delete session |

### POST /generate
```json
// Request
{ "syllabus": "Binary Search Trees", "count": 10 }

// Response
{ "questions": [{ "type": "MCQ", "text": "...", "options": [...], "correctAnswer": "..." }] }
```

### POST /create-session
```json
// Request
{
  "title": "DSA Mid-Term",
  "description": "...",
  "questions": [...],
  "password": "secret123",
  "validityStart": "2026-05-24T10:00:00Z",
  "expiryDateTime": "2026-05-24T12:00:00Z",
  "submitTimeout": 60,
  "maxCandidates": 50,
  "ownerToken": "eyJ..."
}

// Response
{ "success": true, "sessionId": "ALGO-4821" }
```

---

## >> GETTING STARTED

### Prerequisites

- Node.js 18+
- Angular CLI 21
- Supabase account
- Groq API key

### Local Development

```bash
# 1. Clone the repo
git clone https://github.com/Bhavish089/AlgoArena.git
cd AlgoArena

# 2. Install dependencies
npm install

# 3. Create .env file
cp .env.example .env
# Fill in: GROQ_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY

# 4. Start the backend server (terminal 1)
npm run server

# 5. Start the Angular dev server (terminal 2)
npm run dev
# Runs on http://localhost:4200
# API calls proxy to localhost:3000 via proxy.conf.json
```

### Environment Variables

| Variable | Where | Description |
|---|---|---|
| `GROQ_API_KEY` | `.env` + Vercel | Groq API key for AI generation |
| `SUPABASE_URL` | `.env` + Vercel | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | `.env` + Vercel | Supabase service role key (server-side only) |

### Supabase Setup

1. Create a new Supabase project
2. Run the schema SQL (see `database/schema.sql` or the Database Schema section above)
3. Enable `pg_cron` extension for auto-cleanup
4. Add your Supabase URL + publishable key to `src/environments/environment.ts`

### Deploy to Vercel

```bash
# Push to GitHub — Vercel auto-deploys on every push to main
git push origin main
```

Add these environment variables in **Vercel → Settings → Environment Variables**:
- `GROQ_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`

---

## >> FEATURES

### For Admins
- **AI Quiz Generation** — Enter any syllabus topic, get MCQ/TF/Short answer questions instantly
- **Question Editor** — Edit, add, remove questions before publishing
- **Preview Mode** — Review the full quiz before going live
- **Session Control** — Set validity window, time limit, password, max candidates
- **Live Dashboard** — See candidates as they submit in real time (polls every 10s)
- **Detailed Logs** — View every answer per candidate with correct/incorrect breakdown
- **Score Override** — Manually adjust any candidate's score
- **Terminate** — End a session instantly

### For Candidates
- **Simple Join** — Session ID + name + password
- **Live Timer** — Countdown with auto-submit on expiry
- **MCQ / True-False / Short Answer** — All question types supported
- **Instant Score** — See result immediately after submission
- **Anti-cheat** — Tab switches tracked and flagged (CLEAN / MEDIUM / HIGH)

### Platform
- **3 Themes** — Light, Dark, High-Contrast
- **Fully Responsive** — Mobile, tablet, desktop
- **Role-based** — Admin and candidate accounts
- **Secure** — Supabase RLS, token-based auth on all endpoints
- **Compressed Storage** — Quiz data gzip compressed before saving to DB

---

## >> SCRIPTS

```bash
npm run dev        # Angular dev server with proxy
npm run server     # Express + Socket.IO backend (dev only)
npm run build      # Production Angular build
npm test           # Run unit tests
```

---

## >> ROADMAP

- [ ] Group quizzes (collaborative attempt mode)
- [ ] Real-time dashboard updates (Supabase Realtime)
- [ ] Email notifications on session publish
- [ ] Question bank — save and reuse questions
- [ ] Analytics — score distributions, time analysis
- [ ] PDF export of results
- [ ] OAuth login (Google, GitHub)

---

## >> CONTRIBUTING

Pull requests are welcome. For major changes, please open an issue first.

```bash
git checkout -b feature/your-feature
git commit -m "feat: your feature"
git push origin feature/your-feature
# Open a PR
```

---

## >> LICENSE

MIT © [Bhavish Agrawal](https://github.com/Bhavish089)

---

<div align="center">

Built with Angular, Supabase, Groq, and Vercel

*>> SYSTEM ONLINE — GOOD LUCK, CANDIDATES.*

</div>
