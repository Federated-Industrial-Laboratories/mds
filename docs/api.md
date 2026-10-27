# Command and API reference

Run the installed package with `npx --no-install mds`. Commands use
`mds.config.json` in the working directory unless `--config FILE` is supplied.
Filesystem paths inside that configuration are relative to its directory.

## Commands

| Command | Purpose and options |
| --- | --- |
| `mds init [directory]` | Preview starter files. Add `--write` to create them. Default directory: `.`. |
| `mds build` | Build documentation and private metadata. `--dry-run` resolves the intended work without writing output. |
| `mds check` | Check generated files, links, anchors and current source identity. `--release` also requires verified, non-preview content. |
| `mds preview` | Serve the built documentation on loopback. Default `--port`: `4173`. Stop with Ctrl+C. |
| `mds snapshot` | Preview a Git snapshot update. Use `--revision FULL_COMMIT`, optional `--tag TAG` and `--version PRODUCT_VERSION`. Add `--write` to export. |
| `mds package` | Copy checked output into a new `--destination DIR`. Add `--release` for release-source checks. |
| `mds skills` | Preview skill installation in `--destination DIR`. Add `--write` to apply owned-file changes. |
| `mds version` | Print the MDS package version. |

Use `--help` for command help. `--json` prints structured success results.
Commands return exit code 0 for success and 1 for an error. Errors go to standard
error. The preview remains running until stopped.

Build, check and package do not fetch source repositories or execute manual
contents. No command commits, pushes, deploys or changes repository visibility.
`init` does not edit an existing package manifest or project instruction file.

## JavaScript API

The package exports asynchronous functions from `@metalheart/mds`:

```js
import { build, check, packageSite } from '@metalheart/mds';

const configFile = 'mds.config.json';
await build(configFile);
await check(configFile, { release: true });
await packageSite(configFile, {
  destination: 'release-docs',
  release: true
});
```

Use verified non-preview source content for this release example. API failures
throw errors; callers should report them without publishing partial output.

| Export | Signature |
| --- | --- |
| `build` | `build(configFile, { dryRun })` |
| `check` | `check(configFile, { release })` |
| `packageSite` | `packageSite(configFile, { destination, release })` |
| `snapshot` | `snapshot(configFile, { revision, tag, version, write })` |
| `preview` | `preview(configFile, { port })`; returns a server and URL. |
| `init` | `init(directory, { write })` |
| `installSkills` | `installSkills(directory, { write })` |
| `loadConfig` | `loadConfig(configFile)`; validates and resolves a configuration. |

Stop a server returned by `preview` with its `close` method when finished.
Use the documented configuration format rather than importing internal source
modules. Result objects describe the completed command; private metadata may
contain local paths and must not be exposed as public site data.

## Formats and compatibility

Configuration and source snapshot manifests use schema version 1. The installed
package includes their JSON schemas. Theme catalogue data is supplied by the
versioned package; browser theme import is not supported in 0.1.

The package also exports its maintained theme module as `@metalheart/mds/themes`.
Use documented catalogue identifiers in site configuration. Treat internal colour
roles and component markup as implementation details unless a later release
documents an extension contract.

Pin the exact package archive and lockfile. During the 0.x series, minor releases
can change documented interfaces with migration notes. See
[migration and upgrades](migration.md#upgrade-mds).
