import { analyzeSightengine } from '../lib/sightengineService.js';
import { analyzeGemini } from '../lib/geminiService.js';
import { calculateAssessment } from '../lib/assessmentService.js';
import { saveAnalysis, getAnalysisById } from '../lib/supabase.js';

// Security: Allowed MIME types for uploaded/fetched media files
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
 * Validates URLs against SSRF, internal address probing, and unsupported protocols.
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
 * Supports all input modes:
 * - 'file': Uploaded image, video frame, or audio file
 * - 'link': Remote media URL (fetched and validated server-side)
 * - 'text': Raw text submitted for LLM synthetic writing detection
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

  // Handle GET /api/analyze?id=... as query-parameter lookup fallback
  if (req.method === 'GET') {
    let id = req.query?.id;
    if (!id && req.url && req.url.includes('?')) {
      try {
        const parsedUrl = new URL(req.url, 'http://localhost');
        id = parsedUrl.searchParams.get('id');
      } catch (e) {}
    }

    if (!id) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Analysis ID is required for GET requests'
      });
    }

    try {
      const record = await getAnalysisById(id);
      if (!record) {
        return res.status(404).json({
          error: 'Analysis not found',
          message: `No analysis found with ID: ${id}`
        });
      }
      return res.status(200).json({
        id: record.id,
        verdict: record.verdict,
        confidence: Number(record.confidence),
        explanation: record.explanation,
        breakdown: {
          sightengine_score: record.sightengine_result?.score ?? (record.sightengine_result?.type?.ai_generated ?? null),
          gemini_score: record.gemini_result?.score ?? null,
          sightengine_weight: record.media_type === 'text' ? 0.0 : 0.70,
          gemini_weight: record.media_type === 'text' ? 1.0 : 0.30,
          consensus: record.gemini_result?.agrees_with_sightengine ? 'Models Agreed' : 'Dual-Engine Consensus'
        },
        media_url: record.media_url,
        media_type: record.media_type || 'image',
        input_mode: record.input_mode || 'file',
        sightengine_result: record.sightengine_result,
        gemini_result: record.gemini_result,
        created_at: record.created_at
      });
    } catch (err) {
      return res.status(500).json({
        error: 'Internal Server Error',
        message: err.message || 'Failed to fetch analysis'
      });
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method Not Allowed',
      message: 'Only GET and POST requests are supported on /api/analyze'
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

    const {
      mediaUrl,
      fileData,
      textInput,
      mediaType = 'image',
      inputMode = 'file',
      fileName = 'media'
    } = body || {};

    // Validate input mode and media type
    const sanitizedInputMode = ['file', 'link', 'text'].includes(inputMode) ? inputMode : 'file';
    const sanitizedMediaType = ['image', 'video', 'audio', 'text'].includes(mediaType)
      ? mediaType
      : (sanitizedInputMode === 'text' ? 'text' : 'image');

    // -------------------------------------------------------------
    // ROUTE 1: TEXT MODE
    // -------------------------------------------------------------
    if (sanitizedInputMode === 'text' || sanitizedMediaType === 'text') {
      const rawText = (textInput || '').trim();
      if (!rawText) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Please provide text content to analyze.'
        });
      }
      if (rawText.length < 20) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Text must be at least 20 characters long for meaningful forensic analysis.'
        });
      }
      if (rawText.length > 25000) {
        return res.status(400).json({
          error: 'Payload Too Large',
          message: 'Text exceeds the 25,000 character analysis limit.'
        });
      }

      console.log('[TruthLens] Executing Text Forensic Inspection with Gemini...');
      // Sightengine does not support text detection; skip it cleanly
      const sightengineResult = {
        success: false,
        skipped: true,
        score: null,
        details: { note: 'Sightengine GenAI is specialized for visual artifacts and skipped for text.' }
      };

      const geminiResult = await analyzeGemini({
        textInput: rawText,
        mediaType: 'text'
      });

      const assessment = calculateAssessment(sightengineResult, geminiResult, { mediaType: 'text' });

      // Persist text record
      let savedRecord = null;
      try {
        savedRecord = await saveAnalysis({
          media_url: rawText.slice(0, 100) + (rawText.length > 100 ? '...' : ''),
          media_type: 'text',
          input_mode: 'text',
          sightengine_result: sightengineResult,
          gemini_result: geminiResult,
          verdict: assessment.verdict,
          confidence: assessment.confidence,
          explanation: assessment.explanation
        });
      } catch (dbError) {
        console.warn('[TruthLens] Supabase save failed, using local ID:', dbError.message);
        savedRecord = { id: 'local-' + Date.now(), created_at: new Date().toISOString() };
      }

      return res.status(200).json({
        id: savedRecord.id,
        verdict: assessment.verdict,
        confidence: assessment.confidence,
        explanation: assessment.explanation,
        breakdown: assessment.breakdown,
        media_url: rawText,
        media_type: 'text',
        input_mode: 'text',
        text_preview: rawText,
        sightengine_result: sightengineResult,
        gemini_result: geminiResult,
        created_at: savedRecord.created_at
      });
    }

    // -------------------------------------------------------------
    // ROUTE 2 & 3: MEDIA LINK OR FILE UPLOAD (Image / Video / Audio)
    // -------------------------------------------------------------
    let processedFileData = fileData;
    let resolvedMediaUrl = mediaUrl;

    // Handle Link Mode: Server-side fetch and validation
    if (sanitizedInputMode === 'link' || (!fileData && mediaUrl)) {
      if (!resolvedMediaUrl) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Please provide a valid media URL link.'
        });
      }

      if (!isValidExternalUrl(resolvedMediaUrl)) {
        return res.status(400).json({
          error: 'Security Error',
          message: 'The provided media URL is invalid, non-HTTP/HTTPS, or references a restricted local network address.'
        });
      }

      console.log(`[TruthLens] Fetching and validating remote media link: ${resolvedMediaUrl}`);
      try {
        const fetchResponse = await fetch(resolvedMediaUrl, {
          signal: AbortSignal.timeout(12000),
          headers: { 'User-Agent': 'TruthLens-Media-Analyzer/1.1' }
        });

        if (!fetchResponse.ok) {
          return res.status(400).json({
            error: 'Unreachable Media Link',
            message: `The media link could not be reached (HTTP ${fetchResponse.status}: ${fetchResponse.statusText}). Please verify the link is publicly accessible.`
          });
        }

        const rawContentType = (fetchResponse.headers.get('content-type') || '').toLowerCase().split(';')[0].trim();
        if (rawContentType.includes('text/html') || rawContentType.includes('application/xhtml')) {
          return res.status(400).json({
            error: 'Unsupported Media Type',
            message: 'The URL points to an HTML webpage instead of a direct media file. Please provide a direct link to an image, video, or audio file (e.g. ending in .jpg, .png, .mp4, .mp3).'
          });
        }

        // Buffer and check size
        const arrayBuffer = await fetchResponse.arrayBuffer();
        if (arrayBuffer.byteLength > 6 * 1024 * 1024) {
          return res.status(413).json({
            error: 'Payload Too Large',
            message: `The remote file (${(arrayBuffer.byteLength / 1024 / 1024).toFixed(1)}MB) exceeds the 5MB serverless size limit.`
          });
        }

        const base64Data = Buffer.from(arrayBuffer).toString('base64');
        const mimeToUse = rawContentType || (sanitizedMediaType === 'video' ? 'video/mp4' : sanitizedMediaType === 'audio' ? 'audio/mp3' : 'image/jpeg');
        processedFileData = `data:${mimeToUse};base64,${base64Data}`;
      } catch (fetchErr) {
        return res.status(400).json({
          error: 'Fetch Failure',
          message: `Unable to fetch media from the provided URL: ${fetchErr.message}. Ensure the URL is publicly reachable.`
        });
      }
    }

    // Security validation for base64 fileData
    if (processedFileData) {
      if (typeof processedFileData !== 'string') {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'fileData must be a valid base64 data string'
        });
      }

      if (processedFileData.length > MAX_BASE64_LENGTH) {
        return res.status(413).json({
          error: 'Payload Too Large',
          message: 'Uploaded file exceeds the maximum 5MB serverless size limit'
        });
      }

      if (processedFileData.startsWith('data:')) {
        const match = processedFileData.match(/^data:([^;]+);base64,/);
        if (match) {
          const mime = match[1].toLowerCase();
          if (!ALLOWED_MIME_TYPES.has(mime)) {
            return res.status(415).json({
              error: 'Unsupported Media Type',
              message: `MIME type "${mime}" is not supported. Supported formats include JPEG, PNG, WEBP, MP4, WEBM, MP3, and WAV.`
            });
          }
        }
      }
    } else if (!resolvedMediaUrl) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Please provide either a valid mediaUrl or base64 fileData'
      });
    }

    // -------------------------------------------------------------
    // DETECTION EXECUTION
    // -------------------------------------------------------------
    let sightengineResult = null;

    if (sanitizedMediaType === 'audio') {
      // Audio is not supported by Sightengine GenAI image model; mark experimental
      console.log('[TruthLens] Audio mode: Sightengine skipped (visual only).');
      sightengineResult = {
        success: false,
        skipped: true,
        score: null,
        details: { note: 'Sightengine GenAI is specialized for visual artifacts and skipped for audio.' }
      };
    } else {
      // Image or Video (representative frame)
      console.log(`[TruthLens] Executing Engine 1: Sightengine GenAI (${sanitizedMediaType})...`);
      sightengineResult = await analyzeSightengine({
        mediaUrl: resolvedMediaUrl,
        fileData: processedFileData,
        mediaType: sanitizedMediaType,
        fileName
      });
    }

    // Step 2: Gemini Multimodal Analysis
    console.log(`[TruthLens] Executing Engine 2: Google Gemini Multimodal (${sanitizedMediaType})...`);
    const geminiResult = await analyzeGemini({
      mediaUrl: resolvedMediaUrl,
      fileData: processedFileData,
      mediaType: sanitizedMediaType,
      sightengineScore: sightengineResult.score
    });

    // Step 3: Reliability-Weighted Synthesis
    console.log('[TruthLens] Synthesizing Reliability-Weighted Assessment...');
    const assessment = calculateAssessment(sightengineResult, geminiResult, {
      mediaType: sanitizedMediaType
    });

    // Step 4: Persist to Supabase
    console.log('[TruthLens] Saving analysis record to Supabase...');
    let savedRecord = null;
    try {
      savedRecord = await saveAnalysis({
        media_url: resolvedMediaUrl || fileName,
        media_type: sanitizedMediaType,
        input_mode: sanitizedInputMode,
        sightengine_result: sightengineResult,
        gemini_result: geminiResult,
        verdict: assessment.verdict,
        confidence: assessment.confidence,
        explanation: assessment.explanation
      });
    } catch (dbError) {
      console.error('[TruthLens] Supabase persistence error:', dbError.message);
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
      media_url: resolvedMediaUrl || fileName,
      media_type: sanitizedMediaType,
      input_mode: sanitizedInputMode,
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
