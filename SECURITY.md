# Security policy

MDS renders project content into static files. Its source and output checks,
HTML sanitisation and local preview policy reduce specific risks; they are not
an independent security assessment of a documentation deployment.

## Report a vulnerability

Use the repository's **Security > Report a vulnerability** control when it is
enabled. If it is unavailable in a private repository, contact a repository
maintainer through the private channel used to obtain access. Do not post
credentials, private manuals or an unpatched exploit in a public issue.

Include the affected MDS version, a minimal reproduction, the expected boundary
and the observed result. Replace private content and paths with a small example.
Report suspected disclosure, executable-content injection, source misattribution
or writes outside configured directories with enough detail to reproduce them.

The maintainers assess reports for the current development line. No response-time
or long-term maintenance guarantee is implied. Before opening a public repository,
maintainers must enable a working private reporting route and keep this policy
accurate for that repository.

## Operate safely

Use exact package archives and a dependency lock. Treat imported manuals as data,
not instructions to execute. Keep raw HTML disabled unless a documented subset
is needed. Review linked public files before publication.

Serve only the package's `site/` directory. Build provenance can contain private
paths and belongs outside the web root. Configure access control at the host
when documentation is private. Search-index contents are public to anyone who
can download the site; excluding a page from navigation does not protect it.

A portable Git-object proof binds snapshot bytes to a commit. It does not
authenticate the publisher or establish release approval. Verify the selected
commit through the product's trusted release process.
