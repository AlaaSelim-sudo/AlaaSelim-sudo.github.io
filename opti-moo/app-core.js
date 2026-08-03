"use strict";

const ACRE_TO_M2 = 4046.8564224;
const RHO_WATER = 1000;
const GRAVITY = 9.80665;

const STATE_NAMES = {
  AL:"Alabama", AZ:"Arizona", AR:"Arkansas", CA:"California", CO:"Colorado", CT:"Connecticut", DE:"Delaware", FL:"Florida", GA:"Georgia", ID:"Idaho", IL:"Illinois", IN:"Indiana", IA:"Iowa", KS:"Kansas", KY:"Kentucky", LA:"Louisiana", ME:"Maine", MD:"Maryland", MA:"Massachusetts", MI:"Michigan", MN:"Minnesota", MS:"Mississippi", MO:"Missouri", MT:"Montana", NE:"Nebraska", NV:"Nevada", NH:"New Hampshire", NJ:"New Jersey", NM:"New Mexico", NY:"New York", NC:"North Carolina", ND:"North Dakota", OH:"Ohio", OK:"Oklahoma", OR:"Oregon", PA:"Pennsylvania", RI:"Rhode Island", SC:"South Carolina", SD:"South Dakota", TN:"Tennessee", TX:"Texas", UT:"Utah", VT:"Vermont", VA:"Virginia", WA:"Washington", WV:"West Virginia", WI:"Wisconsin", WY:"Wyoming"
};

const REGIONS = {
  west_arid: new Set(["AZ","CA","CO","ID","MT","NV","NM","OR","UT","WA","WY"]),
  high_plains: new Set(["KS","NE","ND","OK","SD","TX"]),
  midwest: new Set(["IA","IL","IN","MI","MN","MO","OH","WI"]),
  south: new Set(["AL","AR","FL","GA","KY","LA","MS","NC","SC","TN","VA","WV"]),
  northeast: new Set(["CT","DE","MA","MD","ME","NH","NJ","NY","PA","RI","VT"])
};

const REGION_DEFAULTS = {
  west_arid: {et:7.1, rain:0.35, thermal:2.7, esi:0.43, lift:78, renewable:0.43},
  high_plains: {et:6.4, rain:0.8, thermal:2.1, esi:0.54, lift:55, renewable:0.38},
  midwest: {et:5.3, rain:2.2, thermal:1.3, esi:0.67, lift:28, renewable:0.31},
  south: {et:5.8, rain:2.8, thermal:1.7, esi:0.61, lift:34, renewable:0.28},
  northeast: {et:4.7, rain:2.6, thermal:0.9, esi:0.73, lift:20, renewable:0.27}
};

const CROP_PRESETS = {
  corn: {label:"Corn", kc:1.08, rootZone:185, trigger:0.48, yieldSensitivity:1.25},
  cotton: {label:"Cotton", kc:0.92, rootZone:165, trigger:0.42, yieldSensitivity:0.85},
  alfalfa: {label:"Alfalfa", kc:1.15, rootZone:210, trigger:0.46, yieldSensitivity:1.05},
  soybean: {label:"Soybean", kc:1.00, rootZone:175, trigger:0.47, yieldSensitivity:1.10},
  wheat: {label:"Wheat", kc:0.90, rootZone:155, trigger:0.43, yieldSensitivity:0.95}
};

const SYSTEMS = {
  "Drip": {applicationEfficiency:0.90, pressureHead:15},
  "Center pivot": {applicationEfficiency:0.82, pressureHead:28},
  "Sprinkler": {applicationEfficiency:0.75, pressureHead:35},
  "Flood": {applicationEfficiency:0.60, pressureHead:5}
};

const SCENARIOS = {
  "Normal": {et:1.00, rain:1.00, heat:0.0, grid:0.00, renewable:1.00, lift:0, energy:1.00},
  "Heat wave": {et:1.25, rain:0.75, heat:3.5, grid:0.12, renewable:1.05, lift:0, energy:0.95},
  "Drought": {et:1.15, rain:0.15, heat:1.8, grid:0.05, renewable:1.00, lift:4, energy:0.92},
  "Groundwater decline": {et:1.05, rain:0.80, heat:0.7, grid:0.02, renewable:1.00, lift:25, energy:1.00},
  "Grid constrained": {et:1.05, rain:0.85, heat:1.0, grid:0.22, renewable:0.75, lift:0, energy:0.55},
  "Compound extreme": {et:1.35, rain:0.05, heat:4.5, grid:0.25, renewable:0.80, lift:20, energy:0.50}
};

