export const GAME_RECORDS_KEY = 'hatban_v2_game_records';
export function createGameRecords(storage = window.localStorage) {
  let records = [];
  try { const saved = JSON.parse(storage.getItem(GAME_RECORDS_KEY) || '[]'); records = Array.isArray(saved) ? saved : []; } catch { console.warn('[햇반이네] 게임 기록을 읽지 못했습니다.'); }
  return {
    add(gameType, score, record = {}) { const entry = { gameType, score, record, createdAt: new Date().toISOString() }; records = [...records, entry].slice(-100); storage.setItem(GAME_RECORDS_KEY, JSON.stringify(records)); return entry; },
    best(gameType, compare = (a, b) => b.score - a.score) { return records.filter((item) => item.gameType === gameType).sort(compare)[0] || null; },
  };
}
