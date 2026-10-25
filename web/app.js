'use strict';
const $=id=>document.getElementById(id), teal='#2563a6', orange='#c46743';
let all=[], records=[];
const mean=a=>a.length?a.reduce((s,r)=>s+r.G3,0)/a.length:null;
// The context and behavior counts are sums of these factors; the network chart draws them as nodes.
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
const groups=(fn,n=5)=>Array.from({length:n},(_,i)=>records.filter(r=>fn(r)===i));
const fmt=n=>n===null?'No records':n.toFixed(1);
function svgStart(title,ylabel='Mean grade / 20'){return `<svg viewBox="0 0 540 285" role="img" aria-label="${title}"><text x="45" y="13">${ylabel}</text>`;}
function axes(labels,top=20,step=5){let s='';for(let y=0;y<=top;y+=step){let py=230-y*200/top;s+=`<line x1="45" y1="${py}" x2="520" y2="${py}" stroke="#e1e5dc"/><text x="34" y="${py+4}" text-anchor="end">${y}</text>`;}labels.forEach((label,i)=>s+=`<text x="${xpos(i,labels.length)}" y="252" text-anchor="middle">${label}</text>`);return s;}
const xpos=(i,n)=>45+(i+.5)*475/n;
// hasTitle=false skips the native browser tooltip, for marks whose details show in a side panel instead.
function mark(tag,attrs,tip,hasTitle=true){return `<${tag} ${attrs} tabindex="0" data-tip="${tip}" aria-label="${tip}">${hasTitle?`<title>${tip}</title>`:''}</${tag}>`;}
function legend(items){return `<div class="legend">${items.map(([label,color])=>`<span><i style="background:${color}"></i>${label}</span>`).join('')}</div>`;}
function staircase() {
  const cohorts = groups(r => r.failures, 4);
  const width = 475 / 4;
  let svg = svgStart('Mean final grade by previous failures, shown as connected stair steps') + axes(['0','1','2','3']);
  cohorts.forEach((rows,i) => {
    const value = mean(rows);
    if (value === null) return;
    const top = 230 - value * 10;
    const left = 45 + i * width;
    svg += mark('rect', `x="${left}" y="${top}" width="${width}" height="${value*10}" fill="${teal}" fill-opacity="${.85-i*.12}"`, `${i} past failures; mean final grade ${fmt(value)}/20; n=${rows.length}`);
    svg += `<path d="M${left},${top} H${left+width}" fill="none" stroke="${teal}" stroke-width="2"/><text class="value" x="${left+width/2}" y="${top-9}" text-anchor="middle">${fmt(value)}</text>`;
    const next = mean(cohorts[i+1] || []);
    if (next !== null) svg += `<line x1="${left+width}" x2="${left+width}" y1="${top}" y2="${230-next*10}" stroke="${teal}" stroke-width="2"/>`;
  });
  const first = mean(cohorts[0]);
  if (first !== null) {
    const edge = 45+width;
    const top = 230-first*10;
    svg += `<g role="img" aria-label="Illustration of a person losing balance near the first step edge"><g transform="translate(${edge-10},${top-2}) rotate(14)" fill="none" stroke="${orange}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="-43" r="5" fill="${orange}" stroke="none"/><path d="M3 -35 L-2 -18 L-8 0 M-2 -18 L13 -7 L18 -11 M1 -30 L-13 -39 M1 -30 L17 -36"/></g><text x="${edge+30}" y="${top-38}" fill="${orange}" font-size="10">Illustration</text></g>`;
  }
  svg += '<text x="282" y="276" text-anchor="middle">Recorded past class failures</text></svg>';
  $('failures').innerHTML = legend([['Mean final grade',teal]]) + svg;
}

