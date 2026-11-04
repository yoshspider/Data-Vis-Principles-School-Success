'use strict';
// Linked scatterplot matrix + chord diagram, shared by the data story.
// Wrapped in a function so its helpers do not clash with story.js.
(function () {
const $=id=>document.getElementById(id), teal='#2563a6', orange='#c46743';
const mean=a=>a.length?a.reduce((s,r)=>s+r.G3,0)/a.length:null;
const fmt=n=>n===null?'No records':n.toFixed(1);
function mark(tag,attrs,tip,hasTitle=true){return `<${tag} ${attrs} tabindex="0" data-tip="${tip}" aria-label="${tip}">${hasTitle?`<title>${tip}</title>`:''}</${tag}>`;}
let records=[];
// The context and behavior counts are sums of these factors; the chord diagram draws them as arcs.
const FACTORS = [
  {key: 'noNet', label: 'No home internet', group: 'context', test: r => r.internet === 'no'},
  {key: 'commute', label: 'Commute >30 min', group: 'context', test: r => r.traveltime >= 3},
  {key: 'Medu', label: 'Mother edu <secondary', group: 'context', test: r => r.Medu < 3},
  {key: 'Fedu', label: 'Father edu <secondary', group: 'context', test: r => r.Fedu < 3},
  {key: 'study', label: 'Study <2 h/week', group: 'behavior', test: r => r.studytime === 1},
  {key: 'Dalc', label: 'Workday alcohol ≥3', group: 'behavior', test: r => r.Dalc >= 3},
  {key: 'Walc', label: 'Weekend alcohol ≥3', group: 'behavior', test: r => r.Walc >= 3},
  {key: 'noHigher', label: 'No higher-ed plans', group: 'behavior', test: r => r.higher === 'no'},
  {key: 'fail', label: 'Past failure ≥1', group: 'history', test: r => r.failures >= 1}
];
const factorCount = group => r => FACTORS.filter(f => f.group === group && f.test(r)).length;
const context = factorCount('context'), behavior = factorCount('behavior');
// Three behaviors a school can act on; final grade is shown by colour rather than as an axis.
// Absences has a long tail (99% of records ≤26, max 75), so values above `cap` share one "30+" band.
const measures = {
  studytime: {label: 'Weekly study time (1 <2 h, 2 2–5 h, 3 5–10 h, 4 >10 h)', short: 'Study time (1–4)', min: 1, max: 4, ticks: [1, 2, 3, 4]},
  Dalc: {label: 'Workday alcohol (1 very low to 5 very high)', short: 'Workday alcohol (1–5)', min: 1, max: 5, ticks: [1, 2, 3, 4, 5]},
  absences: {label: 'School absences (days)', short: 'Absences (days)', min: 0, max: 30, cap: 30, ticks: [0, 10, 20, 30]}
};
const matrixVariables = ['studytime', 'Dalc', 'absences'];
const CELL = 200, OFFSET = 54, PAD = 23, SPAN = 154, BAR_HEIGHT = 115, JITTER = .7, MIN_DRAG = 3, PASS_GRADE = 10;
let recordIndex = new Map(), matrixRows = [], matrixBrushes = [], brushDrag = null, selectionFrame = 0;

// Every variable is a whole-number code, so each value owns a band one unit wide.
const bandWidth = m => SPAN / (m.max - m.min + 1);
const scaleX = m => value => PAD + (value - m.min + .5) * bandWidth(m);
const scaleY = m => value => PAD + SPAN - (value - m.min + .5) * bandWidth(m);
const invertX = m => pixel => (pixel - PAD) / bandWidth(m) + m.min - .5;
const invertY = m => pixel => (PAD + SPAN - pixel) / bandWidth(m) + m.min - .5;

// Stable pseudo-random offset per record and variable, so dots stay put between renders.
function jitter(r, key) {
  let h = Math.imul(recordIndex.get(r) + 1, 374761393) ^ Math.imul(key.charCodeAt(0) + key.length, 668265263);
  h = Math.imul(h ^ h >>> 13, 1274126177);
  h ^= h >>> 16;
  return ((h >>> 0) / 4294967296 - .5) * JITTER;
}
// The value a record is plotted at: its own value, or the cap for anything above it.
const valueOf = (r, key) => measures[key].cap === undefined ? r[key] : Math.min(r[key], measures[key].cap);
const tickLabel = (m, v) => v === m.cap ? `${v}+` : `${v}`;
const jittered = (r, key) => valueOf(r, key) + jitter(r, key);

// Colour always means the final grade: blue reached 10/20, orange fell below it.
const gradeColor = r => r.G3 >= PASS_GRADE ? teal : orange;

function dots(rows, xKey, yKey) {
  const px = scaleX(measures[xKey]), py = scaleY(measures[yKey]);
  return rows.map(r => `<circle cx="${px(jittered(r, xKey)).toFixed(1)}" cy="${py(jittered(r, yKey)).toFixed(1)}" r="1.7" fill="${gradeColor(r)}"/>`).join('');
}

function valueCounts(rows, key) {
  const m = measures[key];
  const counts = Array.from({length: m.max - m.min + 1}, () => 0);
  rows.forEach(r => counts[valueOf(r, key) - m.min]++);
  return counts;
}

// Bars stack records below 10 (orange, on the baseline) under records at 10 or above (blue).
function stackedBars(rows, key, max) {
  const m = measures[key], px = scaleX(m), width = bandWidth(m) - 2;
  const below = valueCounts(rows.filter(r => r.G3 < PASS_GRADE), key);
  const passed = valueCounts(rows.filter(r => r.G3 >= PASS_GRADE), key);
  const bar = (x, bottom, n, color) => n ? `<rect x="${x}" y="${bottom - n / max * BAR_HEIGHT}" width="${width}" height="${n / max * BAR_HEIGHT}" fill="${color}"/>` : '';
  return below.map((n, i) => {
    const x = px(m.min + i) - width / 2, base = PAD + SPAN;
    return bar(x, base, n, orange) + bar(x, base - n / max * BAR_HEIGHT, passed[i], teal);
  }).join('');
}

function histogram(key, rows) {
  const m = measures[key], px = scaleX(m), band = bandWidth(m);
  const counts = valueCounts(rows, key), max = Math.max(1, ...counts);
  let svg = '<text x="100" y="18" text-anchor="middle" class="distribution-label">Distribution · click a bar</text>';
  svg += `<g class="base" fill-opacity=".8">${stackedBars(rows, key, max)}</g><g class="sel-bars" data-key="${key}" data-max="${max}"></g>`;
  counts.forEach((n, i) => {
    const value = m.min + i, passed = rows.filter(r => valueOf(r, key) === value && r.G3 >= PASS_GRADE).length;
    const share = n ? ` (${(100 * passed / n).toFixed(0)}%)` : '';
    svg += mark('rect', `x="${px(value) - band / 2}" y="${PAD}" width="${band}" height="${SPAN}" data-key="${key}" data-value="${value}" class="bar"`, `${m.label}: ${tickLabel(m, value)}; ${n} course records, ${passed} with final grade ≥10${share}. Click or press Enter to select them.`);
  });
  return svg;
}

function matrixCell(xKey, yKey, rows) {
  const x = measures[xKey], y = measures[yKey], px = scaleX(x), py = scaleY(y);
  const ticks = m => m.ticks;
  let svg = '';
  if (xKey === yKey) {
    svg += histogram(xKey, rows);
  } else {
    ticks(y).forEach(v => svg += `<line x1="${PAD}" x2="${PAD + SPAN}" y1="${py(v)}" y2="${py(v)}" stroke="#f1f5f9"/>`);
    ticks(x).forEach(v => svg += `<line y1="${PAD}" y2="${PAD + SPAN}" x1="${px(v)}" x2="${px(v)}" stroke="#f1f5f9"/>`);
    svg += `<g class="base" fill-opacity=".45">${dots(rows, xKey, yKey)}</g><g class="sel" fill-opacity=".9"></g>`;
    svg += `<g class="brushes"></g><rect class="brush-area" x="${PAD}" y="${PAD}" width="${SPAN}" height="${SPAN}"/>`;
    ticks(y).forEach(v => svg += `<text x="20" y="${py(v) + 3}" text-anchor="end">${tickLabel(y, v)}</text>`);
    if (!rows.length) svg += `<text x="${CELL / 2}" y="${CELL / 2}" text-anchor="middle">No records</text>`;
  }
  ticks(x).forEach(v => svg += `<text x="${px(v)}" y="${PAD + SPAN + 14}" text-anchor="middle">${tickLabel(x, v)}</text>`);
  return svg;
}

// "Only failed grades" narrows the matrix (and the selections made from it) to final grades below 10.
const isFailedOnly = () => $('matrix-failed').checked;
const matrixNoun = () => isFailedOnly() ? 'failed course records' : 'course records';

function matrix() {
  matrixRows = isFailedOnly() ? records.filter(r => r.G3 < PASS_GRADE) : records;
  const size = OFFSET + matrixVariables.length * CELL;
  let svg = `<svg viewBox="0 0 ${size} ${size}" role="img" aria-label="Scatterplot matrix of study time, workday alcohol and absences, coloured by final grade"><title>Rows give vertical variables; columns give horizontal variables. Diagonal cells show distributions.</title>`;
  matrixVariables.forEach((key, i) => {
    const center = OFFSET + i * CELL + CELL / 2;
    svg += `<text x="${center}" y="26" text-anchor="middle" class="matrix-label">${measures[key].short}</text><text transform="translate(16,${center}) rotate(-90)" text-anchor="middle" class="matrix-label">${measures[key].short}</text>`;
  });
  matrixVariables.forEach((yKey, yi) => matrixVariables.forEach((xKey, xi) => {
    svg += `<g transform="translate(${OFFSET + xi * CELL},${OFFSET + yi * CELL})" data-x="${xKey}" data-y="${yKey}"><rect x="3" y="3" width="${CELL - 6}" height="${CELL - 6}" fill="${xi === yi ? '#f1f5f9' : 'white'}" stroke="#e2e8f0" rx="3"/>`;
    svg += matrixCell(xKey, yKey, matrixRows) + '</g>';
  }));
  $('matrix').innerHTML = svg + '</svg>';
  updateMatrixSelection();
}

// A record is selected when it falls inside any box, bar, factor or factor pair in the list (union).
const inBrush = (r, b) => {
  if (b.type === 'bar') return valueOf(r, b.key) === b.value;
  if (b.type === 'factor') return factorByKey[b.key].test(r);
  if (b.type === 'pair') return factorByKey[b.a].test(r) && factorByKey[b.b].test(r);
  const x = jittered(r, b.xKey), y = jittered(r, b.yKey);
  return x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1;
};
const selectedRows = () => matrixRows.filter(r => matrixBrushes.some(b => inBrush(r, b)));
const isSameBar = (b, key, value) => b.type === 'bar' && b.key === key && b.value === value;

function drawBrushes(svg) {
  svg.querySelectorAll('.brushes').forEach(g => {
    const {x: xKey, y: yKey} = g.parentNode.dataset;
    const px = scaleX(measures[xKey]), py = scaleY(measures[yKey]);
    g.innerHTML = matrixBrushes
      .filter(b => b.type === 'box' && b.xKey === xKey && b.yKey === yKey)
      .map(b => `<rect class="brush" x="${px(b.x0)}" y="${py(b.y1)}" width="${px(b.x1) - px(b.x0)}" height="${py(b.y0) - py(b.y1)}"/>`)
      .join('');
  });
  svg.querySelectorAll('.bar').forEach(bar => {
    const isSelected = matrixBrushes.some(b => isSameBar(b, bar.dataset.key, +bar.dataset.value));
    bar.classList.toggle('is-selected', isSelected);
    bar.setAttribute('aria-pressed', isSelected);
  });
}


// Final-grade distribution for the current selection (all records when nothing is selected).
// Bars are shares of the selected records; the grey step line is the share across all records.
function drawGradeDist(selected, hasSelection) {
  const el = $('grade-dist');
  if (!el) return;
  const rows = hasSelection ? selected : matrixRows, base = matrixRows;
  if (!rows.length) { el.innerHTML = '<p class="dist-summary">No records selected.</p>'; return; }
  const W = 300, H = 250, L = 34, R = 8, T = 30, B = 40, pw = W - L - R, ph = H - T - B, bw = pw / 21;
  const tally = a => { const c = Array(21).fill(0); a.forEach(r => c[r.G3]++); return c; };
  const c = tally(rows), cb = tally(base);
  const s = c.map(v => 100 * v / rows.length), sb = cb.map(v => 100 * v / (base.length || 1));
  const top = Math.max(...s, ...(hasSelection ? sb : [0]));
  const step = top > 20 ? 10 : 5, max = Math.max(step, Math.ceil(top / step) * step);
  const x = g => L + g * bw, y = v => T + ph - v / max * ph;
  let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Final grade distribution of ${rows.length} ${hasSelection ? 'selected' : ''} course records">`;
  for (let v = 0; v <= max; v += step) svg += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="#e2e8f0"/><text x="${L - 5}" y="${y(v) + 3}" text-anchor="end">${v}%</text>`;
  s.forEach((v, g) => {
    const tip = `Final grade ${g}: ${c[g]} of ${rows.length} ${hasSelection ? 'selected' : ''} records (${v.toFixed(1)}%); ${sb[g].toFixed(1)}% of all records`;
    svg += `<rect x="${(x(g) + 1).toFixed(1)}" y="${y(v).toFixed(1)}" width="${(bw - 2).toFixed(1)}" height="${(T + ph - y(v)).toFixed(1)}" fill="${g >= PASS_GRADE ? teal : orange}" fill-opacity=".85" data-tip="${tip}"/>`;
    svg += `<rect x="${x(g).toFixed(1)}" y="${T}" width="${bw.toFixed(1)}" height="${ph}" fill="transparent" data-tip="${tip}"/>`;
  });
  if (hasSelection) svg += `<path d="${sb.map((v, g) => `${g ? 'H' : 'M'}${(x(g) + (g ? 0 : 0)).toFixed(1)}${g ? '' : ',' + y(v).toFixed(1)}${g ? ' V' + y(v).toFixed(1) : ''}`).join('')}H${x(21)}" fill="none" stroke="#475569" stroke-width="1.5" stroke-dasharray="3 2"/>`;
  svg += `<line x1="${x(10)}" x2="${x(10)}" y1="${T - 6}" y2="${T + ph}" stroke="#64748b" stroke-dasharray="4 3"/><text x="${x(10) + 4}" y="${T - 9}">Pass · 10</text>`;
  [0, 5, 10, 15, 20].forEach(g => svg += `<text x="${(x(g) + bw / 2).toFixed(1)}" y="${T + ph + 14}" text-anchor="middle">${g}</text>`);
  svg += `<text x="${L + pw / 2}" y="${H - 6}" text-anchor="middle">Final grade (G3)</text></svg>`;
  const pass = rows.filter(r => r.G3 >= PASS_GRADE).length, high = rows.filter(r => r.G3 >= 14).length;
  const summary = `${hasSelection ? `${rows.length.toLocaleString()} selected` : `All ${rows.length.toLocaleString()}`} · mean ${fmt(mean(rows))} · ${(100 * (rows.length - pass) / rows.length).toFixed(0)}% below 10 · ${(100 * high / rows.length).toFixed(0)}% at 14+`;
  const key = hasSelection ? '<p class="dist-note"><i></i>Dashed line: all records</p>' : '';
  el.innerHTML = `<p class="dist-summary">${summary}</p>${svg}${key}`;
}

function updateMatrixSelection() {
  selectionFrame = 0;
  const selected = selectedRows(), hasSelection = matrixBrushes.length > 0;
  drawNetworkOverlay();
  drawGradeDist(selected, hasSelection);
  const svg = $('matrix').querySelector('svg');
  if (!svg) return;
  svg.classList.toggle('has-selection', hasSelection);
  svg.querySelectorAll('.sel').forEach(g => {
    const {x: xKey, y: yKey} = g.parentNode.dataset;
    g.innerHTML = dots(selected, xKey, yKey);
  });
  svg.querySelectorAll('.sel-bars').forEach(g => {
    g.innerHTML = stackedBars(selected, g.dataset.key, +g.dataset.max);
  });
  drawBrushes(svg);
  const total = matrixRows.length.toLocaleString();
  const pass = selected.filter(r => r.G3 >= PASS_GRADE).length;
  const parts = matrixBrushes.length > 1 ? ` in ${matrixBrushes.length} selections` : '';
  const summary = `${selected.length.toLocaleString()} of ${total} selected${parts} · mean final grade ${fmt(mean(selected))} · ${selected.length ? (100 * pass / selected.length).toFixed(0) + '% ≥10' : '—'}`;
  $('matrix-selection').textContent = hasSelection ? summary : `${total} ${matrixNoun()} · drag a box in any cell or click a bar to select`;
  $('network-selection').textContent = hasSelection ? summary : `${total} ${matrixNoun()} · click an arc or ribbon to select`;
}

function scheduleSelectionUpdate() {
  if (!selectionFrame) selectionFrame = requestAnimationFrame(updateMatrixSelection);
}

function setMatrixBrushes(brushes) {
  matrixBrushes = brushes;
  scheduleSelectionUpdate();
}

// Shift, Ctrl/Cmd or the "Add to selection" checkbox keep earlier boxes and bars.
const isAdding = event => event.shiftKey || event.ctrlKey || event.metaKey || $('matrix-add').checked;

function cellPoint(cell, event) {
  const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(cell.getScreenCTM().inverse());
  const clamp = v => Math.max(PAD, Math.min(PAD + SPAN, v));
  return {x: clamp(point.x), y: clamp(point.y)};
}

function startBrush(event) {
  const area = event.target.closest('.brush-area');
  if (!area) return;
  event.preventDefault();
  area.setPointerCapture(event.pointerId);
  const cell = area.parentNode, isAdd = isAdding(event);
  brushDrag = {cell, start: cellPoint(cell, event), moved: false, isAdd, kept: isAdd ? matrixBrushes : []};
}

function moveBrush(event) {
  if (!brushDrag) return;
  const {cell, start, kept} = brushDrag, end = cellPoint(cell, event);
  if (Math.hypot(end.x - start.x, end.y - start.y) >= MIN_DRAG) brushDrag = {...brushDrag, moved: true};
  if (!brushDrag.moved) return;
  const {x: xKey, y: yKey} = cell.dataset, ix = invertX(measures[xKey]), iy = invertY(measures[yKey]);
  const [x0, x1] = [ix(start.x), ix(end.x)].sort((a, b) => a - b);
  const [y0, y1] = [iy(start.y), iy(end.y)].sort((a, b) => a - b);
  setMatrixBrushes([...kept, {type: 'box', xKey, yKey, x0, x1, y0, y1}]);
}

function endBrush() {
  // A plain click on empty space clears; an adding click leaves the selection alone.
  if (brushDrag && !brushDrag.moved && !brushDrag.isAdd) setMatrixBrushes([]);
  brushDrag = null;
}

// Brushes are built with a fixed key order, so their JSON identifies them.
const sameBrush = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function toggleBrush(brush, event) {
  const isSelected = matrixBrushes.some(b => sameBrush(b, brush));
  if (isAdding(event)) {
    setMatrixBrushes(isSelected ? matrixBrushes.filter(b => !sameBrush(b, brush)) : [...matrixBrushes, brush]);
  } else {
    const isOnlySelection = isSelected && matrixBrushes.length === 1;
    setMatrixBrushes(isOnlySelection ? [] : [brush]);
  }
}

const selectBar = (bar, event) => toggleBrush({type: 'bar', key: bar.dataset.key, value: +bar.dataset.value}, event);

// Risk-factor chord diagram: each factor owns an arc on a circle; a ribbon joins two factors that
// occur together in more course records than independence would predict (lift = observed / expected).
const round = v => +v.toFixed(1);
const NET_W = 920, NET_H = 620, NET_CX = 460, NET_CY = 310, NET_R_IN = 205, NET_BAND_MIN = 6, NET_BAND_MAX = 30;
const NET_GROUP_GAP = .2, NET_ARC_PAD = .035, NET_SLOT_INSET = .03, NET_FULL_ARC_WEIGHT = 3;
const NET_MIN_PAIR = 10, NET_LABEL_GAP = 16, NET_MAX_TIES = 3;
const NET_LABEL_R = NET_R_IN + NET_BAND_MAX + NET_LABEL_GAP;
// Ribbons between two groups are pulled toward each group's anchor inside the circle, so ties
// between the same pair of groups travel together as one bundle.
const NET_BUNDLE_R = .4, NET_BUNDLE_PULL = .9;
// Ribbon colour runs light to dark violet from 1× to NET_LIFT_DARK× (blue and orange already mean pass / fail).
const NET_LIFT_DARK = 3, NET_LIFT_LIGHT_RGB = [214, 209, 245], NET_LIFT_DARK_RGB = [59, 44, 158];
// Ribbon width follows lift above chance, plus a floor so the weakest ties stay visible.
const NET_WEIGHT_FLOOR = .15;
// Arcs run clockwise from the top: behavior down the right, school history at the bottom, context up the left.
const NET_GROUP_ORDER = ['behavior', 'history', 'context'];
const factorByKey = Object.fromEntries(FACTORS.map(f => [f.key, f]));
let netView = null;

const passShare = rows => rows.length ? rows.filter(r => r.G3 >= PASS_GRADE).length / rows.length : 0;
const pct = share => (100 * share).toFixed(0) + '%';
// Labels such as "edu <secondary" must be escaped before they go into markup.
const esc = text => String(text).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]);

function factorStats(rows) {
  const has = FACTORS.map(f => rows.filter(f.test));
  const nodes = FACTORS.map((f, i) => ({...f, n: has[i].length, pass: passShare(has[i])}));
  const pairs = [];
  FACTORS.forEach((a, i) => FACTORS.slice(i + 1).forEach((b, k) => {
    const j = i + 1 + k, both = has[i].filter(b.test);
    if (both.length) pairs.push({a: i, b: j, n: both.length, lift: both.length * rows.length / (has[i].length * has[j].length), pass: passShare(both)});
  }));
  return {nodes, pairs, total: rows.length, pass: passShare(rows)};
}

// Every factor gets the same arc length, so the layout never shifts when filters change.
// Factors in one group sit close together; wider gaps separate the groups.
function chordArcs() {
  const order = NET_GROUP_ORDER.flatMap(g => FACTORS.map((f, i) => i).filter(i => FACTORS[i].group === g));
  const span = (2 * Math.PI - NET_GROUP_ORDER.length * NET_GROUP_GAP - (FACTORS.length - NET_GROUP_ORDER.length) * NET_ARC_PAD) / FACTORS.length;
  const starts = order.reduce((acc, i, k) => {
    const gap = k === 0 ? NET_GROUP_GAP / 2 : FACTORS[order[k - 1]].group === FACTORS[i].group ? NET_ARC_PAD : NET_GROUP_GAP;
    const start = (k === 0 ? 0 : acc[k - 1].end) + gap;
    return [...acc, {i, start, end: start + span}];
  }, []);
  return FACTORS.map((f, i) => {
    const {start, end} = starts.find(s => s.i === i);
    return {start, end, mid: (start + end) / 2};
  });
}
const NET_ARCS = chordArcs();

// Angles are measured clockwise from twelve o'clock.
const polar = (r, a) => [round(NET_CX + r * Math.sin(a)), round(NET_CY - r * Math.cos(a))];
const pt = (r, a) => polar(r, a).join(',');

const groupMid = group => {
  const mids = NET_ARCS.filter((arc, i) => FACTORS[i].group === group).map(arc => arc.mid);
  return mids.reduce((s, m) => s + m, 0) / mids.length;
};
const NET_ANCHORS = Object.fromEntries(NET_GROUP_ORDER.map(g => [g, polar(NET_R_IN * NET_BUNDLE_R, groupMid(g))]));

function sectorPath(r0, r1, a0, a1) {
  if (a1 - a0 <= 0) return '';
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M${pt(r1, a0)}A${r1},${r1} 0 ${large} 1 ${pt(r1, a1)}L${pt(r0, a1)}A${r0},${r0} 0 ${large} 0 ${pt(r0, a0)}Z`;
}

// Each side of a ribbon is a cubic curve whose control points lean toward the two group anchors.
function ribbonPath(link) {
  const r = NET_R_IN, [a0, a1] = link.endA, [b0, b1] = link.endB;
  const [ancA, ancB] = [NET_ANCHORS[FACTORS[link.a].group], NET_ANCHORS[FACTORS[link.b].group]];
  const ctrl = (angle, [ax, ay]) => {
    const [x, y] = polar(r, angle);
    return `${round(x + (ax - x) * NET_BUNDLE_PULL)},${round(y + (ay - y) * NET_BUNDLE_PULL)}`;
  };
  return `M${pt(r, a0)}A${r},${r} 0 0 1 ${pt(r, a1)}C${ctrl(a1, ancA)} ${ctrl(b0, ancB)} ${pt(r, b0)}`
    + `A${r},${r} 0 0 1 ${pt(r, b1)}C${ctrl(b1, ancB)} ${ctrl(a0, ancA)} ${pt(r, a0)}Z`;
}

const linkWeight = l => l.lift - 1 + NET_WEIGHT_FLOOR;

function liftColor(lift) {
  const t = Math.max(0, Math.min(1, (lift - 1) / (NET_LIFT_DARK - 1)));
  const [r, g, b] = NET_LIFT_LIGHT_RGB.map((c, k) => Math.round(c + (NET_LIFT_DARK_RGB[k] - c) * t));
  return `rgb(${r},${g},${b})`;
}

// Each ribbon end takes a slot on its factor's arc whose width follows linkWeight, with one scale
// for the whole chart so both ends of a ribbon match. Slots are ordered by where the partner sits
// on the circle, which keeps ribbons from twisting over each other near the arcs.
function ribbonSlots(links) {
  const usable = NET_ARCS[0].end - NET_ARCS[0].start - 2 * NET_SLOT_INSET;
  const touching = i => links.map((l, li) => ({l, li})).filter(({l}) => l.a === i || l.b === i);
  const totals = FACTORS.map((f, i) => touching(i).reduce((s, {l}) => s + linkWeight(l), 0));
  const unit = Math.min(usable / Math.max(...totals, 1e-9), usable / NET_FULL_ARC_WEIGHT);
  const offset = (from, to) => (NET_ARCS[to].mid - NET_ARCS[from].mid + 2 * Math.PI) % (2 * Math.PI);
  const ends = FACTORS.map((f, i) => {
    const sorted = touching(i).map(({l, li}) => ({li, other: l.a === i ? l.b : l.a, w: linkWeight(l) * unit}))
      .sort((x, y) => offset(i, y.other) - offset(i, x.other));
    const first = NET_ARCS[i].mid - sorted.reduce((s, e) => s + e.w, 0) / 2;
    return sorted.reduce((acc, e) => {
      const start = acc.length ? acc[acc.length - 1].slot[1] : first;
      return [...acc, {li: e.li, slot: [start, start + e.w]}];
    }, []);
  });
  const slotOf = (i, li) => ends[i].find(e => e.li === li).slot;
  return links.map((l, li) => ({...l, endA: slotOf(l.a, li), endB: slotOf(l.b, li)}));
}

// A factor's connection score adds up how far each of its shown ties exceeds chance (lift − 1).
// The best-connected factor gets the thickest arc.
function connections(links) {
  const ties = FACTORS.map((f, i) => links.filter(l => l.a === i || l.b === i).sort((x, y) => y.lift - x.lift));
  const scores = ties.map(t => t.reduce((s, l) => s + l.lift - 1, 0));
  const top = Math.max(...scores, 0);
  const outer = scores.map(s => NET_R_IN + NET_BAND_MIN + (top ? (NET_BAND_MAX - NET_BAND_MIN) * s / top : 0));
  return {ties, scores, outer};
}

const pairLabel = p => `${FACTORS[p.a].label} + ${FACTORS[p.b].label}`;
const tieCount = n => `${n} ${n === 1 ? 'tie' : 'ties'}`;

// Labels sit outside the arc: left of the circle they end at the anchor, right of it they start
// there, and near the bottom they hang below it. Only the name shows; numbers appear on click.
function arcLabel(i, node) {
  const {mid} = NET_ARCS[i], [x, y] = polar(NET_LABEL_R, mid);
  const s = Math.sin(mid), c = Math.cos(mid);
  const anchor = s > .2 ? 'start' : s < -.2 ? 'end' : 'middle';
  const top = c < -.5 ? 11 : c > .5 ? -4 : 4;
  return `<text class="net-label value" x="${x}" y="${round(y + top)}" text-anchor="${anchor}">${esc(node.label)}</text>`;
}

// Each arc is one solid colour, so a ribbon visibly joins the factor itself; its thickness is the
// connection score. Final-grade outcomes appear in the side panel when the arc is clicked.
function networkNode(node, i, stats, conn) {
  const {start, end} = NET_ARCS[i], outer = conn.outer[i];
  const tip = node.n
    ? `${node.label}: ${node.n} course records, ${tieCount(conn.ties[i].length)} shown. Click or press Enter for details.`
    : `${node.label}: no course records in this view.`;
  return `<g class="net-node${node.n ? '' : ' is-empty'}" data-index="${i}"><path class="net-arc" d="${sectorPath(NET_R_IN, outer, start, end)}"/>${arcLabel(i, node)}`
    + mark('path', `d="${sectorPath(NET_R_IN, outer + 4, start, end)}" class="net-hit" data-key="${node.key}"`, esc(tip), false)
    + '</g>';
}

function networkEdge(link) {
  const tip = `${pairLabel(link)}: ${link.n} course records have both, ${link.lift.toFixed(2)}× what independence predicts; ${pct(link.pass)} reach a final grade ≥10. Click or press Enter for details.`;
  const keys = `data-a="${FACTORS[link.a].key}" data-b="${FACTORS[link.b].key}"`;
  return `<g class="net-edge" ${keys}>`
    + mark('path', `class="net-link" d="${ribbonPath(link)}" fill="${liftColor(link.lift)}" data-ai="${link.a}" data-bi="${link.b}" ${keys}`, esc(tip), false) + '</g>';
}

function networkCallout(stats, conn) {
  const strongest = stats.pairs.filter(p => p.n >= NET_MIN_PAIR).sort((x, y) => y.lift - x.lift)[0];
  if (!strongest) return '<p class="net-callout">Too few records in this view to compare factor pairs.</p>';
  const [a, b] = [FACTORS[strongest.a], FACTORS[strongest.b]];
  const hub = conn.scores.indexOf(Math.max(...conn.scores));
  const hubText = conn.scores[hub] > 0 ? ` · Most connected: <strong>${esc(FACTORS[hub].label)}</strong> (${tieCount(conn.ties[hub].length)})` : '';
  return `<p class="net-callout">Strongest tie: <strong>${esc(a.label)} + ${esc(b.label)}</strong>, ${strongest.lift.toFixed(1)}× chance · ${pct(strongest.pass)} pass vs ${pct(stats.pass)} overall <button type="button" id="net-strongest" data-a="${a.key}" data-b="${b.key}">Select</button>${hubText}</p>`;
}

function network() {
  const stats = factorStats(records), threshold = +$('net-lift').value;
  $('net-lift-value').textContent = threshold.toFixed(1) + '×';
  // Strongest ribbons are drawn last so they sit on top.
  const links = ribbonSlots(stats.pairs.filter(p => p.lift >= threshold && p.n >= NET_MIN_PAIR)).sort((x, y) => x.lift - y.lift);
  const conn = connections(links);
  netView = {stats, links, conn};
  const caption = NET_CY - NET_LABEL_R - 26;
  let svg = `<svg viewBox="0 0 ${NET_W} ${NET_H}" role="img" aria-label="Chord diagram of risk factors; ribbons join factors that co-occur more often than chance">`;
  svg += `<text class="net-group" x="${NET_CX - 14}" y="${caption}" text-anchor="end">◂ CONTEXT</text><text class="net-group" x="${NET_CX + 14}" y="${caption}">BEHAVIOR ▸</text>`;
  if (!stats.total) svg += `<text x="${NET_CX}" y="${NET_CY}" text-anchor="middle">No records</text>`;
  svg += `<g class="net-edges">${links.map(networkEdge).join('')}</g>`;
  svg += `<g class="net-nodes">${stats.nodes.map((node, i) => networkNode(node, i, stats, conn)).join('')}</g></svg>`;
  $('net-callout').innerHTML = networkCallout(stats, conn);
  $('network-chart').innerHTML = svg;
  scheduleSelectionUpdate();
}

// Details stay hidden until an arc or ribbon is clicked; then a small box opens beside it.
// Blue is the share reaching a final grade ≥10, orange the share below, as in the other charts.
const passBar = share => `<div class="net-pass" role="img" aria-label="${pct(share)} reach a final grade of 10 or more"><span style="width:${(100 * share).toFixed(1)}%"></span></div>`
  + '<p class="net-pass-key">Blue: final grade 10+ · orange: below 10</p>';
const closeButton = '<button type="button" class="net-close" aria-label="Close details">×</button>';

function nodeDetail(i) {
  const {stats, conn} = netView, node = stats.nodes[i], ties = conn.ties[i];
  const chips = ties.slice(0, NET_MAX_TIES).map(l => `<li>${esc(FACTORS[l.a === i ? l.b : l.a].label)} <b>${l.lift.toFixed(1)}×</b></li>`).join('');
  const more = ties.length > NET_MAX_TIES ? `<li>+${ties.length - NET_MAX_TIES} more</li>` : '';
  return `${closeButton}<h4>${esc(node.label)}</h4>`
    + `<p><strong>${node.n}</strong> records · <strong>${node.n ? pct(node.pass) : '—'}</strong> reach 10+ <small>(${pct(stats.pass)} overall)</small></p>`
    + (node.n ? passBar(node.pass) : '')
    + (ties.length ? `<p class="net-sub">Travels with</p><ul class="net-ties">${chips}${more}</ul>` : '<p class="net-sub">No ties at this minimum lift.</p>');
}

function pairDetail(a, b) {
  const {stats} = netView, pair = stats.pairs.find(p => p.a === a && p.b === b), [A, B] = [stats.nodes[a], stats.nodes[b]];
  if (!pair) return '';
  const expected = A.n * B.n / stats.total;
  return `${closeButton}<h4>${esc(A.label)} + ${esc(B.label)}</h4>`
    + `<p><strong>${pair.n}</strong> records have both · <strong>${pair.lift.toFixed(1)}×</strong> chance <small>(${expected.toFixed(1)} expected)</small></p>`
    + `<p><strong>${pct(pair.pass)}</strong> reach 10+ <small>(${pct(stats.pass)} overall)</small></p>` + passBar(pair.pass);
}

const netBrush = el => el.dataset.key
  ? {type: 'factor', key: el.dataset.key}
  : {type: 'pair', a: el.dataset.a, b: el.dataset.b};

// The most recently clicked arc or ribbon is the one in focus.
const netFocus = () => [...matrixBrushes].reverse().find(b => b.type === 'factor' || b.type === 'pair');
const factorIndex = key => FACTORS.findIndex(f => f.key === key);
const touchesFocus = (focus, key) => focus && (focus.type === 'factor' ? focus.key === key : focus.a === key || focus.b === key);
const isFocusEdge = (focus, edge) => focus && (focus.type === 'factor'
  ? edge.dataset.a === focus.key || edge.dataset.b === focus.key
  : edge.dataset.a === focus.a && edge.dataset.b === focus.b);
const clearNetFocus = () => setMatrixBrushes(matrixBrushes.filter(b => b.type !== 'factor' && b.type !== 'pair'));
// Where the last click on the chart landed, so a ribbon's box opens at the click rather than
// at the middle of a ribbon that may cross the whole circle.
let netClickPoint = null;

function focusDetail(focus) {
  if (focus.type === 'factor') return nodeDetail(factorIndex(focus.key));
  const [a, b] = [factorIndex(focus.a), factorIndex(focus.b)].sort((x, y) => x - y);
  return pairDetail(a, b);
}

// Opens the box at the outer edge of the chart on the same side as its target, level with it, so
// the highlighted ribbons in the middle of the circle stay visible.
function placeDetail(panel, svg, focus) {
  const area = panel.parentElement.getBoundingClientRect();
  const target = focus.type === 'factor'
    ? svg.querySelector(`.net-hit[data-key="${focus.key}"]`)
    : svg.querySelector(`.net-link[data-a="${focus.a}"][data-b="${focus.b}"]`);
  const rect = netClickPoint
    ? {left: netClickPoint.x, right: netClickPoint.x, top: netClickPoint.y, bottom: netClickPoint.y}
    : (target || svg).getBoundingClientRect();
  netClickPoint = null;
  const clampTo = (v, max) => Math.max(0, Math.min(max, v));
  const [w, h] = [panel.offsetWidth, panel.offsetHeight];
  const cx = (rect.left + rect.right) / 2 - area.left, cy = (rect.top + rect.bottom) / 2 - area.top;
  panel.style.left = `${cx < area.width / 2 ? 0 : area.width - w}px`;
  panel.style.top = `${clampTo(cy - h / 2, area.height - h)}px`;
}

// Clicking an arc or ribbon brings its ribbons forward, fades the rest and opens the details box.
function drawNetworkOverlay() {
  const svg = $('network-chart').querySelector('svg');
  if (!svg || !netView) return;
  const focus = netFocus();
  svg.classList.toggle('has-focus', Boolean(focus));
  svg.querySelectorAll('.net-node').forEach(g => g.classList.toggle('is-focus', touchesFocus(focus, FACTORS[+g.dataset.index].key)));
  svg.querySelectorAll('.net-edge').forEach(edge => edge.classList.toggle('is-hot', isFocusEdge(focus, edge)));
  svg.querySelectorAll('.net-hit, .net-link').forEach(el => {
    const isSelected = matrixBrushes.some(b => sameBrush(b, netBrush(el)));
    el.closest('.net-node, .net-edge').classList.toggle('is-selected', isSelected);
    el.setAttribute('aria-pressed', isSelected);
  });
  const panel = $('net-detail');
  if (!panel) return;
  const html = focus ? focusDetail(focus) : '';
  panel.hidden = !html;
  panel.innerHTML = html;
  if (html) placeDetail(panel, svg, focus);
}

function selectionKeys(e){
  if(e.key==='Escape')return setMatrixBrushes([]);
  if(e.key!=='Enter'&&e.key!==' ')return;
  const bar=e.target.closest('.bar'),net=e.target.closest('.net-hit,.net-link');
  if(bar){e.preventDefault();selectBar(bar,e);}else if(net){e.preventDefault();toggleBrush(netBrush(net),e);}
}
let wired=false;
function wire(){
  if(wired)return;wired=true;
  const netChart=$('network-chart');
  $('matrix-clear').onclick=()=>setMatrixBrushes([]);
  $('network-clear').onclick=()=>setMatrixBrushes([]);
  $('matrix-failed').addEventListener('change',()=>{matrixBrushes=[];matrix();});
  $('net-lift').addEventListener('input',network);
  $('net-callout').addEventListener('click',e=>{
    const s=e.target.closest('#net-strongest');
    if(s)toggleBrush({type:'pair',a:s.dataset.a,b:s.dataset.b},e);
  });
  netChart.addEventListener('click',e=>{const el=e.target.closest('.net-hit,.net-link');if(!el)return;netClickPoint=el.classList.contains('net-link')&&e.clientX?{x:e.clientX,y:e.clientY}:null;toggleBrush(netBrush(el),e);});
  $('net-detail').addEventListener('click',e=>{if(e.target.closest('.net-close'))clearNetFocus();});
  addEventListener('resize',scheduleSelectionUpdate);
  $('matrix').addEventListener('pointerdown',startBrush);
  $('matrix').addEventListener('pointermove',moveBrush);
  $('matrix').addEventListener('pointerup',endBrush);
  $('matrix').addEventListener('pointercancel',endBrush);
  $('matrix').addEventListener('click',e=>{const bar=e.target.closest('.bar');if(bar)selectBar(bar,e);});
  $('v7').addEventListener('keydown',selectionKeys);
  $('network').addEventListener('keydown',selectionKeys);
}
window.drawLinkedViews=function(rows){
  wire();
  records=rows;
  recordIndex=new Map(rows.map((r,i)=>[r,i]));
  matrixBrushes=[];
  network();matrix();
};
})();
