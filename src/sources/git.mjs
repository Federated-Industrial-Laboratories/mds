// SPDX-License-Identifier: Apache-2.0
// Read immutable Git objects and verify portable snapshot proofs without executing project code.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { safeRelative } from '../build/files.mjs';

export const objectId = (type, bytes) => createHash('sha1').update(Buffer.from(`${type} ${bytes.length}\0`)).update(bytes).digest('hex');
export function git(repository, args) {
  return execFileSync('git', ['--no-optional-locks', '-C', repository, ...args], { maxBuffer: 40 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
}
export function verifyRevision(repository, revision, tag) {
  if (!/^[a-f0-9]{40}$/.test(revision || '')) throw new Error('Use a full 40-character Git commit.');
  if (git(repository, ['rev-parse', `${revision}^{commit}`]).toString().trim() !== revision) throw new Error('Source commit does not match the requested revision.');
  if (tag && git(repository, ['rev-parse', `refs/tags/${tag}^{commit}`]).toString().trim() !== revision) throw new Error('Release tag does not point to the source commit.');
  return revision;
}
function treeEntries(bytes) {
  const entries = new Map();
  for (let offset = 0; offset < bytes.length;) {
    const space = bytes.indexOf(32, offset), end = bytes.indexOf(0, space);
    if (space < 0 || end < 0 || end + 21 > bytes.length) throw new Error('Invalid Git tree proof.');
    const mode = bytes.subarray(offset, space).toString();
    const name = bytes.subarray(space + 1, end).toString();
    if (entries.has(name)) throw new Error('Duplicate Git tree entry.');
    entries.set(name, { mode, id: bytes.subarray(end + 1, end + 21).toString('hex') });
    offset = end + 21;
  }
  return entries;
}
export function snapshotProof(repository, revision, names, authoredNames = []) {
  verifyRevision(repository, revision);
  const commit = git(repository, ['cat-file', 'commit', revision]);
  const root = /^tree ([a-f0-9]{40})\n/.exec(commit.toString())?.[1];
  if (!root) throw new Error('Unsupported Git commit.');
  const proof = { commit: commit.toString('base64'), trees: {} };
  for (const name of [...names, ...authoredNames]) {
    const authored = authoredNames.includes(name);
    safeRelative(name);
    let id = root;
    const parts = name.split('/');
    for (let i = 0; i < parts.length; i++) {
      const bytes = proof.trees[id] ? Buffer.from(proof.trees[id], 'base64') : git(repository, ['cat-file', 'tree', id]);
      proof.trees[id] = bytes.toString('base64');
      const entry = treeEntries(bytes).get(parts[i]);
      if (authored) {
        if (!entry || (i < parts.length - 1 && entry.mode !== '40000')) break;
        if (i === parts.length - 1) throw new Error(`Site-authored page replaces a Git source: ${name}`);
        id = entry.id;
        continue;
      }
      if (!entry || (i < parts.length - 1 ? entry.mode !== '40000' : !['100644', '100755'].includes(entry.mode))) throw new Error(`Source is missing or not a regular Git file: ${name}`);
      id = entry.id;
    }
  }
  return proof;
}
export function verifyProof(revision, proof, files, authoredNames = []) {
  if (!proof || typeof proof.commit !== 'string' || typeof proof.trees !== 'object' || !proof.trees) throw new Error('Snapshot needs a Git object proof or a local source repository.');
  const commit = Buffer.from(proof.commit, 'base64');
  if (objectId('commit', commit) !== revision) throw new Error('Snapshot commit proof does not match revision.');
  const root = /^tree ([a-f0-9]{40})\n/.exec(commit.toString())?.[1];
  if (!root) throw new Error('Invalid snapshot commit proof.');
  const trees = new Map();
  for (const [id, encoded] of Object.entries(proof.trees)) {
    if (typeof encoded !== 'string') throw new Error('Invalid tree proof encoding.');
    const bytes = Buffer.from(encoded, 'base64');
    if (objectId('tree', bytes) !== id) throw new Error('Snapshot tree proof does not match its identity.');
    trees.set(id, treeEntries(bytes));
  }
  for (const [name, bytes] of files) {
    let id = root;
    const parts = safeRelative(name).split('/');
    for (let i = 0; i < parts.length; i++) {
      const entry = trees.get(id)?.get(parts[i]);
      if (!entry || (i < parts.length - 1 ? entry.mode !== '40000' : !['100644', '100755'].includes(entry.mode))) throw new Error(`Snapshot proof does not contain a regular file: ${name}`);
      id = entry.id;
    }
    if (objectId('blob', bytes) !== id) throw new Error(`Snapshot bytes do not belong to the declared revision: ${name}`);
  }
  for (const name of authoredNames) {
    let id = root;
    const parts = safeRelative(name).split('/');
    for (let i = 0; i < parts.length; i++) {
      if (!trees.has(id)) throw new Error(`Snapshot proof cannot establish site-authored path absence: ${name}`);
      const entry = trees.get(id).get(parts[i]);
      if (!entry || (i < parts.length - 1 && entry.mode !== '40000')) break;
      if (i === parts.length - 1) throw new Error(`Site-authored page replaces a Git source: ${name}`);
      id = entry.id;
    }
  }
  return true;
}
export function readGitFiles(repository, revision, names, tag, authoredNames = []) {
  verifyRevision(repository, revision, tag);
  const proof = snapshotProof(repository, revision, names, authoredNames);
  const files = new Map(names.map(name => [name, git(repository, ['show', `${revision}:${name}`])]));
  verifyProof(revision, proof, files, authoredNames);
  return { files, proof };
}
