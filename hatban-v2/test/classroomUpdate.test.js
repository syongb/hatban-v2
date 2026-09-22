import test from 'node:test';
import assert from 'node:assert/strict';
import { createMathQuestion } from '../src/features/games/gameLogic.js';
import { MINE_DIFFICULTIES, createMineState, plantMines, adjacentMineCount, openMineCell } from '../src/features/games/minesweeperLogic.js';
import { createSudokuPuzzle, createSudokuState, sudokuMistakes, sudokuStatus, SUDOKU_SOLUTION } from '../src/features/games/sudokuLogic.js';
import { GAME_RECORDS_KEY, createGameRecords } from '../src/features/games/gameRecords.js';
import { normalizeSchedule, readSchedule, saveSchedule, resolveNotebookId } from '../src/features/notebook/scheduleSettings.js';
import { WEEKDAYS, getScheduleSlot } from '../src/features/notebook/notebookSchedule.js';
import { HOME_STORAGE_KEY, createHomeStorage } from '../src/features/home/homeStorage.js';
import { customTheme } from '../src/app/preferences.js';
import { createTimerState } from '../src/features/tools/timekeepers.js';
const memory = () => { const values = new Map(); return { getItem:key=>values.get(key)??null, setItem:(key,value)=>values.set(key,value) }; };

