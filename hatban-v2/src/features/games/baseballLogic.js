import { baseballResult, createBaseballSecret } from './gameLogic.js';

export const BASEBALL_LENGTHS = [3, 4, 5];

export function validateBaseballGuess(guess, length) {
  if (!new RegExp(`^\\d{${length}}$`).test(guess)) return '숫자 자릿수를 확인해요.';
  if (new Set(guess).size !== length) return '서로 다른 숫자를 입력해요.';
  return null;
}

export function createBaseballState(length = 3, secret = createBaseballSecret(length)) {
  return { length, secret, tries: 0, guesses: [], complete: false, message: '' };
}

export function submitBaseballGuess(state, guess) {
  if (state.complete) return state;
  const message = validateBaseballGuess(guess, state.length);
  if (message) return { ...state, message };
  const result = baseballResult(state.secret, guess);
  const tries = state.tries + 1;
  const complete = result.strike === state.length;
  return {
    ...state,
    tries,
    complete,
    message: complete ? `${tries}번 만에 맞혔어요!` : '',
    guesses: [{ guess, result }, ...state.guesses],
  };
}
