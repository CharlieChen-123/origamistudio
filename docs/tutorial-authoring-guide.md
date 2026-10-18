# Tutorial Studio — authoring and local verification

Updated 17 October 2026. These changes are local; the published website has not been updated.

New: [Compound folds and teaching stages](compound-tutorial-guide.md) covers the corrected crane head, two practice lessons, symmetric squash/open sink actions, and per-stage timing, instructions, and learner pauses.

## Start with a working example

Open Fold Lab → **Tutorials** in the top bar, then choose **Traditional Paper Crane**, **Dart Airplane**, or **Blintz Box**. Select any step in the bottom timeline. Use Play / Replay or the progress slider to inspect its motion. **Make an editable copy through this step** creates your own lesson starting from the chosen stage. Examples open in viewing mode; authoring tools appear only in the editable copy.

The examples contain 33, 9, and 18 steps respectively. Blintz Box is a gusseted box with visible internal corner folds, not a reproduction of the traditional Masu tuck-and-lock sequence. Both new examples use the same actions available to authors; the airplane demonstrates separately selected wings and continuing after one wing is already raised.

Each tutorial card shows its crease pattern and folded 3D model. These six local SVG previews are generated from the actual tutorial geometry with `node tools/generate-lesson-previews.mjs`.

## Make a tutorial

1. Import a pattern, or select **Bird**, then choose **Make a tutorial**. For a clean sheet, open **File & paper → New square / New A4 sheet**.
2. Choose one intention:
   - **Fold along a line**: select an existing crease, or mark two points for a full-width guide. Click the side of the paper that should move.
   - **Bring points together**: drag the source point onto its destination. The fold axis is calculated for you.
   - **Align two edges**: click the source edge, then the destination. Green is the moving edge; blue is its destination. This aligns their supporting lines, not necessarily both endpoints.
3. Green marks the moving paper; the blue outline shows its destination from above. Set direction and angle, or enter a custom angle. Use **Try the other alignment** when an edge pair has two possible bisectors.
4. For a folded packet, choose **Separate & choose layers**. The exploded view shows material-connected paper groups; a closed edge inside the moving region cannot be split into separate selections. Choose a group and the selector includes any overlapping covering groups required in the folding direction. Each row states which groups it brings. Removing a required covering group also removes the dependent selection. Choose **Use these layers** to confirm. **Individual flap cards** follows the same rules.
5. Choose **Preview motion**. Under **Adjust & replay**, change a plain fold's angle, direction, or selected layers without leaving preview. Open **Step title & instructions** when the motion looks right. Set animation time if needed, and enable **Pause here for the learner** for a teaching checkpoint.
6. Choose **Add step**. To make a preparation crease, check **Fold, then unfold** before saving; both steps are added together.

The temporary fold axis may extend far beyond the short segment marked in the final CP. Tutorial motion does not require changing your original pattern.

## Continue on an already raised model

If the previous step leaves part of the paper standing, **Work surface** appears at the next move. Choose **Flat faces only** to work on the remaining flat paper, or choose a raised surface to draw in that surface's plane. The editor displays the selected plane from above. Select the axis and moving flap as usual.

This is a planar-surface operation, not a general solver for arbitrary curved or coupled folded regions. A motion that stretches or separates connected paper is rejected during preview and saving. Selecting a different surface is sometimes needed; other configurations require a compound motion.

## Compound motions

Under **More moves**:

- **Collapse square base** prepares the existing symmetric square base.
- **Petal fold** uses five landmarks and explicitly selected front, left, and right pocket walls.
- **Inside reverse fold** uses tip, pivot, and destination direction, with two selected walls. The hinge is calculated.
- **Turn paper over** and **Rotate on table** change the orientation of the whole sheet.
- **Raise box walls** closes the paired corner triangles of a flat square packet while raising four walls. The base starts at half the packet width and can be adjusted in preview.

Open **Choose pocket walls** to see and assign material groups. Compatible square bases receive suggested assignments. Assignments are stored as material polygons, so the solver no longer depends on square-base sector numbers. The geometric recipes still require a symmetric petal pocket or a compatible two-wall reverse point. They do not implement every petal, sink, swivel, or reverse fold.

## Revise, repeat, and reuse

