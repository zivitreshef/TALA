import { callAiProxyEndpoint } from './aiProxyClient';

/**
 * Converts a Blob to a base64 encoded string.
 * Supports both browser and Node/testing environments via ArrayBuffer.
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  if (!blob || blob.size === 0) return '';

  if (typeof blob.arrayBuffer === 'function') {
    const buffer = await blob.arrayBuffer();
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(buffer).toString('base64');
    }
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return typeof btoa !== 'undefined' ? btoa(binary) : '';
  }

  // Fallback for older browser runtimes
  return new Promise((resolve, reject) => {
    if (typeof FileReader === 'undefined') {
      resolve('');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl ? dataUrl.split(',')[1] || '' : '';
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Transcribes an audio recording using Gemini AI through the backend proxy.
 */
export async function transcribeAudioWithGemini(audioBlob: Blob): Promise<string> {
  if (!audioBlob || audioBlob.size === 0) return '';

  const audioBase64 = await blobToBase64(audioBlob);
  if (!audioBase64) return '';

  const mimeType = audioBlob.type || 'audio/webm';

  const res: any = await callAiProxyEndpoint({
    operation: 'transcribeAudio',
    payload: {
      audioBase64,
      mimeType,
      prompt: 'הקשב היטב לקובץ השמע המצורף בעברית ותמלל אותו במדויק. החזר JSON במבנה הבא בלבד: {"transcript": "..."}'
    }
  });

  const parsed = res?.data || res;
  return (parsed?.transcript || parsed?.raw || '').trim();
}
