// SPDX-License-Identifier: Apache-2.0
// Package only checked public files and keep provenance outside the served directory.
import { readFile, mkdir, mkdtemp, rm, rename } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { loadConfig } from './config.mjs';
import { check, readBuildMetadata } from './check.mjs';
import { contains, exists, json, noSymlinks, put, hash, verifyFiles } from './files.mjs';

export async function packageSite(file, options = {}) {
  if (!options.destination) throw new Error('Package requires --destination DIR.');
  const config = await loadConfig(file);
  const target = resolve(options.destination);
  const { outputRoot, sourceRoot, metadataPath } = config.internal;
  if ([outputRoot,sourceRoot].some(root => contains(root,target) || contains(target,root))) throw new Error('Package destination overlaps source or build output.');
  await noSymlinks(target);
  if (await exists(target)) throw new Error('Package destination already exists. Choose a new directory.');
  const checked = await check(file,options);
  const metadata = await readBuildMetadata(config);
  await mkdir(dirname(target),{recursive:true});
  const stage = await mkdtemp(target + '.package-');
  try {
    for (const [name,digest] of Object.entries(metadata.files)) {
      const bytes = await readFile(resolve(config.internal.docsRoot,name));
      if (hash(bytes) !== digest) throw new Error(`Output changed during packaging: ${name}`);
      await put(stage,'site/' + config.paths.docsPath + name,bytes);
    }
    const publicFiles = Object.fromEntries(Object.entries(metadata.files).map(([name,digest]) => [config.paths.docsPath + name,digest]));
    await verifyFiles(resolve(stage,'site'),publicFiles);
    await put(stage,'checksums.json',json({schemaVersion:1,files:publicFiles}));
    await put(stage,'provenance.json',await readFile(metadataPath));
    await put(stage,'README.txt',`Serve only the site/ directory.\nDocumentation URL: ${config.urls.docs}\nProduct version: ${config.site.version}\nMDS version: ${metadata.packageVersion}\nThis package does not deploy itself.\n`);
    await rename(stage,target);
  } catch (error) { await rm(stage,{recursive:true,force:true}); throw error; }
  return {...checked,package:target,publicRoot:resolve(target,'site')};
}