const FIPS_TO_STATE = {"01":"AL","04":"AZ","05":"AR","06":"CA","08":"CO","09":"CT","10":"DE","12":"FL","13":"GA","16":"ID","17":"IL","18":"IN","19":"IA","20":"KS","21":"KY","22":"LA","23":"ME","24":"MD","25":"MA","26":"MI","27":"MN","28":"MS","29":"MO","30":"MT","31":"NE","32":"NV","33":"NH","34":"NJ","35":"NM","36":"NY","37":"NC","38":"ND","39":"OH","40":"OK","41":"OR","42":"PA","44":"RI","45":"SC","46":"SD","47":"TN","48":"TX","49":"UT","50":"VT","51":"VA","53":"WA","54":"WV","55":"WI","56":"WY"};

let currentResult = null;
let mapResults = new Map();
let geoData = null;
let nasaObservation = null;
let selectedMapState = "NE";

const $ = id => document.getElementById(id);
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const fmt = (v,d=1) => Number(v).toLocaleString(undefined,{minimumFractionDigits:d,maximumFractionDigits:d});
const pct = (v,d=1) => `${fmt(100*v,d)}%`;

function regionOf(state){
  for(const [name,set] of Object.entries(REGIONS)) if(set.has(state)) return name;
  return "midwest";
}

function stateDefaults(state){ return {...REGION_DEFAULTS[regionOf(state)]}; }

