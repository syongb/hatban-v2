import assert from 'node:assert/strict';
import test from 'node:test';
import { baseballResult, checkTicTacToe, isGomokuWin, tenSecondError } from '../src/features/games/gameLogic.js';
test('게임 판정 로직',()=>{assert.equal(tenSecondError(10120),120);assert.deepEqual(baseballResult('123','132'),{strike:1,ball:2,out:false});assert.equal(checkTicTacToe(['O','O','O','','','','','','']),'O');const b=Array.from({length:15},()=>Array(15).fill(''));for(let i=0;i<5;i++)b[3][i]='⚫';assert.equal(isGomokuWin(b,3,2),true);});
