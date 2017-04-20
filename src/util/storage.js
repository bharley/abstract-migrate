import path from 'path';
import config from '../config';
import { promiseback } from './promise';

const requiredFunctions = ['load', 'add', 'remove', 'acquireLock', 'releaseLock'];

function checkEngine(engine) {
  requiredFunctions.forEach((fn) => {
    if (typeof engine[fn] !== 'function') {
      throw new Error(`Engine does not have a '${fn}' function`);
    }
  });
}

function getEngine() {
  // We need this set up at this point...
  if (!config.engine) {
    throw new Error('No engine has been set');
  }

  const engine = require(path.join(process.cwd(), config.engine));
  try {
    checkEngine(engine.default);
    return engine.default;
  } catch (err) {
    checkEngine(engine);
  }

  return engine;
}

export default {
  load() {
    const engine = getEngine();
    return promiseback(engine.load);
  },

  add(migrations) {
    const engine = getEngine();
    return promiseback(engine.add, migrations);
  },

  remove(migrations) {
    const engine = getEngine();
    return promiseback(engine.remove, migrations);
  },

  acquireLock() {
    const engine = getEngine();
    return promiseback(engine.acquireLock);
  },

  releaseLock() {
    const engine = getEngine();
    return promiseback(engine.releaseLock);
  },
};
