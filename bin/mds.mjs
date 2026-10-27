#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
// Run local documentation commands; inputs are flags/configuration, outputs are files/results, exits are 0 or 1.
import { parseArgs } from 'node:util';
import { readFile } from 'node:fs/promises';
import { build, check, preview, snapshot, packageSite, init, installSkills } from '../src/index.mjs';

const help = `MDS - Metalheart Documentation Style

Usage: mds COMMAND [options]

  init [directory]   Preview starter files; add --write to create them
  build              Build static manuals and private provenance
  check              Check output and source identity; --release requires verified release content
  preview            Serve documentation on loopback; default --port 4173
  snapshot           Preview a Git snapshot update; add --write to export it
  package            Copy checked output into --destination DIR/site
  skills             Preview skill installation in --destination DIR; add --write to install
  version            Print the MDS package version

Shared options:
  --config FILE      Project configuration (default mds.config.json)
  --json             Print structured results
  --help             Show this help

Snapshot options: --revision FULL_SHA [--tag TAG] [--version PRODUCT_VERSION]
Build option: --dry-run
Package option: --release
No command commits, pushes or deploys a site.
`;

try {
  const {values,positionals} = parseArgs({allowPositionals:true,strict:true,options:{config:{type:'string'},json:{type:'boolean'},help:{type:'boolean',short:'h'},write:{type:'boolean'},'dry-run':{type:'boolean'},release:{type:'boolean'},port:{type:'string'},destination:{type:'string'},revision:{type:'string'},tag:{type:'string'},version:{type:'string'}}});
  const [command, directory, ...extra] = positionals;
  if (values.help || !command) { console.log(help); }
  else {
    if (extra.length || (directory && command !== 'init')) throw new Error('Unexpected positional argument. Use --help for command syntax.');
    const config = values.config || 'mds.config.json';
    const options = {...values,dryRun:values['dry-run']};
    let result;
    if (command === 'init') result = await init(directory,options);
    else if (command === 'build') result = await build(config,options);
    else if (command === 'check') result = await check(config,options);
    else if (command === 'snapshot') result = await snapshot(config,options);
    else if (command === 'package') result = await packageSite(config,options);
    else if (command === 'skills') result = await installSkills(values.destination,options);
    else if (command === 'version') result = {version:JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8')).version};
    else if (command === 'preview') {
      const {server,url} = await preview(config,options);
      result = {url};
      for (const signal of ['SIGINT','SIGTERM']) process.once(signal,() => server.close(() => process.exit(0)));
    } else throw new Error(`Unknown command: ${command}`);
    if (values.json) console.log(JSON.stringify(result));
    else if (result.url) console.log(`Preview: ${result.url}`);
    else console.log(JSON.stringify(result,null,2));
  }
} catch (error) { console.error(`mds: ${error.message}`); process.exitCode = 1; }
