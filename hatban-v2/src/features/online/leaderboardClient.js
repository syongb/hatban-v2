import { createClient } from '@supabase/supabase-js';
import { cleanDisplayName, onlineScore } from './leaderboardLogic.js';
const env=import.meta.env||{};
const url=env.VITE_SUPABASE_URL;
const key=env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const onlineConfigured=Boolean(url&&key);
const client=onlineConfigured?createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}}):null;
let membership=null;
async function session(){if(!client)throw new Error('not-configured');let {data}=await client.auth.getSession();if(!data.session){const result=await client.auth.signInAnonymously();if(result.error)throw result.error;data=result.data;}return data.session||data;}
export async function getMembership(){await session();const {data,error}=await client.rpc('get_my_membership');if(error)throw error;membership=data?.[0]||null;return membership;}
export async function joinClassroom(code,name){await session();const clean=cleanDisplayName(name);if(!clean)throw new Error('name-required');const {data,error}=await client.rpc('join_classroom',{join_code:code,requested_name:clean});if(error)throw error;membership=data?.[0]||null;return membership;}
export async function syncDisplayName(name){if(!client)return false;const clean=cleanDisplayName(name);if(!clean)return false;const {data:{session:current}}=await client.auth.getSession();if(!current)return false;const member=membership||await getMembership();if(!member)return false;const {error}=await client.rpc('update_my_display_name',{requested_name:clean});if(error)throw error;membership={...member,display_name:clean};return true;}
export async function fetchLeaderboard(game,mode){const member=membership||await getMembership();if(!member)return {member:null,rows:[]};const {data,error}=await client.rpc('get_leaderboard',{p_game:game,p_mode:mode,p_limit:10});if(error)throw error;return {member,rows:data||[]};}
export async function submitOnlineResult(game,score,record,settings){if(!client)return false;const payload=onlineScore(game,score,record,settings);if(!payload)return false;const member=membership||await getMembership();if(!member)return false;const {error}=await client.rpc('submit_game_score',{p_game:payload.game,p_mode:payload.mode,p_score:payload.score,p_aux:payload.aux});if(error)throw error;return true;}
export function subscribeLeaderboard(classroomId,game,mode,onChange){if(!client||!classroomId)return()=>{};const channel=client.channel(`leaderboard:${classroomId}:${game}:${mode}`).on('postgres_changes',{event:'*',schema:'public',table:'game_bests',filter:`classroom_id=eq.${classroomId}`},payload=>{if(payload.new?.game_key===game&&payload.new?.mode_key===mode)onChange();}).subscribe();return()=>{void client.removeChannel(channel);};}
