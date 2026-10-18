# Origami Studio — CP Designer & Fold Lab

Create a crease pattern or import an SVG / FOLD file, then use Amanda Ghassaei’s [OrigamiSimulator](https://github.com/amandaghassaei/OrigamiSimulator) GPU solver to explore the fold in 3D. This is a static HTML project; it has no backend and does not upload your patterns.

## Storyboard V2

Double-click `start-origami.cmd` to open the new workspace. [Design](studio-v2.html), [Fold Lab](fold-lab-v2.html), and [Tutorials](fold-lab-v2.html?view=tutorials) share a quiet top navigation and a large paper canvas. Tutorial steps appear as a filmstrip with thumbnails generated from each saved paper state. Open **Step settings** when you want to edit a move, its wording, paper layers, timing or recommended view.

Choose **Make tutorial** to start with the current pattern, a new sheet or your saved draft. Switching to Fold Lab and back preserves an unfinished move. **Save tutorial** keeps the existing portable JSON format. Read the [V2 guide](docs/storyboard-v2-guide.md) for the complete workflow.

## Use it online

**[Open Origami Studio in your browser](https://charliechen-123.github.io/origamistudio/)**. No download, installation, or account is needed.

The link opens the new **Storyboard Designer**, including drawing constraints. Draw a crease pattern, import an SVG / FOLD / CP file, or choose a preset. Select **Fold Lab** at the top to simulate the same pattern in 3D; there you can also open or make a folding tutorial. Switch back with **Design**.

## Run locally (optional)

If you want to work offline or develop the code, double-click `start-origami.cmd` on Windows. It starts a local server and opens Storyboard V2's Designer with drawing constraints. Node.js is required, but no package installation is needed.

You can also start the local server manually:

```sh
node tools/serve.mjs 8123
```

Then open [Design V2](http://127.0.0.1:8123/studio-v2.html), [Fold Lab V2](http://127.0.0.1:8123/fold-lab-v2.html), or [Tutorials](http://127.0.0.1:8123/fold-lab-v2.html?view=tutorials). Old application URLs redirect to the new workspace. Use a modern Chrome or Edge browser with WebGL support.

## Hosting a fork

The official site above is hosted on GitHub Pages. If you fork this project, you can host your own copy the same way. The local root `index.html` opens Storyboard V2's Designer, and its **Fold Lab** tab opens the simulator. The root `.nojekyll` file keeps the static files unprocessed by Jekyll.

Before publishing, run `npm test` inside `simulator/`, review the files about to be committed, confirm the copyright name in `LICENSE`, and check that every redistributed example has appropriate credit or permission. The Jun Mitani research inputs and GPL reference folder are excluded by `.gitignore`; local portfolio concept images are also excluded. This is a public beta: the simultaneous solver does not guarantee convergence or collision-free results for arbitrary CPs, and tutorial steps are authored rather than automatically inferred.

After committing and pushing to your own GitHub repository, open **Settings → Pages → Build and deployment**, select **Deploy from a branch**, then choose `main` and `/ (root)`. The default project URL is `https://<your-username>.github.io/<repository-name>/`. See [GitHub's Pages source instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Use the simulator

1. [Open the live site](https://charliechen-123.github.io/origamistudio/) and draw, import, or choose a crease pattern.
2. Select **Fold Lab** in the top navigation. Your current paper and creases are sent to the simulator.
3. Drag the Fold control or select **Play Fold**. The initial state is flat at `0%`.
4. Select **Design** to return to the pattern editor.

When an unchanged library preset is sent from CP Designer, Fold Lab receives its original SVG so partial fold angles, boundaries, and source geometry stay identical to opening that preset in Fold Lab itself. Once you edit the pattern, CP Designer sends its current drawing instead; per-line partial fold angles are retained.

## Create a step-by-step tutorial

Tutorial Studio includes point-to-point and edge-to-edge alignment, full guide folds, visual layer selection, and continued folding on a chosen planar surface. Start with **Make a tutorial**, choose a move, mark it on the large paper view, preview, then add the step. **Fold, then unfold** records a preparation crease in one operation.

Select a saved fold to edit its motion, repeat it, or mirror it. Changes validate the remaining sequence and mark later steps for review. Undo/Redo, a recoverable local draft, reusable step sequences, and saved camera views support longer lessons. **Save tutorial** exports a self-contained version 2 JSON file; **File & paper → Open tutorial** restores it.

Try **Traditional Paper Crane** (33 steps), **Dart Airplane** (9 steps), or **Blintz Box** (18 steps). The box is a gusseted blintz variation with visible internal corner folds, not the traditional Masu tuck-and-lock sequence. Select **Make an editable copy through this step** to continue from any example stage.

Under **Tutorials → Practice a fold**, try an inside reverse fold on triangular paper or **Squash & open sink** on a compatible symmetric pocket. Compound moves have three replayable teaching stages with editable timing, instructions and pauses. See the [compound tutorial guide](docs/compound-tutorial-guide.md) for supported starting shapes and a short authoring walkthrough.

Read the [Tutorial Studio guide](docs/tutorial-authoring-guide.md) for the complete workflow, supported pocket shapes, recovery, and local testing. Material-region selection removes the templates' dependence on square-base sector IDs, but petal and reverse motions still require compatible geometry. Thickness, general collision handling, physical layer ordering, and automatic CP-to-instruction solving remain outside the implementation.

### Jun Mitani reference patterns

The earlier Jun Mitani cylinder-collapse experiment is intentionally not included in Fold Lab. Its result had no collision or layer-order solution and could visibly stretch or self-intersect, so it was not a trustworthy reconstruction of the artist's models. Local PDF conversion notes remain in [the reference folder](cp_examples/mitani/README.md); the artwork is not redistributed as project content.

The constrained designer has the same 3D entry point. Square, rectangle, and hexagon paper boundaries are generated automatically. Lines outside the paper are clipped before simulation, and grey guide lines are excluded.

## Import a crease pattern

In either CP Designer, select **Import SVG / FOLD / CP**, or drop a file into the page. FOLD files are converted to the active paper size; ORIPA's compact CP text format uses `1` for contour, `2` for mountain, and `3` for valley lines. Before replacing the current drawing, the importer reports the segment and vertex counts and any local foldability issues.

The Designer toolbar also includes **Select**, **Pan**, **Clean up**, and **Check pattern**. In Select, click a crease to select it, Shift-click to add or remove one, Ctrl+A to select all, drag the empty canvas to move it, and Shift-drag a box to select an area. The selection uses the same accent color as the rest of the app and always shows its count. Choose **Exit Select** or press Escape to return to drawing. Pan moves the canvas without editing it and has the same clear exit controls. Type changes, duplicate, mirror, delete, and cleanup operations participate in the normal Undo/Redo history. Clean up clips to the paper, merges nearby vertices, splits intersections, and removes zero-length and duplicate segments. Valley dashes retain visible gaps when the view is zoomed out, even when a crease is split into many short segments. Check pattern reports local Maekawa and Kawasaki results plus duplicate and assignment-conflict warnings. Export offers SVG, FOLD, the compact CP format, and an A4 print layout. The A4 layout preserves red mountains and blue valleys while also using a heavy solid mountain line, a long dashed valley line, a light dotted guide line, and a printed legend. These checks are advisory: passing local tests does not prove global flat-foldability.

| SVG color | Meaning |
|---|---|
| Black `#000000` | Closed paper boundary |
| Red `#ff0000` | Mountain fold |
| Blue `#0000ff` | Valley fold |
| Green `#00ff00` | Cut |
| Yellow `#ffff00` | Flat triangulation edge |
| Magenta `#ff00ff` | Hinge with no assigned angle |

CP Designer’s red and blue colors, legacy dark red / blue, and grey guide lines are recognized. Grouped SVGs, CSS stroke inheritance, coordinate transforms, and straight-line paths are supported. Opacity can represent a partial target angle.

The default merge tolerance joins vertices closer than `0.2%` of paper width. Reduce it for dense patterns; increase it if intended intersections are not connected. FOLD files need `vertices_coords`, `edges_vertices`, and `edges_assignment`. Flat FOLD data may omit faces and target angles; 3D FOLD data needs face data.

PNG and JPG images are not imported directly. Trace them to a vector CP first. Curved paths, clipping masks, and reference objects must be converted to straight geometry before import.

## Scope

Fold Lab's simultaneous view cannot guarantee that every pattern converges or avoids self-intersection. `100%` applies the full requested target angles; it does not mean the solver has reached them. The tutorial mode adds author-defined whole-paper or flap actions, but does not automatically infer a human folding sequence.

The shared example library contains twenty upstream patterns plus the creator’s original Bird preset in both tools, ordered from introductory bases to dense expert models. Source-paper presets preserve their actual boundary ratio in Designer instead of being forced into a square or fixed 2:1 sheet. The library includes attributed animal models, a rigid train, a Polygami object, and a cleaned Paper Airplane CP. Credits are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

For details of the editable tutorial format and its current limits, read [docs/folding-steps.md](docs/folding-steps.md). A full documentation index is in [docs/README.md](docs/README.md).

## Key files

| File or directory | Purpose |
|---|---|
| `studio-v2.html` | Storyboard Designer with constraints |
| `fold-lab-v2.html` | Fold Lab and tutorial workspace |
| `tools/designer.template.html` | Maintained Designer source |
| Old HTML entry points | Redirects to Storyboard V2 |
| `assets/` | Import compatibility, UI orchestration, and test fixtures |
| `tools/origami3d.template.html` | Fold Lab template; rebuild after changes |
| `vendor/origamisimulator/` | Upstream solver, dependencies, assets, and license |
| `simulator/` | Sequential rigid-fold engines, earlier research prototypes, and tests |
| `archive/legacy-pages/` | Archived experimental pages; not current entry points |

## Development and testing

Rebuild Fold Lab after changing its template:

```sh
node tools/build-origami3d.mjs
node tools/build-storyboard.mjs
node tools/check-storyboard-build.mjs
npm --prefix simulator test
```

Open `/tools/qa/action-check.html` on the local server for the current action editor integration checks. See [validation and known limits](docs/action-editor-validation.md).

Open `/tools/qa/tutorial-composer-check.html` to verify the guided authoring flow, or `/tools/qa/complete-crane-check.html` to verify the crane lesson, template authoring, and tutorial save/load.

`tools/test-cp-simulator.mjs` is an older browser integration test. It expects an isolated Chrome instance with remote debugging on port `9333`; see the script header for the setup. It checks SVG import, 3D displacement, play / pause, FOLD import, error recovery, every bundled example, the cleaned paper airplane, both designer handoffs, and mobile layout.

## License and credits

Browse the [Credits & Sources page](https://charliechen-123.github.io/origamistudio/credits.html) for individual designer credits and original CP links for all twenty presets.

Project code is under the root [MIT License](LICENSE). OrigamiSimulator retains Amanda Ghassaei’s [upstream MIT License](vendor/origamisimulator/LICENSE). See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for dependency and model credits.
