// SPDX-License-Identifier: Apache-2.0
// Enforce file containment and preserve ownership during generated-output replacement.
import { lstat, readdir, readFile, mkdir, writeFile, rename, rm } from 'node:fs/promises';
import { resolve, relative, dirname, sep, parse } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

export const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export const json = value => JSON.stringify(value, null, 2) + '\n';
export const contains = (root, path) => path === root || (!relative(root, path).startsWith('..' + sep) && relative(root, path) !== '..' && !parse(relative(root, path)).root);
export async function exists(path) { try { await lstat(path); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; } }

export function safeRelative(value, { empty = false } = {}) {
  if (typeof value !== 'string' || (!empty && !value) || /[\\\x00-\x1f\x7f:#?%]/.test(value) || value.startsWith('/') || value.split('/').some(part => ['.', '..', '.git'].includes(part) || (!part && value !== ''))) throw new Error(`Unsafe relative path: ${value}`);
  return value;
}

export async function noSymlinks(path) {
  const absolute = resolve(path);
  let cursor = parse(absolute).root;
  for (const part of absolute.slice(cursor.length).split(sep).filter(Boolean)) {
    cursor = resolve(cursor, part);
    try { if ((await lstat(cursor)).isSymbolicLink()) throw new Error(`Symbolic links are not supported: ${cursor}`); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
}

export async function readWithin(root, name) {
  safeRelative(name);
  const file = resolve(root, name);
  if (!contains(resolve(root), file)) throw new Error(`Source escapes its root: ${name}`);
  await noSymlinks(file);
  const info = await lstat(file);
  if (!info.isFile() || info.size > 32 * 1024 * 1024) throw new Error(`Source must be a regular file of at most 32 MiB: ${name}`);
  return readFile(file);
}

export async function filesUnder(root) {
  if (!await exists(root)) return [];
  await noSymlinks(root);
  const files = [];
  async function visit(dir, prefix) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const name = prefix + entry.name;
      if (entry.isSymbolicLink()) throw new Error(`Symbolic link in output: ${name}`);
      if (entry.isDirectory()) await visit(resolve(dir, entry.name), name + '/');
      else if (entry.isFile()) files.push(name);
      else throw new Error(`Non-regular output: ${name}`);
    }
  }
  await visit(root, '');
  return files.sort();
}

export async function digests(root) {
  return Object.fromEntries(await Promise.all((await filesUnder(root)).map(async name => [name, hash(await readWithin(root, name))])));
}

export async function verifyFiles(root, expected) {
  const actual = await digests(root);
  if (JSON.stringify(Object.keys(actual).sort()) !== JSON.stringify(Object.keys(expected).sort())) throw new Error('Generated output contains missing or unowned files.');
  for (const [name, digest] of Object.entries(expected)) if (actual[name] !== digest) throw new Error(`Generated output changed: ${name}`);
  return actual;
}

export async function put(root, name, data) {
  safeRelative(name);
  const file = resolve(root, name);
  await noSymlinks(file);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, data);
}

export async function atomicFile(path, data) {
  await noSymlinks(path);
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${randomUUID()}.tmp`;
  try { await writeFile(temporary, data, { flag: 'wx' }); await rename(temporary, path); }
  finally { await rm(temporary, { force: true }); }
}

export async function replaceDirectory(stage, target, commitMetadata) {
  await noSymlinks(target);
  const backup = `${target}.${randomUUID()}.previous`;
  const hadTarget = await exists(target);
  if (hadTarget) await rename(target, backup);
  try { await rename(stage, target); await commitMetadata(); }
  catch (error) {
    await rm(target, { recursive: true, force: true });
    if (hadTarget) await rename(backup, target);
    throw error;
  }
  if (hadTarget) await rm(backup, { recursive: true });
}
