import { createDialog } from '../../utils/dialog.js';
import { HOME_FONTS, HOME_THEMES, applyPreferences } from '../../app/preferences.js';
import { calculateDday, createHomeStorage, getLocalDateKey } from './homeStorage.js';

const QUOTES = ['오늘의 작은 노력은 내일의 나를 더 단단하게 만들어요.', '모르는 것은 부끄러운 것이 아니라, 배움의 시작이에요.', '천천히 해도 괜찮아요. 멈추지 않고 가는 것이 중요해요.', '친구의 좋은 점을 찾아 말해 주는 하루를 만들어 봐요.', '한 줄의 기록이 오늘 배움을 오래 기억하게 해 줘요.', '실수는 새로운 방법을 알려 주는 친절한 힌트예요.'];
const RATINGS = [['focus', '집중했어요', '🎯'], ['effort', '끝까지 해 봤어요', '🌱'], ['kindness', '친절하게 함께했어요', '💛']];
const COLORS = ['yellow', 'mint', 'blue', 'lilac'];
const q = (root, selector) => root.querySelector(selector);
const setShown = (element, shown) => { const dialog = element.closest('dialog'); if (shown) dialog.showModal(); else dialog.close(); };
const dailyQuote = (key) => QUOTES[Number(key.replaceAll('-', '')) % QUOTES.length];

