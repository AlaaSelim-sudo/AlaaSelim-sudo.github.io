"use strict";
(function(){
  function load(src){return new Promise((resolve,reject)=>{const s=document.createElement("script");s.src=src;s.async=false;s.onload=resolve;s.onerror=()=>reject(new Error(`Could not load ${src}`));document.head.appendChild(s);});}
  load("map-bridge.js").then(()=>load("app-core.js")).then(()=>load("app-ui.js")).catch(err=>{console.error(err);const el=document.getElementById("runStatus");if(el){el.textContent="Startup error";el.className="status-pill";}alert(err.message);});
})();
