import { describe, it, expect } from 'vitest';
import { compressImage } from '@/lib/image-compression';

describe('compressImage', () => {
  it('returns non-image files (e.g. PDF) untouched', async () => {
    const pdfBlob = new Blob(['%PDF-1.4 mock content'], { type: 'application/pdf' });
    const pdfFile = new File([pdfBlob], 'receipt.pdf', { type: 'application/pdf' });

    const result = await compressImage(pdfFile);
    expect(result).toBe(pdfFile);
    expect(result.name).toBe('receipt.pdf');
  });

  it('safely handles non-browser / headless execution gracefully', async () => {
    const imgBlob = new Blob(['mock-image-bytes'], { type: 'image/jpeg' });
    const imgFile = new File([imgBlob], 'test.jpeg', { type: 'image/jpeg' });

    // In Node.js / Vitest jsdom environment where Image/Canvas might be mocked or absent
    const result = await compressImage(imgFile);
    expect(result).toBeDefined();
    expect(result.type).toBe('image/jpeg');
  });
});
