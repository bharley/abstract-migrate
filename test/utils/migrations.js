import fs from 'fs';
import { expect } from 'chai';
import faker from 'faker';
import { loadFromFs, filterUp, filterDown, filterRollback } from '../../src/util/migrations';

function fakeTime() {
  return faker.date.recent().getTime();
}

function m(timestamp = fakeTime(), includeExtension = true) {
  return [
    timestamp,
    faker.hacker.adjective(),
    faker.hacker.noun(),
  ].join('-').replace(/[^\w\d]/g, '-').toLowerCase()
    + (includeExtension ? '.js' : '');
}

function mn(n = 5) {
  return [...Array(n).keys()].map(() => m(undefined, false)).sort();
}

describe('utils/migrations', () => {
  describe('loadFromFs', () => {
    let oldReaddir;
    let readdirResult = [];

    before(() => {
      fs.readdir = (path, cb) => cb(null, readdirResult);
    });

    after(() => {
      fs.readdir = oldReaddir;
    });

    it('should remove the file extension from migration files', async () => {
      readdirResult = [m(), m(), m(), m('112233')];

      expect(await loadFromFs('migrations')).to.have.members(
        readdirResult.map(filename => filename.slice(0, -3))
      );
    });

    it('should ignore files that don\'t match the `{timestamp}-name.js` pattern', async () => {
      readdirResult = [
        '.gitignore',
        m(),
        'migration-helper.js',
        'some-directory',
        m(),
        m(),
        '.secrets.json',
      ];

      expect(await loadFromFs('migrations')).to.have.members([
        readdirResult[1],
        readdirResult[4],
        readdirResult[5],
      ].map(file => file.slice(0, -3)));
    });

    it('should sort the migration files in descending order', async () => {
      readdirResult = [
        m('1482203115976'),
        m('1482205134929'),
        m('1482202978679'),
        m('1482244020091'),
        m('1482213827758'),
        m('1482193536832'),
        m('1482228570984'),
        m('1482241890753'),
      ];

      expect(await loadFromFs('migrations')).to.deep.equal([
        readdirResult[5],
        readdirResult[2],
        readdirResult[0],
        readdirResult[1],
        readdirResult[4],
        readdirResult[6],
        readdirResult[7],
        readdirResult[3],
      ].map(file => file.slice(0, -3)));
    });
  });

  describe('filterUp', () => {
    it('should select all migration files if none have ran', () => {
      const ranMigrations = [];
      const files = mn(5);

      expect(filterUp(ranMigrations, files, {})).to.deep.equal(files);
    });

    it('should optionally ignore previously unran migrations', () => {
      const files = mn(6);
      const ranMigrations = [
        { name: files[2], timestamp: fakeTime() },
        { name: files[1], timestamp: fakeTime() },
      ];

      expect(filterUp(ranMigrations, files, { ignorePast: true })).to.deep.equal(
        files.slice(3)
      );
    });

    it('should optionally only run migrations up to (and including) the named one', () => {
      let ranMigrations = [];
      let files = mn(6);

      expect(filterUp(ranMigrations, files, { until: files[3] })).to.deep.equal(
        files.slice(0, 4)
      );

      ranMigrations = [
        { name: files[0], timestamp: fakeTime() },
      ];

      expect(filterUp(ranMigrations, files, { until: files[3] })).to.deep.equal(
        files.slice(1, 4)
      );

      files = mn(6);
      ranMigrations = [
        { name: files[2], timestamp: fakeTime() },
      ];

      expect(filterUp(ranMigrations, files, { until: files[4], ignorePast: true })).to.deep.equal(
        files.slice(3, 5)
      );
    });

    it('should optionally only run the specific number of migrations', () => {
      let ranMigrations = [];
      let files = mn(12);

      expect(filterUp(ranMigrations, files, { count: 3 })).to.deep.equal(
        files.slice(0, 3)
      );

      ranMigrations = [
        { name: files[2], timestamp: fakeTime() },
      ];

      expect(filterUp(ranMigrations, files, { count: 7 })).to.deep.equal([
        ...files.slice(0, 2),
        ...files.slice(3, 8),
      ]);

      files = mn(10);
      ranMigrations = [
        { name: files[2], timestamp: fakeTime() },
      ];

      expect(filterUp(ranMigrations, files, { count: 7, ignorePast: true })).to.deep.equal(
        files.slice(3, 10)
      );
    });

    it('should optionally have nothing to migrate if the most recent migration has ran', () => {
      const files = mn(10);
      const ranMigrations = [
        { name: files[files.length - 1], timestamp: fakeTime() },
      ];

      expect(filterUp(ranMigrations, files, { ignorePast: true })).to.deep.equal([]);
    });

    it('should only run the named migration when using --only', () => {
      const files = mn(10);
      const ranMigrations = [
        { name: files[0], timestamp: fakeTime() },
        { name: files[files.length - 1], timestamp: fakeTime() },
      ];

      const output = filterUp(ranMigrations, files, { only: true, until: files[4] });
      expect(output).to.deep.equal([files[4]]);
    });

    it('should require a filename when using the --only flag', () => {
      const files = mn(10);
      const ranMigrations = [
        { name: files[1], timestamp: fakeTime() },
      ];

      const wrapper = () => filterUp(ranMigrations, files, { only: true });
      expect(wrapper).to.throw(Error);
    });
  });

  describe('filterDown', () => {
    it('should require a name cutoff or count', () => {
      const wrapper = () => filterDown([], [], {});
      expect(wrapper).to.throw(Error);
    });

    it('should have nothing to run if no migrations have ran', () => {
      const files = mn(6);
      const ranMigrations = [];

      expect(filterDown(ranMigrations, files, { count: 5 })).to.deep.equal([]);
    });

    it('should only run down the specified number of migrations', () => {
      let files = mn(10);
      let ranMigrations = [
        { name: files[5], timestamp: fakeTime() },
        { name: files[4], timestamp: fakeTime() },
        { name: files[3], timestamp: fakeTime() },
        { name: files[1], timestamp: fakeTime() },
        { name: files[0], timestamp: fakeTime() },
      ];

      expect(filterDown(ranMigrations, files, { count: 5 })).to.deep.equal(
        ranMigrations.map(migration => migration.name)
      );

      files = mn(12);
      ranMigrations = [
        { name: files[4], timestamp: fakeTime() },
        { name: files[3], timestamp: fakeTime() },
        { name: files[1], timestamp: fakeTime() },
      ];

      expect(filterDown(ranMigrations, files, { count: 1 })).to.deep.equal([
        ranMigrations[0].name,
      ]);

      files = mn(42);
      ranMigrations = [
        { name: files[12], timestamp: fakeTime() },
        { name: files[11], timestamp: fakeTime() },
        { name: files[10], timestamp: fakeTime() },
        { name: files[9], timestamp: fakeTime() },
        { name: files[8], timestamp: fakeTime() },
        { name: files[7], timestamp: fakeTime() },
        { name: files[6], timestamp: fakeTime() },
        { name: files[5], timestamp: fakeTime() },
        { name: files[4], timestamp: fakeTime() },
        { name: files[3], timestamp: fakeTime() },
        { name: files[2], timestamp: fakeTime() },
        { name: files[0], timestamp: fakeTime() },
      ];

      expect(filterDown(ranMigrations, files, { count: 20 })).to.deep.equal(
        ranMigrations.map(migration => migration.name)
      );
    });

    it('should only run down the specified migration name', () => {
      const files = mn(5);
      const ranMigrations = [
        { name: files[4], timestamp: fakeTime() },
        { name: files[3], timestamp: fakeTime() },
        { name: files[2], timestamp: fakeTime() },
        { name: files[1], timestamp: fakeTime() },
        { name: files[0], timestamp: fakeTime() },
      ];

      expect(filterDown(ranMigrations, files, { until: files[3] })).to.deep.equal([
        files[4],
        files[3],
      ]);
    });

    it('should throw an error if a migration does not have an associated file', () => {
      const files = mn(3);
      const ranMigrations = [
        { name: files[2], timestamp: fakeTime() },
        { name: files[1], timestamp: fakeTime() },
        { name: files[0], timestamp: fakeTime() },
        { name: m(undefined, false), timestamp: fakeTime() },
      ];

      const wrapper = () => filterDown(ranMigrations, files, { count: 20 });
      expect(wrapper).to.throw(Error);
    });

    it('should only run down the named migration when using --only', () => {
      const files = mn(10);
      const ranMigrations = [
        { name: files[0], timestamp: fakeTime() },
        { name: files[3], timestamp: fakeTime() },
        { name: files[files.length - 1], timestamp: fakeTime() },
      ];

      const output = filterDown(ranMigrations, files, { only: true, until: files[3] });
      expect(output).to.deep.equal([files[3]]);
    });

    it('should require a migration name when using the --only flag', () => {
      const files = mn(10);
      const ranMigrations = [
        { name: files[1], timestamp: fakeTime() },
      ];

      const wrapper = () => filterDown(ranMigrations, files, { only: true });
      expect(wrapper).to.throw(Error);
    });
  });

  describe('filterRollback', () => {
    it('should not fail when no migrations have been ran', () => {
      expect(filterRollback([], [], {})).to.deep.equal([]);
    });

    it('should only select the most recently ran migration', () => {
      const files = mn(3);
      const ranMigrations = [
        { name: files[1], timestamp: 1492792283207 },
        { name: files[0], timestamp: 1492768494310 },
        { name: files[2], timestamp: 1492530783992 },
      ];
      expect(filterRollback(ranMigrations, files, {})).to.deep.equal([files[1]]);
    });

    it('should select all migrations that were ran at the same time', () => {
      const files = mn(5);
      const ranTime = fakeTime();
      const ranMigrations = [
        { name: files[4], timestamp: ranTime },
        { name: files[1], timestamp: ranTime },
        { name: files[0], timestamp: ranTime - 5000 },
        { name: files[3], timestamp: ranTime },
        { name: files[2], timestamp: ranTime - 10000 },
      ];
      expect(filterRollback(ranMigrations, files, {})).to.deep.equal([
        files[4],
        files[3],
        files[1],
      ]);
    });
  });
});
