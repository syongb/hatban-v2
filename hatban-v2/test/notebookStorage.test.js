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