- Select a saved fold or supported compound motion and choose **Edit motion**. The editor returns to the paper *before that step*. Saving checks the complete remaining sequence. Invalid later motions prevent the edit from being saved; valid later steps are marked **Review** until you inspect and mark them reviewed. Later instructions may need rewriting even when the geometry remains valid.
- **Repeat as next step** and **Mirror as next step** make editable fold drafts. Mirroring works on plain folds in the original work plane; select the appropriate layers again.
- **Undo / Redo** restores complete saved lesson changes. A fold-and-unfold pair is one undo operation.
- **File & paper → My reusable sequences** records a named inclusive step range. Choose the same starting pose to reuse it. A uniformly resized sheet with the same proportions is supported. Recipes preserve material and layer selections and refuse incompatible starting poses. Include a fold with its unfold. Download / Open sequences transfers your library between devices.
- **Use current camera** stores the current viewing angle on a saved step. Replaying that step recalls the view. **Recommended view** returns to it after orbiting. A new preview also offers **Use current view for this step**. Camera movement never adds a paper turn; choose **Turn paper over** or **Rotate on table** to save an actual orientation step. The latter has an editable turn angle.

## Save and recover

The current authoring draft is stored in this browser on this device, including an unfinished line selection. Use **Resume draft** on Fold Lab's home panel or **File & paper → Resume local draft**. Opening built-in examples does not replace the authoring draft. A new authoring session replaces the single local draft slot; a different browser, port, or device has separate storage.

**Save tutorial**, the green button in the fixed top bar, downloads a self-contained version 2 JSON file containing paper, actions, instructions, checkpoints, and saved views. If a motion is currently in preview, it is validated and saved into the lesson before downloading. An invalid edit blocks the download and preserves the preview for correction. A line that has not yet reached preview is still an unfinished local draft. Use **File & paper → Open tutorial** to reopen the downloaded file. Download finished lessons for durable storage; clearing browser data removes local drafts and reusable sequences. Undo history lasts for the current editing session.

## Playback and paper clarity

- **Creases → Current fold** highlights the active fold and keeps older creases faint. **All M/V** shows accumulated mountain/valley colors; **Paper only** hides crease marks. These settings affect the viewer, not your saved folding steps. The separate **Original CP (gray)** overlay can still be toggled independently.

- **Pan** turns ordinary dragging into sideways/up-down view movement. Turn it off to orbit again. **Shift-drag**, **right-drag**, and **middle-drag** also pan without changing the selected mode. Zoom and camera orientation remain unchanged while panning. **Fit 3D view** recenters the paper, and saved recommended cameras include the panned position.
- **Speed** changes playback from **0.25× to 2×**, including during an animation. It is a viewing preference; it does not rewrite step durations in the tutorial.
- **Auto next** plays subsequent steps continuously. It stops at the final step and at any author checkpoint. Leave it off to inspect each step before choosing **Next step**.
- In an editable lesson, **Pause after this step** toggles a checkpoint on the selected saved step. **Pause here for the learner** sets it on a new preview. Checkpoints are included in tutorial downloads.
- Paper has a small display gap, shaded front/back surfaces, and a thin edge rim. Shared hinges remain joined in normal playback. The moving material receives a distinct tint.
- **Separate layers** pauses the animation and spreads layers for inspection. **Close layers** restores the connected view; pressing Play also closes the inspection view automatically. This is distinct from **Choose layers**, which changes the material participating in a fold.
- Red is mountain and blue is valley relative to the original paper front. Opening a preparation crease keeps its assignment. A later reverse refold replaces only its overlapping material segment. Camera movement and whole-paper turns do not exchange the colours.
- **Original CP (gray)** overlays the source pattern as a faint reference. Tutorial crease colours record the actions actually performed and can legitimately differ from the final source CP.

## Bird preset

**Bird**, listed among the **Level 2** presets, is the project creator's original CP, supplied in `crease-pattern (4).svg`. No personal author name is shown. The exact original is retained at `cp_examples/originals/bird-original.svg`. The simulator preset clips four slightly overhanging crease endpoints to the original square boundary while preserving all 29 creases (14 mountains and 15 valleys). It is available in both Designers and Fold Lab. Adding a CP preset does not infer an instructional folding sequence for it.

## Local testing

Start the server with `node tools/serve.mjs 8124` and open `http://127.0.0.1:8124/origami-3d.html`.

Suggested manual checks:

