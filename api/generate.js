// api/generate.js
const Groq = require('groq-sdk');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const { syllabus, count } = req.body;
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const hasGroqKey = !!process.env.GROQ_API_KEY;

    try {
        if (!hasGroqKey) {
            const fallback = Array.from({ length: count || 5 }, (_, i) => ({
                type: 'MCQ',
                text: `Fallback question ${i + 1} about ${syllabus || 'the topic'}.`,
                options: ['Option A', 'Option B', 'Option C', 'Option D'],
                correctAnswer: 'Option A'
            }));
            return res.json({ questions: fallback });
        }

        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: 'system',
                    content: `You are an exam generator. Return ONLY a valid JSON object. STRICT RULE: Generate EXACTLY ${count} questions. Format: { "questions": [ { "type": "MCQ" | "Short" | "TF", "text": "...", "options": ["A","B","C","D"], "correctAnswer": "..." } ] }`
                },
                {
                    role: 'user',
                    content: `Generate exactly ${count} technical questions based on: ${syllabus}. Mix MCQ, TF, and Short answer types.`
                }
            ],
            model: 'llama-3.1-8b-instant',
            response_format: { type: 'json_object' }
        });

        const rawText = completion?.choices?.[0]?.message?.content;
        let aiResponse;

        try {
            aiResponse = typeof rawText === 'string' ? JSON.parse(rawText) : rawText;
        } catch {
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
        const fallback = Array.from({ length: count || 5 }, (_, i) => ({
            type: 'MCQ',
            text: `Fallback question ${i + 1} about ${syllabus || 'the topic'}.`,
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            correctAnswer: 'Option A'
        }));
        res.json({ questions: fallback });
    }
};