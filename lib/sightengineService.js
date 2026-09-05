import dotenv from 'dotenv';

if (!process.env.SIGHTENGINE_API_USER) {
  dotenv.config();
}

// Credentials loaded exclusively from environment variables.
// Do NOT add hardcoded fallback values here — if these are undefined
// the Sightengine call will fail loudly, which is the correct behaviour.
const API_USER = process.env.SIGHTENGINE_API_USER;
const API_SECRET = process.env.SIGHTENGINE_API_SECRET;
const SIGHTENGINE_BASE_URL = 'https://api.sightengine.com/1.0';

/**
 * Analyzes media using Sightengine's GenAI detection model.
 *
 * @param {Object} options
 * @param {string} [options.mediaUrl] - Public URL of the media
 * @param {string} [options.fileData] - Base64 encoded file data (data URL or raw base64)
 * @param {string} [options.mediaType] - 'image' | 'video' | 'audio'
 * @param {string} [options.fileName] - Name of the file
 * @returns {Promise<{success: boolean, score: number, details: Object, raw: Object}>}
 */
export async function analyzeSightengine({ mediaUrl, fileData, mediaType = 'image', fileName = 'media.jpg' }) {
  if (!mediaUrl && !fileData) {
    throw new Error('Either mediaUrl or fileData must be provided to Sightengine');
  }

  const endpoint = `${SIGHTENGINE_BASE_URL}/check.json`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

  try {
    let response;

    if (mediaUrl) {
      // Analyze via URL
      const params = new URLSearchParams({
        url: mediaUrl,
        models: 'genai',
        api_user: API_USER,
        api_secret: API_SECRET
      });

      response = await fetch(`${endpoint}?${params.toString()}`, {
        method: 'GET',
        signal: controller.signal
      });
    } else {
      // Analyze via Base64 binary upload
      let base64Content = fileData;
      let mimeType = 'image/jpeg';

      if (fileData.startsWith('data:')) {
        const parts = fileData.split(',');
        const mimeMatch = parts[0].match(/:(.*?);/);
        if (mimeMatch) mimeType = mimeMatch[1];
        base64Content = parts[1];
      }

      const buffer = Buffer.from(base64Content, 'base64');
      const blob = new Blob([buffer], { type: mimeType });

      const formData = new FormData();
      formData.append('media', blob, fileName);
      formData.append('models', 'genai');
      formData.append('api_user', API_USER);
      formData.append('api_secret', API_SECRET);

      response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });
    }

    clearTimeout(timeoutId);

    const data = await response.json();

    if (data.status === 'failure' || data.error) {
      const errorMsg = data.error?.message || 'Sightengine API returned an error';
      console.warn('Sightengine API warning/failure:', errorMsg, data);
      return {
        success: false,
        score: 0.5, // neutral fallback
        error: errorMsg,
        details: data.error || {},
        raw: data
      };
    }

    // Extract score: Sightengine genai model returns `type.ai_generated`
    const aiScore = data.type?.ai_generated ?? data.ai_generated?.score ?? data.ai_generated?.prob ?? 0;

    return {
      success: true,
      score: Number(Number(aiScore).toFixed(4)),
      details: {
        model: 'genai',
        ai_generated_probability: aiScore,
        type_breakdown: data.type || {},
        request_id: data.request?.id
      },
      raw: data
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Sightengine API request timed out after 20 seconds');
    }
    console.error('Sightengine request failed:', error);
    return {
      success: false,
      score: 0.5,
      error: error.message,
      details: {},
      raw: null
    };
  }
}
