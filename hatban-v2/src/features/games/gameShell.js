import { createGameRecords, matchesSettings } from './gameRecords.js';
import { createDialog } from '../../utils/dialog.js';
import { mountMatch } from './matchGame.js';
import { mountMinesweeper } from './minesweeperGame.js';
import { mountGomoku } from './gomokuGame.js';
import { mountSudoku } from './sudokuGame.js';
import { mountBaseball } from './baseballGame.js';
import { mountMath } from './mathGame.js';
import { mountTenSecond } from './tenSecondGame.js';
import { mountTicTacToe } from './ticTacToeGame.js';
const games = {
  match:['🧠','짝 맞추기','뒤집고 기억하는 카드 놀이터','기억력'],
  math:['⚡','암산 게임','10초 동안 도전하는 계산 스프린트','순발력'],
  mine:['💣','지뢰찾기','숫자를 단서로 안전한 길 찾기','추리력'],
  tensec:['⏱️','10초 맞추기','눈을 떼고 내 안의 시계를 믿어 봐요','시간 감각'],
  tictactoe:['❌','틱택토','친구와 번갈아 세 칸 잇기','2인 대결'],
  gomoku:['⚫','오목','흑과 백, 다섯 돌의 두뇌 대결','렌주룰'],
  baseball:['⚾','숫자야구','스트라이크와 볼로 비밀 숫자 찾기','논리력'],
  sudoku:['🔢','스도쿠','빈 칸을 채우는 작은 숫자 퍼즐','집중력'],
};
const levels=[['easy','초급'],['medium','중급'],['hard','고급']];
const compare=(a,b)=>b.score-a.score;
export function formatRecord(id, entry) {
  if (!entry) return '아직 기록이 없어요';
  const r=entry.record || {};
  if(id==='match')return (r.moves ?? -entry.score)+'회 이동';
  if(id==='math')return entry.score+'점';
  if(id==='tensec')return '오차 '+(Math.abs(entry.score)/1000).toFixed(2)+'초';
  if(id==='baseball')return (r.tries ?? -entry.score)+'번 만에 성공';
  if(id==='mine' || id==='sudoku')return r.elapsed != null ? (r.elapsed/1000).toFixed(1)+'초' : '완료 기록';
  return r.draw ? '무승부' : (r.winner === 'black' ? '흑' : r.winner === 'white' ? '백' : r.winner || '')+' 승리';
}
export function gameList(onOpen) {
  const box=document.createElement('div');box.className='games-grid';
  for(const [id,[icon,name,description,tag]] of Object.entries(games)) {
    const button=document.createElement('button');button.className='game-card game-card--'+id;
    button.innerHTML='<span class="game-card__icon">'+icon+'</span><span><span class="game-card__skill">'+tag+'</span><strong>'+name+'</strong><small>'+description+'</small></span><span class="game-card__arrow">↗</span>';
    button.onclick=()=>onOpen(id);box.append(button);
  }return box;
}
export function mountGame(id,onBack) {
  const records=createGameRecords();
  const root=document.createElement('section');root.className='screen game-play game-play--'+id;
  const header=document.createElement('header');header.className='game-header';
  const back=document.createElement('button');back.textContent='← 집중 게임 목록';back.onclick=onBack;
  const title=document.createElement('h1');title.textContent=games[id][0]+' '+games[id][1];header.append(back,title);
  const intro=document.createElement('section');intro.className='game-intro';
  const desc=document.createElement('p');desc.textContent=games[id][2];
  const controls=document.createElement('div');controls.className='game-options';
  const best=document.createElement('p');best.className='game-best';best.setAttribute('aria-live','polite');
  const legacy=document.createElement('p');legacy.className='game-legacy';
  const start=document.createElement('button');start.className='game-start';start.textContent='게임 시작';
  const body=document.createElement('div');body.className='game-body';body.hidden=true;
  const toolbar=document.createElement('div');toolbar.className='game-session-bar';toolbar.hidden=true;
  const sessionBest=document.createElement('span');
  const restart=document.createElement('button');restart.textContent='다시 하기';
  const settingsButton=document.createElement('button');settingsButton.textContent='설정 / 기록';
  toolbar.append(sessionBest,restart,settingsButton);intro.append(desc,controls,best,legacy,start);root.append(header,intro,toolbar,body);
  let settings={},cleanup=()=>{},resultDialog=null,finished=false;
  function select(key,label,choices,initial) {
    const wrap=document.createElement('label');wrap.textContent=label;const input=document.createElement('select');input.setAttribute('aria-label',label);
    choices.forEach(([value,text])=>{const option=document.createElement('option');option.value=value;option.textContent=text;input.append(option);});input.value=initial;settings[key]=initial;
    input.onchange=()=>{settings[key]=input.value;showBest();};wrap.append(input);controls.append(wrap);
  }
  if(id==='math'){select('operation','연산',[['mul','곱셈'],['div','나눗셈']],'mul');select('difficulty','난이도',levels,'easy');}
  if(id==='mine')select('difficulty','난이도',[['easy','초급 · 9×9 / 지뢰 10'],['medium','중급 · 16×16 / 지뢰 40'],['hard','고급 · 30×16 / 지뢰 99']],'easy');
  if(id==='sudoku')select('difficulty','난이도',[['easy','초급 · 빈칸 30'],['medium','중급 · 빈칸 42'],['hard','고급 · 빈칸 51']],'easy');
  if(id==='baseball')select('length','자릿수',[['3','3자리'],['4','4자리'],['5','5자리']],'3');
  if(id==='match'){
    settings.count=20;const label=document.createElement('label');const caption=document.createElement('span');caption.textContent='카드 개수: 20장';
    const input=document.createElement('input');input.type='range';input.min=10;input.max=50;input.step=2;input.value=20;input.setAttribute('aria-label','카드 개수');
    input.oninput=()=>{settings.count=Number(input.value);caption.textContent='카드 개수: '+input.value+'장';showBest();};label.append(caption,input);controls.append(label);
  }
  const normalized=()=>({...settings,...(id==='baseball'?{length:Number(settings.length)}:{})});
  const bestEntry=()=>records.best(id,compare,normalized());
  function showBest(){best.textContent='🏆 이 설정의 최고 기록 · '+formatRecord(id,bestEntry());const old=records.list(id).filter(entry=>!matchesSettings(entry,normalized()) && Object.keys(normalized()).some(key=>entry.record?.[key] === undefined));legacy.textContent=old.length?'이전 버전 기록 '+old.length+'개 보관 · '+formatRecord(id,old.slice().sort(compare)[0]):'';}
  function closeResult(){resultDialog?.close();resultDialog?.remove();resultDialog=null;}
  function begin(){window.scrollTo({top:0,behavior:'instant'});cleanup();closeResult();body.replaceChildren();intro.hidden=true;body.hidden=false;toolbar.hidden=false;finished=false;sessionBest.textContent='🏆 '+formatRecord(id,bestEntry());
    const mounts={match:mountMatch,math:mountMath,mine:mountMinesweeper,tensec:mountTenSecond,tictactoe:mountTicTacToe,gomoku:mountGomoku,baseball:mountBaseball,sudoku:mountSudoku};
    cleanup=mounts[id](body,done,normalized());
  }
  function done(score,record={}) {
    if(finished)return;finished=true;const previous=bestEntry();const canSave=record.result!=='lost';let saved=false;
    const entry={gameType:id,score,record:{...normalized(),...record}};
    if(canSave){try{records.add(id,score,entry.record);saved=true;}catch{saved=false;}}
    const content=document.createElement('div');content.className='game-result';
    const medal=document.createElement('div');medal.className='result-medal';medal.textContent=record.result==='lost'?'💣':record.draw?'🤝':'🏆';
    const current=document.createElement('strong');current.className='result-score';current.textContent=record.result==='lost'?'다음에는 찾을 수 있어요!':formatRecord(id,entry);
    const detail=document.createElement('p');detail.textContent=id==='tensec'?'실제 기록 '+(record.elapsed/1000).toFixed(2)+'초':id==='math'?'도전 '+record.questions+'문제':'';
    const before=document.createElement('p');before.textContent='이전 최고 · '+formatRecord(id,previous);
    const status=document.createElement('p');status.className='result-message';status.textContent=canSave?(saved?((!previous||score>previous.score)?'✨ 새로운 최고 기록! 저장했어요.':'이 기기에 기록을 저장했어요.'):'기록을 저장하지 못했어요. 기기 저장 공간을 확인해 주세요.'):'깃발과 주변 숫자를 다시 살펴보세요.';
    const actions=document.createElement('div');actions.className='dialog-actions';
    const retry=document.createElement('button');retry.textContent='다시 하기';retry.onclick=begin;
    const list=document.createElement('button');list.textContent='게임 목록으로 돌아가기';list.onclick=onBack;actions.append(retry,list);content.append(medal,current,detail,before,status,actions);
    const heading=record.result==='lost'?'게임 종료':id==='sudoku'?'완성입니다!':record.draw?'무승부!':record.winner?'승리!':'도전 완료!';
    resultDialog=createDialog(heading,content,'result-dialog');root.append(resultDialog);resultDialog.showModal();
    sessionBest.textContent='🏆 '+formatRecord(id,bestEntry());return entry;
  }
  start.onclick=begin;restart.onclick=begin;
  settingsButton.onclick=()=>{cleanup();closeResult();body.replaceChildren();body.hidden=true;toolbar.hidden=true;intro.hidden=false;showBest();};
  showBest();return {element:root,destroy(){cleanup();closeResult();}};
}
