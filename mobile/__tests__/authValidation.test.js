import {
  getPasswordCriteriaState,
  isStrongPassword,
  isValidEmail,
} from '../src/utils/authValidation';

describe('isValidEmail', () => {
  it('accepts well-formed addresses', () => {
    expect(isValidEmail('user@gmail.com')).toBe(true);
    expect(isValidEmail('  User@Example.co.uk  ')).toBe(true);
  });

  it('rejects invalid addresses', () => {
    expect(isValidEmail('user@gmail')).toBe(false);
    expect(isValidEmail('a@b')).toBe(false);
    expect(isValidEmail('bad@@mail.com')).toBe(false);
  });
});

describe('isStrongPassword', () => {
  it('requires length, case, digit and symbol', () => {
    expect(isStrongPassword('Aa1!aaaa')).toBe(true);
    expect(isStrongPassword('short1!')).toBe(false);
    expect(isStrongPassword('alllowercase1!')).toBe(false);
  });
});

describe('getPasswordCriteriaState', () => {
  it('tracks each rule independently', () => {
    expect(getPasswordCriteriaState('Aa1!')).toEqual({
      minLength: false,
      lower: true,
      upper: true,
      digit: true,
      symbol: true,
    });
  });
});
