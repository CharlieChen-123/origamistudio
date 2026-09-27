# Third-Party Code and Example Credits

## OrigamiSimulator

- Author: **Amanda Ghassaei**. The upstream project also credits Sasaki Kosuke, Erik Demaine, and other contributors.
- Source: https://github.com/amandaghassaei/OrigamiSimulator
- Local version: `7855983a613c879c171b2b1557f8cd102d2640cf`; see `vendor/origamisimulator/LOCAL_NOTES.md`.
- Copyright: Copyright (c) 2018 Amanda Ghassaei.
- License: [vendor/origamisimulator/LICENSE](vendor/origamisimulator/LICENSE), MIT, retained in full.
- Paper: Amanda Ghassaei, Erik Demaine, Neil Gershenfeld, [*Fast, Interactive Origami Simulation using GPU Computation*](https://erikdemaine.org/papers/OrigamiSimulator_Origami7/).

`origami-3d.html` uses the upstream GPU dynamic solver and SVG planarization code. Its shader blocks are generated from the upstream page. The import compatibility layer, designer handoff, and Fold Lab interface live in `assets/`.

Local changes remove the upstream Google Analytics script, retain a no-op analytics function required by upstream code, and add optional load callbacks plus temporary SVG cleanup in `js/pattern.js`. The geometry and GPU solver algorithms are not rewritten.

## Example patterns

SVG examples originate in the upstream `assets/Origami/`, `assets/Bases/`, and `assets/Tessellations/` directories. Keep original files and source attribution; do not claim model designs as project originals.

| Example | Upstream attribution |
|---|---|
| Randlett Flapping Bird | Samuel Randlett |
| Miura-Ori | Koryo Miura |
| Paper Airplane | Conventional design; CP entered by Scott Pakin |
| Hypar | Upstream cites [*(Non)existence of Pleated Folds: How Paper Folds Between Creases*](https://erikdemaine.org/papers/Hypar_GC/paper.pdf) |
| Traditional Crane, Flat Crane, bases, Single Square Twist | Names retained from OrigamiSimulator; upstream does not list a separate designer for each item |
| Lang Orchid, Lang KNL Dragon, Lang Cardinal | Robert Lang; OrigamiSimulator credits the source patterns to his Treemaker work |
| Flapping Bird | Traditional model; example retained from OrigamiSimulator |
| Mooser's Rigid Train | Original design by Emmanuel Mooser; crease pattern corrected and modified for rigid origami by William Gardner |
| Polygami Cross | Generated with Polygami, an application by Shahul Alam, Lauren Huang, and Mahi Shafiullah |

The simulator’s Paper Airplane uses `cp_examples/mit/models/paper-airplane-clean.svg`, a cleaned derivative of the upstream asset that removes duplicate segments and endpoints outside the paper. It retains the same source attribution above.

## Jun Mitani: local seam experiments

The optional examples **Origami Sphere (8 flaps)** and **Distorted Square Pole** are designs by **Jun Mitani**. Original PDFs: [Sphere](https://mitani.cs.tsukuba.ac.jp/en/data/origami_sphere.pdf), [Pole](https://mitani.cs.tsukuba.ac.jp/dl/2011/distorted_square_pole_mitani2011.pdf). The local SVGs extract vector strokes, crop page labels and glue tabs, and approximate curved creases with straight segments. These modifications are by this project; the designs remain attributed to Jun Mitani.

Read the artist's [download-page terms](https://mitani.cs.tsukuba.ac.jp/en/cp_download.html). They allow downloads and use, including workshops, and request advance contact for specified uses including product development and exhibitions. The page does not grant an MIT license to the artwork. Local PDFs, converted SVGs, and their manifest are excluded from Git by default. Do not bundle them under the project's MIT license; resolve distribution and intended-use permission before publishing the artwork. Attribution alone is not a substitute for permission.

The experimental seam solver in `simulator/src/seam-engine.js` is project code. It uses length, dihedral-angle and seam constraints; it is not Jun Mitani's original design algorithm and does not reconstruct or certify his finished models. Background: [Mitani, 2009, rotational-sweep origami design](https://mitani.cs.tsukuba.ac.jp/dl/CAD_2009_3d_origami_based_on_rotational_sweep_mitani.pdf).

## Bundled dependencies

`vendor/origamisimulator/dependencies/` includes three.js, TrackballControls, SVGLoader, jQuery, Underscore, numeric.js, Earcut, FOLD, and path-data-polyfill. Their original files, copyright notices, and license links are retained. See the upstream README for complete dependency information.

## Other local reference material

`src1.3.5/` is an archived Origami Editor 3D reference copy. Fold Lab does not load it. `archive/legacy-pages/` contains earlier experiments; these do not establish authorship of the upstream GPU solver.
