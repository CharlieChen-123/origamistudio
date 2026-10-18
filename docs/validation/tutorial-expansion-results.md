# Local validation — 10 October 2026

## Passed

- 78 engine/unit tests: all passed. Includes intermediate material rigidity and continuity, existing crane geometry, non-flat work surfaces, sector-independent petal/reverse selection, reusable recipe scaling, downstream validation, and box crease assignment.
- `authoring-expansion-check.html`: edge alignment; atomic fold/unfold; undo/redo; saved-motion editing; reusable sequences; actual page reload with an unfinished selection; unsaved preview and instructions recovery; separately selected wings; continuation after a raised wing; camera save/reload; rejection of invalid downstream edits; viewer/author separation; Bird → tutorial.
- `examples-authoring-check.html`: recreated all 9 airplane steps and all 18 box steps using editor controls from a blank sheet. Compared original material-corner positions with the expected final geometry. No lesson actions were injected into the authoring state.
- `bird-preset-check.html`: both CP Designer variants loaded Bird, passed its exact preset SVG through the existing handoff, imported it into Fold Lab, and displayed paper in tutorial mode.
- Existing `tutorial-composer-check.html`: passed.
- Existing crane `Verify template editor`: copied through step 15, selected the five petal landmarks, previewed and saved step 16 successfully.
- Desktop and 390-pixel authoring layouts inspected. Box's coincident vertical walls no longer show the previous depth stripes.
- Original Bird SVG and the retained original have identical SHA-256 hashes: `87c2b1d098de099734e49a34585ccfd0564a59e0496bea2f97f2d24cc93e8045`.
- Simulator page rebuilt; source syntax and whitespace checks passed.

## Issues caught during verification

- An airplane wing guide crossing beyond the nose moved both wings together. Its endpoint now meets the nose, and individual wing material is selected explicitly.
- Beginning recovery while the startup pattern was still importing could replace the restored lesson. Authoring entry buttons now wait for import completion.
- Vertical coincident paper surfaces needed a normal-based display offset; world-up offsets did not separate box walls.
- Editor framing now follows the current paper footprint, keeping a folded packet large enough to select.

## Practical limits

These checks do not certify arbitrary collision-free folding, material thickness, physical layer ordering, or automatic step inference. Reusable recipes require a matching starting pose and paper proportions. Petal/reverse templates still require their supported pocket geometry. The box example is explicitly a gusseted Blintz Box, not a traditional Masu tuck-and-lock lesson. Bird is supplied as a CP preset; its folding lesson has not been inferred.

No publishing or push was performed. The pre-change tracked checkout is archived at `archive/snapshots/before-tutorial-expansion-20261009.zip`.
