# abstract migrate

Abstract migrate is a data-agnostic tool for running scripts (e.g., migrations) once.

## Usage

Install with `yarn`:
 
    $ yarn global add abstract-migrate
 
 or `npm`:
     
    $ npm i -g abstract-migrate

Now you can execute the provided CLI interface:

    $ am --help

### Create an Engine

This library was written to be storage agnostic. You will need to write some code to tell
`abstract-migrate` how to store details about things it has ran. Your engine is expected to export
five methods:

```js
module.exports = {
  // Returns all of the loaded migrations from your storage in the format:
  // [{ name, timestamp }, ...] 
  load: function(/* cb */) {
    // ...
  },
  
  // Persist a collection of migrations to your storage. Migrations will be an array in the same
  // format as the `load` function: [{ name, timestamp }, ...]
  add: function(migrations/*, cb */) {
    // ...
  },
  
  // Remove a collection of migrations to your storage. Migrations will be an array in the same
  // format as the `load` and `add` function: [{ name, timestamp }, ...]
  remove: function(migrations/*, cb */) {
    // ...
  },
  
  // Ask the storage for a lock to prevent running migrations multiple times. This function should
  // return `true` if it was able to acquire a lock or `false` otherwise.
  acquireLock: function(/* cb */) {
    // ...
  },
  
  // This will denote that the process is done and the storage engine can release whatever lock it
  // acquired earlier.
  releaseLock: function(/* cb */) {
    // ...
  },
};
```

All of the above functions can return a promise that resolves to the desired value, or use the
callback that is passed as the last argument to every engine function.

There is a basic [filesystem engine](src/engines/fileEngine.js) that can be used as an example
engine implementation.

**Caution:** Pay extra attention to make your `acquireLock` function is atomic so that it does not
create a race condition where two simultaneous executions can acquire a lock at the same time. If
there is no case where this command will be run multiple times, you can "ignore" locking by
immediately resolving your `acquireLock` function to `true`.

### Configuration

Now that you have your engine, you will need to tell `abstract-migrate` how to use it. You can
configure this library via the command line interface (see the CLI help output `am --help`) or via
a JSON file. Using the JSON file is the recommended option. By default, this library will look for
a file named `.abstract-migrate.json`, but you can configure this location using the CLI. The
configuration file accepts the following options:

 - **engine**: The migration storage engine to use
 - **require**: A JavaScript file (or array of files) to require before running
 - **timeout**: The amount of time before a promise will timeout in ms (default: `30000`)
 - **noColor**: Disables color output (default: `false`)
 - **migrationPath**: The directory where migration files are stored (default: `migrations`)

#### Example `.abstract-migrate.json`

```json
{
  "engine": "./src/postgresEngine.js",
  "require": "babel-require",
  "migrations": "db/migrations",
  "noColor": true
}
```

### Commands

#### create 

    $ am create my-cool-migration

This command will create a migration of the given name in the migrations folder. The migration will
be a simple file that exports an `up` and `down` function. The `up` and `down` functions can either
return a promise or call the provided callback function.

#### list (alias: ls)

    $ am list

This command will list all of the migrations in the migration directory and denote whether or not a
given migration has been run.

#### up

    $ am up

This command will run all of the unran migrations. By default, this won't run migrations which are
older than the most previously applied migration. This behavior can be modified with the
`--past-unran` (`-p`) flag.

You can specify a migration name to migrate _up to and including_ the named migration:

    $ am up 1492708337968-my-cool-migration

or specifying the number of migrations to apply:

    $ am up 2

You can pass the `--dry-run` (`-d`) flag to preview which migrations will be run.

#### down

    $ am down 2

This command will roll back the specified number of migrations. You can also specify a migration
name to migrate _down to and including_ the named migration:

    $ am down 1492708337968-my-cool-migration

You can pass the `--dry-run` (`-d`) flag to preview which migrations will be run down.
