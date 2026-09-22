import { WEEKDAYS } from './notebookSchedule.js';
export const SCHEDULE_KEY = 'hatban_v2_schedule';
export function normalizeSchedule(saved) {
  return WEEKDAYS.map(day => ({ ...day, subjects: Array.from({length:6}, (_,i) => {
    const value = saved?.[day.id]?.[i];
    return value === null || typeof value === 'string' ? (value?.trim().slice(0,30) || null) : day.subjects[i];
  }) }));
}
export function readSchedule(storage = window.localStorage) {
  try { return normalizeSchedule(JSON.parse(storage.getItem(SCHEDULE_KEY) || 'null')); }
  catch { return normalizeSchedule(null); }
}
export function saveSchedule(days, storage = window.localStorage) {
  const value = Object.fromEntries(days.map(day => [day.id, day.subjects]));
  const normalized = normalizeSchedule(value);
  storage.setItem(SCHEDULE_KEY, JSON.stringify(Object.fromEntries(normalized.map(day => [day.id,day.subjects]))));
  return normalized;
}
// A subject change must never overwrite an earlier subject's notebook in this slot.
export function resolveNotebookId(baseId, subject, getEntry) {
  const existing = getEntry(baseId);
  return !existing || existing.subject === subject ? baseId : baseId + ':' + encodeURIComponent(subject);
}
