# Storyboard V2

V2 is a working local interface for the existing Designer, simultaneous solver and sequential tutorial engine. Its paper view uses actual fold geometry. The rendered crane used in the earlier design studies is not part of the production interface.

## Open the workspace

Double-click `start-origami.cmd`. It opens `studio-v2.html` with a local server. If your server is already running on port 8126:

- Design: `http://127.0.0.1:8126/studio-v2.html`
- Fold Lab: `http://127.0.0.1:8126/fold-lab-v2.html`
- Tutorial library: `http://127.0.0.1:8126/fold-lab-v2.html?view=tutorials`

## Design and simulate

Draw or import a CP in **Design**. Drawing controls live on the right; **Drawing tools** can close that rail for more canvas space. The bottom toolbar contains Undo, Redo, Erase, Select, Pan, cleanup and pattern checks. The magnifier buttons beside it zoom in and out. **Patterns** opens the existing preset library, including Bird at Level 2. **Drawing constraints** expands the original mathematical symbols and labeled tools. Constraints can also be expanded with Enter or Space.

Choose **Fold Lab** to send the current pattern directly into 3D. No manual SVG export is needed. Unchanged presets retain their original source SVG and fold angles; edited drawings use their current exported geometry. Fold Lab's **Patterns** opens the model/import drawer. **File → Import SVG / FOLD** accepts an external pattern.

The fold slider explores the simultaneous folded shape. It does not automatically infer a human teaching sequence.

## Watch a tutorial

Choose **Tutorials**, then open a complete lesson or expand **Practice a fold** for a short technique lesson. The library is a page, so the main navigation stays available.

The bottom filmstrip shows the actual paper after each saved step. Click a thumbnail, or focus one and use Left/Right, Home or End. **Previous**, **Play/Replay**, and **Next step** stay beside the progress slider even when settings are closed. Playback speed, auto-next, paper-layer inspection, crease visibility and pan remain available below the player.

Instructions sit beside the canvas. Longer instructions have a **Read full instructions** action. **Step settings** opens the full step information and the option to make an editable copy through the selected step.

## Make a tutorial

1. Choose **Make tutorial**. A centered dialog offers the current imported pattern, a fresh square, an A4-proportioned rectangle, or **Resume saved draft**. From Design, this action carries the current drawing into Fold Lab. If a built-in lesson is open, you can continue from its current step.
2. Choose an intention: **Fold along a line**, **Bring points together**, or **Align two edges**. **More moves** contains the supported compound actions and paper turns.
3. Mark the paper on the large canvas. The prompt tells you what to select next. Use the paper-layer picker when only an accessible connected group should move.
4. Choose **Preview motion**. Replay and inspect the fold. The inspector opens the step title and learner instructions. Optional parameters are grouped under **Motion, timing & view**.
5. Choose **Save step**. That saved paper state appears in the filmstrip, and the next move starts from it.

For a precrease, **Unfold and add step** in the move chooser saves and plays the unfolding action. When inspecting the last saved fold, **Unfold this fold** does the same. After unfolding, use **Add next step** at the bottom of the right inspector to return directly to the next move chooser. The canvas starts from the final saved paper state.

The authoring rail can be closed with **Hide settings**. **Step settings** brings it back. The canvas and playback controls use the space that is actually available. On a phone, the paper appears first, followed by playback, the working note and the filmstrip in a scrollable page.

## Edit and reuse steps

Select a saved step and choose **Edit this step** to reach the editing tools. You can change wording, edit the motion, repeat or mirror a supported fold, and save a recommended camera view. **More** on a thumbnail opens step actions. Deleting a fold that a later unfold depends on is prevented with an explanation. Changes to earlier motions still validate later steps and mark steps that need review.

**Add step** in the filmstrip heading continues from the final saved paper state, including when an earlier step is selected. Add or adjust an existing preview before starting another one.

Use compound actions only with the supported starting geometry. Symmetric squash/open sink and material-region reverse folds keep the same limits documented in [the compound guide](compound-tutorial-guide.md). Their teaching stages can be replayed independently and have editable timing, instructions and pauses.

## Camera and paper turns

Drag to orbit, scroll or use the magnifier buttons to zoom, and use Pan, Shift-drag, right-drag or middle-drag to move the camera. **Top view** and **Fit 3D view** reset the viewing frame. A tutorial can save its own recommended view.

Moving the camera changes how you look at the paper. **Turn paper over** and **Rotate on table** are authored motions and become tutorial steps.

## Save and recover

**Save tutorial** in the header downloads the existing version 2 JSON format, including a current motion preview. **File → Open tutorial** restores it. Existing tutorial files and the previous interface use the same format.

The local authoring draft is saved as you work. Switching from a tutorial to Fold Lab and back preserves its unfinished motion, wording and playback progress in memory. After a reload, choose **Resume saved draft** or **File → Resume local draft**. Starting a new tutorial or opening a file also keeps one previous local draft; **File → Recover previous draft** swaps the current and previous draft copies. Download important tutorials rather than relying on browser storage alone.

## Local development and rollback

Rebuild generated pages in order:

```sh
node tools/build-origami3d.mjs
node tools/build-storyboard.mjs
node tools/check-storyboard-build.mjs
```

Public legacy entry URLs redirect to V2. Maintained sources are `tools/designer.template.html` and `tools/origami3d.template.html`; generated pages should not be edited directly. Local snapshots under `archive/snapshots/` are excluded from Git.
