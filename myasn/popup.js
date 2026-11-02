const FIELDS = ['eviden', 'buktiLink', 'realisasiNonWaktu', 'sumberDataNonWaktu', 'realisasiWaktu', 'sumberDataWaktu'];

chrome.storage.local.get('myasnConfig', (data) => {
  const c = data.myasnConfig;
  if (!c) return;
  FIELDS.forEach(f => { if (c[f] !== undefined) document.getElementById(f).value = c[f]; });
});

FIELDS.forEach(f => {
  document.getElementById(f).addEventListener('change', saveConfig);
});

function saveConfig() {
  const config = {};
  FIELDS.forEach(f => { config[f] = document.getElementById(f).value; });
  chrome.storage.local.set({ myasnConfig: config });
}

function getConfig() {
  const config = {};
  FIELDS.forEach(f => { config[f] = document.getElementById(f).value; });
  return config;
}

function showStatus(msg, cls) {
  const el = document.getElementById('status');
  el.textContent = msg;
  el.style.display = 'block';
  el.className = cls || 'info-box';
}

function setDisabled(state) {
  document.querySelectorAll('button').forEach(b => b.disabled = state);
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'fillProgress') {
    showStatus(msg.message, 'info-box');
  } else if (msg.type === 'fillResult') {
    showStatus(msg.message, msg.status === 'ok' ? 'ok' : 'err');
    setDisabled(false);
  }
});

async function inject(action) {
  setDisabled(true);
  showStatus('Sedang memproses...', 'info-box');

  const config = getConfig();
  config.action = action;
  await chrome.storage.local.set({ myasnConfig: config });

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    showStatus('Tab tidak ditemukan', 'err');
    setDisabled(false);
    return;
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['myasn/content.js']
    });
  } catch (e) {
    showStatus('Error: ' + e.message, 'err');
    setDisabled(false);
  }
}

document.getElementById('btnBukti').addEventListener('click', () => inject('bukti'));
document.getElementById('btnRealisasi').addEventListener('click', () => inject('realisasi'));
document.getElementById('btnAll').addEventListener('click', () => inject('all'));
