import { WEEKDAYS } from './notebookSchedule.js';
export const SCHEDULE_KEY = 'hatban_v2_schedule';
export function normalizeSchedule(saved) {
  const source=saved?.days||saved;
  const savedTimes=saved?.times;
  return WEEKDAYS.map(day => ({ ...day, subjects: Array.from({length:6}, (_,i) => {
    const raw=source?.[day.id];const value = Array.isArray(raw)?raw[i]:raw?.subjects?.[i];
    return value === null || typeof value === 'string' ? (value?.trim().slice(0,30) || null) : day.subjects[i];
  }),times:Array.from({length:6},(_,i)=>{const time=savedTimes?.[i]||source?.[day.id]?.times?.[i]||day.times[i];return /^\d{2}:\d{2}$/.test(time?.start||'')&&/^\d{2}:\d{2}$/.test(time?.end||'')&&time.start<time.end?{start:time.start,end:time.end}:{...day.times[i]};}) }));
}
export function readSchedule(storage = window.localStorage) {
  try { return normalizeSchedule(JSON.parse(storage.getItem(SCHEDULE_KEY) || 'null')); }
  catch { return normalizeSchedule(null); }
}
export function saveSchedule(days, storage = window.localStorage) {
  const value = {days:Object.fromEntries(days.map(day => [day.id, day.subjects])),times:days[0]?.times};
  const normalized = normalizeSchedule(value);
  storage.setItem(SCHEDULE_KEY, JSON.stringify({version:2,days:Object.fromEntries(normalized.map(day => [day.id,day.subjects])),times:normalized[0].times}));
  return normalized;
}
// A subject change must never overwrite an earlier subject's notebook in this slot.
export function resolveNotebookId(baseId, subject, getEntry) {
  const existing = getEntry(baseId);
  return !existing || existing.subject === subject ? baseId : baseId + ':' + encodeURIComponent(subject);
}
