'use strict';
const $=id=>document.getElementById(id), teal='#2f6f4e', orange='#c4841d'; // names are historical: teal = pass (green), orange = below 10 (amber)
let all=[], records=[];
const mean=a=>a.length?a.reduce((s,r)=>s+r.G3,0)/a.length:null;
const context=r=>+(r.internet==='no')+ +(r.traveltime>=3)+ +(r.Medu<3)+ +(r.Fedu<3);
const behavior=r=>+(r.studytime===1)+ +(r.Dalc>=3)+ +(r.Walc>=3)+ +(r.higher==='no');
const groups=(fn,n=5)=>Array.from({length:n},(_,i)=>records.filter(r=>fn(r)===i));
const fmt=n=>n===null?'No records':n.toFixed(1);
const quantile=(values,p)=>{const i=(values.length-1)*p,lo=Math.floor(i),hi=Math.ceil(i);return values[lo]+(values[hi]-values[lo])*(i-lo);};
function svgStart(title,ylabel='Mean grade / 20'){return `<svg viewBox="0 0 540 285" role="img" aria-label="${title}"><text x="45" y="13">${ylabel}</text>`;}
function axes(labels,top=20,step=5){let s='';for(let y=0;y<=top;y+=step){let py=230-y*200/top;s+=`<line x1="45" y1="${py}" x2="520" y2="${py}" stroke="#e1e5dc"/><text x="34" y="${py+4}" text-anchor="end">${y}</text>`;}labels.forEach((label,i)=>s+=`<text x="${xpos(i,labels.length)}" y="252" text-anchor="middle">${label}</text>`);return s;}
const xpos=(i,n)=>45+(i+.5)*475/n;
function mark(tag,attrs,tip){return `<${tag} ${attrs} tabindex="0" data-tip="${tip}" aria-label="${tip}"><title>${tip}</title></${tag}>`;}
function legend(items){return `<div class="legend">${items.map(([label,color])=>`<span><i style="background:${color}"></i>${label}</span>`).join('')}</div>`;}

