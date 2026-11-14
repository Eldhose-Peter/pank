/**
 * Safely parses an HTTP response as JSON, gracefully handling non-JSON error pages
 * (e.g. Vercel 413 FUNCTION_PAYLOAD_TOO_LARGE, 504 Gateway Timeout, 500 HTML error pages)
 * so WebKit / Safari never crashes with "The string did not match the expected pattern."
 */
export async function parseJsonResponse<T = any>(res: Response): Promise<T> {
  const text = await res.text();
  let data: any = null;

  try {
    data = JSON.parse(text);
  } catch {
    // Check for Vercel / serverless proxy non-JSON error bodies
    if (res.status === 413 || text.includes('FUNCTION_PAYLOAD_TOO_LARGE')) {
      throw new Error(
        'The uploaded file is too large for the server. Please take a closer photo or upload a smaller file.'
      );
    }
    if (res.status === 504 || text.includes('GATEWAY_TIMEOUT') || text.includes('Endpoint timed out')) {
      throw new Error(
        'The AI vision service timed out while processing your bill. Please try again with a clearer photo.'
      );
    }
    if (!res.ok) {
      throw new Error(`Server returned error (${res.status}). Please try again.`);
    }
    throw new Error('Unexpected response format received from server.');
  }

  if (!res.ok) {
    throw new Error(data?.error || `Request failed with status ${res.status}`);
  }

  return data as T;
}
