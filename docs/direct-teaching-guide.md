# Review a fold and teach it

These tools are in **Make tutorial**. They use the existing portable tutorial format; labels, arrows, checkpoints and detail views travel with **Save tutorial**.

## 1. Confirm what moves

Create a fold and select **Preview**. In **Moving paper**, select **Inspect**. The moving paper is shaded and the stationary paper fades. **Change layers** opens the existing connected-paper picker: joined or covered layers must move together.

The editor checks paper connections and samples the motion for new crossings. **Inspect crossing** jumps to a suspect moment. A clear result only means no crossing was found in those samples; it does not certify a physically possible fold. Larger models receive a limited-check message.

## 2. Adjust directly on the paper

For an ordinary fold, choose **Adjust on paper**:

- Drag **A** or **B** to move either end of the fold line on its work surface.
- Drag the angle handle at the flap tip to change its fold angle. The tip stays constrained to a circular fold path.
- Use **Fold angle** for a precise adjustment. Focus a handle and use the arrow keys for keyboard editing; Shift makes smaller changes.
- **Original** compares against the motion before this editing session. **Reset adjustments** restores that motion and keeps your teaching notes.
- Choose **Done**, then **Save step** or **Save changes**.

Invalid adjustments return to the last valid motion and show a suggested correction. To switch mountain/valley direction, use the existing direction control. Direct handles currently edit ordinary folds, including folds on a selected planar work surface. Pocket, squash, sink and reverse moves retain their own structural controls.

## 3. Add labels and arrows

In a preview or saved editable step, expand **Teaching notes**:

1. Select **Add label**, then click a point on the paper. For **Add arrow**, click its start and destination.
2. Enter short teaching text and choose the animation range in which it appears.
3. Select **Save mark**. Use the entry in Teaching notes to edit, reposition or remove it.

Marks stay attached to the material point as the paper folds. Click the exposed layer you mean; rotate the view first if another layer covers it. Placement temporarily disables orbit, so cancel placement to change the view.

## 4. Pause and show a detail

1. Scrub to an important moment and select **Add checkpoint**.
2. Set **At (%)**, write an instruction, and leave **Pause for the learner** checked when a pause is needed.
3. Optionally select **Choose a detail on the paper**, click its anchor, and select a magnification.
4. Select **Save checkpoint**.

Playback stops exactly at a pause checkpoint. **Continue** resumes from there. Checkpoint buttons below the player also jump directly to those moments. **Full view** restores the framing before a detail view. Learners can disable **Teaching marks** or **Detail views** independently.

Checkpoints supplement the existing three-stage controls for compound moves. They can also be used in ordinary folds, unfolds and turns. Up to 24 marks and 16 checkpoints are allowed per step; checkpoint times must be at least 1% apart.

## Try the example

Open [Teaching a fold](examples/teaching-a-fold.json) using **File & paper → Open tutorial**. It includes a moving flap, an arrow, a paper label, a halfway pause with a detail view, and an unfold step. Make an editable copy of a built-in lesson before adding your own notes.

## Verification

Run `node --test simulator/test/*.test.js` from the project root. With the local server running, open `tools/qa/direct-teaching-check.html` and click **Check direct editing and teaching**. This exercises pointer edits, keyboard adjustment, annotations, pause/resume, saved detail views, export/reopen and four viewport sizes. QA pages restore the saved draft after their checks finish; run them one at a time.
