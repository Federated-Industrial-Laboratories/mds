// SPDX-License-Identifier: Apache-2.0
// Install starter files or portable skills without replacing project-owned edits.
import { readFile, mkdir, rm } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contains, filesUnder, readWithin, exists, hash, json, noSymlinks, put, atomicFile, safeRelative } from './files.mjs';

const packageRoot = fileURLToPath(new URL('../../',import.meta.url));

export async function init(destination = '.', options = {}) {
  const target = resolve(destination), source = resolve(packageRoot,'examples/starter');
  if (contains(packageRoot,target)) throw new Error('Starter destination overlaps the installed package.');
  await noSymlinks(target);
  const names = (await filesUnder(source)).filter(name => name === 'mds.config.json' || name.startsWith('content/') || name === 'README.md');
  if (!names.includes('mds.config.json')) throw new Error('The package starter is incomplete.');
  for (const name of names) if (await exists(resolve(target,name))) throw new Error(`Starter would replace an existing file: ${name}`);
  // Preserve an existing ignore policy; new projects exclude generated/private state.
  if (!await exists(resolve(target,'.gitignore'))) names.push('.gitignore');
  const result = { dryRun:!options.write, destination:target, files:names };
  if (options.write) for (const name of names) await put(target,name,await readWithin(source,name === '.gitignore' ? 'gitignore' : name));
  return result;
}

export async function installSkills(destination, options = {}) {
  if (!destination) throw new Error('Skill installation requires --destination DIR.');
  const target = resolve(destination), source = resolve(packageRoot,'skills');
  if (contains(source,target) || contains(target,source)) throw new Error('Skill destination overlaps package skills.');
  await noSymlinks(target);
  const marker = resolve(target,'.mds-skills.json');
  const old = await exists(marker) ? JSON.parse((await readWithin(target,'.mds-skills.json')).toString()) : {schemaVersion:1,files:{}};
  if (old.schemaVersion !== 1 || typeof old.files !== 'object' || !old.files || Array.isArray(old.files)) throw new Error('Invalid skill ownership inventory.');
  const names = (await filesUnder(source)).filter(name => !name.startsWith('.'));
  const next = {}, contents = new Map();
  for (const name of names) { const bytes = await readWithin(source,name); contents.set(name,bytes); next[name] = hash(bytes); }
  for (const [name,digest] of Object.entries(old.files)) {
    safeRelative(name);
    if (!/^[a-f0-9]{64}$/.test(digest) || !await exists(resolve(target,name)) || hash(await readWithin(target,name)) !== digest) throw new Error(`Installed skill was edited or removed; preserve and reconcile it before updating: ${name}`);
  }
  for (const name of names) if (!Object.hasOwn(old.files,name) && await exists(resolve(target,name))) throw new Error(`Skill installation would overwrite a project-owned file: ${name}`);
  const removed = Object.keys(old.files).filter(name => !Object.hasOwn(next,name));
  const changed = names.filter(name => next[name] !== old.files[name]);
  const result = {dryRun:!options.write,destination:target,changed,removed};
  if (options.write) {
    for (const name of changed) await put(target,name,contents.get(name));
    for (const name of removed) await rm(resolve(target,name));
    await atomicFile(marker,json({schemaVersion:1,files:next}));
  }
  return result;
}
