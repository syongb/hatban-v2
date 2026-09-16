import assert from 'node:assert/strict';
import test from 'node:test';

import { appendCalculatorInput, evaluateExpression } from '../src/features/tools/calculator.js';
import { formatCountdown, formatStopwatch } from '../src/features/tools/timekeepers.js';

test('계산기는 사칙연산과 소수 계산을 안전하게 처리한다', () => {
  assert.equal(evaluateExpression('2+3×4'), '14');
  assert.equal(evaluateExpression('10÷4'), '2.5');
  assert.equal(evaluateExpression('5.5-1.2'), '4.3');
});

test('계산기는 0 나누기와 잘못된 입력을 오류로 처리한다', () => {
  assert.throws(() => evaluateExpression('1÷0'), /0으로/);
  assert.throws(() => evaluateExpression('1++2'));
  assert.equal(appendCalculatorInput('2+', '×'), '2×');
});

test('시간 표시는 실제 밀리초 값을 수업용 형식으로 바꾼다', () => {
  assert.equal(formatCountdown(61000), '01:01');
  assert.equal(formatCountdown(1), '00:01');
  assert.equal(formatStopwatch(61540), '01:01.5');
});
