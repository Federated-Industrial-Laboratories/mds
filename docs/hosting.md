# Hosting

MDS output is a static site. Build and check the candidate before transferring
files. Serve only the package's `site/` directory; keep `provenance.json`, source
manifests and project files outside the public root.

## Paths and origins

`paths.basePath` is the deployment prefix. `paths.docsPath` is the documentation
path inside that prefix. With `/project/` and `docs/`, the public documentation
URL is `/project/docs/`. The package contains `site/docs/`; the host mounts that
directory tree at `/project/`.

Page, search and asset URLs use the same configured prefix. Configure the real
prefix before building and test it with the local preview. If `site.origin` is
set, use the public HTTPS origin without a path. Do not substitute a private
build-machine address.

## Local preview

```sh
npx --no-install mds preview --config mds.config.json --port 4173
```

The preview binds to loopback, serves the built documentation and sends no-index
and no-cache headers. It applies a same-origin content security policy. It is
not an authentication gateway or a public hosting service.

## A static server

Preserve directory-index routes such as `/docs/install/`. Configure a real 404
response using the generated documentation error page; do not return HTTP 200
for missing documents. Keep assets and search resources on the same origin.

For a Caddy host serving a root deployment with `docsPath: "docs/"`, the
following is an example to adapt to the actual domain and package location:

```caddyfile
docs.example.com {
    root * /srv/documentation/current/site
    header {
        X-Content-Type-Options nosniff
        Referrer-Policy no-referrer
        Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"
    }
    file_server
    handle_errors {
        rewrite * /docs/404.html
        file_server
    }
}
```

The example domain and filesystem path are illustrative. Validate the chosen
server configuration and confirm the status code, nested routes, fonts, search
and appearance controls against the actual candidate. Do not serve package
metadata by moving the server root one directory higher.

## GitHub Pages

For a project site at `https://OWNER.github.io/REPOSITORY/`, set `basePath` to
`/REPOSITORY/`. A custom-domain root can use `/`. Upload the contents of the
package's `site/` directory through the repository's explicitly configured
publication workflow. Include `.nojekyll` in the deployed root when using a
Jekyll-based publishing path, so `_mds` assets are not excluded.

The supplied MDS checks do not deploy. Configure a separate publication job with
the appropriate environment and permissions when publication is intended.
GitHub project paths and access rules are described in the
[GitHub Pages documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages).

Private source hosting does not automatically make the resulting Pages site
private. GitHub's private Pages access controls require the applicable Enterprise
Cloud setup. Use a host with explicit access control for private manuals when
that feature is unavailable.
[Pages visibility](https://docs.github.com/en/enterprise-cloud@latest/pages/getting-started-with-github-pages/changing-the-visibility-of-your-github-pages-site)

## Activate and roll back

Keep each candidate in a separate release directory. Check it before switching
the host's current release. After activation, inspect a document, a deep heading
link, search, preferences and a missing-page response. Preserve the previous
release until these checks pass, then follow the project's retention policy.
