function renderMetrics(result){
  const s=result.summary;
  $("mEnergy").textContent=`${fmt(s.totalEnergyRequiredMwh,2)} MWh`;
  $("mEnergySub").textContent=`${fmt(s.energyIntensity,3)} kWh/m³ · ${fmt(s.totalHead,0)} m head`;
  $("mAdequacy").textContent=pct(s.energyAdequacy);
  $("mAdequacySub").textContent=`${fmt(s.unmetEnergyMwh,2)} MWh unmet`;
  $("mCgear").textContent=pct(s.cgear);
  $("mRenewable").textContent=pct(s.renewableMatch);
  $("mStress").textContent=fmt(s.meanStress,2);
  $("mStressSub").textContent=`Maximum ${fmt(s.maxStress,2)} · ${s.criticalHours} critical hours`;
  $("mYield").textContent=pct(s.yieldRetention);
  $("runTitle").textContent=`${s.stateName} · ${s.cropLabel} · ${s.scenario}`;
  $("runDescription").textContent=`${s.horizon}-day hourly simulation using ${s.strategy.toLowerCase()} scheduling for ${fmt(s.acres,0)} irrigated acres.`;
  const status=s.meanStress>=0.72?"Critical":s.meanStress>=0.55?"Watch":"Stable";
  $("healthBadge").textContent=status;
  $("healthBadge").style.color=status==="Stable"?"var(--green)":status==="Watch"?"var(--orange)":"var(--red)";
}

function clearSvg(svg){ while(svg.firstChild) svg.removeChild(svg.firstChild); }
const SVG_NS="http://www.w3.org/2000/svg";
function svgNode(name,attrs={},text=null){
  const el=document.createElementNS(SVG_NS,name);
  for(const [k,v] of Object.entries(attrs)) el.setAttribute(k,String(v));
  if(text!==null) el.textContent=text;
  return el;
}
function linePath(data,xFn,yFn){ return data.map((d,i)=>`${i===0?"M":"L"}${xFn(d,i).toFixed(2)},${yFn(d,i).toFixed(2)}`).join(" "); }
function addChartText(svg,x,y,text,anchor="middle",fill="var(--muted)"){
  svg.appendChild(svgNode("text",{x,y,"text-anchor":anchor,fill,"font-size":11},text));
}

function renderStressChart(result){
  const svg=$("stressChart"); clearSvg(svg);
  const data=result.hourly,W=900,H=330,m={t:22,r:45,b:38,l:45};
  const x=i=>m.l+i/(Math.max(data.length-1,1))*(W-m.l-m.r);
  const y=v=>H-m.b-clamp(v,0,1)*(H-m.t-m.b);
  for(let k=0;k<=5;k++){
    const v=k/5, yy=y(v);
    svg.appendChild(svgNode("line",{x1:m.l,x2:W-m.r,y1:yy,y2:yy,stroke:"#203047",opacity:.55}));
    addChartText(svg,m.l-8,yy+4,v.toFixed(1),"end");
  }
  const criticalY=y(.72);
  svg.appendChild(svgNode("line",{x1:m.l,x2:W-m.r,y1:criticalY,y2:criticalY,stroke:"#ff7e8a","stroke-dasharray":"5 5",opacity:.75}));
  addChartText(svg,W-m.r,criticalY-7,"Critical stress 0.72","end","#ff7e8a");
  const areaPath=`M${x(0)},${y(0)} ${linePath(data,(d,i)=>x(i),d=>y(d.soilMoisture)).replace(/^M/,"L")} L${x(data.length-1)},${y(0)} Z`;
  svg.appendChild(svgNode("path",{d:areaPath,fill:"rgba(139,242,139,.10)"}));
  svg.appendChild(svgNode("path",{d:linePath(data,(d,i)=>x(i),d=>y(d.soilMoisture)),fill:"none",stroke:"#8bf28b","stroke-width":2.2}));
  svg.appendChild(svgNode("path",{d:linePath(data,(d,i)=>x(i),d=>y(d.stress)),fill:"none",stroke:"#42d4ff","stroke-width":2.3}));
  const ticks=Math.min(result.inputs.horizon,7);
  for(let k=0;k<ticks;k++){
    const idx=ticks===1?0:Math.round(k*(data.length-1)/(ticks-1));
    const xx=x(idx);
    svg.appendChild(svgNode("line",{x1:xx,x2:xx,y1:H-m.b,y2:H-m.b+5,stroke:"#203047"}));
    addChartText(svg,xx,H-12,`Day ${Math.floor(idx/24)+1}`);
  }
  svg.appendChild(svgNode("line",{x1:m.l,x2:m.l,y1:m.t,y2:H-m.b,stroke:"#203047"}));
  svg.appendChild(svgNode("line",{x1:m.l,x2:W-m.r,y1:H-m.b,y2:H-m.b,stroke:"#203047"}));
}

