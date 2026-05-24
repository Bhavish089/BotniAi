const { createClient } = require('@supabase/supabase-js');
const { gunzipSync } = require('zlib');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    if (!body) body = {};

    const { sessionId, password, name, candidateToken } = body;

    if (!candidateToken) return res.status(401).json({ error: 'No token provided' });

    // Verify user with their token
    const userClient = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY,
        { global: { headers: { Authorization: `Bearer ${candidateToken}` } } }
    );

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

    // Use service client for DB operations
    const serviceClient = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
    );

    const { data: session, error: sessionError } = await serviceClient
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();
    if (sessionError || !session) return res.status(404).json({ error: 'Session not found' });
    if (session.closed) return res.status(403).json({ error: 'Session is closed' });
    if (new Date(session.expiry) < new Date()) return res.status(403).json({ error: 'Session has expired' });
    if (session.password && session.password !== password) return res.status(403).json({ error: 'Invalid password' });

    const { data: existing } = await serviceClient
        .from('submissions')
        .select('id')
        .eq('session_id', sessionId)
        .eq('candidate_id', user.id)
        .single();

    if (existing) return res.status(403).json({ error: 'Already submitted this quiz' });

    const decompressed = JSON.parse(gunzipSync(Buffer.from(session.data, 'base64')).toString());

    res.json({
        success: true,
        questions: decompressed.questions,
        submitTimeout: session.submit_timeout,
        title: session.title
    });
};