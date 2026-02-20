const { assetUrl, resolveAsset } = require('./assetResolver');

test('assetUrl returns .default when present', () => {
  expect(assetUrl({ default: '/img/foo.png' })).toBe('/img/foo.png');
  expect(assetUrl('/straight.png')).toBe('/straight.png');
});

test('resolveAsset handles strings and common object shapes', () => {
  expect(resolveAsset('/a/b.jpg')).toBe('/a/b.jpg');
  expect(resolveAsset({ default: '/d.png' })).toBe('/d.png');
  expect(resolveAsset({ url: '/u.webp' })).toBe('/u.webp');
  expect(resolveAsset({ src: '/s.svg' })).toBe('/s.svg');
});

test('resolveAsset finds image-like values in arbitrary objects or arrays', () => {
  expect(resolveAsset({ some: 1, other: 'logo_fomo.hash.png' })).toBe('logo_fomo.hash.png');
  expect(resolveAsset(['first.png', 'second.jpg'])).toBe('first.png');
});

test('resolveAsset returns empty string for falsy values', () => {
  expect(resolveAsset(null)).toBe('');
  expect(resolveAsset(undefined)).toBe('');
});