function renderEnergyChart(result){
  const svg=$("energyChart"); clearSvg(svg);
  const data=result.daily,W=900,H=300,m={t:20,r:20,b:42,l:58};
  const maxV=Math.max(1,...data.flatMap(d=>[d.energyRequiredKwh/1000,d.energyDeliveredKwh/1000]))*1.12;
  const y=v=>H-m.b-v/maxV*(H-m.t-m.b);
  for(let k=0;k<=5;k++){
    const v=maxV*k/5,yy=y(v);
    svg.appendChild(svgNode("line",{x1:m.l,x2:W-m.r,y1:yy,y2:yy,stroke:"#203047",opacity:.55}));
    addChartText(svg,m.l-8,yy+4,`${v.toFixed(v<10?1:0)} MWh`,"end");
  }
  const slot=(W-m.l-m.r)/data.length;
  data.forEach((d,i)=>{
    const x=m.l+i*slot+slot*.16,bw=slot*.68;
    const req=d.energyRequiredKwh/1000,del=d.energyDeliveredKwh/1000;
    svg.appendChild(svgNode("rect",{x,y:y(req),width:bw,height:H-m.b-y(req),rx:3,fill:"rgba(180,144,255,.40)"}));
    svg.appendChild(svgNode("rect",{x:x+bw*.18,y:y(del),width:bw*.64,height:H-m.b-y(del),rx:3,fill:"#42d4ff"}));
    addChartText(svg,x+bw/2,H-12,`Day ${d.day}`);
  });
  svg.appendChild(svgNode("line",{x1:m.l,x2:m.l,y1:m.t,y2:H-m.b,stroke:"#203047"}));
  svg.appendChild(svgNode("line",{x1:m.l,x2:W-m.r,y1:H-m.b,y2:H-m.b,stroke:"#203047"}));
}

function balanceItem(label,value,ratio,color="var(--cyan)"){
  return `<div class="balance-item"><div class="balance-head"><span>${label}</span><strong>${value}</strong></div><div class="progress"><span style="width:${clamp(ratio,0,1)*100}%;background:${color}"></span></div></div>`;
}

function renderBalance(result){
  const s=result.summary;
  $("balanceList").innerHTML=[
    balanceItem("Energy delivered",`${fmt(s.totalEnergyDeliveredMwh,2)} MWh`,s.energyAdequacy),
    balanceItem("Grid-compatible energy",pct(s.cgear),s.cgear,"var(--purple)"),
    balanceItem("Renewable-matched pumping",pct(s.renewableMatch),s.renewableMatch,"var(--green)"),
    balanceItem("Minimum soil moisture",pct(s.minSoil),s.minSoil,"var(--orange)"),
    balanceItem("Yield retention proxy",pct(s.yieldRetention),s.yieldRetention,"var(--green)")
  ].join("");
}

function renderInterpretation(result){
  const s=result.summary;
  let headline,body;
  if(s.energyAdequacy<0.75){ headline="Energy availability is limiting irrigation."; body=`Only ${pct(s.energyAdequacy)} of health-preserving pumping energy was delivered, leaving ${fmt(s.unmetEnergyMwh,2)} MWh unmet.`; }
  else if(s.meanStress>=0.72){ headline="Crop stress remains critical despite pumping."; body="The selected weather, soil, and infrastructure assumptions create severe stress. More energy alone may not resolve water or hydraulic constraints."; }
  else if(s.cgear<0.55){ headline="The crop is protected, but pumping conflicts with the grid."; body=`Only ${pct(s.cgear)} of required energy was delivered in grid-compatible hours. Try renewable-first or night irrigation.`; }
  else { headline="The selected schedule protects crop health with usable grid flexibility."; body=`Energy adequacy is ${pct(s.energyAdequacy)}, while ${pct(s.cgear)} of required pumping energy occurs during compatible grid conditions.`; }
  $("interpretation").innerHTML=`<div class="callout"><strong>${headline}</strong></div><p>${body}</p><p><strong>Estimated cost:</strong> $${fmt(s.costUsd,0)}<br><strong>Operational emissions:</strong> ${fmt(s.emissionsT,2)} tCO₂<br><strong>Critical stress exposure:</strong> ${s.criticalHours} hours</p>`;
}

