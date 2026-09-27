# CP Designer · 3D Origami Simulation

Create a crease pattern or import an SVG / FOLD file, then use Amanda Ghassaei’s [OrigamiSimulator](https://github.com/amandaghassaei/OrigamiSimulator) GPU solver to explore the fold in 3D. This is a static HTML project; it has no backend and does not upload your patterns.

## Quick start

On Windows, double-click `start-origami.cmd`. It starts a local server and opens the **CP Designer with Constraints** page by default. Node.js is required, but no package installation is needed.

You can also start it manually:

```sh
node tools/serve.mjs 8123
```

Then open [CP Designer with Constraints](http://127.0.0.1:8123/cp-designer_with%20constraints.html), [CP Designer](http://127.0.0.1:8123/cp-designer.html), or [Fold Lab](http://127.0.0.1:8123/origami-3d.html). Use a modern Chrome or Edge browser with WebGL support.

## Publish the website

This project can be hosted as a static site on GitHub Pages. The root `index.html` opens CP Designer with Constraints, and its **Fold Lab** tab opens the simulator. The root `.nojekyll` file keeps the static files unprocessed by Jekyll.

Before publishing, run `npm test` inside `simulator/`, review the files about to be committed, confirm the copyright name in `LICENSE`, and check that every redistributed example has appropriate credit or permission. The Jun Mitani research inputs and GPL reference folder are excluded by `.gitignore`; local portfolio concept images are also excluded. This is a public beta: the simultaneous solver does not guarantee convergence or collision-free results for arbitrary CPs, and tutorial steps are authored rather than automatically inferred.

After committing and pushing to your own GitHub repository, open **Settings → Pages → Build and deployment**, select **Deploy from a branch**, then choose `main` and `/ (root)`. The default project URL is `https://<your-username>.github.io/<repository-name>/`. See [GitHub's Pages source instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Use the simulator

1. Open `cp-designer.html` and draw mountain and valley folds.
2. Choose **3D Fold Simulation** in the upper-right corner. Your current paper and creases are sent directly to Fold Lab.
3. Drag the Fold control or select Play Fold. The initial state is flat at `0%`.
4. Choose Back to Designer to keep editing the same pattern.

When an unchanged library preset is sent from CP Designer, Fold Lab receives its original SVG so partial fold angles, boundaries, and source geometry stay identical to opening that preset in Fold Lab itself. Once you edit the pattern, CP Designer sends its current drawing instead; per-line partial fold angles are retained.

## Create a step-by-step tutorial

Fold Lab now includes a built-in tutorial editor. It is intended for authors who want to demonstrate a fold, and for anyone who wants to open a tutorial shared by another author.

1. Import an SVG or FOLD pattern and choose **Make a tutorial**. Start by choosing a move from the simple menu.
2. For **Fold along a line**, click a colored CP crease or two paper points for a temporary guide line, then click the paper on the side to move. For **Bring points together**, press and hold a paper corner (A), drag it onto the destination (B), and release; the editor calculates the halfway fold line. The always-visible **More control** section sets the layer, direction, and angle. Towards you marks a blue valley; away from you marks a red mountain when the original front faces you.
3. Choose **Preview motion** to see the animation. Enter a step title and a short instruction for the learner, then choose **Add step**. **Change move** lets you start over before saving.
4. After a fold, choose the visible **Unfold and add step** shortcut to add and play its opening animation in one click. Use the bottom timeline to visit saved steps; **Edit title & instructions** revises their teaching text. **More moves** contains square-base collapse, petal fold, inside reverse fold, and paper turning.
5. **Save tutorial** at the top exports a self-contained version 2 JSON file. **Open a lesson or remove a step → Open tutorial** restores it.

Try **Traditional Paper Crane** for the complete 33-step lesson: precreases, square-base collapse, both petal folds, narrowing, neck and tail reverse folds, a simple folded beak, and opening the wings. Every stage animates the same connected paper. Red mountain and blue valley marks build up as you fold; **Show full CP** is optional. Use **Fit 3D view** to inspect the result. See [complete crane and reusable templates](docs/complete-crane-templates.md) for authoring and limitations.

The editor rotates rigid paper regions around a full fold axis, even when the final CP only marks a short segment. All layers on one side or one material-connected flap can move. New axes currently require the preceding state to be flat. The built-in inside-reverse template supports the square-base family; arbitrary reverse folds, full collision handling, reliable layer ordering, and automatic sequence generation are not implemented. The archived version 1 editor is no longer linked from Fold Lab.

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

The shared example library contains twenty verified patterns in both tools, ordered from introductory bases to dense expert models. Source-paper presets preserve their actual boundary ratio in Designer instead of being forced into a square or fixed 2:1 sheet. The library includes attributed animal models, a rigid train, a Polygami object, and a cleaned Paper Airplane CP. Credits are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

For details of the editable tutorial format and its current limits, read [docs/folding-steps.md](docs/folding-steps.md). A full documentation index is in [docs/README.md](docs/README.md).

## Key files

| File or directory | Purpose |
|---|---|
| `cp-designer.html` | Main CP Designer |
| `cp-designer_with constraints.html` | Designer with constraints |
| `origami-3d.html` | Generated Fold Lab page |
| `assets/` | Import compatibility, UI orchestration, and test fixtures |
| `tools/origami3d.template.html` | Fold Lab template; rebuild after changes |
| `vendor/origamisimulator/` | Upstream solver, dependencies, assets, and license |
| `simulator/` | Sequential rigid-fold engines, earlier research prototypes, and tests |
| `archive/legacy-pages/` | Archived experimental pages; not current entry points |

## Development and testing

Rebuild Fold Lab after changing its template:

```sh
node tools/build-origami3d.mjs
node --test simulator/test/*.test.js
```

Open `/tools/qa/action-check.html` on the local server for the current action editor integration checks. See [validation and known limits](docs/action-editor-validation.md).

Open `/tools/qa/tutorial-composer-check.html` to verify the guided authoring flow, or `/tools/qa/complete-crane-check.html` to verify the crane lesson, template authoring, and tutorial save/load. The version before the tutorial composer redesign is preserved in [archive/snapshots/before-tutorial-editor-redesign-20260926-1518.zip](archive/snapshots/before-tutorial-editor-redesign-20260926-1518.zip).

`tools/test-cp-simulator.mjs` is an older browser integration test. It expects an isolated Chrome instance with remote debugging on port `9333`; see the script header for the setup. It checks SVG import, 3D displacement, play / pause, FOLD import, error recovery, every bundled example, the cleaned paper airplane, both designer handoffs, and mobile layout.

## License and credits

Project code is under the root [MIT License](LICENSE). OrigamiSimulator retains Amanda Ghassaei’s [upstream MIT License](vendor/origamisimulator/LICENSE). See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for dependency and model credits.
