import dotenv from 'dotenv';

if (!process.env.GEMINI_API_KEY) {
  dotenv.config();
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// Ordered by preference: primary recommended model first, then fallbacks
const GEMINI_MODELS = ['gemini-3.6-flash', 'gemini-3.7-flash', 'gemini-3.8-flash', 'gemini-flash-latest'];

/**
 * Calls Google Gemini for independent AI-generation verification,
 * cross-checking against Sightengine's score and generating plain-language reasoning.
 *
 * @param {Object} options
 * @param {string} [options.mediaUrl]
 * @param {string} [options.fileData] - Base64 data URL or raw base64
 * @param {string} [options.mediaType] - 'image' | 'video' | 'audio'
 * @param {number} [options.sightengineScore] - 0 to 1
 * @returns {Promise<{
 *   success: boolean,
 *   score: number,
 *   agrees_with_sightengine: boolean,
 *   confidence: number,
 *   explanation: string,
 *   artifacts_detected: string[],
 *   raw: Object
 * }>}
 */
export async function analyzeGemini({
  mediaUrl,
  fileData,
  mediaType = 'image',
  sightengineScore = 0.5
}) {
  if (!mediaUrl && !fileData) {
    throw new Error('Either mediaUrl or fileData must be provided to Gemini');
  }

  const sightenginePct = (sightengineScore * 100).toFixed(1);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout for large media

  try {
    const parts = [];

    // System prompt guiding forensic inspection and cross-checking
    const promptText = `
You are an elite Digital Forensics AI Examiner specializing in synthetic and AI-generated media detection (Deepfakes, Diffusion models like Midjourney, Stable Diffusion, Flux, DALL-E, Sora, Kling, voice cloning, etc.).

TASK:
1. Conduct an independent, rigorous forensic evaluation of the provided ${mediaType}.
2. An independent AI-detection signal (Sightengine GenAI) has already analyzed this media and returned an AI-generation probability score of ${sightengineScore} (${sightenginePct}%).
3. Cross-check your forensic observations against Sightengine's score. Evaluate whether you agree, partially agree, or disagree with Sightengine.
4. Assign your independent AI-generation score from 0.00 (completely authentic / organic / real-world capture) to 1.00 (definitely AI-generated / synthetic).
5. State your confidence level (0 to 100).
6. Write a clear, plain-language forensic explanation detailing:
   - Specific observable visual/acoustic markers (e.g., diffusion texture anomalies, synthetic lighting, unnatural reflections, warped background geometry, anatomical errors, spectral banding, prosody glitches).
   - Your cross-check reasoning relative to Sightengine's score.
   - A concluding verdict summary in accessible language.

Respond ONLY with a valid JSON object strictly matching this schema:
{
  "gemini_score": number, // Float between 0.00 and 1.00
  "agrees_with_sightengine": boolean,
  "confidence": number, // Integer between 0 and 100
  "verdict_label": "Likely AI-generated" | "Likely Authentic" | "Uncertain",
  "explanation": "Clear, detailed forensic explanation in plain language explaining why the media is judged AI-generated or authentic, citing specific visual/audio artifacts and the cross-check consensus.",
  "artifacts_detected": ["string", "string"],
  "agreement_summary": "Short sentence explaining agreement or disagreement with Sightengine"
}
`.trim();

    // Prepare media payload for Gemini multimodal input
    if (fileData) {
      let mimeType = mediaType === 'video' ? 'video/mp4' : mediaType === 'audio' ? 'audio/mp3' : 'image/jpeg';
      let rawBase64 = fileData;

      if (fileData.startsWith('data:')) {
        const commaIdx = fileData.indexOf(',');
        const header = fileData.slice(0, commaIdx);
        rawBase64 = fileData.slice(commaIdx + 1);
        const match = header.match(/:(.*?);/);
        if (match) mimeType = match[1];
      }

      parts.push({
        inlineData: {
          mimeType,
          data: rawBase64
        }
      });
    } else if (mediaUrl) {
      // If URL is provided, try fetching the media bytes so Gemini can see the pixels directly
      try {
        const mediaFetch = await fetch(mediaUrl, { signal: AbortSignal.timeout(10000) });
        if (mediaFetch.ok) {
          const contentType = mediaFetch.headers.get('content-type') || (mediaType === 'video' ? 'video/mp4' : 'image/jpeg');
          const arrayBuffer = await mediaFetch.arrayBuffer();
          const base64Data = Buffer.from(arrayBuffer).toString('base64');
          parts.push({
            inlineData: {
              mimeType: contentType,
              data: base64Data
            }
          });
        } else {
          // If media URL cannot be fetched directly, provide the URL to Gemini
          parts.push({ text: `Analyze media at public URL: ${mediaUrl}` });
        }
      } catch (fetchErr) {
        console.warn('Could not fetch media URL for inlineData, passing URL text:', fetchErr.message);
        parts.push({ text: `Analyze media at public URL: ${mediaUrl}` });
      }
    }

    // Append prompt instructions
    parts.push({ text: promptText });

    // Try models in order of preference
    let lastError = null;
    let resultJson = null;

    for (const model of GEMINI_MODELS) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.2
            }
          }),
          signal: controller.signal
        });

        if (!response.ok) {
          const errData = await response.json();
          lastError = new Error(errData.error?.message || `HTTP ${response.status} from Gemini ${model}`);
          console.warn(`Gemini model ${model} returned error:`, lastError.message);
          continue;
        }

        const data = await response.json();
        const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (candidateText) {
          try {
            resultJson = JSON.parse(candidateText);
            break; // Success!
          } catch (parseErr) {
            console.warn('JSON parse error from Gemini output:', parseErr, candidateText);
          }
        }
      } catch (err) {
        lastError = err;
        console.warn(`Attempt with ${model} failed:`, err.message);
      }
    }

    clearTimeout(timeoutId);

    if (resultJson) {
      const score = Math.max(0, Math.min(1, Number(resultJson.gemini_score ?? 0.5)));
      return {
        success: true,
        score: Number(score.toFixed(4)),
        agrees_with_sightengine: Boolean(resultJson.agrees_with_sightengine),
        confidence: Math.round(Number(resultJson.confidence ?? 85)),
        explanation: resultJson.explanation || 'Forensic analysis completed.',
        artifacts_detected: Array.isArray(resultJson.artifacts_detected) ? resultJson.artifacts_detected : [],
        agreement_summary: resultJson.agreement_summary || '',
        raw: resultJson
      };
    }

    // Fallback if model calls failed — score is null so UI shows "Unavailable" not a fabricated number
    console.error('All Gemini model attempts failed:', lastError);
    return {
      success: false,
      score: null,
      agrees_with_sightengine: null,
      confidence: null,
      explanation: `Gemini verification signal temporarily unavailable (${lastError?.message || 'timeout'}). Assessment relies primarily on Sightengine GenAI neural probe.`,
      artifacts_detected: [],
      agreement_summary: 'Gemini unavailable — single engine mode.',
      raw: null
    };
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('Gemini service exception:', error);
    return {
      success: false,
      score: null,
      agrees_with_sightengine: null,
      confidence: null,
      explanation: `Gemini verification experienced an error: ${error.message}. Assessment defaulted to Sightengine signal.`,
      artifacts_detected: [],
      agreement_summary: 'Gemini unavailable — single engine mode.',
      raw: null
    };
  }
}
