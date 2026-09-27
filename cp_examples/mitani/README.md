# Local Jun Mitani experiments

Artwork: **Jun Mitani**. These experiments use PDFs from his [CP download page](https://mitani.cs.tsukuba.ac.jp/en/cp_download.html). Consult that page's terms and the root third-party notices before distributing any artwork.

Local inputs (not included in Git):

- `sphere-eight-flaps.pdf`: [original](https://mitani.cs.tsukuba.ac.jp/en/data/origami_sphere.pdf)
- `distorted-square-pole.pdf`: [original](https://mitani.cs.tsukuba.ac.jp/dl/2011/distorted_square_pole_mitani2011.pdf)

With Python and `pdfplumber` installed, run `python tools/convert-mitani.py` from the project root. The converter produces two SVGs and `manifest.json` here. It extracts vector strokes and crops glue tabs and labels; it does not infer geometry from photographs. This is a converter for these two specific layouts, not a general PDF importer.

Fold Lab reveals the optional **Jun Mitani · seam experiments** menu when the local manifest exists. Roll the sheet to 100% to join opposite edges, then try collapse. The resulting shapes are experimental, with no collision detection or proof of convergence to the artist's intended form.
