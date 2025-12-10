const MAPS={
  Las:{src:'maps/las.svg',buttons:[{l:'Metin 75',m:27,c:'#ff4444'}]}
};
const CHANNELS=['CH1','CH2','CH3','CH4','CH5','CH6','CH7'];

const mapSelect=document.getElementById('mapSelect');
const channelSelect=document.getElementById('channelSelect');
const buttons=document.getElementById('buttons');
const mapImg=document.getElementById('mapImg');
const pinsLayer=document.getElementById('pinsLayer');
const timersList=document.getElementById('timersList');
const alertSound=document.getElementById('alertSound');

let pins=[], placing=null;

Object.keys(MAPS).forEach(m=>mapSelect.add(new Option(m,m)));
CHANNELS.forEach(c=>channelSelect.add(new Option(c,c)));

mapSelect.value='Las';
mapImg.src=MAPS.Las.src;

MAPS.Las.buttons.forEach(b=>{
 const btn=document.createElement('button');
 btn.textContent=b.l;
 btn.style.background=b.c;
 btn.onclick=()=>placing=b;
 buttons.appendChild(btn);
});

document.getElementById('mapContainer').onclick=e=>{
 if(!placing)return;
 const r=mapImg.getBoundingClientRect();
 pins.push({
  id:Math.random(),
  x:(e.clientX-r.left)/r.width*100,
  y:(e.clientY-r.top)/r.height*100,
  end:Date.now()+placing.m*60000,
  color:placing.c,
  label:placing.l,
  channel:channelSelect.value
 });
 placing=null;
 render();
};

function render(){
 pins=pins.filter(p=>Date.now()<p.end+30000);
 pinsLayer.innerHTML='';
 timersList.innerHTML='';

 [...pins].sort((a,b)=>(a.end-Date.now())-(b.end-Date.now())).forEach(p=>{
  const rem=Math.max(0,Math.floor((p.end-Date.now())/1000));
  const mm=String(Math.floor(rem/60)).padStart(2,'0');
  const ss=String(rem%60).padStart(2,'0');

  const pin=document.createElement('div');
  pin.className='pin'+(rem<=60&&rem>0?' blink':'');
  pin.style.left=p.x+'%';
  pin.style.top=p.y+'%';
  pin.style.background=p.color;
  pin.textContent=`${mm}:${ss}`;
  pinsLayer.appendChild(pin);

  const row=document.createElement('div');
  row.className='timerrow'+(rem<=60&&rem>0?' blink':'');
  row.innerHTML=`<div>${p.label} • ${p.channel}</div><div>${mm}:${ss}</div>`;
  timersList.appendChild(row);

  if(rem===60)alertSound.play().catch(()=>{});
 });
}
setInterval(render,1000);
