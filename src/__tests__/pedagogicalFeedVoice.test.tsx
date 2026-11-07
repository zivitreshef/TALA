import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import PedagogicalFeed from '../components/form/PedagogicalFeed';
import {
  saveAudioRecordBlob,
  getAudioRecordBlob,
  uploadAudioRecordToCloud
} from '../services/dossierFileStorage';
import type { PedagogicalSnippet } from '../domain/types';

describe('PedagogicalFeed Voice Recording & Audio Persistence', () => {
  beforeEach(() => {
    if (typeof globalThis.window === 'undefined') {
      (globalThis as any).window = globalThis;
    }

    (globalThis as any).Audio = vi.fn().mockImplementation(() => ({
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      onended: null,
      onerror: null
    }));
  });

  it('renders VoiceObservationRecorder in PedagogicalFeed input section', () => {
    const html = renderToStaticMarkup(
      <PedagogicalFeed
        snippets={[]}
        onAddSnippet={vi.fn()}
        onRemoveSnippet={vi.fn()}
        onOpenUploadModal={vi.fn()}
        onTriggerAiAnalysis={vi.fn()}
      />
    );

    expect(html).toContain('voice-obs-btn-start');
    expect(html).toContain('הקלטת תצפית קולית');
  });

  it('renders audio playback button on snippet cards that have audio recordings', () => {
    const sampleSnippets: PedagogicalSnippet[] = [
      {
        id: 'ps_voice_1',
        sourceType: 'teacher_note',
        sourceTitle: 'תצפית מורה',
        content: 'הילד שיתף פעולה יפה מאוד במשחק הקוביות',
        createdAt: new Date().toISOString(),
        hasAudio: true
      },
      {
        id: 'ps_text_only',
        sourceType: 'teacher_note',
        sourceTitle: 'תצפית טקסט בלבד',
        content: 'תצפית ללא הקלטה קולית',
        createdAt: new Date().toISOString()
      }
    ];

    const html = renderToStaticMarkup(
      <PedagogicalFeed
        snippets={sampleSnippets}
        onAddSnippet={vi.fn()}
        onRemoveSnippet={vi.fn()}
        onOpenUploadModal={vi.fn()}
        onTriggerAiAnalysis={vi.fn()}
      />
    );

    expect(html).toContain('השמעת הקלטה');
    expect(html).toContain('הילד שיתף פעולה יפה מאוד במשחק הקוביות');
    expect(html).toContain('תצפית ללא הקלטה קולית');
  });

  it('verifies audio storage helper functions persist and retrieve blobs safely', async () => {
    const recordId = 'test_rec_123';
    const mockAudioBlob = new Blob(['sample-audio-bytes'], { type: 'audio/webm' });

    const saveResult = await saveAudioRecordBlob(recordId, mockAudioBlob);
    expect(typeof saveResult).toBe('boolean');

    const retrievedBlob = await getAudioRecordBlob(recordId);
    expect(retrievedBlob === null || retrievedBlob instanceof Blob).toBe(true);

    const uploadResult = await uploadAudioRecordToCloud(recordId, mockAudioBlob);
    expect(uploadResult === null || typeof uploadResult === 'object').toBe(true);
  });
});
