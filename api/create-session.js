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

    // Verify user with token
    const { data: { user }, error: authError } = await supabase.auth.getUser(ownerToken);
    if (authError || !user) {
        console.error('Auth error:', authError?.message);
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check admin role
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    console.log('Profile:', profile, 'Error:', profileError?.message);

    if (!profile || profile.role !== 'admin') {
        return res.status(403).json({ error: 'Admins only' });
    }

    const compressed = gzipSync(JSON.stringify({ questions })).toString('base64');
    const sessionId = 'ALGO-' + Math.floor(1000 + Math.random() * 9000);

    const { error: insertError } = await supabase.from('sessions').insert({
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

    if (insertError) {
        console.error('Insert error:', insertError.message);
        return res.status(500).json({ error: insertError.message });
    }

    res.json({ success: true, sessionId });
};