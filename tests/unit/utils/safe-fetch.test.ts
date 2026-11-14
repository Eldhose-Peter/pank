import { describe, it, expect } from 'vitest';
import { parseJsonResponse } from '@/lib/safe-fetch';

describe('parseJsonResponse', () => {
  it('successfully parses valid JSON response on 200 OK', async () => {
    const mockResponse = new Response(JSON.stringify({ draft: { id: 'd123', title: 'Dinner' } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

    const result = await parseJsonResponse(mockResponse);
    expect(result).toEqual({ draft: { id: 'd123', title: 'Dinner' } });
  });

  it('extracts server error message when status is non-200 with JSON payload', async () => {
    const mockResponse = new Response(JSON.stringify({ error: 'Receipt unreadable. Please upload a clearer photo.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });

    await expect(parseJsonResponse(mockResponse)).rejects.toThrow(
      'Receipt unreadable. Please upload a clearer photo.'
    );
  });

  it('handles Vercel 413 FUNCTION_PAYLOAD_TOO_LARGE plain-text gracefully without crashing Safari parser', async () => {
    const mockResponse = new Response('413: FUNCTION_PAYLOAD_TOO_LARGE', {
      status: 413,
      statusText: 'Payload Too Large',
      headers: { 'Content-Type': 'text/plain' },
    });

    await expect(parseJsonResponse(mockResponse)).rejects.toThrow(
      /uploaded file is too large/i
    );
  });

  it('handles 504 Gateway Timeout gracefully', async () => {
    const mockResponse = new Response('504: GATEWAY_TIMEOUT', {
      status: 504,
      statusText: 'Gateway Timeout',
      headers: { 'Content-Type': 'text/plain' },
    });

    await expect(parseJsonResponse(mockResponse)).rejects.toThrow(
      /timed out/i
    );
  });

  it('handles 500 HTML error page gracefully without throwing "string did not match pattern"', async () => {
    const mockResponse = new Response('<!DOCTYPE html><html><body>Internal Server Error</body></html>', {
      status: 500,
      statusText: 'Internal Server Error',
      headers: { 'Content-Type': 'text/html' },
    });

    await expect(parseJsonResponse(mockResponse)).rejects.toThrow(
      /Server returned error \(500\)/i
    );
  });
});
