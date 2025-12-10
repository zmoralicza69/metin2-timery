const MAPS = {
  Las: {
    src: 'maps/las.svg',
    buttons: [
      { l: 'Metin 75', m: 27, c: '#ff4444' },
      { l: 'Metin 80', m: 27, c: '#ffb000' },
      { l: 'Naara', m: 40, c: '#8e2be2' }
    ]
  },
  Ognista: {
    src: 'maps/ognista.svg',
    buttons: [
      { l: 'Metin', m: 27, c: '#ff2b2b' },
      { l: 'Miniboss', m: 40, c: '#ffb000' },
      { l: 'Boss', m: 45, c: '#8e2be2' }
    ]
  },
  Wężowe: {
    src: 'maps/wezowe.svg',
    buttons: [
      { l: 'Serpentor', m: 45, c: '#ff2b2b' },
      { l: 'Zadlak', m: 40, c: '#ffb000' },
      { l: 'Szeptoruj', m: 40, c: '#8e2be2' }
    ]
  }
};

const CHANNELS = ['CH1', 'CH2', 'CH3', 'CH4', 'CH5', 'CH6', 'CH7'];

const mapSelect = document.getElementById('mapSelect');
const channelSelect = document.getElementById('channelSelect');
const buttons = document.getElementById('buttons');
const mapImg = document.getElementById('mapImg');
const pinsLayer = document.getElementById('pinsLayer');
const timersList = document.getElementById('timersList');
const alertSound = document.getElementById('alertSound');
const mapContainer = document.getElementById('mapContainer');

let pins = [];
let placing = null;

// Inicjalizacja opcji wyboru map i kanałów
Object.keys(MAPS).forEach(m => mapSelect.add(new Option(m, m)));
CHANNELS.forEach(c => channelSelect.add(new Option(c, c)));

function renderButtons() {
  buttons.innerHTML = '';
  const selectedMap = mapSelect.value;
  MAPS[selectedMap].buttons.forEach(b => {
    const btn = document.createElement('button');
    btn.textContent = b.l + ` (${b.m}m)`;
    btn.style.background = b.c;
    btn.onclick = () => {
      placing = b;
      mapContainer.style.cursor = 'crosshair';
      alert('Kliknij na mapę, aby postawić pineskę');
    };
    buttons.appendChild(btn);
  });
}

function render() {
  const now = Date.now();
  pins = pins.filter(p => now < p.end + 30000);

  pinsLayer.innerHTML = '';
  timersList.innerHTML = '';

  [...pins]
    .filter(p => p.map === mapSelect.value && p.channel === channelSelect.value)
    .sort((a, b) => (a.end - now) - (b.end - now))
    .forEach(p => {
      const rem = Math.max(0, Math.floor((p.end - now) / 1000));
      const mm = String(Math.floor(rem / 60)).padStart(2, '0');
      const ss = String(rem % 60).padStart(2, '0');

      const pin = document.createElement('div');
      pin.className = 'pin' + (rem <= 60 && rem > 0 ? ' blink' : '');
      pin.style.left = p.x + '%';
      pin.style.top = p.y + '%';
      pin.style.background = p.color;
      pin.textContent = `${mm}:${ss}`;
      pinsLayer.appendChild(pin);

      const row = document.createElement('div');
      row.className = 'timerrow' + (rem <= 60 && rem > 0 ? ' blink' : '');
      row.innerHTML = `<div>${p.label} • ${p.channel}</div><div>${mm}:${ss}</div>`;
      timersList.appendChild(row);

      if (rem === 60) {
        alertSound.play().catch(() => {});
      }
    });
}

// Dodawanie pineski po kliknięciu na mapę
mapContainer.addEventListener('click', e => {
  if (!placing) return;
  const r = mapImg.getBoundingClientRect();
  const x = ((e.clientX - r.left) / r.width) * 100;
  const y = ((e.clientY - r.top) / r.height) * 100;

  pins.push({
    id: Math.random(),
    x,
    y,
    end: Date.now() + placing.m * 60000,
    color: placing.c,
    label: placing.l,
    channel: channelSelect.value,
    map: mapSelect.value
  });

  placing = null;
  mapContainer.style.cursor = 'default';
  render();
});

// Usuwanie pineski po kliknięciu
pinsLayer.addEventListener('click', e => {
  if (!e.target.classList.contains('pin')) return;
  if (confirm('Usuń pineskę?')) {
    const left = e.target.style.left;
    const top = e.target.style.top;
    const index = pins.findIndex(p => p.x + '%' === left && p.y + '%' === top && p.map === mapSelect.value && p.channel === channelSelect.value);
    if (index !== -1) {
      pins.splice(index, 1);
      render();
    }
  }
});

// Reakcja na zmianę mapy
mapSelect.addEventListener('change', () => {
  const selectedMap = mapSelect.value;
  mapImg.src = MAPS[selectedMap].src;
  renderButtons();

  // Możesz filtrować pineski jeśli chcesz, ale tutaj pozostawiam wszystkie
  render();
});

// Reakcja na zmianę kanału
channelSelect.addEventListener('change', () => {
  render();
});

// Inicjalizacja strony
mapSelect.value = Object.keys(MAPS)[0];
channelSelect.value = CHANNELS[0];
mapImg.src = MAPS[mapSelect.value].src;
renderButtons();
render();

// Odświeżanie timerów co sekundę
setInterval(render, 1000);
