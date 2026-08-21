// Minimal Express server to accept submissions and generate a PDF on the fly.
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

require('dotenv').config();
const axios = require('axios');

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '1mb' }));

// AI assist endpoint: forwards transcript to OpenAI Chat Completion and returns assistant reply.
app.post('/api/ai-assist', async (req, res) => {
  const { message, language, context } = req.body || {};
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) return res.status(500).json({ ok: false, error: 'missing_api_key' });

  try {
    // Basic system prompt tailored to guiding users through a bank loan application form.
    // If client provided a preferred language, instruct the model to reply in that language.
    const langInstruction = language ? `Reply in ${language}.` : 'Reply in the user\'s language when possible.';
    const systemPrompt = `You are a helpful, friendly AI assistant that guides users through a bank loan application form step-by-step. Ask for missing fields, validate formats, and provide concise instructions. ${langInstruction}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `User input: ${message}` }
    ];

    // Use OpenAI's Chat Completions endpoint. Model name may be changed by user.
    const openaiRes = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages,
      max_tokens: 512,
      temperature: 0.2
    }, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const assistantText = openaiRes.data?.choices?.[0]?.message?.content || 'Sorry, I could not generate a reply.';
    res.json({ ok: true, reply: assistantText });
  } catch (err) {
    console.error('AI assist error', err?.response?.data || err.message || err);
    res.status(500).json({ ok: false, error: 'ai_failed', details: err?.response?.data || err.message });
  }
});

const DATA_FILE = path.join(__dirname, 'submissions.json');

function saveSubmission(obj) {
  let arr = [];
  try {
    if (fs.existsSync(DATA_FILE)) arr = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) || [];
  } catch (e) { arr = []; }
  obj.id = Date.now();
  arr.push(obj);
  fs.writeFileSync(DATA_FILE, JSON.stringify(arr, null, 2), 'utf8');
  return obj.id;
}

app.post('/api/submit', (req, res) => {
  const payload = req.body || {};
  try {
    const id = saveSubmission(payload);
    res.json({ ok: true, id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: 'save_failed' });
  }
});

app.post('/api/generate-pdf', (req, res) => {
  const data = req.body || {};
  try {
    const doc = new PDFDocument({ margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="loan-application-${Date.now()}.pdf"`);
    doc.pipe(res);

    doc.fontSize(18).text('Loan Application', { align: 'center' });
    doc.moveDown();

    const entries = Object.entries(data);
    entries.forEach(([k, v]) => {
      doc.fontSize(12).text(`${k}: ${v}`);
      doc.moveDown(0.2);
    });

    doc.end();
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: 'pdf_failed' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
