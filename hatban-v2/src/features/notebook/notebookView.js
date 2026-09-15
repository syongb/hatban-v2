import { createView } from '../../utils/createView.js';
import {
  PERIOD_TIMES,
  WEEKDAYS,
  createEntryId,
  getCurrentScheduleInfo,
  getDateForWeekday,
  getScheduleSlot,
} from './notebookSchedule.js';
import { createNotebookCanvas } from './notebookCanvas.js';
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
  let textDirty = false;
  let drawingDirty = false;

  const element = createView(`
    <section class="screen" aria-labelledby="notebook-title">
      <div class="page-heading notebook-heading">
        <div>
          <span class="eyebrow">오늘 배운 것을 내 말로</span>
          <h1 id="notebook-title">배움공책 <span aria-hidden="true">✏️</span></h1>
          <p>시간표에서 수업을 고르고 자유롭게 기록해 보세요. 작성한 내용은 이 기기에 자동으로 저장돼요.</p>
        </div>
        <span class="status-pill">텍스트 + 필기 공책</span>
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

          <section class="drawing-workspace" aria-labelledby="drawing-title">
            <div class="drawing-workspace__heading">
              <div>
                <span class="card-label">그림/필기 공책</span>
                <h3 id="drawing-title">손가락이나 펜으로 표현해요</h3>
              </div>
              <span class="pointer-badge">Pointer 입력</span>
            </div>

            <div class="drawing-toolbar" aria-label="필기 도구">
              <div class="drawing-tool-group" aria-label="도구 선택">
                <span class="drawing-tool-label">도구</span>
                <button type="button" class="drawing-tool-button is-active" data-drawing-tool="pen" aria-pressed="true">
                  <span aria-hidden="true">✏️</span> 펜
                </button>
                <button type="button" class="drawing-tool-button" data-drawing-tool="eraser" aria-pressed="false">
                  <span aria-hidden="true">🧽</span> 지우개
                </button>
              </div>

              <div class="drawing-tool-group" aria-label="펜 색상 선택">
                <span class="drawing-tool-label">색상</span>
                ${[
                  ['#1f2937', '검정'],
                  ['#ef4444', '빨강'],
                  ['#3b82f6', '파랑'],
                  ['#16a34a', '초록'],
                ]
                  .map(
                    ([color, label], index) => `
                      <button
                        type="button"
                        class="color-swatch${index === 0 ? ' is-active' : ''}"
                        data-drawing-color="${color}"
                        aria-label="${label} 펜"
                        aria-pressed="${index === 0}"
                        style="--swatch-color: ${color}"
                      ></button>
                    `,
                  )
                  .join('')}
              </div>

              <div class="drawing-tool-group" aria-label="펜 굵기 선택">
                <span class="drawing-tool-label">굵기</span>
                ${[
                  [2, '얇게'],
                  [4, '보통'],
                  [8, '굵게'],
                ]
                  .map(
                    ([size, label]) => `
                      <button
                        type="button"
                        class="size-button${size === 4 ? ' is-active' : ''}"
                        data-drawing-size="${size}"
                        aria-label="${label} ${size}px"
                        aria-pressed="${size === 4}"
                      >
                        <span style="--preview-size: ${size}px" aria-hidden="true"></span>
                        ${label}
                      </button>
                    `,
                  )
                  .join('')}
              </div>

              <button type="button" class="undo-button" data-drawing-action="undo" disabled>
                <span aria-hidden="true">↶</span> 실행 취소
              </button>
            </div>

            <div class="notebook-canvas-frame">
              <canvas
                id="notebook-canvas"
                class="notebook-canvas"
                data-tool="pen"
                aria-label="그림과 필기를 입력하는 캔버스"
              ></canvas>
            </div>
            <p class="canvas-help">이 영역 안에서는 화면이 움직이지 않아요. 바깥에서는 평소처럼 스크롤할 수 있어요.</p>
          </section>
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
  const canvas = element.querySelector('#notebook-canvas');
  const undoButton = element.querySelector('[data-drawing-action="undo"]');
  let activeDrawingTool = 'pen';
  let activeDrawingColor = '#1f2937';
  let activeDrawingSize = 4;

  const canvasController = createNotebookCanvas({
    canvas,
    onDrawingChange() {
      drawingDirty = true;
      scheduleSave();
    },
    onHistoryChange(canUndo) {
      undoButton.disabled = !canUndo;
    },
  });

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

  function renderDrawingToolState() {
    element.querySelectorAll('[data-drawing-tool]').forEach((button) => {
      const isActive = button.dataset.drawingTool === activeDrawingTool;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });
    element.querySelectorAll('[data-drawing-color]').forEach((button) => {
      const isActive = button.dataset.drawingColor === activeDrawingColor;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });
    element.querySelectorAll('[data-drawing-size]').forEach((button) => {
      const isActive = Number(button.dataset.drawingSize) === activeDrawingSize;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });
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
    textDirty = false;
    drawingDirty = false;
    void canvasController.loadDrawing(typeof entry?.drawing === 'string' ? entry.drawing : null);
    updateCharacterCount();
    setSaveState('saved', entry ? '저장된 내용 불러옴' : '새 공책');
  }

  function saveCurrentNotebook() {
    if (!textDirty && !drawingDirty) return;
    window.clearTimeout(saveTimer);
    saveTimer = null;

    const slot = getScheduleSlot(selectedDayId, selectedPeriod);
    const id = currentEntryId();
    const existingEntry = storage.getEntry(id);
    const now = new Date().toISOString();
    const previousDrawing = existingEntry?.drawing ?? null;
    let nextDrawing = previousDrawing;
    let drawingReadError = null;

    if (drawingDirty) {
      try {
        nextDrawing = canvasController.getDrawingData();
      } catch (error) {
        drawingReadError = error;
      }
    }

    try {
      const nextEntry = {
        ...existingEntry,
        id,
        date: getDateForWeekday(selectedDayId),
        dayId: selectedDayId,
        day: slot.day.label,
        subject: slot.subject,
        period: slot.period,
        text: textarea.value,
        drawing: nextDrawing,
        createdAt: existingEntry?.createdAt || now,
        updatedAt: now,
      };
      let saveResult;

      if (drawingDirty && !drawingReadError) {
        saveResult = storage.saveEntryWithDrawingFallback(nextEntry, previousDrawing);
      } else {
        saveResult = {
          drawingSaved: !drawingReadError,
          drawingError: drawingReadError,
          entry: storage.saveEntry({ ...nextEntry, drawing: previousDrawing }),
        };
      }

      textDirty = false;
      drawingDirty = false;
      if (saveResult.drawingSaved) {
        setSaveState('saved', '텍스트와 그림 저장됨');
      } else {
        console.warn('[햇반이네] 그림 용량 때문에 이전 그림을 유지하고 텍스트만 저장했습니다.', saveResult.drawingError);
        setSaveState('warning', '그림 저장 실패 · 글은 저장됨');
      }
      renderSchedule();
    } catch (error) {
      console.warn('[햇반이네] 배움공책을 저장하지 못했습니다.', error);
      setSaveState('error', '저장하지 못했어요');
    }
  }

  function scheduleSave() {
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
    const toolButton = event.target.closest('[data-drawing-tool]');
    if (toolButton) {
      activeDrawingTool = toolButton.dataset.drawingTool;
      canvasController.setTool(activeDrawingTool);
      renderDrawingToolState();
      return;
    }

    const colorButton = event.target.closest('[data-drawing-color]');
    if (colorButton) {
      activeDrawingColor = colorButton.dataset.drawingColor;
      activeDrawingTool = 'pen';
      canvasController.setColor(activeDrawingColor);
      canvasController.setTool('pen');
      renderDrawingToolState();
      return;
    }

    const sizeButton = event.target.closest('[data-drawing-size]');
    if (sizeButton) {
      activeDrawingSize = Number(sizeButton.dataset.drawingSize);
      canvasController.setSize(activeDrawingSize);
      renderDrawingToolState();
      return;
    }

    const drawingAction = event.target.closest('[data-drawing-action]');
    if (drawingAction?.dataset.drawingAction === 'undo') {
      void canvasController.undo();
      return;
    }

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
    textDirty = true;
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
  renderDrawingToolState();
  loadSelectedNotebook();

  return {
    element,
    destroy() {
      saveCurrentNotebook();
      window.clearTimeout(saveTimer);
      window.removeEventListener('pagehide', handlePageHide);
      canvasController.destroy();
    },
  };
}
