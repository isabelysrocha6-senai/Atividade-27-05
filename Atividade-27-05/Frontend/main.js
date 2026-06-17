let manualStatus = null;
let lastStt = null;

(function initTheme() {
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = saved ? saved === 'dark' : prefersDark;
    document.documentElement.classList.toggle('dark', isDark);
    updateModeButton();
})();

function MudarFundo() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateModeButton();
}

function updateModeButton() {
    const btn = document.querySelector('button[onclick="MudarFundo()"]');
    if (!btn) return;
    btn.textContent = document.documentElement.classList.contains('dark')
        ? 'MODO'
        : 'MODO';
}

function computeStatusFromStt(stt) {
  const str = (stt ?? '').toString().trim().toLowerCase();

  return /ok|on|lig|ativ|running|true/.test(str)
    ? 'Ligada'
    : 'Desligada';
}

function updateStatusDisplay() {
    const statusEl =
        document.querySelector('#machineStatus') ||
        document.querySelector('.stt .value');

    if (!statusEl) return;

    const status = manualStatus ?? computeStatusFromStt(lastStt);

    statusEl.textContent = status;

    const headerBtn = document.querySelector('#toggleMachineBtn');

    if (headerBtn) {
        headerBtn.textContent =
            status === 'Ligada' ? 'Desligar' : 'Ligar';
    }
}

let lastSensorValues = {
    temp: '--',
    umid: '--',
    vib: '--',
    stt: null
};

function clearSensors() {
    ['.temp .value', '.umid .value', '.vib .value'].forEach(sel => {
        const el = document.querySelector(sel);
        if (el) el.textContent = '--';
    });
}

function toggleMachine() {
    manualStatus =
        manualStatus === 'Ligada'
            ? 'Desligada'
            : 'Ligada';

    updateStatusDisplay();

    if (manualStatus === 'Desligada') {
        clearSensors();
    } else if (lastSensorValues) {
        setSensorValues(lastSensorValues);
    }
}

function setSensorValues({ temp, umid, vib, stt }) {

    lastStt = stt ?? lastStt;

    const effectiveStatus =
        manualStatus ?? computeStatusFromStt(lastStt);

    if (effectiveStatus === 'Desligada') {
        lastSensorValues = { temp, umid, vib, stt };
        clearSensors();
        updateStatusDisplay();
        return;
    }

    const by = (sel, v) => {
        const el = document.querySelector(sel);
        if (el) el.textContent = v ?? '--';
    };

    by('.temp .value', temp);
    by('.umid .value', umid);
    by('.vib .value', vib);

    lastSensorValues = { temp, umid, vib, stt };

    const rawSttEl = document.querySelector('.stt .value');

    if (rawSttEl) {
        rawSttEl.textContent = stt ?? '--';
    }

    updateStatusDisplay();

    verificarTemperatura(parseFloat(temp));
    verificarVibracao(parseFloat(vib));
}

function initControls() {
    const headerBtn = document.querySelector('#toggleMachineBtn');

    if (headerBtn) {
        headerBtn.addEventListener('click', toggleMachine);

        headerBtn.textContent =
            (manualStatus ?? computeStatusFromStt(lastStt)) === 'Ligada'
                ? 'Desligar'
                : 'Ligar';
    }
}

let alertaTempAtivo = false;

function verificarTemperatura(temp) {

    const card = document.querySelector('.temp');

    if (temp > 40) {

        card.style.border = '3px solid red';

        if (!alertaTempAtivo) {
            alert("⚠ ALERTA: Temperatura acima de 40°C!");
            alertaTempAtivo = true;
        }

    } else {

        card.style.border = '';

        alertaTempAtivo = false;
    }
}

let alertaVibAtivo = false;

function verificarVibracao(vib) {

    const card = document.querySelector('.vib');

    if (vib > 4) {

        card.style.border = '3px solid red';

        if (!alertaVibAtivo) {
            alert("⚠ ALERTA: Vibração crítica!");
            alertaVibAtivo = true;
        }

    } else {

        card.style.border = '';

        alertaVibAtivo = false;
    }
}

const maquinaLigada =
    (manualStatus ?? computeStatusFromStt(lastStt)) === 'Ligada';

function adicionarHistorico() {

    const lista = document.getElementById('historico');

    const item = document.createElement('li');

    item.textContent =
        `${temperatura} | ${umidade} | ${vibracao}`;

    lista.prepend(item);

    if (lista.children.length > 10) {
        lista.removeChild(lista.lastChild);
    }
}

const ctx = document.getElementById('graficoTemperatura');

const grafico = new Chart(ctx, {
    type: 'line',
  data: {
    labels: [],
    datasets: [{
      label: 'Temperatura',
      data: [],
      borderColor: '#ff6384',
      backgroundColor: 'rgba(255,99,132,0.2)',
      fill: true
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: { beginAtZero: false }
    }
  }
});

initControls();

const client = mqtt.connect('wss://broker.hivemq.com:8884/mqtt');

let temperatura = '--';
let umidade = '--';
let vibracao = '--';
let statusMaquina = '--';

client.on('connect', () => {

    console.log('MQTT conectado');

    client.subscribe('industria/temperatura');
    client.subscribe('industria/umidade');
    client.subscribe('industria/vibracao');
    client.subscribe('industria/status');
});

const updateIntervalMs = 5000;
const buffer = { temp: null, umid: null, vib: null, stt: null };

client.on('message', (topic, message) => {
  const valor = message.toString();
  if (topic === 'industria/status') {
    lastStt = valor;
    buffer.stt = valor;
  } else if (topic === 'industria/temperatura') {
    buffer.temp = valor;
  } else if (topic === 'industria/umidade') {
    buffer.umid = valor;
  } else if (topic === 'industria/vibracao') {
    buffer.vib = valor;
  }
});

setInterval(() => {
  if (buffer.temp === null && buffer.umid === null && buffer.vib === null && buffer.stt === null) return;

  const machineOn = (manualStatus ?? computeStatusFromStt(lastStt)) === 'Ligada';

  if (machineOn) {
    if (buffer.temp !== null) {
      temperatura = parseFloat(buffer.temp);
      grafico.data.labels.push(new Date().toLocaleTimeString());
      grafico.data.datasets[0].data.push(parseFloat(buffer.temp));
      if (grafico.data.labels.length > 15) {
        grafico.data.labels.shift();
        grafico.data.datasets[0].data.shift();
      }
      grafico.update();
    }

    if (buffer.umid !== null) {
      umidade = parseFloat(buffer.umid);
    }

    if (buffer.vib !== null) {
      vibracao = parseFloat(buffer.vib);
    }

    adicionarHistorico();

    setSensorValues({
      temp: (typeof temperatura === 'number') ? `${temperatura} °C` : (buffer.temp ?? lastSensorValues.temp ?? '--'),
      umid: (typeof umidade === 'number') ? `${umidade} %` : (buffer.umid ?? lastSensorValues.umid ?? '--'),
      vib: (typeof vibracao === 'number') ? `${vibracao}` : (buffer.vib ?? lastSensorValues.vib ?? '--'),
      stt: lastStt
    });

    const el = document.getElementById('ultimaAtualizacao');
    if (el) el.textContent = new Date().toLocaleString('pt-BR');
  } else {
    lastSensorValues.temp = buffer.temp ?? lastSensorValues.temp;
    lastSensorValues.umid = buffer.umid ?? lastSensorValues.umid;
    lastSensorValues.vib = buffer.vib ?? lastSensorValues.vib;
  }

  buffer.temp = buffer.umid = buffer.vib = buffer.stt = null;
}, updateIntervalMs);