# Direct editing and teaching tools — 2026-10-18

## Scope

- Moving-paper review with faded stationary surfaces and connected-group information.
- Fold-line endpoint and flap-angle handles; precise and keyboard adjustments; original comparison; reset; rollback after invalid edits.
- Actionable recovery for layer connectivity, work-surface, axis and incompatible-pocket failures.
- Bounded crossing samples, with a jump to the first detected new crossing.
- Material-attached labels and arrows with visibility ranges.
- Authored checkpoints, exact playback stops, resume and optional anchored detail views.
- Portable teaching metadata, mirrored/scaled recipe anchors, and an example lesson.

## Verification

- Full simulator suite: **116 passed, 0 failed**.
- Focused direct-teaching suite after the recipe-anchor correction: **11 passed, 0 failed**.
- Generated V2 HTML parses and retains exactly one Storyboard entry module.
- `tools/qa/direct-teaching-check.html`: passed real pointer axis/tip changes, keyboard angle changes, original/reset, invalid-edit rollback, label/arrow placement and tracking, time ranges, checkpoints, zoom restore, resume, save/reopen, subsequent edits and 1440/1024/800/390 layouts.
- `tools/qa/storyboard-compound-check.html`: passed squash/sink/reverse authoring, stage checkpoints, portable files, draft recovery and compact layouts.
- `tools/qa/storyboard-camera-check.html`: passed six crane steps at five animation positions each and stable pan.
- `tools/qa/storyboard-v2-check.html`: passed library/navigation, neutral inspector styling and overflow, fold/unfold/add-next, save/reopen, draft recovery and responsive layouts.

Browser checks were run locally, one at a time, and restored the previous local draft data. Visual inspection found a narrow checkpoint button wrapping into fragments; the teaching toolbar now uses two columns with a full-width checkpoint button.

## Boundaries

Direct handles apply to ordinary rigid folds, including a selected planar work surface. Compound folds retain structural controls. Collision checking samples eight positions and is capped by triangle/pair counts; it is advisory, not continuous collision detection, paper thickness simulation, or proof of physical feasibility. Existing connectivity validation continues to reject stretching and separated material.

Backup tag before changes: `before-direct-teaching-20261018`. This pass is prepared and tested locally; it does not deploy to GitHub Pages.
