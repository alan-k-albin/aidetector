import { describe, it, expect, vi, afterEach } from 'vitest';
import { analyzeGemini } from '../lib/geminiService.js';

describe('Gemini Service Unit Tests', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('throws an error if no mediaUrl, fileData, or textInput is provided', async () => {
    await expect(analyzeGemini({ mediaType: 'image' })).rejects.toThrow(
      'Either mediaUrl, fileData, or textInput must be provided to Gemini'
    );
  });

  it('successfully analyzes text input and parses structured JSON', async () => {
    const mockPayload = {
      gemini_score: 0.92,
      agrees_with_sightengine: null,
      confidence: 90,
      verdict_label: 'Likely AI-generated',
      explanation: 'The text exhibits high burstiness and formulaic AI transitional phrases.',
      artifacts_detected: ['formulaic transitions', 'uniform sentence length'],
      agreement_summary: 'Text analysis performed exclusively by Gemini.'
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: JSON.stringify(mockPayload) }]
            }
          }
        ]
      })
    });

    const result = await analyzeGemini({
      textInput: 'As an AI language model, it is important to remember the rich tapestry of life...',
      mediaType: 'text'
    });

    expect(result.success).toBe(true);
    expect(result.score).toBe(0.92);
    expect(result.confidence).toBe(90);
    expect(result.explanation).toContain('formulaic AI transitional phrases');
    expect(result.artifacts_detected).toEqual(['formulaic transitions', 'uniform sentence length']);
  });

  it('handles image input and cross-checks with Sightengine score', async () => {
    const mockPayload = {
      gemini_score: 0.10,
      agrees_with_sightengine: true,
      confidence: 88,
      verdict_label: 'Likely Authentic',
      explanation: 'Natural grain and coherent focal depth observed throughout image.',
      artifacts_detected: [],
      agreement_summary: 'Agrees with low Sightengine probability.'
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: JSON.stringify(mockPayload) }]
            }
          }
        ]
      })
    });

    const result = await analyzeGemini({
      fileData: 'data:image/jpeg;base64,12345',
      mediaType: 'image',
      sightengineScore: 0.05
    });

    expect(result.success).toBe(true);
    expect(result.score).toBe(0.10);
    expect(result.agrees_with_sightengine).toBe(true);
  });

  it('returns graceful fallback object when Gemini API returns HTTP error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: { message: 'Invalid API Key' } })
    });

    const result = await analyzeGemini({
      fileData: 'data:image/jpeg;base64,12345',
      mediaType: 'image',
      sightengineScore: 0.05
    });

    expect(result.success).toBe(false);
    expect(result.score).toBeNull();
    expect(result.explanation).toContain('Sightengine GenAI neural probe');
  }, 10000);
});
