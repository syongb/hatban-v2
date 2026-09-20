export const GOMOKU_SIZE = 15;
export const BLACK = 'black';
export const WHITE = 'white';

const DIRECTIONS = [[0, 1], [1, 0], [1, 1], [1, -1]];

export function createGomokuBoard() {
  return Array.from({ length: GOMOKU_SIZE }, () => Array(GOMOKU_SIZE).fill(null));
}

export function createGomokuState() {
  return { board: createGomokuBoard(), turn: BLACK, ended: false, winner: null, message: '' };
}

export function isGomokuCoordinate(row, col) {
  return row >= 0 && row < GOMOKU_SIZE && col >= 0 && col < GOMOKU_SIZE;
}

function cloneBoard(board) {
  return board.map((row) => [...row]);
}

function runLength(board, row, col, dr, dc, stone) {
  let count = 1;
  for (const direction of [-1, 1]) {
    for (let step = 1; step < GOMOKU_SIZE; step += 1) {
      const nextRow = row + dr * step * direction;
      const nextCol = col + dc * step * direction;
      if (!isGomokuCoordinate(nextRow, nextCol) || board[nextRow][nextCol] !== stone) break;
      count += 1;
    }
  }
  return count;
}

function axisLine(board, row, col, dr, dc) {
  let startRow = row;
  let startCol = col;
  while (isGomokuCoordinate(startRow - dr, startCol - dc)) {
    startRow -= dr;
    startCol -= dc;
  }

  const values = [];
  let pivot = 0;
  for (let currentRow = startRow, currentCol = startCol; isGomokuCoordinate(currentRow, currentCol); currentRow += dr, currentCol += dc) {
    if (currentRow === row && currentCol === col) pivot = values.length;
    values.push(board[currentRow][currentCol]);
  }
  return { values, pivot };
}

function hasOpenFour(values, pivot, addedIndex) {
  for (let start = 0; start <= values.length - 6; start += 1) {
    const segment = values.slice(start, start + 6);
    const isOpenFour = segment[0] === null
      && segment[5] === null
      && segment.slice(1, 5).every((stone) => stone === BLACK);
    if (isOpenFour && pivot > start && pivot < start + 5 && addedIndex > start && addedIndex < start + 5) return true;
  }
  return false;
}

function createsOpenThree(board, row, col, dr, dc) {
  const { values, pivot } = axisLine(board, row, col, dr, dc);
  return values.some((stone, index) => {
    if (stone !== null) return false;
    const next = [...values];
    next[index] = BLACK;
    return hasOpenFour(next, pivot, index);
  });
}

function createsFour(board, row, col, dr, dc) {
  const { values, pivot } = axisLine(board, row, col, dr, dc);
  for (let start = 0; start <= values.length - 5; start += 1) {
    const segment = values.slice(start, start + 5);
    if (!(pivot >= start && pivot < start + 5)) continue;
    if (segment.filter((stone) => stone === BLACK).length !== 4 || segment.filter((stone) => stone === null).length !== 1) continue;
    const emptyOffset = segment.indexOf(null);
    const next = [...values];
    next[start + emptyOffset] = BLACK;
    if (next.slice(start, start + 5).every((stone) => stone === BLACK)) return true;
  }
  return false;
}

export function isExactFive(board, row, col, stone = board[row]?.[col]) {
  return Boolean(stone) && DIRECTIONS.some(([dr, dc]) => runLength(board, row, col, dr, dc, stone) === 5);
}

export function hasFiveOrMore(board, row, col, stone = board[row]?.[col]) {
  return Boolean(stone) && DIRECTIONS.some(([dr, dc]) => runLength(board, row, col, dr, dc, stone) >= 5);
}

export function blackForbiddenMove(board, row, col) {
  if (!isGomokuCoordinate(row, col) || board[row][col] !== null) return { forbidden: false, reason: null };
  const next = cloneBoard(board);
  next[row][col] = BLACK;

  if (DIRECTIONS.some(([dr, dc]) => runLength(next, row, col, dr, dc, BLACK) >= 6)) {
    return { forbidden: true, reason: 'overline' };
  }

  const fours = DIRECTIONS.filter(([dr, dc]) => createsFour(next, row, col, dr, dc)).length;
  if (fours >= 2) return { forbidden: true, reason: 'doubleFour' };

  const openThrees = DIRECTIONS.filter(([dr, dc]) => createsOpenThree(next, row, col, dr, dc)).length;
  if (openThrees >= 2) return { forbidden: true, reason: 'doubleThree' };

  return { forbidden: false, reason: null };
}

export function attemptGomokuMove(state, row, col) {
  if (state.ended || !isGomokuCoordinate(row, col) || state.board[row][col] !== null) {
    return { ...state, accepted: false };
  }

  if (state.turn === BLACK) {
    const forbidden = blackForbiddenMove(state.board, row, col);
    if (forbidden.forbidden) {
      const messages = {
        doubleThree: '흑은 3-3 금수 자리에 둘 수 없어요.',
        doubleFour: '흑은 4-4 금수 자리에 둘 수 없어요.',
        overline: '흑은 장목을 만들 수 없어요.',
      };
      return { ...state, accepted: false, message: messages[forbidden.reason] };
    }
  }

  const board = cloneBoard(state.board);
  board[row][col] = state.turn;
  const winner = state.turn === BLACK
    ? (isExactFive(board, row, col, BLACK) ? BLACK : null)
    : (hasFiveOrMore(board, row, col, WHITE) ? WHITE : null);

  return {
    ...state,
    board,
    accepted: true,
    ended: Boolean(winner),
    winner,
    turn: winner ? state.turn : (state.turn === BLACK ? WHITE : BLACK),
    message: winner ? '' : '',
  };
}
