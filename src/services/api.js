/**
 * Client API service for TruthLens.
 * Uses relative paths to ensure seamless execution on Vercel or local dev server.
 */

/**
 * Analyzes an uploaded file, remote media URL, or raw text.
 *
 * @param {Object} payload
 * @param {string} [payload.mediaUrl]
 * @param {string} [payload.fileData] - Base64 data URL
 * @param {string} [payload.textInput] - Raw text to analyze
 * @param {string} [payload.mediaType] - 'image' | 'video' | 'audio' | 'text'
 * @param {string} [payload.inputMode] - 'file' | 'link' | 'text'
 * @param {string} [payload.fileName]
 * @returns {Promise<Object>} The combined analysis result
 */
export async function analyzeMedia({
  mediaUrl,
  fileData,
  textInput,
  mediaType = 'image',
  inputMode = 'file',
  fileName = 'media'
}) {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      mediaUrl,
      fileData,
      textInput,
      mediaType,
      inputMode,
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
 * Uses robust routing with query param fallback to prevent 'Unexpected token <' errors.
 *
 * @param {string} id
 * @returns {Promise<Object>}
 */
export async function getAnalysis(id) {
  if (!id) throw new Error('Analysis ID is required');

  const cleanId = encodeURIComponent(id.trim());

  // 1. Try dynamic route /api/analyze/:id
  let response = await fetch(`/api/analyze/${cleanId}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json'
    }
  });

  // 2. If the response returned HTML or 404/500, attempt query parameter fallback /api/analyze?id=:id
  const contentType = response.headers.get('content-type') || '';
  if (!response.ok || !contentType.includes('application/json')) {
    try {
      const queryResponse = await fetch(`/api/analyze?id=${cleanId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      const queryContentType = queryResponse.headers.get('content-type') || '';
      if (queryResponse.ok && queryContentType.includes('application/json')) {
        response = queryResponse;
      }
    } catch (fallbackErr) {
      console.warn('Fallback query parameter fetch error:', fallbackErr);
    }
  }

  const finalContentType = response.headers.get('content-type') || '';
  if (!finalContentType.includes('application/json')) {
    throw new Error(`Analysis record #${id} could not be retrieved from server (received non-JSON response).`);
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.error || `Failed to fetch analysis record (${response.status})`);
  }

  return data;
}

