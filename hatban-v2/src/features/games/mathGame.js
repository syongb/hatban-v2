import { createMathQuestion } from './gameLogic.js';
export function mountMath(root, done, settings) {
  const duration = 10000; let score = 0, count = 0, ended = false, question, nextTimer;
  const endsAt = Date.now() + duration;
  root.innerHTML = '<div class="math-hud"><strong class="math-time"></strong><span class="math-score"></span></div><progress class="math-progress" max="10000" value="10000" aria-label="남은 시간"></progress><p class="math-question"></p><form class="math-answer"><label>정답<input inputmode="numeric" autocomplete="off" aria-label="암산 정답"></label><button>확인</button></form><p class="math-feedback" role="status"></p>';
  const input = root.querySelector('input'), go = root.querySelector('button'), feedback = root.querySelector('.math-feedback');
  function next() { question = createMathQuestion(settings.operation, settings.difficulty); root.querySelector('.math-question').textContent = question.text; input.value = ''; input.disabled = false; go.disabled = false; input.focus(); }
  function finish() { if (ended) return; ended = true; clearInterval(ticker); clearTimeout(nextTimer); input.disabled = go.disabled = true; done(score, {questions:count}); }
  function tick() { const remain = Math.max(0,endsAt-Date.now()); root.querySelector('.math-time').textContent = (remain/1000).toFixed(1) + '초'; root.querySelector('.math-score').textContent = score + '점'; root.querySelector('progress').value = remain; if (!remain) finish(); }
  const ticker = setInterval(tick,50);
  root.querySelector('form').onsubmit = event => { event.preventDefault(); if (ended || input.disabled) return; if (Date.now() >= endsAt) { finish(); return; } if (!input.value.trim()) return;
    const correct = Number(input.value) === question.answer; score += correct ? 1 : 0; count++;
    feedback.textContent = correct ? '정답!' : '틀렸어요! 정답은 ' + question.answer; feedback.dataset.correct = String(correct);
    input.disabled = go.disabled = true; tick(); if (!ended) nextTimer = setTimeout(() => { if (!ended) { feedback.textContent = ''; next(); } },450);
  };
  next(); tick();
  return () => { ended = true; clearInterval(ticker); clearTimeout(nextTimer); };
}
