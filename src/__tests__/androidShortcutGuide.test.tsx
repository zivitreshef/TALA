import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import TrialUpgradeModal from '../components/modals/TrialUpgradeModal';
import { PEDAGOGICAL_GUIDE_CHAPTERS } from '../components/modals/pedagogicalGuideData';

describe('Android and iPad Shortcut Guide (Chapter 15)', () => {
  const sampleUser = {
    name: 'מורה',
    email: 'teacher@test.com',
    role: 'teacher',
    isTrialUser: false
  };

  it('includes Android shortcut instructions in PEDAGOGICAL_GUIDE_CHAPTERS Chapter 15', () => {
    const ch15 = PEDAGOGICAL_GUIDE_CHAPTERS.find((c) => c.id === 15);
    expect(ch15).toBeDefined();
    expect(ch15?.subtitle).toContain('באנדרואיד');
    const androidContent = ch15?.content.find((item) => item.heading.includes('אנדרואיד'));
    expect(androidContent).toBeDefined();
    expect(androidContent?.text).toContain('Chrome');
    expect(androidContent?.text).toContain('שלוש הנקודות');
    expect(androidContent?.text).toContain('הוספה למסך הבית');
  });

  it('renders both iPad/iPhone and Android step-by-step instructions in TrialUpgradeModal', () => {
    const html = renderToStaticMarkup(
      <TrialUpgradeModal
        isOpen={true}
        currentUser={sampleUser}
        onClose={() => {}}
        initialTab="guide"
      />
    );

    // Verify Chapter 15 is rendered
    expect(html).toContain('קיצור לאייפד / אייפון: איך להוסיף קיצור דרך של TALA למסך הבית באייפד ובאייפון');
    expect(html).toContain('קיצור לאנדרואיד: איך להוסיף קיצור דרך של TALA למסך הבית באנדרואיד');
    expect(html).toContain('פתיחת Chrome');
    expect(html).toContain('שלוש הנקודות האנכיות (⋮)');
    expect(html).toContain('הוספה למסך הבית');
  });
});
