export const WEEKDAYS = [
  { id: 'mon', label: '월요일', shortLabel: '월', subjects: ['국어', '영어', '체육', '사회', '사회', '창체'] },
  { id: 'tue', label: '화요일', shortLabel: '화', subjects: ['국어', '음악', '수학', '영어', '사회', '실과'] },
  { id: 'wed', label: '수요일', shortLabel: '수', subjects: ['체육', '과학', '수학', '국어', '창체', null] },
  { id: 'thu', label: '목요일', shortLabel: '목', subjects: ['국어', '국어', '수학', '영어', '미술', '미술'] },
  { id: 'fri', label: '금요일', shortLabel: '금', subjects: ['음악', '체육', '수학', '과학', '과학', '도덕'] },
];

export const PERIOD_TIMES = [
  { start: '08:50', end: '09:30' },
  { start: '09:40', end: '10:20' },
  { start: '10:30', end: '11:10' },
  { start: '11:20', end: '12:00' },
  { start: '12:10', end: '12:50' },
  { start: '13:40', end: '14:20' },
];

function toMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCurrentScheduleInfo(now = new Date()) {
  const jsDay = now.getDay();
  const dayIndex = jsDay >= 1 && jsDay <= 5 ? jsDay - 1 : -1;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const periodIndex = PERIOD_TIMES.findIndex(
    ({ start, end }) => currentMinutes >= toMinutes(start) && currentMinutes <= toMinutes(end),
  );

  return {
    dayId: dayIndex >= 0 ? WEEKDAYS[dayIndex].id : null,
    period: dayIndex >= 0 && periodIndex >= 0 ? periodIndex + 1 : null,
  };
}

export function getDateForWeekday(dayId, now = new Date()) {
  const dayIndex = WEEKDAYS.findIndex((day) => day.id === dayId);
  if (dayIndex < 0) throw new Error(`알 수 없는 요일입니다: ${dayId}`);

  const mondayOffset = now.getDay() === 0 ? -6 : 1 - now.getDay();
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  target.setDate(target.getDate() + mondayOffset + dayIndex);
  return formatLocalDate(target);
}

export function getScheduleSlot(dayId, period) {
  const day = WEEKDAYS.find((item) => item.id === dayId);
  const subject = day?.subjects[period - 1] ?? null;
  if (!day || !subject) return null;

  return {
    day,
    period,
    subject,
    time: PERIOD_TIMES[period - 1],
  };
}

export function createEntryId(dayId, period, now = new Date()) {
  return `${getDateForWeekday(dayId, now)}:${dayId}:${period}`;
}
