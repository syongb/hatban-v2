export const HOME_THEMES = {
  coral: { label: '코랄', accent: '#ff776f', dark: '#d9524b', soft: '#ffebe1', ring: 'rgba(255, 119, 111, 0.3)' },
  sky: { label: '하늘', accent: '#5796e8', dark: '#2d6ebb', soft: '#e7f0ff', ring: 'rgba(87, 150, 232, 0.3)' },
  mint: { label: '민트', accent: '#48ad83', dark: '#287353', soft: '#e3f6ed', ring: 'rgba(72, 173, 131, 0.3)' },
  grape: { label: '보라', accent: '#8a6bd8', dark: '#6649b4', soft: '#eee9ff', ring: 'rgba(138, 107, 216, 0.3)' },
};

export const HOME_FONTS = {
  gowun: { label: '고운돋움', family: "'Gowun Dodum', system-ui, sans-serif" },
  jua: { label: '주아', family: "'Jua', system-ui, sans-serif" },
  system: { label: '기본 글꼴', family: 'system-ui, sans-serif' },
};

export function applyPreferences(preferences = {}) {
  const theme = HOME_THEMES[preferences.themeId] || HOME_THEMES.coral;
  const font = HOME_FONTS[preferences.fontId] || HOME_FONTS.gowun;
  const root = document.documentElement;
  root.style.setProperty('--coral', theme.accent);
  root.style.setProperty('--coral-dark', theme.dark);
  root.style.setProperty('--theme-soft', theme.soft);
  root.style.setProperty('--theme-ring', theme.ring);
  root.style.setProperty('--app-font', font.family);
  root.style.setProperty('--display-font', font.family);
}
