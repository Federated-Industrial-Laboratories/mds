# Component gallery

Use this page to inspect the same content across palettes, finishes and text
settings. Open the appearance controls, choose a light or dark mode, and compare
Metalheart with flat surfaces. Read the page at narrow widths and in print.

## Reading text

Good documentation states what the reader can do, what they need first and how
to recognise success. A visual style should support those instructions without
changing their meaning. This paragraph includes **strong emphasis**, *emphasis*,
`inline_code`, and a [descriptive link to appearance settings](themes.md).

> A preview shows the current manuals. A release package also records which
> source produced them. Keep that distinction visible to the reader.

## Procedure

1. Build the site from the configured source.
2. Check links and source identity.
3. Read a representative procedure in the local preview.

```sh
npx --no-install mds build
npx --no-install mds check
npx --no-install mds preview --port 4173
```

### Expected result

The documentation home page opens at the configured path. The menu and page
contents link to the same material in every appearance mode. Use the code panel's
copy control, then confirm the copied command text.

### Recovery

When a search resource fails to load, the search dialog provides a recovery
control. The document menu remains available. A presentation change must not
hide useful instructions or remove focus indicators.

## Reference table

| Setting | Options | Effect |
| --- | --- | --- |
| Colour mode | System, light, dark | Selects the authored light or dark palette. |
| Surface finish | Metalheart, flat | Changes framing and decorative surfaces. |
| Typography | Standard, display | Controls optional display text treatments. |
| Contrast | System, normal, more | Applies the selected contrast preference. |

## Long technical content

This identifier tests wrapping without changing the original text:
`documentation.configuration.publication.source_revision_identifier`.

```text
documentation-source --revision 0123456789abcdef0123456789abcdef01234567 --output documentation-package --preserve-heading-identifiers
```

The command above is illustrative text for layout inspection. It is not an MDS
command. Code and tables can scroll within their own regions on a narrow screen.

## Lists and separators

- Document titles describe a task or topic.
- Links identify their destination.
- State remains understandable without colour alone.
- Controls retain useful labels and visible focus.

---

Use [accessibility](accessibility.md) for reader checks and
[configuration](configuration.md) for the host's settings. Search this page for
`source_revision_identifier` to inspect a technical query.