// Three box plots of final grade, one per familiar demographic factor, shown one at a time in a carousel.
const BOX_CHARTS=[
  {id:'nursery',title:'Final grade by nursery attendance',test:r=>r.nursery,groups:[
    {key:'yes',label:'Attended nursery',tip:'Attended nursery',legend:'Attended nursery school',sub:'attended nursery school',color:teal},
    {key:'no',label:'No nursery',tip:'Did not attend nursery',legend:'Did not attend nursery school',sub:'did not attend nursery',color:orange}]},
  {id:'famsize',title:'Final grade by family size',test:r=>r.famsize,groups:[
    {key:'LE3',label:'3 or fewer',tip:'3 or fewer people',legend:'3 or fewer people',sub:'people in household',color:teal},
    {key:'GT3',label:'More than 3',tip:'More than 3 people',legend:'More than 3 people',sub:'people in household',color:orange}]},
  {id:'paid',title:'Final grade by paid classes',test:r=>r.paid,groups:[
    {key:'yes',label:'Paid classes',tip:'Took extra paid classes',legend:'Took extra paid classes',sub:'with extra paid classes',color:teal},
    {key:'no',label:'No paid classes',tip:'No extra paid classes',legend:'No extra paid classes',sub:'without paid classes',color:orange}]}
];
function boxplotChart(cfg){
  const cohorts=cfg.groups.map(group=>{
    const values=records.filter(r=>cfg.test(r)===group.key).map(r=>r.G3).sort((a,b)=>a-b);
    const q1=quantile(values,.25),median=quantile(values,.5),q3=quantile(values,.75),iqr=q3-q1;
    const low=values.find(v=>v>=q1-1.5*iqr),high=[...values].reverse().find(v=>v<=q3+1.5*iqr);
    return {...group,values,q1,median,q3,low,high,outliers:values.filter(v=>v<low||v>high)};
  });
  const y=value=>292-value*11.2,centers=[245,505],boxWidth=118;
  const [gA,gB]=cohorts,sameMed=gA.median===gB.median,sameBox=gA.q1===gB.q1&&gA.q3===gB.q3;
  const num=v=>Number.isInteger(v)?String(v):v.toFixed(1);
  const boxText=sameBox?`the same middle 50% (${num(gA.q1)} to ${num(gA.q3)})`:`middle 50% of ${num(gA.q1)} to ${num(gA.q3)} versus ${num(gB.q1)} to ${num(gB.q3)}`;
  const desc=`Two box plots of final grade, ${gA.tip.toLowerCase()} versus ${gB.tip.toLowerCase()}: medians of ${num(gA.median)} and ${num(gB.median)}, with ${boxText}.`;
  let svg=`<svg viewBox="0 0 720 360" role="img" aria-labelledby="${cfg.id}-title ${cfg.id}-desc"><title id="${cfg.id}-title">${cfg.title}</title><desc id="${cfg.id}-desc">${desc}</desc>`;
  svg+='<rect x="72" y="180" width="608" height="112" fill="#c4841d" fill-opacity=".06"/>';
  for(let value=0;value<=20;value+=5){const py=y(value);svg+=`<line x1="72" y1="${py}" x2="680" y2="${py}" stroke="#ded9d0"/><text x="59" y="${py+4}" text-anchor="end">${value}</text>`;}
  svg+='<text x="72" y="20">Final grade / 20</text><line x1="72" y1="180" x2="680" y2="180" stroke="#1f2a24" stroke-width="1.6" stroke-dasharray="7 5"/><text class="pass-label" x="80" y="170" text-anchor="start">Passing line: 10</text>';
  cohorts.forEach((group,index)=>{
    const x=centers[index],tip=`${group.tip}; median ${fmt(group.median)}; middle 50% ${fmt(group.q1)} to ${fmt(group.q3)}; n=${group.values.length}`;
    svg+=`<g tabindex="0" data-tip="${tip}" aria-label="${tip}"><title>${tip}</title>`;
    svg+=`<line x1="${x}" y1="${y(group.high)}" x2="${x}" y2="${y(group.low)}" stroke="${group.color}" stroke-width="3"/><line x1="${x-28}" y1="${y(group.high)}" x2="${x+28}" y2="${y(group.high)}" stroke="${group.color}" stroke-width="3"/><line x1="${x-28}" y1="${y(group.low)}" x2="${x+28}" y2="${y(group.low)}" stroke="${group.color}" stroke-width="3"/>`;
    svg+=`<rect x="${x-boxWidth/2}" y="${y(group.q3)}" width="${boxWidth}" height="${y(group.q1)-y(group.q3)}" rx="8" fill="${group.color}" fill-opacity=".18" stroke="${group.color}" stroke-width="3"/><line x1="${x-boxWidth/2}" y1="${y(group.median)}" x2="${x+boxWidth/2}" y2="${y(group.median)}" stroke="${group.color}" stroke-width="4"/>`;
    svg+=`<text class="median-label" x="${x+boxWidth/2+10}" y="${y(group.median)+4}">${num(group.median)}</text>`;
    svg+='</g>';
    svg+=`<text class="box-label" x="${x}" y="326" text-anchor="middle">${group.label}</text><text class="box-sublabel" x="${x}" y="343" text-anchor="middle">${group.sub} · n=${group.values.length}</text>`;
  });
  svg+='<path d="M245 71 V50 H505 V71" fill="none" stroke="#1f2a24" stroke-width="1.5"/><text class="annotation" x="375" y="42" text-anchor="middle">'+(sameBox?(sameMed?'The boxes align exactly':'The boxes span the same range'):'The boxes overlap heavily')+'</text></svg>';
  $(cfg.id+'-takeaway').innerHTML=(sameMed?`<strong>Same median: ${num(gA.median)}</strong>`:`<strong>Medians: ${num(gA.median)} vs ${num(gB.median)}</strong>`)+`<span>${sameBox?'Same':'Similar'} middle 50%: ${num(gA.q1)}–${num(gA.q3)}${sameBox?'':' vs '+num(gB.q1)+'–'+num(gB.q3)}</span>`;
  $(cfg.id+'-box').innerHTML=legend(cohorts.map(group=>[group.legend,group.color]))+svg;
}
function boxCharts(){BOX_CHARTS.forEach(boxplotChart);}

