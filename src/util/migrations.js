import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import config from '../config';
import storage from './storage';
import { nameOrNumber } from './arguments';
import { mapSeries, promiseback } from './promise';

export const DIRECTION_UP = 'direction/up';
export const DIRECTION_DOWN = 'direction/down';

export async function loadFromFs(migrationPath) {
  return new Promise((resolve, reject) => {
    fs.readdir(migrationPath, (err, files) => {
      if (err) {
        reject(err);
      } else {
        resolve(
          files
            .filter(file => file.match(/^\d+-[\w\d_-]+\.js$/))
            .map(file => file.slice(0, -3))
            .sort()
        );
      }
    });
  });
}

export async function run(filename, direction) {
  const migration = require(path.join(config.migrationPath, filename));

  if (direction === DIRECTION_UP) {
    await promiseback(migration.up);
  } else if (direction === DIRECTION_DOWN) {
    await promiseback(migration.down);
  } else {
    throw new Error('Unknown migration direction');
  }

  return { name: filename, timestamp: Date.now() };
}

export function filterUp(ranMigrations, files, { ignorePast = false, until, count }) {
  let migrationsToRun;

  if (!ranMigrations.length) {
    // We have no ran migrations, run them all!
    migrationsToRun = files;
  } else if (ignorePast) {
    // Only grab migrations since the most recently ran
    const timestamp = ranMigrations[0].name.match(/^(\d+)-/)[1];
    migrationsToRun = files.filter(filename =>
      filename.match(/^(\d+)-/)[1] > timestamp
    );
  } else {
    // Grab all of the unran migrations
    migrationsToRun = files.filter(file =>
      !ranMigrations.find(migration => file === migration.name)
    );
  }

  if (until) {
    return migrationsToRun.filter(file => file <= until);
  }

  if (count) {
    return migrationsToRun.slice(0, count);
  }

  return migrationsToRun;
}

export function filterDown(ranMigrations, files, { until, count }) {
  if (!ranMigrations) {
    return [];
  }

  let migrationsToRun;
  if (count) {
    migrationsToRun = ranMigrations.slice(0, count);
  } else if (until) {
    migrationsToRun = ranMigrations.filter(({ name }) => name >= until);
  } else {
    throw new Error('A downward migration requires either a migration name or count');
  }

  migrationsToRun = migrationsToRun.map(({ name }) => name);

  migrationsToRun.forEach((migration) => {
    if (files.indexOf(migration) === -1) {
      throw new Error(`Migration '${migration}' cannot be downgraded because it does not have a migration file`);
    }
  });

  return migrationsToRun;
}

export async function needsToRun(direction, options) {
  // Fetch the migrations we've ran and the ones that are available
  const ranMigrations = await storage.load();

  // Sort the ran migrations by their name -- newest migration first
  ranMigrations.sort(({ name: left }, { name: right }) => right.localeCompare(left));

  const files = await loadFromFs(config.migrationPath);

  if (direction === DIRECTION_UP) {
    return filterUp(ranMigrations, files, options);
  }
  if (direction === DIRECTION_DOWN) {
    return filterDown(ranMigrations, files, options);
  }

  throw new Error(`Unknown migration direct '${direction}`);
}

export async function framework(direction, name, options) {
  const UP = direction === DIRECTION_UP;

  console.log(chalk.gray(UP ? 'Running migrations' : 'Running down migrations'));

  const nameValue = nameOrNumber(name);
  const migrationsToRun = await needsToRun(
    direction,
    {
      ignorePast: UP ? options.ignorePast : undefined,
      until: typeof nameValue !== 'number' ? nameValue : null,
      count: typeof nameValue === 'number' ? nameValue : null,
    }
  );

  if (!migrationsToRun.length) {
    console.log(UP ? 'There are no pending migrations' : 'There are no migrations to run down');
    return;
  }

  // If they're asking for a dry run, print it and exit
  if (options.dryRun) {
    console.log(
      chalk.yellow.bold('Dry run')
      + chalk.yellow(' No migrations will be executed')
    );
    migrationsToRun.forEach((file) => {
      console.log('[✓] ' + chalk.cyan(file));
    });
    return;
  }

  // Attempt to acquire a lock
  const lockAcquired = await storage.acquireLock();
  if (!lockAcquired) {
    console.log(
      chalk.yellow.bold('Could not lock')
      + chalk.yellow(' Lock could not be acquired, quitting')
    );
    return;
  }

  try {
    // Run the migrations serially
    const ranMigrations = await mapSeries(
      migrationsToRun,
      async (file) => {
        try {
          const migration = await run(file, direction);
          console.log('[✓] ' + chalk.cyan(file));
          return migration;
        } catch (err) {
          console.log('[✘] ' + chalk.red(file));
          console.log(
            chalk.yellow.bold('Migration failed!')
            + chalk.yellow(' Your database may be in an invalid state.')
          );
          throw err;
        }
      }
    );

    if (UP) {
      // Write the new migrations to the storage
      await storage.add(ranMigrations.slice().reverse());
    } else {
      // Tell the storage to remove the migrations
      await storage.remove(ranMigrations);
    }
  } finally {
    // Always release the lock
    await storage.releaseLock();
  }
}
