import { createPairs } from './gameLogic.js';
const symbols=['🍎','🌟','🐶','🚀','🎈','🍀','🐱','🌈','🍪','🎵','🦋','⚽','🚲','🍉','🎁','🌻','🐸','🛸','🎲','🧩','🍓','🦄','🎨','🐳','🌙'];
export function mountMatch(root,done,{count=20}={}) {
  const cards=createPairs(count);for(let i=cards.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]];}
  let open=[],locked=false,moves=0,finished=false,mismatch;
  const info=document.createElement('p');info.className='match-status';const board=document.createElement('div');board.className='match-board';
  board.style.setProperty('--card-columns',count<=12?5:count<=24?6:count<=36?8:10);board.style.setProperty('--mobile-columns',count<=20?4:5);root.append(info,board);
  function draw(){info.textContent='이동 '+moves+'회 · '+cards.filter(c=>c.matched).length/2+' / '+count/2+'쌍';board.replaceChildren(...cards.map((card,i)=>{const b=document.createElement('button');const revealed=card.matched||open.includes(i);b.className='match-card'+(revealed?' is-open':'')+(card.matched?' is-matched':'');b.textContent=revealed?symbols[card.pair]:'?';b.setAttribute('aria-label',(i+1)+'번 카드 '+(revealed?symbols[card.pair]:'뒤집기'));b.disabled=locked||card.matched||open.includes(i)||finished;b.onclick=()=>flip(i);return b;}));}
  function flip(i){open.push(i);if(open.length<2){draw();return;}moves++;const [a,b]=open;if(cards[a].pair===cards[b].pair){cards[a].matched=cards[b].matched=true;open=[];if(cards.every(c=>c.matched)){finished=true;done(-moves,{moves,count});}draw();}else{locked=true;draw();mismatch=setTimeout(()=>{open=[];locked=false;draw();},700);}}
  draw();return()=>{finished=true;clearTimeout(mismatch);};
}