// Carousel: arrows (and dots, and the left/right keys) flip between the three charts.
let boxIndex=0;
function showBox(i){
  boxIndex=(i+BOX_CHARTS.length)%BOX_CHARTS.length;
  BOX_CHARTS.forEach((cfg,k)=>{$(cfg.id).hidden=k!==boxIndex;});
  document.querySelectorAll('#box-dots button').forEach((b,k)=>b.setAttribute('aria-current',String(k===boxIndex)));
  $('box-status').textContent=`${boxIndex+1} of ${BOX_CHARTS.length}`;
}
document.addEventListener('click',e=>{
  if(e.target.closest('#box-prev'))return showBox(boxIndex-1);
  if(e.target.closest('#box-next'))return showBox(boxIndex+1);
  const dot=e.target.closest('#box-dots button');if(dot)showBox(+dot.dataset.i);
});
document.addEventListener('keydown',e=>{
  if(!e.target.closest||!e.target.closest('#box-carousel')||e.target.closest('.tip-pop'))return;
  if(e.key==='ArrowLeft'){e.preventDefault();showBox(boxIndex-1);}
  if(e.key==='ArrowRight'){e.preventDefault();showBox(boxIndex+1);}
});

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
    svg+=`<g class="stair-figure" role="img" aria-label="Animated illustration of a person stepping down each step of the staircase"><g transform="translate(125,${top-2})"><g class="stair-stepper" fill="none" stroke="${orange}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="-43" r="5" fill="${orange}" stroke="none"/><path d="M3 -35 L-2 -18 L-8 0 M-2 -18 L13 -7 L18 -11 M1 -30 L-13 -39 M1 -30 L17 -36"/></g></g><text x="${edge+30}" y="${top-38}" fill="${orange}" font-size="10">Illustration</text></g>`;
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

function tree(){
  drawSupportTree($('tree'),records);
}

function statBand(){
  const any=records.filter(r=>r.failures>0), none=records.filter(r=>r.failures===0);
  const below=a=>100*a.filter(r=>r.G3<10).length/a.length;
  const pct=v=>v.toFixed(1)+'%';
  const avg=a=>a.length?mean(a).toFixed(2):'—';
  $('failure-body').textContent=`Among students with any past failure, ${pct(below(any))} score below 10 and mean G3 is ${avg(any)}; among students with no past failure, ${pct(below(none))} score below 10 and mean G3 is ${avg(none)}. Past academic history therefore provides the school board with a concrete group for early attention.`;
  $('failure-stats').innerHTML=[
    [any.length?below(any).toFixed(1)+'%':'—','Below 10 · any past failure'],
    [avg(any)+' / 20','Mean G3 · any past failure'],
    [none.length?below(none).toFixed(1)+'%':'—','Below 10 · no past failure'],
    [avg(none)+' / 20','Mean G3 · no past failure']
  ].map(([n,l])=>`<div class="stat"><strong>${n}</strong><span>${l}</span></div>`).join('');
}



