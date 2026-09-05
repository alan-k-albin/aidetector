import { describe, it, expect } from 'vitest';
import { calculateAssessment } from '../lib/assessmentService.js';

describe('assessmentService - Reliability-Weighted Dual Assessment', () => {
  it('correctly synthesizes when both engines detect AI-generated media (Consensus)', () => {
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

  it('handles ambiguous / borderline scores gracefully', () => {
    const sightengineResult = { success: true, score: 0.50 };
    const geminiResult = { success: true, score: 0.52 };

    const result = calculateAssessment(sightengineResult, geminiResult);

    expect(result.verdict).toBe('Uncertain');
    expect(result.confidence).toBeGreaterThanOrEqual(40);
    expect(result.confidence).toBeLessThanOrEqual(70);
  });

  it('gracefully degrades to single-engine mode if Gemini is unavailable', () => {
    const sightengineResult = { success: true, score: 0.88 };
    const geminiResult = { success: false, score: null, error: 'API timeout' };

    const result = calculateAssessment(sightengineResult, geminiResult);

    expect(result.verdict).toBe('Likely AI-generated');
    expect(result.breakdown.consensus).toBe('Single Engine Mode');
    expect(result.breakdown.sightengine_score).toBe(0.88);
  });

  it('gracefully degrades to single-engine mode if Sightengine is unavailable', () => {
    const sightengineResult = { success: false, score: null, error: 'Network error' };
    const geminiResult = {
      success: true,
      score: 0.12,
      explanation: 'Clear authentic photographic markers.'
    };

    const result = calculateAssessment(sightengineResult, geminiResult);

    expect(result.verdict).toBe('Likely Authentic');
    expect(result.breakdown.consensus).toBe('Single Engine Mode');
    expect(result.breakdown.gemini_score).toBe(0.12);
  });
});
