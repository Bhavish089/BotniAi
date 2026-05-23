const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

module.exports = async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).end();

    const token = req.headers.authorization?.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: 'Unauthorized' });

    const sessionId = req.query.sessionId;
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

    const { data: session } = await supabase
        .from('sessions')
        .select('owner_id')
        .eq('id', sessionId)
        .single();

    if (!session || session.owner_id !== user.id)
        return res.status(403).json({ error: 'Forbidden' });

    const { data: submissions, error: subError } = await supabase
        .from('submissions')
        .select('candidate_id, score, answers, time_taken, tab_switches, suspicion, submitted_at')
        .eq('session_id', sessionId);

    if (subError) return res.status(500).json({ error: subError.message });

    const candidateIds = (submissions || []).map(function(s) { return s.candidate_id; });

    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', candidateIds);

    const profileMap = {};
    (profiles || []).forEach(function(p) { profileMap[p.id] = p.email; });

    const enriched = (submissions || []).map(function(s) {
        return Object.assign({}, s, {
            candidate_email: profileMap[s.candidate_id] || s.candidate_id
        });
    });

    res.json({ submissions: enriched });
};