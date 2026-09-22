import { checkTicTacToe } from './gameLogic.js';
export function mountTicTacToe(root,done) {
  let cells=Array(9).fill(''), turn='X', ended=false;
  const status=document.createElement('p');status.className='turn-status';
  const board=document.createElement('div');board.className='tt-board';board.setAttribute('aria-label','3 곱하기 3 틱택토판'); root.append(status,board);
  function render(){status.textContent=ended?'경기 종료':turn+' 차례';board.replaceChildren(...cells.map((value,i)=>{const b=document.createElement('button');b.textContent=value;b.dataset.mark=value;b.disabled=!!value||ended;b.setAttribute('aria-label', (Math.floor(i/3)+1)+'행 '+(i%3+1)+'열 '+(value||'빈 칸'));b.onclick=()=>{cells[i]=turn;const winner=checkTicTacToe(cells);if(winner){ended=true;done(1,{winner});}else if(cells.every(Boolean)){ended=true;done(0,{draw:true});}else turn=turn==='X'?'O':'X';render();};return b;}));}
  render();return ()=>{ended=true;};
}