function renderTable(result){
  $("dailyTable").querySelector("tbody").innerHTML=result.daily.map(d=>`<tr><td>${d.date}</td><td>${fmt(d.waterRequiredM3,0)} m³</td><td>${fmt(d.energyRequiredKwh/1000,2)} MWh</td><td>${fmt(d.energyDeliveredKwh/1000,2)} MWh</td><td>${pct(d.adequacy)}</td><td>${fmt(d.meanStress,2)}</td><td>${pct(d.cgear)}</td></tr>`).join("");
}

function renderAll(result){
  currentResult=result;
  renderMetrics(result); renderStressChart(result); renderEnergyChart(result); renderBalance(result); renderInterpretation(result); renderTable(result);
  $("runStatus").textContent="Simulation complete"; $("runStatus").className="status-pill status-ready";
}

function runSimulation(){
  $("runStatus").textContent="Running…"; $("runStatus").className="status-pill status-running";
  setTimeout(()=>{
    try{ const result=simulate(readInputs()); renderAll(result); updateMap(); renderScenarioComparison(); }
    catch(err){ console.error(err); $("runStatus").textContent="Simulation error"; $("runStatus").className="status-pill"; alert(`Simulation failed: ${err.message}`); }
  },30);
}

function mapMetricInfo(metric){
  if(metric==="meanStress") return {label:"Mean crop stress",value:r=>r.summary.meanStress,format:v=>fmt(v,2),domain:[0.2,0.85]};
  if(metric==="energyIntensity") return {label:"Energy intensity",value:r=>r.summary.energyIntensity,format:v=>`${fmt(v,3)} kWh/m³`,domain:[0.12,0.55]};
  if(metric==="cgear") return {label:"Grid-compatible energy",value:r=>r.summary.cgear,format:v=>pct(v),domain:[0,1]};
  return {label:"Yield retention proxy",value:r=>r.summary.yieldRetention,format:v=>pct(v),domain:[0.55,1]};
}

async function ensureGeo(){
  if(geoData) return geoData;
  if(!window.d3 || !window.topojson) throw new Error("U.S. map libraries did not load.");
  const res=await fetch("https://cdn.jsdelivr.net/npm/us-atlas@3.0.1/states-albers-10m.json");
  if(!res.ok) throw new Error("Could not load published U.S. state geometry.");
  const us=await res.json();
  const collection=window.topojson.feature(us,us.objects.states);
  const path=window.d3.geoPath();
  geoData={viewBox:[0,0,975,610],features:collection.features.map(f=>{
    const state=FIPS_TO_STATE[String(f.id).padStart(2,"0")];
    return state?{state,path:path(f)}:null;
  }).filter(Boolean)};
  return geoData;
}

function hexToRgb(hex){ const n=parseInt(hex.replace("#",""),16); return [(n>>16)&255,(n>>8)&255,n&255]; }
function rgbToHex(rgb){ return `#${rgb.map(v=>Math.round(v).toString(16).padStart(2,"0")).join("")}`; }
function mixColor(a,b,t){ const A=hexToRgb(a),B=hexToRgb(b); return rgbToHex(A.map((v,i)=>v+(B[i]-v)*t)); }
function mapColor(value,min,max){
  const t=clamp((value-min)/Math.max(max-min,1e-9),0,1);
  const stops=["#173047","#42d4ff","#ffb35c","#ff7e8a"];
  const scaled=t*(stops.length-1),i=Math.min(Math.floor(scaled),stops.length-2);
  return mixColor(stops[i],stops[i+1],scaled-i);
}

