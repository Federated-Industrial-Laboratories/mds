# Agent integration

MDS ships portable skill directories for the same commands a maintainer can run
directly. A skill describes a workflow; it does not install an agent, provide
credentials or publish documentation by itself.

## Included skills

| Skill | Use |
| --- | --- |
| `mds-adopt` | Map an existing project to MDS and verify a local site. |
| `mds-document` | Update authoritative manuals and navigation with public behaviour. |
| `mds-release` | Bind a named documentation revision, verify it and prepare a package. |

Each skill contains a `SKILL.md` with discovery metadata and concise operating
instructions. The skill reads the project's own instructions and configuration.
It does not import product-specific hosts, private paths or release conventions.

## Install into a project

Select the skill directory used by your client. For a client that discovers
project skills under `.agents/skills`, preview and apply the installation:

```sh
npx --no-install mds skills --destination .agents/skills
npx --no-install mds skills --destination .agents/skills --write
```

The installer owns its recorded files and refuses to overwrite unexpected edits.
Keep an edited skill under project ownership until its differences have been
reconciled. Installing skills does not replace an existing `AGENTS.md` or global
client settings.

The repository's `examples/instructions/AGENTS.md` shows optional paragraphs to
merge into project instructions. They identify the project map, authoritative
manuals and validation commands. Adopt only the paragraphs that fit the project.

## Give the skill a concrete task

Useful requests include:

- Adopt MDS for the manuals in this repository while preserving their current URLs.
- Update the installation and settings manuals for the new configuration option.
- Prepare documentation for version 1.2.0 from the selected final manual commit.

Keep the intended project, source and publication boundary clear. A request to
update documentation does not automatically authorise a Git push or live
deployment. Existing task authority remains valid; the skills do not add a
separate permission requirement for ordinary authorised edits.

## Compatibility and verification

The portable files can be inspected and validated without a running agent.
Successful format validation is different from a client discovering the skill,
and discovery is different from executing a useful task. Qualify a client's
discovery and behaviour before advertising native support for it.

MDS 0.1 does not ship provider-specific hooks, automatic deployment or a matrix
of certified agent clients. The documented CLI remains the integration contract.
If a client cannot load skills, a maintainer can use the manuals and commands
directly without changing the generated site.
