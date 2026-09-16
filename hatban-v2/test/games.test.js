import assert from 'node:assert/strict';
import test from 'node:test';
import { baseballResult, checkTicTacToe, createMathQuestion, createPairs, isGomokuWin, tenSecondError } from '../src/features/games/gameLogic.js';
test('게임 판정 로직',()=>{assert.equal(tenSecondError(10120),120);assert.deepEqual(baseballResult('123','132'),{strike:1,ball:2,out:false});assert.equal(checkTicTacToe(['O','O','O','','','','','','']),'O');assert.equal(checkTicTacToe(['O','X','O','O','X','X','X','O','X']),null);const b=Array.from({length:15},()=>Array(15).fill(''));for(let i=0;i<5;i++)b[3][i]='⚫';assert.equal(isGomokuWin(b,3,2),true);});
test('짝과 암산 문제는 수업용 범위로 생성된다',()=>{const cards=createPairs(12);assert.equal(cards.length,12);assert.equal(cards.filter(c=>c.pair===0).length,2);const q=createMathQuestion();assert.equal(typeof q.answer,'number');});
