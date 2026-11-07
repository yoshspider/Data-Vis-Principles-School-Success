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

function familyBoxplot(){
  const cohorts=[
    {key:'LE3',label:'3 or fewer',color:teal},
    {key:'GT3',label:'More than 3',color:orange}
  ].map(group=>{
    const values=records.filter(r=>r.famsize===group.key).map(r=>r.G3).sort((a,b)=>a-b);
    const q1=quantile(values,.25),median=quantile(values,.5),q3=quantile(values,.75),iqr=q3-q1;
    const low=values.find(v=>v>=q1-1.5*iqr),high=[...values].reverse().find(v=>v<=q3+1.5*iqr);
    return {...group,values,q1,median,q3,low,high,outliers:values.filter(v=>v<low||v>high)};
  });
  const y=value=>292-value*11.2,centers=[245,505],boxWidth=118;
  const [gA,gB]=cohorts,sameMed=gA.median===gB.median,sameBox=gA.q1===gB.q1&&gA.q3===gB.q3;
  const num=v=>Number.isInteger(v)?String(v):v.toFixed(1);
  const boxText=sameBox?`the same middle 50% (${num(gA.q1)} to ${num(gA.q3)})`:`middle 50% of ${num(gA.q1)} to ${num(gA.q3)} versus ${num(gB.q1)} to ${num(gB.q3)}`;
  const famDesc=`Two box plots of final grade by household size: medians of ${num(gA.median)} and ${num(gB.median)}, with ${boxText}.`;
  let svg='<svg viewBox="0 0 720 360" role="img" aria-labelledby="famsize-title famsize-desc"><title id="famsize-title">Final grade by family size</title><desc id="famsize-desc">'+famDesc+'</desc>';
  svg+='<rect x="72" y="180" width="608" height="112" fill="#c4841d" fill-opacity=".06"/>';
  for(let value=0;value<=20;value+=5){const py=y(value);svg+=`<line x1="72" y1="${py}" x2="680" y2="${py}" stroke="#ded9d0"/><text x="59" y="${py+4}" text-anchor="end">${value}</text>`;}
  svg+='<text x="72" y="20">Final grade / 20</text><line x1="72" y1="180" x2="680" y2="180" stroke="#1f2a24" stroke-width="1.6" stroke-dasharray="7 5"/><text class="pass-label" x="80" y="170" text-anchor="start">Passing line: 10</text>';
  cohorts.forEach((group,index)=>{
    const x=centers[index],tip=`${group.label} people; median ${fmt(group.median)}; middle 50% ${fmt(group.q1)} to ${fmt(group.q3)}; n=${group.values.length}`;
    svg+=`<g tabindex="0" data-tip="${tip}" aria-label="${tip}"><title>${tip}</title>`;
    svg+=`<line x1="${x}" y1="${y(group.high)}" x2="${x}" y2="${y(group.low)}" stroke="${group.color}" stroke-width="3"/><line x1="${x-28}" y1="${y(group.high)}" x2="${x+28}" y2="${y(group.high)}" stroke="${group.color}" stroke-width="3"/><line x1="${x-28}" y1="${y(group.low)}" x2="${x+28}" y2="${y(group.low)}" stroke="${group.color}" stroke-width="3"/>`;
    svg+=`<rect x="${x-boxWidth/2}" y="${y(group.q3)}" width="${boxWidth}" height="${y(group.q1)-y(group.q3)}" rx="8" fill="${group.color}" fill-opacity=".18" stroke="${group.color}" stroke-width="3"/><line x1="${x-boxWidth/2}" y1="${y(group.median)}" x2="${x+boxWidth/2}" y2="${y(group.median)}" stroke="${group.color}" stroke-width="4"/>`;
    svg+=`<text class="median-label" x="${x+boxWidth/2+10}" y="${y(group.median)+4}">${num(group.median)}</text>`;
    group.outliers.forEach((value,outlierIndex)=>{const offset=(outlierIndex-(group.outliers.length-1)/2)*5;svg+=`<circle cx="${x+offset}" cy="${y(value)}" r="3.5" fill="${group.color}" fill-opacity=".62"/>`;});
    svg+='</g>';
    svg+=`<text class="box-label" x="${x}" y="326" text-anchor="middle">${group.label}</text><text class="box-sublabel" x="${x}" y="343" text-anchor="middle">people in household · n=${group.values.length}</text>`;
  });
  svg+='<path d="M245 71 V50 H505 V71" fill="none" stroke="#1f2a24" stroke-width="1.5"/><text class="annotation" x="375" y="42" text-anchor="middle">'+(sameBox?(sameMed?'The boxes align exactly':'The boxes span the same range'):'The boxes overlap heavily')+'</text></svg>';
  $('famsize-takeaway').innerHTML=(sameMed?`<strong>Same median: ${num(gA.median)}</strong>`:`<strong>Medians: ${num(gA.median)} vs ${num(gB.median)}</strong>`)+`<span>${sameBox?'Same':'Similar'} middle 50%: ${num(gA.q1)}–${num(gA.q3)}${sameBox?'':' vs '+num(gB.q1)+'–'+num(gB.q3)}</span>`;
  $('famsize-box').innerHTML=legend(cohorts.map(group=>[group.label+' people',group.color]))+svg;
}

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
let sankeyStage=1;
const SANKEY_LABELS=['Show G2 →','Show G3 →','Start over ↺'];
function applySankeyStage(){
  const root=$('higher');
  root.querySelectorAll('.sk-step').forEach(el=>{
    const from=+el.dataset.from, until=el.dataset.until?+el.dataset.until:Infinity;
    const on=sankeyStage>=from&&sankeyStage<=until;
    el.classList.toggle('is-on',on);
    el.setAttribute('aria-hidden',String(!on));
    if(el.hasAttribute('tabindex'))el.setAttribute('tabindex',on?'0':'-1');
  });
  root.querySelectorAll('.sk-nav').forEach(el=>{
    const on=+el.dataset.show===sankeyStage;
    el.classList.toggle('is-on',on);
    el.setAttribute('aria-hidden',String(!on));
    el.setAttribute('tabindex',on?'0':'-1');
  });
  const btn=$('sankey-next'),step=$('sankey-step');
  if(btn)btn.textContent=SANKEY_LABELS[sankeyStage-1];
  if(step)step.textContent=`Step ${sankeyStage} of 3 · ${['G1 grades','G1 → G2','G2 → G3 (final)'][sankeyStage-1]}`;
}
function advanceSankey(){sankeyStage=sankeyStage%3+1;applySankeyStage();}
// Jumps to the step an arrow points at; from the keyboard, focus moves to the same panel's new arrow.
function goSankey(arrow,fromKeyboard){
  const panel=arrow.closest('.sankey-panel'),index=[...$('higher').querySelectorAll('.sankey-panel')].indexOf(panel);
  sankeyStage=+arrow.dataset.go;applySankeyStage();
  const next=fromKeyboard&&$('higher').querySelectorAll('.sankey-panel')[index];
  if(next){const target=next.querySelector('.sk-nav.is-on');if(target)target.focus();}
}
document.addEventListener('keydown',e=>{
  const arrow=e.target.closest&&e.target.closest('#higher .sk-nav');
  if(arrow&&(e.key==='Enter'||e.key===' ')){e.preventDefault();goSankey(arrow,true);}
});
document.addEventListener('click',e=>{
  const arrow=e.target.closest('#higher .sk-nav');
  if(arrow)return goSankey(arrow,false);
  if(e.target.closest('#sankey-next'))return advanceSankey();
  if(sankeyStage<3&&e.target.closest('#higher .sankey-wrap'))advanceSankey();
});

