export const MINE_SIZE = 10;
export const MINE_COUNT = 15;

export const MINE_DIFFICULTIES = { easy: {width:9,height:9,mines:10}, medium: {width:16,height:16,mines:40}, hard: {width:30,height:16,mines:99} };

const neighbours = (size, index, height = size) => {
  const row = Math.floor(index / size);
  const col = index % size;
  const result = [];
  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
      if (!rowOffset && !colOffset) continue;
      const nextRow = row + rowOffset;
      const nextCol = col + colOffset;
      if (nextRow >= 0 && nextRow < height && nextCol >= 0 && nextCol < size) result.push(nextRow * size + nextCol);
    }
  }
  return result;
};

const cloneCells = (cells) => cells.map((cell) => ({ ...cell }));

export function createMineState(size = MINE_SIZE, mines = MINE_COUNT, height = size) {
  return {
    size,
    height,
    mines,
    cells: Array.from({ length: size * height }, () => ({ mine: false, open: false, flag: false })),
    started: false,
    ended: false,
    result: null,
  };
}

export function adjacentMineCount(cells, size, index) {
  return neighbours(size, index, cells.length / size).filter((next) => cells[next].mine).length;
}

export function plantMines(state, firstIndex, random = Math.random) {
  const candidates = state.cells.map((_, index) => index).filter((index) => index !== firstIndex);
  for (let index = candidates.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [candidates[index], candidates[swapIndex]] = [candidates[swapIndex], candidates[index]];
  }
  const cells = cloneCells(state.cells);
  candidates.slice(0, state.mines).forEach((index) => { cells[index].mine = true; });
  return { ...state, cells, started: true };
}

function revealCells(state, firstIndex) {
  const cells = cloneCells(state.cells);
  const queue = [firstIndex];
  while (queue.length) {
    const index = queue.shift();
    const cell = cells[index];
    if (!cell || cell.open || cell.flag) continue;
    cell.open = true;
    if (cell.mine) return { ...state, cells, ended: true, result: 'lost' };
    if (adjacentMineCount(cells, state.size, index) === 0) {
      neighbours(state.size, index, state.height).forEach((next) => {
        if (!cells[next].open && !cells[next].flag) queue.push(next);
      });
    }
  }
  const won = cells.filter((cell) => !cell.mine).every((cell) => cell.open);
  return { ...state, cells, ended: won, result: won ? 'won' : null };
}

export function openMineCell(state, index, random = Math.random) {
  if (state.ended || !state.cells[index] || state.cells[index].open || state.cells[index].flag) return state;
  const ready = state.started ? state : plantMines(state, index, random);
  return revealCells(ready, index);
}

export function toggleMineFlag(state, index) {
  if (state.ended || !state.cells[index] || state.cells[index].open) return state;
  const cells = cloneCells(state.cells);
  cells[index].flag = !cells[index].flag;
  return { ...state, cells };
}
