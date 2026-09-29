import test from 'node:test';
import assert from 'node:assert/strict';
import { inputSudokuNumber, selectSudokuCell, createSudokuState, SUDOKU_PUZZLE, SUDOKU_SOLUTION } from '../src/features/games/sudokuLogic.js';
import { reactionResult, compareReactionRecords } from '../src/features/games/reactionLogic.js';
import { canMove2048, move2048 } from '../src/features/games/game2048Logic.js';

test('스도쿠 숫자 입력은 오답을 세고 3회에 게임오버 처리한다',()=>{const hole=SUDOKU_PUZZLE.indexOf('0'),answer=Number(SUDOKU_SOLUTION[hole]),wrong=answer===1?2:1;let state=selectSudokuCell(createSudokuState(),hole);state=inputSudokuNumber(state,answer);assert.equal(state.values[hole],String(answer));assert.equal(state.mistakes,0);state=selectSudokuCell(state,hole);for(let i=0;i<3;i++)state=inputSudokuNumber(state,wrong);assert.equal(state.mistakes,3);assert.equal(state.gameOver,true);assert.equal(inputSudokuNumber(state,answer),state);});
test('순발력은 조기 클릭을 거부하고 낮은 ms 기록을 우선한다',()=>{assert.deepEqual(reactionResult('waiting',0,100),{accepted:false,message:'너무 빨라요!'});assert.deepEqual(reactionResult('go',100,347),{accepted:true,elapsed:247});assert.equal([{score:310},{score:220}].sort(compareReactionRecords)[0].score,220);});
test('2048은 한 이동에서 중복 병합하지 않고 점수를 더한다',()=>{const state={board:[2,2,2,2,...Array(12).fill(0)],score:0,won:false,over:false};const moved=move2048(state,'left',()=>0);assert.deepEqual(moved.board.slice(0,4),[4,4,2,0]);assert.equal(moved.score,8);});
test('2048은 빈칸과 인접한 같은 타일이 없으면 게임오버다',()=>{const board=[2,4,2,4,4,2,4,2,2,4,2,4,4,2,4,2];assert.equal(canMove2048(board),false);const result=move2048({board,score:100,won:false,over:false},'left');assert.equal(result.over,true);assert.equal(result.moved,false);});
