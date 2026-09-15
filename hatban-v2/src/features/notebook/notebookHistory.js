const DAY_LABELS = {
  mon: '월요일',
  tue: '화요일',
  wed: '수요일',
  thu: '목요일',
  fri: '금요일',
};

const DAY_IDS = Object.keys(DAY_LABELS);
const ENTRY_ID_PATTERN = /^(\d{4}-\d{2}-\d{2}):(mon|tue|wed|thu|fri):(\d+)$/;
const PREVIEW_LENGTH = 88;

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readEntryId(id) {
  const match = typeof id === 'string' ? id.match(ENTRY_ID_PATTERN) : null;
  if (!match) return null;
  return { date: match[1], dayId: match[2], period: Number(match[3]) };
}

export function createNotebookPreview(text) {
  const compactText = typeof text === 'string' ? text.replace(/\s+/g, ' ').trim() : '';
  if (!compactText) return '작성한 텍스트가 없어요.';
  return compactText.length > PREVIEW_LENGTH ? `${compactText.slice(0, PREVIEW_LENGTH)}…` : compactText;
}

export function normalizeNotebookHistoryEntry(entry, fallbackId = '') {
  if (!isRecord(entry)) return null;
  const id = typeof entry.id === 'string' ? entry.id : fallbackId;
  const parsedId = readEntryId(id);
  const dayId = DAY_IDS.includes(entry.dayId) ? entry.dayId : parsedId?.dayId ?? null;
  const date = typeof entry.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(entry.date)
    ? entry.date
    : parsedId?.date ?? null;
  const period = Number.isInteger(entry.period) && entry.period > 0 ? entry.period : parsedId?.period ?? null;

  if (!id || !date || !period) return null;

  return {
    id,
    date,
    dayId,
    day: typeof entry.day === 'string' && entry.day.trim() ? entry.day.trim() : DAY_LABELS[dayId] || '요일 정보 없음',
    period,
    subject: typeof entry.subject === 'string' && entry.subject.trim() ? entry.subject.trim() : '과목 정보 없음',
    text: typeof entry.text === 'string' ? entry.text : '',
    drawing: typeof entry.drawing === 'string' && entry.drawing ? entry.drawing : null,
    preview: createNotebookPreview(entry.text),
    hasDrawing: typeof entry.drawing === 'string' && entry.drawing.length > 0,
  };
}

export function sortNotebookHistory(entries) {
  return [...entries].sort((left, right) => {
    const dateOrder = right.date.localeCompare(left.date);
    if (dateOrder !== 0) return dateOrder;
    return left.period - right.period;
  });
}

export function getHistorySubjects(entries) {
  return [...new Set(entries.map((entry) => entry.subject).filter((subject) => subject !== '과목 정보 없음'))].sort(
    (left, right) => left.localeCompare(right, 'ko'),
  );
}

export function filterNotebookHistory(entries, { dayId = 'all', subject = 'all' } = {}) {
  return entries.filter((entry) => {
    const matchesDay = dayId === 'all' || entry.dayId === dayId;
    const matchesSubject = subject === 'all' || entry.subject === subject;
    return matchesDay && matchesSubject;
  });
}

export function createNotebookHistory(entries) {
  return sortNotebookHistory(
    entries
      .map((entry) => normalizeNotebookHistoryEntry(entry, entry?.id))
      .filter(Boolean),
  );
}