function bars(id,labels,series,title,xlabel){let s=svgStart(title)+axes(labels);let slot=475/labels.length,width=Math.min(65,slot*.68/series.length);series.forEach((ser,j)=>ser.values.forEach((a,i)=>{let m=mean(a);if(m===null)return;let x=xpos(i,labels.length)+(j-(series.length-1)/2)*width-width/2;let tip=`${ser.name}, ${labels[i]}: ${fmt(m)}/20; n=${a.length}`;s+=mark('rect',`x="${x}" y="${230-m*10}" width="${width-3}" height="${m*10}" fill="${ser.color}" rx="2"`,tip);if(series.length===1)s+=`<text class="value" x="${x+width/2}" y="${220-m*10}" text-anchor="middle">${fmt(m)}</text>`;}));s+=`<text x="282" y="276" text-anchor="middle">${xlabel}</text></svg>`;$(id).innerHTML=legend(series.map(s=>[s.name,s.color]))+s;}
function percentBars(id,labels,series,title,xlabel){
  let s=svgStart(title,'% of course records')+axes(labels,100,25);
  const width=Math.min(65,475/labels.length*.68);
  labels.forEach((label,i)=>{
    const total=series.reduce((sum,ser)=>sum+ser.values[i].length,0);
    const x=xpos(i,labels.length)-width/2;
    if(!total){s+=`<text x="${xpos(i,labels.length)}" y="222" text-anchor="middle">No records</text>`;return;}
    let base=230;
    series.forEach(ser=>{
      const n=ser.values[i].length;
      if(!n)return;
      const pct=100*n/total,h=pct*2,y=base-h;
      s+=mark('rect',`x="${x}" y="${y}" width="${width}" height="${h}" fill="${ser.color}"`,`${ser.name}, ${label} context factors: ${pct.toFixed(1)}% (${n} of ${total} course records)`);
      if(h>=16)s+=`<text x="${x+width/2}" y="${y+h/2+4}" text-anchor="middle" style="fill:#fff;font-weight:600">${pct.toFixed(0)}%</text>`;
      base=y;
    });
    s+=`<text class="value" x="${x+width/2}" y="${base-6}" text-anchor="middle">n=${total}</text>`;
  });
  s+=`<text x="282" y="276" text-anchor="middle">${xlabel}</text></svg>`;
  $(id).innerHTML=legend(series.map(s=>[s.name,s.color]))+s;
}
function behaviorByContext(){
  const left=70,top=34,cw=90,ch=39,levels=[0,1,2,3,4];
  let s=svgStart('Heatmap of behavior factor count shares within each context factor count','Behavior factor count (each column sums to 100%)');
  groups(context).forEach((rows,i)=>{
    const x=left+i*cw,total=rows.length;
    s+=`<text x="${x+cw/2}" y="${top+levels.length*ch+18}" text-anchor="middle">${i}</text><text x="${x+cw/2}" y="28" text-anchor="middle">n=${total}</text>`;
    if(!total){s+=`<text x="${x+cw/2}" y="${top+levels.length*ch/2}" text-anchor="middle">No records</text>`;return;}
    levels.forEach(level=>{
      const n=rows.filter(r=>behavior(r)===level).length,pct=100*n/total,y=top+(4-level)*ch;
      s+=mark('rect',`x="${x+1}" y="${y+1}" width="${cw-2}" height="${ch-2}" rx="3" fill="${teal}" fill-opacity="${(.06+.94*pct/100).toFixed(3)}" stroke="#e2e8f0"`,`${i} context factors, ${level} behavior factors: ${pct.toFixed(1)}% of that group (${n} of ${total} course records)`);
      s+=`<text x="${x+cw/2}" y="${y+ch/2+4}" text-anchor="middle" style="fill:${pct>=50?'#fff':'#172b4d'};font-weight:600;pointer-events:none">${pct.toFixed(0)}%</text>`;
    });
  });
  levels.forEach(level=>s+=`<text x="${left-10}" y="${top+(4-level)*ch+ch/2+4}" text-anchor="end">${level}</text>`);
  s+='<text x="'+(left+cw*2.5)+'" y="276" text-anchor="middle">Context factor count</text></svg>';
  $('behavior-context').innerHTML=`<div class="legend"><span>Share of records in each column</span><span style="display:inline-flex;align-items:center;gap:6px">0%<i style="width:110px;height:10px;border-radius:2px;margin:0;background:linear-gradient(to right,rgba(37,99,166,.06),${teal})"></i>100%</span></div>`+s;
}
function lines(id,labels,series,title,xlabel){let s=svgStart(title)+axes(labels);series.forEach(ser=>{let path='',previous=false;ser.values.forEach((a,i)=>{let m=a.length?a.reduce((sum,r)=>sum+r[ser.grade||'G3'],0)/a.length:null;if(m===null){previous=false;return;}path+=`${previous?'L':'M'}${xpos(i,labels.length)},${230-m*10} `;previous=true;});s+=`<path d="${path}" fill="none" stroke="${ser.color}" stroke-width="3"/>`;ser.values.forEach((a,i)=>{if(!a.length)return;let m=a.reduce((sum,r)=>sum+r[ser.grade||'G3'],0)/a.length;s+=mark('circle',`cx="${xpos(i,labels.length)}" cy="${230-m*10}" r="5" fill="${ser.color}"`,`${ser.name}, ${labels[i]}: ${fmt(m)}/20; n=${a.length}`);});});$(id).innerHTML=legend(series.map(s=>[s.name,s.color]))+s+`<text x="282" y="276" text-anchor="middle">${xlabel}</text></svg>`;}
function tree(){let low=records.filter(r=>r.G1<10),other=records.filter(r=>r.G1>=10),access=other.filter(r=>r.internet==='no'||r.traveltime>=3),rest=other.filter(r=>r.internet==='yes'&&r.traveltime<3);let node=(label,a,leaf=false)=>`<div class="tree-node ${leaf?'tree-leaf':''}">${label}<br><small>n=${a.length} · final mean ${fmt(mean(a))}</small></div>`;$('tree').innerHTML=node('First-period grade below 10?',records)+`<div class="tree-path"><div class="tree-branch"><small>↓ Yes</small>${node('Discuss learning support and barriers',low,true)}</div><div class="tree-branch"><small>↓ No</small>${node('No internet or commute above 30 min?',other)}<div class="tree-path"><div class="tree-branch"><small>↓ Yes</small>${node('Discuss access support',access,true)}</div><div class="tree-branch"><small>↓ No</small>${node('Check in; support on request',rest,true)}</div></div></div></div>`;}
const measures = {
  failures: {label: 'Past class failures', short: 'Past failures', min: 0, max: 3, ticks: [0, 1, 2, 3]},
  studytime: {label: 'Weekly study time (1 <2 h, 2 2–5 h, 3 5–10 h, 4 >10 h)', short: 'Study time (1–4)', min: 1, max: 4, ticks: [1, 2, 3, 4]},
  Medu: {label: "Mother's education (0 none to 4 higher)", short: "Mother's education (0–4)", min: 0, max: 4, ticks: [0, 1, 2, 3, 4]},
  Dalc: {label: 'Workday alcohol (1 very low to 5 very high)', short: 'Workday alcohol (1–5)', min: 1, max: 5, ticks: [1, 2, 3, 4, 5]},
  G3: {label: 'Final grade (G3)', short: 'Final grade (G3)', min: 0, max: 20, ticks: [0, 5, 10, 15, 20]}
};
const matrixVariables = ['failures', 'studytime', 'Medu', 'Dalc', 'G3'];
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
const jittered = (r, key) => r[key] + jitter(r, key);

