# Sources and snapshots

MDS separates source content from generated output. A product version, a
documentation revision and an MDS package version describe different things.
Keep all three explicit when preparing a release.

## Local previews

For editable content, use a local source directory and `site.channel: "preview"`:

```json
{
  "type": "local",
  "root": "content"
}
```

Navigation sources are relative to this directory. Local content has no verified
Git release identity. It cannot pass a release check merely by changing the
displayed version or adding hashes.

## Pinned Git sources

Set `source.type` to `git`. Name a local repository in `source.repository`, or
use `source.root` as the repository path when `repository` is absent. Set
`source.revision` to an exact full commit identifier. An optional `source.tag`
must resolve to the same commit.

Navigation and linked source paths are relative to the Git repository root,
not a working-tree content prefix. The build reads the selected commit and
ignores uncommitted manual edits. It does not fetch missing Git objects or tags.

Use a tag only when the project requires it to identify the documentation commit.
A documentation-only correction may have a separate commit from the product's
binary release; describe that distinction rather than changing the old tag.

## Export a snapshot

A snapshot lets a documentation repository build without a neighbouring product
checkout. Configure `source.type: "snapshot"`, an export directory in `root`,
a manifest path, and the local source `repository` used for export. Keep the
snapshot directory separate from that repository. Declare every manual and
supplementary file before exporting.

```sh
npx --no-install mds snapshot --revision FULL_COMMIT --version 1.2.0
npx --no-install mds snapshot --revision FULL_COMMIT --version 1.2.0 --write
```

Replace `FULL_COMMIT` with the exact selected commit. The first command previews
the update; the second writes the declared files, source manifest and configured
revision/version. Add `--tag TAG` when a tag must identify that commit. A changed
or unowned snapshot destination must be resolved before replacement.

The exported manifest records file hashes and a portable Git-object proof. The
proof verifies file membership in the named commit without a live repository.
It does not authenticate the publisher or prove that the chosen commit is an
approved release. Establish that identity through the project's release policy.

For a portable build, remove the local `source.repository` path after export.
Keep the snapshot, its manifest, configuration and exact MDS package together.
When `repository` remains configured, MDS can also compare the snapshot with
the local Git source. Restoring that path is necessary for the next export.

## Supplementary and site-authored content

`linkedSources` declares non-page files by source name and output path. These
files receive the same source checks as manuals. Only declared files enter
the public output.

`siteSources` provides separate site-authored pages. Their logical source names
participate in navigation and link mapping, but they must not replace a declared
release source. Git inputs and snapshot proofs must establish that each logical
site-authored path is absent from the selected commit, including when every page
is site-authored. Re-export older snapshots if their proofs omit a required tree.
Paths to their local files are relative to the configuration.
Their hashes and source kind remain distinct in build metadata.

`publicationEdits` provides explicit text corrections. Each `from` passage must
match exactly once in its named source before replacement with `to`. Review
these edits and remove them when the authoritative source incorporates the
correction. A failed match identifies changed source material; do not broaden
the replacement until its intended meaning has been checked.

## Verify and package

```sh
npx --no-install mds build
npx --no-install mds check --release
npx --no-install mds package --destination release-docs --release
```

The build manifest stays outside the public directory. The package contains
public files in `site/` and separate provenance and checksums. A release check
rejects preview or unverified sources. See [release maintenance](releases.md)
for the complete workflow.
