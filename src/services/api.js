/**
 * Client API service for TruthLens.
 * Uses relative paths to ensure seamless execution on Vercel or local dev server.
 */

/**
 * Analyzes an uploaded file or remote media URL.
 *
 * @param {Object} payload
 * @param {string} [payload.mediaUrl]
 * @param {string} [payload.fileData] - Base64 data URL
 * @param {string} [payload.mediaType] - 'image' | 'video' | 'audio'
 * @param {string} [payload.fileName]
 * @returns {Promise<Object>} The combined analysis result
 */
export async function analyzeMedia({ mediaUrl, fileData, mediaType = 'image', fileName = 'media' }) {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      mediaUrl,
      fileData,
      mediaType,
      fileName
    })
  });

  if (!response.ok) {
    let errorDetail = 'Failed to analyze media';
    try {
      const errData = await response.json();
      errorDetail = errData.message || errData.error || errorDetail;
    } catch (e) {
      errorDetail = `Server returned status ${response.status}: ${response.statusText}`;
    }
    throw new Error(errorDetail);
  }

  return await response.json();
}

/**
 * Fetches a previously saved analysis record by ID from Supabase via API.
 *
 * @param {string} id
 * @returns {Promise<Object>}
 */
export async function getAnalysis(id) {
  if (!id) throw new Error('Analysis ID is required');

  const response = await fetch(`/api/analyze/${id}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    let errorDetail = 'Analysis not found';
    try {
      const errData = await response.json();
      errorDetail = errData.message || errData.error || errorDetail;
    } catch (e) {
      errorDetail = `Server returned status ${response.status}`;
    }
    throw new Error(errorDetail);
  }

  return await response.json();
}
