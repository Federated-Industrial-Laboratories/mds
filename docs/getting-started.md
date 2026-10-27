# Getting started

The starter creates a `.gitignore` for dependencies, generated output and private
build metadata when none exists. An existing `.gitignore` is preserved; ensure
it excludes `node_modules/`, `_site/` and `.mds/`, or your configured equivalents.

Use Node.js 22 or 24 LTS with npm. Building requires local filesystem access.
The resulting site requires only a static web server. MDS does not require a
browser account or a running documentation service.

## Install an exact archive

Obtain the versioned MDS package from its maintainer. In a new project, save the
archive as `vendor/metalheart-mds-0.1.0.tgz` and install it:

```sh
npm init -y
npm install --save-dev --save-exact ./vendor/metalheart-mds-0.1.0.tgz
```

Keep `package.json`, `package-lock.json` and the archive together in the project.
Another checkout can then use `npm ci --ignore-scripts`. npm may need registry
access for dependencies unless they are already cached. Browser readers receive
the required search code and assets from the built site.

## Create the starter

Run the initializer without `--write` to see the proposed files:

```sh
npx --no-install mds init .
npx --no-install mds init . --write
```

The starter contains `mds.config.json` and two Markdown files in `content/`.
It uses a preview label, neutral appearance and explicit navigation. Conflicting
existing files need deliberate integration; the initializer does not replace a
project's existing instructions.

## Build and preview

```sh
npx --no-install mds build
npx --no-install mds check
npx --no-install mds preview --port 4173
```

Open `http://127.0.0.1:4173/docs/`. Read both pages, follow a heading link and
search for `first task`. In Appearance, select Flat from Surface finish and confirm the same content
remains available. Stop the preview with Ctrl+C.

The default output is `_site/`. Private build metadata is `.mds/build.json`.
Do not serve the project root or the metadata directory. Builds do not fetch
source repositories, commit changes or publish a website.

## Add your manuals

Update the project identity, content root and navigation in `mds.config.json`.
Each page names a source file, a route slug and a reader-facing label. Keep the
empty slug for the documentation home page. Use stable route names.

Rebuild after editing content. The preview serves the built output; it is not
an automatic source watcher. Check the build before preparing a static package.
See [configuration](configuration.md), [authoring](authoring.md) and
[sources](sources.md) for the next steps.
