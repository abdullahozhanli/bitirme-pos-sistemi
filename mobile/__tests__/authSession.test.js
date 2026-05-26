import { isUnauthorizedError } from '../src/api/authSession';

describe('isUnauthorizedError', () => {
  it('detects HTTP 401/403', () => {
    expect(isUnauthorizedError({ response: { status: 401 } })).toBe(true);
    expect(isUnauthorizedError({ response: { status: 403 } })).toBe(true);
  });

  it('detects Turkish token messages', () => {
    expect(
      isUnauthorizedError({
        response: { data: { message: 'Yetkisiz: geçersiz veya süresi dolmuş token' } },
      })
    ).toBe(true);
  });
});
