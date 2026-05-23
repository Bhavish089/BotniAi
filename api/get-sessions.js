const { createClient } = require('@supabase/supabase-js');
const { gunzipSync } = require('zlib');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

module.exports = async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).end();

    const token = req.headers.authorization?.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: 'Unauthorized' });

    const { data: sessions, error: dbError } = await supabase
        .from('sessions')
        .select('id, title, description, validity_start, expiry, max_candidates, closed, created_at')
        .eq('owner_id', user.id)
        .gt('expiry', new Date().toISOString())
        .eq('closed', false)
        .order('created_at', { ascending: false });

    if (dbError) return res.status(500).json({ error: dbError.message });
    res.json({ sessions: sessions || [] });
};