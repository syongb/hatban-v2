import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createNotebookFileName,
  sanitizeFilePart,
  downloadNotebook,
  wrapCanvasText,
} from '../src/features/notebook/notebookExport.js';

test('안전하고 의미 있는 배움공책 파일명을 만든다', () => {
  assert.equal(
    createNotebookFileName({ date: '2026-09-15', period: 3, subject: '수학/심화:*' }),
    '2026-09-15_3교시_수학-심화_배움공책.png',
  );
  assert.equal(sanitizeFilePart('  국어 발표  '), '국어_발표');
});

test('명시적 줄바꿈을 유지하고 긴 문자열도 폭 안에서 나눈다', () => {
  const context = { measureText: (value) => ({ width: Array.from(value).length * 10 }) };

  assert.deepEqual(wrapCanvasText(context, '가나다라마바사\n\n아자차', 30), [
    '가나다',
    '라마바',
    '사',
    '',
    '아자차',
  ]);
});

test('이미지는 공유 없이 PNG로 다운로드한다', async () => {
  let clicked = false;
  const appended = [];
  const link = {
    click() {
      clicked = true;
    },
    remove() {},
  };
  const result = await downloadNotebook(
    { blob: { size: 10 }, fileName: '공책.png' },
    {
      FileClass: class {},
      navigatorObject: {},
      documentObject: {
        body: { append: (element) => appended.push(element) },
        createElement: () => link,
      },
      urlObject: {
        createObjectURL: () => 'blob:test',
        revokeObjectURL() {},
      },
    },
  );

  assert.equal(result.method, 'downloaded');
  assert.equal(clicked, true);
  assert.equal(link.download, '공책.png');
  assert.equal(appended.length, 1);
});
