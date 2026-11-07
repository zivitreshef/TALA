import { describe, it, expect, vi, beforeEach } from 'vitest';
import { blobToBase64, transcribeAudioWithGemini } from '../services/audioTranscriptionService';
import * as aiProxyClient from '../services/aiProxyClient';

describe('Audio Transcription Service (Gemini Direct Fallback)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('converts an audio Blob to a clean base64 string', async () => {
    const mockBlob = new Blob(['test-audio-content'], { type: 'audio/webm' });
    const b64 = await blobToBase64(mockBlob);
    expect(typeof b64).toBe('string');
    expect(b64.length).toBeGreaterThan(0);
  });

  it('calls aiProxyEndpoint with transcribeAudio operation and returns transcript', async () => {
    const proxySpy = vi.spyOn(aiProxyClient, 'callAiProxyEndpoint').mockResolvedValue({
      data: {
        transcript: 'יונתן השתתף בריכוז במפגש בוקר'
      }
    });

    const mockBlob = new Blob(['sample-audio-data'], { type: 'audio/webm' });
    const result = await transcribeAudioWithGemini(mockBlob);

    expect(proxySpy).toHaveBeenCalledTimes(1);
    const callArgs = proxySpy.mock.calls[0][0];
    expect(callArgs.operation).toBe('transcribeAudio');
    expect(callArgs.payload.mimeType).toBe('audio/webm');
    expect(typeof callArgs.payload.audioBase64).toBe('string');
    expect(result).toBe('יונתן השתתף בריכוז במפגש בוקר');
  });

  it('returns empty string if audio blob is empty', async () => {
    const emptyBlob = new Blob([], { type: 'audio/webm' });
    const result = await transcribeAudioWithGemini(emptyBlob);
    expect(result).toBe('');
  });
});
