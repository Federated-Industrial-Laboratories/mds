# Contributing to MDS

MDS changes should complete a useful documentation workflow while preserving
source identity, reader access and portable hosting. Discuss substantial public
API or format changes before implementation.

## Set up

Use Node.js 22 or 24 LTS. From the repository root:

```sh
npm ci --ignore-scripts
npm test
npm run build
npm run check
```

The project builds its own manuals with MDS. Run `node bin/mds.mjs preview`
to inspect the current output. Stop the preview when it is no longer needed.

## Make a change

Keep modules focused and use semantic theme roles. Separate product identity,
content sources, rendering and browser behaviour. Do not add dependencies on
another site's generated files or local workspace layout.

Update manuals when public behaviour changes. Include a focused regression for
an actual defect or important contract. Prefer representative user workflows to
tests that repeat implementation details. Keep source and theme schema changes
explicit and add migration notes when compatibility changes.

JavaScript modules use ESM. Tooling uses an Apache-2.0 SPDX header and a short
responsibility statement. Keep private research, credentials and local deployment
details outside the repository. Preserve existing third-party notices.

## Verify behaviour

Run relevant tests and build/check the manuals. For browser changes, install the
Playwright browsers and run the browser suite:

```sh
npx --no-install playwright install chromium firefox webkit
npm run test:browser
```

On a prepared Linux CI runner, Playwright's `--with-deps` option can install its
system prerequisites. A local administrator controls host package installation.
`MDS_CHROME_EXECUTABLE` can select an existing Chrome executable for the Chromium
check; it does not qualify Firefox or WebKit.

Inspect changed layouts at narrow and wide widths. Check keyboard focus, search,
flat appearance and system colour preferences. Review authored content separately
from automated accessibility results. Record the browser or assistive tool used
and any untested combination.

Before a package release, inspect `npm pack --dry-run` and install the archive in
an unrelated temporary project. Run the documented quick start there. Use an
exact archive rather than a symlink that can hide missing package files.

## Submit a change

Describe the problem, resulting behaviour and relevant validation. Explain a
compatibility change and its migration. Keep generated evidence and private paths
out of the patch. A maintainer reviews substantial changes once; fix verified
findings and rerun affected checks.

The repository's checks do not publish packages or deploy websites. Publication
and visibility changes follow the maintainer's explicit release workflow.
See the [code of conduct](CODE_OF_CONDUCT.md) and [security policy](SECURITY.md).
