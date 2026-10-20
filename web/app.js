'use strict';
const $=id=>document.getElementById(id), teal='#2563a6', orange='#c46743';
let all=[], records=[];
const mean=a=>a.length?a.reduce((s,r)=>s+r.G3,0)/a.length:null;
const context=r=>+(r.internet==='no')+ +(r.traveltime>=3)+ +(r.Medu<3)+ +(r.Fedu<3);
const behavior=r=>+(r.studytime===1)+ +(r.Dalc>=3)+ +(r.Walc>=3)+ +(r.higher==='no');
const groups=(fn,n=5)=>Array.from({length:n},(_,i)=>records.filter(r=>fn(r)===i));
const fmt=n=>n===null?'No records':n.toFixed(1);
function svgStart(title,ylabel='Mean grade / 20'){return `<svg viewBox="0 0 540 285" role="img" aria-label="${title}"><text x="45" y="13">${ylabel}</text>`;}
function axes(labels,top=20,step=5){let s='';for(let y=0;y<=top;y+=step){let py=230-y*200/top;s+=`<line x1="45" y1="${py}" x2="520" y2="${py}" stroke="#e1e5dc"/><text x="34" y="${py+4}" text-anchor="end">${y}</text>`;}labels.forEach((label,i)=>s+=`<text x="${xpos(i,labels.length)}" y="252" text-anchor="middle">${label}</text>`);return s;}
const xpos=(i,n)=>45+(i+.5)*475/n;
function mark(tag,attrs,tip){return `<${tag} ${attrs} tabindex="0" data-tip="${tip}" aria-label="${tip}"><title>${tip}</title></${tag}>`;}
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
  absences: {label: 'Absences (days)', min: 0, max: 100, ticks: [0, 20, 40, 60, 80, 100]},
  age: {label: 'Age (years)', min: 15, max: 22, ticks: [15, 16, 17, 18, 19, 20, 21, 22]},
  G1: {label: 'First-period grade (G1)', min: 0, max: 20, ticks: [0, 5, 10, 15, 20]},
  G2: {label: 'Second-period grade (G2)', min: 0, max: 20, ticks: [0, 5, 10, 15, 20]},
  G3: {label: 'Final grade (G3)', min: 0, max: 20, ticks: [0, 5, 10, 15, 20]}
};

function matrix() {
  const cohort = $('scatter-cohort').value;
  const rows = records.filter(r => cohort === 'all' || r.internet === cohort);
  const variables = ['absences', 'age', 'G1', 'G3'];
  const shortLabels = ['Absences (days)', 'Age (years)', 'First grade (G1)', 'Final grade (G3)'];
  const size = 218, offset = 54, padding = 23, span = 170;
  let svg = '<svg viewBox="0 0 960 960" role="img" aria-label="Scatterplot matrix of absences, age, first-period grade and final grade"><title>Rows give vertical variables; columns give horizontal variables. Diagonal cells show distributions.</title>';
  $('matrix-count').textContent = `${rows.length.toLocaleString()} course records`;

  variables.forEach((key, i) => {
    const center = offset + i * size + size / 2;
    svg += `<text x="${center}" y="26" text-anchor="middle" class="matrix-label">${shortLabels[i]}</text><text transform="translate(16,${center}) rotate(-90)" text-anchor="middle" class="matrix-label">${shortLabels[i]}</text>`;
  });

  variables.forEach((yKey, yi) => variables.forEach((xKey, xi) => {
    const x = measures[xKey], y = measures[yKey];
    const left = offset + xi * size, top = offset + yi * size;
    const px = value => padding + (value-x.min)/(x.max-x.min)*span;
    const py = value => padding + span - (value-y.min)/(y.max-y.min)*span;
    const ticks = m => m.ticks.filter((_,i) => m.ticks.length <= 5 || i%2 === 0 || i === m.ticks.length-1);
    svg += `<g transform="translate(${left},${top})" data-cell="${yKey}-${xKey}"><rect x="3" y="3" width="212" height="212" fill="${xi===yi?'#f1f5f9':'white'}" stroke="#e2e8f0" rx="3"/>`;
    if (xi === yi) {
      const bins = Array.from({length:10}, () => 0);
      rows.forEach(r => bins[Math.min(9,Math.floor((r[xKey]-x.min)/(x.max-x.min)*10))]++);
      const max = Math.max(1,...bins);
      bins.forEach((n,i) => {
        const height = n/max*125;
        const low = x.min+i*(x.max-x.min)/10, high = x.min+(i+1)*(x.max-x.min)/10;
        const tip = `${x.label}: ${low.toFixed(1)} to ${high.toFixed(1)}${i===9?' (inclusive upper bound)':' (upper bound excluded)'}; ${n} course records`;
        svg += mark('rect', `x="${padding+i*span/10}" y="${padding+span-height}" width="${span/10-2}" height="${height}" fill="${teal}" fill-opacity=".65" data-bin-count="${n}"`,tip);
      });
      svg += '<text x="108" y="32" text-anchor="middle" class="distribution-label">Distribution</text>';
    } else {
      ticks(y).forEach(v => svg += `<line x1="${padding}" x2="${padding+span}" y1="${py(v)}" y2="${py(v)}" stroke="#f1f5f9"/>`);
      ticks(x).forEach(v => svg += `<line y1="${padding}" y2="${padding+span}" x1="${px(v)}" x2="${px(v)}" stroke="#f1f5f9"/>`);
      const points = new Map();
      rows.forEach(r => {
        const key = `${r[xKey]},${r[yKey]}`;
        const point = points.get(key) || {x:r[xKey],y:r[yKey],n:0};
        point.n++; points.set(key,point);
      });
      [...points.values()].sort((a,b)=>b.n-a.n).forEach(p => {
        svg += mark('circle', `cx="${px(p.x)}" cy="${py(p.y)}" r="${.95*Math.sqrt(p.n)}" fill="${teal}" fill-opacity=".32" stroke="${teal}" stroke-opacity=".5" stroke-width=".6" data-count="${p.n}"`, `${x.label}: ${p.x}; ${y.label}: ${p.y}; ${p.n} course records`);
      });
      if (!rows.length) svg += '<text x="108" y="110" text-anchor="middle">No records</text>';
    }
    ticks(x).forEach(v => svg += `<text x="${px(v)}" y="208" text-anchor="middle">${v}</text>`);
    if (xi !== yi) ticks(y).forEach(v => svg += `<text x="18" y="${py(v)+3}" text-anchor="end">${v}</text>`);
    svg += '</g>';
  }));
  $('matrix').innerHTML = svg + '</svg>';
}

