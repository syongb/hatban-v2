import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { cleanDisplayName, isBetterScore, onlineModeKey, onlineScore, onlineUnavailableMessage, sortLeaderboard } from '../src/features/online/leaderboardLogic.js';

test('온라인 이름은 앞뒤 공백과 HTML 괄호를 제거하고 20자로 제한한다',()=>{
  assert.equal(cleanDisplayName('  <민수>  '),'민수');
  assert.equal(cleanDisplayName('가'.repeat(25)).length,20);
});

test('게임 설정마다 분리된 랭킹 모드를 만든다',()=>{
  assert.equal(onlineModeKey('math',{operation:'div',difficulty:'hard'}),'div:hard');
  assert.equal(onlineModeKey('match',{count:36}),'count:36');
  assert.equal(onlineModeKey('baseball',{length:4}),'length:4');
});

test('승패와 게임별 기록을 온라인 점수로 변환한다',()=>{
  assert.equal(onlineScore('reaction',-241,{elapsed:241},{}).score,241);
  assert.equal(onlineScore('tensec',-32,{elapsed:10032},{}).score,32);
  assert.equal(onlineScore('gomoku',1,{winner:'black'},{mode:'ai',playerStone:'white'}),null);
  assert.equal(onlineScore('tictactoe',1,{winner:'x'},{}),null);
});

test('랭킹은 게임 방향과 동률 소요시간을 반영한다',()=>{
  assert.deepEqual(sortLeaderboard('math',[{score:2,display_name:'가'},{score:7,display_name:'나'}]).map(row=>row.score),[7,2]);
  assert.deepEqual(sortLeaderboard('match',[{score:8,aux:{elapsed:5000},display_name:'가'},{score:8,aux:{elapsed:3000},display_name:'나'}]).map(row=>row.display_name),['나','가']);
});

test('더 나쁜 기록은 개인 최고 기록을 대체하지 않는다',()=>{
  assert.equal(isBetterScore('math',18,12),false);
  assert.equal(isBetterScore('reaction',220,310),false);
  assert.equal(isBetterScore('reaction',220,201),true);
});

test('서버 장애 안내는 온라인 기능에만 한정된다',()=>{
  assert.equal(onlineUnavailableMessage(),'온라인 랭킹에 연결할 수 없어요.');
});

test('마이그레이션은 RLS, 서버 검증, 최고 기록 보존을 선언한다',async()=>{
  const sql=await readFile(new URL('../supabase/migrations/202609290001_classroom_leaderboards.sql',import.meta.url),'utf8');
  assert.match(sql,/enable row level security/g);
  assert.match(sql,/members see class scores/);
  assert.match(sql,/invalid classroom code/);
  assert.match(sql,/greatest\(game_bests\.score,excluded\.score\)/);
  assert.match(sql,/least\(game_bests\.score,excluded\.score\)/);
  assert.match(sql,/join_code_hash text not null unique/);
});

test('학급 참가 UI는 코드를 서버 RPC로 보내고 브라우저에서 비교하지 않는다',async()=>{
  const [view,rotation]=await Promise.all([
    readFile(new URL('../src/features/online/leaderboardView.js',import.meta.url),'utf8'),
    readFile(new URL('../supabase/migrations/202609290003_rotate_classroom_join_code.sql',import.meta.url),'utf8'),
  ]);
  assert.match(view,/joinClassroom\(joinInput\.value,name\)/);
  assert.doesNotMatch(view,/window\.prompt/);
  assert.match(rotation,/2636389909f27aa15afff120fce0ae534aa4d22a2723812966a731550564f0f7/);
});
