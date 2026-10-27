// SPDX-License-Identifier: Apache-2.0
// Export declared release files with Git proofs and reviewable, ownership-aware updates.
import { readFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { loadConfig } from '../build/config.mjs';
import { sourceNames } from './read.mjs';
import { readGitFiles } from './git.mjs';
import { hash, json, exists, digests, put, noSymlinks, atomicFile, replaceDirectory, verifyFiles, contains } from '../build/files.mjs';

export async function snapshot(file, options = {}) {
  const config = await loadConfig(file);
  if (config.source.type !== 'snapshot' || !config.source.repository || !config.source.manifest) throw new Error('Snapshot export requires type "snapshot", a repository and a manifest path.');
  const revision = options.revision || config.source.revision;
  const tag = options.tag || config.source.tag;
  const version = options.version || config.site.version;
  const names = sourceNames(config);
  const repository = resolve(config.internal.root, config.source.repository);
  const { files, proof } = readGitFiles(repository, revision, names, tag, Object.keys(config.siteSources || {}));
  const target = config.internal.sourceRoot;
  const manifestPath = resolve(config.internal.root, config.source.manifest);
  if (contains(target, config.internal.file) || contains(target, manifestPath) || contains(target, repository) || contains(repository, target)) throw new Error('Snapshot output must be separate from the repository, configuration and manifest.');
  await noSymlinks(target); await noSymlinks(manifestPath);
  const oldManifestBytes = await exists(manifestPath) ? await readFile(manifestPath) : null;
  const oldConfigBytes = await readFile(config.internal.file);
  if (oldManifestBytes) {
    const old = JSON.parse(oldManifestBytes);
    if (old.schemaVersion !== 1 || !old.files) throw new Error('Existing snapshot manifest is not owned by MDS.');
    await verifyFiles(target, old.files);
  } else if (Object.keys(await digests(target)).length) throw new Error('Snapshot destination contains unowned files.');
  const manifest = {schemaVersion:1,version,revision,...(tag ? {tag} : {}),files:Object.fromEntries([...files].map(([name,bytes]) => [name,hash(bytes)])),proof};
  const result = { dryRun:!options.write, revision, version, files:names, destination:target, manifest:manifestPath };
  if (!options.write) return result;
  await mkdir(dirname(target), {recursive:true});
  const stage = await mkdtemp(target + '.snapshot-');
  try {
    for (const [name,bytes] of files) await put(stage,name,bytes);
    const next = structuredClone(config.internal.raw);
    next.source.revision = revision; next.site.version = version;
    if (tag) next.source.tag = tag;
    await replaceDirectory(stage,target,async () => {
      try {
        if (hash(await readFile(config.internal.file)) !== hash(oldConfigBytes)) throw new Error('Configuration changed during snapshot export.');
        await atomicFile(manifestPath,json(manifest));
        await atomicFile(config.internal.file,json(next));
      } catch (error) {
        if (oldManifestBytes) await atomicFile(manifestPath,oldManifestBytes);
        else await rm(manifestPath,{force:true});
        throw error;
      }
    });
  } finally { await rm(stage,{recursive:true,force:true}); }
  return result;
}
