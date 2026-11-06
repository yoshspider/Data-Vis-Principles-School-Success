'use strict';
// One "Big idea / Try this" pop-up per interactive chart, keyed by the card's id. The
// higher-education Sankey has no entry on purpose. Every number comes from the 1,044
// combined course records (see the methodology panel for the factor definitions).
const TIPS = {
  v1: {
    idea: 'One recorded failure is where grades drop: the mean final grade falls from 12.1 with no past failures to 8.4 with one, then only drifts (7.5, 6.8).',
    tip: 'Hover a step for its mean and group size, then change the school or subject filter to see whether the step stays.'
  },
  'failures-card': {
    idea: 'One recorded failure is where grades drop: the mean final grade falls from 12.1 with no past failures to 8.4 with one, then only drifts (7.5, 6.8).',
    tip: 'Hover a step for its mean and group size. The groups with two or three failures hold about 30 records each, so read them loosely.'
  },
  v2: {
    idea: 'School support does not follow disadvantage: 11 to 13% of students receive it whether they have 0, 1 or 2 context factors, and the share falls to 7% at 4.',
    tip: 'Switch the dropdown to family support, which falls from 70% to 43% across the same columns. Hover a bar for its count.'
  },
  'support-card': {
    idea: 'School support does not follow disadvantage: 11 to 13% of students receive it whether they have 0, 1 or 2 context factors, and the share falls to 7% at 4.',
    tip: 'Press Family support to compare: it falls from 70% to 43% across the same columns. Hover a bar for its count.'
  },
  v3: {
    idea: 'Each kind of disadvantage costs about the same: the mean final grade falls from 12.3 to 10.2 across 0 to 3 context factors and from 12.0 to 9.8 across 0 to 3 behavior factors.',
    tip: 'Hover a point for the mean and n. The four-factor groups are small (about 30 records), so treat their swings as noise.'
  },
  v4: {
    idea: 'The first question does most of the work: a first-period grade below 10 marks a group that passes 36% of the time, against 95% for everyone else.',
    tip: 'Answer Yes or No beside a question to walk one path, or tick Show full tree to compare all eight starting points at once.'
  },
  'tree-card': {
    idea: 'The first question does most of the work: a first-period grade below 10 marks a group that passes 36% of the time, against 95% for everyone else.',
    tip: 'Answer Yes or No beside a question to walk one path; open both answers to compare, or tick Show full tree.'
  },
  v5: {
    idea: 'Context and behavior disadvantages mostly do not stack: in every context column a third to a half of students have no behavior factor, and only 22 to 33% have two or more.',
    tip: 'Read down a column; each one sums to 100%. Hover a cell for its count.'
  },
  'school-geography': {
    idea: 'Two public schools in the Alentejo: Gabriel Pereira in Évora holds 772 of the 1,044 course records and averages 11.6 (81% pass); Mouzinho da Silveira in Portalegre holds 272 and averages 10.5 (69% pass).',
    tip: 'Use the numbered buttons or Replay to step from the country to each town. The dots sit on the schools’ real coordinates.'
  },
  famsize: {
    idea: 'Household size barely moves grades: medians of 12 (three or fewer people) and 11 (more than three), and the middle 50% of both groups runs from 10 to 14.',
    tip: 'Hover a box for its quartiles and n. The dashed line is the pass mark.'
  },
  network: {
    idea: 'The strongest tie in the data joins no higher-education plans with a past failure, about 3× what chance predicts; weekday and weekend drinking is next at 2.4×.',
    tip: 'Click an arc or ribbon: its records light up in the matrix below. Drag the lift slider to the right to keep only the strongest ties.'
  },
  v7: {
    idea: 'Of the three behaviors, study time separates grades most: pass rates climb from 73% at under two hours a week to 86% at five to ten. Absences only bite above 15 days (63% pass).',
    tip: 'Drag a box in any cell or click a histogram bar; the same records stay coloured in every other cell. Tick Only failed grades to focus on the amber dots.'
  }
};

function tipPop(text) {
  const pop = document.createElement('div');
  pop.className = 'tip-pop';
  pop.hidden = true;
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-label', 'Big idea and tip for this chart');
  pop.innerHTML = `<p class="tip-kicker">Big idea</p><p class="tip-text">${text.idea}</p>`
    + `<p class="tip-kicker">Try this</p><p class="tip-text">${text.tip}</p>`
    + '<button type="button" class="tip-close" aria-label="Close">×</button>';
  return pop;
}

function closeTips(except) {
  document.querySelectorAll('.tip-anchor').forEach(anchor => {
    if (anchor === except) return;
    anchor.querySelector('.tip-pop').hidden = true;
    anchor.querySelector('.tip-button').setAttribute('aria-expanded', 'false');
  });
}

function addTip(card, text) {
  const heading = card.querySelector('h3');
  if (!heading || card.querySelector('.tip-anchor')) return;
  const anchor = document.createElement('span');
  anchor.className = 'tip-anchor';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'tip-button';
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-label', 'Big idea and tip for this chart');
  button.textContent = '?';
  const pop = tipPop(text);
  anchor.append(button, pop);
  heading.classList.add('has-tip');          // lifts the title above the paragraph under it, so the pop-up is not covered
  heading.appendChild(anchor);

  const open = () => {
    closeTips(anchor);
    pop.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    button.classList.add('is-seen');
  };
  const close = () => {
    pop.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    button.focus();
  };
  button.addEventListener('click', e => { e.stopPropagation(); pop.hidden ? open() : close(); });
  pop.querySelector('.tip-close').addEventListener('click', e => { e.stopPropagation(); close(); });
  pop.addEventListener('click', e => e.stopPropagation());
}

for (const [id, text] of Object.entries(TIPS)) {
  const card = document.getElementById(id);
  if (card) addTip(card, text);
}
document.addEventListener('click', () => closeTips(null));
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeTips(null); });
