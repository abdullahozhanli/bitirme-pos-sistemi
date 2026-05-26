jest.mock('../src/constants/config', () => ({
  API_BASE_URL: 'http://test.local:5001',
}));

import { resolveMediaUrl } from '../src/utils/resolveMediaUrl';

describe('resolveMediaUrl', () => {
  it('returns empty for blank input', () => {
    expect(resolveMediaUrl('')).toBe('');
    expect(resolveMediaUrl(null)).toBe('');
  });

  it('keeps absolute http(s) and data URLs', () => {
    expect(resolveMediaUrl('https://cdn.example/x.png')).toBe('https://cdn.example/x.png');
    expect(resolveMediaUrl('data:image/png;base64,abc')).toBe('data:image/png;base64,abc');
  });

  it('prefixes relative upload paths with API base', () => {
    expect(resolveMediaUrl('/uploads/avatar.jpg')).toBe(
      'http://test.local:5001/uploads/avatar.jpg'
    );
    expect(resolveMediaUrl('uploads/avatar.jpg')).toBe(
      'http://test.local:5001/uploads/avatar.jpg'
    );
  });

  it('rebases upload URLs to current API host (localhost → env IP)', () => {
    expect(resolveMediaUrl('http://localhost:5001/uploads/avatars/u1.jpg')).toBe(
      'http://test.local:5001/uploads/avatars/u1.jpg'
    );
  });
});
