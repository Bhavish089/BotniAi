<div align="center">

<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=700&size=40&duration=3000&pause=1000&color=FFFFFF&background=0A0A0A&center=true&vCenter=true&width=700&height=100&lines=ALGOARENA;AI+EXAM+PLATFORM;>> SYSTEM+ONLINE" alt="AlgoArena" />

**AI-powered quiz generation & real-time exam proctoring platform**

[![Angular](https://img.shields.io/badge/Angular-21-DD0031?style=for-the-badge&logo=angular&logoColor=white)](https://angular.io)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![Vercel](https://img.shields.io/badge/Deployed-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com)
[![Groq](https://img.shields.io/badge/AI-Groq_LLaMA-F55036?style=for-the-badge)](https://groq.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![License](https://img.shields.io/badge/License-IIMT-gold?style=for-the-badge)](LICENSE)

[**🚀 Live Demo**](https://algo-arena-tavx.vercel.app) · [**🐛 Report Bug**](https://github.com/Bhavish089/AlgoArena/issues) · [**✨ Request Feature**](https://github.com/Bhavish089/AlgoArena/issues)

---

*Major Project — Diploma in Computer Science Engineering*  
*3rd Year · 6th Semester · IIMT*

</div>

---

## >> WHAT IS ALGOARENA?

AlgoArena is a full-stack exam platform where admins generate AI-powered quizzes from any syllabus, publish them as live sessions, and monitor candidates in real time — all from a single dashboard.

Candidates join with a session ID and password, attempt the quiz within a time limit, and get scored instantly. Admins can review every answer, override scores manually, and detect suspicious behavior via tab-switch tracking.

```
ADMIN                          CANDIDATE
  │                               │
  ├─ Generate quiz (AI)           ├─ Sign up / Login
  ├─ Edit questions               ├─ Join session (ID + password)
  ├─ Set timer & expiry           ├─ Attempt quiz (MCQ/TF/Short)
  ├─ Publish → Supabase           ├─ Auto-submit on timeout
  ├─ Watch dashboard live         └─ Get score instantly
  ├─ View candidate logs
  ├─ Override scores
  └─ Terminate session
```

---

## >> TECH STACK

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | Angular 21, TypeScript, SCSS | SPA with routing + reactive UI |
| **Backend (Dev)** | Node.js, Express, Socket.IO | Local dev server with real-time |
| **Backend (Prod)** | Vercel Serverless Functions | 8 API endpoints, zero cold-start issues |
| **Database** | Supabase (PostgreSQL) | Sessions, submissions, profiles |
| **Auth** | Supabase Auth | Email/password, JWT tokens, RLS |
| **AI** | Groq API (LLaMA 3.1 8B Instant) | Quiz generation from syllabus |
| **Compression** | Node.js zlib (gzip) | Quiz data compressed ~80% before DB storage |
| **Deployment** | Vercel | Auto-deploy on push to `main` |

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
│   │   │   └── auth.ts           # Supabase auth + session management
│   │   ├── app.routes.ts         # SPA routing
│   │   └── app.config.ts
│   ├── environments/
│   │   ├── environment.ts        # Production config
│   │   └── environment.development.ts  # Dev config (Socket.IO + proxy)
│   └── styles.css                # Global theme variables (light/dark/high-contrast)
│
├── src/server/
│   └── socket-server.js          # Express + Socket.IO (local dev only)
│
├── proxy.conf.json               # Angular dev proxy → localhost:3000
├── vercel.json                   # Build config + API rewrites
└── package.json
```

---

## >> ARCHITECTURE

### Dev vs Production

```
┌──────────────────────────────────────────────────────┐
│  DEVELOPMENT  (npm run dev)                          │
│                                                      │
│  Browser → Angular :4200 → proxy → Express :3000    │
│                                     └─ Socket.IO     │
│                                     └─ In-memory     │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│  PRODUCTION  (Vercel)                                │
│                                                      │
│  Browser → Angular (static build)                   │
│               └── vercel.json rewrites               │
│                     └── /api/*.js (serverless)       │
│                           └── Supabase (persistent)  │
└──────────────────────────────────────────────────────┘
```

### Quiz Generation Flow

```
Admin fills form (title, syllabus, count, timer, password)
    ↓
POST /generate → api/generate.js → Groq LLaMA 3.1
    ↓
Normalize questions → Angular editor
    ↓
Admin edits/previews → Publish
    ↓
POST /create-session
    ├── Verify admin JWT
    ├── Check role === 'admin'
    ├── gzip compress quiz → base64
    └── INSERT into Supabase sessions table
```

### Candidate Flow

```
Enter session ID + name + password
    ↓
POST /join-session
    ├── Verify candidate JWT
    ├── Check session valid + not expired
    ├── Check password + no duplicate submission
    └── Decompress + return questions
    ↓
Attempt quiz (tab switches tracked)
    ↓
POST /submit-exam
    ├── Grade answers
    ├── Calculate suspicion level
    └── INSERT into submissions table
```

---

## >> DATABASE SCHEMA

```sql
profiles      id, email, full_name, phone, role, created_at
sessions      id (ALGO-XXXX), owner_id, title, password,
              validity_start, expiry, submit_timeout,
              max_candidates, data (gzipped), closed, created_at
submissions   id, session_id, candidate_id, answers,
              score, status, tab_switches, suspicion,
              time_taken, submitted_at
```

> Quiz data is gzip compressed before storing — reduces payload ~80% (20KB → ~2KB typical quiz).  
> pg_cron auto-deletes expired sessions every 10 minutes.

---

## >> API REFERENCE

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/generate` | — | Generate quiz via Groq AI |
| `POST` | `/create-session` | Admin | Publish quiz to Supabase |
| `GET` | `/get-sessions` | Admin | Fetch active sessions |
| `GET` | `/get-submissions` | Admin | Fetch candidate submissions |
| `POST` | `/join-session` | Candidate | Validate + join session |
| `POST` | `/submit-exam` | Candidate | Grade + save answers |
| `POST` | `/update-score` | Admin | Override candidate score |
| `POST` | `/terminate-session` | Admin | Delete session |

---

## >> GETTING STARTED

### Prerequisites

```
Node.js 18+
Angular CLI 21
Supabase account
Groq API key
```

### Local Development

```bash
# Clone
git clone https://github.com/Bhavish089/AlgoArena.git
cd AlgoArena

# Install
npm install

# Environment
cp .env.example .env
# Add: GROQ_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY

# Start backend (terminal 1)
npm run server

# Start frontend (terminal 2)
npm run dev
# → http://localhost:4200
```

### Environment Variables

| Variable | Used In | Description |
|---|---|---|
| `GROQ_API_KEY` | `.env` + Vercel | Groq API key |
| `SUPABASE_URL` | `.env` + Vercel | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | `.env` + Vercel | Service role key (server only) |

### Deploy to Vercel

```bash
git push origin main   # Vercel auto-deploys
```

Add env vars in **Vercel → Settings → Environment Variables**.

---

## >> FEATURES

```
ADMIN                           CANDIDATE
──────────────────────          ──────────────────────
✓ AI quiz generation            ✓ Account registration
✓ Question editor               ✓ Session join flow
✓ Preview before publish        ✓ MCQ / TF / Short answer
✓ Validity + timer config       ✓ Live countdown timer
✓ Password protection           ✓ Auto-submit on expiry
✓ Live dashboard                ✓ Instant score display
✓ Per-candidate answer logs     ✓ Tab-switch tracking
✓ Manual score override
✓ One-click terminate

PLATFORM
──────────────────────
✓ Light / Dark / High-Contrast themes
✓ Fully responsive (mobile + tablet + desktop)
✓ Role-based access (admin / candidate)
✓ Compressed quiz storage (gzip)
✓ Auto-delete expired sessions (pg_cron)
✓ Duplicate submission prevention
```

---

## >> SCRIPTS

```bash
npm run dev      # Angular dev server + proxy
npm run server   # Express + Socket.IO backend (dev only)
npm run build    # Production build → dist/AlgoArena-Master/browser
npm test         # Unit tests
```

---

## >> ROADMAP

- [ ] Group quizzes (collaborative mode)
- [ ] Supabase Realtime (live dashboard updates)
- [ ] Email notifications on publish
- [ ] Question bank
- [ ] Analytics & score distributions
- [ ] PDF result export
- [ ] OAuth (Google / GitHub)

---

## >> TEAM

<div align="center">

| | Name | Role |
|---|---|---|
| 👨‍💻 | **Bhavish Agrawal** | Lead Developer — Full Stack, Architecture, Deployment |
| 👨‍💻 | **Priyanshu Pushpam** | Frontend Developer — UI/UX, Components |
| 👨‍💻 | **Ansh Singhal** | Backend Developer — API, Database |
| 👨‍💻 | **Mizbual Haque** | Developer — Testing, Integration |

*Diploma in Computer Science Engineering — 3rd Year, 6th Semester*  
*Major Project — IIMT*

</div>

---

<div align="center">

Built with Angular · Supabase · Groq · Vercel

**>> SYSTEM ONLINE — GOOD LUCK, CANDIDATES.**

</div>
