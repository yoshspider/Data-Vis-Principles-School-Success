'use strict';
// Support-conversation tree shared by the explorer and the data story. It is a hand-written
// discussion aid: each question was chosen because it separates groups with clearly different
// final-grade outcomes in this dataset, not fitted as a predictive model.
// By default it is explored one question at a time: answering Yes or No draws that branch and reveals
// the next box. Both answers of a question can be open at once, so several paths can be compared;
// clicking an open answer again closes its branch, and Back undoes the last step.
// "Show full tree" reveals every path at once.
(function () {
  const TEAL = '#2563a6', ORANGE = '#c46743', PASS_GRADE = 10;
  const W = 1120, ROW = 84, TOP = 34, Q_W = 164, Q_H = 72, LEAF_W = 240, LEAF_H = 72, LEAF_X = W - LEAF_W - 6;
  const COLUMN_X = [6, 223, 440, 657], LINK_MIN = 2, LINK_MAX = 26, LINE = 16, PAD = 11;
  const PILL_W = 36, PILL_H = 18, PILL_GAP = 5, ROOT = 'r';

  const has = r => r.failures >= 1;
  const TREE = {
    q: ['First-period grade', '(G1) below 10?'], test: r => r.G1 < 10,
    yes: {
      q: ['G1 below 8?', '(well behind)'], test: r => r.G1 < 8,
      yes: {
        q: ['Any past class', 'failure?'], test: has,
        yes: {title: 'Intensive plan', detail: 'Tutoring plus a family meeting'},
        no: {title: 'Intensive tutoring', detail: 'Weekly sessions, study habits'}
      },
      no: {
        q: ['More than 10', 'absences?'], test: r => r.absences > 10,
        yes: {title: 'Attendance check', detail: 'Find the barrier, then tutoring'},
        no: {title: 'Targeted tutoring', detail: 'Close the gap before G2'}
      }
    },
    no: {
      q: ['Past failure or no', 'higher-ed plans?'], test: r => has(r) || r.higher === 'no',
      yes: {title: 'Mentoring', detail: 'Revisit goals and past setbacks'},
      no: {
        q: ['No home internet or', 'commute >30 min?'], test: r => r.internet === 'no' || r.traveltime >= 3,
        yes: {title: 'Access support', detail: 'Devices, data or transport help'},
        no: {
          q: ['Workday alcohol ≥3', 'or >10 absences?'], test: r => r.Dalc >= 3 || r.absences > 10,
          yes: {title: 'Wellbeing check-in', detail: 'Attendance and alcohol talk'},
          no: {title: 'Routine check-in', detail: 'Support on request'}
        }
      }
    }
  };

  // Open boxes and the undo history per container, kept across re-renders so a filter change does
  // not reset the exploration. Box ids are paths such as 'r.y.n', so a branch's boxes share its prefix.
  const states = new Map();

  const esc = text => String(text).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]);
  const round = v => +v.toFixed(1);
  const passShare = rows => rows.length ? rows.filter(r => r.G3 >= PASS_GRADE).length / rows.length : 0;
  const meanGrade = rows => rows.length ? rows.reduce((s, r) => s + r.G3, 0) / rows.length : null;
  const pct = share => (100 * share).toFixed(0) + '%';
  const childId = (id, answer) => `${id}.${answer === 'Yes' ? 'y' : 'n'}`;

  // Walks the tree with the records that reach each node. Leaves take the next row in order;
  // a question sits halfway between its first and last leaf. Returns a flat list of laid-out nodes.
  function layout(node, rows, depth, nextRow, parent, answer, id) {
    const base = {id, rows, depth, parent, answer, n: rows.length, pass: passShare(rows), mean: meanGrade(rows)};
    if (!node.q) {
      const leaf = {...base, ...node, isLeaf: true, row: nextRow, leaves: [nextRow], x: LEAF_X, y: TOP + nextRow * ROW + (ROW - LEAF_H) / 2};
      return {nodes: [leaf], nextRow: nextRow + 1};
    }
    const self = {...base, q: node.q, isLeaf: false, x: COLUMN_X[depth]};
    const yes = layout(node.yes, rows.filter(node.test), depth + 1, nextRow, self, 'Yes', childId(id, 'Yes'));
    const no = layout(node.no, rows.filter(r => !node.test(r)), depth + 1, yes.nextRow, self, 'No', childId(id, 'No'));
    const children = [yes.nodes[0], no.nodes[0]];
    const leaves = [...children[0].leaves, ...children[1].leaves];
    const mid = (TOP + leaves[0] * ROW + TOP + (leaves[leaves.length - 1] + 1) * ROW) / 2;
    const placed = {...self, leaves, y: mid - Q_H / 2};
    // Children were laid out against the unplaced parent, so point them at the placed one.
    const relink = n => n.parent === self ? {...n, parent: placed} : n;
    return {nodes: [placed, ...yes.nodes.map(relink), ...no.nodes.map(relink)], nextRow: no.nextRow};
  }

  const leafKeys = node => node.leaves.join(' ');
  const shown = (id, state) => state.full || state.open.includes(id) ? ' is-shown' : '';
  const passBar = (x, y, width, node) => {
    if (!node.n) return `<rect x="${x}" y="${y}" width="${width}" height="6" rx="3" fill="#e2e8f0"/>`;
    const split = round(width * node.pass);
    return `<rect x="${x}" y="${y}" width="${width}" height="6" rx="3" fill="${ORANGE}"/>`
      + (split ? `<rect x="${x}" y="${y}" width="${split}" height="6" rx="3" fill="${TEAL}"/>` : '');
  };
  const statText = node => node.n ? `n=${node.n} · mean ${node.mean.toFixed(1)} · ${pct(node.pass)} ≥10` : 'no records';

  // pathLength="1" lets CSS draw the branch in by animating stroke-dashoffset from 1 to 0.
  function linkPath(node, scale, state) {
    const p = node.parent, width = LINK_MIN + (LINK_MAX - LINK_MIN) * scale(node.n);
    const x1 = p.x + Q_W, y1 = p.y + Q_H / 2, x2 = node.x, y2 = node.y + (node.isLeaf ? LEAF_H : Q_H) / 2, mx = (x1 + x2) / 2;
    const tip = `${p.q.join(' ')} ${node.answer}: ${node.n} course records, ${pct(node.pass)} reach a final grade ≥10.`;
    return `<g class="tree-link${shown(node.id, state)}" data-node="${node.id}" data-leaves="${leafKeys(node)}" tabindex="0" data-tip="${esc(tip)}" aria-label="${esc(tip)}">`
      + `<path pathLength="1" d="M${x1},${round(y1)} C${mx},${round(y1)} ${mx},${round(y2)} ${x2},${round(y2)}" stroke-width="${round(width)}"/></g>`;
  }

  // Yes sits above the branch start and No below it, beside the box's right edge.
  function answerPill(node, answer, state) {
    const target = childId(node.id, answer), isChosen = !state.full && state.open.includes(target);
    const y = answer === 'Yes' ? Q_H / 2 - PILL_H - PILL_GAP - 8 : Q_H / 2 + PILL_GAP + 8;
    const label = `Answer ${answer}: ${node.q.join(' ')}`;
    return `<g class="tree-pill${isChosen ? ' is-chosen' : ''}" data-parent="${node.id}" data-target="${target}" role="button" tabindex="0" aria-pressed="${isChosen}" aria-label="${esc(label)}" transform="translate(${Q_W + 5},${y})">`
      + `<rect width="${PILL_W}" height="${PILL_H}" rx="9"/><text x="${PILL_W / 2}" y="13" text-anchor="middle">${answer}</text></g>`;
  }

  function questionBox(node, state) {
    const tip = `${node.q.join(' ')} ${statText(node)}.`;
    return `<g class="tree-q${shown(node.id, state)}" data-node="${node.id}" data-leaves="${leafKeys(node)}" transform="translate(${node.x},${round(node.y)})">`
      + `<g class="tree-pop" tabindex="0" data-tip="${esc(tip)}" aria-label="${esc(tip)}"><rect class="tree-box" width="${Q_W}" height="${Q_H}" rx="8"/>`
      + node.q.map((line, k) => `<text class="tree-title" x="${PAD}" y="${20 + k * LINE}">${esc(line)}</text>`).join('')
      + `<text x="${PAD}" y="${22 + 2 * LINE}">${node.n ? `n=${node.n} · ${pct(node.pass)} ≥10` : 'no records'}</text>`
      + passBar(PAD, Q_H - 10, Q_W - 2 * PAD, node) + '</g>'
      + answerPill(node, 'Yes', state) + answerPill(node, 'No', state) + '</g>';
  }

  function leafBox(node, state) {
    const tip = `${node.title}: ${node.detail}. ${statText(node)}.`;
    return `<g class="tree-leaf-box${shown(node.id, state)}" data-node="${node.id}" data-leaves="${leafKeys(node)}" transform="translate(${node.x},${round(node.y)})">`
      + `<g class="tree-pop" tabindex="0" data-tip="${esc(tip)}" aria-label="${esc(tip)}"><rect class="tree-box" width="${LEAF_W}" height="${LEAF_H}" rx="8"/>`
      + `<text class="tree-title" x="${PAD}" y="20">${esc(node.title)}</text><text class="tree-stat" x="${LEAF_W - PAD}" y="20" text-anchor="end">${node.n ? pct(node.pass) + ' ≥10' : '—'}</text>`
      + `<text x="${PAD}" y="${20 + LINE}">${esc(node.detail)}</text>`
      + `<text x="${PAD}" y="${20 + 2 * LINE}">${node.n ? `n=${node.n} · mean ${node.mean.toFixed(1)}` : 'no records'}</text>`
      + passBar(PAD, LEAF_H - 10, LEAF_W - 2 * PAD, node) + '</g></g>';
  }

  function statusText(state, nodes) {
    const leaves = nodes.filter(n => n.isLeaf);
    if (state.full) return `Showing all ${leaves.length} starting points. Point at any box or branch to trace its paths.`;
    const last = nodes.find(n => n.id === state.last) || nodes[0];
    const reached = leaves.filter(n => state.open.includes(n.id)).length;
    const count = reached ? ` · ${reached} of ${leaves.length} starting points open` : '';
    if (last.isLeaf) return `Starting point: <strong>${esc(last.title)}</strong> · ${esc(last.detail)} · ${statText(last)}${count}`;
    return `Choose <strong>Yes</strong> or <strong>No</strong> beside “${esc(last.q.join(' '))}”${count}`;
  }

  // Shows exactly the open boxes and branches (or everything in full mode), updating classes in
  // place so CSS transitions animate the change.
  function applyState(container, state) {
    const svg = container.querySelector('.tree-svg');
    if (!svg) return;
    svg.classList.toggle('is-full', state.full);
    svg.querySelectorAll('[data-node]').forEach(el => el.classList.toggle('is-shown', state.full || state.open.includes(el.dataset.node)));
    svg.querySelectorAll('.tree-pill').forEach(pill => {
      const isChosen = !state.full && state.open.includes(pill.dataset.target);
      pill.classList.toggle('is-chosen', isChosen);
      pill.setAttribute('aria-pressed', isChosen);
    });
    if (!state.full) highlight(svg, null);
    container.querySelector('.tree-status').innerHTML = statusText(state, state.nodes);
    container.querySelector('.tree-full-toggle').checked = state.full;
    container.querySelector('.tree-back').disabled = state.full || !state.history.length;
  }

  // Every change saves the previous open boxes so Back can restore them.
  function update(container, changes) {
    const state = states.get(container);
    const next = {...state, ...changes, history: [...state.history, {open: state.open, last: state.last}]};
    states.set(container, next);
    applyState(container, next);
  }

  // An answer opens its branch; answering again closes that branch and everything below it.
  function choose(container, pill) {
    const state = states.get(container), {parent, target} = pill.dataset;
    if (state.full || !state.open.includes(parent)) return;
    const isOpen = state.open.includes(target);
    update(container, isOpen
      ? {open: state.open.filter(id => id !== target && !id.startsWith(`${target}.`)), last: parent}
      : {open: [...state.open, target], last: target});
    const reached = container.querySelector(`[data-node="${target}"]:not(.tree-link) .tree-pop`);
    if (!isOpen && reached && pill.matches(':focus-visible')) reached.focus();
  }

  function back(container) {
    const state = states.get(container);
    if (state.full || !state.history.length) return;
    const previous = state.history[state.history.length - 1];
    const next = {...state, ...previous, history: state.history.slice(0, -1)};
    states.set(container, next);
    applyState(container, next);
  }

  // Hovering or focusing any box or branch in the full tree highlights every path through it.
  function highlight(svg, target) {
    const keys = target ? target.dataset.leaves.split(' ') : [];
    svg.classList.toggle('has-hot', keys.length > 0);
    svg.querySelectorAll('[data-leaves]').forEach(el => {
      el.classList.toggle('is-hot', el.dataset.leaves.split(' ').some(k => keys.includes(k)));
    });
  }

  // Listeners live on the container, which survives re-renders, so they are attached only once.
  function listen(container) {
    const pickPill = event => event.target.closest && event.target.closest('.tree-pill');
    const hover = event => {
      const svg = container.querySelector('.tree-svg');
      if (svg && states.get(container).full) highlight(svg, event.target.closest('[data-leaves]'));
    };
    container.addEventListener('click', event => {
      const pill = pickPill(event);
      if (pill) return choose(container, pill);
      if (event.target.closest('.tree-back')) return back(container);
      if (event.target.closest('.tree-restart')) update(container, {open: [ROOT], last: ROOT, full: false});
    });
    container.addEventListener('keydown', event => {
      const pill = pickPill(event);
      if (pill && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); choose(container, pill); }
    });
    container.addEventListener('change', event => {
      if (!event.target.classList.contains('tree-full-toggle')) return;
      const next = {...states.get(container), full: event.target.checked};
      states.set(container, next);
      applyState(container, next);
    });
    container.addEventListener('pointerover', hover);
    container.addEventListener('focusin', hover);
    container.addEventListener('pointerleave', () => highlight(container.querySelector('.tree-svg'), null));
  }

  function drawSupportTree(container, rows) {
    if (!states.has(container)) {
      states.set(container, {open: [ROOT], last: ROOT, history: [], full: false});
      listen(container);
    }
    const {nodes, nextRow} = layout(TREE, rows, 0, 0, null, null, ROOT);
    const state = {...states.get(container), nodes};
    states.set(container, state);
    const total = Math.max(1, rows.length), scale = n => Math.sqrt(n / total);
    const height = TOP + nextRow * ROW + 6;
    const links = nodes.filter(n => n.parent).map(n => linkPath(n, scale, state)).join('');
    const boxes = nodes.map(n => n.isLeaf ? leafBox(n, state) : questionBox(n, state)).join('');
    const heads = `<text class="tree-head" x="${COLUMN_X[0]}" y="16">QUESTIONS TO ASK</text><text class="tree-head" x="${LEAF_X}" y="16">WHERE HELP COULD BEGIN</text>`;
    const controls = `<div class="tree-controls"><label class="tree-toggle"><input type="checkbox" class="tree-full-toggle">Show full tree</label>`
      + `<button type="button" class="tree-back">← Back</button><button type="button" class="tree-restart">Start over</button><p class="tree-status" aria-live="polite"></p></div>`;
    const legend = `<div class="tree-legend"><span><svg width="34" height="6" aria-hidden="true"><rect width="34" height="6" rx="3" fill="${ORANGE}"/><rect width="24" height="6" rx="3" fill="${TEAL}"/></svg>Share reaching a final grade ≥10 (blue) or not (orange)</span><span><svg width="34" height="12" aria-hidden="true"><path d="M0 6 H34" stroke="#cbd5e1" stroke-width="8"/></svg>Branch width = records on that path</span></div>`;
    container.innerHTML = controls + legend
      + `<div class="tree-scroll"><svg class="tree-svg${state.full ? ' is-full' : ''}" viewBox="0 0 ${W} ${height}" role="group" aria-label="Support conversation tree with ${nextRow} suggested starting points">${heads}<g class="tree-links">${links}</g>${boxes}</svg></div>`;
    applyState(container, state);
  }

  window.drawSupportTree = drawSupportTree;
})();
