import { describe, it, expect } from 'vitest';
import { processChatImageFile } from '../services/chatImageHelper.js';

describe('chatImageHelper - Secure Client-Side Image Processing', () => {
  it('returns failure when file is null or undefined', async () => {
    const res = await processChatImageFile(null);
    expect(res.success).toBe(false);
    expect(res.error).toContain('לא נבחר קובץ');
  });

  it('rejects unsupported and executable file extensions', async () => {
    const res = await processChatImageFile({
      name: 'malware.exe',
      type: 'application/octet-stream',
      size: 5000
    });
    expect(res.success).toBe(false);
    expect(res.error).toContain('אינו נתמך');
  });

  it('rejects dangerous double extension files', async () => {
    const res = await processChatImageFile({
      name: 'payload.sh.png',
      type: 'image/png',
      size: 1500
    });
    expect(res.success).toBe(false);
    expect(res.error).toContain('סיומת כפולה חשודה');
  });

  it('rejects files exceeding raw 10MB limit', async () => {
    const res = await processChatImageFile({
      name: 'giant_capture.png',
      type: 'image/png',
      size: 12 * 1024 * 1024
    });
    expect(res.success).toBe(false);
    expect(res.error).toContain('חורג מהמגבלה');
  });

  it('safely processes valid screenshot metadata in non-DOM/test environments', async () => {
    const res = await processChatImageFile({
      name: 'screenshot_tala.png',
      type: 'image/png',
      size: 200 * 1024
    });
    expect(res.success).toBe(true);
    expect(res.attachment).toBeDefined();
    expect(res.attachment.name).toBe('screenshot_tala.png');
    expect(res.attachment.type).toBe('image/jpeg');
    expect(res.attachment.url).toBeDefined();
  });
});
