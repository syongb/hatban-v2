import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createNotebookHistory,
  filterNotebookHistory,
  getHistorySubjects,
} from '../src/features/notebook/notebookHistory.js';

const records = [
  { id: '2026-09-15:tue:3', date: '2026-09-15', dayId: 'tue', day: '화요일', period: 3, subject: '수학', text: '분수의 나눗셈을 배웠다.', drawing: 'data:image/png;base64,drawing' },
  { id: '2026-09-22:tue:1', date: '2026-09-22', dayId: 'tue', day: '화요일', period: 1, subject: '국어', text: '독서 토론 준비' },
  { id: '2026-09-15:tue:1', date: '2026-09-15', dayId: 'tue', period: 1, subject: '국어' },
  { id: 'broken', subject: '무시할 기록' },
];

test('기록을 최신 날짜순, 같은 날짜에서는 교시순으로 정리한다', () => {
  const history = createNotebookHistory(records);

  assert.deepEqual(history.map((entry) => entry.id), [
    '2026-09-22:tue:1',
    '2026-09-15:tue:1',
    '2026-09-15:tue:3',
  ]);
  assert.equal(history[1].day, '화요일');
  assert.equal(history[1].preview, '작성한 텍스트가 없어요.');
  assert.equal(history[2].hasDrawing, true);
});

test('요일과 실제 저장된 과목으로 기록을 필터링한다', () => {
  const history = createNotebookHistory(records);

  assert.deepEqual(getHistorySubjects(history), ['국어', '수학']);
  assert.deepEqual(
    filterNotebookHistory(history, { dayId: 'tue', subject: '수학' }).map((entry) => entry.id),
    ['2026-09-15:tue:3'],
  );
  assert.equal(filterNotebookHistory(history, { dayId: 'mon' }).length, 0);
});
