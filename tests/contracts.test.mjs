// SPDX-License-Identifier: Apache-2.0
// Protect source identity, publication isolation and portable authoring workflows.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm, symlink, cp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { build, check, snapshot, packageSite, init, installSkills, loadConfig } from '../src/index.mjs';
import { renderDocument } from '../src/build/render.mjs';
import { hash, json, exists } from '../src/build/files.mjs';
import { readGitFiles, verifyProof } from '../src/sources/git.mjs';

async function fixture(t, change = {}) {
  const root = await mkdtemp(join(tmpdir(),'mds-contract-'));
  t.after(() => rm(root,{recursive:true,force:true}));
  await mkdir(join(root,'content'));
  const config = {schemaVersion:1,site:{id:'sample',title:'Sample',version:'1.0',channel:'preview'},source:{type:'local',root:'content'},navigation:[{title:'Guide',pages:[{source:'index.md',slug:'',label:'Start'},{source:'next.md',slug:'nested/next',label:'Next'}]}],...change};
  await writeFile(join(root,'mds.config.json'),json(config));
  await writeFile(join(root,'content/index.md'),'# Start\n\n[Next](next.md#repeat-1)\n\n```sh\necho "<script>literal</script>"\n```\n');
  await writeFile(join(root,'content/next.md'),'# Next\n\n## Repeat\n\nFirst.\n\n## Repeat\n\nSecond.\n\n[Start](index.md)\n');
  return {root,config,file:join(root,'mds.config.json')};
}