async function updateMap(){
  if(!currentResult) return;
  const base=readInputs(); mapResults=new Map();
  for(const state of Object.keys(STATE_NAMES)){
    const d=stateDefaults(state);
    const inp={...base,state,horizon:Math.min(base.horizon,3),et:d.et,rain:d.rain,thermal:d.thermal,esi:d.esi,lift:d.lift,seed:42};
    mapResults.set(state,simulate(inp));
  }
  try{
    const geo=await ensureGeo();
    const svg=$("usMap"); clearSvg(svg);
    const info=mapMetricInfo($("mapMetric").value);
    const values=[...mapResults.values()].map(info.value);
    const domain=[Math.min(info.domain[0],...values),Math.max(info.domain[1],...values)];
    geo.features.forEach(f=>{
      const path=svgNode("path",{d:f.path,fill:mapColor(info.value(mapResults.get(f.state)),domain[0],domain[1]),class:`state-shape${f.state===selectedMapState?" selected":""}`});
      path.addEventListener("mouseenter",()=>renderMapDetail(f.state,info));
      path.addEventListener("click",()=>{ selectedMapState=f.state; renderMapDetail(selectedMapState,info); updateMap(); });
      svg.appendChild(path);
    });
    const selected=selectedMapState&&mapResults.has(selectedMapState)?selectedMapState:base.state;
    renderMapDetail(selected,info);
    $("mapLegend").innerHTML=`<span>${info.format(domain[0])}</span><span class="legend-gradient"></span><span>${info.format(domain[1])}</span><strong>${info.label}</strong>`;
  }catch(err){
    console.error(err); const svg=$("usMap"); clearSvg(svg); addChartText(svg,40,70,`Map unavailable: ${err.message}`,"start","#ffb35c");
  }
}

function renderMapDetail(state,info){
  const r=mapResults.get(state); if(!r)return;
  const s=r.summary;
  $("mapDetail").innerHTML=`<h4>${s.stateName}</h4><p>${s.cropLabel} · ${s.scenario}</p><dl><dt>${info.label}</dt><dd>${info.format(info.value(r))}</dd><dt>Energy required</dt><dd>${fmt(s.totalEnergyRequiredMwh,2)} MWh</dd><dt>Energy adequacy</dt><dd>${pct(s.energyAdequacy)}</dd><dt>Mean stress</dt><dd>${fmt(s.meanStress,2)}</dd><dt>Renewable matched</dt><dd>${pct(s.renewableMatch)}</dd><dt>Yield retention</dt><dd>${pct(s.yieldRetention)}</dd></dl>`;
}

function renderScenarioComparison(){
  if(!currentResult)return;
  const base=readInputs();
  const names=["Normal","Heat wave","Drought","Grid constrained","Compound extreme"];
  $("scenarioCards").innerHTML=names.map((name,i)=>{
    const r=simulate({...base,scenario:name,seed:42+i}); const s=r.summary;
    return `<article class="scenario-card ${name===base.scenario?"active":""}"><h4>${name}</h4><div class="scenario-stat"><span>Energy</span><strong>${fmt(s.totalEnergyRequiredMwh,1)} MWh</strong></div><div class="scenario-stat"><span>Adequacy</span><strong>${pct(s.energyAdequacy,0)}</strong></div><div class="scenario-stat"><span>Crop stress</span><strong>${fmt(s.meanStress,2)}</strong></div><div class="scenario-stat"><span>Grid-compatible</span><strong>${pct(s.cgear,0)}</strong></div><div class="scenario-stat"><span>Yield retention</span><strong>${pct(s.yieldRetention,0)}</strong></div></article>`;
  }).join("");
}

