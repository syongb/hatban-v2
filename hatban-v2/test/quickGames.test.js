import test from 'node:test';
import assert from 'node:assert/strict';
import { inputSudokuNumber, eraseSudokuCell, selectSudokuCell, createSudokuState, SUDOKU_PUZZLE, SUDOKU_SOLUTION } from '../src/features/games/sudokuLogic.js';
import { reactionResult, compareReactionRecords } from '../src/features/games/reactionLogic.js';
import { canMove2048, move2048 } from '../src/features/games/game2048Logic.js';
import { deadlineAfterMathAttempt, questionDeadline } from '../src/features/games/mathGame.js';

test('스도쿠 오답은 지울 수 있고 지우기는 실수 횟수를 늘리지 않는다',()=>{const hole=SUDOKU_PUZZLE.indexOf('0'),answer=Number(SUDOKU_SOLUTION[hole]),wrong=answer===1?2:1;let state=selectSudokuCell(createSudokuState(),hole);state=inputSudokuNumber(state,wrong);assert.equal(state.mistakes,1);state=eraseSudokuCell(state);assert.equal(state.values[hole],'0');assert.equal(state.mistakes,1);assert.deepEqual(state.wrong,[]);});
test('스도쿠 정답 칸은 확정 후 선택·수정·삭제할 수 없다',()=>{const hole=SUDOKU_PUZZLE.indexOf('0'),answer=Number(SUDOKU_SOLUTION[hole]);let state=selectSudokuCell(createSudokuState(),hole);state=inputSudokuNumber(state,answer);assert.equal(state.values[hole],String(answer));assert.ok(state.confirmed.includes(hole));assert.equal(state.selected,null);const unchanged=state;state=selectSudokuCell(state,hole);assert.equal(state,unchanged);assert.equal(eraseSudokuCell(state),state);});
test('스도쿠 오답 3회면 게임오버가 된다',()=>{const holes=[...SUDOKU_PUZZLE].map((value,index)=>value==='0'?index:-1).filter(index=>index>=0).slice(0,3);let state=createSudokuState();for(const hole of holes){const answer=Number(SUDOKU_SOLUTION[hole]);state=selectSudokuCell(state,hole);state=inputSudokuNumber(state,answer===1?2:1);}assert.equal(state.mistakes,3);assert.equal(state.gameOver,true);});
test('암산 문제 제한시간은 새 문제마다 10초로 다시 잡힌다',()=>{assert.equal(questionDeadline(1000),11000);assert.equal(questionDeadline(7250),17250);});
test('암산 오답은 현재 마감시각을 유지해 연속 오답으로 시간을 늘릴 수 없다',()=>{const original=12000;assert.equal(deadlineAfterMathAttempt(false,original,7000),original);assert.equal(deadlineAfterMathAttempt(false,original,9500),original);assert.equal(deadlineAfterMathAttempt(true,original,9500),19500);});
test('순발력은 조기 클릭을 거부하고 낮은 ms 기록을 우선한다',()=>{assert.deepEqual(reactionResult('waiting',0,100),{accepted:false,message:'너무 빨라요!'});assert.deepEqual(reactionResult('go',100,347),{accepted:true,elapsed:247});assert.equal([{score:310},{score:220}].sort(compareReactionRecords)[0].score,220);});
test('2048은 한 이동에서 중복 병합하지 않고 점수를 더한다',()=>{const state={board:[2,2,2,2,...Array(12).fill(0)],score:0,won:false,over:false};const moved=move2048(state,'left',()=>0);assert.deepEqual(moved.board.slice(0,4),[4,4,2,0]);assert.equal(moved.score,8);});
test('2048은 빈칸과 인접한 같은 타일이 없으면 게임오버다',()=>{const board=[2,4,2,4,4,2,4,2,2,4,2,4,4,2,4,2];assert.equal(canMove2048(board),false);const result=move2048({board,score:100,won:false,over:false},'left');assert.equal(result.over,true);assert.equal(result.moved,false);});
