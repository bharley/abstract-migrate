export function mapSeries(arr, fn) {
  return arr.reduce((chain, item) =>
    chain.then(results => fn(item).then(result => [...results, result]))
  , Promise.resolve([]));
}

export function promiseback(fn, ...args) {
  return new Promise((resolve, reject) => {
    const possiblePromise = fn(...args, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });

    if (possiblePromise && typeof possiblePromise.then === 'function') {
      possiblePromise.then((result) => {
        resolve(result);
      }, (err) => {
        reject(err);
      });
    }
  });
}
