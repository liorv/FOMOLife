import { viewport } from '../layout';
import manifest from '../manifest';

describe('mobile system navigation', () => {
  it('uses a black mobile browser theme and preserves the desktop theme', () => {
    expect(viewport.themeColor).toEqual([
      { media: '(max-width: 900px)', color: '#000000' },
      { media: '(min-width: 901px)', color: '#d32998' },
    ]);
  });

  it('exposes the safe area so the bottom navbar can sit above native controls', () => {
    expect(viewport.viewportFit).toBe('cover');
  });

  it('uses a black system navigation theme when installed', () => {
    expect(manifest().theme_color).toBe('#000000');
  });

  it('uses a black installed-app launch background', () => {
    expect(manifest().background_color).toBe('#000000');
  });
});
