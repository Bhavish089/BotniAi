const { createClient } = require('@supabase/supabase-js');
const { gzipSync } = require('zlib');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    let body = req.body;
    if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch { body = {}; }
    }
    if (!body) body = {};

    const { title, description, questions, password, validityStart,
            expiryDateTime, submitTimeout, maxCandidates, ownerToken } = body;

    // Verify the user is an admin
    const { data: { user }, error: authError } = await supabase.auth.getUser(ownerToken);
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

    const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') return res.status(403).json({ error: 'Admins only' });

    // Compress quiz data
    const compressed = gzipSync(JSON.stringify({ questions })).toString('base64');
    const sessionId = 'ALGO-' + Math.floor(1000 + Math.random() * 9000);

    const { error } = await supabase.from('sessions').insert({
        id: sessionId,
        owner_id: user.id,
        title,
        description,
        password,
        validity_start: validityStart,
        expiry: expiryDateTime,
        submit_timeout: submitTimeout || 60,
        max_candidates: maxCandidates || 50,
        data: compressed
    });

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, sessionId });
};