
export function nameOrNumber(str) {
  const number = parseInt(str, 10);
  if (!isNaN(number) && number == str) { // eslint-disable-line eqeqeq
    return number;
  }

  return str;
}
