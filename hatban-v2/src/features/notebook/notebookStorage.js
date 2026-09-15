export const NOTEBOOK_STORAGE_KEY = 'hatban_v2_notebooks';
export const NOTEBOOK_SCHEMA_VERSION = 1;

function createEmptyStore() {
  return { version: NOTEBOOK_SCHEMA_VERSION, entries: {} };
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function parseNotebookStore(rawValue) {
  if (rawValue === null) return createEmptyStore();

  try {
    const parsed = JSON.parse(rawValue);
    if (parsed.version !== NOTEBOOK_SCHEMA_VERSION || !isRecord(parsed.entries)) {
      console.warn(`[햇반이네] ${NOTEBOOK_STORAGE_KEY}의 형식이 올바르지 않아 기본값으로 엽니다.`);
      return createEmptyStore();
    }
    return parsed;
  } catch (error) {
    console.warn(`[햇반이네] ${NOTEBOOK_STORAGE_KEY}을 읽지 못해 기본값으로 엽니다.`, error);
    return createEmptyStore();
  }
}

export function createNotebookStorage(storage = window.localStorage) {
  let store = parseNotebookStore(storage.getItem(NOTEBOOK_STORAGE_KEY));

  function getEntry(entryId) {
    const entry = store.entries[entryId];
    return isRecord(entry) ? { ...entry } : null;
  }

  function hasEntry(entryId) {
    return isRecord(store.entries[entryId]);
  }

  function saveEntry(entry) {
    if (!isRecord(entry) || typeof entry.id !== 'string') {
      throw new TypeError('저장할 배움공책 항목에 id가 필요합니다.');
    }

    const nextStore = {
      version: NOTEBOOK_SCHEMA_VERSION,
      entries: {
        ...store.entries,
        [entry.id]: { ...entry },
      },
    };

    storage.setItem(NOTEBOOK_STORAGE_KEY, JSON.stringify(nextStore));
    store = nextStore;
    return { ...entry };
  }

  function saveEntryWithDrawingFallback(entry, fallbackDrawing) {
    try {
      return { drawingSaved: true, entry: saveEntry(entry), drawingError: null };
    } catch (drawingError) {
      if (entry.drawing === fallbackDrawing) throw drawingError;
      const fallbackEntry = { ...entry, drawing: fallbackDrawing };
      return {
        drawingSaved: false,
        entry: saveEntry(fallbackEntry),
        drawingError,
      };
    }
  }

  return { getEntry, hasEntry, saveEntry, saveEntryWithDrawingFallback };
}
