'use strict';
const $=id=>document.getElementById(id), teal='#267a70', orange='#c46743';
let all=[], records=[];
const mean=a=>a.length?a.reduce((s,r)=>s+r.G3,0)/a.length:null;
const context=r=>+(r.internet==='no')+ +(r.traveltime>=3)+ +(r.Medu<3)+ +(r.Fedu<3);
const behavior=r=>+(r.studytime===1)+ +(r.Dalc>=3)+ +(r.Walc>=3)+ +(r.higher==='no');
const groups=(fn,n=5)=>Array.from({length:n},(_,i)=>records.filter(r=>fn(r)===i));
const fmt=n=>n===null?'No records':n.toFixed(1);
function svgStart(title){return `<svg viewBox="0 0 540 285" role="img" aria-label="${title}"><text x="45" y="13">Mean grade / 20</text>`;}
function axes(labels){let s='';for(let y=0;y<=20;y+=5){let py=230-y*10;s+=`<line x1="45" y1="${py}" x2="520" y2="${py}" stroke="#e1e5dc"/><text x="34" y="${py+4}" text-anchor="end">${y}</text>`;}labels.forEach((label,i)=>s+=`<text x="${xpos(i,labels.length)}" y="252" text-anchor="middle">${label}</text>`);return s;}
const xpos=(i,n)=>45+(i+.5)*475/n;
function mark(tag,attrs,tip){return `<${tag} ${attrs} tabindex="0" data-tip="${tip}" aria-label="${tip}"><title>${tip}</title></${tag}>`;}
function legend(items){return `<div class="legend">${items.map(([label,color])=>`<span><i style="background:${color}"></i>${label}</span>`).join('')}</div>`;}
function bars(id,labels,series,title,xlabel){let s=svgStart(title)+axes(labels);let slot=475/labels.length,width=Math.min(65,slot*.68/series.length);series.forEach((ser,j)=>ser.values.forEach((a,i)=>{let m=mean(a);if(m===null)return;let x=xpos(i,labels.length)+(j-(series.length-1)/2)*width-width/2;let tip=`${ser.name}, ${labels[i]}: ${fmt(m)}/20; n=${a.length}`;s+=mark('rect',`x="${x}" y="${230-m*10}" width="${width-3}" height="${m*10}" fill="${ser.color}" rx="2"`,tip);if(series.length===1)s+=`<text class="value" x="${x+width/2}" y="${220-m*10}" text-anchor="middle">${fmt(m)}</text>`;}));s+=`<text x="282" y="276" text-anchor="middle">${xlabel}</text></svg>`;$(id).innerHTML=legend(series.map(s=>[s.name,s.color]))+s;}
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
  const xKey = $('scatter-x').value;
  const yKey = $('scatter-y').value;
  const x = measures[xKey], y = measures[yKey];
  const byInternet = $('scatter-group').value === 'internet';
  const cohorts = byInternet
    ? [['Internet at home', teal, records.filter(r => r.internet === 'yes')],
       ['No internet at home', orange, records.filter(r => r.internet === 'no')]]
    : [['Mathematics', teal, records.filter(r => r.subject === 'Mathematics')],
       ['Portuguese', orange, records.filter(r => r.subject === 'Portuguese')]];
  const px = value => 60 + (value - x.min) / (x.max - x.min) * 450;
  const py = value => 270 - (value - y.min) / (y.max - y.min) * 235;

  $('matrix').innerHTML = cohorts.map(([name, color, rows], panel) => {
    // Aggregate identical coordinates; circle area is proportional to record count.
    const points = new Map();
    rows.forEach(row => {
      const key = `${row[xKey]},${row[yKey]}`;
      const point = points.get(key) || {x: row[xKey], y: row[yKey], n: 0};
      point.n += 1;
      points.set(key, point);
    });
    let plot = `<svg viewBox="0 0 540 340" role="img" aria-label="${name}: ${x.label} versus ${y.label}"><defs><clipPath id="scatter-clip-${panel}"><rect x="46" y="21" width="478" height="263"/></clipPath></defs>`;
    y.ticks.forEach(value => {
      plot += `<line x1="60" y1="${py(value)}" x2="510" y2="${py(value)}" stroke="#e1e5dc"/><text x="47" y="${py(value)+4}" text-anchor="end">${value}</text>`;
    });
    x.ticks.forEach(value => {
      plot += `<line x1="${px(value)}" y1="35" x2="${px(value)}" y2="270" stroke="#edf0e9"/><text x="${px(value)}" y="292" text-anchor="middle">${value}</text>`;
    });
    plot += `<text x="60" y="16">${y.label}</text><text x="285" y="325" text-anchor="middle">${x.label}</text><g clip-path="url(#scatter-clip-${panel})">`;
    // Draw large bubbles first so less frequent observations stay visible.
    [...points.values()].sort((a,b) => b.n-a.n).forEach(point => {
      const tip = `${name}; ${x.label}: ${point.x}; ${y.label}: ${point.y}; ${point.n} course record${point.n===1?'':'s'}`;
      plot += mark('circle', `cx="${px(point.x)}" cy="${py(point.y)}" r="${2.6*Math.sqrt(point.n)}" fill="${color}" fill-opacity=".28" stroke="${color}" stroke-opacity=".65" stroke-width=".8" data-count="${point.n}"`, tip);
    });
    plot += '</g>';
    if (!rows.length) plot += '<text x="285" y="155" text-anchor="middle">No records in this group</text>';
    plot += '</svg>';
    return `<section class="scatter-panel"><div class="scatter-title"><h4 style="color:${color}">${name}</h4><span>n = ${rows.length.toLocaleString()}</span></div>${plot}</section>`;
  }).join('');
}