export function renderHomeView() {
  const storage = createHomeStorage();
  const today = getLocalDateKey();
  const root = document.createElement('section');
  root.className = 'screen screen--home home-dashboard';
  root.innerHTML = '<div class="home-hero"><div class="home-profile__avatar"></div><div><span class="eyebrow home-today"></span><h1 id="home-title"></h1><p>오늘의 배움을 차곡차곡 쌓아 볼까요?</p></div><button class="home-secondary-button" type="button" data-action="profile">프로필</button></div>'
    + '<form class="home-panel home-edit-panel" data-panel="profile" hidden><div><strong>나를 어떻게 부를까요?</strong><span>이 정보는 이 기기에만 저장돼요.</span></div><label>이름 <input name="profile-name" maxlength="30" autocomplete="nickname" placeholder="이름 또는 별명"></label><label>이모지 <input name="profile-emoji" maxlength="8" placeholder="🍚"></label><button class="home-primary-button" type="submit">프로필 저장</button></form>'
    + '<div class="home-dashboard-grid"><article class="home-panel home-panel--quote"><div class="home-panel__heading"><span class="home-panel__icon">💬</span><div><span class="card-label">오늘의 문구</span><h2>한마디 응원</h2></div><button class="home-icon-button" type="button" data-action="quote" aria-label="오늘의 문구 바꾸기">✏️</button></div><p class="home-quote-text"></p><form class="home-inline-form" data-panel="quote" hidden><label>오늘의 문구 <textarea name="quote-text" rows="3" maxlength="300"></textarea></label><div><button class="home-primary-button" type="submit">저장</button><button class="home-text-button" type="button" data-action="quote-cancel">취소</button></div></form></article><article class="home-panel home-panel--dday"><div class="home-panel__heading"><span class="home-panel__icon">📅</span><div><span class="card-label">D-Day</span><h2 class="home-dday-name">기다리는 날을 정해 보세요</h2></div><button class="home-icon-button" type="button" data-action="dday" aria-label="D-Day 설정">⚙️</button></div><p class="home-dday-count">아직 설정하지 않았어요.</p><form class="home-inline-form" data-panel="dday" hidden><label>이름 <input name="dday-name" maxlength="40" placeholder="예: 현장체험학습"></label><label>날짜 <input name="dday-date" type="date" required></label><div><button class="home-primary-button" type="submit">D-Day 저장</button><button class="home-text-button" type="button" data-action="dday-clear">초기화</button></div></form></article></div>'
    + '<article class="home-panel home-rating-panel"><div class="home-panel__heading"><span class="home-panel__icon">⭐</span><div><span class="card-label">오늘의 자기평가</span><h2>오늘 나는 어땠나요?</h2></div></div><p class="home-panel__hint">별을 한 번 누르면 0.5점, 한 번 더 누르면 1점 단위로 조절돼요.</p><div class="home-rating-list"></div></article>'
    + '<article class="home-panel home-memo-panel"><div class="home-panel__heading"><span class="home-panel__icon">🗒️</span><div><span class="card-label">개인 포스트잇 메모</span><h2>잊지 말아야 할 것</h2></div><button class="home-primary-button" type="button" data-action="memo-new">새 메모</button></div><p class="home-panel__hint">입력한 내용은 잠시 뒤 자동으로 저장돼요.</p><div class="home-memo-list" aria-live="polite"></div></article>'
    + '<article class="home-panel home-settings-panel"><div class="home-panel__heading"><span class="home-panel__icon">🎨</span><div><span class="card-label">내 화면 꾸미기</span><h2>테마와 글꼴</h2></div></div><div class="home-preference-group"><span>테마 색상</span><div class="home-theme-options" role="group" aria-label="테마 색상"></div></div><div class="home-preference-group"><span>글꼴</span><div class="home-font-options" role="group" aria-label="글꼴"></div></div></article>';
  const dialogs = [];
  for (const [panel, title] of [['profile','프로필 수정'],['quote','오늘의 문구 수정'],['dday','기다리는 날 설정']]) {
    const form = q(root, '[data-panel="' + panel + '"]'); form.hidden = false;
    form.classList.remove('home-panel');
    const dialog = createDialog(title, form); dialogs.push(dialog); root.append(dialog);
  }
  root.insertBefore(q(root,'.home-memo-panel'), q(root,'.home-dashboard-grid'));
  const colorLabel = document.createElement('label'); colorLabel.className = 'custom-color-control';
  colorLabel.innerHTML = '나만의 색상 <input type="color" aria-label="나만의 테마 색상"><output></output>';
  q(root,'.home-settings-panel').append(colorLabel);
  const picker = colorLabel.querySelector('input');
  picker.addEventListener('input', () => { applyPreferences(storage.setPreferences({customColor:picker.value})); renderPreferences(); });
  const pending = new Map();
  const timers = new Map();
  const state = () => storage.getState();
  q(root, '.home-today').textContent = new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' }).format(new Date());

  function renderProfile() {
    const profile = state().profile;
    q(root, '.home-profile__avatar').textContent = profile.emoji || '🍚';
    q(root, '#home-title').textContent = (new Date().getHours() < 12 ? '좋은 아침이에요' : '반가워요') + (profile.name ? ', ' + profile.name : '') + '!';
    q(root, '[name="profile-name"]').value = profile.name || '';
    q(root, '[name="profile-emoji"]').value = profile.emoji || '🍚';
  }
  function renderQuote() {
    const text = state().quoteOverrides[today] || dailyQuote(today);
    q(root, '.home-quote-text').textContent = text;
    q(root, '[name="quote-text"]').value = text;
  }
  function renderDday() {
    const dday = state().dday;
    const result = dday && calculateDday(dday.date);
    q(root, '.home-dday-name').textContent = dday?.name || '기다리는 날을 정해 보세요';
    q(root, '.home-dday-count').textContent = result ? result.label + ' · ' + dday.date.replaceAll('-', '. ') + '.' : '아직 설정하지 않았어요.';
    q(root, '[name="dday-name"]').value = dday?.name || '';
    q(root, '[name="dday-date"]').value = dday?.date || '';
  }
  function renderRatings() {
    const values = state().ratings[today] || {};
    const list = q(root, '.home-rating-list');
    list.replaceChildren(...RATINGS.map(([key, label, icon]) => {
      const value = Number(values[key] || 0);
      const row = document.createElement('div');
      row.className = 'home-rating-item';
      const caption = document.createElement('span');
      caption.className = 'home-rating-label'; caption.textContent = icon + ' ' + label;
      const stars = document.createElement('div');
      stars.className = 'home-stars'; stars.dataset.rating = key; stars.setAttribute('role', 'group'); stars.setAttribute('aria-label', label);
      for (let n = 1; n <= 5; n += 1) { const button = document.createElement('button'); button.type = 'button'; button.dataset.star = n; button.className = value >= n ? 'is-full' : value >= n - .5 ? 'is-half' : ''; button.textContent = '★'; button.setAttribute('aria-label', label + ' ' + n + '점 근처 선택'); stars.append(button); }
      const output = document.createElement('output'); output.textContent = value.toFixed(1) + ' / 5';
      row.append(caption, stars, output); return row;
    }));
  }
  function flushMemo(id) { window.clearTimeout(timers.get(id)); timers.delete(id); if (pending.has(id)) { storage.updateMemo(id, { text: pending.get(id) }); pending.delete(id); } }
  function renderMemos(focusId) {
    const list = q(root, '.home-memo-list'); const memos = state().memos;
    list.replaceChildren(...memos.map((memo) => {
      const card = document.createElement('article'); card.className = 'home-memo home-memo--' + (COLORS.includes(memo.color) ? memo.color : 'yellow'); card.dataset.memoId = memo.id;
      const toolbar = document.createElement('div'); toolbar.className = 'home-memo__toolbar';
      const title = document.createElement('span'); title.textContent = '메모';
      const colors = document.createElement('div'); colors.className = 'home-memo__colors'; colors.setAttribute('role', 'group'); colors.setAttribute('aria-label', '메모 색상');
      COLORS.forEach((color) => { const button = document.createElement('button'); button.type = 'button'; button.dataset.memoColor = color; button.className = memo.color === color ? 'is-selected' : ''; button.setAttribute('aria-label', color + ' 메모 색상'); colors.append(button); });
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'home-delete-button'; remove.dataset.action = 'memo-delete'; remove.textContent = '×'; remove.setAttribute('aria-label', '메모 삭제');
      const textarea = document.createElement('textarea'); textarea.dataset.memoText = ''; textarea.maxLength = 1000; textarea.placeholder = '짧게 적어 보세요.'; textarea.setAttribute('aria-label', '메모 내용'); textarea.value = pending.get(memo.id) ?? memo.text;
      toolbar.append(title, colors, remove); card.append(toolbar, textarea); return card;
    }));
    if (!memos.length) list.innerHTML = '<p class="home-empty-note">아직 메모가 없어요. 필요한 것을 짧게 적어 보세요.</p>';
    if (focusId) requestAnimationFrame(() => q(list, '[data-memo-id="' + focusId + '"] textarea')?.focus());
  }
  function renderPreferences() {
    const preferences = state().preferences;
    picker.value = preferences.customColor || (HOME_THEMES[preferences.themeId] || HOME_THEMES.coral).accent;
    colorLabel.querySelector('output').textContent = 'RGB ' + [1,3,5].map(i => parseInt(picker.value.slice(i,i+2),16)).join(' · ');
    const themes = q(root, '.home-theme-options'); const fonts = q(root, '.home-font-options');
    themes.replaceChildren(...Object.entries(HOME_THEMES).map(([id, theme]) => { const button = document.createElement('button'); button.type = 'button'; button.dataset.theme = id; button.className = 'home-theme-swatch' + (!preferences.customColor && preferences.themeId === id ? ' is-selected' : ''); button.style.setProperty('--swatch', theme.accent); button.textContent = theme.label; return button; }));
    fonts.replaceChildren(...Object.entries(HOME_FONTS).map(([id, font]) => { const button = document.createElement('button'); button.type = 'button'; button.dataset.font = id; button.className = 'home-font-option' + (preferences.fontId === id ? ' is-selected' : ''); button.style.fontFamily = font.family; button.textContent = font.label; return button; }));
  }
  function render() { renderProfile(); renderQuote(); renderDday(); renderRatings(); renderMemos(); renderPreferences(); }
  root.addEventListener('click', (event) => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'profile') setShown(q(root, '[data-panel="profile"]'), true);
    if (action === 'quote') setShown(q(root, '[data-panel="quote"]'), true);
    if (action === 'quote-cancel') setShown(q(root, '[data-panel="quote"]'), false);
    if (action === 'dday') setShown(q(root, '[data-panel="dday"]'), true);
    if (action === 'dday-clear') { storage.clearDday(); renderDday(); setShown(q(root, '[data-panel="dday"]'), false); }
    if (action === 'memo-new') renderMemos(storage.createMemo().id);
    if (action === 'memo-delete') { const id = event.target.closest('[data-memo-id]')?.dataset.memoId; if (id && window.confirm('이 메모를 지울까요?')) { pending.delete(id); storage.deleteMemo(id); renderMemos(); } }
    const color = event.target.closest('[data-memo-color]'); if (color) { const id = color.closest('[data-memo-id]').dataset.memoId; flushMemo(id); storage.updateMemo(id, { color: color.dataset.memoColor }); renderMemos(); }
    const star = event.target.closest('[data-star]'); if (star) { const key = star.parentElement.dataset.rating; const current = Number((state().ratings[today] || {})[key] || 0); const n = Number(star.dataset.star); storage.setRating(today, key, current === n - .5 ? n : n - .5); renderRatings(); }
    const theme = event.target.closest('[data-theme]'); if (theme) { applyPreferences(storage.setPreferences({ themeId: theme.dataset.theme, customColor: null })); renderPreferences(); }
    const font = event.target.closest('[data-font]'); if (font) { applyPreferences(storage.setPreferences({ fontId: font.dataset.font })); renderPreferences(); }
  });
  root.addEventListener('input', (event) => { const area = event.target.closest('[data-memo-text]'); if (!area) return; const id = area.closest('[data-memo-id]').dataset.memoId; pending.set(id, area.value); window.clearTimeout(timers.get(id)); timers.set(id, window.setTimeout(() => flushMemo(id), 700)); });
  root.addEventListener('submit', (event) => { event.preventDefault(); if (event.target.matches('[data-panel="profile"]')) { storage.updateProfile({ name: q(root, '[name="profile-name"]').value, emoji: q(root, '[name="profile-emoji"]').value }); renderProfile(); setShown(event.target, false); } if (event.target.matches('[data-panel="quote"]')) { storage.setQuote(today, q(root, '[name="quote-text"]').value); renderQuote(); setShown(event.target, false); } if (event.target.matches('[data-panel="dday"]')) { storage.setDday({ name: q(root, '[name="dday-name"]').value, date: q(root, '[name="dday-date"]').value }); renderDday(); setShown(event.target, false); } });
  render();
  return { element: root, destroy() { dialogs.forEach(dialog => dialog.close()); [...pending.keys()].forEach(flushMemo); timers.forEach((timer) => window.clearTimeout(timer)); } };
}
