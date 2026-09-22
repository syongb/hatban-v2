import { MINE_DIFFICULTIES, adjacentMineCount, createMineState, openMineCell, toggleMineFlag } from './minesweeperLogic.js';
export function mountMinesweeper(root,done,{difficulty='easy'}={}) {
  const preset=MINE_DIFFICULTIES[difficulty];let state=createMineState(preset.width,preset.mines,preset.height),mode='open',startedAt=null;
  const status=document.createElement('p');status.className='mine-status';
  const modes=document.createElement('div');modes.className='mine-modes';const open=document.createElement('button'),flag=document.createElement('button');open.textContent='⛏️ 열기';flag.textContent='🚩 깃발';modes.append(open,flag);
  const hint=document.createElement('p');hint.className='mine-hint';hint.textContent=preset.width>9?'보드를 좌우로 밀어서 모든 칸을 볼 수 있어요.':'첫 클릭은 안전해요. 숫자는 주변 지뢰 수예요.';
  const frame=document.createElement('div');frame.className='mine-scroll';frame.tabIndex=0;frame.setAttribute('aria-label','지뢰찾기판 스크롤 영역');const board=document.createElement('div');board.className='mine-board';board.style.setProperty('--mine-columns',preset.width);board.setAttribute('aria-label',preset.width+' 곱하기 '+preset.height+' 지뢰찾기판');frame.append(board);root.append(status,modes,hint,frame);
  open.onclick=()=>{mode='open';draw();};flag.onclick=()=>{mode='flag';draw();};
  function move(index,useFlag){const before=state;if(!useFlag&&!state.started&&!state.cells[index].flag)startedAt=Date.now();state=useFlag?toggleMineFlag(state,index):openMineCell(state,index);draw();if(!before.ended&&state.ended){const elapsed=Date.now()-startedAt;done(-elapsed,{elapsed,result:state.result});}}
  function draw(){status.textContent=state.ended?(state.result==='won'?'모든 지뢰를 찾았어요!':'지뢰를 밟았어요!'):(mode==='flag'?'🚩 깃발 모드':'⛏️ 열기 모드')+' · 남은 지뢰 '+(state.mines-state.cells.filter(c=>c.flag).length);open.setAttribute('aria-pressed',String(mode==='open'));flag.setAttribute('aria-pressed',String(mode==='flag'));
    board.replaceChildren(...state.cells.map((cell,index)=>{const b=document.createElement('button');const reveal=state.result==='lost'&&cell.mine;const number=adjacentMineCount(state.cells,state.size,index);b.className='mine-cell'+(cell.open||reveal?' is-open':'')+(reveal?' is-mine':'');b.dataset.number=number;b.textContent=cell.open||reveal?(cell.mine?'💣':number||''):(cell.flag?'🚩':'');b.disabled=cell.open||state.ended;b.setAttribute('aria-label',(Math.floor(index/state.size)+1)+'행 '+(index%state.size+1)+'열'+(cell.flag?' 깃발':'')+(cell.open?' 열림 '+number:''));b.onclick=()=>move(index,mode==='flag');b.oncontextmenu=e=>{e.preventDefault();move(index,true);};return b;}));
  }
  draw();return()=>{state={...state,ended:true};};
}
