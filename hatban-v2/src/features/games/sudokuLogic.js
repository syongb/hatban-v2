export const SUDOKU_PUZZLE = '530070000600195000098000060800060003400803001700020006060000280000419005000080079';
export const SUDOKU_SOLUTION = '534678912672195348198342567859761423426853791713924856961537284287419635345286179';

export function createSudokuPuzzle(difficulty = 'hard') {
  const blanks = {easy:30, medium:42, hard:51}[difficulty] ?? 51;
  const puzzle = [...SUDOKU_PUZZLE];
  const holes = puzzle.flatMap((value,index) => value === '0' ? [index] : []);
  for (const index of holes.slice(0, holes.length-blanks)) puzzle[index] = SUDOKU_SOLUTION[index];
  return puzzle.join('');
}
export function sudokuMistakes(state, solution = SUDOKU_SOLUTION) {
  return state.values.flatMap((value,index) => state.puzzle[index] === '0' && value !== '0' && value !== solution[index] ? [index] : []);
}
export function createSudokuState(puzzle = SUDOKU_PUZZLE) {
  return { puzzle, values: [...puzzle], complete: false, message: '빈 칸을 눌러 숫자를 바꿔요.' };
}

export function cycleSudokuCell(state, index) {
  if (state.complete || state.puzzle[index] !== '0') return state;
  const values = [...state.values];
  values[index] = values[index] === '9' ? '0' : String(Number(values[index]) + 1);
  return { ...state, values };
}

export function isValidSudokuSolution(solution) {
  if (!/^\d{81}$/.test(solution)) return false;
  const groups = [];
  for (let index = 0; index < 9; index += 1) {
    groups.push([...solution.slice(index * 9, index * 9 + 9)]);
    groups.push([...Array(9)].map((_, row) => solution[row * 9 + index]));
  }
  for (let boxRow = 0; boxRow < 3; boxRow += 1) {
    for (let boxCol = 0; boxCol < 3; boxCol += 1) {
      groups.push([...Array(9)].map((_, index) => solution[(boxRow * 3 + Math.floor(index / 3)) * 9 + boxCol * 3 + index % 3]));
    }
  }
  return groups.every((group) => new Set(group).size === 9 && !group.includes('0'));
}

export function sudokuStatus(state, solution = SUDOKU_SOLUTION) {
  const current = state.values.join('');
  if (current.includes('0')) return { complete: false, correct: false, message: null };
  if (current !== solution) return { complete: false, correct: false, message: '아직 맞지 않는 칸이 있어요. 다시 확인해 보세요.' };
  return { complete: true, correct: true, message: '완성했어요!' };
}
