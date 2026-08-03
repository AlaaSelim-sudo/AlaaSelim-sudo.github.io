"use strict";
(function(){
  const nativeFetch=window.fetch.bind(window);
  let mapPromise=null;
  function buildMap(){
    if(mapPromise) return mapPromise;
    mapPromise=(async()=>{
      if(!window.d3||!window.topojson) throw new Error("U.S. map libraries did not load.");
      const response=await nativeFetch("https://cdn.jsdelivr.net/npm/us-atlas@3.0.1/states-albers-10m.json");
      if(!response.ok) throw new Error("Published U.S. state geometry is unavailable.");
      const us=await response.json();
      const collection=window.topojson.feature(us,us.objects.states);
      const path=window.d3.geoPath();
      const fips={"01":"AL","04":"AZ","05":"AR","06":"CA","08":"CO","09":"CT","10":"DE","12":"FL","13":"GA","16":"ID","17":"IL","18":"IN","19":"IA","20":"KS","21":"KY","22":"LA","23":"ME","24":"MD","25":"MA","26":"MI","27":"MN","28":"MS","29":"MO","30":"MT","31":"NE","32":"NV","33":"NH","34":"NJ","35":"NM","36":"NY","37":"NC","38":"ND","39":"OH","40":"OK","41":"OR","42":"PA","44":"RI","45":"SC","46":"SD","47":"TN","48":"TX","49":"UT","50":"VT","51":"VA","53":"WA","54":"WV","55":"WI","56":"WY"};
      return {features:collection.features.map(feature=>{
        const state=fips[String(feature.id).padStart(2,"0")];
        return state?{state,state_name:state,path:path(feature)}:null;
      }).filter(Boolean)};
    })();
    return mapPromise;
  }
  window.fetch=function(input,init){
    const url=typeof input==="string"?input:(input&&input.url)||"";
    const match=url.match(/(?:^|\/)states-([1-4])\.json(?:\?.*)?$/);
    if(!match) return nativeFetch(input,init);
    return buildMap().then(data=>new Response(JSON.stringify(match[1]==="1"?data:{features:[]}),{status:200,headers:{"Content-Type":"application/json"}}));
  };
})();
