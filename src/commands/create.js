import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import mkdirp from 'mkdirp';
import config from '../config';

const TEMPLATE = `
exports.up = function(cb) {
  cb();
};

exports.down = function(cb) {
  cb();
};
`;

export default async function createCommand(name) {
  console.log(chalk.gray('Creating new migration'));

  // Ensure the directory exists
  await new Promise((resolve, reject) => {
    mkdirp(config.migrationPath, (err) => {
      if (err) {
        reject(err);
        return;
      }

      resolve();
    });
  });

  const sanitizedName = name.replace(/[\W_]+/g, '-');
  const migrationName = `${Date.now()}-${sanitizedName}.js`;
  const migrationFile = path.join(config.migrationPath, migrationName);

  // Write the file
  await new Promise((resolve, reject) => {
    fs.writeFile(migrationFile, TEMPLATE, (err) => {
      if (err) {
        reject(err);
        return;
      }

      resolve();
    });
  });

  console.log('Created new migration ' + chalk.blue(migrationName));
}
