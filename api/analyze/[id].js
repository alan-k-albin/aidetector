import { getAnalysisById } from '../../lib/supabase.js';

/**
 * GET /api/analyze/:id
 *
 * Fetches a previously saved analysis record from Supabase by its UUID.
 */
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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
      const urlParts = req.url.split('?')[0].split('/');
      id = urlParts[urlParts.length - 1];
    }

    if (!id || id === '[id].js' || id === '[id]') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing or invalid analysis ID'
      });
    }

    console.log(`[TruthLens] Fetching analysis record: ${id}`);
    const record = await getAnalysisById(id);

    if (!record) {
      return res.status(404).json({
        error: 'Not Found',
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
        consensus: record.gemini_result?.agrees_with_sightengine ? 'Models Agreed' : 'Independent Signals'
      },
      media_url: record.media_url,
      media_type: record.media_type,
      sightengine_result: record.sightengine_result,
      gemini_result: record.gemini_result,
      created_at: record.created_at
    });
  } catch (err) {
    console.error('[TruthLens Fetch Error]', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: err.message || 'Failed to fetch analysis'
    });
  }
}
