# Flat Crane handoff regression

The untouched shared preset already transfers the original SVG. The lossy path
was rebuilding SVG from edited or legacy Designer data: non-M/V support edges
were missing, and legacy coordinate-only saves could lack partial fold angles.

Both Designer variants now retain source boundaries and F/C/U support edges.
The simulation exporter preserves these when the paper shape is unchanged.
Legacy drawings recover source metadata only when geometry and crease types
match; failure to fetch an unchanged source no longer silently falls back to a
different model.

Flat Crane contains four yellow face subdivision edges and fourteen creases
with opacity 0.5 (90-degree targets).

## Verification

Serve the project and open `tools/qa/handoff-check.html`. Add `?plain` to test
the ordinary Designer instead of the constraints variant. The page restores
the previous local drawing after running.

Checks: byte-identical unchanged handoff, equal solver mesh and fold angles,
equal GPU pose after 120 iterations at 50%, edited export retaining support
edges and partial angles, and recovery of coordinate-only legacy data.
Both Designer variants passed. The edited-export pose also passed a 1e-4
coordinate tolerance in the ordinary variant.

This fixes import fidelity, not the solver's lack of paper self-collision.
Arbitrary edited creases are not guaranteed to define a physically foldable model.

Backup: `archive/snapshots/before-flat-crane-handoff-fix.zip`.
