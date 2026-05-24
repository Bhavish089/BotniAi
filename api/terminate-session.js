const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    if (!body) body = {};

    const { sessionId, ownerToken } = body;

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

    const { error } = await serviceClient
        .from('sessions')
        .delete()
        .eq('id', sessionId)
        .eq('owner_id', user.id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
};