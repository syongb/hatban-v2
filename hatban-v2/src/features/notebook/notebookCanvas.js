const MAX_PIXEL_RATIO = 2;
const MAX_UNDO_STEPS = 25;

function createSnapshotCanvas(canvas) {
  if (!canvas.width || !canvas.height) return null;

  const snapshot = document.createElement('canvas');
  snapshot.width = canvas.width;
  snapshot.height = canvas.height;
  snapshot.getContext('2d').drawImage(canvas, 0, 0);
  return snapshot;
}

export function createNotebookCanvas({ canvas, onDrawingChange, onHistoryChange }) {
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Canvas 2D context를 만들 수 없습니다.');

  const eventController = new AbortController();
  const undoHistory = [];
  let pixelRatio = 1;
  let logicalWidth = 0;
  let logicalHeight = 0;
  let activePointerId = null;
  let activeTool = 'pen';
  let activeColor = '#1f2937';
  let activeSize = 4;
  let hasDrawing = false;
  let sourceDrawing = null;
  let loadSequence = 0;
  let resizeFrame = null;

  function resetTransform() {
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.lineCap = 'round';
    context.lineJoin = 'round';
  }

  function clearPixels() {
    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.restore();
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const nextWidth = Math.round(rect.width);
    const nextHeight = Math.round(rect.height);
    if (nextWidth < 1 || nextHeight < 1) return;

    const nextPixelRatio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
    const nextBufferWidth = Math.round(nextWidth * nextPixelRatio);
    const nextBufferHeight = Math.round(nextHeight * nextPixelRatio);
    if (canvas.width === nextBufferWidth && canvas.height === nextBufferHeight) return;

    const snapshot = hasDrawing ? createSnapshotCanvas(canvas) : null;
    canvas.width = nextBufferWidth;
    canvas.height = nextBufferHeight;
    logicalWidth = nextWidth;
    logicalHeight = nextHeight;
    pixelRatio = nextPixelRatio;

    if (snapshot) {
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.drawImage(snapshot, 0, 0, canvas.width, canvas.height);
    }
    resetTransform();
  }

  function scheduleResize() {
    window.cancelAnimationFrame(resizeFrame);
    resizeFrame = window.requestAnimationFrame(() => {
      resizeFrame = null;
      resizeCanvas();
    });
  }

  function containsVisiblePixels() {
    if (!hasDrawing || !canvas.width || !canvas.height) return false;
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let index = 3; index < pixels.length; index += 4) {
      if (pixels[index] !== 0) return true;
    }
    return false;
  }

  function getDrawingData() {
    if (sourceDrawing) return sourceDrawing;
    if (!containsVisiblePixels()) {
      hasDrawing = false;
      return null;
    }
    return canvas.toDataURL('image/png');
  }

  function updateHistoryState() {
    onHistoryChange(undoHistory.length > 0);
  }

  function pushUndoSnapshot() {
    undoHistory.push(getDrawingData());
    if (undoHistory.length > MAX_UNDO_STEPS) undoHistory.shift();
    updateHistoryState();
  }

  function pointFromEvent(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(logicalWidth, event.clientX - rect.left)),
      y: Math.max(0, Math.min(logicalHeight, event.clientY - rect.top)),
    };
  }

  function applyStrokeStyle() {
    context.globalCompositeOperation = activeTool === 'eraser' ? 'destination-out' : 'source-over';
    context.strokeStyle = activeColor;
    context.fillStyle = activeColor;
    context.lineWidth = activeTool === 'eraser' ? activeSize * 3 : activeSize;
  }

  function drawDot(point) {
    const radius = context.lineWidth / 2;
    context.beginPath();
    context.arc(point.x, point.y, radius, 0, Math.PI * 2);
    context.fill();
  }

  function handlePointerDown(event) {
    if (activePointerId !== null || event.button > 0) return;
    event.preventDefault();
    pushUndoSnapshot();
    sourceDrawing = null;
    activePointerId = event.pointerId;
    canvas.setPointerCapture(event.pointerId);

    const point = pointFromEvent(event);
    applyStrokeStyle();
    drawDot(point);
    context.beginPath();
    context.moveTo(point.x, point.y);
    hasDrawing = true;
  }

  function handlePointerMove(event) {
    if (event.pointerId !== activePointerId) return;
    event.preventDefault();
    const point = pointFromEvent(event);
    context.lineTo(point.x, point.y);
    context.stroke();
  }

  function finishStroke(event) {
    if (event.pointerId !== activePointerId) return;
    event.preventDefault();
    context.closePath();
    context.globalCompositeOperation = 'source-over';
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    activePointerId = null;
    onDrawingChange();
  }

  function renderDrawing(dataUrl, sequence) {
    clearPixels();
    hasDrawing = Boolean(dataUrl);
    sourceDrawing = dataUrl || null;
    if (!dataUrl) return Promise.resolve();

    return new Promise((resolve) => {
      const image = new Image();
      image.onload = () => {
        if (sequence !== loadSequence) return resolve();
        resizeCanvas();
        context.save();
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        context.restore();
        resetTransform();
        resolve();
      };
      image.onerror = () => {
        if (sequence === loadSequence) {
          clearPixels();
          hasDrawing = false;
          sourceDrawing = null;
          console.warn('[햇반이네] 저장된 그림을 Canvas에 복원하지 못했습니다.');
        }
        resolve();
      };
      image.src = dataUrl;
    });
  }

  async function loadDrawing(dataUrl) {
    const sequence = ++loadSequence;
    activePointerId = null;
    undoHistory.length = 0;
    updateHistoryState();
    sourceDrawing = dataUrl || null;
    hasDrawing = Boolean(dataUrl);
    await new Promise((resolve) => window.requestAnimationFrame(resolve));
    if (sequence !== loadSequence) return;
    resizeCanvas();
    await renderDrawing(dataUrl, sequence);
  }

  async function undo() {
    if (undoHistory.length === 0) return;
    const previousDrawing = undoHistory.pop();
    updateHistoryState();
    const sequence = ++loadSequence;
    await renderDrawing(previousDrawing, sequence);
    onDrawingChange();
  }

  function setTool(tool) {
    activeTool = tool === 'eraser' ? 'eraser' : 'pen';
    canvas.dataset.tool = activeTool;
  }

  function setColor(color) {
    activeColor = color;
  }

  function setSize(size) {
    activeSize = Number(size) || 4;
  }

  canvas.addEventListener('pointerdown', handlePointerDown, { signal: eventController.signal });
  canvas.addEventListener('pointermove', handlePointerMove, { signal: eventController.signal });
  canvas.addEventListener('pointerup', finishStroke, { signal: eventController.signal });
  canvas.addEventListener('pointercancel', finishStroke, { signal: eventController.signal });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault(), {
    signal: eventController.signal,
  });

  const resizeObserver = new ResizeObserver(scheduleResize);
  resizeObserver.observe(canvas);
  setTool('pen');
  scheduleResize();
  updateHistoryState();

  return {
    destroy() {
      eventController.abort();
      resizeObserver.disconnect();
      window.cancelAnimationFrame(resizeFrame);
    },
    getDrawingData,
    loadDrawing,
    setColor,
    setSize,
    setTool,
    undo,
  };
}
