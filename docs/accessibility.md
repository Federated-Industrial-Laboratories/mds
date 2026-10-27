# Accessibility

MDS targets WCAG 2.2 AA for its reading and navigation workflows. This target
does not certify arbitrary manuals, third-party content or host CSS overrides.
Use both automated checks and real reading tasks when evaluating a site.

## Reader choices

Palette, colour mode, surface finish and typography are independent. In Appearance,
choose Flat from Surface finish for solid surfaces and Standard from Typography
for undecorated text. Contrast themes
remain available even when a host supplies a small custom catalogue.

Standard text avoids decorative lettering. Metalheart finish must also remain
readable: decoration does not excuse low contrast or small functional labels.
System forced colours retains browser colour adjustment. Reduced-motion
preferences disable non-essential interface transitions.

Reading and document navigation work without JavaScript. Search, copy buttons
and saved appearance preferences require JavaScript. If storage is unavailable,
the page remains usable. Changing appearance does not require an account.

## Keyboard and assistive tools

Use the skip link to reach the article. Native links and disclosure controls
provide document navigation and page contents. Search supports Ctrl+K or
Command+K, arrow-key result navigation, Enter and Escape. Closing a dialog
returns focus to its trigger.

Check focus in sticky navigation, search and appearance controls. It must remain
visible and must not be hidden by the site's own content. Labels and status
messages need meaningful names that a screen reader can announce.

## Contrast, size and reflow

Normal text needs at least 4.5:1 contrast; qualifying large text needs 3:1.
Check text at 200% size and reflow at 320 CSS pixels. Pointer targets need at
least 24 by 24 CSS pixels or a permitted exception; prefer larger primary
controls when space permits. These are selected checks within the wider target.
[WCAG 2.2](https://www.w3.org/TR/WCAG22/)

Meaningful controls and graphics need 3:1 contrast against adjacent colours.
Inspect actual rendered states, including hover, selected items and text over
gradients. Measuring only a theme's token values misses some combinations.
[Non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)

Apply text-spacing overrides together: 1.5 line height, 2em paragraph spacing,
0.12em letter spacing and 0.16em word spacing. Content and controls must remain
available without clipping.
[Text spacing](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html)

Wide code and tables may need horizontal scrolling within their own regions.
This must not make the entire article require two-direction scrolling. Print
output removes navigation and decorative framing while retaining article content.

## Author responsibilities

Use logical headings, descriptive links and clear instructions. Supply useful
text alternatives for meaningful images. Avoid conveying state only through
colour. Review examples and media for the intended readers.

Test representative pages with keyboard-only navigation, a screen reader,
forced-colour mode, zoom and missing custom fonts. Automated checks can detect
some defects; they cannot establish that instructions make sense or that every
reader workflow is usable. Record the tested browsers and assistive tools rather
than claiming universal compatibility.
