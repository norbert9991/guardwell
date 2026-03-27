const express = require('express');
const router = express.Router();

// ============================================
// VOICE AI PIPELINE (Groq — Free API)
// POST /api/voice/transcribe — ESP32 sends base64 audio → Groq Whisper STT
// POST /api/voice/classify   — Transcription → Groq Llama intent classification
// POST /api/voice/process    — Combined: audio → transcribe → classify (all-in-one)
// ============================================

const GROQ_API_BASE = 'https://api.groq.com/openai/v1';

// POST /api/voice/transcribe
router.post('/transcribe', async (req, res) => {
    try {
        const { device_id, audio_b64 } = req.body;

        if (!audio_b64) {
            return res.status(400).json({ error: 'Missing audio_b64 field' });
        }

        console.log(`🎤 Voice transcription request from ${device_id || 'unknown'} (${(audio_b64.length * 0.75 / 1024).toFixed(1)}KB audio)`);

        const audioBuffer = Buffer.from(audio_b64, 'base64');
        const transcription = await transcribeWithGroq(audioBuffer);

        console.log(`📝 Transcription: "${transcription}"`);

        res.json({ success: true, transcription, device_id });
    } catch (error) {
        console.error('❌ Transcription error:', error.message);
        res.status(500).json({ error: 'Transcription failed', details: error.message });
    }
});

// POST /api/voice/classify
router.post('/classify', async (req, res) => {
    try {
        const { device_id, transcription } = req.body;

        if (!transcription) {
            return res.status(400).json({ error: 'Missing transcription field' });
        }

        console.log(`🧠 Intent classification request: "${transcription}" from ${device_id || 'unknown'}`);

        const result = await classifyWithGroq(transcription);

        console.log(`✅ Intent: ${result.intent} (confidence: ${result.confidence}, lang: ${result.language})`);

        res.json({ success: true, ...result, device_id });
    } catch (error) {
        console.error('❌ Classification error:', error.message);
        res.status(500).json({ error: 'Classification failed', details: error.message });
    }
});

// POST /api/voice/process — Combined endpoint (ESP32 uses this)
router.post('/process', async (req, res) => {
    try {
        const { device_id, audio_b64 } = req.body;

        if (!audio_b64) {
            return res.status(400).json({ error: 'Missing audio_b64 field' });
        }

        const audioSizeKB = (audio_b64.length * 0.75 / 1024).toFixed(1);
        console.log(`\n🎤 ============================================`);
        console.log(`🎤 Voice processing from ${device_id || 'unknown'} (${audioSizeKB}KB)`);
        console.log(`🎤 ============================================`);

        // Step 1: Transcribe with Groq Whisper
        const audioBuffer = Buffer.from(audio_b64, 'base64');
        const transcription = await transcribeWithGroq(audioBuffer);
        console.log(`📝 Transcription: "${transcription}"`);

        if (!transcription || transcription.trim() === '') {
            console.log(`⚠️ Empty transcription — no speech detected`);
            return res.json({
                success: true,
                intent: 'none',
                confidence: 0,
                language: 'unknown',
                transcription: '',
                details: 'No speech detected in audio',
                device_id
            });
        }

        // Step 2: Classify intent with Groq Llama
        const result = await classifyWithGroq(transcription);
        console.log(`✅ Intent: ${result.intent} (confidence: ${result.confidence}, lang: ${result.language})`);

        // Step 3: Broadcast emergency intents via Socket.io
        if (result.intent !== 'safe' && result.intent !== 'unknown' && result.intent !== 'none' && result.confidence >= 0.7) {
            console.log(`🚨 Emergency voice intent detected! Broadcasting alert...`);

            if (req.io) {
                req.io.emit('voice_intent', {
                    device_id,
                    intent: result.intent,
                    confidence: result.confidence,
                    transcription,
                    language: result.language,
                    timestamp: new Date().toISOString()
                });
            }
        }

        res.json({ success: true, transcription, ...result, device_id });
    } catch (error) {
        console.error('❌ Voice processing error:', error.message);
        res.status(500).json({ error: 'Voice processing failed', details: error.message });
    }
});

