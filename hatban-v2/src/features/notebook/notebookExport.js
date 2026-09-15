const EXPORT_WIDTH = 1600;
const HORIZONTAL_PADDING = 112;
const CONTENT_WIDTH = EXPORT_WIDTH - HORIZONTAL_PADDING * 2;
const TEXT_FONT_SIZE = 34;
const TEXT_LINE_HEIGHT = 54;
const SECTION_GAP = 58;
const DRAWING_MAX_HEIGHT = 980;

export function sanitizeFilePart(value) {
  return String(value ?? '')
    .normalize('NFC')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/\s+/g, '_')
    .replace(/[._-]+$/g, '')
    .replace(/^[._-]+/g, '')
    .slice(0, 80) || '공책';
}

export function createNotebookFileName({ date, period, subject }) {
  const safeDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : sanitizeFilePart(date);
  return `${safeDate}_${sanitizeFilePart(`${period}교시`)}_${sanitizeFilePart(subject)}_배움공책.png`;
}

export function wrapCanvasText(context, text, maxWidth) {
  const paragraphs = String(text ?? '').replace(/\r\n?/g, '\n').split('\n');
  const lines = [];

  for (const paragraph of paragraphs) {
    if (paragraph === '') {
      lines.push('');
      continue;
    }

    let line = '';
    for (const character of Array.from(paragraph)) {
      const candidate = line + character;
      if (line && context.measureText(candidate).width > maxWidth) {
        lines.push(line);
        line = character;
      } else {
        line = candidate;
      }
    }
    lines.push(line);
  }

  return lines;
}

function loadImage(dataUrl, ImageClass) {
  if (!dataUrl) return Promise.resolve(null);

  return new Promise((resolve, reject) => {
    const image = new ImageClass();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('저장된 그림을 이미지로 불러오지 못했습니다.'));
    image.src = dataUrl;
  });
}

function findVisibleDrawingBounds(image, documentObject) {
  const scanCanvas = documentObject.createElement('canvas');
  scanCanvas.width = image.naturalWidth || image.width;
  scanCanvas.height = image.naturalHeight || image.height;
  const scanContext = scanCanvas.getContext('2d', { willReadFrequently: true });
  scanContext.drawImage(image, 0, 0);
  const { data } = scanContext.getImageData(0, 0, scanCanvas.width, scanCanvas.height);
  let left = scanCanvas.width;
  let top = scanCanvas.height;
  let right = -1;
  let bottom = -1;

  for (let y = 0; y < scanCanvas.height; y += 1) {
    for (let x = 0; x < scanCanvas.width; x += 1) {
      if (data[(y * scanCanvas.width + x) * 4 + 3] === 0) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }

  if (right < left || bottom < top) return null;
  const margin = Math.max(12, Math.round(Math.min(scanCanvas.width, scanCanvas.height) * 0.025));
  left = Math.max(0, left - margin);
  top = Math.max(0, top - margin);
  right = Math.min(scanCanvas.width - 1, right + margin);
  bottom = Math.min(scanCanvas.height - 1, bottom + margin);
  return { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
}

function formatExportDate(dateString, dayLabel) {
  const [year, month, day] = dateString.split('-').map(Number);
  return `${year}. ${month}. ${day}. ${dayLabel}`;
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('PNG 파일을 만들지 못했습니다.'));
    }, 'image/png');
  });
}