function render(){records=all.filter(r=>($('subject').value==='all'||r.subject===$('subject').value)&&($('school').value==='all'||r.school===$('school').value));let pass=records.filter(r=>r.G3>=10).length,net=records.filter(r=>r.internet==='yes').length;$('stats').innerHTML=[[records.length.toLocaleString(),'Course records'],[fmt(mean(records))+' / 20','Mean final grade'],[records.length?(100*pass/records.length).toFixed(1)+'%':'—','Final grade ≥10'],[records.length?(100*net/records.length).toFixed(1)+'%':'—','Internet at home']].map(([n,l])=>`<div class="stat"><strong>${n}</strong><span>${l}</span></div>`).join('');$('filter-status').textContent=`${records.length} records in this view`;
bars('failures',['0','1','2','3'],[{name:'Final grade',color:teal,values:groups(r=>r.failures,4)}],'Final grade by previous failures','Recorded past class failures');
let key=$('support').value;bars('support-chart',['0','1','2','3','4'],[{name:'Support received',color:teal,values:groups(context).map(a=>a.filter(r=>r[key]==='yes'))},{name:'No support',color:orange,values:groups(context).map(a=>a.filter(r=>r[key]==='no'))}],'Support by context factor count','Context factor count');
lines('factors',['0','1','2','3','4'],[{name:'Context factors',color:teal,values:groups(context)},{name:'Behavior factors',color:orange,values:groups(behavior)}],'Final grade by factor count','Factor count');
let internet=records.filter(r=>r.internet==='yes'),noInternet=records.filter(r=>r.internet==='no');let internetSeries=[];for(let [name,color,a] of [['Internet at home',teal,internet],['No internet',orange,noInternet]])internetSeries.push({name,color,values:['G1','G2','G3'].map(g=>a.map(r=>({G3:r[g]})))});lines('internet',['G1','G2','G3'],internetSeries,'Grades over three periods by internet access','Grade period');tree();matrix();}
function exportCsv(){let keys=Object.keys(all[0]),quote=v=>'"'+String(v).replaceAll('"','""')+'"';let csv=[keys.map(quote).join(','),...records.map(r=>keys.map(k=>quote(r[k])).join(','))].join('\r\n');let url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='school-success-filtered.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
for(let id of ['subject','school','support','scatter-x','scatter-y','scatter-group'])$(id).addEventListener('change',render);
$('reset').onclick=()=>{$('subject').value='all';$('school').value='all';$('support').value='schoolsup';$('scatter-x').value='absences';$('scatter-y').value='G3';$('scatter-group').value='internet';render();};$('export').onclick=exportCsv;
function tip(event){let target=event.target.closest('[data-tip]');if(!target)return;let box=target.getBoundingClientRect(),tooltip=$('tooltip');tooltip.textContent=target.dataset.tip;tooltip.hidden=false;tooltip.style.left=Math.max(8,Math.min(window.innerWidth-270,event.clientX||box.x))+'px';tooltip.style.top=Math.max(8,Math.min(window.innerHeight-70,(event.clientY||box.y)-45))+'px';}
document.addEventListener('pointerover',tip);document.addEventListener('focusin',tip);document.addEventListener('pointerout',()=>{$('tooltip').hidden=true;});document.addEventListener('focusout',()=>{$('tooltip').hidden=true;});
fetch('data.json').then(r=>{if(!r.ok)throw Error('Data could not be loaded');return r.json();}).then(data=>{all=data;render();}).catch(e=>{$('filter-status').textContent=e.message;});