// Click-to-progress: stage 1 shows G1, stage 2 adds the G1→G2 flows, stage 3 adds G2→G3.
// A lime-green pop-up beside the newest column explains each stage; its button advances, then restarts.
let sankeyStage=1;
const SK_POP_X=[206,505,690];   // left edge of the pop-up, in the diagram's 0 to 1000 units, for each stage
const lvl=g=>g>=14?2:g>=10?1:0;
function sankeyCopy(stage){
  const no=records.filter(r=>r.higher==='no'),yes=records.filter(r=>r.higher==='yes');
  const pct=(rows,fn)=>rows.length?Math.round(100*rows.filter(fn).length/rows.length):0;
  if(!no.length||!yes.length)return {kicker:'',text:'No records in this view.'};
  if(stage===1)return {kicker:'G1 · FIRST PERIOD',text:`Students who do not plan higher education start weak: <strong>${pct(no,r=>r.G1<10)}%</strong> have failing grades (below 10) in the first grade period.`};
  if(stage===2){
    const top=pct(no,r=>r.G2>=14);
    return {kicker:'G1 → G2',text:`From G1 to G2, many students improve (<strong>${pct(no,r=>lvl(r.G2)>lvl(r.G1))}%</strong> of non-seekers climb a grade band), yet <strong>${pct(no,r=>r.G2<10)}%</strong> are still failing and ${top===0?'<strong>none</strong> reach':`only <strong>${top}%</strong> reach`} the high-achieving band (14 and above).`};
  }
  return {kicker:'G3 · FINAL GRADE',text:`By the final grade, about half (<strong>${pct(no,r=>r.G3<10)}%</strong>) of students without higher-education plans fail the class and only <strong>${pct(no,r=>r.G3>=14)}%</strong> are high achieving. Students who plan higher education finish strong: <strong>${pct(yes,r=>lvl(r.G3)>lvl(r.G1))}%</strong> climb a grade band from G1 while only <strong>${pct(yes,r=>lvl(r.G3)<lvl(r.G1))}%</strong> slip, and <strong>${pct(yes,r=>r.G3>=14)}%</strong> end at 14 or above.`};
}
function placeSankeyPop(){
  const root=$('higher'),pop=$('sk-pop');
  if(!root||!pop)return;
  if(window.matchMedia('(max-width:760px)').matches){pop.style.left='';pop.style.top='';return;}   // below the diagram on phones
  const panels=[...root.querySelectorAll('.sankey-panel')];
  if(!panels.length)return;
  // Stages 1 and 2 are about the no-plans diagram (the lower one); stage 3 covers both.
  const first=sankeyStage<3?panels[panels.length-1]:panels[0],last=panels[panels.length-1];
  const top=first.offsetTop,bottom=last.offsetTop+last.offsetHeight;
  pop.style.left=(SK_POP_X[sankeyStage-1]/10)+'%';
  pop.style.top=Math.max(0,(top+bottom)/2-pop.offsetHeight/2)+'px';
}
function applySankeyStage(){
  const root=$('higher');
  root.querySelectorAll('.sk-step').forEach(el=>{
    const from=+el.dataset.from, until=el.dataset.until?+el.dataset.until:Infinity;
    const on=sankeyStage>=from&&sankeyStage<=until;
    el.classList.toggle('is-on',on);
    el.setAttribute('aria-hidden',String(!on));
    if(el.hasAttribute('tabindex'))el.setAttribute('tabindex',on?'0':'-1');
  });
  const pop=$('sk-pop');
  if(!pop)return;
  const copy=sankeyCopy(sankeyStage);
  pop.querySelector('.sk-kicker').textContent=copy.kicker;
  pop.querySelector('.sk-text').innerHTML=copy.text;
  $('sk-next').textContent=sankeyStage<3?'Next →':'Restart ↺';
  placeSankeyPop();
}
function advanceSankey(){sankeyStage=sankeyStage%3+1;applySankeyStage();}
document.addEventListener('click',e=>{if(e.target.closest('#sk-next'))advanceSankey();});
addEventListener('resize',placeSankeyPop);

