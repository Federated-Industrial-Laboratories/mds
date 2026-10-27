# Documentation integration example

Merge the relevant paragraphs into the project's existing instructions. This
example does not replace project rules or grant publication authority.

The MDS project map is `mds.config.json`. It identifies the authoritative content,
navigation, source revision, appearance and generated output. Update authoritative
manuals before refreshing a release snapshot. Do not edit generated HTML.

Use the project's installed MDS version with `npx --no-install mds`. Build with
`mds build`, check with `mds check`, and preview with `mds preview`. Use the
configured paths when more than one documentation site exists. Keep source
manifests outside the served directory.

Documentation changes belong with changes to public behaviour. Check affected
procedures, examples, navigation and release wording. Preserve existing routes
and heading links unless the task deliberately changes them. Record the product
release independently from the MDS package version.

MDS build and package commands do not publish. Follow the current task's authority
for Git changes, repository creation, deployment and visibility changes.
