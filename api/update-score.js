const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    if (!body) body = {};

    const { sessionId, candidateId, newScore, ownerToken } = body;

    const userClient = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY,
        { global: { headers: { Authorization: `Bearer ${ownerToken}` } } }
    );

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

    const serviceClient = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
    );

    // Verify session belongs to this admin
    const { data: session } = await serviceClient
        .from('sessions').select('owner_id').eq('id', sessionId).single();
    if (!session || session.owner_id !== user.id)
        return res.status(403).json({ error: 'Forbidden' });

    const { error } = await serviceClient
        .from('submissions')
        .update({ score: newScore })
        .eq('session_id', sessionId)
        .eq('candidate_id', candidateId);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
};