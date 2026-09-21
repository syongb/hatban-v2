import { MINE_COUNT, MINE_SIZE, adjacentMineCount, createMineState, openMineCell, toggleMineFlag } from './minesweeperLogic.js';

export function mountMinesweeper(root, done) {
  let state;
  let mode = 'open';
  const status = document.createElement('p');
  const board = document.createElement('div');
  const openButton = document.createElement('button');
  const flagButton = document.createElement('button');
  const again = document.createElement('button');

  board.className = 'mine-board';
  board.setAttribute('aria-label', '10 곱하기 10 지뢰찾기판');
  openButton.textContent = '⛏️ 열기';
  flagButton.textContent = '🚩 깃발';
  again.textContent = '다시 하기';
  openButton.onclick = () => { mode = 'open'; draw(); };
  flagButton.onclick = () => { mode = 'flag'; draw(); };
  again.onclick = reset;
  root.append(status, openButton, flagButton, board, again);

  function reset() {
    state = createMineState(MINE_SIZE, MINE_COUNT);
    root.querySelector('.game-completion-notice')?.remove();
    mode = 'open';
    draw();
  }

  function move(index, useFlag) {
    const before = state;
    state = useFlag ? toggleMineFlag(state, index) : openMineCell(state, index);
    if (!before.ended && state.result === 'won') done(1, {});
    draw();
  }

  function draw() {
    if (state.result === 'lost') status.textContent = '지뢰를 밟았어요!';
    else if (state.result === 'won') status.textContent = '승리!';
    else status.textContent = mode === 'flag' ? '깃발 모드: 칸을 눌러 표시/해제' : '열기 모드';
    board.replaceChildren(...state.cells.map((cell, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'mine-cell';
      const revealMine = state.ended && state.result === 'lost' && cell.mine;
      button.textContent = cell.open || revealMine ? (cell.mine ? '💣' : adjacentMineCount(state.cells, state.size, index) || '') : (cell.flag ? '🚩' : '');
      button.disabled = cell.open || state.ended;
      button.setAttribute('aria-label', `${Math.floor(index / state.size) + 1}행 ${index % state.size + 1}열${cell.flag ? ' 깃발' : ''}`);
      button.onclick = () => move(index, mode === 'flag');
      button.oncontextmenu = (event) => { event.preventDefault(); move(index, true); };
      return button;
    }));
  }

  reset();
  return () => { state = { ...state, ended: true }; };
}
