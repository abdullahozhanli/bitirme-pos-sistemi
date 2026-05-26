jest.mock('../src/constants/config', () => ({
  API_BASE_URL: 'http://test.local:5001',
}));

import { apiErrorMessage } from '../src/utils/apiErrorMessage';

describe('apiErrorMessage', () => {
  it('returns server message when present', () => {
    const err = { response: { status: 400, data: { message: 'E-posta kullanımda' } } };
    expect(apiErrorMessage(err, 'Hata')).toBe('E-posta kullanımda');
  });

  it('handles 404 with fixed text', () => {
    const err = { response: { status: 404 } };
    expect(apiErrorMessage(err, 'Hata')).toContain('henüz aktif değil');
  });

  it('handles network errors with API hint', () => {
    const err = { code: 'ERR_NETWORK', message: 'Network Error' };
    expect(apiErrorMessage(err, 'Hata')).toContain('Sunucuya ulaşılamıyor');
    expect(apiErrorMessage(err, 'Hata')).toContain('http://test.local:5001');
  });
});
