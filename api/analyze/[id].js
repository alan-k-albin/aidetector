import { getAnalysisById } from '../../lib/supabase.js';

/**
 * GET /api/analyze/:id
 *
 * Fetches a previously saved analysis record from Supabase by its UUID.
 * Always returns application/json with proper HTTP status codes (200, 400, 404, 500).
 */
export default async function handler(req, res) {
  // CORS & Content-Type Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method Not Allowed',
      message: 'Only GET requests are supported on /api/analyze/[id]'
    });
  }

  try {
    // Extract ID from Vercel query or URL path
    let id = req.query?.id;
    if (!id && req.url) {
      const cleanPath = req.url.split('?')[0];
      const parts = cleanPath.split('/').filter(Boolean);
      id = parts[parts.length - 1];
    }

    if (!id || id === '[id].js' || id === '[id]' || id === 'analyze') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing or invalid analysis ID parameter'
      });
    }

    console.log(`[TruthLens] Querying Supabase for analysis ID: ${id}`);
    const record = await getAnalysisById(id);

    if (!record) {
      return res.status(404).json({
        error: 'Analysis not found',
        message: `No analysis found with ID: ${id}`
      });
    }

    // Return normalized analysis object
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
    console.error('[TruthLens Fetch Error]', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: err.message || 'Failed to fetch analysis record from database'
    });
  }
}
