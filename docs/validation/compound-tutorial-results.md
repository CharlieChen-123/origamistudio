# Compound tutorial validation — 17 October 2026

Local implementation, not deployed. Before-change backup: `archive/snapshots/before-compound-tutorial-20261011.zip`.

## Delivered

- Crane step 30 uses a coordinated inside reverse fold for the head, including connected packet walls.
- Reusable local distance-constraint primitives drive a symmetric eight-panel squash and square-rim open sink. The supported shapes are a half-folded square and the matching waterbomb base. The actual starting pose is checked, including rigidly rotated or raised packets.
- Three named teaching stages support independent replay, duration, instruction and learner pauses. Viewer speed remains independent. Short stages are included in geometry and crease-history sampling.
- Two practice lessons are grouped under Tutorials → Practice a fold, with local previews generated from their actual geometry.
- New actions, rim depth and stage settings work with editing, portable JSON, local draft recovery and reusable sequences.

## Results

- **102 automated tests passed, 0 failed.** Full output: `compound-core-tests.txt`.
- Different point widths, paper sizes, sink rims at 10%, 25% and 45%, rigidly rotated and raised starting packets: material length and seam checks passed.
- Squash and sink: no strict triangle-interior crossings in 59 intermediate samples for each of three rim depths. Existing crane sampling also passed with its new head motion. Flat contact is permitted; sampled tests do not prove continuous collision freedom.
- `tools/qa/compound-tutorial-check.html`: **ALL PASS**. Actual authoring controls create squash and sink steps; stage timing/instructions/pauses persist; stage-only replay stops correctly; sink depth changes are exported; JSON reopens; triangular-point reverse edits succeed; unsupported shapes offer preparation help; unfinished edits survive a real reload; stage controls fit 390×740, 614×510 and 1024×768 frames.
- `tools/qa/tutorial-usability-check.html`: **ALL PASS**. Existing library, Bird ordering, Dart layers, petal/reverse edits, downstream validation, physical turns, saved cameras and draft restoration.
- `tools/qa/playback-clarity-check.html`: **ALL PASS**. Speed changes, pause, layer inspection, automatic progression/checkpoints, preview adjustments, pending-preview export and responsive layout.
- `tools/qa/pan-layer-cards-check.html`: **ALL PASS**. Six main example previews, camera pan variants, required layer groups and saved camera positions.
- JavaScript syntax and Git whitespace checks passed. Generated HTML and tutorial preview SVGs rebuilt.

## Scope

This is a bounded compound-action system, not a general folding-sequence search or arbitrary pocket solver. The squash operates both symmetric pockets together. The sink opens the whole compatible packet; it does not accept a closed or obstructed pocket inside any larger model. Paper thickness, friction, body inflation and general contact resolution remain outside the implementation. New tests do not establish those capabilities.

See `../compound-tutorial-guide.md` for the authoring workflow and exact input requirements.
