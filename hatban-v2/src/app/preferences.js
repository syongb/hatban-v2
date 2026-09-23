export const HOME_THEMES = {
  coral: { label: '코랄', accent: '#ff776f', dark: '#d9524b', soft: '#ffebe1', ring: 'rgba(255, 119, 111, 0.3)' },
  sky: { label: '하늘', accent: '#5796e8', dark: '#2d6ebb', soft: '#e7f0ff', ring: 'rgba(87, 150, 232, 0.3)' },
  mint: { label: '민트', accent: '#48ad83', dark: '#287353', soft: '#e3f6ed', ring: 'rgba(72, 173, 131, 0.3)' },
  grape: { label: '보라', accent: '#8a6bd8', dark: '#6649b4', soft: '#eee9ff', ring: 'rgba(138, 107, 216, 0.3)' },
};

export const HOME_FONTS = {
  gowun: { label: '고운돋움', family: "'Gowun Dodum', system-ui, sans-serif" },
  jua: { label: '주아', family: "'Jua', system-ui, sans-serif" },
  serif: { label: '차분한 명조', family: "'Noto Serif KR', serif", google: 'Noto+Serif+KR:wght@400;700' },
  hand: { label: '나눔 손글씨', family: "'Nanum Pen Script', cursive", google: 'Nanum+Pen+Script' },
  cute: { label: '개구쟁이 글씨', family: "'Gaegu', cursive", google: 'Gaegu:wght@400;700' },
  round: { label: '동글동글', family: "'Dongle', sans-serif", google: 'Dongle:wght@400;700' },
  bold: { label: '힘찬 제목체', family: "'Black Han Sans', sans-serif", google: 'Black+Han+Sans' },
  sans: { label: '또렷한 고딕', family: "'Noto Sans KR', sans-serif", google: 'Noto+Sans+KR:wght@400;700' },
  system: { label: '기본 글꼴', family: 'system-ui, sans-serif' },
};

export function customTheme(color) {
  if (!/^#[0-9a-f]{6}$/i.test(color || '')) return null;
  const rgb = [1,3,5].map(i => parseInt(color.slice(i,i+2),16));
  const hex = values => '#' + values.map(v => Math.round(v).toString(16).padStart(2,'0')).join('');
  const luminance = rgb.map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((sum,v,i) => sum + v * [.2126,.7152,.0722][i],0);
  return { accent: color, dark: hex(rgb.map(v => v * .48)), soft: hex(rgb.map(v => v * .12 + 255 * .88)), ring: 'rgba(' + rgb.join(',') + ',.3)', ink: luminance > .179 ? '#172033' : '#ffffff' };
}

export function applyPreferences(preferences = {}) {
  const theme = customTheme(preferences.customColor) || HOME_THEMES[preferences.themeId] || HOME_THEMES.coral;
  const font = HOME_FONTS[preferences.fontId] || HOME_FONTS.gowun;
  if (font.google && !document.getElementById('font-' + preferences.fontId)) {
    const link = document.createElement('link'); link.id = 'font-' + preferences.fontId; link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=' + font.google + '&display=swap'; document.head.append(link);
  }
  const root = document.documentElement;
  root.style.setProperty('--accent-ink', theme.ink || customTheme(theme.accent).ink);
  root.style.setProperty('--theme-strong', theme.dark);
  root.style.setProperty('--coral', theme.accent);
  root.style.setProperty('--coral-dark', theme.dark);
  root.style.setProperty('--theme-soft', theme.soft);
  root.style.setProperty('--theme-ring', theme.ring);
  root.style.setProperty('--app-font', font.family);
  root.style.setProperty('--display-font', font.family);
}