function higherSankey(){
  const bands=[{name:'14 and above',color:teal},{name:'10 to 13',color:'#9fae8e'},{name:'Below 10',color:orange}];
  const band=g=>g>=14?0:g>=10?1:2, periods=['G1','G2','G3'], f=v=>v.toFixed(1);
  const X=[190,410,630], NW=16, TOP=40, GAP=10, SCALE=190;
  const take=[];
  const panels=[['Plans higher education','yes'],['No higher-education plans','no']].map(([label,val])=>{
    const rows=records.filter(r=>r.higher===val), total=rows.length;
    if(!total)return `<div class="sankey-panel"><h4>${label}</h4><p>No records</p></div>`;
    const counts=periods.map(p=>[0,1,2].map(k=>rows.filter(r=>band(r[p])===k).length));
    const nodeY=counts.map(col=>{let y=TOP;return col.map(n=>{const t=y;y+=n/total*SCALE+GAP;return t;});});
    take.push([label,100*counts[2][2]/total,100*counts[2][0]/total,100*counts[2][1]/total,total]);
    let svg=`<svg viewBox="0 0 860 ${TOP+SCALE+2*GAP+14}" role="img" aria-label="Sankey diagram of grade bands from G1 to G3 for students: ${label.toLowerCase()}">`;
    periods.forEach((p,i)=>svg+=`<text class="sk-step" data-from="${i+1}" x="${X[i]+NW/2}" y="22" text-anchor="middle" style="font-weight:700">${p==='G3'?'G3 (final)':p}</text>`);
    // Arrow buttons beside the newest heading move between steps: → after G1 reveals G2; at G2,
    // ← goes back to G1 and → expands to G3; at G3, ← goes back to G2.
    // Forward arrows are solid pills like the step button; back arrows are light outlined pills.
    const nav=(show,go,x,dir)=>{
      const label=`${go>show?'Show':'Back to'} ${periods[go-1]}`, tip=x+5*dir, tail=x-6*dir;
      return `<g class="sk-nav ${dir>0?'sk-next':'sk-back'}" data-show="${show}" data-go="${go}" role="button" tabindex="-1" aria-hidden="true" aria-label="${label}"><title>${label}</title>`
        +`<rect x="${x-17}" y="6" width="34" height="22" rx="11"/><path class="sk-icon" d="M${tail},17 H${tip} M${tip-4*dir},12.5 L${tip},17 L${tip-4*dir},21.5"/></g>`;
    };
    svg+=nav(1,2,X[0]+NW/2+30,1)+nav(2,1,X[1]+NW/2-30,-1)+nav(2,3,X[1]+NW/2+30,1)+nav(3,2,X[2]+NW/2-52,-1);
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
  $('higher').innerHTML=legend(bands.map(b=>[b.name,b.color]))+panels.join('');
  applySankeyStage();
  const [yes,no]=take, p=v=>v.toFixed(0)+'%';
  $('higher-text').innerHTML=take.length===2
    ?`<strong>Motivation splits the grade distribution.</strong> Students with no higher-education plans tend to stop at a bare pass or below: ${p(no[1])} finish under 10, ${p(no[3])} land at 10 to 13 and only ${p(no[2])} reach 14 or above (n=${no[4]}). Students who plan higher education are far more likely to reach the top band (${p(yes[2])}) and fail far less often (${p(yes[1])} vs ${p(no[1])}). Higher ambition goes with a very different grade distribution, an association rather than a proven cause: plans are self-reported and may themselves reflect earlier success or struggle.`
    :'';
  $('higher-takeaway').innerHTML=take.length===2?`<strong>${take[0][0]}: ${take[0][1].toFixed(0)}% below 10 at G3</strong><span>${take[1][0]}: ${take[1][1].toFixed(0)}%</span>`:'';
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

function behaviorByContext(){
  const left=70,top=34,cw=90,ch=39,levels=[0,1,2,3,4];
  let s=svgStart('Heatmap of behavior factor count shares within each context factor count','Behavior factor count (each column sums to 100%)');
  groups(context).forEach((rows,i)=>{
    const x=left+i*cw,total=rows.length;
    s+=`<text x="${x+cw/2}" y="${top+levels.length*ch+18}" text-anchor="middle">${i}</text><text x="${x+cw/2}" y="28" text-anchor="middle">n=${total}</text>`;
    if(!total){s+=`<text x="${x+cw/2}" y="${top+levels.length*ch/2}" text-anchor="middle">No records</text>`;return;}
    levels.forEach(level=>{
      const n=rows.filter(r=>behavior(r)===level).length,pct=100*n/total,y=top+(4-level)*ch;
      s+=mark('rect',`x="${x+1}" y="${y+1}" width="${cw-2}" height="${ch-2}" rx="3" fill="${teal}" fill-opacity="${(.06+.94*pct/100).toFixed(3)}" stroke="#e4ded2"`,`${i} context factors, ${level} behavior factors: ${pct.toFixed(1)}% of that group (${n} of ${total} course records)`);
      s+=`<text x="${x+cw/2}" y="${y+ch/2+4}" text-anchor="middle" style="fill:${pct>=50?'#fff':'#1f2a24'};font-weight:600;pointer-events:none">${pct.toFixed(0)}%</text>`;
    });
  });
  levels.forEach(level=>s+=`<text x="${left-10}" y="${top+(4-level)*ch+ch/2+4}" text-anchor="end">${level}</text>`);
  s+='<text x="'+(left+cw*2.5)+'" y="276" text-anchor="middle">Context factor count</text></svg>';
  $('behavior-context').innerHTML=`<div class="legend"><span>Share of records in each column</span><span style="display:inline-flex;align-items:center;gap:6px">0%<i style="width:110px;height:10px;border-radius:2px;margin:0;background:linear-gradient(to right,rgba(47,111,78,.06),${teal})"></i>100%</span></div>`+s;
}

function updateStats(){
  const pass=records.filter(r=>r.G3>=10).length,net=records.filter(r=>r.internet==='yes').length;
  $('stats').innerHTML=[[records.length.toLocaleString(),'Course records'],[fmt(mean(records))+' / 20','Mean final grade'],[records.length?(100*pass/records.length).toFixed(1)+'%':'—','Final grade ≥10'],[records.length?(100*net/records.length).toFixed(1)+'%':'—','Internet at home']].map(([n,l])=>`<div class="stat"><strong>${n}</strong><span>${l}</span></div>`).join('');
  $('filter-status').textContent=`${records.length} records in this view`;
  const n=records.length.toLocaleString();
  for(const id of ['famsize-n','higher-n','failure-n']){const el=$(id);if(el)el.textContent=n;}
}

function applyFilters(){
  const subject=$('subject').value, school=$('school').value;
  records=all.filter(r=>(subject==='all'||r.subject===subject)&&(school==='all'||r.school===school));
  updateStats();
  render();
}

function exportCsv(){
  const keys=Object.keys(all[0]),quote=v=>'"'+String(v).replaceAll('"','""')+'"';
  const csv=[keys.map(quote).join(','),...records.map(r=>keys.map(k=>quote(r[k])).join(','))].join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');
  a.href=url;a.download='school-success-filtered.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function render(){
  familyBoxplot();
  staircase();
  statBand();
  supportChart(currentSupport);
  higherSankey();
  tree();
  lines('factors',['0','1','2','3','4'],[{name:'Context factors',color:teal,values:groups(context)},{name:'Behavior factors',color:orange,values:groups(behavior)}],'Final grade by factor count','Factor count');
  behaviorByContext();
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
  all=window.SCHOOL_DATA;
  for(const id of ['subject','school'])$(id).addEventListener('change',applyFilters);
  $('reset').onclick=()=>{$('subject').value='all';$('school').value='all';applyFilters();};
  $('export').onclick=exportCsv;
  applyFilters();
}catch(e){document.querySelector('.intro-note').textContent='Data could not be loaded';}
