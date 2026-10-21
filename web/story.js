'use strict';
const $=id=>document.getElementById(id), teal='#2563a6', orange='#c46743';
let records=[];
const mean=a=>a.length?a.reduce((s,r)=>s+r.G3,0)/a.length:null;
const context=r=>+(r.internet==='no')+ +(r.traveltime>=3)+ +(r.Medu<3)+ +(r.Fedu<3);
const groups=(fn,n=5)=>Array.from({length:n},(_,i)=>records.filter(r=>fn(r)===i));
const fmt=n=>n===null?'No records':n.toFixed(1);
function svgStart(title,ylabel='Mean grade / 20'){return `<svg viewBox="0 0 540 285" role="img" aria-label="${title}"><text x="45" y="13">${ylabel}</text>`;}
function axes(labels,top=20,step=5){let s='';for(let y=0;y<=top;y+=step){let py=230-y*200/top;s+=`<line x1="45" y1="${py}" x2="520" y2="${py}" stroke="#e1e5dc"/><text x="34" y="${py+4}" text-anchor="end">${y}</text>`;}labels.forEach((label,i)=>s+=`<text x="${xpos(i,labels.length)}" y="252" text-anchor="middle">${label}</text>`);return s;}
const xpos=(i,n)=>45+(i+.5)*475/n;
function mark(tag,attrs,tip){return `<${tag} ${attrs} tabindex="0" data-tip="${tip}" aria-label="${tip}"><title>${tip}</title></${tag}>`;}
function legend(items){return `<div class="legend">${items.map(([label,color])=>`<span><i style="background:${color}"></i>${label}</span>`).join('')}</div>`;}

function staircase(){
  const cohorts=groups(r=>r.failures,4), width=475/4;
  let svg=svgStart('Mean final grade by previous failures, shown as connected stair steps')+axes(['0','1','2','3']);
  cohorts.forEach((rows,i)=>{
    const value=mean(rows);
    if(value===null)return;
    const top=230-value*10, left=45+i*width;
    svg+=mark('rect',`x="${left}" y="${top}" width="${width}" height="${value*10}" fill="${teal}" fill-opacity="${.85-i*.12}"`,`${i} past failures; mean final grade ${fmt(value)}/20; n=${rows.length}`);
    svg+=`<path d="M${left},${top} H${left+width}" fill="none" stroke="${teal}" stroke-width="2"/><text class="value" x="${left+width/2}" y="${top-9}" text-anchor="middle">${fmt(value)}</text>`;
    const next=mean(cohorts[i+1]||[]);
    if(next!==null)svg+=`<line x1="${left+width}" x2="${left+width}" y1="${top}" y2="${230-next*10}" stroke="${teal}" stroke-width="2"/>`;
  });
  const first=mean(cohorts[0]);
  if(first!==null){
    const edge=45+width, top=230-first*10;
    svg+=`<g role="img" aria-label="Illustration of a person losing balance near the first step edge"><g transform="translate(${edge-10},${top-2}) rotate(14)" fill="none" stroke="${orange}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="-43" r="5" fill="${orange}" stroke="none"/><path d="M3 -35 L-2 -18 L-8 0 M-2 -18 L13 -7 L18 -11 M1 -30 L-13 -39 M1 -30 L17 -36"/></g><text x="${edge+30}" y="${top-38}" fill="${orange}" font-size="10">Illustration</text></g>`;
  }
  svg+='<text x="282" y="276" text-anchor="middle">Recorded past class failures</text></svg>';
  $('failures').innerHTML=legend([['Mean final grade',teal]])+svg;
}

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

function lines(id,labels,series,title,xlabel){
  let s=svgStart(title)+axes(labels);
  series.forEach(ser=>{
    let path='',previous=false;
    ser.values.forEach((a,i)=>{let m=a.length?a.reduce((sum,r)=>sum+r[ser.grade||'G3'],0)/a.length:null;if(m===null){previous=false;return;}path+=`${previous?'L':'M'}${xpos(i,labels.length)},${230-m*10} `;previous=true;});
    s+=`<path d="${path}" fill="none" stroke="${ser.color}" stroke-width="3"/>`;
    ser.values.forEach((a,i)=>{if(!a.length)return;let m=a.reduce((sum,r)=>sum+r[ser.grade||'G3'],0)/a.length;s+=mark('circle',`cx="${xpos(i,labels.length)}" cy="${230-m*10}" r="5" fill="${ser.color}"`,`${ser.name}, ${labels[i]}: ${fmt(m)}/20; n=${a.length}`);});
  });
  $(id).innerHTML=legend(series.map(s=>[s.name,s.color]))+s+`<text x="282" y="276" text-anchor="middle">${xlabel}</text></svg>`;
}

