import { createView } from '../../utils/createView.js';
import {
  PERIOD_TIMES,
  WEEKDAYS,
  createEntryId,
  getCurrentScheduleInfo,
  getDateForWeekday,
  getScheduleSlot,
} from './notebookSchedule.js';
import { createNotebookStorage } from './notebookStorage.js';

const AUTOSAVE_DELAY = 700;

function formatDisplayDate(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date(year, month - 1, day));
}

function getInitialSelection() {
  const current = getCurrentScheduleInfo();
  const dayId = current.dayId || WEEKDAYS[0].id;
  const currentSlot = current.period ? getScheduleSlot(dayId, current.period) : null;
  return { dayId, period: currentSlot ? current.period : 1 };
}

export function renderNotebookView() {
  const storage = createNotebookStorage();
  const currentSchedule = getCurrentScheduleInfo();
  const initialSelection = getInitialSelection();
  let selectedDayId = initialSelection.dayId;
  let selectedPeriod = initialSelection.period;
  let saveTimer = null;
  let isDirty = false;

  const element = createView(`
    <section class="screen" aria-labelledby="notebook-title">
      <div class="page-heading notebook-heading">
        <div>
          <span class="eyebrow">오늘 배운 것을 내 말로</span>
          <h1 id="notebook-title">배움공책 <span aria-hidden="true">✏️</span></h1>
          <p>시간표에서 수업을 고르고 자유롭게 기록해 보세요. 작성한 내용은 이 기기에 자동으로 저장돼요.</p>
        </div>
        <span class="status-pill">텍스트 공책 사용 가능</span>
      </div>

      <div class="notebook-workspace">
        <aside class="timetable-panel" aria-labelledby="timetable-title">
          <div class="panel-heading">
            <div>
              <span class="card-label">이번 주 시간표</span>
              <h2 id="timetable-title">수업 고르기</h2>
            </div>
            <span class="today-marker">오늘</span>
          </div>

          <div class="weekday-tabs" aria-label="요일 선택">
            ${WEEKDAYS.map(
              (day) => `
                <button type="button" class="weekday-tab" data-day-id="${day.id}">
                  ${day.shortLabel}<span class="weekday-tab__suffix">요일</span>
                </button>
              `,
            ).join('')}
          </div>

          <div class="schedule-list" aria-label="선택한 요일의 시간표"></div>
        </aside>

        <article class="notebook-editor-card">
          <div class="notebook-editor-card__header">
            <div>
              <span class="card-label selected-date"></span>
              <h2 class="selected-subject"></h2>
              <p class="selected-period"></p>
            </div>
            <div class="save-state" data-state="saved" role="status" aria-live="polite">
              <span class="save-state__dot" aria-hidden="true"></span>
              <span class="save-state__text">저장됨</span>
            </div>
          </div>

          <label class="notebook-text-label" for="notebook-text">나의 배움 기록</label>
          <textarea
            id="notebook-text"
            class="notebook-textarea"
            maxlength="20000"
            placeholder="오늘 알게 된 것, 궁금한 점, 기억하고 싶은 내용을 적어 보세요."
          ></textarea>
          <div class="notebook-editor-card__footer">
            <span>입력을 멈추면 잠시 후 자동 저장돼요.</span>
            <span class="character-count">0 / 20,000</span>
          </div>
        </article>
      </div>
    </section>
  `);

  const scheduleList = element.querySelector('.schedule-list');
  const textarea = element.querySelector('#notebook-text');
  const selectedDate = element.querySelector('.selected-date');
  const selectedSubject = element.querySelector('.selected-subject');
  const selectedPeriodText = element.querySelector('.selected-period');
  const saveState = element.querySelector('.save-state');
  const saveStateText = element.querySelector('.save-state__text');
  const characterCount = element.querySelector('.character-count');
  const todayMarker = element.querySelector('.today-marker');

  function currentEntryId() {
    return createEntryId(selectedDayId, selectedPeriod);
  }

  function setSaveState(state, message) {
    saveState.dataset.state = state;
    saveStateText.textContent = message;
  }

  function updateCharacterCount() {
    characterCount.textContent = `${textarea.value.length.toLocaleString('ko-KR')} / 20,000`;
  }

  function renderWeekdayTabs() {
    const today = WEEKDAYS.find((day) => day.id === currentSchedule.dayId);
    todayMarker.textContent = today ? `오늘 ${today.shortLabel}요일` : '이번 주';

    element.querySelectorAll('[data-day-id]').forEach((button) => {
      const isSelected = button.dataset.dayId === selectedDayId;
      const isToday = button.dataset.dayId === currentSchedule.dayId;
      button.classList.toggle('is-selected', isSelected);
      button.classList.toggle('is-today', isToday);
      button.setAttribute('aria-pressed', String(isSelected));
    });
  }

  function renderSchedule() {
    const day = WEEKDAYS.find((item) => item.id === selectedDayId);
    scheduleList.innerHTML = day.subjects
      .map((subject, index) => {
        const period = index + 1;
        const time = PERIOD_TIMES[index];
        const isSelected = period === selectedPeriod;
        const isCurrent = selectedDayId === currentSchedule.dayId && period === currentSchedule.period;
        const entryId = subject ? createEntryId(selectedDayId, period) : '';
        const hasSavedEntry = entryId ? storage.hasEntry(entryId) : false;

        if (!subject) {
          return `
            <div class="schedule-slot is-empty" aria-label="${period}교시 빈 시간">
              <span class="schedule-slot__period">${period}교시</span>
              <span class="schedule-slot__subject">수업 없음</span>
              <span class="schedule-slot__time">${time.start}–${time.end}</span>
            </div>
          `;
        }

        return `
          <button
            type="button"
            class="schedule-slot${isSelected ? ' is-selected' : ''}${isCurrent ? ' is-current' : ''}"
            data-period="${period}"
            aria-pressed="${isSelected}"
          >
            <span class="schedule-slot__period">${period}교시${isCurrent ? ' · 지금' : ''}</span>
            <strong class="schedule-slot__subject">${subject}</strong>
            <span class="schedule-slot__time">${time.start}–${time.end}</span>
            ${hasSavedEntry ? '<span class="saved-mark" aria-label="저장된 기록 있음">✓</span>' : ''}
          </button>
        `;
      })
      .join('');
  }

  function loadSelectedNotebook() {
    const slot = getScheduleSlot(selectedDayId, selectedPeriod);
    const date = getDateForWeekday(selectedDayId);
    const entry = storage.getEntry(currentEntryId());

    selectedDate.textContent = `${slot.day.label} · ${formatDisplayDate(date)}`;
    selectedSubject.textContent = slot.subject;
    selectedPeriodText.textContent = `${slot.period}교시 · ${slot.time.start}–${slot.time.end}`;
    textarea.value = typeof entry?.text === 'string' ? entry.text : '';
    isDirty = false;
    updateCharacterCount();
    setSaveState('saved', entry ? '저장된 내용 불러옴' : '새 공책');
  }

  function saveCurrentNotebook() {
    if (!isDirty) return;
    window.clearTimeout(saveTimer);
    saveTimer = null;

    const slot = getScheduleSlot(selectedDayId, selectedPeriod);
    const id = currentEntryId();
    const existingEntry = storage.getEntry(id);
    const now = new Date().toISOString();

    try {
      storage.saveEntry({
        ...existingEntry,
        id,
        date: getDateForWeekday(selectedDayId),
        dayId: selectedDayId,
        day: slot.day.label,
        subject: slot.subject,
        period: slot.period,
        text: textarea.value,
        drawing: existingEntry?.drawing ?? null,
        createdAt: existingEntry?.createdAt || now,
        updatedAt: now,
      });
      isDirty = false;
      setSaveState('saved', '저장됨');
      renderSchedule();
    } catch (error) {
      console.warn('[햇반이네] 배움공책을 저장하지 못했습니다.', error);
      setSaveState('error', '저장하지 못했어요');
    }
  }

  function scheduleSave() {
    isDirty = true;
    setSaveState('pending', '저장 대기 중');
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(saveCurrentNotebook, AUTOSAVE_DELAY);
  }

  function selectNotebook(dayId, period) {
    if (dayId === selectedDayId && period === selectedPeriod) return;
    saveCurrentNotebook();
    selectedDayId = dayId;
    selectedPeriod = period;
    renderWeekdayTabs();
    renderSchedule();
    loadSelectedNotebook();
  }

  function handleClick(event) {
    const dayButton = event.target.closest('[data-day-id]');
    if (dayButton) {
      const day = WEEKDAYS.find((item) => item.id === dayButton.dataset.dayId);
      const firstAvailablePeriod = day.subjects.findIndex(Boolean) + 1;
      selectNotebook(day.id, firstAvailablePeriod);
      return;
    }

    const periodButton = event.target.closest('[data-period]');
    if (periodButton) selectNotebook(selectedDayId, Number(periodButton.dataset.period));
  }

  function handleInput() {
    updateCharacterCount();
    scheduleSave();
  }

  function handlePageHide() {
    saveCurrentNotebook();
  }

  element.addEventListener('click', handleClick);
  textarea.addEventListener('input', handleInput);
  window.addEventListener('pagehide', handlePageHide);

  renderWeekdayTabs();
  renderSchedule();
  loadSelectedNotebook();

  return {
    element,
    destroy() {
      saveCurrentNotebook();
      window.clearTimeout(saveTimer);
      window.removeEventListener('pagehide', handlePageHide);
    },
  };
}
