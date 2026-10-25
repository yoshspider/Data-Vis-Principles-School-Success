# School Success Explorer

An offline dashboard and four-part data story built from the UCI Student Performance dataset.

## Click and run

Open `web/index.html` directly in any modern browser; no server, installation, or internet connection is required. Use **Data story** in the header to open the narrative view, or open `web/story.html` directly. The browser-ready `web/data.js` is generated from the same 1,044 records as `web/data.json`.

For local development with clean URLs, run `python app.py --port 8765` and open `http://127.0.0.1:8765`.

The submission-ready process book, including the Phase 2 implementation addendum, is at `output/pdf/school-success-process-book-phase2.pdf`.

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
4. Illustrative support discussion tree, annotated with group sizes and grades.
5. Heatmap: the distribution of behavior-factor counts within each context-factor count.
6. Risk-factor network (node-link diagram): nine factors (the four context and four behavior factors, plus past failure ≥1) are nodes sized by record count, each with a ring showing the share reaching G3 ≥10. Links join factor pairs whose lift (observed co-occurrence ÷ the count expected under independence) meets a slider threshold (default 1.3×, minimum 10 shared records); link width encodes lift. A hand-written force simulation places the nodes; nodes can be dragged (double-click releases them). Hovering or focusing a node or link shows its numbers, including the lift calculation, in a panel to the right of the figure. Clicking a node or link selects those records in the scatterplot matrix, and matrix selections fill each node in proportion to its selected records (two-way linked views).
7. A 5 × 5 scatterplot matrix of past failures, study time, maternal education, workday alcohol use and final grade. Each off-diagonal cell compares a variable pair; diagonal histograms show distributions. Dragging a box or clicking a bar selects records across every cell and the linked network.

The data story adds a polished family-size box plot, reuses the internet progression, staircase, decision tree and support views, and arranges them into a hook-to-solution narrative.

Filters select subject and school; export downloads the current records as CSV. Chart marks show means and sample sizes on hover or keyboard focus. Grade axes use 0–20 throughout. Missing groups are omitted rather than rendered as zero; line paths break at missing groups.

## Methodology

Source files contain 395 mathematics and 649 Portuguese records. Both datasets are concatenated as **1,044 course records**, not unique students. Students can appear in both subjects; combined results weight each course record equally and should not be treated as independent student observations. Filter subjects separately when appropriate. Zero grades remain included.

Context count (0–4): no internet, commute >30 minutes (`traveltime >= 3`), maternal education below secondary (`Medu < 3`), paternal education below secondary (`Fedu < 3`). Behavior count (0–4): study <2 hours/week (`studytime == 1`), workday alcohol code >=3, weekend alcohol code >=3, no higher-education aspiration. These exploratory thresholds and labels are project choices. They do not establish causation or personal responsibility. Counts are not validated scales.

The decision tree is an explicit discussion aid: G1 <10 prompts learning support; otherwise no internet or commute >30 minutes prompts access support; otherwise routine check-in and support on request. It is not a fitted predictive model or allocation policy. Differences between supported and unsupported groups cannot estimate the benefit of support because support is not randomly assigned.

Scatterplots use exact numeric coordinates, without jitter or interpolation. These measurements are recorded as integers, not truly continuous observations. Identical coordinate pairs are aggregated into bubbles whose area is proportional to course-record count. All matrix cells share fixed variable ranges and the same bubble scale; hover or focus reveals exact values and counts. Passing means G3 >=10 for this dashboard. Network lift for factors A and B is n(A and B) × N ÷ (n(A) × n(B)); 1× means they co-occur as often as chance. The network's past-failure node uses `failures >= 1`. Lift describes association, not causation. Consult `data/student.txt` for original variable definitions (including the dataset's failure-code wording).

## Data attribution and reproducibility

Cortez, P. (2008). *Student Performance* [Dataset]. UCI Machine Learning Repository. https://doi.org/10.24432/C5TG7T.

Dataset: https://archive.ics.uci.edu/dataset/320/student+performance

Data licensed CC BY 4.0: https://creativecommons.org/licenses/by/4.0/

Original `student-mat.csv`, `student-por.csv`, documentation and merge example are preserved in `data/`. `prepare_data.py` converts those originals to the bundled `web/data.json` and click-and-run `web/data.js`. No synthetic observations are used.
