# Action editor: implementation and validation

## Why the workflow changed

A final crease pattern does not specify a unique human folding sequence. A short final mountain/valley segment may lie on a longer temporary fold used while making the model. Assigning an angle only to that short segment cannot describe a whole-paper flip.

The new editor stores an **action axis and moving paper**, separately from CP markings. A point-to-point drag computes the perpendicular bisector as the fold axis. Each moving polygon rotates rigidly about that axis. There is no averaging of vertex positions between moving and fixed regions.

The library, authoring canvas, and preview now have distinct layouts. Authoring uses a large zoomable paper canvas; preview has replay, scrubbing, and previous/next steps. Optional explanations and import settings are collapsed. The camera uses fixed-up orbit, matches the CP orientation at Top view, and sizes itself to the visible canvas.

## Traditional Crane lesson

The built-in lesson uses the upstream Traditional Crane CP and follows the conventional progression through the preliminary base, bird base, reverse folds and final shaping. It starts with an unmarked sheet, reveals red mountain and blue valley creases step by step, and offers the complete CP as an optional reference layer. Eight simple precrease actions run through the rigid half-plane engine. The remaining compound actions provide replayable and scrubbable interpolation between distinct target-stage models. They remain explicitly labelled guided transitions because the current engine cannot model simultaneous collapse, layer reordering and collision-aware inside reverse folds exactly.

## Retired Jun Mitani collapse experiment

Two Jun Mitani vector PDFs were converted for a local study. The resulting cylinder-collapse view is **not shipped in Fold Lab**. It used an approximate global mountain/valley angle, edge-length projection and a joined seam, but lacked contact/collision handling, layer order, sheet thickness, true crease targets and a final-shape objective. It could visibly stretch and self-intersect, so it cannot be presented as a reconstruction of the artist's completed work.

## Reproducible checks

Start the local server, then open `/tools/qa/action-check.html`. It renders its results and runs the real app in an iframe.

The final run passed **54 engine tests and 6 browser integration checks**. Manual checks also exercised guide-line selection, corner dragging with connected-flap selection, animated previews and flat-layer rendering.

Automated checks cover:

- CP-oriented camera and actual canvas aspect ratio.
- Eight animated precrease actions with finite intermediate poses and exact unfolded coordinates, progressive mountain/valley history, optional full-CP display, plus eight replayable and scrubbable guided compound-fold transitions.
- Version 2 tutorial serialization/reload.
- CP Designer style inheritance and grey-boundary normalization.
- Narrow-screen separation of paper and controls.
- Historical version 1 data remains available for archival regression checks; the old editor is no longer linked in Fold Lab.

Engine checks: `node --test simulator/test/*.test.js`. New tests check rigid edge lengths and area, point-to-point landing, unfold reversal, sequential folds, flap selection, invalid/non-flat continuation, mismatched seam subdivisions, and continuity as the roll closes. The last two cover archived research code only; they do not validate a product feature.

## Backup and compatibility

Before the rewrite: `archive/snapshots/before-action-editor-20260916-165247.zip`. A previous full backup is also retained in that directory. The old crease-group tutorial page and renderer remain in the archive for historical reference, but the current workspace does not offer that editor. Version 1 files are not silently converted into physically different version 2 actions.

## References

- [OrigamiSimulator and upstream authors](https://github.com/amandaghassaei/OrigamiSimulator): simultaneous GPU simulation retained in the main view.
- [Traditional crane instructions](https://www.origami-fun.com/origami-crane.html): preparation, base collapse, petal and reverse folds.
- [Jun Mitani's CP download page and terms](https://mitani.cs.tsukuba.ac.jp/en/cp_download.html).
- [Mitani's rotational-sweep design paper](https://mitani.cs.tsukuba.ac.jp/dl/CAD_2009_3d_origami_based_on_rotational_sweep_mitani.pdf): background for cylindrical forms. The experimental solver here does not implement the paper's design method.
