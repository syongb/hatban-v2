import assert from 'node:assert/strict';
import test from 'node:test';

import {
  NOTEBOOK_STORAGE_KEY,
  createNotebookStorage,
  parseNotebookStore,
} from '../src/features/notebook/notebookStorage.js';

function createMemoryStorage(initialValue = null) {
  let value = initialValue;
  let writes = 0;
  let removals = 0;

  return {
    getItem(key) {
      return key === NOTEBOOK_STORAGE_KEY ? value : null;
    },
    setItem(key, nextValue) {
      if (key === NOTEBOOK_STORAGE_KEY) value = nextValue;
      writes += 1;
    },
    removeItem() {
      removals += 1;
    },
    snapshot() {
      return { value, writes, removals };
    },
  };
}

function withoutWarnings(run) {
  const originalWarn = console.warn;
  console.warn = () => {};
  try {
    return run();
  } finally {
    console.warn = originalWarn;
  }
}

test('손상된 JSON은 기본 저장소로 읽고 원본을 수정하지 않는다', () => {
  const memoryStorage = createMemoryStorage('{broken json');
  const repository = withoutWarnings(() => createNotebookStorage(memoryStorage));

  assert.equal(repository.getEntry('missing'), null);
  assert.deepEqual(memoryStorage.snapshot(), {
    value: '{broken json',
    writes: 0,
    removals: 0,
  });
});

test('지원하지 않는 구조는 기본값을 사용한다', () => {
  const parsed = withoutWarnings(() => parseNotebookStore('{"version":99,"entries":[]}'));
  assert.deepEqual(parsed, { version: 1, entries: {} });
});

test('서로 다른 공책의 텍스트를 독립적으로 저장하고 복원한다', () => {
  const memoryStorage = createMemoryStorage();
  const repository = createNotebookStorage(memoryStorage);

  repository.saveEntry({ id: '2026-09-14:mon:1', subject: '수학', text: 'A' });
  repository.saveEntry({ id: '2026-09-14:mon:2', subject: '국어', text: 'B' });

  const reloaded = createNotebookStorage(memoryStorage);
  assert.equal(reloaded.getEntry('2026-09-14:mon:1').text, 'A');
  assert.equal(reloaded.getEntry('2026-09-14:mon:2').text, 'B');
  assert.equal(memoryStorage.snapshot().writes, 2);
});

test('전체 기록을 안전하게 읽고 id가 누락된 항목은 저장 키를 사용한다', () => {
  const memoryStorage = createMemoryStorage(
    JSON.stringify({
      version: 1,
      entries: {
        '2026-09-15:tue:3': { subject: '수학', text: '분수' },
        broken: 'not an entry',
      },
    }),
  );
  const repository = createNotebookStorage(memoryStorage);

  assert.deepEqual(repository.getAllEntries(), [
    { id: '2026-09-15:tue:3', subject: '수학', text: '분수' },
  ]);
});

test('그림 용량 저장이 실패하면 이전 그림을 유지하고 텍스트를 저장한다', () => {
  let value = null;
  const limitedStorage = {
    getItem() {
      return value;
    },
    setItem(key, nextValue) {
      if (nextValue.length > 500) {
        const error = new Error('quota exceeded');
        error.name = 'QuotaExceededError';
        throw error;
      }
      value = nextValue;
    },
  };
  const repository = createNotebookStorage(limitedStorage);
  const id = '2026-09-15:tue:3';
  repository.saveEntry({ id, text: '이전 글', drawing: 'data:image/png;base64,old' });

  const result = repository.saveEntryWithDrawingFallback(
    { id, text: '새 글', drawing: `data:image/png;base64,${'a'.repeat(1000)}` },
    'data:image/png;base64,old',
  );

  assert.equal(result.drawingSaved, false);
  assert.equal(result.drawingError.name, 'QuotaExceededError');
  assert.equal(repository.getEntry(id).text, '새 글');
  assert.equal(repository.getEntry(id).drawing, 'data:image/png;base64,old');
});
