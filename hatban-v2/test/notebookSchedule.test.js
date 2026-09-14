import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createEntryId,
  getCurrentScheduleInfo,
  getDateForWeekday,
} from '../src/features/notebook/notebookSchedule.js';

test('선택한 요일을 같은 주의 실제 날짜로 바꾼다', () => {
  const tuesday = new Date(2026, 8, 15, 9, 0);

  assert.equal(getDateForWeekday('mon', tuesday), '2026-09-14');
  assert.equal(getDateForWeekday('fri', tuesday), '2026-09-18');
  assert.equal(createEntryId('tue', 3, tuesday), '2026-09-15:tue:3');
});

test('평일 수업 시간에 현재 요일과 교시를 찾는다', () => {
  const tuesdayThirdPeriod = new Date(2026, 8, 15, 10, 30);

  assert.deepEqual(getCurrentScheduleInfo(tuesdayThirdPeriod), {
    dayId: 'tue',
    period: 3,
  });
});

test('주말에는 현재 교시를 표시하지 않는다', () => {
  const sundayMorning = new Date(2026, 8, 20, 10, 30);

  assert.deepEqual(getCurrentScheduleInfo(sundayMorning), {
    dayId: null,
    period: null,
  });
});
