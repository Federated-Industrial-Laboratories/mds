# Documentation starter

This project uses Metalheart Documentation Style (MDS). Install the exact MDS
archive as a development dependency before running its commands. The starter
does not modify `package.json` or install dependencies for you.

## Read locally

```sh
npx --no-install mds build
npx --no-install mds check
npx --no-install mds preview --port 4173
```

Open `http://127.0.0.1:4173/docs/`. Stop the preview with Ctrl+C.

Edit `content/` for article text and `mds.config.json` for site identity,
navigation and appearance defaults. Rebuild after source changes. Generated
documentation is in `_site/docs/`; private build metadata is `.mds/build.json`.

## Prepare an update

This starter uses local source content and a preview label. Configure a verified
Git source or exported snapshot before preparing release-labelled manuals.
The installed package's manuals describe source identity and release maintenance.

Build and package commands do not commit or deploy. Serve only public output,
never the project root or private provenance files.
