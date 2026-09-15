import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createNotebookFileName,
  sanitizeFilePart,
  shareOrDownloadNotebook,
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

test('파일 공유를 지원하면 Web Share API를 사용한다', async () => {
  let sharedPayload = null;
  class MockFile {
    constructor(parts, name, options) {
      Object.assign(this, { parts, name, type: options.type });
    }
  }
  const result = await shareOrDownloadNotebook(
    { blob: { size: 10 }, fileName: '공책.png' },
    {
      FileClass: MockFile,
      navigatorObject: {
        canShare: ({ files }) => files[0].type === 'image/png',
        share: async (payload) => {
          sharedPayload = payload;
        },
      },
    },
  );

  assert.equal(result.method, 'shared');
  assert.equal(sharedPayload.files[0].name, '공책.png');
});

test('사용자가 공유를 취소하면 다운로드하지 않는다', async () => {
  const abortError = new Error('cancelled');
  abortError.name = 'AbortError';
  const result = await shareOrDownloadNotebook(
    { blob: { size: 10 }, fileName: '공책.png' },
    {
      FileClass: class {},
      navigatorObject: {
        canShare: () => true,
        share: async () => {
          throw abortError;
        },
      },
    },
  );

  assert.equal(result.method, 'cancelled');
});

test('파일 공유 미지원 환경에서는 PNG를 다운로드한다', async () => {
  let clicked = false;
  const appended = [];
  const link = {
    click() {
      clicked = true;
    },
    remove() {},
  };
  const result = await shareOrDownloadNotebook(
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
