---
name: mds-document
description: Update a project's authoritative manuals, examples and navigation alongside feature changes using Metalheart Documentation Style. Use for MDS documentation maintenance, not product release publication.
license: Apache-2.0
---

# Maintain MDS documentation

Read the project's instructions and selected `mds.config.json`. Locate the
authoritative source and installed MDS manuals before editing. A generated page
or snapshot may not be the source that owns the wording.

## Follow the changed behaviour

Use the feature's actual public behaviour to identify affected procedures,
configuration references, examples, troubleshooting and compatibility wording.
Update the authoritative manuals first. Keep code samples executable and identify
prerequisites, expected outcomes and material limitations. Do not infer a release
from an implementation change or convert an example into a performance claim.

Add a page to navigation when it becomes part of the site. Preserve stable route
slugs and heading identifiers where possible; inspect inbound links before
renaming them. Declare linked files so a clean package contains the same examples
as the preview. Raw HTML is disabled by default; use supported Markdown before
enabling the documented sanitised subset for a real requirement.

Do not edit generated HTML. For a snapshot-backed site, keep the authoritative
manual change and subsequent snapshot refresh distinct. A preview must remain
labelled as a preview until its source satisfies the release policy. Publication
corrections must be explicit, exact-match edits with a clear reason.

## Check the reader's workflow

Use the installed command, with the selected configuration if it is not the
default:

```sh
npx --no-install mds build --config mds.config.json
npx --no-install mds check --config mds.config.json
npx --no-install mds preview --config mds.config.json --port 4173
```

Read changed pages, follow their links and copy representative commands. Search
for the new terminology. Check wide content and keyboard controls when layout
changes. A passing link check does not establish that a procedure is accurate or
that authored content is accessible. Reuse valid checks and add a focused
regression only for an important new contract or demonstrated defect.

Report the changed reader workflow, checks and unresolved gaps. Follow existing
task authority for Git and publication; a documentation update alone does not
authorise a deployment.
