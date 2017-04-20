import path from 'path';
import chalk from 'chalk';

class Config {
  config = {
    debug: false,
    migrationPath: 'migrations',
    require: [],
    timeout: 30 * 1000,
  };

  init(overrides) {
    Object.keys(overrides).forEach((name) => {
      this[name] = overrides[name];
    });
  }
}

const configStorage = new Proxy(new Config(), {
  get(target, name) {
    switch (name) {
      case 'noColor':
        return !chalk.enabled;
      default: {
        if (name !== 'init') {
          return target.config[name];
        }

        return target.init;
      }
    }
  },

  set(target, name, value) {
    /* eslint-disable no-param-reassign */
    switch (name) {
      case 'require':
        if (!Array.isArray(value)) {
          value = [value];
        }
        value.forEach((module) => {
          if (module.indexOf('./') === 0) {
            require(path.join(process.cwd(), module));
          } else {
            require(module);
          }
        });
        target.config.require = [
          ...target.config.require,
          ...value,
        ];
        return true;
      case 'timeout':
        target.config.timeout = parseInt(value, 10);
        return !isNaN(target.config.timeout);
      case 'noColor':
        chalk.enabled = !value;
        return true;
      case 'config':
        target.config = value;
        return true;
      case 'migrationPath':
        target.config.migrationPath = path.resolve(value);
        return true;
      default: {
        if (name !== 'init') {
          target.config[name] = value;
          return true;
        }

        return false;
      }
    }
    /* eslint-enable no-param-reassign */
  },
});

export function loadConfig(configPath = '.abstract-migrate.json') {
  let config = {};
  try {
    config = require(path.join(process.cwd(), configPath));
  } catch (err) {
    if (err.message.match(/^Cannot find module/)) {
      // Only throw this message if they provided a config file
      if (configPath !== '.abstract-migrate.json') {
        console.error([
          chalk.red.bold('Error:'),
          'No config file located at',
          chalk.yellow(path.join(process.cwd(), configPath)),
        ].join(' '));
        process.exit(1);
        return;
      }
    } else {
      console.error([
        chalk.red.bold('Error:'),
        'Could not parse config file at',
        chalk.yellow(path.join(process.cwd(), configPath)),
      ].join(' '));
      process.exit(1);
      return;
    }

    config = {};
  }

  configStorage.init(config);
}

export default configStorage;
