export const HOME_STORAGE_KEY = 'hatban_v2_home';
export const HOME_SCHEMA_VERSION = 1;

const DEFAULT_PROFILE = { name: '', emoji: '🍚' };
const DEFAULT_PREFERENCES = { themeId: 'coral', fontId: 'gowun' };

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function createEmptyStore() {
  return {
    version: HOME_SCHEMA_VERSION,
    profile: { ...DEFAULT_PROFILE },
    quoteOverrides: {},
    dday: null,
    memos: [],
    ratings: {},
    preferences: { ...DEFAULT_PREFERENCES },
  };
}

function cleanString(value, fallback = '') {
  return typeof value === 'string' ? value.trim().slice(0, 500) : fallback;
}

function normalizeStore(parsed) {
  if (!isRecord(parsed) || parsed.version !== HOME_SCHEMA_VERSION) return null;
  const empty = createEmptyStore();
  return {
    ...empty,
    profile: isRecord(parsed.profile)
      ? { name: cleanString(parsed.profile.name, ''), emoji: cleanString(parsed.profile.emoji, '🍚') || '🍚' }
      : empty.profile,
    quoteOverrides: isRecord(parsed.quoteOverrides) ? { ...parsed.quoteOverrides } : {},
    dday: isRecord(parsed.dday) && typeof parsed.dday.date === 'string'
      ? { name: cleanString(parsed.dday.name, '기다리는 날') || '기다리는 날', date: parsed.dday.date }
      : null,
    memos: Array.isArray(parsed.memos) ? parsed.memos.filter(isRecord).map((memo) => ({
      id: typeof memo.id === 'string' ? memo.id : '',
      text: typeof memo.text === 'string' ? memo.text.slice(0, 1000) : '',
      color: typeof memo.color === 'string' ? memo.color : 'yellow',
      updatedAt: typeof memo.updatedAt === 'string' ? memo.updatedAt : null,
    })).filter((memo) => memo.id) : [],
    ratings: isRecord(parsed.ratings) ? { ...parsed.ratings } : {},
    preferences: isRecord(parsed.preferences)
      ? { themeId: cleanString(parsed.preferences.themeId, 'coral') || 'coral', fontId: cleanString(parsed.preferences.fontId, 'gowun') || 'gowun' }
      : empty.preferences,
  };
}

export function parseHomeStore(rawValue) {
  if (rawValue === null) return createEmptyStore();
  try {
    const store = normalizeStore(JSON.parse(rawValue));
    if (store) return store;
    console.warn(`[햇반이네] ${HOME_STORAGE_KEY}의 형식이 올바르지 않아 기본값으로 엽니다.`);
  } catch (error) {
    console.warn(`[햇반이네] ${HOME_STORAGE_KEY}을 읽지 못해 기본값으로 엽니다.`, error);
  }
  return createEmptyStore();
}

export function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function createMemoId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `memo-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function calculateDday(targetDate, today = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate || '')) return null;
  const [year, month, day] = targetDate.split('-').map(Number);
  const target = new Date(year, month - 1, day);
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const days = Math.round((target - current) / 86400000);
  return { days, label: days === 0 ? 'D-Day' : days > 0 ? `D-${days}` : `D+${Math.abs(days)}` };
}

export function createHomeStorage(storage = window.localStorage) {
  let store = parseHomeStore(storage.getItem(HOME_STORAGE_KEY));
  const persist = () => {
    storage.setItem(HOME_STORAGE_KEY, JSON.stringify(store));
  };
  const update = (patch) => {
    store = { ...store, ...patch, version: HOME_SCHEMA_VERSION };
    persist();
    return store;
  };

  return {
    getState: () => structuredClone(store),
    getPreferences: () => ({ ...store.preferences }),
    updateProfile(profile) {
      return update({ profile: { ...store.profile, ...profile } }).profile;
    },
    setQuote(dateKey, text) {
      return update({ quoteOverrides: { ...store.quoteOverrides, [dateKey]: cleanString(text) } }).quoteOverrides[dateKey];
    },
    setDday(dday) {
      return update({ dday: { name: cleanString(dday.name, '기다리는 날') || '기다리는 날', date: dday.date } }).dday;
    },
    clearDday() { return update({ dday: null }).dday; },
    createMemo(color = 'yellow') {
      const memo = { id: createMemoId(), text: '', color, updatedAt: new Date().toISOString() };
      update({ memos: [...store.memos, memo] });
      return { ...memo };
    },
    updateMemo(id, patch) {
      const updatedAt = new Date().toISOString();
      update({ memos: store.memos.map((memo) => memo.id === id ? { ...memo, ...patch, updatedAt } : memo) });
    },
    deleteMemo(id) { update({ memos: store.memos.filter((memo) => memo.id !== id) }); },
    setRating(dateKey, category, value) {
      const rating = { ...(isRecord(store.ratings[dateKey]) ? store.ratings[dateKey] : {}), [category]: value };
      return update({ ratings: { ...store.ratings, [dateKey]: rating } }).ratings[dateKey];
    },
    setPreferences(preferences) {
      return update({ preferences: { ...store.preferences, ...preferences } }).preferences;
    },
  };
}
