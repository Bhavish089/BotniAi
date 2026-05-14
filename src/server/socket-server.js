const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const Groq = require('groq-sdk');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- MIDDLEWARE & STATIC PATHS ---
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- MODULAR ROUTES (STAGE 2 - FULLY PRESERVED) ---
const examRoutes = require('../routes/examRoutes');
const judgeRoutes = require('../routes/judge');
app.use('/api/exams', examRoutes);
app.use('/api/judge', judgeRoutes);

// --- CONFIGURATION ---
const groq = new Groq({
    apiKey: '_GROQ_API_KEY_', 
});
let activeSessions = {};

// --- 1. AI GENERATION ENDPOINT (PRESERVED) ---
app.post('/generate', async (req, res) => {
    try {
        const { syllabus, count } = req.body;
        const completion = await groq.chat.completions.create({
            messages: [{
                    role: "system",
                    content: `You are an exam generator. Return ONLY a valid JSON object. 
                    STRICT RULE: You must generate EXACTLY ${count} questions. No more, no less.
                    Format: { "questions": [ { "type": "MCQ" | "Short" | "TF", "text": "...", "options": ["A", "B", "C", "D"], "correctAnswer": "...", "media": {"type": "none", "content": ""} } ] }`
                },
                {
                    role: "user",
                    content: `Generate exactly ${count} technical questions based on this syllabus: ${syllabus}. Mix MCQ, TF, and Short answer types.`
                }
            ],
            model: 'llama-3.1-8b-instant',
            response_format: { type: "json_object" }
        });

        const aiResponse = JSON.parse(completion.choices[0].message.content);
        if (aiResponse.questions && aiResponse.questions.length > count) {
            aiResponse.questions = aiResponse.questions.slice(0, count);
        }
        res.json(aiResponse);
    } catch (e) {
        console.error("AI Generation Error:", e);
        res.status(500).json({ error: "Failed to generate questions." });
    }
});

// --- 2. SESSION CREATION (UPDATED WITH UNIQUE LIMITS) ---
app.post('/create-session', (req, res) => {
    const { title, questions, password, expiryDateTime, maxCandidates, dbVerify } = req.body;
    const sessionId = "ALGO-" + Math.floor(1000 + Math.random() * 9000);

    // FIX: Storing limits and verification unique to this specific session ID
    activeSessions[sessionId] = {
        title,
        questions,
        password,
        expiry: expiryDateTime,
        maxCandidates: parseInt(maxCandidates) || 50,
        dbVerify: dbVerify || false,
        createdAt: Date.now(),
        students: {} // Keyed by socket.id
    };

    console.log(`New Session Created: ${sessionId} | Limit: ${maxCandidates}`);
    res.json({ success: true, sessionId });
});

