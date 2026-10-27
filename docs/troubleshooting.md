# Troubleshooting

Start with the installed version and selected configuration:

```sh
npx --no-install mds version
npx --no-install mds --help
npx --no-install mds build --config mds.config.json --dry-run
```

Use the command from the project's installed package. Do not substitute an
unrelated registry package when `npx --no-install` cannot find the command.

## Configuration or source failures

| Symptom | Action |
| --- | --- |
| Invalid configuration | Read the reported field and the installed schema. Check enum values and unknown properties. |
| Unknown document link | Add the target to navigation or linked sources, or correct the relative path. |
| Missing heading anchor | Check the target heading's generated identifier, especially after a rename. |
| Default palette unavailable | Include the selected family in `appearance.themes`, or choose a core family. |
| Missing Git commit or tag | Make the selected objects available in the intended local repository. Builds do not fetch. |
| Tag mismatch | Select the intended documentation revision. Do not repoint an existing product tag as a shortcut. |
| Changed snapshot file | Reconcile the authoritative source and re-export a verified snapshot. |
| Publication edit does not match once | Inspect changed upstream wording and revise or remove the specific correction. |
| Release check rejects preview | Verify the source first, then use the project's accurate publication channel. |

## Output ownership

MDS owns only the configured documentation subtree and records its hashes in
private metadata. A first build refuses a non-empty tree it does not own.
Choose a new output directory when adopting an existing site.

If generated files were edited or unexpected files appeared, preserve anything
valuable and restore the last known generated state or select a fresh output.
Do not regenerate metadata around unknown files to make them appear owned.
If a build reports a lock, confirm that no build is still running before
removing an abandoned lock file.

Configuration or sources changed after a successful build must be rebuilt before
checking or packaging. A package destination must be a new directory that does
not overlap the source or build output.

## Browser problems

If the page loads but search fails, use the retry control. A failed script import
may require a page reload. Inspect the server response for the search index and
JavaScript resources under the configured documentation path.

If assets work locally but fail when hosted, check `basePath`, the host mount
point and the handling of `_mds` files. Rebuild for the intended prefix. Do not
edit generated URLs by hand. Use the [hosting guide](hosting.md) for subpaths.

If appearance is unexpected, use Reset, check system contrast/colour preferences,
and check the stable `site.id`. Browser storage may be unavailable in restricted
contexts. This should affect persistence, not the ability to read the page.

If a custom font fails, standard text uses fallback fonts. Check the copied font
file and content policy. Avoid adding an external font service merely to hide a
missing local asset.

## Report a defect

Provide the MDS and Node versions, command, a small configuration, expected
behaviour and the observed failure. Remove credentials, private manuals and
machine-specific paths. For a security issue, use the repository's security
reporting procedure rather than a public issue with exploit details.
