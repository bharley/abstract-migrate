import chalk from 'chalk';
import config from './config';

/* eslint-disable no-param-reassign */
function formatRuntime(duration) {
  if (duration > 1500) {
    duration /= 1000;
    duration = duration.toFixed(2);
    duration += 's';
  } else {
    duration += 'ms';
  }

  return duration;
}
/* eslint-enable no-param-reassign */

export default function actionWrapper(action) {
  const startTime = Date.now();

  return async function wrapAction(...args) {
    try {
      await action(...args);
    } catch (err) {
      console.error(chalk.red.bold('Error:') + ' ' + err.message);
      if (config.debug) {
        console.error(err.stack);
      }

      return process.exit(1);
    }

    const executionTime = formatRuntime(Date.now() - startTime);
    console.log(chalk.green('Success') + ` (${executionTime})`);

    return process.exit(0);
  };
}