function tree(){
  const low=records.filter(r=>r.G1<10), other=records.filter(r=>r.G1>=10),
    access=other.filter(r=>r.internet==='no'||r.traveltime>=3),
    rest=other.filter(r=>r.internet==='yes'&&r.traveltime<3);
  const node=(label,a,leaf=false)=>`<div class="tree-node ${leaf?'tree-leaf':''}">${label}<br><small>n=${a.length} · final mean ${fmt(mean(a))}</small></div>`;
  $('tree').innerHTML=node('First-period grade below 10?',records)+`<div class="tree-path"><div class="tree-branch"><small>↓ Yes</small>${node('Discuss learning support and barriers',low,true)}</div><div class="tree-branch"><small>↓ No</small>${node('No internet or commute above 30 min?',other)}<div class="tree-path"><div class="tree-branch"><small>↓ Yes</small>${node('Discuss access support',access,true)}</div><div class="tree-branch"><small>↓ No</small>${node('Check in; support on request',rest,true)}</div></div></div></div>`;
}

function statBand(){
  const any=records.filter(r=>r.failures>0), none=records.filter(r=>r.failures===0);
  const below=a=>100*a.filter(r=>r.G3<10).length/a.length;
  $('failure-stats').innerHTML=[
    [any.length?below(any).toFixed(1)+'%':'—','Below 10 · any past failure'],
    [mean(any).toFixed(2)+' / 20','Mean G3 · any past failure'],
    [none.length?below(none).toFixed(1)+'%':'—','Below 10 · no past failure'],
    [mean(none).toFixed(2)+' / 20','Mean G3 · no past failure']
  ].map(([n,l])=>`<div class="stat"><strong>${n}</strong><span>${l}</span></div>`).join('');
}

function render(){
  staircase();
  statBand();
  percentBars('support-chart',['0','1','2','3','4'],[
    {name:'School support received',color:teal,values:groups(context).map(a=>a.filter(r=>r.schoolsup==='yes'))},
    {name:'No school support',color:orange,values:groups(context).map(a=>a.filter(r=>r.schoolsup==='no'))}
  ],'Percent of course records with and without school support, by context factor count','Context factor count');
  const internet=records.filter(r=>r.internet==='yes'), noInternet=records.filter(r=>r.internet==='no');
  const series=[];
  for(const [name,color,a] of [['Internet at home',teal,internet],['No internet',orange,noInternet]])series.push({name,color,values:['G1','G2','G3'].map(g=>a.map(r=>({G3:r[g]})))});
  lines('internet',['G1','G2','G3'],series,'Grades over three periods by internet access','Grade period');
  tree();
}

function tip(event){
  const target=event.target.closest('[data-tip]');
  if(!target)return;
  const box=target.getBoundingClientRect(), tooltip=$('tooltip');
  tooltip.textContent=target.dataset.tip;
  tooltip.hidden=false;
  tooltip.style.left=Math.max(8,Math.min(window.innerWidth-270,event.clientX||box.x))+'px';
  tooltip.style.top=Math.max(8,Math.min(window.innerHeight-70,(event.clientY||box.y)-45))+'px';
}
document.addEventListener('pointerover',tip);
document.addEventListener('focusin',tip);
document.addEventListener('pointerout',()=>{$('tooltip').hidden=true;});
document.addEventListener('focusout',()=>{$('tooltip').hidden=true;});

fetch('data.json').then(r=>{if(!r.ok)throw Error('Data could not be loaded');return r.json();}).then(data=>{records=data.filter(r=>r.subject==='Portuguese');render();}).catch(e=>{document.querySelector('.intro-note').textContent=e.message;});
