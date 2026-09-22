import { tenSecondError } from './gameLogic.js';
export function mountTenSecond(root, done) {
  root.innerHTML = '<div class="stopwatch-face"><span>목표 10초</span><output aria-live="off">0.00</output><small>5초 뒤 숫자가 숨겨져요</small></div><button class="ten-stop">시작</button>';
  const button=root.querySelector('button'), output=root.querySelector('output'); let start=null, ticker;
  button.onclick=()=>{ if (start === null) { start=performance.now(); button.textContent='멈추기'; root.classList.add('is-running'); ticker=setInterval(()=>{const elapsed=performance.now()-start; output.textContent=elapsed<=5000?(elapsed/1000).toFixed(2):'?.??';},16); }
    else {const elapsed=performance.now()-start; clearInterval(ticker); button.disabled=true; output.textContent=(elapsed/1000).toFixed(2); root.classList.remove('is-running'); done(-tenSecondError(elapsed),{elapsed});}
  };
  return ()=>clearInterval(ticker);
}
