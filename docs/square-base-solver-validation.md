# Square-base solver and continuous valley dashes

Implemented 2026-09-25. Snapshot before editing:
`archive/snapshots/before-square-base-solver-20260925.zip`.

## Research and scope

- [ORIPA](https://github.com/oripa/oripa) computes flat folded shapes and layer relationships. It is not a step-by-step motion planner.
- [Origami Simulator](https://github.com/amandaghassaei/OrigamiSimulator) drives a crease network with physical constraints. It remains the general-purpose Fold Lab simulator, but a teaching sequence needs explicit layer selection and motion branches.
- [Tachi, Geometric Considerations for the Design of Rigid Origami Structures](https://origami.c.u-tokyo.ac.jp/~tachi/cg/DesignOfRigidOrigamiStructures_tachi_IASS2010.pdf) describes rigid facets, hinge constraints, and closed-loop compatibility.
- [Traditional crane folding instructions](https://origami.me/crane/) were used to check the sequence: square base, side guides, top guide, then petal fold.

No external solver code was copied or added. The new square-base mechanism is an original analytic implementation under this repository's license. It solves this authored mechanism, not arbitrary crease patterns.

## Geometry

`simulator/src/square-base.js` keeps two opposite quadrants as rigid squares. The other two quadrants each consist of two rigid triangles. A rotation determines the rear square; the two remaining corner positions satisfy their exact distances to the center and adjacent edge midpoints. The branch is chosen continuously from the unfolded sheet.

The final outline is a diamond-shaped square with side length half that of the original sheet. All four original corners meet at the open bottom point; the original center becomes the closed top point. The material area remains that of the original sheet, with four overlapping layers. A rigid translation and rotation frame the base for subsequent guide folds.

The built-in lesson uses an exact square paper boundary separate from the imported reference illustration. The imported SVG has small tolerance-related coordinate deviations; those no longer affect the teaching mechanism. Saved tutorials include the optional `paper` field, while older version-2 tutorials without that field remain supported.

The six steps after collapse are left guide fold / unfold, right guide fold / unfold, and top triangle fold / unfold. Front guide folds include their attached inner layer and leave the back packet stationary. Learned creases are recorded in material coordinates and follow the correct faces. The lesson explicitly stops at petal-fold preparation. The former placeholder petal/head/wing morphs are not part of this built-in sequence.

This is zero-thickness kinematics. Display layer offsets avoid depth flicker; they are not physical paper thickness. It does not implement a general collision or layer-order solver.

## Dash rendering

`assets/crease-render.js` anchors a constant-length dash train to a line's projected coordinates. Reversing a fragment or splitting it into short pieces no longer restarts or compresses the pattern. Screen dash lengths stay fixed in screen pixels as zoom changes. A4 uses larger print-specific dashes. Red mountain solids and blue valley dashes are retained. Geometry and editable source lines are not altered by this rendering fix.

## Verification

- `node --test simulator/test/*.test.js`
- `node tools/check-inline.mjs cp-designer.html "cp-designer_with constraints.html" origami-3d.html`
- `node --check assets/action-studio.js`
- `tools/qa/square-base-check.html`: real app loading, 75 poses across 15 steps, save/load round trip, and controls for inspecting collapse and guide folds.
- `tools/qa/crease-render-check.html`: continuous lines versus 1,200 reversed fragments at 50%, 100%, and 160% zoom, plus color A4 styling.

Numerical tests check all pairwise distances within each face, shared material point positions, total material area, and the exact endpoint. They sample 101 collapse states and 99 intermediate states in each of the four new folding motions for non-coplanar triangle-interior crossings. Sampled checks are not a proof of general collision safety.

Browser inspection covered intermediate collapse, the top-view endpoint, a lifted front flap, progressive CP visibility, and the actual Flat Crane preset's dash appearance.
