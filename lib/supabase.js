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
 * Supports both `vision_result` (existing Supabase column) and `gemini_result`.
 *
 * @param {Object} analysis
 * @returns {Promise<Object>} The saved analysis record with generated ID
 */
export async function saveAnalysis(analysis) {
  const payload = {
    media_url: analysis.media_url || null,
    media_type: analysis.media_type || 'image',
    sightengine_result: analysis.sightengine_result || null,
    // The existing schema has `vision_result` for the 2nd vision engine
    vision_result: analysis.gemini_result || null,
    verdict: analysis.verdict,
    confidence: Number(analysis.confidence),
    explanation: analysis.explanation
  };

  const { data, error } = await supabase
    .from('analyses')
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error('Supabase insert error:', error);
    throw new Error(`Failed to save analysis to Supabase: ${error.message}`);
  }

  // Normalize returned object to include gemini_result
  return {
    ...data,
    gemini_result: data.gemini_result || data.vision_result
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

  const { data, error } = await supabase
    .from('analyses')
    .select('*')
    .eq('id', id)
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
    gemini_result: data.gemini_result || data.vision_result
  };
}
