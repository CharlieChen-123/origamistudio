# Pan, accessible paper groups and visual tutorials — 11 October 2026

Local changes; backup: `archive/snapshots/before-pan-packets-cards-20261011.zip`.

## Changes

- Tutorial **Pan** toggle supports ordinary mouse/touch dragging to translate the camera target. Shift-drag, right-drag and middle-drag pan without toggling. Orbit and zoom retain their previous behavior; Fit 3D view recenters. Recommended cameras retain their panned target.
- Layer selection operates on material-connected groups. Closed shared edges away from the intended hinge are never selectable as independent faces. A directional overlap graph additionally includes covering groups using the recorded flat-stack order. Interleaved groups can require one another; dependencies are closed transitively. Removing required paper removes dependent selections too.
- Both the exploded selector and compact cards use the same rule, with required groups named. New/edited ordinary folds persist `enforceLayerAccess`; compilation rechecks their required groups. Older actions preserve their prior motion until edited.
- Dart's upper wing brings its tucked nose group without moving the opposite wing. Choosing buried opposite-side paper toward the covers includes the intervening groups.
- Each of the three tutorial cards includes a CP and folded-model SVG preview. All six are generated from this project's lesson geometry, with no external images. Regenerate using `node tools/generate-lesson-previews.mjs`.

## Verified

- Full Node suite: **93 passed, 0 failed**.
- `tools/qa/pan-layer-cards-check.html`: **ALL PASS**. Six images load; cards open lessons; Shift/right/middle pan and Pan mode preserve yaw/pitch/zoom; ordinary dragging returns to orbit; required groups auto-select; protected preview/save and panned camera capture/restore succeed. Input variants are exercised with synthetic pointer events in the local harness, with pointer capture stubbed only during that test.
- Real browser pointer drag in Pan mode visibly moves the paper in the main app canvas.
- `tools/qa/examples-authoring-check.html`: **PASS** — all 9 airplane and 18 box steps rebuilt through authoring controls with matching geometry.
- `tools/qa/tutorial-usability-check.html`: **ALL PASS** — library, Bird ordering, two-layer selection, compound editing, saved views and actual page-reload recovery.
- `tools/qa/playback-clarity-check.html`: **ALL PASS** — speed, checkpoints, layer inspection, pending-preview export, and 390/614/870 px layouts with the new Pan button.
- JavaScript syntax and Git whitespace checks passed; generated Fold Lab page rebuilt.

## Limits

The access graph is conservative for overlapping flat packets and relies on recorded stack order. It does not establish physical accessibility for every arbitrary non-planar pocket, thickness, contact or collision. Compound motions still use pocket-wall selection plus material continuity checks. Legacy files keep their existing actions until edited rather than silently acquiring a different movement.
