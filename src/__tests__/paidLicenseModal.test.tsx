import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';
import PaidLicenseModal from '../components/modals/PaidLicenseModal';
import { AllowedUserRecord } from '../allowedUsers';

describe('PaidLicenseModal Component', () => {
  const mockUser: Partial<AllowedUserRecord> = {
    name: 'מורה לדוגמה',
    email: 'teacher@test.com',
    subscriptionType: 'annual_paid'
  };

  it('does not render when isOpen is false', () => {
    const html = renderToStaticMarkup(
      <PaidLicenseModal
        isOpen={false}
        currentUser={mockUser}
        onAcceptLicense={vi.fn()}
      />
    );
    expect(html).toBe('');
  });

  it('renders modal with Hebrew titles, details and download link when isOpen is true', () => {
    const html = renderToStaticMarkup(
      <PaidLicenseModal
        isOpen={true}
        currentUser={mockUser}
        onAcceptLicense={vi.fn()}
      />
    );

    expect(html).toContain('הסכם רישיון שימוש, תנאי מנוי ותמיכה');
    expect(html).toContain('שלום מורה לדוגמה, חשבונך שודרג למנוי שנתי מלא!');
    expect(html).toContain('הורדת מסמך חתום');
    expect(html).toContain('1. תנאי הרישיון, תמורה ותשלום');
    expect(html).toContain('7. בינה מלאכותית (AI) והיעדר אחריות מקצועית');
    expect(html).toContain('קראתי, הבנתי ואני מאשרת את תנאי רכישת המנוי');
    expect(html).toContain('data-testid="paid-license-checkbox"');
    expect(html).toContain('data-testid="paid-license-confirm-btn"');
  });

  it('renders logout button when onLogout prop is supplied', () => {
    const html = renderToStaticMarkup(
      <PaidLicenseModal
        isOpen={true}
        currentUser={mockUser}
        onAcceptLicense={vi.fn()}
        onLogout={vi.fn()}
      />
    );

    expect(html).toContain('התנתקות מהמערכת');
  });
});
