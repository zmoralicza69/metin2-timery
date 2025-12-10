
/* Metin2 timers - standalone JS for static deploy */
(function(){
  const MAPS = {
    "Las": {
      src: "./maps/las.svg",
      buttons: [
        { label: "Metin 75 (27m)", minutes: 27, color: "#ff2b2b" },
        { label: "Metin 80 (27m)", minutes: 27, color: "#ffb000" },
        { label: "Naara (40m)", minutes: 40, color: "#8e2be2" }
      ]
    },
    "Ognista": {
      src: "./maps/ognista.svg",
      buttons: [
        { label: "Metin (27m)", minutes: 27, color: "#ff2b2b" },
        { label: "Miniboss (40m)", minutes: 40, color: "#ffb000" },
        { label: "Boss (45m)", minutes: 45, color: "#8e2be2" }
      ]
    },
    "W\u0119\u017cowe": {
      src: "./maps/wezowe.svg",
      buttons: [
        { label: "Serpentor (45m)", minutes: 45, color: "#ff2b2b" },
        { label: "Zadlak (40m)", minutes: 40, color: "#ffb000" },
        { label: "Szeptoruj (40m)", minutes: 40, color: "#8e2be2" }
      ]
    }
  };

  const CHANNELS = ["CH1","CH2","CH3","CH4","CH5","CH6"];
  const STORAGE_KEY = "metin2-pins-v2";
  const ALERT_AHEAD = 60; // seconds before end to alert
  const AUTO_REMOVE_AFTER = 30; // seconds after end to auto remove

  // elements
  const mapSelect = document.getElementById("mapSelect");
  const channelSelect = document.getElementById("channelSelect");
  const buttonsDiv = document.getElementById("buttons");
  const mapImg = document.getElementById("mapImg");
  const mapContainer = document.getElementById("mapContainer");
  const pinsLayer = document.getElementById("pinsLayer");
  const scaleRange = document.getElementById("scaleRange");
  const resetZoom = document.getElementById("resetZoom");
  const pauseAllBtn = document.getElementById("pauseAll");
  const alertSound = document.getElementById("alertSound");

  let state = {
    map: Object.keys(MAPS)[0],
    channel: CHANNELS[2],
    pins: [],
    placing: null, // button being placed
    scale: 1
  };

  function now(){ return Math.floor(Date.now()/1000); }

  // load/save
  function load(){ try{ const raw = localStorage.getItem(STORAGE_KEY); if(raw) state.pins = JSON.parse(raw); }catch(e){console.warn(e);} }
  function save(){ try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(state.pins)); }catch(e){console.warn(e);} }

  // init UI
  function initUI(){
    // maps
    Object.keys(MAPS).forEach(m => {
      const o = document.createElement("option"); o.value = m; o.textContent = m; mapSelect.appendChild(o);
    });
    // channels
    CHANNELS.forEach(c=>{ const o=document.createElement("option"); o.value=c; o.textContent=c; channelSelect.appendChild(o); });

    mapSelect.value = state.map;
    channelSelect.value = state.channel;

    mapSelect.addEventListener("change", ()=>{ state.map = mapSelect.value; updateMap(); renderPins(); renderButtons(); });
    channelSelect.addEventListener("change", ()=>{ state.channel = channelSelect.value; renderPins(); });

    scaleRange.addEventListener("input", ()=>{ state.scale = Number(scaleRange.value); mapContainer.style.transform = `scale(${state.scale})`; });
    resetZoom.addEventListener("click", ()=>{ state.scale = 1; scaleRange.value = 1; mapContainer.style.transform = `scale(1)`; });

    pauseAllBtn.addEventListener("click", ()=>{ state.pins = state.pins.map(p=>{p.running=false;p.lastTick=null;return p}); save(); renderPins(); });

    renderButtons();
    updateMap();
    renderPins();
  }

  function renderButtons(){
    buttonsDiv.innerHTML = "";
    const set = MAPS[state.map].buttons;
    set.forEach(b => {
      const btn = document.createElement("button");
      btn.textContent = b.label;
      btn.style.background = b.color;
      btn.addEventListener("click", ()=>{ startPlacing(b); });
      buttonsDiv.appendChild(btn);
    });
  }

  function updateMap(){
    mapImg.src = MAPS[state.map].src;
  }

  // placing pin
  function startPlacing(buttonDef){
    state.placing = buttonDef;
    mapContainer.style.cursor = "crosshair";
    mapContainer.addEventListener("click", placeHandler);
    alert("Kliknij na mapę aby postawić pineskę");
  }
  function placeHandler(e){
    if(!state.placing) return;
    const rect = mapImg.getBoundingClientRect();
    const x = ((e.clientX - rect.left)/rect.width)*100;
    const y = ((e.clientY - rect.top)/rect.height)*100;
    const end = now() + Math.max(10, Math.floor(state.placing.minutes*60));
    const pin = {
      id: Math.random().toString(36).slice(2,9),
      map: state.map,
      channel: state.channel,
      label: state.placing.label.split(" (")[0],
      color: state.placing.color,
      end: end,
      createdAt: now(),
      alerted: false,
      running: true,
      x: x, y: y
    };
    state.pins.unshift(pin);
    state.placing = null;
    mapContainer.style.cursor = "default";
    mapContainer.removeEventListener("click", placeHandler);
    save();
    renderPins();
  }

  // render pins for current map/channel
  function renderPins(){
    pinsLayer.innerHTML = "";
    const filtered = state.pins.filter(p => p.map === state.map && p.channel === state.channel);
    filtered.forEach(p => {
      const remain = Math.max(0, p.end - now());
      const mm = String(Math.floor(remain/60)).padStart(2,"0");
      const ss = String(remain%60).padStart(2,"0");
      const div = document.createElement("div");
      div.className = "pin";
      div.style.left = p.x + "%";
      div.style.top = p.y + "%";
      div.style.background = p.color;
      div.dataset.id = p.id;
      div.innerHTML = `<div class="time">${mm}:${ss}</div><small>${p.label}</small>`;
      // blinking when <=60s and >0
      if(remain <= ALERT_AHEAD && remain > 0){
        div.style.animation = "blink 1s infinite";
      } else {
        div.style.animation = "none";
      }
      // manual remove on click
      div.addEventListener("click", (ev)=>{ ev.stopPropagation(); if(confirm('Usuń pineskę?')){ removePin(p.id); } });
      pinsLayer.appendChild(div);
    });
  }

  function removePin(id){ state.pins = state.pins.filter(p=>p.id!==id); save(); renderPins(); }

  // ticking: alerts and auto-remove
  function tick(){
    const changed = [];
    state.pins.forEach(p => {
      const remain = p.end - now();
      if(!p.alerted && remain <= ALERT_AHEAD && remain > 0){
        // alert once
        p.alerted = true;
        try{ alertSound.currentTime = 0; alertSound.volume = 0.8; alertSound.play().catch(()=>{}); }catch(e){}
        // browser notification (if allowed)
        if("Notification" in window && Notification.permission === "granted"){
          new Notification("Metin2 Timer", { body: p.label + " za 1 minutę na " + p.map + " " + p.channel });
        }
        changed.push(p.id);
      }
    });
    // remove old pins
    state.pins = state.pins.filter(p => now() < p.end + AUTO_REMOVE_AFTER);
    if(changed.length) save();
    renderPins();
  }

  // periodic
  function startTicker(){
    setInterval(tick, 1000);
    // also cleanup to ensure storage updates occasionally
    setInterval(()=>{ save(); }, 5000);
  }

  // init
  load();
  initUI();
  startTicker();

  // expose for debugging
  window._metin2 = { state, removePin };
})();
