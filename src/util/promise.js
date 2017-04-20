import config from '../config';

export function promiseback(fn, ...args) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`timeout of ${config.timeout}ms exceeded`));
    }, config.timeout);

    const possiblePromise = fn(...args, (err, result) => {
      clearTimeout(timer);

      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });

    if (possiblePromise && typeof possiblePromise.then === 'function') {
      possiblePromise.then((result) => {
        clearTimeout(timer);
        resolve(result);
      }, (err) => {
        clearTimeout(timer);
        reject(err);
      });
    }
  });
}