function render(){records=all.filter(r=>($('subject').value==='all'||r.subject===$('subject').value)&&($('school').value==='all'||r.school===$('school').value));let pass=records.filter(r=>r.G3>=10).length,net=records.filter(r=>r.internet==='yes').length;$('stats').innerHTML=[[records.length.toLocaleString(),'Course records'],[fmt(mean(records))+' / 20','Mean final grade'],[records.length?(100*pass/records.length).toFixed(1)+'%':'—','Final grade ≥10'],[records.length?(100*net/records.length).toFixed(1)+'%':'—','Internet at home']].map(([n,l])=>`<div class="stat"><strong>${n}</strong><span>${l}</span></div>`).join('');$('filter-status').textContent=`${records.length} records in this view`;
staircase();
let key=$('support').value;percentBars('support-chart',['0','1','2','3','4'],[{name:'Support received',color:teal,values:groups(context).map(a=>a.filter(r=>r[key]==='yes'))},{name:'No support',color:orange,values:groups(context).map(a=>a.filter(r=>r[key]==='no'))}],'Percent of course records with and without support, by context factor count','Context factor count');
lines('factors',['0','1','2','3','4'],[{name:'Context factors',color:teal,values:groups(context)},{name:'Behavior factors',color:orange,values:groups(behavior)}],'Final grade by factor count','Factor count');
let internet=records.filter(r=>r.internet==='yes'),noInternet=records.filter(r=>r.internet==='no');let internetSeries=[];for(let [name,color,a] of [['Internet at home',teal,internet],['No internet',orange,noInternet]])internetSeries.push({name,color,values:['G1','G2','G3'].map(g=>a.map(r=>({G3:r[g]})))});lines('internet',['G1','G2','G3'],internetSeries,'Grades over three periods by internet access','Grade period');tree();behaviorByContext();matrix();}
function exportCsv(){let keys=Object.keys(all[0]),quote=v=>'"'+String(v).replaceAll('"','""')+'"';let csv=[keys.map(quote).join(','),...records.map(r=>keys.map(k=>quote(r[k])).join(','))].join('\r\n');let url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='school-success-filtered.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
for(let id of ['subject','school','support','scatter-cohort'])$(id).addEventListener('change',render);
$('reset').onclick=()=>{$('subject').value='all';$('school').value='all';$('support').value='schoolsup';$('scatter-cohort').value='all';render();};$('export').onclick=exportCsv;
function tip(event){let target=event.target.closest('[data-tip]');if(!target)return;let box=target.getBoundingClientRect(),tooltip=$('tooltip');tooltip.textContent=target.dataset.tip;tooltip.hidden=false;tooltip.style.left=Math.max(8,Math.min(window.innerWidth-270,event.clientX||box.x))+'px';tooltip.style.top=Math.max(8,Math.min(window.innerHeight-70,(event.clientY||box.y)-45))+'px';}
document.addEventListener('pointerover',tip);document.addEventListener('focusin',tip);document.addEventListener('pointerout',()=>{$('tooltip').hidden=true;});document.addEventListener('focusout',()=>{$('tooltip').hidden=true;});
fetch('data.json').then(r=>{if(!r.ok)throw Error('Data could not be loaded');return r.json();}).then(data=>{all=data;render();}).catch(e=>{$('filter-status').textContent=e.message;});

const dotLinks=[...document.querySelectorAll('.dots a')];
if('IntersectionObserver' in window){const view=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting)dotLinks.forEach(d=>d.classList.toggle('active',d.getAttribute('href')==='#'+e.target.id));}),{rootMargin:'-40% 0px -40% 0px'});document.querySelectorAll('.grid>.card').forEach(c=>view.observe(c));}
