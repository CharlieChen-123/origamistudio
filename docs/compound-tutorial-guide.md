# Compound folds and teaching stages

Updated 2026-10-17. Local development version; no deployment is required.

## Try the new motions

Open **Fold Lab → Tutorials → Practice a fold**.

- **Turn a point inward**: a short inside-reverse lesson using a triangular sheet. It does not depend on square-base sector numbers.
- **Squash & open sink**: prepare a square, fold it in half, squash the two symmetric pockets into a waterbomb base, and open-sink its closed point.
- In the complete **Traditional Paper Crane** lesson, step 30 now uses an actual inside reverse fold for the head. The connected packet opens with it; the head is no longer a simple tip overfold.

The three buttons beneath the player replay individual stages. Each stops at its own endpoint. **Play** then continues from that position. **Speed** still controls viewing speed independently of the author's timing. Stage pauses also stop **Auto next** until the learner resumes.

## Make a squash or sink step

1. Open **Squash & open sink**, select step 5, and choose **Make an editable copy through this step**.
2. Open **More moves → Squash symmetric pockets**. Preview and choose **Add step**.
3. Choose **More moves → Open-sink a point**.
4. Adjust **Sink rim below the tip**. The percentage locates the rim along the point, not the final distance traveled by the inverted tip. The supported range is 10–45%.
5. In **Timing & teaching pauses**, set the duration, instruction, and optional pause for each stage.
6. Choose **Add step**. Use **Save tutorial** to download the portable JSON. It includes the current preview if you have not added it yet.

Saved motions can be reopened with **Edit motion**. Stage settings and rim depth survive download/open, undo/redo, reusable sequences, and local draft recovery. Changing an early action still requires the later actions to pass geometry validation.

## Make an inside reverse fold

Start with a flat two-wall point, or select its raised work surface. Choose **Inside reverse fold** and mark the tip, its pivot, and the intended direction. The new hinge is computed from these marks.

In **Choose pocket walls**, check that both walls and any connected body layers are included. A simple two-layer packet receives suggested front/back groups automatically. The preview rejects wall selections that would stretch or separate the sheet. A material group is not an independently detachable piece of paper.

## Supported structures

| Motion | Supported input |
| --- | --- |
| Inside reverse | Compatible flat two-wall points, selected through material regions; also on a local work plane |
| Petal | The existing symmetric prepared pocket |
| Squash symmetric pockets | One complete square, folded once across its original horizontal center; both pockets participate |
| Open sink | The matching, unchanged triangular waterbomb base; square rim at 10–45% of the point |

The squash and sink infer the mechanism from the paper's material coordinates and verify its actual starting pose. They tolerate scale changes, subdivisions, and rigid rotation/translation of the entire packet, including a raised packet. They do not recognize an arbitrary pocket inside a larger animal, and are not general single-pocket squash or closed-sink algorithms. If the input is incompatible, the editor explains the required starting shape and offers the practice lesson.

## Geometry and boundaries

`local-constraints.js` implements exact three-sphere distance intersections with branch selection, planar rim angle constraints, and triangle mapping. `pocket-motion.js` uses those primitives for a specified eight-panel symmetric mechanism. The solver computes coupled panel positions; it does not interpolate a mesh between drawings.

The sink opens its surrounding pockets until the rim is planar, then reverses the central cap and closes around the same material rim. Every panel preserves its edge lengths, and shared material points stay connected. The trajectory deliberately opens the entire compatible packet; it does not hold an arbitrary outer body fixed.

Teaching timing is separate from geometric motion. Crease-history sampling and material validation include each stage even when its playback duration is short. The current checks cover material lengths, shared points, T junctions, continuous starts, and sampled strict triangle-interior intersections in regression tests. Flat layer contact is allowed. They are not a proof of collision freedom, a thickness/contact simulation, or an automatic folding-sequence planner.

## Verification

- Core tests: `node --test simulator/test/*.test.js`.
- Full new UI workflow: `tools/qa/compound-tutorial-check.html`.
- Existing editing/recovery checks: `tools/qa/tutorial-usability-check.html`.
- Playback speed/checkpoints and responsive layout: `tools/qa/playback-clarity-check.html`.

Before-change backup: `archive/snapshots/before-compound-tutorial-20261011.zip`.
