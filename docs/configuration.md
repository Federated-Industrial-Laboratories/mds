# Configuration

MDS reads `mds.config.json` by default. Use `--config FILE` to select another
project map. Relative filesystem paths are interpreted from the configuration's
directory. The configuration is declarative JSON; it does not execute code.

## Minimal project

```json
{
  "schemaVersion": 1,
  "site": {
    "id": "manuals",
    "title": "Project manuals",
    "language": "en-GB",
    "version": "0.1.0",
    "channel": "preview",
    "indexable": false
  },
  "paths": {
    "basePath": "/",
    "docsPath": "docs/",
    "output": "_site",
    "metadata": ".mds/build.json"
  },
  "source": { "type": "local", "root": "content" },
  "navigation": [
    {
      "title": "Guide",
      "pages": [
        { "source": "index.md", "slug": "", "label": "Introduction" }
      ]
    }
  ],
  "appearance": {
    "themes": [],
    "palette": "neutral",
    "mode": "system",
    "finish": "metalheart",
    "typography": "standard",
    "contrast": "system"
  }
}
```

## Identity and paths

| Field | Meaning |
| --- | --- |
| `schemaVersion` | Configuration format version; use `1`. |
| `site.id` | Stable preference namespace within the website origin. |
| `site.title` | Documentation identity in the shared shell. |
| `site.description` | Optional description of the documentation. |
| `site.language` | HTML language tag; interface wording is currently English. |
| `site.version` | Product documentation version, independent of MDS. |
| `site.channel` | Publication wording, such as `preview` or `release`. |
| `site.homeUrl` | Optional link to the product website. |
| `site.repositoryUrl` | Optional public source repository link. |
| `site.editBaseUrl` | Optional public prefix for document edit links. |
| `site.footer` | Optional footer text. |
| `site.origin` | Optional public origin for absolute metadata URLs. |
| `site.indexable` | Whether generated metadata permits search indexing. |
| `paths.basePath` | Deployment prefix, such as `/` or `/project/`. |
| `paths.docsPath` | Documentation path within the deployment prefix. |
| `paths.output` | Dedicated generated site directory. |
| `paths.metadata` | Build manifest outside the public output. |

An indexing directive is not access control. Configure the web host separately
when readers must authenticate. Do not expose local repository paths through
public source or edit links.

## Project logo

Use `branding` to carry a project's existing identity into every palette and
surface finish. Paths are local files relative to `mds.config.json`:

```json
{
  "branding": {
    "logo": "assets/logo.svg",
    "darkLogo": "assets/logo-dark.svg"
  }
}
```

Only `logo` is required when `branding` is present. Omit `darkLogo` when the
same mark works in both modes. MDS copies the exact image bytes into the owned
documentation assets, uses the main logo as the favicon, and records hashes in
private metadata. Changed images require a rebuild before checking or packaging.

SVG, PNG and WebP files up to 1 MiB are supported. SVG uses a static subset with
internal fragment references; scripts, animation, embedded HTML and external
resources are refused. The image is never recoloured. A single logo has a small
light backing so dark marks remain legible; a supplied dark variant follows the
reader's colour mode. The adjacent project title supplies the accessible name.

Logos remain visible in flat appearance. The starter's neutral mark is used when
no project logo is configured. Set `appearance.typography` to `display` when that
is the project's preferred initial heading style; readers can still select
standard text or flat appearance. MDS's own neutral defaults remain unchanged.

## Interface wording

The optional `labels` object changes primary shell wording. Values are plain
text, limited to 160 characters; omitted labels retain the English defaults.
For example, `"labels": {"documentMenu": "Manuals", "search": "Search manuals"}`
changes the navigation header and search trigger/dialog title together.

Supported keys are `documentation`, `documentationHome`, `documentMenu`,
`pageContents`, `referenceLibrary`, `projectWebsite`, `search`, `appearance`,
`skipToContent`, `sourceRepository`, `editPage`, `backToTop`,
`previous` and `next`. Navigation group/page labels are configured separately.

This is wording customisation, not complete localisation: status messages,
appearance field names and other supporting text remain English. The HTML
language tag is independent. Fully translated interfaces and right-to-left
layouts are not qualified in this release.

## Navigation

`navigation` is an ordered array of groups. Each group contains `title` and
`pages`. Each page has `source`, `slug` and `label`. Set `format` to `text` for
a document such as a licence that should be shown as literal text; Markdown is
the normal format. Routes and source paths must be unique.

For local and snapshot sources, page paths are relative to the content root.
For Git sources, they are relative to the repository root. Use `/` between path
segments. A route slug is a URL path without a leading or trailing slash. The
empty slug is the home page. Keep routes stable when changing the menu wording.

## Sources and supplementary content

`source.type` is `local`, `git` or `snapshot`. For local and snapshot inputs,
`source.root` identifies the content directory. For Git inputs, `repository`
selects the local repository, falling back to `root` when absent. Navigation
sources remain relative to the Git repository root; `root` is not a tree prefix.
Git and snapshot configurations can name an exact `revision` and optional `tag`.
A snapshot also names its `manifest`. See [sources and snapshots](sources.md)
before using a release label.

`siteSources` maps a logical document source to a site-authored local file.
`publicationEdits` contains exact-match `source`, `from` and `to` corrections.
These remain visible as separate source inputs rather than silently changing
upstream manuals.

`linkedSources` declares supplementary files using `source` and public `path`.
`linkAliases` maps a source path to an intentional URL without copying a file.
The builder owns only `paths.output` plus `paths.docsPath`, so other site routes
can be maintained separately. Paths must stay within the documented source and
output boundaries. Do not list
private keys, credential files or deployment configuration as public sources.

## Appearance and Markdown

The [theme guide](themes.md) defines `appearance`. Core neutral and contrast
choices remain available regardless of the extra catalogue. Reader preferences
override initial appearance while system forced colours remains authoritative.

`markdown.html` defaults to false. `markdown.stripRepositoryChrome` defaults to
false. See [authoring](authoring.md) before enabling either option.

Unknown or malformed configuration needs correction before a build. Use the
installed version's schema and [reference](api.md), not an example written for
a different MDS version.
