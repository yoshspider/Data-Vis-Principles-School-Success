# School Success Explorer

An offline dashboard implementing the six visualization concepts in the project presentation with the UCI Student Performance dataset.

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

1. Staircase bar chart: mean final grade by recorded previous failures.
2. Grouped bars: school or family support by context factor count.
3. Two lines: mean final grade by context and behavior factor counts.
4. Illustrative support discussion tree, annotated with group sizes and grades.
5. Grade progression: G1, G2, G3 by home internet access.
6. Numeric scatterplots: select absences, age, G1 or G2 against G1, G2 or G3; compare home internet access or course subjects.

Filters select subject and school; export downloads the current records as CSV. Chart marks show means and sample sizes on hover or keyboard focus. Grade axes use 0–20 throughout. Missing groups are omitted rather than rendered as zero; line paths break at missing groups.

## Methodology

Source files contain 395 mathematics and 649 Portuguese records. Both datasets are concatenated as **1,044 course records**, not unique students. Students can appear in both subjects; combined results weight each course record equally and should not be treated as independent student observations. Filter subjects separately when appropriate. Zero grades remain included.

Context count (0–4): no internet, commute >30 minutes (`traveltime >= 3`), maternal education below secondary (`Medu < 3`), paternal education below secondary (`Fedu < 3`). Behavior count (0–4): study <2 hours/week (`studytime == 1`), workday alcohol code >=3, weekend alcohol code >=3, no higher-education aspiration. These exploratory thresholds and labels are project choices. They do not establish causation or personal responsibility. Counts are not validated scales.

The decision tree is an explicit discussion aid: G1 <10 prompts learning support; otherwise no internet or commute >30 minutes prompts access support; otherwise routine check-in and support on request. It is not a fitted predictive model or allocation policy. Differences between supported and unsupported groups cannot estimate the benefit of support because support is not randomly assigned.

Scatterplots use exact numeric coordinates, without jitter or interpolation. These measurements are recorded as integers, not truly continuous observations. Identical coordinate pairs are aggregated into bubbles whose area is proportional to course-record count. Both panels share fixed axis ranges and the same bubble scale; hover or focus reveals exact values and counts. Passing means G3 >=10 for this dashboard. Consult `data/student.txt` for original variable definitions (including the dataset's failure-code wording).

## Data attribution and reproducibility

Cortez, P. (2008). *Student Performance* [Dataset]. UCI Machine Learning Repository. https://doi.org/10.24432/C5TG7T.

Dataset: https://archive.ics.uci.edu/dataset/320/student+performance

Data licensed CC BY 4.0: https://creativecommons.org/licenses/by/4.0/

Original `student-mat.csv`, `student-por.csv`, documentation and merge example are preserved in `data/`. `prepare_data.py` converts those originals to the bundled `web/data.json`. No synthetic observations are used.
