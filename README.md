# Pullan Projects

A home for various projects. Each lives in its own folder under `tools/`,
and the landing page (`index.html`) links to all of them.

| Project | Folder | What it is |
|---|---|---|
| Glowfathom | [`tools/glowfathom/`](tools/glowfathom/) | A deep-sea arena shooter in the browser ([README](tools/glowfathom/README.md)) |
| EV Switch Calculator | [`tools/ev-cost/`](tools/ev-cost/) | Keep your car vs new gas vs new or used EV: total cost of ownership in Alberta, including lost investment growth, with sliders and sourced defaults (single file) |

## Run it locally

Serve the repository root with any static web server, for example:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Publish it

The repository works as-is on GitHub Pages (Settings → Pages → deploy from
the `main` branch, root folder). The `.nojekyll` file stops GitHub's Jekyll
step from interfering with the files.

## Adding a project

1. Create `tools/<project-name>/` with its own `index.html`.
2. Add a card for it to the grid in the root `index.html`, copying the
   existing card. The project count in the top bar updates itself.
3. Add a row to the table above.

The landing page follows the same look as the Teaching Tools suite: forest
green, amber accents, white cards on a light grey background.
