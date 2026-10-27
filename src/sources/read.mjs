// SPDX-License-Identifier: Apache-2.0
// Resolve declared content, source identity and explicit publication corrections.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import Ajv from 'ajv';
import { hash, noSymlinks, readWithin, filesUnder } from '../build/files.mjs';
import { readGitFiles, verifyProof } from './git.mjs';

const schema = JSON.parse(await readFile(new URL('../../schemas/source.schema.json',import.meta.url),'utf8'));
const validate = new Ajv({allErrors:true,strict:true}).compile(schema);

export const sourceNames = config => [...new Set([...config.pages.map(page => page.source), ...(config.linkedSources || []).map(item => item.source)])].filter(name => !Object.hasOwn(config.siteSources || {}, name)).sort();

export async function readSources(config) {
  const { source, internal } = config;
  const names = sourceNames(config);
  const authoredNames = Object.keys(config.siteSources || {});
  let files, revision = source.revision || null, verified = false, proof, manifest;
  if (source.type === 'git') {
    const repository = resolve(internal.root, source.repository || source.root);
    ({ files, proof } = readGitFiles(repository, revision, names, source.tag, authoredNames));
    verified = true;
  } else {
    files = new Map(await Promise.all(names.map(async name => [name, await readWithin(internal.sourceRoot, name)])));
    if (source.type === 'snapshot') {
      if (!source.manifest) throw new Error('Snapshot sources require a manifest path.');
      const manifestPath = resolve(internal.root, source.manifest);
      await noSymlinks(manifestPath);
      manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
      if (!validate(manifest)) throw new Error('Invalid source snapshot manifest.');
      if (revision && revision !== manifest.revision) throw new Error('Snapshot revision differs from configuration.');
      revision = manifest.revision;
      if (manifest.version !== config.site.version) throw new Error('Snapshot version differs from the site version.');
      if (source.tag && source.tag !== manifest.tag) throw new Error('Snapshot tag differs from configuration.');
      if (JSON.stringify(Object.keys(manifest.files).sort()) !== JSON.stringify(names)) throw new Error('Snapshot inventory differs from declared sources.');
      if (JSON.stringify(await filesUnder(internal.sourceRoot)) !== JSON.stringify(names)) throw new Error('Snapshot directory contains undeclared or missing files.');
      for (const [name, bytes] of files) if (manifest.files[name] !== hash(bytes)) throw new Error(`Source changed without snapshot update: ${name}`);
      if (manifest.proof) { verifyProof(revision, manifest.proof, files, authoredNames); proof = manifest.proof; verified = true; }
      if (source.repository) {
        const original = readGitFiles(resolve(internal.root, source.repository), revision, names, source.tag, authoredNames).files;
        for (const [name, bytes] of files) if (!bytes.equals(original.get(name))) throw new Error(`Snapshot differs from its Git source: ${name}`);
        verified = true;
      }
    }
  }
  const entries = new Map([...files].map(([name, bytes]) => [name, { bytes, kind: source.type, sha256: hash(bytes) }]));
  for (const [name, file] of Object.entries(config.siteSources || {})) {
    if (files.has(name)) throw new Error(`Site-authored page replaces a release source: ${name}`);
    const bytes = await readWithin(internal.root, file);
    entries.set(name, { bytes, kind: 'site', sha256: hash(bytes), sourceFile: file });
  }
  for (const [name, entry] of entries) {
    entry.content = entry.bytes.toString('utf8');
    for (const edit of (config.publicationEdits || []).filter(edit => edit.source === name)) {
      if (entry.content.split(edit.from).length !== 2) throw new Error(`Publication edit must match exactly once: ${name}`);
      entry.content = entry.content.replace(edit.from, () => edit.to);
    }
  }
  if (!verified && config.site.channel !== 'preview') throw new Error('Unverified local or snapshot content must use channel "preview".');
  return { entries, revision, verified, proof, type: source.type, tag: source.tag || manifest?.tag || null, publicationEdits: config.publicationEdits || [] };
}