test('시간표 기본값, 빈 교시, 수정 저장과 기존 공책 식별을 보존한다',()=>{
  const storage=memory();assert.deepEqual(readSchedule(storage),WEEKDAYS);
  const days=normalizeSchedule(null);days[0].subjects[0]='과학 <탐구>';days[2].subjects.fill(null);saveSchedule(days,storage);
  const restored=readSchedule(storage);assert.equal(getScheduleSlot('mon',1,restored).subject,'과학 <탐구>');assert.equal(getScheduleSlot('wed',1,restored),null);
  const old={subject:'국어',text:'기존 글',drawing:'그림'};const base='2026-09-21:mon:1';
  assert.equal(resolveNotebookId(base,'국어',()=>old),base);
  assert.notEqual(resolveNotebookId(base,'과학',()=>old),base);
  assert.equal(resolveNotebookId(base,'과학',()=>null),base);
  assert.equal(old.text,'기존 글');assert.equal(WEEKDAYS[0].subjects[0],'국어');
});
test('기존 홈 데이터와 자유 색상을 같은 키에서 함께 복원한다',()=>{
 const storage=memory();const original=createHomeStorage(storage);original.updateProfile({name:'이전 학생',emoji:'🐱'});const memo=original.createMemo();original.updateMemo(memo.id,{text:'기존 메모'});original.setPreferences({themeId:'sky',fontId:'jua'});
 const before=JSON.parse(storage.getItem(HOME_STORAGE_KEY));const updated=createHomeStorage(storage);updated.setPreferences({customColor:'#ffee22',fontId:'serif'});
 const result=createHomeStorage(storage).getState();assert.deepEqual(result.profile,before.profile);assert.deepEqual(result.memos,before.memos);assert.equal(result.preferences.customColor,'#ffee22');assert.equal(result.preferences.fontId,'serif');
 assert.equal(customTheme('#ffffff').ink,'#172033');assert.equal(customTheme('#000000').ink,'#ffffff');assert.equal(customTheme('bad'),null);
});
test('암산 6개 설정의 범위와 정수 나눗셈을 지킨다',()=>{
 const ranges={easy:[2,9,2,9],medium:[10,99,2,9],hard:[100,999,11,25]};
 for(const operation of ['mul','div'])for(const [level,[amin,amax,bmin,bmax]] of Object.entries(ranges))for(let i=0;i<100;i++){
  const q=createMathQuestion(operation,level);const [a,b]=q.text.split(operation==='mul'?' × ':' ÷ ').map(Number);
  assert.ok(b>=bmin&&b<=bmax);assert.equal(q.type,operation);
  if(operation==='mul'){assert.ok(a>=amin&&a<=amax);assert.equal(q.answer,a*b);}else{assert.equal(a%b,0);assert.equal(q.answer,a/b);assert.ok(q.answer>=amin&&q.answer<=amax);}
 }
});
test('지뢰찾기 3개 난이도와 직사각형 경계, 첫 클릭 안전',()=>{
 for(const preset of Object.values(MINE_DIFFICULTIES)){
  const state=createMineState(preset.width,preset.mines,preset.height);assert.equal(state.cells.length,preset.width*preset.height);
  for(const first of [0,preset.width-1,state.cells.length-1]){const planted=plantMines(state,first,()=>.37);assert.equal(planted.cells.filter(c=>c.mine).length,preset.mines);assert.equal(planted.cells[first].mine,false);assert.notEqual(openMineCell(state,first,()=>.37).result,'lost');}
 }
 const cells=createMineState(30,1,16).cells;cells[29].mine=true;assert.equal(adjacentMineCount(cells,30,30),0);assert.equal(adjacentMineCount(cells,30,59),1);
 let empty=createMineState(30,0,16);empty=openMineCell(empty,0);assert.equal(empty.result,'won');assert.equal(empty.cells.filter(c=>c.open).length,480);
});
function countSolutions(puzzle,limit=2){
 const values=[...puzzle].map(Number);let count=0;
 function solve(){if(count>=limit)return;let best=-1,choices=[];for(let i=0;i<81;i++){if(values[i])continue;const row=Math.floor(i/9),col=i%9;const used=new Set();for(let n=0;n<9;n++){used.add(values[row*9+n]);used.add(values[n*9+col]);used.add(values[(Math.floor(row/3)*3+Math.floor(n/3))*9+Math.floor(col/3)*3+n%3]);}const options=[1,2,3,4,5,6,7,8,9].filter(n=>!used.has(n));if(!options.length)return;if(best<0||options.length<choices.length){best=i;choices=options;}}
 if(best<0){count++;return;}for(const value of choices){values[best]=value;solve();}values[best]=0;}
 solve();return count;
}
test('스도쿠 난이도별 빈칸 수와 유일 해, 오답 수정 가능 상태를 확인한다',()=>{
 for(const [difficulty,blanks] of [['easy',30],['medium',42],['hard',51]]){const puzzle=createSudokuPuzzle(difficulty);assert.equal([...puzzle].filter(c=>c==='0').length,blanks);assert.equal(countSolutions(puzzle),1);const state=createSudokuState(puzzle);state.values=[...SUDOKU_SOLUTION];const hole=puzzle.indexOf('0');state.values[hole]=state.values[hole]==='1'?'2':'1';assert.deepEqual(sudokuMistakes(state),[hole]);assert.equal(sudokuStatus(state).complete,false);state.values[hole]=SUDOKU_SOLUTION[hole];assert.equal(sudokuStatus(state).complete,true);}
});
test('기존 게임 기록을 삭제하지 않고 새 설정별 최고 기록을 분리한다',()=>{
 const storage=memory();const legacy=Array.from({length:110},(_,i)=>({gameType:'math',score:i,record:{questions:i},createdAt:'2026-09-21'}));storage.setItem(GAME_RECORDS_KEY,JSON.stringify(legacy));
 const records=createGameRecords(storage);records.add('math',3,{operation:'mul',difficulty:'easy'});records.add('math',7,{operation:'div',difficulty:'easy'});records.add('math',2,{operation:'mul',difficulty:'hard'});records.add('mine',-1000,{difficulty:'easy',elapsed:1000});records.add('sudoku',-2000,{difficulty:'easy',elapsed:2000});
 const restored=createGameRecords(storage);assert.equal(restored.best('math',undefined,{operation:'mul',difficulty:'easy'}).score,3);assert.equal(restored.best('math',undefined,{operation:'div',difficulty:'easy'}).score,7);assert.equal(restored.best('math',undefined,{operation:'mul',difficulty:'hard'}).score,2);assert.equal(restored.best('math',undefined,{operation:'mul',difficulty:'medium'}),null);assert.equal(restored.best('mine').score,-1000);assert.equal(restored.best('sudoku').score,-2000);assert.deepEqual(JSON.parse(storage.getItem(GAME_RECORDS_KEY)).slice(0,110),legacy);
});
test('타이머 종료 후 초기화하면 설정 시간으로 복구되어 다시 시작된다',()=>{
 const timer=createTimerState();timer.setMinutes(.1);assert.equal(timer.getState().duration,6000);timer.start();timer.pause();timer.reset();assert.equal(timer.getState().remaining,6000);assert.equal(timer.getState().running,false);timer.start();assert.equal(timer.getState().running,true);timer.pause();
});
