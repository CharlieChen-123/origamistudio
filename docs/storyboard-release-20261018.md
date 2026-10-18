# Storyboard V2 release — 18 October 2026

The public workspace now uses Storyboard V2 for Design, Fold Lab, tutorial playback and authoring. Old application URLs redirect to V2 and preserve query parameters and anchors.

## Included

- A shared English interface, compact controls, readable contrast and paper-state thumbnails.
- Guided move authoring, paper-group selection, reusable motion templates, editable teaching stages, draft recovery and portable tutorial files.
- Dart Airplane, Blintz Box and Traditional Paper Crane lessons, plus the original Bird pattern (Level 2).
- Paper-layer clarity, stable mountain/valley history, camera pan and fit, adjustable playback speed, and constraints/snap performance improvements.
- Removed the duplicate Add next step button beside playback. The right inspector remains the primary way to create the next step; playback Next step navigates existing steps.

## Validation

- 105 folding-core tests passed.
- 630 indexed snapping comparisons passed, including cache invalidation.
- Browser checks cover fold → unfold → next fold, normal lesson navigation, save/reopen/draft recovery, inspector widths, magnifier controls, SVG export and handoff.

## Build and rollback

Sources: `tools/designer.template.html`, `tools/origami3d.template.html`, `assets/`, and `simulator/src/`.

Run `node tools/build-origami3d.mjs`, then `node tools/build-storyboard.mjs` and `node tools/check-storyboard-build.mjs`. Generated V2 pages and compatibility redirects are committed for static GitHub Pages hosting. Git history retains the previous public version.

The tutorial engine still requires compatible geometry for compound templates. It does not infer a complete folding sequence from an arbitrary crease pattern or provide general collision detection.