1. Select Bird, move the fold slider, return to flat, and enter Make a tutorial. The paper should remain visible.
2. On a new square, align opposite edges. Preview, enable fold-and-unfold, and save. Undo and redo should remove/restore both steps together.
3. Make an editable airplane copy through step 7. Draw the wing axis from the nose to a point near the tail center, select both the broad upper wing and its tucked nose flap in **Separate & choose layers**, and fold 90°. Select **Flat faces only** before making the other wing.
4. Edit an early saved fold. Check that invalid later geometry blocks saving and that compatible later steps get a Review label.
5. Draw a new axis, wait for “Draft saved on this device,” reload, and resume. Save/reopen a tutorial file as well.
6. Save two steps as a sequence and apply them to the same starting pose. Try an incompatible pose and check the explanatory message.
7. Play all three examples. Use the slider at intermediate positions and rotate the camera. Check both desktop and narrow layouts.

Developer checks:

```sh
node --test simulator/test/*.test.js
node tools/build-origami3d.mjs
```

Open `tools/qa/authoring-expansion-check.html` through the local server and run its button for the integrated UI regression. It covers edge alignment, paired folds, history, editing, recipes, unfinished-draft recovery, separate airplane layers, continuation on a non-flat model, example viewing, and Bird import. `tools/qa/tutorial-usability-check.html` additionally checks the new library, Bird ordering, two-layer wing selection, saved petal/reverse edits, and camera restoration. `tools/qa/examples-authoring-check.html` rebuilds all airplane and box steps through authoring controls. Existing `tutorial-composer-check.html` and `complete-crane-check.html` cover compatibility with previous workflows. QA restores the browser's draft and recipe data after its checks.

## Accuracy and research

For moving-paper inspection, fold-line/tip handles, attached labels and arrows, pause checkpoints, and detail views, see the [direct editing and teaching guide](direct-teaching-guide.md). The accompanying [example lesson](examples/teaching-a-fold.json) can be opened through **File & paper → Open tutorial**.

Animations preserve rigid material distances and check shared vertices plus vertex-to-edge seams (including mismatched subdivisions) through sampled frames. The system has no full collision/thickness solver, no guaranteed physical layer ordering, and no automatic CP-to-tutorial sequence inference. These limits apply to user-authored lessons too. Layer gaps and edge rims are display aids, not simulated paper thickness; they never alter saved material coordinates.

The layer-access guard applies to ordinary rigid folds in a flat work plane. It combines exact material connectivity with overlap and the recorded stack order; it is a conservative guard for covered/interleaved paper, not a general 3D pocket-access solver. Supported compound folds still use explicit pocket-wall selection and material validation. New or edited ordinary folds save the access rule; existing lesson files keep their prior motion until edited.

The authoring language follows concrete alignment cues and progressive teaching guidance described by [OrigamiUSA](https://origamiusa.org/teaching-tips). The traditional dart sequence can be compared with [Fold ’N Fly's Basic Dart](https://www.foldnfly.com/1.html). The distinction from a traditional Masu sequence can be checked against [Origami Instructions](https://www.origami-instructions.com/origami-box.html). No external tutorial images or text are bundled; this project's diagrams, motion data, and step wording are generated locally. OrigamiSimulator attribution and its original licenses remain intact.

## Backup

This usability pass was backed up, including the prior uncommitted tutorial work, to `archive/snapshots/before-tutorial-usability-20261010.zip`.

The subsequent clarity and playback pass was backed up to `archive/snapshots/before-layer-playback-20261010.zip`. Its UI regression page is `tools/qa/playback-clarity-check.html`.

The pan, paper-group selection, and visual library pass was backed up to `archive/snapshots/before-pan-packets-cards-20261011.zip`. Its UI regression page is `tools/qa/pan-layer-cards-check.html`.

The earlier pre-change tracked project is archived in `archive/snapshots/before-tutorial-expansion-20261009.zip` from Git revision `cc21377`. Unrelated pre-existing portfolio and build files were left alone. No push or deployment was performed.

## Intent-based reverse folds and saved motion edits

For **Inside reverse fold**, mark **tip → pivot → new direction**. The final point stays the same distance from its pivot: the third click chooses a direction, not a new tip length. The app derives the hinge and draws the destination marker. Assign both walls under **Choose pocket walls**; hover a wall card to highlight it on the paper. For a petal fold, choose the five landmarks and the three walls of a compatible symmetric pocket. These templates work with material regions, including an explicitly selected raised planar surface, and no longer require sector IDs from the crane example. Incompatible paper connectivity is rejected, with the original lesson preserved.

**Edit motion** supports saved ordinary folds and petal/reverse templates. Reposition their landmarks, change the selected walls/layers, preview, and save. Turns and box actions expose their parameters in preview. **Repeat as next step** opens a reusable editable draft. Mirroring remains limited to ordinary folds on the original work plane; reselect layers after mirroring. Multi-step reuse is under **My reusable sequences**, with validation against the starting pose.