test('static build preserves code, anchors and subpath URLs and keeps metadata private',async t => {
  const {root,file} = await fixture(t,{paths:{basePath:'/project/',docsPath:'manuals/',output:'public',metadata:'.mds/state.json'}});
  const result = await build(file);
  assert.equal(result.documents,2);
  const html = await readFile(join(root,'public/manuals/index.html'),'utf8');
  assert.match(html,/\/project\/manuals\/nested\/next\/#repeat-1/);
  assert.match(html,/echo "&lt;script&gt;literal&lt;\/script&gt;"/);
  assert.match(html,/<pre tabindex="0" role="region" aria-label="Code example">/);
  assert.equal(await exists(join(root,'public/manuals/manifest.json')),false);
  assert.equal((await check(file)).sourceVerified,false);
  await assert.rejects(check(file,{release:true}),/verified/);
  const archive = join(root,'package');
  await packageSite(file,{destination:archive});
  assert.equal(await exists(join(archive,'site/manuals/index.html')),true);
  assert.equal(await exists(join(archive,'site/provenance.json')),false);
  assert.equal(await exists(join(archive,'provenance.json')),true);
});

test('root hosting and generic author content work without repository-specific cleanup',async t => {
  const {root,file} = await fixture(t,{paths:{basePath:'/',docsPath:'',output:'public'}});
  await writeFile(join(root,'content/index.md'),'# Start\n\n[One](next.md) | [Two](next.md#repeat)\n');
  await build(file);
  assert.match(await readFile(join(root,'public/index.html'),'utf8'),/>One<\/a> \| <a/);
  assert.equal((await check(file)).pages,3);
});

test('a failed rebuild preserves output and rejects edited or undeclared generated files',async t => {
  const {root,file} = await fixture(t);
  await build(file);
  const target = join(root,'_site/docs/index.html'), before = await readFile(target);
  await writeFile(join(root,'content/next.md'),'# Next\n\n[Missing](missing.md)\n');
  await assert.rejects(build(file),/Unknown document link/);
  assert.deepEqual(await readFile(target),before);
  await assert.rejects(check(file),/sources changed/);
  await writeFile(join(root,'_site/docs/unowned.txt'),'Preserve this file');
  await assert.rejects(build(file),/unowned/);
  assert.equal(await readFile(join(root,'_site/docs/unowned.txt'),'utf8'),'Preserve this file');
});

test('configuration rejects unknown settings, escaping paths, symlinks and overlapping output',async t => {
  const {root,config,file} = await fixture(t);
  await writeFile(file,json({...config,unknown:true}));
  await assert.rejects(loadConfig(file),/configuration/);
  await writeFile(file,json({...config,labels:{unknown:'Unused'}}));
  await assert.rejects(loadConfig(file),/configuration/);
  await writeFile(file,json({...config,paths:{output:'content',docsPath:''}}));
  await assert.rejects(loadConfig(file),/overlap/);
  await writeFile(file,json({...config,navigation:[{title:'Guide',pages:[{source:'../private.md',slug:'',label:'Unsafe'}]}]}));
  await assert.rejects(loadConfig(file),/Unsafe/);
  await writeFile(file,json(config));
  await symlink(join(root,'content'),join(root,'_site'));
  await assert.rejects(build(file),/Symbolic/);
});

test('primary interface labels remain plain text in navigation and search',async t => {
  const {root,file} = await fixture(t,{labels:{documentMenu:'Manuals',search:'Find <manuals>'}});
  await build(file);
  const html = await readFile(join(root,'_site/docs/index.html'),'utf8');
  assert.match(html,/>Manuals <span/);
  assert.match(html,/<span>Find &lt;manuals&gt;<\/span>/);
  assert.match(html,/<h2 id="search-title">Find &lt;manuals&gt;<\/h2>/);
});

test('project logos preserve their bytes, follow deployment paths and refuse stale or unsafe inputs',async t => {
  const {root,file,config} = await fixture(t,{paths:{basePath:'/project/',docsPath:'manuals/'},branding:{logo:'logo.svg',darkLogo:'dark.svg'}});
  const logo = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path fill="#174f7d" d="M8 8h48v48H8z"/></svg>\n';
  await writeFile(join(root,'logo.svg'),logo);
  await writeFile(join(root,'dark.svg'),logo.replace('#174f7d','#ffffff'));
  await build(file);
  const output = join(root,'_site/manuals');
  assert.equal(await readFile(join(output,'_mds/branding/logo.svg'),'utf8'),logo);
  const html = await readFile(join(output,'index.html'),'utf8');
  assert.match(html,/src="\/project\/manuals\/_mds\/branding\/logo\.svg"/);
  assert.match(html,/src="\/project\/manuals\/_mds\/branding\/logo-dark\.svg"/);
  assert.match(html,/rel="icon" href="\/project\/manuals\/_mds\/branding\/logo\.svg"/);
  await check(file);
  await packageSite(file,{destination:join(root,'package')});
  assert.equal(await readFile(join(root,'package/site/manuals/_mds/branding/logo.svg'),'utf8'),logo);
  await writeFile(join(root,'logo.svg'),logo.replace('#174f7d','#123456'));
  await assert.rejects(check(file),/Branding images changed/);
  for (const content of ['<script>alert(1)</script>','<image href="https://example.com/a.png"/>','<path onclick="alert(1)"/>','<path fill="url(https://example.com/a.svg)"/>']) {
    await writeFile(join(root,'logo.svg'),`<svg xmlns="http://www.w3.org/2000/svg">${content}</svg>`);
    await assert.rejects(build(file),/logo SVG/i);
    assert.equal(await readFile(join(output,'_mds/branding/logo.svg'),'utf8'),logo);
  }
  config.branding.logo='../outside.svg';
  await writeFile(file,json(config));
  await assert.rejects(build(file),/Unsafe/);
});

test('safe HTML subset removes executable content and default Markdown shows HTML literally',() => {
  const page = {source:'index.md',label:'Start',url:'/docs/'};
  const map = new Map([['next.md','/docs/next/']]);
  const safe = renderDocument('# Start\n\n<details open><summary>More</summary><p>Hello <a href="next.md">next</a></p></details>\n<script>alert(1)</script>\n<img src="https://example.com/x" onerror="alert(2)">',page,map,{html:false});
  assert.doesNotMatch(safe.html,/<script|<img/);
  const subset = renderDocument('# Start\n\n<details open><summary>More</summary><p onclick="alert(2)">Hello <a href="next.md">next</a></p></details>\n<script>alert(1)</script>\n<iframe src="https://example.com"></iframe>',page,map,{html:true});
  assert.match(subset.html,/<details open>/);
  assert.match(subset.html,/href="\/docs\/next\/"/);
  assert.doesNotMatch(subset.html,/<script|<iframe|onclick|alert\(/);
  assert.throws(() => renderDocument('# Start\n\n<a href="jav&#x61;script:alert(1)">Bad</a>',page,map,{html:true}),/Unsupported/);
  assert.throws(() => renderDocument('# Start\n\n![Remote](https://example.com/tracker.png)',page,map),/local assets/);
});

test('snapshot export binds bytes to Git, works offline and refuses rehashed tampering',async t => {
  const {root,config,file} = await fixture(t);
  const repository = join(root,'repository');
  await mkdir(repository);
  const git = args => execFileSync('git',['-C',repository,...args],{stdio:['ignore','pipe','pipe']}).toString().trim();
  git(['init','-q']);
  await writeFile(join(repository,'index.md'),'# Start\n\n[Next](next.md)\n');
  await writeFile(join(repository,'next.md'),'# Next\n\nA verified manual.\n');
  git(['add','index.md','next.md']);
  git(['-c','user.name=MDS test','-c','user.email=mds@example.invalid','-c','commit.gpgsign=false','commit','-qm','Add fixture manuals']);
  const revision = git(['rev-parse','HEAD']);
  git(['tag','v1.0']);
  config.source = {type:'snapshot',root:'snapshot',repository:'repository',manifest:'source.json',revision,tag:'v1.0'};
  config.site.channel = 'release';
  await writeFile(file,json(config));
  const dry = await snapshot(file,{revision});
  assert.equal(dry.dryRun,true);
  assert.equal(await exists(join(root,'snapshot')),false);
  await snapshot(file,{revision,write:true});
  delete config.source.repository;
  await writeFile(file,json(config));
  await build(file);
  assert.equal((await check(file,{release:true})).sourceVerified,true);
  const manifestPath = join(root,'source.json'), manifest = JSON.parse(await readFile(manifestPath,'utf8'));
  await writeFile(join(root,'snapshot/next.md'),'# Next\n\nTampered.\n');
  manifest.files['next.md'] = hash(await readFile(join(root,'snapshot/next.md')));
  await writeFile(manifestPath,json(manifest));
  await assert.rejects(build(file),/do not belong/);
});

test('site-authored snapshot pages prove absence from Git, including all-authored exports',async t => {
  const {root,config,file} = await fixture(t);
  const repository = join(root,'repository');
  await mkdir(join(repository,'nested'),{recursive:true});
  const git = args => execFileSync('git',['-C',repository,...args],{stdio:['ignore','pipe','pipe']}).toString().trim();
  git(['init','-q']);
  await writeFile(join(repository,'index.md'),'# Released manual\n');
  await writeFile(join(repository,'nested/existing.md'),'# Existing nested manual\n');
  git(['add','index.md','nested/existing.md']);
  git(['-c','user.name=MDS test','-c','user.email=mds@example.invalid','-c','commit.gpgsign=false','commit','-qm','Add source fixture']);
  const revision = git(['rev-parse','HEAD']);
  config.site.channel = 'release';
  config.source = {type:'snapshot',root:'snapshot',repository:'repository',manifest:'source.json',revision};
  config.navigation = [{title:'Guide',pages:[{source:'index.md',slug:'',label:'Start'}]}];
  config.siteSources = {'index.md':'authored.md'};
  await writeFile(join(root,'authored.md'),'# Site-authored manual\n');
  await writeFile(file,json(config));
  await assert.rejects(snapshot(file,{write:true}),/replaces a Git source/);
  assert.equal(await exists(join(root,'snapshot')),false);
  config.navigation[0].pages[0].source = 'nested/new.md';
  config.siteSources = {'nested/new.md':'authored.md'};
  await writeFile(file,json(config));
  await snapshot(file,{write:true});
  delete config.source.repository;
  await writeFile(file,json(config));
  await build(file);
  assert.equal((await check(file,{release:true})).sourceVerified,true);
  const manifestPath = join(root,'source.json');
  const manifest = JSON.parse(await readFile(manifestPath,'utf8'));
  assert.throws(() => verifyProof(revision,manifest.proof,new Map(),['nested/existing.md']),/replaces a Git source/);
  const rootOnly = readGitFiles(repository,revision,['index.md']).proof;
  assert.throws(() => verifyProof(revision,rootOnly,new Map(),['nested/new.md']),/cannot establish/);
  config.navigation[0].pages[0].source = 'index.md';
  config.siteSources = {'index.md':'authored.md'};
  await writeFile(file,json(config));
  await assert.rejects(build(file),/replaces a Git source/);
});

test('publication corrections must match once and site-authored pages have distinct sources',async t => {
  const {root,config,file} = await fixture(t);
  config.publicationEdits = [{source:'next.md',from:'First.',to:'Updated once.'}];
  config.siteSources = {'next.md':'authored.md'};
  await writeFile(join(root,'authored.md'),'# Next\n\n## Repeat\n\nFirst.\n\n## Repeat\n\nSecond.\n');
  await writeFile(file,json(config));
  await build(file);
  assert.match(await readFile(join(root,'_site/docs/nested/next/index.html'),'utf8'),/Updated once/);
  const metadata = JSON.parse(await readFile(join(root,'.mds/build.json'),'utf8'));
  assert.equal(metadata.documents.find(item => item.source === 'next.md').sourceKind,'site');
  await writeFile(join(root,'authored.md'),'# Next\n\nFirst. First.\n');
  await assert.rejects(build(file),/match exactly once/);
});

test('starter and skill installation preview changes, preserve instructions and refuse user-edit overwrite',async t => {
  const root = await mkdtemp(join(tmpdir(),'mds-install-'));
  t.after(() => rm(root,{recursive:true,force:true}));
  const target = join(root,'project');
  await init(target);
  assert.equal(await exists(target),false);
  await mkdir(target);
  await writeFile(join(target,'AGENTS.md'),'Project-owned instructions\n');
  await init(target,{write:true});
  assert.equal(await exists(join(target,'_site')),false);
  assert.equal(await exists(join(target,'.mds')),false);
  assert.match(await readFile(join(target,'.gitignore'),'utf8'),/\.mds\//);
  assert.equal(await readFile(join(target,'AGENTS.md'),'utf8'),'Project-owned instructions\n');
  await assert.rejects(init(target,{write:true}),/replace/);
  const skills = join(root,'skills');
  await installSkills(skills);
  assert.equal(await exists(skills),false);
  await installSkills(skills,{write:true});
  assert.deepEqual((await installSkills(skills,{write:true})).changed,[]);
  await writeFile(join(skills,'mds-release/SKILL.md'),'User-owned changes\n');
  await assert.rejects(installSkills(skills,{write:true}),/edited/);
  assert.equal(await readFile(join(skills,'mds-release/SKILL.md'),'utf8'),'User-owned changes\n');
  const existing = join(root,'existing');
  await mkdir(existing);
  await writeFile(join(existing,'.gitignore'),'private-project-files/\n');
  await init(existing,{write:true});
  assert.equal(await readFile(join(existing,'.gitignore'),'utf8'),'private-project-files/\n');
});

test('starter initialises the project containing its installed package',async t => {
  const root = await mkdtemp(join(tmpdir(),'mds-installed-layout-'));
  t.after(() => rm(root,{recursive:true,force:true}));
  const installed = join(root,'node_modules/@metalheart/mds');
  await mkdir(join(installed,'src/build'),{recursive:true});
  await mkdir(join(installed,'examples'),{recursive:true});
  for (const name of ['install.mjs','files.mjs']) await cp(new URL(`../src/build/${name}`,import.meta.url),join(installed,'src/build',name));
  await cp(new URL('../examples/starter',import.meta.url),join(installed,'examples/starter'),{recursive:true});
  const {init:installedInit} = await import(pathToFileURL(join(installed,'src/build/install.mjs')));
  await installedInit(root,{write:true});
  assert.equal(await exists(join(root,'mds.config.json')),true);
  await assert.rejects(installedInit(installed,{write:true}),/overlaps/);
});
