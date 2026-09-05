import { analyzeSightengine } from '../lib/sightengineService.js';
import { analyzeGemini } from '../lib/geminiService.js';
import { calculateAssessment } from '../lib/assessmentService.js';
import { saveAnalysis } from '../lib/supabase.js';

// Security: Allowed MIME types
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/bmp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/ogg',
  'audio/x-m4a'
]);

// Maximum allowable base64 payload size (~5MB raw binary)
const MAX_BASE64_LENGTH = 7 * 1024 * 1024;

/**
 * Validates URLs against SSRF and unsupported protocols.
 */
function isValidExternalUrl(urlStr) {
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    const hostname = parsed.hostname.toLowerCase();
    // Prevent SSRF / internal address probing
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('169.254.') ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.local')
    ) {
      return false;
    }
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * POST /api/analyze
 *
 * Runs dual-engine detection (Sightengine GenAI + Gemini Multimodal),
 * calculates reliability-weighted assessment, saves record to Supabase,
 * and returns the comprehensive analysis verdict.
 */
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method Not Allowed',
      message: 'Only POST requests are supported on /api/analyze'
    });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Malformed JSON in request body'
        });
      }
    }

    const { mediaUrl, fileData, mediaType = 'image', fileName = 'uploaded_media' } = body || {};

    // Security Validation 1: Parameter existence
    if (!mediaUrl && !fileData) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Please provide either a valid mediaUrl or base64 fileData'
      });
    }

    // Security Validation 2: Media Type whitelist
    const sanitizedMediaType = ['image', 'video', 'audio'].includes(mediaType) ? mediaType : 'image';

    // Security Validation 3: URL format & SSRF prevention
    if (mediaUrl) {
      if (!isValidExternalUrl(mediaUrl)) {
        return res.status(400).json({
          error: 'Security Error',
          message: 'The provided mediaUrl is invalid or targets a restricted host. Please provide a public HTTP/HTTPS URL.'
        });
      }
    }

    // Security Validation 4: File Data size and MIME type verification
    if (fileData) {
      if (typeof fileData !== 'string') {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'fileData must be a valid base64 data string'
        });
      }

      if (fileData.length > MAX_BASE64_LENGTH) {
        return res.status(413).json({
          error: 'Payload Too Large',
          message: 'Uploaded file exceeds the maximum 5MB serverless size limit'
        });
      }

      if (fileData.startsWith('data:')) {
        const match = fileData.match(/^data:([^;]+);base64,/);
        if (match) {
          const mime = match[1].toLowerCase();
          if (!ALLOWED_MIME_TYPES.has(mime)) {
            return res.status(415).json({
              error: 'Unsupported Media Type',
              message: `MIME type "${mime}" is not supported. Supported types include JPEG, PNG, WEBP, MP4, WEBM, MP3, WAV.`
            });
          }
        }
      }
    }

    // Step 1: Detection Engine 1 — Sightengine GenAI
    console.log('[TruthLens] Executing Detection Engine 1: Sightengine GenAI...');
    const sightengineResult = await analyzeSightengine({
      mediaUrl,
      fileData,
      mediaType: sanitizedMediaType,
      fileName
    });

    // Step 2: Detection Engine 2 + Reasoning/Explanation — Google Gemini Multimodal
    console.log('[TruthLens] Executing Detection Engine 2: Google Gemini Multimodal...');
    const geminiResult = await analyzeGemini({
      mediaUrl,
      fileData,
      mediaType: sanitizedMediaType,
      sightengineScore: sightengineResult.score
    });

    // Step 3: Reliability-Weighted Synthesis
    console.log('[TruthLens] Synthesizing Reliability-Weighted Assessment...');
    const assessment = calculateAssessment(sightengineResult, geminiResult);

    // Step 4: Persist to Supabase
    console.log('[TruthLens] Saving analysis result to Supabase...');
    let savedRecord = null;
    try {
      savedRecord = await saveAnalysis({
        media_url: mediaUrl || fileName,
        media_type: sanitizedMediaType,
        sightengine_result: sightengineResult,
        gemini_result: geminiResult,
        verdict: assessment.verdict,
        confidence: assessment.confidence,
        explanation: assessment.explanation
      });
    } catch (dbError) {
      console.error('[TruthLens] Warning: Failed to persist to Supabase:', dbError.message);
      savedRecord = {
        id: 'local-' + Date.now(),
        created_at: new Date().toISOString()
      };
    }

    // Consolidated response payload
    const responsePayload = {
      id: savedRecord.id,
      verdict: assessment.verdict,
      confidence: assessment.confidence,
      explanation: assessment.explanation,
      breakdown: assessment.breakdown,
      media_url: mediaUrl || fileName,
      media_type: sanitizedMediaType,
      sightengine_result: sightengineResult,
      gemini_result: geminiResult,
      created_at: savedRecord.created_at
    };

    return res.status(200).json(responsePayload);
  } catch (err) {
    console.error('[TruthLens API Error]', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: err.message || 'An unexpected error occurred during media analysis'
    });
  }
}
