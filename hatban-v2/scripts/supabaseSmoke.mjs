import { createClient } from '@supabase/supabase-js';

const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_KEY, CLASSROOM_CODE } = process.env;
if (![SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,SUPABASE_SERVICE_KEY,CLASSROOM_CODE].every(Boolean)) throw new Error('smoke test environment is incomplete');

const options={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}};
const makeStudent=()=>createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,options);
const admin=createClient(SUPABASE_URL,SUPABASE_SERVICE_KEY,options);
const students=[makeStudent(),makeStudent(),makeStudent()];
const ids=[];

async function rpc(client,name,args={}){const {data,error}=await client.rpc(name,args);if(error)throw error;return data;}
async function signIn(client){const {data,error}=await client.auth.signInAnonymously();if(error)throw error;ids.push(data.user.id);return data.user.id;}
const assert=(condition,message)=>{if(!condition)throw new Error(message);};

try{
  const [aId,bId]=await Promise.all(students.slice(0,2).map(signIn));
  await signIn(students[2]);
  const outsider=await rpc(students[2],'get_leaderboard',{p_game:'reaction',p_mode:'default',p_limit:10});
  assert(outsider.length===0,'unjoined user could read leaderboard');
  const invalid=await students[2].rpc('join_classroom',{join_code:'INVALID-CODE',requested_name:'외부테스트'});
  assert(Boolean(invalid.error),'invalid classroom code was accepted');

  await rpc(students[0],'join_classroom',{join_code:CLASSROOM_CODE,requested_name:'테스트A'});
  const joinedB=await rpc(students[1],'join_classroom',{join_code:CLASSROOM_CODE,requested_name:'테스트B'});
  const classroomId=joinedB[0].classroom_id;
  assert(await rpc(students[0],'submit_game_score',{p_game:'reaction',p_mode:'default',p_score:250,p_aux:{elapsed:250}}),'initial score was not saved');
  let board=await rpc(students[1],'get_leaderboard',{p_game:'reaction',p_mode:'default',p_limit:10});
  assert(board.some(row=>row.user_id===aId&&Number(row.score)===250),'classmate could not read score');
  assert(!(await rpc(students[0],'submit_game_score',{p_game:'reaction',p_mode:'default',p_score:300,p_aux:{elapsed:300}})),'worse score overwrote personal best');

  let channel;
  const realtime=new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('realtime event timed out')),12000);
    channel=students[1].channel('smoke-realtime').on('postgres_changes',{event:'UPDATE',schema:'public',table:'game_bests',filter:`classroom_id=eq.${classroomId}`},payload=>{
      clearTimeout(timer);resolve(payload);
    });
  });
  await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('realtime subscription timed out')),12000);
    channel.subscribe(status=>{
      if(status==='SUBSCRIBED'){clearTimeout(timer);resolve();}
      if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'){clearTimeout(timer);reject(new Error(`realtime subscription ${status.toLowerCase()}`));}
    });
  });
  assert(await rpc(students[0],'submit_game_score',{p_game:'reaction',p_mode:'default',p_score:200,p_aux:{elapsed:200}}),'better score was not saved');
  const payload=await realtime;assert(payload.new.user_id===aId,'realtime event returned the wrong student');await students[1].removeChannel(channel);
  board=await rpc(students[1],'get_leaderboard',{p_game:'reaction',p_mode:'default',p_limit:10});
  assert(board.some(row=>row.user_id===aId&&Number(row.score)===200),'realtime refetch did not see better score');

  const forbidden=await students[1].from('game_bests').update({score:1}).eq('user_id',aId);
  assert(Boolean(forbidden.error),'student could update another student score directly');
  const sameClass=await students[1].from('game_bests').select('user_id,score').eq('user_id',aId);
  assert(!sameClass.error&&sameClass.data.length===1,'same-class RLS read was denied');
  console.log(JSON.stringify({anonymousAuth:true,classroomJoin:true,rls:true,personalBest:true,realtime:true,students:[aId,bId].length}));
} finally {
  await Promise.allSettled(students.map(client=>client.removeAllChannels()));
  const cleanup=await Promise.allSettled(ids.map(id=>admin.auth.admin.deleteUser(id)));
  if(cleanup.some(result=>result.status==='rejected'||result.value?.error))throw new Error('test user cleanup failed');
  const {count,error}=await admin.from('class_members').select('*',{count:'exact',head:true}).like('display_name','테스트%');
  if(error||count)throw new Error('test membership cleanup failed');
}
