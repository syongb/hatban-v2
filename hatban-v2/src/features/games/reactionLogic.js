export function reactionResult(phase, startedAt, now) {
  if (phase !== 'go') return { accepted:false, message:'너무 빨라요!' };
  return { accepted:true, elapsed:Math.max(0,Math.round(now-startedAt)) };
}
export const compareReactionRecords=(a,b)=>a.score-b.score;
