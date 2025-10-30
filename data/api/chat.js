// api/chat.js
// Simple Vercel serverless function that relays chat messages to OpenAI.
// IMPORTANT: set OPENAI_API_KEY in Vercel Project > Settings > Environment Variables.

import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // parse body (works both with express-like and raw)
  let body = req.body;
  if (!body) {
    try {
      const raw = await new Promise(r => {
        let d = '';
        req.on('data', c => d += c);
        req.on('end', () => r(d));
      });
      body = JSON.parse(raw || '{}');
    } catch (e) { body = {}; }
  }

  const userMessage = (body.message || '').trim();
  if (!userMessage) return res.status(400).json({ error: 'No message provided' });

  // Optionally load tools.json for context (RAG)
  let toolsSnippet = '';
  try {
    const dataPath = path.join(process.cwd(), 'data', 'tools.json');
    if (fs.existsSync(dataPath)) {
      const raw = fs.readFileSync(dataPath, 'utf8');
      const tools = JSON.parse(raw);
      toolsSnippet = tools.slice(0, 6).map(t => `- ${t.name}: ${t.primary_function.join(', ')} (cost: ${t.cost_category})`).join('\n');
    }
  } catch (e) {
    // continue without tools snippet
    toolsSnippet = '';
  }

  const systemPrompt = `
You are a concise, practical startup advisor. Provide actionable, step-by-step startup tips (1-3 steps) and recommend low-cost tools if relevant.
Context (sample tools):
${toolsSnippet}
If the user asks for tools, prefer low-complexity or freemium options for early-stage startups.
  `;

  // Build the request payload for OpenAI
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) return res.status(500).json({ error: 'API key not configured on server' });

  const payload = {
    model: 'gpt-4o-mini',        // replace if you need a different model
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ],
    max_tokens: 350,
    temperature: 0.2
  };

  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!r.ok) {
      const text = await r.text();
      return res.status(502).json({ error: 'Model error', detail: text });
    }
    const data = await r.json();
    const reply = data.choices?.[0]?.message?.content || 'Sorry, no response returned.';
    return res.status(200).json({ reply });
  } catch (err) {
    console.error('Chat API error', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
