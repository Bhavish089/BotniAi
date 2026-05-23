// api/create-session.js
// In-memory store (resets on cold start — upgrade to DB later when ready)
const activeSessions = global.activeSessions || (global.activeSessions = {});

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    let body = req.body;
    if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch { body = {}; }
    }
    if (!body) body = {};

    const { title, description, questions, password, validityStart, 
            expiryDateTime, submitTimeout, maxCandidates, dbVerify } = body;

    const sessionId = 'ALGO-' + Math.floor(1000 + Math.random() * 9000);

    activeSessions[sessionId] = {
        title,
        description,
        questions,
        password,
        validityStart,
        expiry: expiryDateTime,
        submitTimeout: submitTimeout || 60,
        maxCandidates: parseInt(maxCandidates) || 50,
        dbVerify: dbVerify || false,
        createdAt: Date.now(),
        students: {}
    };

    console.log(`Session Created: ${sessionId}`);
    res.json({ success: true, sessionId });
};