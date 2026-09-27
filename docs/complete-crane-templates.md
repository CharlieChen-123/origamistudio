# Complete crane and reusable motion templates

## Try the lesson

1. Start the workspace and open **Fold Lab**.
2. Choose **Traditional Paper Crane — Complete 33-step folding lesson**.
3. Use **Next step**, **Previous step**, **Play / Replay**, or the progress slider.
4. The paper starts unmarked. Red mountain and blue valley marks appear as actions are performed. **Show full CP** overlays the original reference pattern instead.
5. **Fit 3D view** centers and enlarges the current paper. Drag to inspect the layers.

Steps 1–8 prepare the square; 9 collapses it into a preliminary square base; 10–22 prepare and perform both petal folds; 23–27 narrow the points; 28–29 inside-reverse the neck and tail; 30 folds a simple beak; 31–32 lower the wings; 33 presents the completed crane.

The beak uses a simple tip overfold, rather than a second inside-reverse fold. The body stays uninflated. These are explicit choices for this crane variant.

## Make your own lesson

While viewing a built-in step, choose **Make an editable copy through this step**. The copy includes the completed endpoint of that step. The built-in lesson remains available separately. The copy initially shows only creases made so far. Use **Save tutorial** at the top to download the portable JSON, and **Open a lesson or remove a step → Open tutorial** to restore it.

In an editable lesson, hover over a step in the bottom timeline and use the × at its lower-right corner to delete it. Right-click a step for **Replay step**, **Edit title & instructions**, or **Delete step**. This edit changes the teaching text; it does not redraw the motion. **Undo deletion** immediately restores the removed step, as long as no later step has been added. Built-in steps offer **Make an editable copy** instead of edit/delete. If another step unfolds the selected fold, delete the unfold step first. A deletion is refused when the remaining motion sequence would no longer compile.

The quickest practice exercise is to open the crane lesson at step 15 and copy through that step. In the editor, open **More moves**, choose **Petal fold**, and click the five requested landmarks in order. Choose **Preview motion**, check the result, write a short title and learner instruction, then choose **Add step**. Turn on **Show full CP** whenever you want the complete reference drawing.

For a lesson from scratch, import a CP in Fold Lab and choose **Make a tutorial**. Choose **Fold along a line**, click a colored crease or two points for a guide line, and click the moving side. **Bring points together** is useful when the learner should align a corner with another point: the editor computes the halfway fold line. Choose **Preview motion**, enter the title and learner instruction, and select **Add step**. The next screen offers **Unfold and add step**: one click adds and plays the opening action. Repeat for each instruction, then save the lesson file.

Under **More moves**:

- **Square-base collapse** works on a complete, unfolded square.
- **Petal fold** needs the symmetric prepared square-base pocket. Select the bottom tip, left shoulder, right shoulder, left guide hinge, and right guide hinge, in that order.
- **Inside reverse fold** needs a flat two-wall packet. Select its pivot on the center spine, old tip, and a point along the new oblique hinge.
- **Turn paper over** rotates the whole paper without changing its creases.

The editor chooses the pocket side from the number of whole-paper turns. If needed, use the visible **More control** setting to select **Original front** or **After turning over**. Preview checks for invalid geometry, stretching, and separated seams before allowing the action into the lesson. **Clear selection**, **Change move**, and Escape let you start the landmark selection again. Scroll zooms and right-drag pans the editor.

For **Petal fold**, prepare the kite guide creases on a flat square base, then select the front pocket. In the editor, follow the numbered picture: click the open bottom point, the left and right shoulders, then the two upper ends of the side guide creases. The front bottom point lifts while the two side pockets close. For **Inside reverse fold**, first make a narrow two-layer point. Click the pivot where it joins the body, its current tip along the center spine, and a point on the proposed diagonal hinge. The two walls open, the tip moves between them, and the packet closes. The highlighted checklist tracks the next click; **Undo last point** corrects a single mistaken landmark.

The pocket templates currently use the material sectors created by Square-base collapse. They do not automatically recognize pockets in arbitrary imported CPs. A successful geometry check is not a guarantee of collision-free motion for a newly authored model.

The key distinction is between a **drawing** and a **folding action**: an SVG CP names lines, but it does not say which layers move first or which corner ends where. You supply that sequence as lesson steps. Square-base collapse can be reused when a flat square has the corresponding diagonal and middle folds. Petal fold can be reused on a symmetric pocket of that base. Inside reverse fold can be reused on a narrow two-wall point whose new hinge is chosen. Other bases, sinks, and complex animal models need their own action recipes or manual steps.

## Implementation

`simulator/src/motion-templates.js` contains parameterized rigid motions using landmark points and material-layer selectors. Petal folds solve the side shoulders from fixed-distance constraints. Inside reverse folds first open the two packet walls, then close them around the reflected tip. Every pose uses the same original paper coordinates.

`simulator/src/action-fold.js` clips faces at action hinges and composes the motions. `simulator/src/crane-lesson.js` supplies the authored 33-action teaching sequence. `simulator/src/motion-quality.js` provides material checks shared with the editor.

This is a reusable action library, not an automatic folding-order solver for any CP. General sinks, arbitrary multi-vertex collapses, paper thickness, contact friction, and body inflation are outside this implementation. There is no claim that the sampled collision checks prove collision freedom at every instant.

The built-in lesson uses no schematic mesh replacements. Legacy version-2 lessons containing guided illustration actions remain readable for compatibility.

## Validation

- 68 automated tests passed on 2026-09-26.
- All 33 steps: face lengths, shared material positions, total paper area, and step continuity checked.
- New motion stages: 19 intermediate samples per step checked for strict triangle-interior crossings; flat contact is allowed.
- Final geometry: separate spread wings, neck/tail above wing roots, and an actually folded beak.
- Application-scale coordinates and JSON save/load reproduce the same final paper geometry.
- Browser QA: `tools/qa/complete-crane-check.html` contains visual step controls and explicit save/load and authoring checks.

Run `node --test simulator/test/*.test.js` from the project folder.

## Background

The tutorial follows the traditional crane sequence described by [Origami.me](https://origami.me/crane/). The geometry recipes here are original implementations. Prior rigid-origami research and simulator credits are documented in `square-base-solver-validation.md` and the root `THIRD_PARTY_NOTICES.md`.

Before-change backup: `archive/snapshots/before-complete-crane-20260926.zip`.
