import { SUDOKU_SOLUTION, createSudokuState, cycleSudokuCell, sudokuStatus } from './sudokuLogic.js';

export function mountSudoku(root, done) {
  const board = document.createElement('div');
  const status = document.createElement('p');
  const again = document.createElement('button');
  let state;

  board.className = 'sudoku-board';
  board.setAttribute('aria-label', '9 곱하기 9 스도쿠판');
  again.textContent = '다시 하기';
  again.onclick = reset;
  root.append(status, board, again);

  function reset() {
    state = createSudokuState();
    root.querySelector('.game-completion-notice')?.remove();
    render();
  }

  function render() {
    status.textContent = state.message;
    board.replaceChildren(...state.values.map((value, index) => {
      const input = document.createElement('button');
      const fixed = state.puzzle[index] !== '0';
      input.type = 'button';
      input.textContent = value === '0' ? '' : value;
      input.disabled = fixed || state.complete;
      input.className = fixed ? 'sudoku-fixed' : 'sudoku-cell';
      input.setAttribute('aria-label', `${Math.floor(index / 9) + 1}행 ${index % 9 + 1}열${fixed ? ' 고정 숫자' : ' 빈 칸'}`);
      input.onclick = () => {
        state = cycleSudokuCell(state, index);
        const result = sudokuStatus(state);
        state = { ...state, complete: result.complete, message: result.message || state.message };
        if (result.correct) done(1, {});
        render();
      };
      return input;
    }));
  }

  reset();
  return () => { state = { ...state, complete: true }; };
}
