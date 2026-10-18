# Tutorial usability pass — 10 October 2026

Local changes only. Before-edit archive: `archive/snapshots/before-tutorial-usability-20261010.zip`.

## Changes verified

- Dart steps 8 and 9 each move both constituent wing flaps. The tucked nose layers are no longer left against the body. Material connectivity supports partially overlapping UV edges; motion validation also checks T-junction seams.
- Sub-pixel pointer rounding at the nose no longer creates a spurious bridge between the wings.
- Example tutorials live in the top-bar Tutorials library. Bird is Level 2 and shared preset metadata is sorted by level in both designers and Fold Lab.
- Exploded layer selection supports multiple flaps, hover/focus highlighting, unselected-layer fading, adjustable separation, and explicit confirmation/cancellation. Separation is never written into the simulation.
- The marking canvas shows moving material and a projected destination. Edge alignment has an alternative bisector; ordinary folds accept custom angles.
- Reverse-fold authoring asks for tip, pivot and destination direction. Saved legacy hinge-based reverse steps reopen in this form without changing their motion. Petal/reverse edits preserve material-region wall selection. Compatible compound pockets can be authored in a raised local plane.
- Saved motions can be edited/repeated; existing mirror, sequences, undo/redo, draft recovery and downstream-review mechanisms remain available. Turn angle and box base ratio are adjustable. Recommended views can be captured and restored independently from paper turns.
- Default tutorial views frame the motion before playback, avoiding edge-on airplane wings and camera recentering during an animation.

## Validation

- `node --test simulator/test/*.test.js`: **84 passed, 0 failed**.
- `tools/qa/tutorial-usability-check.html`: library, level ordering, exploded two-layer selection, destination overlay, preview/save, saved petal and reverse edit, material-region persistence, physical paper turn, recommended camera, and real reload recovery of an unfinished multi-layer edit with custom angle, title and camera — **ALL PASS**.
- `tools/qa/examples-authoring-check.html`: all **9 Dart** and **18 Blintz Box** steps rebuilt using authoring controls, with matching material positions — **PASS**.
- `tools/qa/authoring-expansion-check.html`: edge matching, fold/unfold pair, undo/redo, editing/review, reusable sequences, real reload and draft recovery, partial layers, raised-surface continuation, camera JSON round trip, invalid downstream edit preservation, example viewer and Bird import — **ALL PASS**.
- Desktop, compact 614 × 507, and narrow layouts checked. The 390 × 844 layout also passed DOM boundary checks; the host's short visible browser surface clipped the lower part of its final screenshot. The layer dialog keeps confirmation visible; tutorial examples no longer occupy the simulation sidebar.
- Built page regenerated from `tools/origami3d.template.html`; Git whitespace check passed.

## Scope

This is an authoring system for explicitly selected rigid folds and supported compound pockets. It does not infer an arbitrary folding sequence from a CP, simulate paper thickness, or guarantee collision-free motion. Reverse folds require compatible two-wall points; petal folds require a compatible symmetric pocket. The material validator rejects a motion that stretches or separates the sheet; it does not prove every motion is physically achievable.

The Dart correction follows the standard wing sequence described by [Fold 'N Fly](https://www.foldnfly.com/1.html). No external diagrams were copied.
