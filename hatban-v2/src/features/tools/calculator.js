const OPERATORS = new Set(['+', '-', '×', '÷']);

function tokenize(expression) {
  const tokens = [];
  let number = '';
  for (const char of expression) {
    if (/[0-9.]/.test(char)) number += char;
    else if (OPERATORS.has(char)) {
      if (!number || number.split('.').length > 2) throw new Error('잘못된 식');
      tokens.push(Number(number), char); number = '';
    } else throw new Error('잘못된 식');
  }
  if (!number || number.split('.').length > 2) throw new Error('잘못된 식');
  tokens.push(Number(number));
  return tokens;
}

export function evaluateExpression(expression) {
  const tokens = tokenize(expression);
  if (tokens.length % 2 === 0) throw new Error('잘못된 식');
  const reduced = [tokens[0]];
  for (let index = 1; index < tokens.length; index += 2) {
    const operator = tokens[index]; const value = tokens[index + 1];
    if (operator === '×') reduced[reduced.length - 1] *= value;
    else if (operator === '÷') {
      if (value === 0) throw new Error('0으로 나눌 수 없어요.');
      reduced[reduced.length - 1] /= value;
    } else reduced.push(operator, value);
  }
  let result = reduced[0];
  for (let index = 1; index < reduced.length; index += 2) result = reduced[index] === '+' ? result + reduced[index + 1] : result - reduced[index + 1];
  if (!Number.isFinite(result)) throw new Error('계산할 수 없어요.');
  return Number(result.toFixed(10)).toString();
}

export function appendCalculatorInput(current, input) {
  const value = current === '오류' ? '0' : current;
  if (input === '.') {
    const last = value.split(/[+\\-×÷]/).pop();
    return last.includes('.') ? value : value + (last ? '.' : '0.');
  }
  if (OPERATORS.has(input)) {
    if (value === '0' && input !== '-') return value;
    return OPERATORS.has(value.at(-1)) ? value.slice(0, -1) + input : value + input;
  }
  if (!/^[0-9]$/.test(input)) return value;
  if (value.length >= 40) return value;
  return value === '0' ? input : value + input;
}
