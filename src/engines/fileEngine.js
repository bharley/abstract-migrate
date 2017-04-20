import path from 'path';
import fs from 'fs';

const migrationStorage = path.join(process.cwd(), 'migrations.json');
const lockPath = path.join(process.cwd(), 'amig.lock');

function getMigrations() {
  try {
    const migrations = require(migrationStorage);
    if (Array.isArray(migrations)) {
      return migrations;
    }
  } catch (err) {
    // Do nothing
  }
  return [];
}

function writeObject(obj, cb) {
  fs.writeFile(
    migrationStorage,
    JSON.stringify(obj, null, ' '),
    cb
  );
}

export default {
  async load() {
    return getMigrations();
  },

  add(migrations, cb) {
    const allMigrations = [
      ...migrations,
      ...getMigrations(),
    ];
    writeObject(allMigrations, cb);
  },

  remove(migrations, cb) {
    const removedMigrations = migrations.map(({ name }) => name);
    const allMigrations = getMigrations().filter(({ name }) =>
      removedMigrations.indexOf(name) === -1
    );
    writeObject(allMigrations, cb);
  },

  acquireLock(cb) {
    fs.open(lockPath, 'wx', (err, fd) => {
      if (err) {
        if (err.code === 'EEXIST') {
          cb(null, false);
        } else {
          cb(err);
        }
      } else {
        fs.close(fd, (closeErr) => {
          cb(closeErr, true);
        });
      }
    });
  },

  releaseLock(cb) {
    fs.unlink(lockPath, cb);
  },
};
