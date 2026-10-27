# Metalheart Documentation Style

MDS builds a static documentation site from explicit content and configuration.
It combines a shared document layout with local search, reader preferences and
release-source checks. A project owns its manuals; MDS owns the rendering system.

## Start a site

Follow [getting started](getting-started.md) to install an archive and build the
neutral starter. Then map your manuals with [configuration](configuration.md)
and [authoring](authoring.md). For an existing portal, use the
[migration guide](migration.md).

## Design the reading experience

Choose site defaults with [themes](themes.md), inspect the
[component gallery](gallery.md), and check the [accessibility guidance](accessibility.md).
Readers can change palette, colour mode, finish and typography independently.
The host's branding does not prevent a reader from choosing flat appearance.

## Maintain and publish

Use [sources and snapshots](sources.md) to separate editable previews from
release-bound manuals. [Release maintenance](releases.md) describes product
releases and documentation-only corrections. [Agent integration](agents.md)
provides the same workflows through portable skills.

Build and package commands create local output. Follow [hosting](hosting.md)
to serve only the public files. A private source repository does not by itself
make a hosted website private.

## Reference

The [command and API reference](api.md) describes the supported entry points.
Use [troubleshooting](troubleshooting.md) when validation or the preview fails.
MDS 0.1.0 is a development candidate with versioned configuration formats.
