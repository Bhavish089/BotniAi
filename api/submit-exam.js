const { createClient } = require('@supabase/supabase-js');
const { gunzipSync } = require('zlib');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    if (!body) body = {};

    const { sessionId, answers, metrics, candidateToken, tabSwitches } = body;

    const { data: { user }, error: authError } = await supabase.auth.getUser(candidateToken);
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

    const { data: session } = await supabase
        .from('sessions')
        .select('data')
        .eq('id', sessionId)
        .single();

    if (!session) return res.status(404).json({ error: 'Session not found' });

    const { questions } = JSON.parse(gunzipSync(Buffer.from(session.data, 'base64')).toString());

    let score = 0;
    questions.forEach(function(q, i) {
        if (answers[i] && q.correctAnswer &&
            answers[i].trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()) {
            score++;
        }
    });

    const suspicion = tabSwitches > 3 ? 'HIGH' : tabSwitches > 0 ? 'MEDIUM' : 'CLEAN';

    const { error } = await supabase.from('submissions').insert({
        session_id: sessionId,
        candidate_id: user.id,
        answers: answers,
        score: score,
        status: 'SUBMITTED',
        tab_switches: tabSwitches || 0,
        suspicion: suspicion,
        time_taken: Math.round((metrics && metrics.timeTaken) ? metrics.timeTaken : 0)
    });

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, score: score, total: questions.length });
};