function higherSankey(){
  const bands=[{name:'14 and above',color:teal},{name:'10 to 13',color:'#9fae8e'},{name:'Below 10',color:orange}];
  const band=g=>g>=14?0:g>=10?1:2, periods=['G1','G2','G3'], f=v=>v.toFixed(1);
  const X=[160,340,520], NW=16, TOP=40, GAP=10, SCALE=190;
  const panels=[['Plans higher education','yes'],['No higher-education plans','no']].map(([label,val])=>{
    const rows=records.filter(r=>r.higher===val), total=rows.length;
    if(!total)return `<div class="sankey-panel"><h4>${label}</h4><p>No records</p></div>`;
    const counts=periods.map(p=>[0,1,2].map(k=>rows.filter(r=>band(r[p])===k).length));
    const nodeY=counts.map(col=>{let y=TOP;return col.map(n=>{const t=y;y+=n/total*SCALE+GAP;return t;});});
    let svg=`<svg viewBox="0 0 1000 ${TOP+SCALE+2*GAP+14}" role="img" aria-label="Sankey diagram of grade bands from G1 to G3 for students: ${label.toLowerCase()}">`;
    periods.forEach((p,i)=>svg+=`<text class="sk-step" data-from="${i+1}" x="${X[i]+NW/2}" y="22" text-anchor="middle" style="font-weight:700">${p==='G3'?'G3 (final)':p}</text>`);
    for(let p=0;p<2;p++){
      const srcOff=[0,0,0],tgtOff=[0,0,0];
      for(let s=0;s<3;s++)for(let t=0;t<3;t++){
        const n=rows.filter(r=>band(r[periods[p]])===s&&band(r[periods[p+1]])===t).length;
        if(!n)continue;
        const h=n/total*SCALE,x0=X[p]+NW,x1=X[p+1],mx=(x0+x1)/2;
        const a0=nodeY[p][s]+srcOff[s],a1=nodeY[p+1][t]+tgtOff[t];
        srcOff[s]+=h;tgtOff[t]+=h;
        const d=`M${x0},${f(a0)} C${mx},${f(a0)} ${mx},${f(a1)} ${x1},${f(a1)} L${x1},${f(a1+h)} C${mx},${f(a1+h)} ${mx},${f(a0+h)} ${x0},${f(a0+h)} Z`;
        svg+=mark('path',`class="sk-step" data-from="${p+2}" d="${d}" fill="${bands[s].color}" fill-opacity="${s===t?.38:.62}" stroke="#fff" stroke-width=".5"`,`${label}: ${n} of ${total} records (${(100*n/total).toFixed(1)}%) go from ${bands[s].name} in ${periods[p]} to ${bands[t].name} in ${periods[p+1]}`);
      }
    }
    periods.forEach((p,i)=>counts[i].forEach((n,k)=>{
      if(!n)return;
      const h=n/total*SCALE,pc=(100*n/total).toFixed(0),cy=nodeY[i][k]+h/2+4;
      svg+=mark('rect',`class="sk-step" data-from="${i+1}" x="${X[i]}" y="${f(nodeY[i][k])}" width="${NW}" height="${f(h)}" fill="${bands[k].color}"`,`${label}, ${p}: ${bands[k].name}, ${pc}% (${n} of ${total} records)`);
      if(i===0)svg+=`<text class="sk-step" data-from="1" x="${X[0]-8}" y="${f(cy)}" text-anchor="end">${bands[k].name} · ${pc}%</text>`;
      if(i===1)svg+=`<text class="sk-step" data-from="2" data-until="2" x="${X[1]+NW+8}" y="${f(cy)}">${pc}% · ${bands[k].name}</text>`;
      if(i===2)svg+=`<text class="sk-step" data-from="3" x="${X[2]+NW+8}" y="${f(cy)}">${pc}% · ${bands[k].name}</text>`;
    }));
    return `<div class="sankey-panel"><h4>${label} <span>n=${total}</span></h4><div class="sankey-wrap">${svg}</svg></div></div>`;
  });
  const pop='<div class="sk-pop" id="sk-pop"><p class="sk-kicker"></p><p class="sk-text" aria-live="polite"></p><button type="button" id="sk-next" class="sk-next-btn">Next →</button></div>';
  $('higher').innerHTML=legend(bands.map(b=>[b.name,b.color]))+panels.join('')+pop;
  applySankeyStage();
}

