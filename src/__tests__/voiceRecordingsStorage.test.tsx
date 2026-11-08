import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import AdminUsageAndSecurityDashboard from '../components/modals/AdminUsageAndSecurityDashboard';
import {
  computeVoiceStorageFootprint,
  aggregateTelemetryData
} from '../domain/telemetry';

describe('Voice Recordings Storage & Footprint Analysis', () => {
  const mockStudentsWithVoice = [
    {
      id: 'student_1',
      name: 'אביגיל שחר',
      goals: [
        {
          id: 'goal_1',
          name: 'קריאה שוטפת',
          observations: [
            {
              id: 'obs_v1',
              date: '2026-11-08',
              authorName: 'מוטי רשף',
              note: 'התקדמות מצוינת בקריאת טקסט מנוקד',
              hasAudio: true,
              audioStorageUrl: 'https://storage.googleapis.com/tala/voice_obs_v1.webm',
              audioSizeBytes: 200 * 1024
            },
            {
              id: 'obs_text_only',
              date: '2026-11-07',
              authorName: 'זיוית רשף',
              note: 'תצפית טקסטואלית בלבד ללא שמע',
              hasAudio: false
            }
          ]
        }
      ],
      pedagogicalSnippets: [
        {
          id: 'snip_v2',
          createdAt: '2026-11-08T10:00:00Z',
          author: 'מורה משלבת',
          text: 'הקלטת תצפית במהלך עבודה בקבוצה קטנה',
          hasAudio: true,
          audioSizeBytes: 150 * 1024
        }
      ]
    },
    {
      id: 'student_2',
      name: 'יונתן כהן',
      goals: [],
      pedagogicalSnippets: []
    }
  ];

  it('computes voice recordings footprint accurately across observations and snippets', () => {
    const footprint = computeVoiceStorageFootprint(mockStudentsWithVoice);

    expect(footprint.totalRecords).toBe(2);
    expect(footprint.cloudAudioCount).toBe(1);
    expect(footprint.localAudioCount).toBe(1);
    expect(footprint.totalBytes).toBe(350 * 1024);
    expect(footprint.formattedMb).toContain('MB');
    expect(footprint.recentRecordings.length).toBe(2);

    const cloudItem = footprint.recentRecordings.find((r) => r.id === 'obs_v1');
    expect(cloudItem).toBeDefined();
    expect(cloudItem?.studentName).toBe('אביגיל שחר');
    expect(cloudItem?.authorName).toBe('מוטי רשף');
    expect(cloudItem?.source).toBe('daily_tracking');
    expect(cloudItem?.audioStorageUrl).toBe('https://storage.googleapis.com/tala/voice_obs_v1.webm');

    const localItem = footprint.recentRecordings.find((r) => r.id === 'snip_v2');
    expect(localItem).toBeDefined();
    expect(localItem?.studentName).toBe('אביגיל שחר');
    expect(localItem?.source).toBe('pedagogical_feed');
  });

  it('handles empty or null student list gracefully', () => {
    const emptyFootprint = computeVoiceStorageFootprint([]);
    expect(emptyFootprint.totalRecords).toBe(0);
    expect(emptyFootprint.totalBytes).toBe(0);
    expect(emptyFootprint.formattedMb).toBe('0.0 MB');
    expect(emptyFootprint.recentRecordings).toEqual([]);

    const nullFootprint = computeVoiceStorageFootprint(null as any);
    expect(nullFootprint.totalRecords).toBe(0);
  });

  it('includes voiceStorage in aggregateTelemetryData', () => {
    const aggregated = aggregateTelemetryData({
      students: mockStudentsWithVoice
    });

    expect(aggregated.voiceStorage).toBeDefined();
    expect(aggregated.voiceStorage.totalRecords).toBe(2);
  });

  it('renders voice-recordings-storage-panel in AdminUsageAndSecurityDashboard', () => {
    const html = renderToStaticMarkup(
      <AdminUsageAndSecurityDashboard
        students={mockStudentsWithVoice}
        settings={{}}
      />
    );

    expect(html).toContain('voice-recordings-storage-panel');
    expect(html).toContain('ניהול ואחסון הקלטות קוליות');
    expect(html).toContain('2 הקלטות');
  });

  it('strictly adheres to Hebrew-only titles with zero English in parentheses in voice storage section', () => {
    const html = renderToStaticMarkup(
      <AdminUsageAndSecurityDashboard
        students={mockStudentsWithVoice}
        settings={{}}
      />
    );

    // Verify presence of clean Hebrew titles
    expect(html).toContain('ניהול ואחסון הקלטות קוליות');
    expect(html).toContain('אחסון תיקי אבחון');

    // Strict ban on English inside parentheses
    expect(html).not.toContain('(Voice Records)');
    expect(html).not.toContain('(Audio)');
    expect(html).not.toContain('(Cloud Storage)');
  });
});