export async function createNotebookPng(
  { date, day, period, subject, text, drawing },
  {
    documentObject = globalThis.document,
    ImageClass = globalThis.Image,
  } = {},
) {
  const outputCanvas = documentObject.createElement('canvas');
  const measureContext = outputCanvas.getContext('2d');
  measureContext.font = `400 ${TEXT_FONT_SIZE}px "Pretendard", "Noto Sans KR", sans-serif`;
  const textLines = text ? wrapCanvasText(measureContext, text, CONTENT_WIDTH) : [];
  const drawingImage = await loadImage(drawing, ImageClass);
  const drawingBounds = drawingImage ? findVisibleDrawingBounds(drawingImage, documentObject) : null;
  const drawingScale = drawingBounds
    ? Math.min(CONTENT_WIDTH / drawingBounds.width, DRAWING_MAX_HEIGHT / drawingBounds.height, 1.5)
    : 0;
  const drawingWidth = drawingBounds ? Math.round(drawingBounds.width * drawingScale) : 0;
  const drawingHeight = drawingBounds ? Math.round(drawingBounds.height * drawingScale) : 0;
  const headerHeight = 280;
  const textHeight = textLines.length ? textLines.length * TEXT_LINE_HEIGHT + SECTION_GAP : 0;
  const drawingSectionHeight = drawingHeight ? drawingHeight + SECTION_GAP : 0;

  outputCanvas.width = EXPORT_WIDTH;
  outputCanvas.height = headerHeight + textHeight + drawingSectionHeight + HORIZONTAL_PADDING;
  const context = outputCanvas.getContext('2d');

  context.fillStyle = '#fffdf7';
  context.fillRect(0, 0, outputCanvas.width, outputCanvas.height);
  context.fillStyle = '#172033';
  context.font = '700 58px "Pretendard", "Noto Sans KR", sans-serif';
  context.fillText('배움공책', HORIZONTAL_PADDING, 105);
  context.fillStyle = '#586174';
  context.font = '400 30px "Pretendard", "Noto Sans KR", sans-serif';
  context.fillText(formatExportDate(date, day), HORIZONTAL_PADDING, 165);
  context.fillStyle = '#1f3c88';
  context.font = '700 34px "Pretendard", "Noto Sans KR", sans-serif';
  context.fillText(`${period}교시 · ${subject}`, HORIZONTAL_PADDING, 222);
  context.strokeStyle = '#d8deea';
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(HORIZONTAL_PADDING, 260);
  context.lineTo(EXPORT_WIDTH - HORIZONTAL_PADDING, 260);
  context.stroke();

  let y = headerHeight;
  if (textLines.length) {
    context.fillStyle = '#1f2937';
    context.font = `400 ${TEXT_FONT_SIZE}px "Pretendard", "Noto Sans KR", sans-serif`;
    context.textBaseline = 'top';
    for (const line of textLines) {
      context.fillText(line, HORIZONTAL_PADDING, y);
      y += TEXT_LINE_HEIGHT;
    }
    y += 24;
    if (drawingHeight) {
      context.strokeStyle = '#d8deea';
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(HORIZONTAL_PADDING, y);
      context.lineTo(EXPORT_WIDTH - HORIZONTAL_PADDING, y);
      context.stroke();
      y += 34;
    }
  }

  if (drawingBounds) {
    const drawingX = HORIZONTAL_PADDING + Math.round((CONTENT_WIDTH - drawingWidth) / 2);
    context.drawImage(
      drawingImage,
      drawingBounds.x,
      drawingBounds.y,
      drawingBounds.width,
      drawingBounds.height,
      drawingX,
      y,
      drawingWidth,
      drawingHeight,
    );
  }

  return {
    blob: await canvasToBlob(outputCanvas),
    fileName: createNotebookFileName({ date, period, subject }),
    height: outputCanvas.height,
    width: outputCanvas.width,
  };
}

function downloadBlob(blob, fileName, documentObject, urlObject) {
  const downloadUrl = urlObject.createObjectURL(blob);
  const link = documentObject.createElement('a');
  link.href = downloadUrl;
  link.download = fileName;
  link.hidden = true;
  documentObject.body.append(link);
  link.click();
  link.remove();
  globalThis.setTimeout(() => urlObject.revokeObjectURL(downloadUrl), 0);
}

export async function shareOrDownloadNotebook(
  { blob, fileName },
  {
    navigatorObject = globalThis.navigator,
    documentObject = globalThis.document,
    urlObject = globalThis.URL,
    FileClass = globalThis.File,
  } = {},
) {
  const file = new FileClass([blob], fileName, { type: 'image/png' });
  let canShareFile = false;

  if (typeof navigatorObject.share === 'function' && typeof navigatorObject.canShare === 'function') {
    try {
      canShareFile = navigatorObject.canShare({ files: [file] });
    } catch (error) {
      console.warn('[햇반이네] 이 브라우저는 PNG 파일 공유 여부를 확인하지 못했습니다.', error);
    }
  }

  if (canShareFile) {
    try {
      await navigatorObject.share({ files: [file], title: '배움공책' });
      return { method: 'shared' };
    } catch (error) {
      if (error?.name === 'AbortError') return { method: 'cancelled' };
      console.warn('[햇반이네] 시스템 공유에 실패해 PNG 다운로드로 전환합니다.', error);
    }
  }

  downloadBlob(blob, fileName, documentObject, urlObject);
  return { method: 'downloaded' };
}
