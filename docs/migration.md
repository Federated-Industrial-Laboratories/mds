# Migration and upgrades

Adopt MDS with an explicit source and route map. Keep a working site's content
and publication identity separate from the renderer change.

## Move an existing portal

Record the current document routes, heading links, source revision and linked
downloads. Identify which files are authoritative and which are generated.
Preserve existing local edits while choosing the intended source baseline.

Install an exact MDS archive. Create a configuration that reproduces the current
route slugs and group labels. Use a new, dedicated output directory for the
candidate. Do not point a first build at existing generated output: MDS requires
ownership metadata before replacing a non-empty documentation tree.

Choose the source adapter that fits the project:

- Use local content for an editable preview.
- Use Git for manuals read directly from an exact local commit.
- Use an exported snapshot when the documentation build must travel separately.

Map supplementary examples through `linkedSources`. Preserve deliberate links to
an existing landing page with `linkAliases`. Use explicit site-authored documents
and publication corrections rather than modifying release bytes silently.

Select a palette and appearance defaults. Existing Metalheart colours can use
the supplied product presets. Remove old stylesheet recolouring and copied
renderer internals after the MDS candidate is accepted. Generated output must
not become another site's source dependency.

Build and check the candidate, then compare complete reader workflows. Verify
routes, anchors, code text, search, download examples and release wording. Test
the actual deployment prefix. Preserve the previous output until the candidate
is qualified and the intended publication step is authorised.

## Upgrade MDS

Read the new package's changelog and format migration notes. Keep product version
and source revision unchanged unless the task also updates the manuals.

Install the exact new archive in the consuming project:

```sh
npm install --save-dev --save-exact ./vendor/metalheart-mds-VERSION.tgz
npx --no-install mds version
npx --no-install mds build
npx --no-install mds check
```

Replace `VERSION` with the package release. Keep the archive and updated lockfile.
Inspect the rebuilt site and the changed MDS behaviour. For a verified release
source, include `mds check --release` before packaging.

If a schema changes, update the configuration according to that release's
migration instructions. Do not edit `schemaVersion` solely to bypass validation.
During the 0.x series, a minor release may change a documented interface; migration
notes must describe those changes. Patch releases preserve the documented format.

## Update installed skills

Run `mds skills --destination DIR` to preview the update. Use `--write` after
reviewing the owned files. The installer refuses to overwrite user changes.
Reconcile those changes deliberately before retrying; do not delete an ownership
record merely to force installation.

## Roll back

Restore the earlier package pin and lockfile, then rebuild or reactivate the
previous verified publication package. Keep the product source identity the
same when reverting only an MDS change. A live host rollback follows the
project's hosting procedure, not an implicit action of `mds build`.
