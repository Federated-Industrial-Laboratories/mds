# Release maintenance

A documentation release must describe the selected product accurately and retain
its source identity. MDS prepares a local static package; publishing it is a
separate project workflow.

## Reconcile the product change

Compare the previous documented revision with the intended release. Identify
changes in installation, commands, configuration, examples, compatibility,
security behaviour and recovery. Update authoritative manuals before exporting
them to the site.

Verify download names, links and release status against the actual product
release. Do not use a candidate build as evidence that an application has been
published. Check procedures whose prerequisites or results changed.

## Select the documentation identity

Set `site.version` to the product version being documented. Keep the MDS package
version pinned independently. Use a direct Git source or export a snapshot from
the final documentation commit. Bind a tag only when the project's source policy
requires it to identify that same commit.

For snapshot sources:

```sh
npx --no-install mds snapshot --revision FULL_COMMIT --version 1.2.0
npx --no-install mds snapshot --revision FULL_COMMIT --version 1.2.0 --write
```

Review the preview before the write. The exporter includes the declared manuals
and linked assets. Keep explicit site-authored additions and publication
corrections reviewable. Once the source is verified, use the project's intended
release wording in `site.channel`; keep unverified work labelled `preview`.

## Build the candidate

```sh
npx --no-install mds build
npx --no-install mds check --release
npx --no-install mds preview --port 4173
```

Read changed procedures in the preview, follow their links and copy representative
commands. Check a technical search, keyboard navigation and the deployed subpath.
Use focused layout and accessibility checks when the change affects them.
Stop the preview after inspection.

## Prepare publication

```sh
npx --no-install mds package --destination release-docs --release
```

Use a new destination directory. The package contains:

| Path | Purpose |
| --- | --- |
| `site/` | Public static files; this is the only directory to serve. |
| `checksums.json` | Expected hashes of public files. |
| `provenance.json` | Build and source identity, kept outside the public root. |
| `README.txt` | Package version and serving guidance. |

Retain the previous deployed package until the new one is verified. The hosting
workflow should activate a complete candidate, check representative public routes
and support rollback. MDS does not change a server, DNS, repository visibility,
Git tag or package registry.

## Documentation-only corrections

A correction can change documentation without replacing application binaries.
Keep the product version, record the new documentation revision, and describe
the correction in the project's normal release notes. Re-export from that commit
or use an explicit publication edit where appropriate. Verify existing downloads
still name the intended application release.

Do not repoint an existing release tag merely to satisfy a source check. Use a
separate documentation tag or the exact commit policy agreed by the project.
The package's source revision makes the difference visible without inventing a
new application release.
