# MDS repository guidance

MDS is a Node.js ESM static documentation package. Read README.md, the relevant
manuals in docs/ and the configured source before changing behaviour.

Keep rendering, source adapters, browser controls and product identity separate.
Use semantic theme roles. Preserve source provenance, output containment, stable
routes and reader preferences. Never edit generated HTML as a source change.

Build complete workflows and update their documentation. Run the affected tests
and a representative integration check. Add regressions for important contracts
or real defects; do not mirror implementation details or repeatedly run unchanged
full suites. Inspect browser changes with keyboard and narrow-screen workflows.

Use the project's installed dependencies and package lock. Keep credentials,
private manuals, local paths and research evidence outside the product. Preserve
other contributors' edits and third-party notices. Site tools use Apache-2.0 SPDX
headers and concise responsibility statements.

Public text describes observable behaviour in clear professional English. Keep
product version, documentation revision and MDS version distinct. Do not imply
that format validation certifies accessibility or agent-client behaviour.

Build and packaging do not grant Git or deployment authority. Follow the task's
explicit scope for commits, pushes, publication and visibility changes.