// Colour always means the final grade: blue reached 10/20, orange fell below it.
const gradeColor = r => r.G3 >= PASS_GRADE ? teal : orange;

function dots(rows, xKey, yKey) {
  const px = scaleX(measures[xKey]), py = scaleY(measures[yKey]);
  return rows.map(r => `<circle cx="${px(jittered(r, xKey)).toFixed(1)}" cy="${py(jittered(r, yKey)).toFixed(1)}" r="1.7" fill="${gradeColor(r)}"/>`).join('');
}

function valueCounts(rows, key) {
  const m = measures[key];
  const counts = Array.from({length: m.max - m.min + 1}, () => 0);
  rows.forEach(r => counts[r[key] - m.min]++);
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
    const value = m.min + i, passed = rows.filter(r => r[key] === value && r.G3 >= PASS_GRADE).length;
    const share = n ? ` (${(100 * passed / n).toFixed(0)}%)` : '';
    svg += mark('rect', `x="${px(value) - band / 2}" y="${PAD}" width="${band}" height="${SPAN}" data-key="${key}" data-value="${value}" class="bar"`, `${m.label}: ${value}; ${n} course records, ${passed} with final grade ≥10${share}. Click or press Enter to select them.`);
  });
  return svg;
}

// Dashed line between 9 and 10 wherever the final grade is on an axis.
function passLine(xKey, yKey) {
  const line = (x1, y1, x2, y2) => `<line class="pass-line" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
  let svg = '';
  if (xKey === 'G3') svg += line(scaleX(measures.G3)(PASS_GRADE - .5), PAD, scaleX(measures.G3)(PASS_GRADE - .5), PAD + SPAN);
  if (yKey === 'G3' && xKey !== 'G3') svg += line(PAD, scaleY(measures.G3)(PASS_GRADE - .5), PAD + SPAN, scaleY(measures.G3)(PASS_GRADE - .5));
  return svg;
}

function matrixCell(xKey, yKey, rows) {
  const x = measures[xKey], y = measures[yKey], px = scaleX(x), py = scaleY(y);
  const ticks = m => m.ticks;
  let svg = '';
  if (xKey === yKey) {
    svg += histogram(xKey, rows) + passLine(xKey, yKey);
  } else {
    ticks(y).forEach(v => svg += `<line x1="${PAD}" x2="${PAD + SPAN}" y1="${py(v)}" y2="${py(v)}" stroke="#f1f5f9"/>`);
    ticks(x).forEach(v => svg += `<line y1="${PAD}" y2="${PAD + SPAN}" x1="${px(v)}" x2="${px(v)}" stroke="#f1f5f9"/>`);
    svg += `<g class="base" fill-opacity=".45">${dots(rows, xKey, yKey)}</g><g class="sel" fill-opacity=".9"></g>${passLine(xKey, yKey)}`;
    svg += `<g class="brushes"></g><rect class="brush-area" x="${PAD}" y="${PAD}" width="${SPAN}" height="${SPAN}"/>`;
    ticks(y).forEach(v => svg += `<text x="18" y="${py(v) + 3}" text-anchor="end">${v}</text>`);
    if (!rows.length) svg += `<text x="${CELL / 2}" y="${CELL / 2}" text-anchor="middle">No records</text>`;
  }
  ticks(x).forEach(v => svg += `<text x="${px(v)}" y="${PAD + SPAN + 14}" text-anchor="middle">${v}</text>`);
  return svg;
}

function matrix() {
  matrixRows = records;
  const size = OFFSET + matrixVariables.length * CELL;
  let svg = `<svg viewBox="0 0 ${size} ${size}" role="img" aria-label="Scatterplot matrix of past failures, study time, mother's education, workday alcohol and final grade"><title>Rows give vertical variables; columns give horizontal variables. Diagonal cells show distributions.</title>`;
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
  if (b.type === 'bar') return r[b.key] === b.value;
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

function updateMatrixSelection() {
  selectionFrame = 0;
  const selected = selectedRows(), hasSelection = matrixBrushes.length > 0;
  drawNetworkOverlay(selected, hasSelection);
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
  $('matrix-selection').textContent = hasSelection ? summary : `${total} course records · drag a box in any cell or click a bar to select`;
  $('network-selection').textContent = hasSelection ? summary : `${total} course records · click a factor or link to select`;
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

// Risk-factor network: each factor is a node; a link joins two factors that occur
// together in more course records than independence would predict (lift = observed / expected).
const round = v => +v.toFixed(1);
const NET_W = 720, NET_H = 470, NET_MIN_PAIR = 10, NET_REPEL = 9000, NET_SPRING = 190, NET_STIFF = .02;
const NET_GRAVITY = .006, NET_DECAY = .55, NET_COOL = .965, NET_ALPHA_MIN = .02, NET_DRAG_MIN = 3, NET_PAD = 6;
const NET_CHAR = 6.3, NET_LABEL_BELOW = 34;
const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
const factorByKey = Object.fromEntries(FACTORS.map(f => [f.key, f]));
let netSim = null, netFrame = 0, netDrag = null, netPositions = {};

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

// Area is proportional to records. Each node also owns a box around its circle and the two label
// lines under it, so collisions keep labels apart as well as circles.
const nodeRadius = (n, total) => total ? Math.max(9, 62 * Math.sqrt(n / total)) : 9;
const nodeBox = (label, r) => ({hw: Math.max(r, label.length * NET_CHAR / 2) + NET_PAD, top: r + NET_PAD, bottom: r + NET_LABEL_BELOW});

// Context factors start on the left, behavior on the right, school history below, so the layout is repeatable.
function initialPosition(f) {
  const peers = FACTORS.filter(g => g.group === f.group), index = peers.indexOf(f);
  const x = {context: .27, behavior: .73, history: .5}[f.group] * NET_W + (index % 2 ? 36 : -36);
  const y = f.group === 'history' ? NET_H * .82 : NET_H * (.16 + .22 * index);
  return {x, y, pinned: false};
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Overlapping boxes are pushed apart along the axis that overlaps least; a pinned node stays put.
function resolveOverlaps(nodes) {
  const xs = nodes.map(n => n.x), ys = nodes.map(n => n.y);
  nodes.forEach((a, i) => nodes.slice(i + 1).forEach((b, k) => {
    const j = i + 1 + k, dx = xs[j] - xs[i], dy = ys[j] - ys[i];
    const overlapX = a.hw + b.hw - Math.abs(dx);
    const overlapY = dy >= 0 ? a.bottom + b.top - dy : b.bottom + a.top + dy;
    if (overlapX <= 0 || overlapY <= 0) return;
    const [shareA, shareB] = a.pinned ? [0, 1] : b.pinned ? [1, 0] : [.5, .5];
    if (overlapX < overlapY) {
      const sx = Math.sign(dx) || 1;
      xs[i] -= sx * overlapX * shareA; xs[j] += sx * overlapX * shareB;
    } else {
      const sy = Math.sign(dy) || 1;
      ys[i] -= sy * overlapY * shareA; ys[j] += sy * overlapY * shareB;
    }
  }));
  return nodes.map((n, i) => ({...n, x: clamp(xs[i], n.hw, NET_W - n.hw), y: clamp(ys[i], n.top, NET_H - n.bottom)}));
}

// One step of the simulation: repulsion between every pair, springs along links, weak gravity
// to the centre, then overlap removal. Returns new node objects.
function forceTick(nodes, links, alpha) {
  const fx = nodes.map(() => 0), fy = nodes.map(() => 0);
  const push = (i, dx, dy, f) => { fx[i] += dx * f; fy[i] += dy * f; };
  nodes.forEach((a, i) => nodes.slice(i + 1).forEach((b, k) => {
    const j = i + 1 + k, dx = b.x - a.x || .01, dy = b.y - a.y, dist = Math.hypot(dx, dy);
    const f = NET_REPEL / (dist * dist);
    push(i, -dx / dist, -dy / dist, f);
    push(j, dx / dist, dy / dist, f);
  }));
  links.forEach(l => {
    const a = nodes[l.a], b = nodes[l.b], dx = b.x - a.x, dy = b.y - a.y, dist = Math.hypot(dx, dy) || .01;
    const f = (dist - (a.r + b.r + NET_SPRING / l.lift)) * NET_STIFF;
    push(l.a, dx / dist, dy / dist, f);
    push(l.b, -dx / dist, -dy / dist, f);
  });
  const moved = nodes.map((n, i) => {
    if (n.pinned) return {...n, vx: 0, vy: 0};
    const vx = (n.vx + (fx[i] + (NET_W / 2 - n.x) * NET_GRAVITY) * alpha) * NET_DECAY;
    const vy = (n.vy + (fy[i] + (NET_H / 2 - n.y) * NET_GRAVITY) * alpha) * NET_DECAY;
    return {...n, vx, vy, x: n.x + vx, y: n.y + vy};
  });
  return [1, 2, 3].reduce(resolveOverlaps, moved);
}

function applyNetworkPositions() {
  const svg = $('network-chart').querySelector('svg');
  if (!svg || !netSim) return;
  netSim.nodes.forEach(n => netPositions[n.key] = {x: n.x, y: n.y, pinned: n.pinned});
  svg.querySelectorAll('.net-node').forEach(g => {
    const n = netSim.nodes[+g.dataset.index];
    g.setAttribute('transform', `translate(${round(n.x)},${round(n.y)})`);
  });
  svg.querySelectorAll('.net-edge line').forEach(line => {
    const a = netSim.nodes[+line.dataset.ai], b = netSim.nodes[+line.dataset.bi];
    line.setAttribute('x1', round(a.x)); line.setAttribute('y1', round(a.y));
    line.setAttribute('x2', round(b.x)); line.setAttribute('y2', round(b.y));
  });
}

function stepNetwork() {
  netFrame = 0;
  netSim = {...netSim, nodes: forceTick(netSim.nodes, netSim.links, netSim.alpha), alpha: netSim.alpha * NET_COOL};
  applyNetworkPositions();
  if (netSim.alpha > NET_ALPHA_MIN || netDrag) netFrame = requestAnimationFrame(stepNetwork);
}

function heatNetwork(alpha) {
  netSim = {...netSim, alpha: Math.max(netSim.alpha, alpha)};
  if (!reduceMotion) {
    if (!netFrame) netFrame = requestAnimationFrame(stepNetwork);
    return;
  }
  // Reduced motion: settle instantly and draw only the final layout.
  while (netSim.alpha > NET_ALPHA_MIN) netSim = {...netSim, nodes: forceTick(netSim.nodes, netSim.links, netSim.alpha), alpha: netSim.alpha * NET_COOL};
  applyNetworkPositions();
}

const pairLabel = p => `${FACTORS[p.a].label} + ${FACTORS[p.b].label}`;

function networkNode(node, sim, stats) {
  const ring = Math.max(4, sim.r * .3), mid = sim.r - ring / 2, around = 2 * Math.PI * mid;
  const dash = node.group === 'behavior' ? ' stroke-dasharray="5 3"' : node.group === 'history' ? ' stroke-dasharray="1.5 2.5"' : '';
  const tip = node.n
    ? `${node.label}: ${node.n} course records (${pct(node.n / stats.total)} of this view); ${pct(node.pass)} reach a final grade ≥10, against ${pct(stats.pass)} overall. Click or press Enter to select them; drag to move, double-click to release.`
    : `${node.label}: no course records in this view.`;
  return `<g class="net-node${node.n ? '' : ' is-empty'}" data-index="${sim.i}">`
    + `<circle r="${round(sim.r)}" fill="white"/>`
    + (node.n ? `<circle r="${round(mid)}" fill="none" stroke="${orange}" stroke-width="${round(ring)}"/><circle r="${round(mid)}" fill="none" stroke="${teal}" stroke-width="${round(ring)}" stroke-dasharray="${round(around * node.pass)} ${round(around)}" transform="rotate(-90)"/>` : '')
    + `<circle class="net-sel" r="0"/>`
    + `<circle r="${round(sim.r)}" fill="none" stroke="#172b4d" stroke-width="1.2"${dash}/>`
    + (sim.r >= 17 && node.n ? `<text class="value" y="4" text-anchor="middle">${pct(node.pass)}</text>` : '')
    + `<text class="net-label" y="${round(sim.r + 14)}" text-anchor="middle"><tspan class="value">${esc(node.label)}</tspan></text>`
    + `<text class="net-label net-sel-label" y="${round(sim.r + 27)}" text-anchor="middle"></text>`
    + mark('circle', `r="${round(sim.r)}" class="net-hit" data-key="${node.key}"`, esc(tip), false)
    + '</g>';
}

function networkEdge(link, stats) {
  const tip = `${pairLabel(link)}: ${link.n} course records have both, ${link.lift.toFixed(2)}× what independence predicts; ${pct(link.pass)} reach a final grade ≥10. Click or press Enter to select them.`;
  const ends = `data-ai="${link.a}" data-bi="${link.b}"`;
  return `<g class="net-edge" data-a="${FACTORS[link.a].key}" data-b="${FACTORS[link.b].key}"><line class="net-link-vis" ${ends} stroke-width="${round(1 + (link.lift - 1) * 4)}"/>`
    + mark('line', `class="net-link" ${ends} stroke-width="${round(Math.max(12, 1 + (link.lift - 1) * 4))}" data-a="${FACTORS[link.a].key}" data-b="${FACTORS[link.b].key}"`, esc(tip), false) + '</g>';
}

function networkCallout(stats) {
  const strongest = stats.pairs.filter(p => p.n >= NET_MIN_PAIR).sort((x, y) => y.lift - x.lift)[0];
  if (!strongest) return '<p class="net-callout">Too few records in this view to compare factor pairs.</p>';
  const [a, b] = [FACTORS[strongest.a], FACTORS[strongest.b]];
  return `<p class="net-callout">Strongest tie: <strong>${esc(a.label)} + ${esc(b.label)}</strong>, ${strongest.lift.toFixed(1)}× chance · ${pct(strongest.pass)} pass vs ${pct(stats.pass)} overall <button type="button" id="net-strongest" data-a="${a.key}" data-b="${b.key}">Select</button></p>`;
}

function network() {
  const stats = factorStats(records), threshold = +$('net-lift').value;
  $('net-lift-value').textContent = threshold.toFixed(1) + '×';
  const nodes = stats.nodes.map((f, i) => {
    const prev = netPositions[f.key] || initialPosition(f), r = nodeRadius(f.n, stats.total);
    return {key: f.key, label: f.label, i, r, ...nodeBox(f.label, r), x: prev.x, y: prev.y, vx: 0, vy: 0, pinned: prev.pinned};
  });
  const links = stats.pairs.filter(p => p.lift >= threshold && p.n >= NET_MIN_PAIR);
  const isFirst = !netSim;
  netSim = {nodes, links, stats, alpha: netSim ? netSim.alpha : 0};
  let svg = `<svg viewBox="0 0 ${NET_W} ${NET_H}" role="img" aria-label="Network of risk factors; links join factors that co-occur more often than chance">`;
  if (!stats.total) svg += `<text x="${NET_W / 2}" y="${NET_H / 2}" text-anchor="middle">No records</text>`;
  svg += `<g class="net-edges">${links.map(l => networkEdge(l, stats)).join('')}</g>`;
  svg += `<g class="net-nodes">${stats.nodes.map((node, i) => networkNode(node, nodes[i], stats)).join('')}</g></svg>`;
  $('net-callout').innerHTML = networkCallout(stats);
  $('network-chart').innerHTML = svg;
  showNetDetail(null);
  applyNetworkPositions();
  heatNetwork(isFirst ? 1 : .5);
  scheduleSelectionUpdate();
}

// The side panel shows the numbers behind whichever circle or link is hovered or focused.
const NET_HINT = '<p>Point at a circle or link for details.</p>';

function nodeDetail(i) {
  const {stats} = netSim, node = stats.nodes[i];
  const tie = stats.pairs.filter(p => (p.a === i || p.b === i) && p.n >= NET_MIN_PAIR).sort((x, y) => y.lift - x.lift)[0];
  return `<h4>${esc(node.label)}</h4><dl><dt>Records</dt><dd>${node.n}</dd><dt>Pass rate</dt><dd>${node.n ? pct(node.pass) : '—'} <small>vs ${pct(stats.pass)}</small></dd>`
    + (tie ? `<dt>Strongest tie</dt><dd>${esc(FACTORS[tie.a === i ? tie.b : tie.a].label)} ${tie.lift.toFixed(1)}×</dd>` : '') + '</dl>';
}

function pairDetail(a, b) {
  const {stats} = netSim, pair = stats.pairs.find(p => p.a === a && p.b === b), [A, B] = [stats.nodes[a], stats.nodes[b]];
  const expected = A.n * B.n / stats.total;
  return `<h4>${esc(A.label)} + ${esc(B.label)}</h4><dl><dt>Records with both</dt><dd>${pair.n}</dd><dt>Expected by chance</dt><dd>${expected.toFixed(1)}</dd><dt>Lift</dt><dd>${pair.lift.toFixed(1)}×</dd><dt>Pass rate</dt><dd>${pct(pair.pass)} <small>vs ${pct(stats.pass)}</small></dd></dl>`;
}

function showNetDetail(el) {
  const panel = $('net-detail');
  if (!panel || !netSim) return;
  if (!el) panel.innerHTML = NET_HINT;
  else if (el.classList.contains('net-link')) panel.innerHTML = pairDetail(+el.dataset.ai, +el.dataset.bi);
  else panel.innerHTML = nodeDetail(+el.closest('.net-node').dataset.index);
}

const netBrush = el => el.dataset.key
  ? {type: 'factor', key: el.dataset.key}
  : {type: 'pair', a: el.dataset.a, b: el.dataset.b};

// Inner discs show what share of each factor's records is in the current selection.
function drawNetworkOverlay(selected, hasSelection) {
  const svg = $('network-chart').querySelector('svg');
  if (!svg || !netSim) return;
  svg.classList.toggle('has-selection', hasSelection);
  svg.querySelectorAll('.net-node').forEach(g => {
    const node = netSim.stats.nodes[+g.dataset.index], sim = netSim.nodes[+g.dataset.index];
    const n = hasSelection ? selected.filter(node.test).length : 0;
    const inner = Math.max(4, sim.r * .7);
    g.querySelector('.net-sel').setAttribute('r', node.n ? round(inner * Math.sqrt(n / node.n)) : 0);
    g.querySelector('.net-sel-label').textContent = hasSelection ? `${n} selected` : '';
    g.classList.toggle('is-unselected', hasSelection && !n);
  });
  svg.querySelectorAll('.net-hit, .net-link').forEach(el => {
    const isSelected = matrixBrushes.some(b => sameBrush(b, netBrush(el)));
    el.closest('.net-node, .net-edge').classList.toggle('is-selected', isSelected);
    el.setAttribute('aria-pressed', isSelected);
  });
}

function svgPoint(svg, event) {
  return new DOMPoint(event.clientX, event.clientY).matrixTransform(svg.getScreenCTM().inverse());
}

function startNodeDrag(event) {
  const hit = event.target.closest('.net-hit');
  if (!hit || !netSim) return;
  event.preventDefault();
  hit.setPointerCapture(event.pointerId);
  netDrag = {index: +hit.closest('.net-node').dataset.index, start: {x: event.clientX, y: event.clientY}, moved: false};
}

function moveNodeDrag(event) {
  if (!netDrag) return;
  if (!netDrag.moved && Math.hypot(event.clientX - netDrag.start.x, event.clientY - netDrag.start.y) < NET_DRAG_MIN) return;
  const p = svgPoint($('network-chart').querySelector('svg'), event);
  netDrag = {...netDrag, moved: true};
  netSim = {...netSim, nodes: netSim.nodes.map((n, i) => i === netDrag.index
    ? {...n, x: clamp(p.x, n.hw, NET_W - n.hw), y: clamp(p.y, n.top, NET_H - n.bottom), pinned: true}
    : n)};
  heatNetwork(.3);
}

// A drag that moved suppresses the click that follows it; a still press is a click.
function endNodeDrag() {
  if (netDrag && netDrag.moved) netSim = {...netSim, justDragged: true};
  netDrag = null;
}

function releaseNode(event) {
  const hit = event.target.closest('.net-hit');
  if (!hit || !netSim) return;
  const index = +hit.closest('.net-node').dataset.index;
  netSim = {...netSim, nodes: netSim.nodes.map((n, i) => i === index ? {...n, pinned: false} : n)};
  heatNetwork(.4);
}

// Hovering or focusing a node darkens its links.
function highlightNodeLinks(event, isOn) {
  const hit = event.target.closest && event.target.closest('.net-hit');
  if (!hit) return;
  $('network-chart').querySelectorAll('.net-edge').forEach(edge => {
    edge.classList.toggle('is-hot', isOn && (edge.dataset.a === hit.dataset.key || edge.dataset.b === hit.dataset.key));
  });
}

function render(){records=all.filter(r=>($('subject').value==='all'||r.subject===$('subject').value)&&($('school').value==='all'||r.school===$('school').value));let pass=records.filter(r=>r.G3>=10).length,net=records.filter(r=>r.internet==='yes').length;$('stats').innerHTML=[[records.length.toLocaleString(),'Course records'],[fmt(mean(records))+' / 20','Mean final grade'],[records.length?(100*pass/records.length).toFixed(1)+'%':'—','Final grade ≥10'],[records.length?(100*net/records.length).toFixed(1)+'%':'—','Internet at home']].map(([n,l])=>`<div class="stat"><strong>${n}</strong><span>${l}</span></div>`).join('');$('filter-status').textContent=`${records.length} records in this view`;
staircase();
let key=$('support').value;percentBars('support-chart',['0','1','2','3','4'],[{name:'Support received',color:teal,values:groups(context).map(a=>a.filter(r=>r[key]==='yes'))},{name:'No support',color:orange,values:groups(context).map(a=>a.filter(r=>r[key]==='no'))}],'Percent of course records with and without support, by context factor count','Context factor count');
lines('factors',['0','1','2','3','4'],[{name:'Context factors',color:teal,values:groups(context)},{name:'Behavior factors',color:orange,values:groups(behavior)}],'Final grade by factor count','Factor count');
tree();behaviorByContext();network();matrix();}
function exportCsv(){let keys=Object.keys(all[0]),quote=v=>'"'+String(v).replaceAll('"','""')+'"';let csv=[keys.map(quote).join(','),...records.map(r=>keys.map(k=>quote(r[k])).join(','))].join('\r\n');let url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='school-success-filtered.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
for(let id of ['subject','school','support'])$(id).addEventListener('change',render);
$('reset').onclick=()=>{$('subject').value='all';$('school').value='all';$('support').value='schoolsup';$('net-lift').value='1.3';matrixBrushes=[];render();};$('export').onclick=exportCsv;
$('matrix-clear').onclick=()=>setMatrixBrushes([]);
$('network-clear').onclick=()=>setMatrixBrushes([]);
$('net-lift').addEventListener('input',network);
const netChart=$('network-chart');
$('net-callout').addEventListener('click',e=>{
  const strongest=e.target.closest('#net-strongest');
  if(strongest)toggleBrush({type:'pair',a:strongest.dataset.a,b:strongest.dataset.b},e);
});
netChart.addEventListener('click',e=>{
  if(netSim&&netSim.justDragged){netSim={...netSim,justDragged:false};return;}
  const el=e.target.closest('.net-hit,.net-link');if(el)toggleBrush(netBrush(el),e);
});
netChart.addEventListener('pointerdown',startNodeDrag);
netChart.addEventListener('pointermove',moveNodeDrag);
netChart.addEventListener('pointerup',endNodeDrag);
netChart.addEventListener('pointercancel',endNodeDrag);
netChart.addEventListener('dblclick',releaseNode);
netChart.addEventListener('pointerover',e=>highlightNodeLinks(e,true));
netChart.addEventListener('pointerout',e=>highlightNodeLinks(e,false));
netChart.addEventListener('focusin',e=>highlightNodeLinks(e,true));
netChart.addEventListener('focusout',e=>highlightNodeLinks(e,false));
$('matrix').addEventListener('pointerdown',startBrush);
$('matrix').addEventListener('pointermove',moveBrush);
$('matrix').addEventListener('pointerup',endBrush);
$('matrix').addEventListener('pointercancel',endBrush);
$('matrix').addEventListener('click',e=>{const bar=e.target.closest('.bar');if(bar)selectBar(bar,e);});
function selectionKeys(e){
  if(e.key==='Escape')return setMatrixBrushes([]);
  if(e.key!=='Enter'&&e.key!==' ')return;
  const bar=e.target.closest('.bar'),net=e.target.closest('.net-hit,.net-link');
  if(bar){e.preventDefault();selectBar(bar,e);}else if(net){e.preventDefault();toggleBrush(netBrush(net),e);}
}
$('v7').addEventListener('keydown',selectionKeys);$('network').addEventListener('keydown',selectionKeys);
function tip(event){let target=event.target.closest('[data-tip]');if(!target)return;if(target.closest('#network-chart'))return showNetDetail(target);let box=target.getBoundingClientRect(),tooltip=$('tooltip');tooltip.textContent=target.dataset.tip;tooltip.hidden=false;tooltip.style.left=Math.max(8,Math.min(window.innerWidth-270,event.clientX||box.x))+'px';tooltip.style.top=Math.max(8,Math.min(window.innerHeight-70,(event.clientY||box.y)-45))+'px';}
document.addEventListener('pointerover',tip);document.addEventListener('focusin',tip);document.addEventListener('pointerout',()=>{$('tooltip').hidden=true;});document.addEventListener('focusout',()=>{$('tooltip').hidden=true;});
try{all=window.SCHOOL_DATA;recordIndex=new Map(all.map((r,i)=>[r,i]));render();}catch(e){$('filter-status').textContent='Data could not be loaded';}

const dotLinks=[...document.querySelectorAll('.dots a')];
if('IntersectionObserver' in window){const view=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting)dotLinks.forEach(d=>d.classList.toggle('active',d.getAttribute('href')==='#'+e.target.id));}),{rootMargin:'-40% 0px -40% 0px'});document.querySelectorAll('.grid>.card').forEach(c=>view.observe(c));}
