import chalk from 'chalk';
import config from '../config';
import storage from '../util/storage';
import { loadFromFs } from '../util/migrations';

export default async function list() {
  console.log(chalk.gray('Listing migrations'));

  const ranMigrations = await storage.load();

  const files = await loadFromFs(config.migrationPath);

  files.forEach((file) => {
    const hasMigration = ranMigrations.find(({ name }) => name === file);

    if (hasMigration) {
      console.log('[✓] ' + file);
    } else {
      console.log('[ ] ' + chalk.yellow(file));
    }
  });
}
