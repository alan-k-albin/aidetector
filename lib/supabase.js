import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Ensure environment variables are loaded in local serverless execution
if (!process.env.SUPABASE_URL) {
  dotenv.config();
}

const supabaseUrl = process.env.SUPABASE_URL || 'https://fmqhpqujlughgpkgbmpk.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtcWhwcXVqbHVnaGdwa2dibXBrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1Nzg4NTgsImV4cCI6MjEwNDE1NDg1OH0.sZmp2n92IZQj3lvQ4Qo_tqVfCA5Hcd2Y0duxz3Pu6DY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Persists an analysis record to the Supabase `analyses` table.
 * Supports `input_mode`, `media_type`, `vision_result`, and `gemini_result`.
 *
 * Designed with backward-compatibility: If the Supabase table doesn't have
 * an `input_mode` column yet, it catches the column error and falls back
 * to inserting without `input_mode` so existing setups never break.
 *
 * @param {Object} analysis
 * @returns {Promise<Object>} The saved analysis record with generated ID
 */
export async function saveAnalysis(analysis) {
  const basePayload = {
    media_url: analysis.media_url || null,
    media_type: analysis.media_type || 'image',
    sightengine_result: analysis.sightengine_result || null,
    vision_result: analysis.gemini_result || null,
    verdict: analysis.verdict,
    confidence: Number(analysis.confidence),
    explanation: analysis.explanation
  };

  // Attempt insert with input_mode first
  const fullPayload = {
    ...basePayload,
    ...(analysis.input_mode ? { input_mode: analysis.input_mode } : {})
  };

  let { data, error } = await supabase
    .from('analyses')
    .insert([fullPayload])
    .select()
    .single();

  // If insert failed due to column 'input_mode' not existing, retry without it
  if (error && (error.message?.includes('input_mode') || error.code === 'PGRST204')) {
    console.warn('Supabase schema does not have input_mode column, falling back to base payload');
    const fallbackRes = await supabase
      .from('analyses')
      .insert([basePayload])
      .select()
      .single();
    data = fallbackRes.data;
    error = fallbackRes.error;
  }

  if (error) {
    console.error('Supabase insert error:', error);
    throw new Error(`Failed to save analysis to Supabase: ${error.message}`);
  }

  return {
    ...data,
    gemini_result: data.gemini_result || data.vision_result,
    input_mode: data.input_mode || analysis.input_mode || 'file'
  };
}

/**
 * Fetches an analysis record by its UUID.
 *
 * @param {string} id
 * @returns {Promise<Object|null>} The saved analysis record
 */
export async function getAnalysisById(id) {
  if (!id) throw new Error('Analysis ID is required');

  // Validate UUID format (e.g. 123e4567-e89b-12d3-a456-426614174000)
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim());
  if (!isUuid) {
    return null; // Non-UUID strings are considered not found
  }

  const { data, error } = await supabase
    .from('analyses')
    .select('*')
    .eq('id', id.trim())
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    console.error('Supabase query error:', error);
    throw new Error(`Failed to fetch analysis: ${error.message}`);
  }

  return {
    ...data,
    gemini_result: data.gemini_result || data.vision_result,
    input_mode: data.input_mode || 'file'
  };
}

/**
 * Looks up an existing analysis by media URL or text content snippet in Supabase.
 * Serves as a lightweight result cache to avoid re-querying external APIs for duplicate inputs.
 *
 * @param {string} mediaUrl - Exact media URL or text identifier
 * @returns {Promise<Object|null>} Saved analysis record if cached
 */
export async function findExistingAnalysisByMediaUrl(mediaUrl) {
  if (!mediaUrl || typeof mediaUrl !== 'string') return null;

  try {
    const { data, error } = await supabase
      .from('analyses')
      .select('*')
      .eq('media_url', mediaUrl.trim())
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      return null;
    }

    const record = data[0];
    return {
      ...record,
      gemini_result: record.gemini_result || record.vision_result,
      input_mode: record.input_mode || 'file'
    };
  } catch (err) {
    console.warn('[TruthLens Cache] Lookup skipped:', err.message);
    return null;
  }
}

