import { reactionResult } from './reactionLogic.js';
export function mountReaction(root,done){
  let phase='waiting',startedAt=0,timer=null,ended=false;
  const button=document.createElement('button');button.type='button';button.className='reaction-pad is-waiting';button.textContent='준비하세요...';root.append(button);
  timer=window.setTimeout(()=>{if(ended)return;phase='go';startedAt=performance.now();button.className='reaction-pad is-go';button.textContent='지금!';},2000+Math.random()*3000);
  button.onclick=()=>{if(ended)return;const result=reactionResult(phase,startedAt,performance.now());ended=true;clearTimeout(timer);button.disabled=true;button.className='reaction-pad '+(result.accepted?'is-result':'is-early');button.textContent=result.accepted?result.elapsed+'ms':result.message;done(result.accepted?result.elapsed:0,{elapsed:result.elapsed,result:result.accepted?'complete':'early'});};
  return()=>{ended=true;clearTimeout(timer);};
}
