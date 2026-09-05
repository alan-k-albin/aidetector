import { describe, it, expect } from 'vitest';
import {
  calculateAssessment,
  generateSightengineFallbackExplanation
} from '../lib/assessmentService.js';

describe('assessmentService - TruthLens v1.1 Reliability-Weighted Assessment & Reasoning', () => {
  it('correctly applies 70% Sightengine / 30% Gemini weighting when both signals succeed', () => {
    const sightengineResult = { success: true, score: 0.90 };
    const geminiResult = {
      success: true,
      score: 0.60,
      agrees_with_sightengine: true,
      explanation: 'Synthetic diffusion textures and warped reflection geometry observed.'
    };

    const result = calculateAssessment(sightengineResult, geminiResult);

    expect(result.verdict).toBe('Likely AI-generated');
    expect(result.breakdown.sightengine_weight).toBe(0.70);
    expect(result.breakdown.gemini_weight).toBe(0.30);
    expect(result.breakdown.combined_score).toBeCloseTo(0.81, 2);
    expect(result.breakdown.consensus).toContain('Moderate Agreement (70/30 Consensus)');
    expect(result.explanation_source).toBe('gemini');
    expect(result.explanation).toBe(geminiResult.explanation);
  });

  it('correctly synthesizes when both engines strongly detect AI-generated media (Consensus)', () => {
    const sightengineResult = { success: true, score: 0.96 };
    const geminiResult = {
      success: true,
      score: 0.92,
      agrees_with_sightengine: true,
      explanation: 'Observable digital diffusion artifacts detected throughout the image.'
    };

    const result = calculateAssessment(sightengineResult, geminiResult);

    expect(result.verdict).toBe('Likely AI-generated');
    expect(result.confidence).toBeGreaterThanOrEqual(80);
    expect(result.breakdown.sightengine_score).toBe(0.96);
    expect(result.breakdown.gemini_score).toBe(0.92);
    expect(result.breakdown.consensus).toContain('Strong Agreement');
    expect(result.explanation).toBe(geminiResult.explanation);
  });

  it('correctly synthesizes when both engines detect authentic media (Consensus)', () => {
    const sightengineResult = { success: true, score: 0.05 };
    const geminiResult = {
      success: true,
      score: 0.08,
      agrees_with_sightengine: true,
      explanation: 'Natural lens optics, realistic depth of field, and natural skin textures.'
    };

    const result = calculateAssessment(sightengineResult, geminiResult);

    expect(result.verdict).toBe('Likely Authentic');
    expect(result.confidence).toBeGreaterThanOrEqual(80);
    expect(result.breakdown.combined_score).toBeLessThanOrEqual(0.35);
    expect(result.breakdown.consensus).toContain('Strong Agreement');
  });

  it('correctly flags as "Uncertain" when engines significantly disagree (Split Verdict)', () => {
    const sightengineResult = { success: true, score: 0.90 };
    const geminiResult = {
      success: true,
      score: 0.15,
      agrees_with_sightengine: false,
      explanation: 'Divergent observation: organic camera grain present despite pixel flag.'
    };

    const result = calculateAssessment(sightengineResult, geminiResult);

    expect(result.verdict).toBe('Uncertain');
    expect(result.breakdown.consensus).toContain('Split Verdict');
    expect(result.confidence).toBeLessThanOrEqual(65);
  });

  it('CRITICAL FIX 1: Always provides rich Sightengine reasoning when Gemini is unavailable', () => {
    const sightengineResult = {
      success: true,
      score: 0.94,
      raw: { type: { ai_generated: 0.94, photo: 0.05, illustration: 0.85 } }
    };
    const geminiResult = {
      success: false,
      score: null,
      explanation: 'Gemini verification signal temporarily unavailable (timeout).'
    };

    const result = calculateAssessment(sightengineResult, geminiResult);

    expect(result.verdict).toBe('Likely AI-generated');
    expect(result.breakdown.sightengine_weight).toBe(1.0);
    expect(result.breakdown.gemini_weight).toBe(0.0);
    expect(result.breakdown.combined_score).toBe(0.94);
    // Crucial check: Explanation must NEVER be empty or just the timeout message
    expect(result.explanation_source).toBe('sightengine_fallback');
    expect(result.explanation).toContain("Sightengine's neural pixel probe detected an elevated AI-generation probability");
    expect(result.explanation).toContain('94%');
    expect(result.explanation).not.toContain('temporarily unavailable');
  });

  it('CRITICAL FIX 1: Provides rich Sightengine reasoning for authentic media when Gemini fails', () => {
    const sightengineResult = {
      success: true,
      score: 0.02,
      raw: { type: { ai_generated: 0.02, photo: 0.98 } }
    };
    const geminiResult = {
      success: false,
      score: null,
      error: 'Gemini rate limit exceeded'
    };

    const result = calculateAssessment(sightengineResult, geminiResult);

    expect(result.verdict).toBe('Likely Authentic');
    expect(result.explanation_source).toBe('sightengine_fallback');
    expect(result.explanation).toContain("Sightengine's neural pixel probe detected a minimal AI-generation probability");
    expect(result.explanation).toContain('2%');
    expect(result.explanation).toContain('natural high-frequency optical sensor grain');
  });

  it('generateSightengineFallbackExplanation produces structured explanations for all verdict bands', () => {
    const aiExpl = generateSightengineFallbackExplanation({ score: 0.91 }, 'Likely AI-generated', 'image');
    expect(aiExpl).toContain('91%');
    expect(aiExpl).toContain('diffusion latent fingerprints');

    const authExpl = generateSightengineFallbackExplanation({ score: 0.04 }, 'Likely Authentic', 'image');
    expect(authExpl).toContain('4%');
    expect(authExpl).toContain('optical sensor grain');

    const uncExpl = generateSightengineFallbackExplanation({ score: 0.52 }, 'Uncertain', 'image');
    expect(uncExpl).toContain('52%');
    expect(uncExpl).toContain('inconclusive verdict');
  });

  it('gracefully degrades to 100% Gemini when Sightengine is unavailable', () => {
    const sightengineResult = { success: false, score: null, error: 'Network error' };
    const geminiResult = {
      success: true,
      score: 0.12,
      explanation: 'Clear authentic photographic markers.'
    };

    const result = calculateAssessment(sightengineResult, geminiResult);

    expect(result.verdict).toBe('Likely Authentic');
    expect(result.breakdown.sightengine_weight).toBe(0.0);
    expect(result.breakdown.gemini_weight).toBe(1.0);
    expect(result.breakdown.combined_score).toBe(0.12);
  });

  it('correctly processes Text Mode with Gemini 100% and Sightengine skipped', () => {
    const sightengineResult = { success: false, skipped: true, score: null };
    const geminiResult = {
      success: true,
      score: 0.94,
      explanation: 'Formulaic LLM sentence structure and repetitive transitional vocabulary.'
    };

    const result = calculateAssessment(sightengineResult, geminiResult, { mediaType: 'text' });

    expect(result.verdict).toBe('Likely AI-generated');
    expect(result.breakdown.sightengine_weight).toBe(0.0);
    expect(result.breakdown.gemini_weight).toBe(1.0);
    expect(result.breakdown.combined_score).toBe(0.94);
    expect(result.breakdown.consensus).toBe('Gemini Forensic Text Analysis (Single Engine)');
  });

  it('correctly marks experimental consensus in Audio Mode', () => {
    const sightengineResult = { success: false, skipped: true, score: null };
    const geminiResult = {
      success: true,
      score: 0.82,
      explanation: 'Robotic vocoder harmonics and unnatural pitch consistency.'
    };

    const result = calculateAssessment(sightengineResult, geminiResult, { mediaType: 'audio' });

    expect(result.verdict).toBe('Likely AI-generated');
    expect(result.breakdown.consensus).toContain('Experimental Audio Analysis');
  });
});