// --- 3. SOCKET.IO REAL-TIME ENGINE ---
io.on('connection', (socket) => {
    console.log(`User Connected: ${socket.id}`);
    socket.emit('admin-init', activeSessions);

    // STUDENT JOINING (HARDENED LIMITS & EXPIRY)
    socket.on('join-session', ({ sessionId, password, name }) => {
        const session = activeSessions[sessionId];
        if (!session) return socket.emit('join-error', 'Session not found.');
        
        // 1. UNIQUE Expiry Check
        if (new Date() > new Date(session.expiry)) {
            return socket.emit('join-error', 'Access Denied: Session Expired.');
        }

        // 2. UNIQUE Candidate Limit Check (Per Session ID)
        const currentStudentCount = Object.keys(session.students).length;
        if (currentStudentCount >= session.maxCandidates) {
            return socket.emit('join-error', `ROOM_FULL: This exam has reached its ${session.maxCandidates} candidate limit.`);
        }

        // 3. Name Format Validation (Regex Hook)
        const nameRegex = /^[a-zA-Z]{2,}(?: [a-zA-Z]+){1,}$/;
        if (!nameRegex.test(name)) {
            return socket.emit('join-error', 'INVALID_NAME: Please provide a valid Full Name.');
        }

        // 4. Persistence Check: Block re-entry if already submitted
        const alreadyIn = Object.values(session.students).find(s => s.name === name && s.status === 'SUBMITTED');
        if (alreadyIn) return socket.emit('join-error', 'RE-ENTRY_BLOCKED: You have already submitted this exam.');

        if (session.password !== password) return socket.emit('join-error', 'Incorrect password.');

        session.students[socket.id] = {
            name: name,
            status: 'LIVE',
            answers: {},
            score: 0,
            bookmarks: [],
            tabSwitches: 0,
            suspicion: 'CLEAN',
            startTime: Date.now()
        };

        socket.join(sessionId);
        io.emit('admin-update', { sessionId, session });
        socket.emit('session-data', { title: session.title, questions: session.questions });
    });

    // PROCTORING: TAB SWITCH LOGGING
    socket.on('tab-switch', ({ sessionId }) => {
        const session = activeSessions[sessionId];
        if (session && session.students[socket.id]) {
            session.students[socket.id].tabSwitches++;
            io.emit('admin-update', { sessionId, session });
        }
    });

    // STUDENT SUBMISSION & VECTOR GRADING
    socket.on('submit-exam', async ({ sessionId, answers, bookmarks, metrics }) => {
        const session = activeSessions[sessionId];
        if (!session || !session.students[socket.id]) return;

        const student = session.students[socket.id];
        student.answers = answers;
        student.bookmarks = bookmarks;
        student.status = 'EVALUATING';

        let calculatedScore = 0;
        
        // VECTOR-STYLE SEMANTIC EVALUATION
        for (let i = 0; i < session.questions.length; i++) {
            const q = session.questions[i];
            const sAns = String(answers[i] || "").trim();

            if (q.type === 'Short') {
                try {
                    const evalPrompt = `Evaluate technical similarity (0-100): Key: "${q.correctAnswer}", Student: "${sAns}". Return JSON: {"similarity": number}`;
                    const completion = await groq.chat.completions.create({
                        messages: [{ role: "user", content: evalPrompt }],
                        model: 'llama-3.1-8b-instant',
                        response_format: { type: "json_object" }
                    });
                    const res = JSON.parse(completion.choices[0].message.content);
                    if (res.similarity >= 85) calculatedScore++;
                } catch (e) { console.error("AI_EVAL_ERR"); }
            } else {
                if (sAns.toLowerCase() === String(q.correctAnswer).trim().toLowerCase()) calculatedScore++;
            }
        }

        // THE TRUMP CARD: BEHAVIORAL AUDIT
        const timeTaken = (Date.now() - student.startTime) / 1000;
        if (metrics.wpm > 110 && timeTaken > 60) {
            student.suspicion = "HIGH_WPM_DETECTED";
        } else if (student.tabSwitches > 3) {
            student.suspicion = "TAB_VOLATILITY";
        }

        student.score = calculatedScore;
        student.status = 'SUBMITTED';
        io.emit('admin-update', { sessionId, session });
        socket.emit('submission-confirmed', { score: calculatedScore });
    });

    // ADMIN OVERRIDES (PRESERVED)
    socket.on('terminate-session', (sessionId) => {
        if (activeSessions[sessionId]) {
            io.to(sessionId).emit('force-disconnect');
            delete activeSessions[sessionId];
            io.emit('admin-init', activeSessions);
        }
    });

    socket.on('update-score', ({ sessionId, studentId, newScore }) => {
        const session = activeSessions[sessionId];
        if (session && session.students[studentId]) {
            session.students[studentId].score = parseInt(newScore);
            io.emit('admin-update', { sessionId, session });
        }
    });

    socket.on('disconnect', () => {
        console.log(`User Disconnected: ${socket.id}`);
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`AlgoArena Online: Port ${PORT}`);
});