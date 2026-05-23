const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const Groq = require('groq-sdk');
const cors = require('cors');
const path = require('path');

// 1. DYNAMICALLY TARGET THE ROOT EXTRA-LEVEL OVERRIDE FOR YOUR .ENV
// Your file is 2 levels up from src/server/ (../ takes you to src, ../../ takes you to root)
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// --- MIDDLEWARE & STATIC PATHS ---
app.use(cors());
app.use(express.json());

// --- MODULAR ROUTES ---
// Point directly backwards from src/server to src/routes cleanly
const examRoutes = require(path.resolve(__dirname, '../routes/examRoutes.js'));
const judgeRoutes = require(path.resolve(__dirname, '../routes/judge.js'));

app.use('/api/exams', examRoutes);
app.use('/api/judge', judgeRoutes);

// --- CONFIGURATION ---
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

const hasGroqKey = !!process.env.GROQ_API_KEY;

const quizzes = {};
const quizSessions = {};
const submissions = {};
const activeSessions = {};

function generateId(prefix) {
    return `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function computeStatus(quiz) {
    if (quiz.closed) return 'closed';
    const now = new Date();
    const start = new Date(quiz.validityStart);
    const end = new Date(quiz.validityEnd);
    if (!isNaN(start.valueOf()) && now < start) return 'draft';
    if (!isNaN(end.valueOf()) && now > end) return 'expired';
    return 'active';
}

// --- 1. AI GENERATION ENDPOINT ---
app.post('/generate', async (req, res) => {
    try {
        const { syllabus, count } = req.body;
        if (!hasGroqKey) {
            console.warn('GROQ_API_KEY not set — returning fallback questions.');
            const fallbackQuestions = Array.from({ length: count || 5 }, (_, i) => ({
                type: 'MCQ',
                text: `Fallback question ${i + 1} about ${syllabus || 'the topic'}.`,
                options: ['Option A', 'Option B', 'Option C', 'Option D'],
                correctAnswer: 'Option A'
            }));
            return res.json({ questions: fallbackQuestions });
        }
        const completion = await groq.chat.completions.create({
            messages: [{
                    role: 'system',
                    content: `You are an exam generator. Return ONLY a valid JSON object. STRICT RULE: Generate EXACTLY ${count} questions. Format: { "questions": [ { "type": "MCQ" | "Short" | "TF", "text": "...", "options": ["A", "B", "C", "D"], "correctAnswer": "..." } ] }`,
                },
                {
                    role: 'user',
                    content: `Generate exactly ${count} technical questions based on: ${syllabus}. Mix MCQ, TF, and Short answer types.`
                }
            ],
            model: 'llama-3.1-8b-instant',
            response_format: { type: 'json_object' }
        });

        const rawText = completion?.choices?.[0]?.message?.content || completion?.choices?.[0]?.message?.text || completion?.choices?.[0]?.text;
        let aiResponse;

        try {
            aiResponse = typeof rawText === 'string' ? JSON.parse(rawText) : rawText;
        } catch (parseError) {
            const jsonMatch = String(rawText).match(/\{[\s\S]*\}/);
            aiResponse = jsonMatch ? JSON.parse(jsonMatch[0]) : { questions: [] };
        }

        let questions = Array.isArray(aiResponse?.questions) ? aiResponse.questions : [];
        if (questions.length > count) questions = questions.slice(0, count);
        if (questions.length < count) {
            const placeholders = Array.from({ length: count - questions.length }, (_, i) => ({
                type: 'MCQ',
                text: `Placeholder question ${questions.length + i + 1} about ${syllabus}.`,
                options: ['Option A', 'Option B', 'Option C', 'Option D'],
                correctAnswer: 'Option A'
            }));
            questions = questions.concat(placeholders);
        }

        res.json({ questions });
    } catch (e) {
        console.error('AI Generation Error:', e);
        const fallbackQuestions = Array.from({ length: req.body.count || 5 }, (_, i) => ({
            type: 'MCQ',
            text: `Fallback question ${i + 1} about ${req.body.syllabus || 'the topic'}.`,
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            correctAnswer: 'Option A'
        }));
        res.json({ questions: fallbackQuestions });
    }
});

// --- QUIZ CRUD APIS ---
app.get('/api/quizzes/all', (req, res) => {
    const quizzesArray = Object.values(quizzes).map(q => ({
        ...q,
        submissions: submissions[q.id] || []
    }));
    res.json({ quizzes: quizzesArray });
});

app.post('/api/quizzes/create', (req, res) => {
    try {
        const { title, description, validityStart, validityEnd, submitTimeout, password, questions } = req.body;
        if (!title || !questions || questions.length === 0) {
            return res.status(400).json({ error: 'Title and questions are required' });
        }

        const quizId = generateId('QUIZ');
        const quiz = {
            id: quizId,
            title,
            description: description || '',
            validityStart,
            validityEnd,
            submitTimeout: submitTimeout || 3,
            password: typeof password === 'string' ? password.trim() : '',
            questions,
            createdAt: new Date().toISOString(),
            submissions: [],
            closed: false
        };

        quizzes[quizId] = quiz;
        submissions[quizId] = [];
        io.emit('quiz-updated', quiz);
        res.json({ success: true, quiz });
    } catch (e) {
        console.error('Quiz creation error:', e);
        res.status(500).json({ error: 'Failed to create quiz' });
    }
});

app.post('/api/quizzes/join', (req, res) => {
    try {
        const { quizCode, userName, password } = req.body;
        const cleanedQuizCode = String(quizCode || '').trim();
        const cleanedPassword = String(password || '').trim();

        let quiz = Object.values(quizzes).find(q => String(q.id || '').trim().toUpperCase() === cleanedQuizCode.toUpperCase());
        if (!quiz) {
            quiz = Object.values(quizzes).find(q => String(q.id || '').toUpperCase().includes(cleanedQuizCode.toUpperCase()) || String(q.title || '').toUpperCase().includes(cleanedQuizCode.toUpperCase()));
        }

        if (!quiz) {
            return res.status(404).json({ error: 'Quiz not found', detail: 'No quiz matched the provided code' });
        }

        if (quiz.closed) {
            return res.status(403).json({ error: 'Quiz has been closed' });
        }

        if (quiz.password && quiz.password !== cleanedPassword) {
            return res.status(401).json({ error: 'Invalid access code' });
        }

        const now = new Date();
        const start = new Date(quiz.validityStart);
        const end = new Date(quiz.validityEnd);
        if (!isNaN(start.valueOf()) && now < start) {
            return res.status(403).json({ error: 'Quiz is not currently available', detail: `Quiz starts at ${start.toLocaleString()}` });
        }
        if (!isNaN(end.valueOf()) && now > end) {
            return res.status(403).json({ error: 'Quiz is not currently available', detail: `Quiz ended at ${end.toLocaleString()}` });
        }

        const sessionId = generateId('SESSION');
        const session = {
            id: sessionId,
            quizId: quiz.id,
            quizTitle: quiz.title,
            userName,
            questions: quiz.questions,
            submitTimeout: quiz.submitTimeout,
            startedAt: new Date().toISOString()
        };

        quizSessions[sessionId] = session;
        res.json({ success: true, session });
    } catch (e) {
        console.error('Quiz join error:', e);
        res.status(500).json({ error: 'Failed to join quiz' });
    }
});

app.post('/api/quizzes/submit', (req, res) => {
    try {
        const { sessionId, answers, score } = req.body;
        const session = quizSessions[sessionId];
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        const submission = {
            id: generateId('SUB'),
            sessionId,
            quizId: session.quizId,
            userName: session.userName,
            answers,
            score,
            submittedAt: new Date().toISOString()
        };

        if (!submissions[session.quizId]) submissions[session.quizId] = [];
        submissions[session.quizId].push(submission);

        if (quizzes[session.quizId]) {
            quizzes[session.quizId].submissions = submissions[session.quizId];
        }

        delete quizSessions[sessionId];
        io.emit('submission-received', submission);
        res.json({ success: true, submissionId: submission.id });
    } catch (e) {
        console.error('Quiz submit error:', e);
        res.status(500).json({ error: 'Failed to submit quiz' });
    }
});

app.get('/api/quizzes/:quizId', (req, res) => {
    const quiz = quizzes[req.params.quizId];
    if (!quiz) {
        return res.status(404).json({ error: 'Quiz not found' });
    }
    res.json({ quiz: { ...quiz, submissions: submissions[quiz.id] || [] } });
});

app.post('/api/quizzes/:quizId/close', (req, res) => {
    const quiz = quizzes[req.params.quizId];
    if (!quiz) {
        return res.status(404).json({ error: 'Quiz not found' });
    }
    quiz.closed = true;
    io.emit('quiz-updated', quiz);
    res.json({ success: true });
});

// --- 2. SESSION CREATION ---
app.post('/create-session', (req, res) => {
    const { title, questions, password, expiryDateTime, maxCandidates, dbVerify } = req.body;
    const sessionId = 'ALGO-' + Math.floor(1000 + Math.random() * 9000);

    activeSessions[sessionId] = {
        title,
        questions,
        password,
        expiry: expiryDateTime,
        maxCandidates: parseInt(maxCandidates) || 50,
        dbVerify: dbVerify || false,
        createdAt: Date.now(),
        students: {}
    };

    console.log(`New Session Created: ${sessionId} | Limit: ${maxCandidates}`);
    res.json({ success: true, sessionId });
});

// --- 3. SOCKET.IO REAL-TIME ENGINE ---
io.on('connection', (socket) => {
    console.log(`User Connected: ${socket.id}`);
    socket.emit('admin-init', activeSessions);

    socket.on('join-session', ({ sessionId, password, name }) => {
        const session = activeSessions[sessionId];
        if (!session) return socket.emit('join-error', 'Session not found.');
        if (new Date() > new Date(session.expiry)) return socket.emit('join-error', 'Access Denied: Session Expired.');
        const currentStudentCount = Object.keys(session.students).length;
        if (currentStudentCount >= session.maxCandidates) return socket.emit('join-error', `ROOM_FULL: This exam has reached its ${session.maxCandidates} candidate limit.`);
        const nameRegex = /^[a-zA-Z]{2,}(?: [a-zA-Z]+){1,}$/;
        if (!nameRegex.test(name)) return socket.emit('join-error', 'INVALID_NAME: Please provide a valid Full Name.');
        const alreadyIn = Object.values(session.students).find(s => s.name === name && s.status === 'SUBMITTED');
        if (alreadyIn) return socket.emit('join-error', 'RE-ENTRY_BLOCKED: You have already submitted this exam.');
        if (session.password !== password) return socket.emit('join-error', 'Incorrect password.');

        session.students[socket.id] = {
            name,
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
        socket.emit('session-data', { title: session.title, questions: session.questions, submitTimeout: session.submitTimeout || 60 });
    });

    socket.on('tab-switch', ({ sessionId }) => {
        const session = activeSessions[sessionId];
        if (session && session.students[socket.id]) {
            session.students[socket.id].tabSwitches++;
            io.emit('admin-update', { sessionId, session });
        }
    });

    socket.on('submit-exam', async ({ sessionId, answers, bookmarks, metrics }) => {
        const session = activeSessions[sessionId];
        if (!session || !session.students[socket.id]) return;
        const student = session.students[socket.id];
        student.answers = answers;
        student.bookmarks = bookmarks;
        student.status = 'EVALUATING';
        let calculatedScore = 0;

        for (let i = 0; i < session.questions.length; i++) {
            const q = session.questions[i];
            const sAns = String(answers[i] || '').trim();
            if (q.type === 'Short') {
                try {
                    const evalPrompt = `Evaluate technical similarity (0-100): Key: "${q.correctAnswer}", Student: "${sAns}". Return JSON: {"similarity": number}`;
                    const completion = await groq.chat.completions.create({
                        messages: [{ role: 'user', content: evalPrompt }],
                        model: 'llama-3.1-8b-instant',
                        response_format: { type: 'json_object' }
                    });
                    const res = JSON.parse(completion.choices[0].message.content);
                    if (res.similarity >= 85) calculatedScore++;
                } catch (e) { console.error('AI_EVAL_ERR'); }
            } else {
                if (sAns.toLowerCase() === String(q.correctAnswer).trim().toLowerCase()) calculatedScore++;
            }
        }

        const timeTaken = (Date.now() - student.startTime) / 1000;
        if (metrics.wpm > 110 && timeTaken > 60) student.suspicion = 'HIGH_WPM_DETECTED';
        else if (student.tabSwitches > 3) student.suspicion = 'TAB_VOLATILITY';
        student.score = calculatedScore;
        student.status = 'SUBMITTED';
        io.emit('admin-update', { sessionId, session });
        socket.emit('submission-confirmed', { score: calculatedScore });
    });

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

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`AlgoArena Online: Port ${PORT}`);
});