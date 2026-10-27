# Authoring manuals

The configured source owns document content. Edit Markdown or the authoritative
product manual, then build. Do not edit generated HTML or use a changed snapshot
as a substitute for updating the authoritative source.

## Write a usable procedure

State prerequisites, the action, the expected outcome and any material limits.
Keep command examples exact and distinguish required values from illustrative
ones. Describe implemented behaviour and identify the release it applies to.
Use text alternatives for meaningful images and descriptive link labels.

## Pages and navigation

Each navigation entry supplies `source`, `slug` and `label`. Groups supply a
`title`. The label appears in navigation; the document's first level-one heading
supplies its title. Use one clear page title followed by a logical heading order.

An empty slug selects the documentation home page. A slug such as
`reference/settings` produces a nested route. Avoid renaming existing slugs for
editorial changes. Heading identifiers follow GitHub-style slug rules, including
suffixes for duplicate headings. A changed heading can therefore break an inbound
fragment link even when the page route remains the same.

## Links and assets

Link to other manuals using their source-relative paths:

```markdown
Read [configuration](configuration.md#navigation).
```

MDS maps declared source files to their public routes. Declare supplementary
examples and downloadable files in `linkedSources`. Use `linkAliases` only for
an intentional source-to-URL mapping, such as a repository README represented by
an existing landing page. An alias is not a file-copy instruction.

Use complete HTTPS URLs for external references. Check their relevance separately;
the local checker does not establish that a remote example or service works.

## Code, tables and HTML

Fenced code preserves the source text. Use a language label so readers can
identify an example. Code may scroll horizontally rather than wrapping a command
into misleading lines. Tables use a scrollable region when their structure
cannot fit a narrow page.

Raw HTML is disabled by default. Enable `markdown.html` only when the documented
sanitised subset is needed, for example for expandable details. Scripts, event
handlers, embedded application frames and executable templates do not belong in
manual content. HTML sanitisation is not a substitute for reviewing published
text and links.

The `stripRepositoryChrome` option is a migration aid for manuals that repeat a
repository banner or navigation. Leave it off for ordinary authoring. Inspect
the rendered result when enabling it; cleanup must not remove useful content.

## Review the result

Run `mds build` and `mds check`, then read the affected page in the preview.
Follow new links, try an exact technical search and copy representative commands.
Check long titles, code, tables and images on a narrow screen. Use the
[accessibility guide](accessibility.md) when content or layout changes affect
reading and navigation.
