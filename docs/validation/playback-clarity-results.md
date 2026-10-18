# Paper clarity and tutorial playback — 11 October 2026

Local implementation only. Before-edit backup: `archive/snapshots/before-layer-playback-20261010.zip`.

## Delivered

- Connected display gaps, front/back shading, a thin perimeter rim, and moving-paper tint improve readability of folded packets. Temporary **Separate layers** pauses playback; Play restores the connected view.
- Mountain/valley history is computed from signed dihedral angles relative to the original material front. Opening preserves the preparation crease; reverse refolds replace only overlapping UV intervals. Reference CP lines are an independent gray overlay.
- A fixed green **Save tutorial** button includes a validated pending preview and reports that the download started. Validation errors preserve the draft and block the download.
- **Speed** offers 0.25×, 0.5×, 0.75×, 1×, 1.5×, and 2×. Live changes retain animation progress and leave authored step duration untouched.
- **Auto next** advances through saved steps and stops at the final step or an author-defined checkpoint. Checkpoints survive tutorial export.
- Plain-fold previews expose angle, direction, and layer adjustment without returning to line selection. Step wording is collapsed until needed. A short canvas cue identifies motion, completion, and checkpoints.
- The 3D canvas reserves the actual playback-bar height, including wrapped controls, instead of drawing behind it.

## Verification

- Full Node suite: **89 passed, 0 failed**. New regressions cover opening both crease types from either side, orientation invariance, crossing-flat refolds, partial interval replacement, and welded display T junctions without physical-geometry mutation.
- `tools/qa/playback-clarity-check.html`: **ALL PASS**. Real browser checks cover speed ratios, changing speed mid-motion, pause stability, authored duration preservation, layer inspection, Auto next, checkpoint/final stopping, angle and layer edits in preview, exported current preview/checkpoint, header Save feedback, and leaving preview cleanly.
- Responsive checks at **390 × 740**, **614 × 510**, and **870 × 668** verify a positive visible canvas area above the player and in-bounds player/Save controls. The host browser showed the compact layout visually; the three exact sizes were additionally tested in the QA page's real resized iframe.
- `tools/qa/tutorial-usability-check.html`: **ALL PASS** after the changes. Library and Bird ordering, two-layer wing selection, destination display, preview/save, saved petal/reverse editing, paper turns, camera recovery, and real reload recovery remain functional.
- The generated Fold Lab page was rebuilt. Screenshot: [compact layer inspection](playback-layers.jpg).

## Limits

Layer gaps and edge rims are rendering aids, not physical thickness or a collision solver. Normal display welds material seams; deliberately exploded inspection separates layers visually. Step validation still checks the unmodified material geometry. Crease transitions are sampled along each supported motion; this does not infer a folding sequence or solve arbitrary new compound folds.

## Quick manual check

1. Open Fold Lab → Tutorials → Dart Airplane → step 8.
2. Compare 0.25× and 2×, then pause and choose Separate layers.
3. Choose Play to restore the connected animation. Enable Auto next to continue.
4. Make an editable copy, edit a fold, and change its angle under Adjust & replay.
5. Enable Pause here for the learner, then use the green Save tutorial button.
6. Reopen the downloaded tutorial and verify the edited motion and checkpoint.
