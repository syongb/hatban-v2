import { BLACK, GOMOKU_SIZE, WHITE, attemptGomokuMove, chooseGomokuAiMove, createGomokuState } from './gomokuLogic.js';

const stoneLabel = (stone) => stone === BLACK ? '흑돌' : '백돌';

export function mountGomoku(root, done, {mode='pvp',playerStone=BLACK}={}) {
  let state = createGomokuState();
  const aiStone=playerStone===BLACK?WHITE:BLACK;
  let aiTimer=null;
  const status = document.createElement('p');
  const notice = document.createElement('p');
  const boardFrame = document.createElement('div');
  const board = document.createElement('div');
  const actions = document.createElement('div');
  const rulesButton = document.createElement('button');
  const again = document.createElement('button');
  const dialog = document.createElement('section');

  boardFrame.className = 'gomoku-frame';
  board.className = 'gomoku-board';
  board.setAttribute('role', 'grid');
  board.setAttribute('aria-label', '15 곱하기 15 오목판');
  notice.className = 'gomoku-notice';
  actions.className = 'gomoku-actions';
  rulesButton.textContent = '렌주룰 설명';
  rulesButton.type = 'button';
  again.textContent = '다시 하기';
  dialog.className = 'gomoku-rules';
  dialog.hidden = true;
  dialog.innerHTML = `
    <div class="gomoku-rules-card" role="dialog" aria-modal="true" aria-labelledby="renju-title">
      <h2 id="renju-title">렌주룰이란?</h2>
      <p>렌주룰은 공식 경기에서 널리 사용하는 오목 규칙이에요.</p>
      <h3>⚫ 흑</h3>
      <p>먼저 두는 대신 제한이 있어요. 3-3, 4-4, 장목은 둘 수 없어요. 정확히 5개를 연결하면 승리해요.</p>
      <h3>⚪ 백</h3>
      <p>3-3, 4-4, 장목 제한이 없어요. 5개 이상 연결하면 승리해요.</p>
      <ul>
        <li>3-3: 한 수로 열린 3이 두 개 생기는 자리</li>
        <li>4-4: 한 수로 4가 두 개 생기는 자리</li>
        <li>장목: 돌이 6개 이상 연속으로 이어지는 것</li>
      </ul>
      <button type="button" class="gomoku-rules-close">닫기</button>
    </div>`;
  boardFrame.append(board);
  status.className = 'turn-status';
  actions.append(rulesButton);
  root.append(status, notice, boardFrame, actions, dialog);

  const closeRules = () => { dialog.hidden = true; rulesButton.focus(); };
  rulesButton.onclick = () => { dialog.hidden = false; dialog.querySelector('.gomoku-rules-close').focus(); };
  dialog.querySelector('.gomoku-rules-close').onclick = closeRules;
  again.onclick = () => { state = createGomokuState(); render(); };

  function render() {
    const aiThinking=mode==='ai'&&!state.ended&&state.turn===aiStone;
    status.textContent = state.ended ? `${stoneLabel(state.winner)} 승리!` : aiThinking ? 'AI 생각 중...' : `${stoneLabel(state.turn)} 차례`;
    notice.textContent = state.message;
    notice.hidden = !state.message;
    board.replaceChildren(
      ...Array.from({ length: GOMOKU_SIZE }, (_, index) => {
        const line = document.createElement('span');
        line.className = 'gomoku-line gomoku-line--horizontal';
        line.style.setProperty('--line-index', index);
        return line;
      }),
      ...Array.from({ length: GOMOKU_SIZE }, (_, index) => {
        const line = document.createElement('span');
        line.className = 'gomoku-line gomoku-line--vertical';
        line.style.setProperty('--line-index', index);
        return line;
      }),
      ...state.board.flatMap((row, rowIndex) => row.map((stone, colIndex) => {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'gomoku-cell';
        cell.style.setProperty('--row', rowIndex);
        cell.style.setProperty('--col', colIndex);
        cell.disabled = Boolean(stone) || state.ended || aiThinking;
        cell.setAttribute('aria-label', `${rowIndex + 1}행 ${colIndex + 1}열${stone ? ` ${stoneLabel(stone)}` : ' 빈 교점'}`);
        if (stone) {
          const piece = document.createElement('span');
          piece.className = `gomoku-stone gomoku-stone--${stone}`;
          piece.setAttribute('aria-hidden', 'true');
          cell.append(piece);
        }
        cell.onclick = () => {
          const next = attemptGomokuMove(state, rowIndex, colIndex);
          if (!next.accepted) {
            state = next;
            render();
            return;
          }
          state = next;
          if (state.winner) done(1, { winner: state.winner });
          render();
          scheduleAi();
        };
        return cell;
      })),
    );
  }

  function scheduleAi(){
    window.clearTimeout(aiTimer);
    if(mode!=='ai'||state.ended||state.turn!==aiStone)return;
    aiTimer=window.setTimeout(()=>{const move=chooseGomokuAiMove(state,aiStone);if(!move)return;state=attemptGomokuMove(state,...move);if(state.winner)done(1,{winner:state.winner});render();},180);
  }

  render();
  scheduleAi();
  return () => { window.clearTimeout(aiTimer);dialog.hidden = true; state = { ...state, ended: true }; };
}
