import assert from 'node:assert/strict';
import test from 'node:test';

import { HOME_STORAGE_KEY, calculateDday, createHomeStorage, parseHomeStore } from '../src/features/home/homeStorage.js';

function memoryStorage(initialValue = null) {
  let value = initialValue;
  let writes = 0;
  return {
    getItem: (key) => key === HOME_STORAGE_KEY ? value : null,
    setItem: (key, nextValue) => { if (key === HOME_STORAGE_KEY) value = nextValue; writes += 1; },
    snapshot: () => ({ value, writes }),
  };
}

test('손상된 홈 JSON은 기본값으로 열고 원본을 수정하지 않는다', () => {
  const storage = memoryStorage('{broken');
  const oldWarn = console.warn; console.warn = () => {};
  const parsed = parseHomeStore(storage.getItem(HOME_STORAGE_KEY));
  console.warn = oldWarn;
  assert.equal(parsed.version, 1);
  assert.equal(storage.snapshot().writes, 0);
});

test('프로필, 메모, 오늘 자기평가는 v2 홈 저장소에 함께 저장된다', () => {
  const memory = memoryStorage();
  const home = createHomeStorage(memory);
  home.updateProfile({ name: '햇반', emoji: '🌟' });
  const memo = home.createMemo('mint');
  home.updateMemo(memo.id, { text: '준비물 챙기기' });
  home.setRating('2026-09-16', 'focus', 3.5);
  const reloaded = createHomeStorage(memory).getState();
  assert.equal(reloaded.profile.name, '햇반');
  assert.equal(reloaded.memos[0].text, '준비물 챙기기');
  assert.equal(reloaded.ratings['2026-09-16'].focus, 3.5);
});

test('D-Day는 로컬 날짜 기준으로 미래, 오늘, 지난 날을 구분한다', () => {
  const today = new Date(2026, 8, 16, 23, 59);
  assert.deepEqual(calculateDday('2026-09-17', today), { days: 1, label: 'D-1' });
  assert.deepEqual(calculateDday('2026-09-16', today), { days: 0, label: 'D-Day' });
  assert.deepEqual(calculateDday('2026-09-15', today), { days: -1, label: 'D+1' });
});
