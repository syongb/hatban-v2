export function checkTicTacToe(board) {
  const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  return lines.find(([a,b,c]) => board[a] && board[a] === board[b] && board[a] === board[c]) ? board[lines.find(([a,b,c]) => board[a] && board[a] === board[b] && board[a] === board[c])[0]] : null;
}
export function baseballResult(secret, guess) { let strike=0, ball=0; [...guess].forEach((n,i)=>{ if(secret[i]===n) strike++; else if(secret.includes(n)) ball++; }); return {strike,ball,out:!strike&&!ball}; }
export function tenSecondError(milliseconds) { return Math.abs(milliseconds - 10000); }

export function createPairs(count = 12) { return [...Array(count / 2).keys(), ...Array(count / 2).keys()].map((pair, index) => ({ id: index, pair })); }
export function createMatchState(count) { return { count, cards: createPairs(count), open: [], matched: [], locked: false, complete: false }; }
export function selectMatchCard(state, index) { if (state.locked || state.complete || state.matched.includes(index) || state.open.includes(index)) return { ...state, ignored: true }; const open=[...state.open,index]; if(open.length<2)return {...state,open}; const same=state.cards[open[0]].pair===state.cards[open[1]].pair; const matched=same?[...state.matched,...open]:state.matched; return {...state,open:same?[]:open,matched,locked:!same,complete:matched.length===state.count}; }
export function resolveMatchMismatch(state) { return {...state,open:[],locked:false}; }
export function scoreMathAnswer(score, answer, expected, ended=false) { return ended ? score : score + (Number(answer) === expected ? 1 : 0); }
export function isGomokuWin(board, row, col) { const stone = board[row]?.[col]; if (!stone) return false; return [[1,0],[0,1],[1,1],[1,-1]].some(([dr,dc]) => { let n=1; for (const dir of [-1,1]) for(let i=1;i<5;i++){const r=row+dr*i*dir,c=col+dc*i*dir;if(board[r]?.[c]===stone)n++;else break;} return n>=5; }); }
export function createBaseballSecret(length=3) { const numbers=[1,2,3,4,5,6,7,8,9].sort(()=>Math.random()-.5); return numbers.slice(0,length).join(''); }
export function createMathQuestion(type=Math.random() < .5 ? 'mul' : 'div') { if(type==='div'){const divisor=2+Math.floor(Math.random()*8),answer=100+Math.floor(Math.random()*99);return {type,text:(answer*divisor)+' ÷ '+divisor,answer};}const a=10+Math.floor(Math.random()*90),b=2+Math.floor(Math.random()*8);return {type:'mul',text:a+' × '+b,answer:a*b}; }
