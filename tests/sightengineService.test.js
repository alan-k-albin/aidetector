import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { analyzeSightengine } from '../lib/sightengineService.js';

describe('Sightengine Service Unit Tests', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('throws an error if neither mediaUrl nor fileData is provided', async () => {
    await expect(analyzeSightengine({})).rejects.toThrow(
      'Either mediaUrl or fileData must be provided to Sightengine'
    );
  });

  it('handles successful URL analysis response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'success',
        type: { ai_generated: 0.85 },
        request: { id: 'req_123' }
      })
    });

    const result = await analyzeSightengine({ mediaUrl: 'https://example.com/test.jpg' });
    expect(result.success).toBe(true);
    expect(result.score).toBe(0.85);
    expect(result.details.request_id).toBe('req_123');
    expect(result.details.ai_generated_probability).toBe(0.85);
  });

  it('handles successful base64 file data analysis response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'success',
        type: { ai_generated: 0.04 },
        request: { id: 'req_456' }
      })
    });

    const base64Data = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD';
    const result = await analyzeSightengine({ fileData: base64Data, fileName: 'test.jpg' });

    expect(result.success).toBe(true);
    expect(result.score).toBe(0.04);
    expect(result.details.model).toBe('genai');
  });

  it('handles Sightengine API failure status response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'failure',
        error: { message: 'Invalid API credentials' }
      })
    });

    const result = await analyzeSightengine({ mediaUrl: 'https://example.com/test.jpg' });

    expect(result.success).toBe(false);
    expect(result.score).toBe(0.5);
    expect(result.error).toBe('Invalid API credentials');
  });

  it('handles fetch exception gracefully', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const result = await analyzeSightengine({ mediaUrl: 'https://example.com/test.jpg' });

    expect(result.success).toBe(false);
    expect(result.score).toBe(0.5);
    expect(result.error).toBe('Network error');
  });
});
