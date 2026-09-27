# Building an accurate crane square-base collapse

## Current failure

The crane lesson's collapse stage in `assets/action-studio.js` creates four new triangles in `guidedGeometry('collapse')`, blends their vertex positions in `morphGuidedGeometry()`, and paints separate lines in `guidedStageCreases()`. Those triangles do not retain the identity of the paper faces in the preceding step. Consequently, the target is only a diamond silhouette: it has the wrong material mapping, no four-flap stack, and crease marks that are unrelated to actual hinges. Linear vertex blending can also change edge lengths. Improving its easing or shading cannot repair these properties.

## Correct end-state contract

Start from a single square, with only the two diagonal and two straight precreases active for this stage. Their intersection partitions the original sheet into eight triangular sectors. Keep a stable material ID and original 2D coordinates for each sector throughout the tutorial. A square base has four flaps, each made from two adjacent sectors. The four original sheet corners coincide at the open tip; the sheet center is the closed tip. The four edge midpoints map in alternating pairs to the left and right sides. There are two flaps on each visible side.

For a normalized square `[-1, 1]²`, a useful geometry check is: original center `(0, 0)` maps to folded tip `(0, √2)`; each original corner maps to open tip `(0, 0)`; edge midpoints map alternately to `(−1/√2, 1/√2)` and `(1/√2, 1/√2)`. These positions preserve the side lengths of the eight triangular sectors. They do **not** by themselves decide which flap lies above another; that needs an explicit layer-order solution consistent with the mountain/valley assignments and viewed paper side.

Acceptance checks: eight source sectors survive into the folded form; each sector keeps its three edge lengths and area; the union of the folded footprint is one square with four material layers; flap order is two front/two back; the four original corners coincide at the open tip; displayed creases are projected from mapped source edges, never hand-drawn stage coordinates. Store the flat state, folded state, and face order in FOLD-compatible data, retaining original material coordinates as a project-specific property where needed.

## Implementation options

### A. Verified end state, then authored motion

Construct the eight-sector folded form and its layer order first. Use ORIPA or Rabbit Ear as an independent check against a small square-base CP, not as an assumed answer for the full 74-line crane CP. Author a few collapse poses against the same eight material faces. Enforce shared hinges and edge lengths on every intermediate pose; avoid raw vertex-position interpolation. This is the shortest route to a correct visible result, but an authored path still needs collision and layer checks before it can be called physically accurate.

### B. Dedicated square-base kinematics (recommended)

Use the validated end state from A. Drive the four active precreases with one progress parameter and solve the eight rigid sectors as a hinged mesh at each frame. Constrain shared crease vertices, fixed sector lengths and orientation, crease-angle signs, and chosen face order. Start just beyond the flat singular configuration with a small intended fold, then continue from each previously solved frame. Add pairwise face-contact checks and stop or adjust when non-neighboring sectors intersect. Render the same material mesh from flat to closed. This targets an accurate square-base tutorial without trying to solve every possible CP.

### C. General sequence and collision solver

Accept arbitrary CPs, infer useful human operations, solve a valid fold path and layer order, and handle contact and self-collision. This would enable more than the crane, but requires much more research and validation. The existing OrigamiSimulator is a simultaneous crease-force simulation; it does not infer the user's human tutorial sequence or guarantee the desired flat stack. It is unsuitable as a drop-in answer to this stage.

## Suggested build order

1. Isolate and normalize the four preparatory creases from the crane lesson; confirm their M/V assignments for the chosen paper side.
2. Build the eight-sector topology and a correct folded target with explicit material correspondence and face order. Compare the target with a hand-folded or independently solved square base.
3. Replace the current stage-9 silhouette and painted stage creases with this actual folded mesh. Ship only after its endpoint checks pass.
4. Implement the dedicated hinged collapse path. Verify every sampled frame for edge-length preservation, common hinge positions, intended M/V signs, and unintended face intersections.
5. Only then reuse the same layer-aware material mesh for kite, petal, and later crane operations.

ORIPA and Rabbit Ear are useful reference implementations, but both repositories state GPL licenses. Review licensing before bundling either library into this MIT-licensed project; the FOLD format can serve as the interchange contract independently.

## Sources

- [Origami crane instructions](https://origami.me/crane/), including the square-base collapse and later bird-base steps.
- [FOLD specification](https://github.com/edemaine/fold/blob/main/doc/spec.md), including faces, mountain/valley assignments, overlap order, and frames.
- [OrigamiSimulator documentation](https://origamisimulator.org/), describing its simultaneous crease simulation.
- [ORIPA repository](https://github.com/oripa/oripa), with folded-form computation and command-line FOLD export.
- [Rabbit Ear documentation](https://rabbitear.org/book/origami.html), showing flat folding and layer-order methods.