function mulberry32(seed){
  return function(){
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function normalNoise(rng){
  const u = Math.max(rng(),1e-12), v = Math.max(rng(),1e-12);
  return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);
}

function etWeights(){
  const arr = Array.from({length:24},(_,h)=>Math.max(0,Math.sin(Math.PI*(h-5.5)/13))**1.55);
  const s = arr.reduce((a,b)=>a+b,0);
  return arr.map(x=>x/s);
}

function strategyScore(hour, gridStress, renewable, carbon, strategy){
  if(strategy === "Grid aware") return 0.55*gridStress + 0.30*(1-renewable) + 0.15*carbon/980;
  if(strategy === "Renewable first") return 0.20*gridStress + 0.65*(1-renewable) + 0.15*carbon/980;
  if(strategy === "Night irrigation") return ((hour>=20 || hour<=6)?0:1) + 0.20*gridStress;
  if(strategy === "Daytime irrigation") return ((hour>=8 && hour<=17)?0:1) + 0.15*(1-renewable);
  return hour<=10 ? hour/24 : 1+hour/24;
}

function readInputs(){
  return {
    state: $("state").value,
    crop: $("crop").value,
    scenario: $("scenario").value,
    strategy: $("strategy").value,
    horizon: clamp(parseInt($("horizon").value)||7,1,30),
    acres: Math.max(parseFloat($("acres").value)||1000,1),
    soil: clamp(parseFloat($("soil").value)||0.55,0.05,1),
    et: Math.max(parseFloat($("et").value)||6.4,0.1),
    rain: Math.max(parseFloat($("rain").value)||0,0),
    thermal: Math.max(parseFloat($("thermal").value)||0,0),
    esi: clamp(parseFloat($("esi").value)||0.5,0,1),
    system: $("system").value,
    lift: Math.max(parseFloat($("lift").value)||0,0),
    efficiency: clamp(parseFloat($("efficiency").value)||0.72,0.2,1),
    pumpCapacity: Math.max(parseFloat($("pumpCapacity").value)||500,1),
    maxIrrigation: Math.max(parseFloat($("maxIrrigation").value)||18,0.1),
    energyAvailable: Math.max(parseFloat($("energyAvailable").value)||0,0),
    price: Math.max(parseFloat($("price").value)||85,0),
    gridThreshold: clamp(parseFloat($("gridThreshold").value)||0.62,0.05,1),
    renewableThreshold: clamp(parseFloat($("renewableThreshold").value)||0.35,0,1),
    seed: 42
  };
}

function simulate(inputs){
  const crop = CROP_PRESETS[inputs.crop];
  const system = SYSTEMS[inputs.system];
  const scenario = SCENARIOS[inputs.scenario];
  const region = stateDefaults(inputs.state);
  const rng = mulberry32(inputs.seed + inputs.state.charCodeAt(0)*31 + inputs.state.charCodeAt(1));
  const weights = etWeights();
  const capacity = crop.rootZone;
  let storage = inputs.soil*capacity;
  const targetStorage = 0.73*capacity;
  const areaM2 = inputs.acres*ACRE_TO_M2;
  const totalHead = inputs.lift + scenario.lift + system.pressureHead + 5;
  const energyIntensity = RHO_WATER*GRAVITY*totalHead/inputs.efficiency/3.6e6;
  const hourly = [];
  const daily = [];
  let totalRequired=0, totalDelivered=0, totalCompatible=0, totalRenewable=0, totalCost=0, totalEmissions=0, totalWater=0;
  const start = new Date(Date.UTC(2026,6,1));

  for(let day=0; day<inputs.horizon; day++){
    const dailyWave = 1 + 0.045*Math.sin(2*Math.PI*day/Math.max(inputs.horizon,3));
    const etDay = inputs.et*crop.kc*scenario.et*dailyWave*(1+0.025*normalNoise(rng));
    const rainDay = Math.max(0, inputs.rain*scenario.rain*(1+0.18*normalNoise(rng)));
    const heatDay = Math.max(0, inputs.thermal+scenario.heat+0.25*normalNoise(rng));
    const effectiveRain = 0.82*rainDay;
    const effectiveRequired = Math.max(0,targetStorage-storage+etDay-effectiveRain);
    const grossRequired = Math.min(inputs.maxIrrigation,effectiveRequired/system.applicationEfficiency);
    const waterRequired = grossRequired/1000*areaM2;
    const energyRequired = waterRequired*energyIntensity;
    const dailyEnergyCap = Math.min(inputs.energyAvailable*1000*scenario.energy, inputs.pumpCapacity*24);
    const energyDeliverable = Math.min(energyRequired,dailyEnergyCap);
    const grossDeliverable = energyIntensity>0 ? energyDeliverable/energyIntensity/areaM2*1000 : 0;

    const dayGrid=[];
    const statePhase=(inputs.state.charCodeAt(0)+inputs.state.charCodeAt(1))%24/24*2*Math.PI;
    for(let h=0;h<24;h++){
      const demand=0.42+0.43*Math.exp(-(((h-17)/4.8)**2))+0.025*Math.sin(2*Math.PI*day/Math.max(inputs.horizon,3));
      const solar=Math.max(0,Math.sin(Math.PI*(h-6)/12));
      const wind=0.50+0.28*Math.sin(2*Math.PI*h/24+statePhase);
      const renewable=clamp(region.renewable*(0.42+0.78*solar+0.30*wind)*scenario.renewable+0.018*normalNoise(rng),0.03,0.92);
      const gridStress=clamp(demand+0.16*(1-renewable)+scenario.grid+0.015*normalNoise(rng),0.08,1);
      const carbon=clamp(760-520*renewable+110*gridStress+14*normalNoise(rng),60,980);
      const price=clamp(inputs.price*(0.55+0.95*gridStress+0.20*(1-renewable)),15,500);
      dayGrid.push({h,renewable,gridStress,carbon,price,score:strategyScore(h,gridStress,renewable,carbon,inputs.strategy)});
    }
    const order=[...dayGrid].sort((a,b)=>a.score-b.score);
    const irrigationByHour=Array(24).fill(0);
    let remain=grossDeliverable;
    const maxKwh=inputs.pumpCapacity;
    const maxMmByPump=energyIntensity>0 ? maxKwh/energyIntensity/areaM2*1000 : 0;
    for(const row of order){
      if(remain<=1e-9) break;
      const mm=Math.min(maxMmByPump,remain);
      irrigationByHour[row.h]=mm;
      remain-=mm;
    }

    const rainfallByHour=Array(24).fill(0);
    if(rainDay>0){
      const rainStart=(day*7+3)%20;
      [0.18,0.34,0.30,0.18].forEach((w,k)=>rainfallByHour[rainStart+k]=rainDay*w);
    }
    let dayEnergy=0, dayCompatible=0, dayRenewable=0, dayCost=0, dayEmissions=0, dayStress=0, maxStress=0, critical=0;
    for(let h=0;h<24;h++){
      const grid=dayGrid[h];
      const gross=irrigationByHour[h];
      const effective=gross*system.applicationEfficiency;
      const etPotential=etDay*weights[h];
      const soilBefore=clamp(storage/capacity,0,1);
      const waterLimitation=clamp(soilBefore/Math.max(crop.trigger,0.1),0.15,1);
      const etActual=etPotential*waterLimitation;
      storage=clamp(storage+rainfallByHour[h]*0.82+effective-etActual,0,capacity);
      const soilFrac=storage/capacity;
      const soilDeficit=clamp(1-soilFrac,0,1);
      const etDeficit=etPotential>0 ? clamp(1-etActual/etPotential,0,1) : 0;
      const thermalStress=clamp((heatDay+1.8*etDeficit)/9,0,1);
      const esiProxy=clamp(0.45*inputs.esi+0.55*(1-0.72*etDeficit-0.28*thermalStress),0,1);
      const stress=clamp(0.35*(1-esiProxy)+0.30*etDeficit+0.20*soilDeficit+0.15*thermalStress,0,1);
      const waterM3=gross/1000*areaM2;
      const energy=waterM3*energyIntensity;
      const compatible=grid.gridStress<=inputs.gridThreshold?energy:0;
      const renewableMatched=grid.renewable>=inputs.renewableThreshold?energy:0;
      const cost=energy/1000*grid.price;
      const emissions=energy/1000*grid.carbon;
      dayEnergy+=energy; dayCompatible+=compatible; dayRenewable+=renewableMatched; dayCost+=cost; dayEmissions+=emissions; dayStress+=stress; maxStress=Math.max(maxStress,stress); if(stress>=0.72)critical++;
      const date=new Date(start.getTime()+(day*24+h)*3600*1000);
      hourly.push({timestamp:date.toISOString(),day:day+1,hour:h,soilMoisture:soilFrac,stress,esiProxy,etPotential,etActual,rainfall:rainfallByHour[h],irrigation:gross,gridStress:grid.gridStress,renewableShare:grid.renewable,energyKwh:energy,compatibleKwh:compatible,renewableKwh:renewableMatched,price:grid.price,carbon:grid.carbon});
    }
    const date=new Date(start.getTime()+day*24*3600*1000);
    daily.push({date:date.toISOString().slice(0,10),day:day+1,waterRequiredM3:waterRequired,irrigationRequiredMm:grossRequired,irrigationDeliveredMm:irrigationByHour.reduce((a,b)=>a+b,0),energyRequiredKwh:energyRequired,energyDeliveredKwh:dayEnergy,unmetEnergyKwh:Math.max(0,energyRequired-dayEnergy),compatibleKwh:dayCompatible,renewableKwh:dayRenewable,costUsd:dayCost,emissionsKg:dayEmissions,meanStress:dayStress/24,maxStress,criticalHours:critical,adequacy:energyRequired>0?dayEnergy/energyRequired:1,cgear:energyRequired>0?dayCompatible/energyRequired:1});
    totalRequired+=energyRequired; totalDelivered+=dayEnergy; totalCompatible+=dayCompatible; totalRenewable+=dayRenewable; totalCost+=dayCost; totalEmissions+=dayEmissions; totalWater+=waterRequired;
  }

  const meanStress=hourly.reduce((a,b)=>a+b.stress,0)/hourly.length;
  const maxStress=Math.max(...hourly.map(r=>r.stress));
  const stressExposure=hourly.reduce((a,b)=>a+Math.max(b.stress-0.55,0),0)/hourly.length;
  const yieldRetention=clamp(1-crop.yieldSensitivity*stressExposure*1.65,0.45,1);
  const summary={
    state:inputs.state,stateName:STATE_NAMES[inputs.state],crop:inputs.crop,cropLabel:crop.label,scenario:inputs.scenario,strategy:inputs.strategy,horizon:inputs.horizon,acres:inputs.acres,
    totalWaterRequiredM3:totalWater,totalEnergyRequiredMwh:totalRequired/1000,totalEnergyDeliveredMwh:totalDelivered/1000,unmetEnergyMwh:Math.max(totalRequired-totalDelivered,0)/1000,
    energyAdequacy:totalRequired>0?totalDelivered/totalRequired:1,cgear:totalRequired>0?totalCompatible/totalRequired:1,renewableMatch:totalDelivered>0?totalRenewable/totalDelivered:0,
    meanStress,maxStress,criticalHours:hourly.filter(r=>r.stress>=0.72).length,yieldRetention,energyIntensity,totalHead,costUsd:totalCost,emissionsT:totalEmissions/1000,minSoil:Math.min(...hourly.map(r=>r.soilMoisture))
  };
  return {inputs,summary,hourly,daily,generatedAt:new Date().toISOString(),dataMode:nasaObservation?"uploaded-observation-driven":"interactive-scenario"};
}

function loadStateDefaults(state, preserve=false){
  const d=stateDefaults(state);
  if(!preserve || !nasaObservation){
    $("et").value=d.et; $("rain").value=d.rain; $("thermal").value=d.thermal; $("esi").value=d.esi; $("lift").value=d.lift;
  }
}

