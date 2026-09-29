import { create2048State, move2048 } from './game2048Logic.js';
export function mount2048(root,done){
  let state=create2048State(),ended=false,start=null;
  const status=document.createElement('p');status.className='game-2048-status';const board=document.createElement('div');board.className='game-2048-board';board.tabIndex=0;board.setAttribute('aria-label','2048 게임판');root.append(status,board);
  function move(direction){if(ended)return;state=move2048(state,direction);render();if(state.over){ended=true;done(state.score,{score:state.score,maxTile:Math.max(...state.board),result:'over'});} }
  function render(){status.textContent='점수 '+state.score+' · 최고 타일 '+Math.max(...state.board)+(state.won?' · 🎉 2048 달성!':'');board.replaceChildren(...state.board.map(value=>{const tile=document.createElement('div');tile.className='tile-2048 tile-2048--'+value;tile.textContent=value||'';return tile;}));}
  board.onkeydown=e=>{const map={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down'};if(map[e.key]){e.preventDefault();move(map[e.key]);}};
  board.onpointerdown=e=>{start={x:e.clientX,y:e.clientY,id:e.pointerId};};board.onpointerup=e=>{if(!start||start.id!==e.pointerId)return;const dx=e.clientX-start.x,dy=e.clientY-start.y;start=null;if(Math.max(Math.abs(dx),Math.abs(dy))<28)return;e.preventDefault();move(Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up'));};board.onpointercancel=()=>{start=null;};
  render();requestAnimationFrame(()=>board.focus({preventScroll:true}));return()=>{ended=true;};
}
