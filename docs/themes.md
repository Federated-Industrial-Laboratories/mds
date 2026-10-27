# Themes and reader preferences

A theme supplies colours. Surface finish and typography are separate preferences,
so a palette never forces a reader to use reflective panels or decorative text.
The site host selects initial defaults and the extra palette catalogue.

## Available families

| Identifier | Family |
| --- | --- |
| `neutral` | Neutral light and dark reading surfaces; always available. |
| `contrast` | Contrast light and dark surfaces; always available. |
| `fil` | FIL Amber. |
| `aotx` | AOTX Green. |
| `ficc` | FICC Silver Orange. |
| `prism` | PRISM Porcelain Orange. |
| `cobalt` | Cobalt. |
| `violet` | Violet. |

Each family has authored light and dark variants. Dark colours are not an
inversion of the light palette. The build includes the selected families and
the core fallbacks, keeping unrelated extras out of the reader menu.

## Host defaults

Set the `appearance` object in `mds.config.json`:

```json
{
  "themes": ["ficc", "cobalt"],
  "palette": "ficc",
  "mode": "system",
  "finish": "metalheart",
  "typography": "standard",
  "contrast": "system"
}
```

The initial palette must belong to the enabled catalogue. `mode` is `system`,
`light` or `dark`. `finish` is `metalheart` or `flat`. `typography` is `standard`
or `display`. `contrast` is `system`, `normal` or `more`.

Keep the default catalogue small. Use the [component gallery](gallery.md) to
inspect headings, links, code, tables, menus and dialogs together.

## Reader controls

Open Appearance and use the Surface finish dropdown to choose Flat or Metalheart.
Flat removes decorative gradients, textures and bevels. Typography remains an
independent choice; select Standard to remove decorative lettering. Focus
outlines, meaningful borders, code, logos and content images remain.

Readers can change the four appearance dimensions independently. Standard text
removes decorative text treatments; display typography is confined to suitable
headings and branding. Body text and interactive controls remain readable.
Reset restores site defaults and continues to honour system display settings.

Saved preferences are local to the browser origin and `site.id`. Tabs for the
same site can share changes. Different domains do not exchange settings. If
storage is unavailable or an old selection is no longer offered, the page remains
usable with a supported fallback.

## System preferences

System colour mode follows the browser's light/dark preference. System contrast
uses the increased-contrast appearance when requested. A reader can choose
contrast directly or choose an explicit normal palette. Forced-colour mode
continues to use the browser's colour adjustment.

Without JavaScript, CSS applies the site's defaults and supported system
preferences. Interactive preference controls require JavaScript. MDS documentation
does not add decorative audio or animation.

## Extend a theme

MDS 0.1 uses its packaged theme catalogue. Adding a maintained family requires
authored light/dark values for the semantic roles and verification of component
states. Avoid CSS colour replacement or blanket overrides that bypass focus and
forced-colour rules. Browser import/export of arbitrary themes is not part of
this version.

Check text and control contrast on actual rendered surfaces, including gradients.
Passing a theme's data validation does not certify its accessibility. See
[accessibility](accessibility.md) for the relevant reader workflows.
