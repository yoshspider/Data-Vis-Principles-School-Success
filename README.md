# School Success Explorer

An offline dashboard and four-part data story built from the UCI Student Performance dataset.

## Click and run

Open `web/index.html` directly in any modern browser; no server, installation, or internet connection is required. The narrative and the interactive explorer now share one page. The browser-ready `web/data.js` is generated from the same 1,044 records as `web/data.json`.

For local development with clean URLs, run `python app.py --port 8765` and open `http://127.0.0.1:8765`.

## Run on Windows

Double-click `dist/SchoolSuccessExplorer.exe`. A console window starts a server on a free local port and opens the default browser. Keep the console open while exploring; close it to stop. No Python installation or internet connection is needed for the executable. The unsigned executable may prompt Windows security checks.

For source development (Python 3.10+):

```powershell
python prepare_data.py
python app.py
```

Optional launcher flags: `--no-browser`, `--port 8765`. The server binds only to `127.0.0.1`. All chart code, styles, and records are bundled locally. No analytics or external script requests.

## Build the executable

```powershell
python -m pip install -r requirements-build.txt
./build.ps1
```

Build on Windows for Windows. Output: `dist/SchoolSuccessExplorer.exe`. The executable is ignored by Git; distribute it separately or as a release asset.

GitHub Actions also builds the executable on every push to `main`. Open the repository's **Actions** tab, select a successful **Build Windows executable** run, and download **SchoolSuccessExplorer-Windows** under Artifacts.

## Visualizations

1. Connected staircase chart: mean final grade by recorded previous failures, with an illustrative figure leaning near a step edge. Step heights always follow the actual group means.
2. Grouped bars: school or family support by context factor count.
3. Two lines: mean final grade by context and behavior factor counts.
4. Illustrative support discussion tree (shared with the data story via `web/tree.js`): four levels of yes/no questions lead left to right to eight suggested starting points. Every box shows its record count, mean final grade and a green/amber bar for the share reaching G3 ≥10; branch width is proportional to the records on that path. By default the tree is explored step by step: only the first question shows, and choosing Yes or No beside it draws that branch and reveals the next box. Both answers of a question can be open at once, so several paths can be compared; clicking an open answer again closes that branch, "Back" undoes the last step and "Start over" resets. A "Show full tree" checkbox reveals every path at once, and there hovering or focusing any box or branch highlights the paths through it. The walk is kept when filters change.
5. Heatmap: the distribution of behavior-factor counts within each context-factor count.
6. Risk-factor chord diagram (in the data story): nine factors (the four context and four behavior factors, plus past failure ≥1) are equal-length, single-colour arcs around a circle, grouped as context (left), behavior (right) and school history (bottom). Arc thickness shows each factor's connection score (the sum of lift − 1 over its visible ties). Ribbons join factor pairs whose lift (observed co-occurrence ÷ the count expected under independence) meets a slider threshold (default 1.3×, minimum 10 shared records); ribbon colour (light to dark plum, 1× to 3×+) and width (lift − 1) both encode lift, and ribbons are bundled by group. The chart shows only factor names until you click: clicking an arc or ribbon highlights it and its ribbons, fades the rest, opens a small details box at the chart edge on that side (below the chart on narrow screens) with its record count, pass rate (green/amber bar) and strongest ties or lift calculation, and selects those records in the scatterplot matrix. The box closes with its × or Deselect button, a click on empty chart space, "Clear selection" or Esc (from anywhere on the page). The chart uses the full card width.
7. A 3 × 3 scatterplot matrix of three behaviors a school can act on: weekly study time, workday alcohol use and absences (axis capped at a 30+ band; under 1% of records exceed 30 days). Final grade is shown by colour (green ≥10, amber below), not as an axis. Each off-diagonal cell compares a variable pair; diagonal histograms show distributions. Dragging a box or clicking a bar selects records across every cell and the linked chord diagram. Shift-clicking a second bar in the same histogram (a diagonal histogram or the final-grade column) selects every bar in between; Ctrl/⌘-click or "Add to selection" adds single bars. An "Only failed grades" checkbox limits the matrix, and selections made from it, to records with G3 below 10. Beside it, a tall final-grade histogram spans the full height of the matrix (grade 0 level with the bottom row of cells, 20 with the top row; axis on the right, bars growing left). Like the diagonal histograms it counts every record (grey once something is selected) with the selected records on top in green/amber, and clicking a grade row (Enter on the keyboard, Shift to add) selects those records across the matrix and chord diagram. It leaves the matrix more width.

The data story adds a polished family-size box plot, reuses the internet progression, staircase, decision tree and support views, and arranges them into a hook-to-solution narrative.

Filters select subject and school; export downloads the current records as CSV. Chart marks show means and sample sizes on hover or keyboard focus. Grade axes use 0–20 throughout. Missing groups are omitted rather than rendered as zero; line paths break at missing groups.

## Methodology

Source files contain 395 mathematics and 649 Portuguese records. Both datasets are concatenated as **1,044 course records**, not unique students. Students can appear in both subjects; combined results weight each course record equally and should not be treated as independent student observations. Filter subjects separately when appropriate. Zero grades remain included.

Context count (0–4): no internet, commute >30 minutes (`traveltime >= 3`), maternal education below secondary (`Medu < 3`), paternal education below secondary (`Fedu < 3`). Behavior count (0–4): study <2 hours/week (`studytime == 1`), workday alcohol code >=3, weekend alcohol code >=3, no higher-education aspiration. These exploratory thresholds and labels are project choices. They do not establish causation or personal responsibility. Counts are not validated scales.

The decision tree is an explicit discussion aid. G1 <10 splits first. Below 10, G1 <8 (well behind) then asks about any past failure (intensive plan with a family meeting, or intensive tutoring); G1 of 8–9 asks about more than 10 absences (attendance check, or targeted tutoring). At G1 ≥10, past failure or no higher-education plans leads to mentoring; otherwise no internet or a commute over 30 minutes leads to access support; otherwise workday alcohol ≥3 or more than 10 absences leads to a wellbeing check-in, and everyone else to a routine check-in with support on request. Questions were chosen because they separate groups with clearly different final-grade outcomes in this dataset. It is not a fitted predictive model or allocation policy. Differences between supported and unsupported groups cannot estimate the benefit of support because support is not randomly assigned.

Scatterplots use exact numeric coordinates, without jitter or interpolation. These measurements are recorded as integers, not truly continuous observations. Identical coordinate pairs are aggregated into bubbles whose area is proportional to course-record count. All matrix cells share fixed variable ranges and the same bubble scale; hover or focus reveals exact values and counts. Passing means G3 >=10 for this dashboard. Chord-diagram lift for factors A and B is n(A and B) × N ÷ (n(A) × n(B)); 1× means they co-occur as often as chance. The chord diagram's past-failure arc uses `failures >= 1`. Lift describes association, not causation. Consult `data/student.txt` for original variable definitions (including the dataset's failure-code wording).

## Data attribution and reproducibility

Cortez, P. (2008). *Student Performance* [Dataset]. UCI Machine Learning Repository. https://doi.org/10.24432/C5TG7T.

Dataset: https://archive.ics.uci.edu/dataset/320/student+performance

Data licensed CC BY 4.0: https://creativecommons.org/licenses/by/4.0/

Original `student-mat.csv`, `student-por.csv`, documentation and merge example are preserved in `data/`. `prepare_data.py` converts those originals to the bundled `web/data.json` and click-and-run `web/data.js`. No synthetic observations are used.