// ============================================
// GROQ WHISPER STT (Free)
// Uses Groq's OpenAI-compatible endpoint
// ============================================
async function transcribeWithGroq(audioBuffer) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        throw new Error('GROQ_API_KEY not configured');
    }

    // Build multipart/form-data manually
    const boundary = '----FormBoundary' + Date.now().toString(36);

    const formParts = [];

    // File part
    formParts.push(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="file"; filename="audio.wav"\r\n` +
        `Content-Type: audio/wav\r\n\r\n`
    );
    formParts.push(audioBuffer);
    formParts.push('\r\n');

    // Model part (Groq hosts whisper-large-v3)
    formParts.push(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="model"\r\n\r\n` +
        `whisper-large-v3\r\n`
    );

    // Language hint (Filipino/Tagalog)
    formParts.push(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="language"\r\n\r\n` +
        `tl\r\n`
    );

    // Prompt for context
    formParts.push(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="prompt"\r\n\r\n` +
        `Industrial safety monitoring. Worker may say emergency phrases in Filipino or English like: tulong, sunog, emergency, help, gas leak, fire, saklolo, may sunog\r\n`
    );

    formParts.push(`--${boundary}--\r\n`);

    // Combine into single buffer
    const bodyParts = formParts.map(part =>
        typeof part === 'string' ? Buffer.from(part, 'utf-8') : part
    );
    const body = Buffer.concat(bodyParts);

    const response = await fetch(`${GROQ_API_BASE}/audio/transcriptions`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': body.length.toString()
        },
        body
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Groq Whisper error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data.text || '';
}

// ============================================
// GROQ LLAMA INTENT CLASSIFICATION (Free)
// Uses Groq's OpenAI-compatible chat endpoint
// ============================================
async function classifyWithGroq(transcription) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        throw new Error('GROQ_API_KEY not configured');
    }

    const systemPrompt = `You are a safety monitoring AI for an industrial workplace called GuardWell. 
Your job is to classify the intent of transcribed speech from workers wearing safety devices.
Workers may speak in Filipino (Tagalog), English, or a mix (Taglish).

Classify the transcription into ONE of these intents:
- "emergency" — General emergency, distress, call for help (e.g., "tulong!", "help!", "emergency!", "saklolo!")
- "fire" — Fire-related emergency (e.g., "sunog!", "fire!", "may sunog!", "nasusunog!")
- "gas" — Gas leak or chemical hazard (e.g., "gas leak!", "may gas!", "amoy gas!", "chemical spill!")
- "medical" — Medical emergency, injury (e.g., "nasugatan!", "injured!", "doctor!", "dumudugo!", "masakit!")
- "collapse" — Structural collapse or falling hazard (e.g., "gumuho!", "collapse!", "falling!", "bagsak!")
- "safe" — Normal conversation, not an emergency (e.g., "kumusta", "okay lang", "break na")
- "unknown" — Cannot determine intent or unclear audio

Respond ONLY with valid JSON (no markdown, no explanation):
{"intent": "...", "confidence": 0.0-1.0, "language": "en|tl|mix", "details": "brief reason"}`;

    const response = await fetch(`${GROQ_API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            temperature: 0.1,
            max_tokens: 200,
            messages: [
                { role: 'system', content: systemPrompt },
                {
                    role: 'user',
                    content: `Classify this transcription from a worker's safety device microphone:\n\n"${transcription}"`
                }
            ]
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Groq Llama error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';

    try {
        const parsed = JSON.parse(content);
        return {
            intent: parsed.intent || 'unknown',
            confidence: parsed.confidence || 0,
            language: parsed.language || 'unknown',
            details: parsed.details || ''
        };
    } catch (parseError) {
        console.error('Failed to parse Groq response:', content);
        return {
            intent: 'unknown',
            confidence: 0,
            language: 'unknown',
            details: 'Failed to parse AI response'
        };
    }
}

module.exports = router;
