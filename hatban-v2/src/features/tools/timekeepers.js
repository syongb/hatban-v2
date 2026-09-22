export function formatCountdown(milliseconds) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0');
}

export function formatStopwatch(milliseconds) {
  const tenths = Math.max(0, Math.floor(milliseconds / 100));
  return String(Math.floor(tenths / 600)).padStart(2, '0') + ':' + String(Math.floor(tenths / 10) % 60).padStart(2, '0') + '.' + String(tenths % 10);
}

export function createTimerState() {
  let duration = 300000; let remaining = duration; let endsAt = null; let running = false; let ticker = null; const listeners = new Set();
  const snapshot = () => ({ duration, remaining: running ? Math.max(0, endsAt - Date.now()) : remaining, running });
  const notify = () => { const state = snapshot(); if (running && state.remaining === 0) { running = false; endsAt = null; remaining = 0; clearInterval(ticker); } listeners.forEach((listener) => listener(snapshot())); };
  const startTick = () => { clearInterval(ticker); ticker = setInterval(notify, 200); };
  return {
    getState: snapshot,
    setMinutes(minutes) { clearInterval(ticker); duration = Math.max(0, Math.round(minutes * 60000)); remaining = Math.max(0, Math.round(minutes * 60000)); endsAt = null; running = false; notify(); },
    start() { if (!running && remaining > 0) { endsAt = Date.now() + remaining; running = true; startTick(); notify(); } },
    pause() { if (running) { remaining = Math.max(0, endsAt - Date.now()); endsAt = null; running = false; clearInterval(ticker); notify(); } },
    reset() { this.pause(); remaining = duration; notify(); },
    subscribe(listener) { listeners.add(listener); listener(snapshot()); return () => listeners.delete(listener); },
  };
}

export function createStopwatchState() {
  let elapsed = 0; let startedAt = null; let running = false; let ticker = null; const listeners = new Set();
  const snapshot = () => ({ elapsed: running ? elapsed + Date.now() - startedAt : elapsed, running });
  const notify = () => listeners.forEach((listener) => listener(snapshot()));
  return {
    getState: snapshot,
    start() { if (!running) { startedAt = Date.now(); running = true; clearInterval(ticker); ticker = setInterval(notify, 100); notify(); } },
    pause() { if (running) { elapsed += Date.now() - startedAt; startedAt = null; running = false; clearInterval(ticker); notify(); } },
    reset() { elapsed = 0; startedAt = null; running = false; clearInterval(ticker); notify(); },
    subscribe(listener) { listeners.add(listener); listener(snapshot()); return () => listeners.delete(listener); },
  };
}

export const timer = createTimerState();
export const stopwatch = createStopwatchState();
