# Tutorial color and crease display update — 17 October 2026

## Changes

- White tutorial cards and a shared cool-neutral preview background replace the mixed green, blue and beige card surfaces. Local geometry previews use white/indigo or white/terracotta paper.
- `Creases → Current fold` is the default: only the current action receives M/V colors; historical creases remain faint neutral marks. Whole-paper turns have no active colored creases. `All M/V` and `Paper only` are viewer choices and do not change exported tutorial data.
- Crease marks map onto each rendered triangle instead of extrapolating one plane across a display polygon. This keeps lines on the paper when layer separation makes the display surface non-planar. Display-only duplicate segments are removed, and lines depth-test against paper without writing their own depth. Moving and stationary paper use the same surface depth offset.
- The authoring canvas and physical fold geometry are unchanged.

## Validation

- Eight focused tests passed: non-planar triangle mapping, seam vertices, display-only deduplication, M/V history and connected paper display.
- `tools/qa/crease-display-check.html`: ALL PASS. Final crane has no colored historical creases in the default view; all M/V and paper-only modes work; the current fold remains highlighted; layer clarity and inspection work; tutorial data is unchanged; controls fit 390, 614 and 1024 px frames.
- Browser screenshots inspected for the tutorial library and the completed crane, including all-M/V mode.
- JavaScript syntax and whitespace checks passed.

Backup: `archive/snapshots/before-crease-display-20261017.zip`. Local only; not published.
