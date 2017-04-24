import program from 'commander';
import actionWrapper from './action';
import config, { loadConfig } from './config';
import { create, down, list, rollback, up } from './commands';

function setSetting(settingName, valueToSet) {
  return function applySetting(value) {
    config[settingName] = valueToSet !== undefined ? valueToSet : value;
  };
}

program
  .version('0.1.0')
  .usage('perform migrations')
  .option('-c, --config <path>', 'the path to the config file', loadConfig, loadConfig())
  .option('-r, --require <file>', 'require file before running', setSetting('require'))
  .option('-e, --engine <module>', 'the storage engine', setSetting('engine'))
  .option('-C, --no-color', 'turn off color output', setSetting('noColor', true))
  .option('--debug', 'more verbose output', setSetting('debug', true));

program
  .command('create <name>')
  .description('creates a new migration using the given name prepended with the current timestamp')
  .action(actionWrapper(create));

program
  .command('up [migration|num]')
  .description('runs all of the migrations (optionally only up to and including a named one or count)')
  .option(
    '-p, --ignore-past',
    'ignore old migrations from the past that have not ran yet'
  )
  .option('-d, --dry-run', 'lists the migrations that will be executed')
  .action(actionWrapper(up));

program
  .command('down <migration|num>')
  .description('runs the migrations down to and including the named one or specified count')
  .option('-d, --dry-run', 'lists the migrations that will be executed')
  .action(actionWrapper(down));

program
  .command('rollback')
  .description('runs down the last set of migrations that were ran')
  .option('-d, --dry-run', 'lists the migrations that will be executed')
  .action(actionWrapper(rollback));

program
  .command('list')
  .alias('ls')
  .description('lists out all of the migrations and their status')
  .action(actionWrapper(list));

program.on('--help', () => {
  console.log('  Documentation:');
  console.log('');
  console.log('    Complete documentation, including engine documentation, can be found on the Github page:');
  console.log('    https://github.com/bharley/abstract-migrate');
  console.log('');
});

program
  .parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
