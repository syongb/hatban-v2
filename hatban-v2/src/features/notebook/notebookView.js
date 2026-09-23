import { createDialog } from '../../utils/dialog.js';
import { readSchedule, saveSchedule, resolveNotebookId } from './scheduleSettings.js';
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
import { createNotebookPng, downloadNotebook } from './notebookExport.js';
import {
  createNotebookHistory,
  filterNotebookHistory,
  getHistorySubjects,
  normalizeNotebookHistoryEntry,
} from './notebookHistory.js';
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

function formatHistoryDate(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(new Date(year, month - 1, day));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getInitialSelection(days) {
  const current = getCurrentScheduleInfo();
  const dayId = current.dayId || WEEKDAYS[0].id;
  const currentSlot = current.period ? getScheduleSlot(dayId, current.period, days) : null;
  return { dayId, period: currentSlot ? current.period : Math.max(0, days.find(day => day.id === dayId).subjects.findIndex(Boolean) + 1) };
}

export function renderNotebookView() {
  const storage = createNotebookStorage();
  const currentSchedule = getCurrentScheduleInfo();
  let days = readSchedule();
  const initialSelection = getInitialSelection(days);
  let selectedDayId = initialSelection.dayId;
  let selectedPeriod = initialSelection.period;
  let writingSelection = { ...initialSelection };
  let openedHistoryEntryId = null;
  let notebookMode = 'write';
  let historyFilters = { dayId: 'all', subject: 'all' };
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

      <div class="notebook-mode-tabs" role="tablist" aria-label="배움공책 화면 선택">
        <button type="button" class="notebook-mode-tab is-active" data-notebook-mode="write" role="tab" aria-selected="true">
          <span aria-hidden="true">✏️</span> 공책 쓰기
        </button>
        <button type="button" class="notebook-mode-tab" data-notebook-mode="history" role="tab" aria-selected="false">
          <span aria-hidden="true">📚</span> 지난 배움공책
        </button>
      </div>

      <div class="notebook-workspace">
        <aside class="timetable-panel" aria-labelledby="timetable-title">
          <div class="panel-heading">
            <div>
              <span class="card-label">이번 주 시간표</span>
              <h2 id="timetable-title">수업 고르기</h2>
            </div>
            <span class="today-marker">오늘</span><button type="button" class="home-secondary-button" data-schedule-edit>시간표 설정</button>
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
          <div class="history-editing-banner" hidden>
            <div>
              <span class="card-label">지난 배움공책</span>
              <strong class="history-editing-summary"></strong>
            </div>
            <button type="button" class="history-return-button" data-history-action="return">지난 배움공책으로 돌아가기</button>
          </div>
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

              <label class="drawing-tool-group drawing-picker-control">색상
                <input type="color" value="#1f2937" data-drawing-color-picker aria-label="펜 색상">
                <output data-drawing-color-output>#1f2937</output>
              </label>

              <label class="drawing-tool-group drawing-slider-control">굵기
                <input type="range" min="1" max="24" step="1" value="4" data-drawing-size-slider aria-label="펜 굵기">
                <output data-drawing-size-output>4 px</output>
              </label>

              <button type="button" class="undo-button" data-drawing-action="undo" disabled>
                <span aria-hidden="true">↶</span> 실행 취소
              </button>
              <button type="button" class="undo-button" data-drawing-action="clear">전체 그림 지우기</button>
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

          <section class="notebook-export" aria-labelledby="notebook-export-title">
            <div>
              <h3 id="notebook-export-title">완성한 공책을 제출해요</h3>
              <p>날짜, 과목, 글과 그림을 한 장의 깔끔한 PNG로 만들어요.</p>
            </div>
            <button type="button" class="notebook-export-button">
              <span aria-hidden="true">🖼️</span>
              <span class="notebook-export-button__text">이미지로 저장</span>
            </button>
            <p class="notebook-export-status" role="status" aria-live="polite"></p>
          </section>
        </article>
      </div>

      <section class="notebook-history-panel" aria-labelledby="notebook-history-title" hidden>
        <div class="notebook-history-panel__heading">
          <div>
            <span class="eyebrow">날짜가 지나도 이어지는 배움</span>
            <h2 id="notebook-history-title">지난 배움공책</h2>
            <p>기록을 누르면 그때의 글과 그림을 다시 열어 수정할 수 있어요.</p>
          </div>
          <span class="history-count"></span>
        </div>

        <div class="history-filter-section">
          <span class="history-filter-label">요일</span>
          <div class="history-filter-chips history-day-filters" aria-label="요일별 기록 필터"></div>
        </div>
        <div class="history-filter-section">
          <span class="history-filter-label">과목</span>
          <div class="history-filter-chips history-subject-filters" aria-label="과목별 기록 필터"></div>
        </div>
        <div class="notebook-history-list" aria-live="polite"></div>
      </section>
    </section>
  `);

  const workspace = element.querySelector('.notebook-workspace');
  const timetablePanel = element.querySelector('.timetable-panel');
  const historyPanel = element.querySelector('.notebook-history-panel');
  const historyDayFilters = element.querySelector('.history-day-filters');
  const historySubjectFilters = element.querySelector('.history-subject-filters');
  const historyList = element.querySelector('.notebook-history-list');
  const historyCount = element.querySelector('.history-count');
  const historyEditingBanner = element.querySelector('.history-editing-banner');
  const historyEditingSummary = element.querySelector('.history-editing-summary');
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
  const exportButton = element.querySelector('.notebook-export-button');
  const exportButtonText = element.querySelector('.notebook-export-button__text');
  const exportStatus = element.querySelector('.notebook-export-status');
  let activeDrawingTool = 'pen';
  let activeDrawingColor = '#1f2937';
  let activeDrawingSize = 4;
  let isExporting = false;

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

  const editor = element.querySelector('.notebook-editor-card');
  const empty = document.createElement('p'); empty.className = 'schedule-empty'; empty.textContent = '이 요일에는 수업이 없어요. 다른 요일을 고르거나 시간표를 설정해 주세요.'; empty.hidden = true; workspace.append(empty);
  const scheduleForm = document.createElement('form');
  scheduleForm.innerHTML = '<p>과목명을 바꾸거나 비워 두세요. 기존 공책은 지난 배움공책에 그대로 남아요.</p><div class="schedule-settings-grid"></div><p class="schedule-settings-error" role="status"></p><div class="dialog-actions"><button type="button" data-default-schedule>기본 시간표</button><button type="submit">시간표 저장</button></div>';
  const scheduleDialog = createDialog('우리 반 시간표', scheduleForm, 'schedule-dialog'); element.append(scheduleDialog);
  function fillScheduleForm(data) {
    const grid = scheduleForm.querySelector('.schedule-settings-grid'); grid.replaceChildren();
    data.forEach(day => { const group = document.createElement('fieldset'); const legend = document.createElement('legend'); legend.textContent = day.label; group.append(legend);
      day.subjects.forEach((subject,i) => { const label = document.createElement('label'); label.textContent = (i+1) + '교시'; const input = document.createElement('input'); input.name = day.id + '-' + i; input.maxLength = 30; input.placeholder = '빈 교시'; input.value = subject || ''; label.append(input); group.append(label); }); grid.append(group);
    });
  }
  element.querySelector('[data-schedule-edit]').onclick = () => { fillScheduleForm(days); scheduleDialog.showModal(); };
  scheduleForm.querySelector('[data-default-schedule]').onclick = () => fillScheduleForm(WEEKDAYS);
  scheduleForm.onsubmit = event => { event.preventDefault(); saveCurrentNotebook();
    const next = days.map(day => ({...day, subjects: day.subjects.map((_,i) => scheduleForm.elements.namedItem(day.id + '-' + i).value.trim() || null)}));
    try { days = saveSchedule(next); } catch { scheduleForm.querySelector('.schedule-settings-error').textContent = '설정을 저장하지 못했어요. 기기 저장 공간을 확인해 주세요.'; return; }
    const day = days.find(day => day.id === selectedDayId);
    selectedPeriod = day.subjects[selectedPeriod-1] ? selectedPeriod : day.subjects.findIndex(Boolean)+1;
    writingSelection = {dayId:selectedDayId,period:selectedPeriod}; scheduleDialog.close(); renderSchedule(); loadSelectedNotebook();
  };
  const entryIdFor = (dayId, period) => resolveNotebookId(createEntryId(dayId, period), days.find(day => day.id === dayId)?.subjects[period-1], id => storage.getEntry(id));

  function getNotebookContext() {
    if (openedHistoryEntryId) {
      const entry = storage.getEntry(openedHistoryEntryId);
      const historyEntry = normalizeNotebookHistoryEntry(entry, openedHistoryEntryId);
      if (historyEntry) {
        const scheduleSlot = historyEntry.dayId ? getScheduleSlot(historyEntry.dayId, historyEntry.period, days) : null;
        return {
          ...historyEntry,
          isHistory: true,
          time: scheduleSlot?.time ?? null,
        };
      }
      console.warn('[햇반이네] 이전 배움공책 정보를 읽지 못해 이번 주 공책으로 돌아갑니다.');
      openedHistoryEntryId = null;
    }

    const slot = getScheduleSlot(selectedDayId, selectedPeriod, days);
    if (!slot) return null;
    return {
      id: entryIdFor(selectedDayId, selectedPeriod),
      date: getDateForWeekday(selectedDayId),
      dayId: selectedDayId,
      day: slot.day.label,
      subject: slot.subject,
      period: slot.period,
      time: slot.time,
      isHistory: false,
    };
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
    const picker=element.querySelector('[data-drawing-color-picker]');picker.value=activeDrawingColor;
    element.querySelector('[data-drawing-color-output]').textContent=activeDrawingColor;
    const slider=element.querySelector('[data-drawing-size-slider]');slider.value=activeDrawingSize;
    element.querySelector('[data-drawing-size-output]').textContent=activeDrawingSize+' px';
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
    const day = days.find((item) => item.id === selectedDayId);
    scheduleList.innerHTML = day.subjects
      .map((subject, index) => {
        const period = index + 1;
        const time = PERIOD_TIMES[index];
        const isSelected = period === selectedPeriod;
        const isCurrent = selectedDayId === currentSchedule.dayId && period === currentSchedule.period;
        const entryId = subject ? entryIdFor(selectedDayId, period) : '';
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
            <strong class="schedule-slot__subject">${escapeHtml(subject)}</strong>
            <span class="schedule-slot__time">${time.start}–${time.end}</span>
            ${hasSavedEntry ? '<span class="saved-mark" aria-label="저장된 기록 있음">✓</span>' : ''}
          </button>
        `;
      })
      .join('');
  }

  function renderHistory() {
    const allEntries = createNotebookHistory(storage.getAllEntries());
    const subjects = getHistorySubjects(allEntries);
    if (historyFilters.subject !== 'all' && !subjects.includes(historyFilters.subject)) {
      historyFilters.subject = 'all';
    }
    const filteredEntries = filterNotebookHistory(allEntries, historyFilters);

    historyDayFilters.innerHTML = [
      ['all', '전체'],
      ...WEEKDAYS.map((day) => [day.id, day.shortLabel]),
    ]
      .map(
        ([dayId, label]) => `
          <button type="button" class="history-filter-chip${historyFilters.dayId === dayId ? ' is-active' : ''}" data-history-day="${dayId}" aria-pressed="${historyFilters.dayId === dayId}">
            ${label}
          </button>
        `,
      )
      .join('');

    historySubjectFilters.innerHTML = [
      ['all', '전체'],
      ...subjects.map((subject) => [subject, subject]),
    ]
      .map(
        ([subject, label]) => `
          <button type="button" class="history-filter-chip${historyFilters.subject === subject ? ' is-active' : ''}" data-history-subject="${escapeHtml(subject)}" aria-pressed="${historyFilters.subject === subject}">
            ${escapeHtml(label)}
          </button>
        `,
      )
      .join('');

    historyCount.textContent = allEntries.length ? `${allEntries.length}개의 기록` : '';
    if (allEntries.length === 0) {
      historyList.innerHTML = `
        <div class="history-empty-state">
          <span aria-hidden="true">📖</span>
          <strong>아직 저장된 배움공책이 없어요.</strong>
          <p>공책 쓰기에서 글이나 그림을 작성하면 이곳에 차곡차곡 모여요.</p>
        </div>
      `;
      return;
    }

    if (filteredEntries.length === 0) {
      historyList.innerHTML = `
        <div class="history-empty-state">
          <span aria-hidden="true">🔎</span>
          <strong>이 조건에 맞는 배움공책이 없어요.</strong>
          <p>다른 요일이나 과목을 선택해 보세요.</p>
        </div>
      `;
      return;
    }

    historyList.innerHTML = filteredEntries
      .map(
        (entry) => `
          <button type="button" class="history-entry-card" data-history-entry-id="${escapeHtml(entry.id)}">
            <span class="history-entry-card__date">${escapeHtml(formatHistoryDate(entry.date))}</span>
            <strong class="history-entry-card__subject">${entry.period}교시 · ${escapeHtml(entry.subject)}</strong>
            <span class="history-entry-card__preview">${escapeHtml(entry.preview)}</span>
            <span class="history-entry-card__meta">${entry.hasDrawing ? '✏️ 그림 있음' : '📝 텍스트 기록'}</span>
          </button>
        `,
      )
      .join('');
  }

  function renderNotebookMode() {
    const isHistoryMode = notebookMode === 'history';
    workspace.hidden = isHistoryMode;
    historyPanel.hidden = !isHistoryMode;
    workspace.classList.toggle('is-history-editing', Boolean(openedHistoryEntryId));
    timetablePanel.hidden = Boolean(openedHistoryEntryId);
    historyEditingBanner.hidden = !openedHistoryEntryId;
    element.querySelectorAll('[data-notebook-mode]').forEach((button) => {
      const isSelected = button.dataset.notebookMode === notebookMode;
      button.classList.toggle('is-active', isSelected);
      button.setAttribute('aria-selected', String(isSelected));
    });
    if (isHistoryMode) renderHistory();
  }

  function loadSelectedNotebook() {
    const context = getNotebookContext();
    editor.hidden = !context; empty.hidden = Boolean(context);
    if (!context) { textDirty = false; drawingDirty = false; return; }
    const entry = storage.getEntry(context.id);

    selectedDate.textContent = context.isHistory
      ? `지난 배움공책 · ${formatHistoryDate(context.date)}`
      : `${context.day} · ${formatDisplayDate(context.date)}`;
    selectedSubject.textContent = context.subject;
    selectedPeriodText.textContent = `${context.period}교시${context.time ? ` · ${context.time.start}–${context.time.end}` : ''}`;
    if (context.isHistory) {
      historyEditingSummary.textContent = `${formatHistoryDate(context.date)} · ${context.period}교시 · ${context.subject}`;
    }
    textarea.value = typeof entry?.text === 'string' ? entry.text : '';
    textDirty = false;
    drawingDirty = false;
    void canvasController.loadDrawing(typeof entry?.drawing === 'string' ? entry.drawing : null);
    updateCharacterCount();
    exportStatus.removeAttribute('data-state');
    exportStatus.textContent = '';
    setSaveState('saved', entry ? '저장된 내용 불러옴' : '새 공책');
  }

  function saveCurrentNotebook() {
    if (!textDirty && !drawingDirty) return;
    window.clearTimeout(saveTimer);
    saveTimer = null;

    const context = getNotebookContext();
    if (!context) return;
    const id = context.id;
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
        date: context.date,
        dayId: context.dayId,
        day: context.day,
        subject: context.subject,
        period: context.period,
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
      if (notebookMode === 'history') renderHistory();
    } catch (error) {
      console.warn('[햇반이네] 배움공책을 저장하지 못했습니다.', error);
      setSaveState('error', '저장하지 못했어요');
    }
  }

  function scheduleSave() {
    setSaveState('pending', '저장 대기 중');
    exportStatus.removeAttribute('data-state');
    exportStatus.textContent = '';
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(saveCurrentNotebook, AUTOSAVE_DELAY);
  }

  function selectNotebook(dayId, period) {
    if (dayId === selectedDayId && period === selectedPeriod) return;
    saveCurrentNotebook();
    openedHistoryEntryId = null;
    selectedDayId = dayId;
    selectedPeriod = period;
    writingSelection = { dayId, period };
    renderWeekdayTabs();
    renderSchedule();
    loadSelectedNotebook();
  }

  function openHistoryEntry(entryId) {
    const entry = normalizeNotebookHistoryEntry(storage.getEntry(entryId), entryId);
    if (!entry) {
      console.warn('[햇반이네] 선택한 이전 배움공책을 열지 못했습니다.');
      return;
    }
    saveCurrentNotebook();
    openedHistoryEntryId = entry.id;
    notebookMode = 'write';
    renderNotebookMode();
    loadSelectedNotebook();
  }

  function returnToHistory() {
    saveCurrentNotebook();
    openedHistoryEntryId = null;
    notebookMode = 'history';
    renderNotebookMode();
  }

  function showWritingNotebook() {
    saveCurrentNotebook();
    openedHistoryEntryId = null;
    selectedDayId = writingSelection.dayId;
    selectedPeriod = writingSelection.period;
    notebookMode = 'write';
    renderWeekdayTabs();
    renderSchedule();
    renderNotebookMode();
    loadSelectedNotebook();
  }

  function handleClick(event) {
    const modeButton = event.target.closest('[data-notebook-mode]');
    if (modeButton) {
      if (modeButton.dataset.notebookMode === 'history') {
        saveCurrentNotebook();
        notebookMode = 'history';
        renderNotebookMode();
      } else {
        showWritingNotebook();
      }
      return;
    }

    const historyReturnButton = event.target.closest('[data-history-action="return"]');
    if (historyReturnButton) {
      returnToHistory();
      return;
    }

    const historyEntryButton = event.target.closest('[data-history-entry-id]');
    if (historyEntryButton) {
      openHistoryEntry(historyEntryButton.dataset.historyEntryId);
      return;
    }

    const historyDayButton = event.target.closest('[data-history-day]');
    if (historyDayButton) {
      historyFilters.dayId = historyDayButton.dataset.historyDay;
      renderHistory();
      return;
    }

    const historySubjectButton = event.target.closest('[data-history-subject]');
    if (historySubjectButton) {
      historyFilters.subject = historySubjectButton.dataset.historySubject;
      renderHistory();
      return;
    }

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
    if (drawingAction?.dataset.drawingAction === 'clear') {
      if (window.confirm('그림을 모두 지울까요?')) canvasController.clearAll();
      return;
    }

    const dayButton = event.target.closest('[data-day-id]');
    if (dayButton) {
      const day = days.find((item) => item.id === dayButton.dataset.dayId);
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

  async function exportCurrentNotebook() {
    if (isExporting) return;
    const context = getNotebookContext();
    if (!context) return;
    let drawing;

    try {
      drawing = canvasController.getDrawingData();
    } catch (error) {
      console.warn('[햇반이네] 내보낼 그림을 읽지 못했습니다.', error);
      exportStatus.dataset.state = 'error';
      exportStatus.textContent = '그림을 읽지 못했어요. 잠시 후 다시 시도해 주세요.';
      return;
    }

    if (!textarea.value.trim() && !drawing) {
      exportStatus.dataset.state = 'notice';
      exportStatus.textContent = '먼저 글이나 그림을 작성해 주세요.';
      return;
    }

    isExporting = true;
    exportButton.disabled = true;
    exportButton.setAttribute('aria-busy', 'true');
    exportButtonText.textContent = '이미지 만드는 중...';
    exportStatus.dataset.state = 'pending';
    exportStatus.textContent = '제출하기 좋은 이미지로 정리하고 있어요.';

    try {
      const png = await createNotebookPng({
        date: context.date,
        day: context.day,
        period: context.period,
        subject: context.subject,
        text: textarea.value,
        drawing,
      });
      await downloadNotebook(png);
      exportStatus.dataset.state = 'success';
      exportStatus.textContent = 'PNG 파일로 저장했어요.';
    } catch (error) {
      console.warn('[햇반이네] 배움공책 이미지를 만들지 못했습니다.', error);
      exportStatus.dataset.state = 'error';
      exportStatus.textContent = '이미지를 만들지 못했어요. 잠시 후 다시 시도해 주세요.';
    } finally {
      isExporting = false;
      exportButton.disabled = false;
      exportButton.removeAttribute('aria-busy');
      exportButtonText.textContent = '이미지로 저장';
    }
  }

  element.addEventListener('click', handleClick);
  textarea.addEventListener('input', handleInput);
  element.querySelector('[data-drawing-color-picker]').addEventListener('input',(event)=>{activeDrawingColor=event.target.value;activeDrawingTool='pen';canvasController.setColor(activeDrawingColor);canvasController.setTool('pen');renderDrawingToolState();});
  element.querySelector('[data-drawing-size-slider]').addEventListener('input',(event)=>{activeDrawingSize=Number(event.target.value);canvasController.setSize(activeDrawingSize);renderDrawingToolState();});
  exportButton.addEventListener('click', exportCurrentNotebook);
  window.addEventListener('pagehide', handlePageHide);

  renderWeekdayTabs();
  renderSchedule();
  renderDrawingToolState();
  renderNotebookMode();
  loadSelectedNotebook();

  return {
    element,
    destroy() {
      scheduleDialog.close();
      saveCurrentNotebook();
      window.clearTimeout(saveTimer);
      window.removeEventListener('pagehide', handlePageHide);
      canvasController.destroy();
    },
  };
}
