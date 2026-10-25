import { describe, it, expect } from 'vitest';
import {
  sha256Hex,
  generatePasswordSalt,
  hashPasswordWithSalt,
  createPasswordCredentials,
  verifyUserPassword,
  ensureUserPasswordHashed,
  ensureUsersListPasswordsHashed,
  validatePasswordPolicy
} from '../allowedUsers';

describe('Auth & Credential Cryptographic Security', () => {
  it('computes correct standard SHA-256 hashes against standard test vectors and handles empty/null inputs', () => {
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(sha256Hex('TALA2026')).toBe('de38f7d1e8a191b8b7a429d5fa0ee076f3edcd474de96a26a6162d9e8e4fbac9');
    expect(sha256Hex(null)).toBe(sha256Hex(''));
    expect(sha256Hex(undefined)).toBe(sha256Hex(''));
  });

  it('generates distinct cryptographically random hexadecimal salts with configurable byte length', () => {
    const salt1 = generatePasswordSalt();
    const salt2 = generatePasswordSalt();
    expect(salt1).toHaveLength(32);
    expect(salt2).toHaveLength(32);
    expect(salt1).not.toBe(salt2);
    expect(/^[0-9a-f]{32}$/.test(salt1)).toBe(true);
    expect(/^[0-9a-f]{32}$/.test(salt2)).toBe(true);

    const customShort = generatePasswordSalt(8);
    expect(customShort).toHaveLength(16);
    const customLong = generatePasswordSalt(32);
    expect(customLong).toHaveLength(64);
  });

  it('stretches password hash across 256 rounds with domain separation', () => {
    const salt = 'a1f0e8c49b2d471683a5c7e901234567';
    const hash1 = hashPasswordWithSalt('secret123', salt);
    const hash2 = hashPasswordWithSalt('secret123', salt);
    const hashDifferentPassword = hashPasswordWithSalt('secret124', salt);
    const hashDifferentSalt = hashPasswordWithSalt('secret123', 'b2e1f9d50c3e582794b6d8f012345678');

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/.test(hash1)).toBe(true);
    expect(hash1).not.toBe(hashDifferentPassword);
    expect(hash1).not.toBe(hashDifferentSalt);
  });

  it('trims whitespace when hashing passwords and salts and handles nullish inputs', () => {
    const salt = 'a1f0e8c49b2d471683a5c7e901234567';
    const cleanHash = hashPasswordWithSalt('MyPassword123!', salt);
    const paddedHash = hashPasswordWithSalt('  MyPassword123!  ', `  ${salt}  `);
    expect(paddedHash).toBe(cleanHash);

    const nullishHash = hashPasswordWithSalt(null, undefined);
    expect(typeof nullishHash).toBe('string');
    expect(nullishHash).toHaveLength(64);
  });

  it('createPasswordCredentials generates new credentials or preserves provided salt', () => {
    const creds1 = createPasswordCredentials('MySecurePass1!');
    expect(creds1.passwordSalt).toHaveLength(32);
    expect(creds1.passwordHash).toBe(hashPasswordWithSalt('MySecurePass1!', creds1.passwordSalt));

    const fixedSalt = '11223344556677889900aabbccddeeff';
    const creds2 = createPasswordCredentials('MySecurePass1!', fixedSalt);
    expect(creds2.passwordSalt).toBe(fixedSalt);
    expect(creds2.passwordHash).toBe(hashPasswordWithSalt('MySecurePass1!', fixedSalt));
  });

  it('validates password policy rules (length, uppercase, lowercase, digit, special char)', () => {
    expect(validatePasswordPolicy('Weak').valid).toBe(false);
    expect(validatePasswordPolicy('NoSpecial123').valid).toBe(false);
    expect(validatePasswordPolicy('no_upper_123!').valid).toBe(false);
    expect(validatePasswordPolicy('NO_LOWER_123!').valid).toBe(false);
    expect(validatePasswordPolicy('NoDigitsSpecial!').valid).toBe(false);

    const validResult = validatePasswordPolicy('Valid@Pass2026');
    expect(validResult.valid).toBe(true);
    expect(validResult.missing).toHaveLength(0);
    expect(validResult.errorMessage).toBe('');
    expect(validResult.checks.every((c) => c.passed)).toBe(true);

    const emptyResult = validatePasswordPolicy('');
    expect(emptyResult.valid).toBe(false);
    expect(emptyResult.missing.length).toBeGreaterThanOrEqual(4);
    expect(emptyResult.errorMessage).toContain('הסיסמה אינה עומדת במדיניות האבטחה');
  });

  it('migrates legacy accessCode to salted password credentials and strips accessCode', () => {
    const legacyUser = { id: 'u_1', email: 'test@example.com', accessCode: 'TALA2026' };
    const { user, migrated } = ensureUserPasswordHashed(legacyUser);

    expect(migrated).toBe(true);
    expect(user.accessCode).toBeUndefined();
    expect(user.passwordHash).toBeDefined();
    expect(user.passwordSalt).toHaveLength(32);
    expect(user.email).toBe('test@example.com');
    expect(verifyUserPassword(user, 'TALA2026')).toBe(true);
  });

  it('handles ensureUserPasswordHashed idempotently and strips lingering accessCode if already hashed', () => {
    const modernUser = {
      id: 'u_modern',
      email: 'modern@tala.edu.il',
      ...createPasswordCredentials('StrongPass123!')
    };
    const res1 = ensureUserPasswordHashed(modernUser);
    expect(res1.migrated).toBe(false);
    expect(res1.user).toBe(modernUser);

    const dirtyUser = {
      id: 'u_dirty',
      email: 'dirty@tala.edu.il',
      accessCode: 'OldPlaintext',
      passwordHash: 'dummyhash',
      passwordSalt: 'dummysalt'
    };
    const res2 = ensureUserPasswordHashed(dirtyUser);
    expect(res2.migrated).toBe(true);
    expect(res2.user.accessCode).toBeUndefined();
    expect(res2.user.passwordHash).toBe('dummyhash');

    expect(ensureUserPasswordHashed(null).migrated).toBe(false);
    expect(ensureUserPasswordHashed(undefined).migrated).toBe(false);
    expect(ensureUserPasswordHashed({ name: 'no-creds' }).migrated).toBe(false);
  });

  it('ensures batch migration across user lists with ensureUsersListPasswordsHashed', () => {
    const mixedList = [
      { id: 'u_1', email: 'legacy1@tala.edu.il', accessCode: 'TALA2026' },
      { id: 'u_2', email: 'modern@tala.edu.il', ...createPasswordCredentials('ModernPass1!') },
      { id: 'u_3', email: 'legacy2@tala.edu.il', accessCode: '1234' }
    ];

    const result = ensureUsersListPasswordsHashed(mixedList);
    expect(result.migrated).toBe(true);
    expect(result.users).toHaveLength(3);
    expect(result.users[0].accessCode).toBeUndefined();
    expect(result.users[0].passwordHash).toBeDefined();
    expect(result.users[2].accessCode).toBeUndefined();
    expect(result.users[2].passwordHash).toBeDefined();

    // Already-migrated list should return migrated: false
    const secondPass = ensureUsersListPasswordsHashed(result.users);
    expect(secondPass.migrated).toBe(false);

    // Non-array input safely returns empty array
    expect(ensureUsersListPasswordsHashed(null)).toEqual({ users: [], migrated: false });
    expect(ensureUsersListPasswordsHashed('invalid')).toEqual({ users: [], migrated: false });
  });

  it('verifies modern salted password hashes and rejects incorrect passwords or tampered credentials', () => {
    const creds = createPasswordCredentials('P@ssword2026');
    const user = { id: 'u_test', ...creds };

    expect(verifyUserPassword(user, 'P@ssword2026')).toBe(true);
    expect(verifyUserPassword(user, '  P@ssword2026  ')).toBe(true); // Trims candidate
    expect(verifyUserPassword(user, 'WrongPassword')).toBe(false);

    // Tampered salt
    const tamperedSaltUser = { ...user, passwordSalt: generatePasswordSalt() };
    expect(verifyUserPassword(tamperedSaltUser, 'P@ssword2026')).toBe(false);

    // Tampered hash
    const tamperedHashUser = { ...user, passwordHash: '0'.repeat(64) };
    expect(verifyUserPassword(tamperedHashUser, 'P@ssword2026')).toBe(false);
  });

  it('supports case-insensitive bootstrap fallback for TALA2026 while enforcing strict case for other passwords', () => {
    const talaHashedUser = { id: 'u_tala', ...createPasswordCredentials('TALA2026') };
    expect(verifyUserPassword(talaHashedUser, 'TALA2026')).toBe(true);
    expect(verifyUserPassword(talaHashedUser, 'tala2026')).toBe(true);
    expect(verifyUserPassword(talaHashedUser, 'Tala2026')).toBe(true);

    const talaLegacyUser = { id: 'u_tala_legacy', accessCode: 'TALA2026' };
    expect(verifyUserPassword(talaLegacyUser, 'tala2026')).toBe(true);
    expect(verifyUserPassword(talaLegacyUser, 'TALA2026')).toBe(true);

    const customUser = { id: 'u_custom', ...createPasswordCredentials('SecretCase123!') };
    expect(verifyUserPassword(customUser, 'SecretCase123!')).toBe(true);
    expect(verifyUserPassword(customUser, 'secretcase123!')).toBe(false);
    expect(verifyUserPassword(customUser, 'SECRETCASE123!')).toBe(false);
  });

  it('handles null, undefined, and non-object inputs safely in verifyUserPassword', () => {
    expect(verifyUserPassword(null, 'TALA2026')).toBe(false);
    expect(verifyUserPassword(undefined, 'TALA2026')).toBe(false);
    expect(verifyUserPassword('invalid_user', 'TALA2026')).toBe(false);
    expect(verifyUserPassword(12345, 'TALA2026')).toBe(false);

    const validUser = { id: 'u_user', ...createPasswordCredentials('ValidPass1!') };
    expect(verifyUserPassword(validUser, null)).toBe(false);
    expect(verifyUserPassword(validUser, undefined)).toBe(false);
    expect(verifyUserPassword(validUser, '')).toBe(false);
  });
});
