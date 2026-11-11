# Pullan Projects

**Live site: <https://ethanpullan.github.io/Pullan/>**

Small projects that run in your browser. Nothing to install, and nothing you
do is sent anywhere. Each project lives in its own folder under `tools/`, and
the landing page (`index.html`) links to all of them.

| Project | Open it | Source | What it is |
|---|---|---|---|
| Glowfathom | [Play](https://ethanpullan.github.io/Pullan/tools/glowfathom/) | [`tools/glowfathom/`](tools/glowfathom/) | A deep-sea arena shooter in the browser ([README](tools/glowfathom/README.md)) |
| EV Switch Calculator | [Open](https://ethanpullan.github.io/Pullan/tools/ev-cost/) | [`tools/ev-cost/`](tools/ev-cost/) | Should you keep your car, or buy a new gas car, a new EV or a used EV? Compares the full cost of each in Alberta (single file) |

### EV Switch Calculator

Compares four choices over the years you'd own the car: keep your current car,
buy a new gas car, buy a new EV, or buy a used EV. Every assumption is a slider
that starts on a researched Alberta figure, with sources listed on the page.

- **Costs counted:** purchase price with GST, the federal EV rebate (new EVs only),
  financing, fuel versus charging, insurance, maintenance, the $200 Alberta EV tax,
  resale value, and the investment growth you give up on money spent on the car.
- **Alberta defaults:** 5-year average gas price from Statistics Canada (Calgary and
  Edmonton), an 8.29¢/kWh fixed electricity contract plus delivery fees, $0.67/kWh
  average public fast charging, and average gas and EV insurance quotes.
- **Your situation:** your current car's value, fuel use, insurance and repairs; a
  used EV's age, battery warranty and dealer-or-private sale (GST or not); how much
  you charge away from home; and insurance that falls as a car loses value.
- **Results:** the cheapest option, a total and cost per km for each, the gas price
  at which each EV breaks even, a year-by-year chart and a full cost breakdown.
- **Works on phones,** with live totals pinned to the bottom of the screen. Your
  settings are saved in the page link, so you can share a comparison.

## Run it locally

Serve the repository root with any static web server, for example:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Publish it

The site is published with GitHub Pages at <https://ethanpullan.github.io/Pullan/>
(Settings → Pages → deploy from the `main` branch, root folder). Anything pushed
to `main` goes live within a minute or two. The `.nojekyll` file stops GitHub's Jekyll
step from interfering with the files.

## Adding a project

1. Create `tools/<project-name>/` with its own `index.html`.
2. Add a card for it to the grid in the root `index.html`, copying the
   existing card. The project count in the top bar updates itself.
3. Add a row to the table above, with its live link.

The landing page follows the same look as the Teaching Tools suite: forest
green, amber accents, white cards on a light grey background.
