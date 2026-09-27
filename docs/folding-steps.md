# Make a folding tutorial

## Start with one action

Import your SVG or FOLD pattern in Fold Lab, then select **Make a tutorial**. The large paper view shows the state after your saved steps. CP lines are reference marks; a tutorial can also use temporary guide folds that are absent from the final CP.

### Method A: fold along a line

1. Choose **Fold along a line**.
2. Click a colored crease. If there is no crease where you need the fold, click two points to draw a temporary guide line. You can choose **Only existing creases** or **Draw a new guide** under **More control** if you want to lock that behavior.
3. Click inside the part of the paper that should move. Shading shows the selected region. **Clear selection** lets you try again; **Move the other side** is under **More control**.
4. Most folds can keep the default flat 180° motion. The **More control** settings stay visible while you mark each move, so you can change the layers, direction, or angle without reopening a menu. The fold axis extends across the paper, so it is not limited to a short final CP segment.

Use the wheel or **Zoom in** for dense patterns. Right-drag pans; **Fit paper** restores the view.

### Method B: bring two points together

1. Choose **Bring points together**.
2. Press and hold a corner or marked point (A), drag it onto its destination (B), then release. For example, drag the bottom-left corner onto the top-left corner to fold the paper in half. The editor labels A and B after you release; nearby vertices and the center snap automatically.
3. Keep the default flat 180° motion to land on the target. Smaller angles under **More control** show a partial movement towards that target.

The crease is calculated as the perpendicular bisector between the two points. It appears halfway between A and B, at right angles to the line joining them. This defines one planar point-to-point fold; it is not a general multi-constraint origami solver. **Towards you** reveals a blue valley crease; **Away from you** reveals a red mountain crease when the original front faces you. Turned-over paper reverses the assignment on its original front.

## Which paper moves?

Under **More control**, **All layers on this side** moves every region on the chosen side. **One connected flap** starts from the clicked material point and follows connected paper on that side; geometrically overlapping, unconnected layers stay still. This is not a complete layer-selection or collision system. Preview the shading before saving. In line mode, click inside the desired visible flap; in drag mode, the source point selects it.

## Preview, save, and teach

Choose **Preview motion** after marking the fold. The paper animates immediately; replay, scrub, or switch between Top view and 3D view. On the preview, enter a **Step title** and **What should the learner do?**, then select **Add step**. **Adjust motion** returns to the draft without saving it.

The timeline along the bottom shows saved steps. After saving a fold, **Unfold and add step** appears above the next fold choices. One click adds an opening step and plays its animation. The same shortcut appears when you view the final saved fold. It is unavailable after an unfold, since that paper is already open. If you want to inspect or name the unfold before adding it, choose **More moves → Unfold last step** instead. Click a saved step to present it, then use **Previous step** and **Next step**. To change your choice before preview, use **Change move**. **Open a lesson or remove a step → Remove last step** deletes the final step. Arbitrary earlier geometric edits are not currently supported because later axes depend on the prior folded state.

When viewing a saved step, **Edit title & instructions** lets you improve its teaching text without changing the fold animation. **Save tutorial** is always visible at the top once your lesson has a step; it downloads a `.origami-tutorial.json` file containing the paper geometry and actions. Other users select **Open a lesson or remove a step → Open tutorial** to load it. Save before switching to another pattern or reloading the page; there is no automatic recovery of unsaved work.

## Try the Traditional Paper Crane lesson

Choose **Traditional Paper Crane** for a complete 33-step lesson using connected paper geometry throughout. It includes the square-base collapse, both petal folds, narrowing, neck and tail reverse folds, a simple beak fold, and opening the wings. See [complete crane and templates](complete-crane-templates.md) for supported actions, authoring instructions, and validation.

## Current physical limits

- Each action rigidly rotates selected polygons about a straight axis. Edge lengths and surface areas are preserved by that movement.
- The next axis can only be defined when the prior paper state is flat. After a 45° or 90° demonstration, unfold it before adding another axis.
- Rendering offsets reduce flicker between overlapping layers. They are visual offsets, not simulated paper thickness or certified layer ordering.
- There is no collision detection, tearing model, arbitrary multi-axis collapse, or automatic reconstruction of a folding sequence from a CP.
- Temporary folds are saved as actions. They do not alter the original CP's mountain/valley assignments.

## File format

Version 2 uses `format: "fold-lab-tutorial"`, `version: 2`, `title`, `fold`, and `actions`. `fold` contains the imported FOLD geometry; the editor uses the upstream simulator's X/Z plane for three-coordinate flat input. Actions contain a two-point axis, moving side (`1` or `-1`), signed angle, optional material-coordinate seed, title and caption. An unfold references the immediately preceding fold.

Version 1 crease-group tutorials cannot be losslessly interpreted as these actions. The current workspace accepts version 2 lessons only; do not change a version number manually. Historical version 1 files remain in the archive, but their editor is no longer linked from Fold Lab.

See [implementation and validation](action-editor-validation.md) for tests, research links and archived experiments.

The version before the simplified composer is preserved at `archive/snapshots/before-tutorial-editor-redesign-20260926-1518.zip`.
