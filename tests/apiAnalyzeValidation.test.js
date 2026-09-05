import { describe, it, expect, vi } from 'vitest';
import handler from '../api/analyze.js';

// Helper to create mock Vercel serverless req/res objects
function createMockReqRes(method = 'POST', body = {}) {
  const req = {
    method,
    body,
    query: {},
    headers: {}
  };

  const res = {
    statusCode: 200,
    headers: {},
    bodyData: null,
    setHeader(key, value) {
      this.headers[key] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.bodyData = data;
      return this;
    },
    end() {
      return this;
    }
  };

  return { req, res };
}

describe('API /api/analyze Input Validation Tests', () => {
  it('returns 405 Method Not Allowed for unsupported HTTP methods like PUT', async () => {
    const { req, res } = createMockReqRes('PUT');
    await handler(req, res);
    expect(res.statusCode).toBe(405);
    expect(res.bodyData.error).toBe('Method Not Allowed');
  });

  it('returns 400 Bad Request when text input is empty', async () => {
    const { req, res } = createMockReqRes('POST', {
      inputMode: 'text',
      textInput: '   '
    });
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.bodyData.message).toContain('Please provide text content to analyze.');
  });

  it('returns 400 Bad Request when text input is less than 20 characters', async () => {
    const { req, res } = createMockReqRes('POST', {
      inputMode: 'text',
      textInput: 'Short text.'
    });
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.bodyData.message).toContain('Text must be at least 20 characters long');
  });

  it('returns 400 Payload Too Large when text exceeds 25,000 characters', async () => {
    const hugeText = 'a'.repeat(25001);
    const { req, res } = createMockReqRes('POST', {
      inputMode: 'text',
      textInput: hugeText
    });
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.bodyData.error).toBe('Payload Too Large');
  });

  it('returns 400 Bad Request when media link is restricted or malformed', async () => {
    const { req, res } = createMockReqRes('POST', {
      inputMode: 'link',
      mediaUrl: 'http://127.0.0.1/private.jpg'
    });
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.bodyData.error).toBe('Security Error');
  });

  it('returns 415 Unsupported Media Type for unsupported base64 MIME types', async () => {
    const { req, res } = createMockReqRes('POST', {
      inputMode: 'file',
      fileData: 'data:application/x-msdownload;base64,1234567890'
    });
    await handler(req, res);
    expect(res.statusCode).toBe(415);
    expect(res.bodyData.error).toBe('Unsupported Media Type');
  });

  it('returns 400 Bad Request when neither mediaUrl nor fileData is provided for file mode', async () => {
    const { req, res } = createMockReqRes('POST', {
      inputMode: 'file'
    });
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.bodyData.message).toContain('Please provide either a valid mediaUrl or base64 fileData');
  });
});