let currentSupport='schoolsup';
function supportChart(key){
  currentSupport=key;
  const school=key==='schoolsup', name=school?'school':'family';
  const g=groups(context), has=a=>a.filter(r=>r[key]==='yes'), no=a=>a.filter(r=>r[key]==='no');
  percentBars('support-chart',['0','1','2','3','4'],[
    {name:`${school?'School':'Family'} support received`,color:teal,values:g.map(has)},
    {name:`No ${name} support`,color:orange,values:g.map(no)}
  ],`Percent of course records with and without ${name} support, by context factor count`,'Context factor count');
  const share=rows=>rows.length?100*has(rows).length/rows.length:null;
  const low=records.filter(r=>context(r)<=1), high=records.filter(r=>context(r)>=3);
  const pct=v=>v===null?'—':v.toFixed(0)+'%';
  const first=share(g[0]), last=share(g[4]), lo=share(low), hi=share(high);
  const peak=g.map(share).reduce((b,v,i)=>v!==null&&v>b[0]?[v,i]:b,[-1,0]);
  const title=$('support-title'), text=$('support-text'), note=$('support-note');
  if(school){
    title.textContent='School support does not follow disadvantage';
    text.innerHTML=`School support is <strong>not offered at higher rates to students with more disadvantages</strong>. ${pct(lo)} of records with 0 or 1 context factors receive it, compared with ${pct(hi)} of records with 3 or 4. The share is ${pct(first)} at zero factors, peaks at ${pct(peak[0])} with ${peak[1]} factors and falls to ${pct(last)} at four, so the students facing the most barriers are no more likely to be reached.`;
    note.textContent='School support is a yes/no record, not a measure of how much help was given. Groups with three or four factors are small, so their shares are unstable. Differences cannot measure the benefit of support.';
  }else{
    title.textContent='Family support is highest with the fewest disadvantages';
    text.innerHTML=`Family support is <strong>higher where the disadvantage count is low</strong>. ${pct(lo)} of records with 0 or 1 context factors receive it, compared with ${pct(hi)} of records with 3 or 4. The share falls from ${pct(first)} at zero factors to ${pct(last)} at four, so families facing the most barriers are the least likely to report extra help at home.`;
    note.textContent='Family support is a yes/no record, not a measure of how much help was given. Groups with three or four factors are small, so their shares are unstable. This is an association, not a cause.';
  }
  document.querySelectorAll('.support-toggle button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.support===key)));
}
document.addEventListener('click',e=>{const b=e.target.closest('.support-toggle button');if(b)supportChart(b.dataset.support);});

// The overview filters (subject, school) change only these four statistics; every chart below keeps using all records.
function updateStats(){
  const subject=$('subject').value, school=$('school').value;
  const rows=all.filter(r=>(subject==='all'||r.subject===subject)&&(school==='all'||r.school===school));
  const pass=rows.filter(r=>r.G3>=10).length,net=rows.filter(r=>r.internet==='yes').length,pct=n=>rows.length?(100*n/rows.length).toFixed(1)+'%':'—';
  $('stats').innerHTML=[[rows.length.toLocaleString(),'Course records'],[fmt(mean(rows))+' / 20','Mean final grade'],[pct(pass),'Student pass rate'],[pct(net),'Percent of Students with Internet Access at Home']].map(([n,l])=>`<div class="stat"><strong>${n}</strong><span>${l}</span></div>`).join('');
  $('filter-status').textContent=`${rows.length.toLocaleString()} of ${all.length.toLocaleString()} records`;
}
function updateCounts(){
  const n=records.length.toLocaleString();
  for(const id of ['nursery-n','famsize-n','paid-n','higher-n','failure-n']){const el=$(id);if(el)el.textContent=n;}
}

function render(){
  boxCharts();
  staircase();
  statBand();
  supportChart(currentSupport);
  higherSankey();
  tree();
  if(window.drawLinkedViews)window.drawLinkedViews(records);
}

function tip(event){
  const target=event.target.closest('[data-tip]');
  if(!target||target.closest('#network-chart'))return;
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

try{
  all=records=window.SCHOOL_DATA;
  for(const id of ['subject','school'])$(id).addEventListener('change',updateStats);
  $('reset').onclick=()=>{$('subject').value='all';$('school').value='all';updateStats();};
  updateStats();
  updateCounts();
  render();
  showBox(0);
}catch(e){document.querySelector('.intro-note').textContent='Data could not be loaded';}