function csvEscape(v){ const s=String(v??""); return /[",\n]/.test(s)?`"${s.replaceAll('"','""')}"`:s; }
function downloadBlob(content,name,type){ const blob=new Blob([content],{type}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url); }
function downloadDailyCsv(){
  if(!currentResult)return; const cols=Object.keys(currentResult.daily[0]);
  const csv=[cols.join(","),...currentResult.daily.map(r=>cols.map(c=>csvEscape(r[c])).join(","))].join("\n");
  downloadBlob(csv,"opti-moo-daily-results.csv","text/csv");
}
function downloadJson(){ if(currentResult)downloadBlob(JSON.stringify(currentResult,null,2),"opti-moo-results.json","application/json"); }

function parseObservationCsv(text){
  const lines=text.trim().split(/\r?\n/).filter(Boolean); if(lines.length<2) throw new Error("CSV needs a header and at least one data row.");
  const headers=lines[0].split(",").map(x=>x.trim().toLowerCase());
  const rows=lines.slice(1).map(line=>{ const vals=line.split(","); const obj={}; headers.forEach((h,i)=>obj[h]=parseFloat(vals[i])); return obj; });
  const mean=key=>{const v=rows.map(r=>r[key]).filter(Number.isFinite); return v.length?v.reduce((a,b)=>a+b,0)/v.length:null;};
  return {esi:mean("esi"),et:mean("et_mm_day"),rain:mean("rain_mm_day"),thermal:mean("thermal_anomaly_c"),soil:mean("soil_moisture_frac"),rows:rows.length};
}

function applyObservation(obs){
  if(obs.esi!==null)$("esi").value=clamp(obs.esi,0,1);
  if(obs.et!==null)$("et").value=Math.max(obs.et,0.1);
  if(obs.rain!==null)$("rain").value=Math.max(obs.rain,0);
  if(obs.thermal!==null)$("thermal").value=Math.max(obs.thermal,0);
  if(obs.soil!==null)$("soil").value=clamp(obs.soil,0.05,1);
  updateRangeLabels();
}

function updateRangeLabels(){
  $("soilValue").textContent=pct(parseFloat($("soil").value),0);
  $("gridValue").textContent=fmt(parseFloat($("gridThreshold").value),2);
  $("renewableValue").textContent=pct(parseFloat($("renewableThreshold").value),0);
}

function setupTabs(){
  document.querySelectorAll(".tab").forEach(btn=>btn.addEventListener("click",()=>{
    document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b===btn));
    document.querySelectorAll(".tab-panel").forEach(p=>p.classList.toggle("active",p.id===btn.dataset.tab));
    if(btn.dataset.tab==="map") updateMap();
  }));
}

function resetAll(){
  $("state").value="NE"; $("crop").value="corn"; $("scenario").value="Normal"; $("strategy").value="Grid aware"; $("horizon").value=7; $("acres").value=1000; $("soil").value=.55; $("system").value="Center pivot"; $("efficiency").value=.72; $("pumpCapacity").value=1200; $("maxIrrigation").value=18; $("energyAvailable").value=30; $("price").value=85; $("gridThreshold").value=.62; $("renewableThreshold").value=.35; nasaObservation=null; $("nasaFile").value=""; $("nasaStatus").textContent="No observation file loaded. Using scenario inputs."; loadStateDefaults("NE"); updateRangeLabels(); runSimulation();
}

function init(){
  const stateSelect=$("state"); Object.keys(STATE_NAMES).forEach(code=>{const o=document.createElement("option");o.value=code;o.textContent=`${STATE_NAMES[code]} (${code})`;stateSelect.appendChild(o);}); stateSelect.value="NE";
  loadStateDefaults("NE"); updateRangeLabels(); setupTabs();
  $("runBtn").addEventListener("click",runSimulation); $("runBtnTop").addEventListener("click",runSimulation); $("resetBtn").addEventListener("click",resetAll);
  $("downloadCsvBtn").addEventListener("click",downloadDailyCsv); $("downloadJsonBtn").addEventListener("click",downloadJson); $("compareBtn").addEventListener("click",renderScenarioComparison);
  $("state").addEventListener("change",e=>{loadStateDefaults(e.target.value);updateRangeLabels();});
  ["soil","gridThreshold","renewableThreshold"].forEach(id=>$(id).addEventListener("input",updateRangeLabels));
  $("mapMetric").addEventListener("change",updateMap);
  $("nasaFile").addEventListener("change",async e=>{
    const file=e.target.files[0]; if(!file)return;
    try{ nasaObservation=parseObservationCsv(await file.text()); applyObservation(nasaObservation); $("nasaStatus").textContent=`Loaded ${nasaObservation.rows} observation rows. Valid columns were averaged and applied locally.`; runSimulation(); }
    catch(err){ nasaObservation=null; $("nasaStatus").textContent=`Could not use file: ${err.message}`; }
  });
  runSimulation();
}

init();
