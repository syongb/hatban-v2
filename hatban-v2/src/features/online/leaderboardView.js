import { fetchLeaderboard, joinClassroom, onlineConfigured, submitOnlineResult, subscribeLeaderboard } from './leaderboardClient.js';
import { cleanDisplayName, formatOnlineScore, onlineModeKey, onlineUnavailableMessage } from './leaderboardLogic.js';

export function createLeaderboardWidget({game,getSettings,getName}){
  const element=document.createElement('section');element.className='leaderboard-widget';
  const summary=document.createElement('p');summary.className='leaderboard-summary';
  const joinForm=document.createElement('form');joinForm.className='leaderboard-join';joinForm.hidden=true;
  const joinLabel=document.createElement('label');joinLabel.textContent='학급 참가 코드';
  const joinInput=document.createElement('input');joinInput.type='text';joinInput.inputMode='numeric';joinInput.autocomplete='off';joinInput.maxLength=20;joinInput.required=true;joinInput.setAttribute('aria-label','학급 참가 코드');
  const joinButton=document.createElement('button');joinButton.type='submit';joinButton.textContent='참가하기';joinLabel.append(joinInput);joinForm.append(joinLabel,joinButton);
  const button=document.createElement('button');button.type='button';button.className='leaderboard-button';button.textContent='🏆 랭킹 보기';
  const list=document.createElement('ol');list.className='leaderboard-list';list.hidden=true;element.append(summary,joinForm,button,list);
  let unsubscribe=()=>{},destroyed=false;
  const message=(text)=>{summary.textContent=text;};
  async function refresh(interactive=false){
    unsubscribe();unsubscribe=()=>{};list.hidden=true;
    if(!onlineConfigured){message('온라인 랭킹 연결 설정이 필요해요.');button.disabled=true;return;}
    const name=cleanDisplayName(getName());if(!name){message('홈에서 이름을 먼저 설정해 주세요.');joinForm.hidden=true;return;}
    message('우리 반 랭킹을 불러오는 중...');
    try{
      const result=await fetchLeaderboard(game,onlineModeKey(game,getSettings()));
      if(!result.member){message('학급 참가 코드를 한 번만 입력해 주세요.');joinForm.hidden=false;button.hidden=true;return;}
      joinForm.hidden=true;button.hidden=false;
      if(destroyed)return;const mine=result.rows.find(row=>row.is_me);message(`내 최고: ${mine?formatOnlineScore(game,mine):'아직 없음'} · 우리 반: ${mine?mine.rank+'위':'기록 없음'}`);
      list.replaceChildren(...result.rows.map(row=>{const item=document.createElement('li');item.className=row.is_me?'is-me':'';const rank=document.createElement('strong');rank.textContent=row.rank+'.';const who=document.createElement('span');who.textContent=row.is_me?'나 · '+row.display_name:row.display_name;const value=document.createElement('b');value.textContent=formatOnlineScore(game,row);item.append(rank,who,value);return item;}));
      list.hidden=!interactive;unsubscribe=subscribeLeaderboard(result.member.classroom_id,game,onlineModeKey(game,getSettings()),()=>void refresh(list.hidden===false));
    }catch{message(onlineUnavailableMessage());}
  }
  joinForm.onsubmit=async(event)=>{event.preventDefault();const name=cleanDisplayName(getName());if(!name){message('홈에서 이름을 먼저 설정해 주세요.');return;}joinButton.disabled=true;message('햇반국에 참가하는 중...');try{await joinClassroom(joinInput.value,name);joinInput.value='';await refresh(true);}catch{message('학급 참가 코드를 확인해 주세요.');}finally{joinButton.disabled=false;}};
  button.onclick=()=>void refresh(true);
  return {element,refresh:()=>refresh(false),async submit(score,record){try{if(await submitOnlineResult(game,score,record,getSettings()))await refresh(false);}catch{message('기록은 기기에 저장했지만 '+onlineUnavailableMessage());}},destroy(){destroyed=true;unsubscribe();}};
}
