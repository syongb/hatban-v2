import { BASEBALL_LENGTHS, createBaseballState, submitBaseballGuess } from './baseballLogic.js';

export function mountBaseball(root, done, { length: selectedLength = 3 } = {}) {
  let state;
  const controls = document.createElement('div');
  const length = document.createElement('select');
  const input = document.createElement('input');
  const throwButton = document.createElement('button');
  const message = document.createElement('p');
  const log = document.createElement('div');
  const again = document.createElement('button');

  BASEBALL_LENGTHS.forEach((value) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = `${value}자리 숫자`;
    length.append(option);
  });
  length.value = String(selectedLength);
  length.setAttribute('aria-label','숫자야구 자릿수');
  input.setAttribute('aria-label','추측 숫자');
  controls.className='baseball-controls'; log.className='baseball-log'; message.className='baseball-message';
  log.setAttribute('aria-live','polite');
  input.inputMode = 'numeric';
  throwButton.textContent = '던지기';
  again.textContent = '다시 하기';
  controls.append(input, throwButton);
  root.append(controls, message, log);
  length.onchange = reset;
  again.onclick = reset;
  throwButton.onclick = submit;
  input.onkeydown = (event) => { if (event.key === 'Enter') submit(); };

  function reset() {
    state = createBaseballState(Number(length.value));
    root.querySelector('.game-completion-notice')?.remove();
    input.value = '';
    input.placeholder = `서로 다른 ${state.length}자리`;
    throwButton.disabled = false;
    message.textContent = `0도 사용할 수 있는 서로 다른 ${state.length}자리 숫자를 맞혀요.`;
    log.replaceChildren();
  }

  function submit() {
    const previousTries = state.tries;
    const next = submitBaseballGuess(state, input.value);
    const newGuess = next.guesses[0];
    state = next;
    message.textContent = state.message;
    if (newGuess && state.tries > previousTries) {
      const line = document.createElement('p');
      const { strike, ball, out } = newGuess.result;
      line.innerHTML = `<strong>${newGuess.guess}</strong><span class="strike">${strike} 스트라이크</span><span class="ball">${ball} 볼</span>${out ? '<span>OUT</span>' : ''}`;
      log.prepend(line);
    }
    input.value = '';
    if (state.complete) {
      throwButton.disabled = true;
      done(-state.tries, { tries: state.tries, length: state.length });
    }
  }

  reset();
  return () => {};
}
