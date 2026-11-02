const ADD_URL = 'https://e-kin.semarangkota.go.id/administrator/aktivitas_harian/add_new';
const STORAGE_KEY = 'riwayat';
const FILL_KEY = 'apicutiFill';

let running = false;
let isiRunning = false;

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'startInsert') {
    if (running) {
      sendResponse({ ok: false, error: 'Proses insert sedang berjalan' });
      return;
    }
    runQueue().then(sendResponse);
    return true;
  }

  if (msg.action === 'startIsiCuti') {
    if (isiRunning) {
      sendResponse({ ok: false, error: 'Proses pengisian cuti sedang berjalan' });
      return;
    }
    runIsiCuti();
    sendResponse({ ok: true, started: true });
    return;
  }
});

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function waitTabLoaded(tabId, timeout = 20000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
        if (tab && tab.status === 'complete') return resolve();
        if (Date.now() - start > timeout) return reject(new Error('Timeout memuat halaman'));
        setTimeout(check, 300);
      });
    };
    check();
  });
}

async function openBackgroundFormTab() {
  const tab = await chrome.tabs.create({ url: ADD_URL, active: false });
  await waitTabLoaded(tab.id);
  return tab;
}

function broadcast(payload) {
  try {
    chrome.runtime.sendMessage(payload, () => {
      void chrome.runtime.lastError;
    });
  } catch (e) {}
}

function pageFillForm(data) {
  function setNativeValue(el, value) {
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function parseISO(iso) {
    const [y, m, d] = iso.split('-').map((n) => parseInt(n, 10));
    return { y, m: m - 1, d };
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  async function waitFor(cond, timeout, label) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const v = cond();
      if (v) return v;
      await sleep(200);
    }
    throw new Error('Timeout: ' + label);
  }

  async function openDatepicker(el) {
    el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    el.click();
    el.dispatchEvent(new Event('focus', { bubbles: true }));

    await waitFor(() => {
      const dp = document.querySelector('.xdsoft_datetimepicker');
      return dp && dp.style.display !== 'none' && dp.offsetParent !== null;
    }, 5000, 'kalender tanggal terbuka');
  }

  async function setTanggal(isoDate) {
    const el = document.querySelector('#tanggal');
    if (!el) throw new Error('#tanggal tidak ditemukan');

    const { y: targetY, m: targetM, d: targetD } = parseISO(isoDate);

    await openDatepicker(el);

    const monthEl = await waitFor(
      () => document.querySelector('.xdsoft_monthpicker .xdsoft_monthselect .xdsoft_option.xdsoft_current'),
      3000,
      'info bulan kalender'
    );
    const yearEl = document.querySelector('.xdsoft_monthpicker .xdsoft_yearselect .xdsoft_option.xdsoft_current');
    if (!monthEl || !yearEl) throw new Error('Info bulan/tahun kalender tidak ditemukan');

    const curM = parseInt(monthEl.dataset.value, 10);
    const curY = parseInt(yearEl.dataset.value, 10);
    const diff = (targetY * 12 + targetM) - (curY * 12 + curM);
    const navSelector = diff > 0 ? '.xdsoft_monthpicker .xdsoft_next' : '.xdsoft_monthpicker .xdsoft_prev';

    for (let i = 0; i < Math.abs(diff); i++) {
      const navBtn = document.querySelector(navSelector);
      if (!navBtn) break;
      navBtn.click();
      await sleep(150);
    }

    const cell = await waitFor(() => {
      const cells = document.querySelectorAll('.xdsoft_calendar td.xdsoft_date[data-date][data-month][data-year]');
      for (const c of cells) {
        if (c.classList.contains('xdsoft_disabled')) continue;
        if (
          parseInt(c.dataset.date, 10) === targetD &&
          parseInt(c.dataset.month, 10) === targetM &&
          parseInt(c.dataset.year, 10) === targetY
        ) {
          return c;
        }
      }
      return null;
    }, 3000, 'sel tanggal di kalender');

    cell.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    cell.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    cell.click();

    await waitFor(() => el.value && el.value.trim().length > 0, 3000, 'tanggal terisi setelah klik kalender');

    document.body.click();
    el.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  async function selectButir(keyword) {
    const $ = window.jQuery;
    if (!$) throw new Error('jQuery tidak tersedia di halaman (MAIN world)');

    const $sel = $('#id_butir_kegiatan');
    if (!$sel.length) throw new Error('#id_butir_kegiatan tidak ditemukan');

    $sel.select2('open');

    const searchEl = await waitFor(
      () => document.querySelector('.select2-container--open .select2-search__field, input.select2-search__field'),
      5000,
      'search box select2 muncul'
    );

    const $search = $(searchEl);
    $search.val(keyword);
    $search.trigger('input');
    $search.trigger('keyup');

    const kw = keyword.toLowerCase();

    const getRealOptions = () => {
      const all = document.querySelectorAll('.select2-results__option');
      return Array.from(all).filter(
        (li) => !li.classList.contains('select2-results__message') &&
                li.getAttribute('aria-disabled') !== 'true'
      );
    };

    await waitFor(() => {
      const items = getRealOptions();
      return items.length > 0;
    }, 10000, 'hasil pencarian AJAX butir kegiatan "' + keyword + '"');

    let targetIndex = -1;
    let items = getRealOptions();
    for (let i = 0; i < items.length; i++) {
      const txt = (items[i].textContent || '').trim().toLowerCase();
      if (txt === kw) { targetIndex = i; break; }
    }
    if (targetIndex === -1) {
      for (let i = 0; i < items.length; i++) {
        const txt = (items[i].textContent || '').trim().toLowerCase();
        if (txt.indexOf(kw) !== -1) { targetIndex = i; break; }
      }
    }
    if (targetIndex === -1) targetIndex = 0;

    for (let i = 0; i < targetIndex; i++) {
      $search.trigger($.Event('keydown', { which: 40, key: 'ArrowDown' }));
      await sleep(80);
    }

    $search.trigger($.Event('keydown', { which: 13, key: 'Enter' }));

    await waitFor(() => $sel.val(), 5000, 'butir kegiatan terpilih (select2)');
  }

  async function waitAutoFill() {
    await waitFor(() => {
      const sw = document.querySelector('#satuan_waktu');
      return sw && sw.value.trim();
    }, 10000, 'auto-fill satuan_waktu');
  }

  async function waitSaveDone() {
    const urlBefore = location.href;

    await waitFor(() => {
      if (location.href !== urlBefore) return true;

      const success = document.querySelector('.callout.callout-success, .callout-success');
      if (success) return true;

      const error = document.querySelector('.callout.callout-danger, .callout-danger, .callout.callout-warning, .callout-warning');
      if (error) throw new Error('Save gagal: ' + error.textContent.trim().slice(0, 200));

      const msg = document.querySelector('.message');
      if (msg && msg.textContent.trim()) return true;

      return false;
    }, 8000, 'konfirmasi save (callout-success)');

    await sleep(500);
  }

  return (async () => {
    try {
      await setTanggal(data.tanggal);
      await selectButir(data.butir);
      await waitAutoFill();

      const catatan = document.querySelector('#catatan');
      if (catatan) setNativeValue(catatan, data.catatan || '');

      const kuantitas = document.querySelector('#kuantitas');
      if (kuantitas) {
        setNativeValue(kuantitas, String(data.kuantitas || 1));
        kuantitas.dispatchEvent(new Event('keyup', { bubbles: true }));
        kuantitas.dispatchEvent(new Event('blur', { bubbles: true }));

        await waitFor(() => {
          const w = document.querySelector('#waktu');
          return w && w.value.trim().length > 0;
        }, 8000, 'auto-fill waktu setelah kuantitas diisi');
      }

      const btnSave = document.querySelector('button.btn_save[data-stype="stay"]');
      if (!btnSave) throw new Error('Tombol Save tidak ditemukan');
      btnSave.click();

      await waitSaveDone();

      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  })();
}

async function fillOnPage(tabId, data) {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    world: 'MAIN',
    func: pageFillForm,
    args: [data]
  });
  const result = results && results[0] && results[0].result;
  if (!result) throw new Error('Tidak ada hasil dari halaman (executeScript gagal)');
  return result;
}

async function runQueue() {
  running = true;
  broadcast({ action: 'queueProgress', text: 'Memulai insert...' });

  try {
    const res = await chrome.storage.local.get(STORAGE_KEY);
    const items = res[STORAGE_KEY] || [];
    const targets = items.filter((i) => i.status !== 'done');

    if (!targets.length) {
      broadcast({ action: 'queueProgress', text: 'Tidak ada antrian' });
      return { ok: true, done: 0, failed: 0 };
    }

    let n = 0;
    for (const item of targets) {
      n++;
      const label = '[' + n + '/' + targets.length + '] ' + item.butir;
      let formTab;

      try {
        broadcast({ action: 'queueProgress', text: label + ' — membuka form di background...' });
        formTab = await openBackgroundFormTab();
        await sleep(500);

        broadcast({ action: 'queueProgress', text: label + ' — mengisi form...' });
        const resp = await fillOnPage(formTab.id, item);

        if (resp && resp.ok) {
          item.status = 'done';
          delete item.error;
        } else {
          item.status = 'error';
          item.error = resp && resp.error ? resp.error : 'unknown';
        }
      } catch (e) {
        item.status = 'error';
        item.error = e.message;
      }

      if (formTab) {
        try { await chrome.tabs.remove(formTab.id); } catch (e2) {}
      }

      await chrome.storage.local.set({ [STORAGE_KEY]: items });
      broadcast({ action: 'queueProgress', text: label + (item.status === 'done' ? ' — OK' : ' — GAGAL: ' + item.error) });
    }

    const failed = targets.filter((i) => i.status === 'error').length;
    broadcast({
      action: 'queueProgress',
      text: 'Selesai. Sukses: ' + (targets.length - failed) + ', Gagal: ' + failed
    });

    return { ok: true, done: targets.length - failed, failed };
  } finally {
    running = false;
  }
}

function waitTabLeaveForm(tabId, id, timeout) {
  return new Promise((resolve) => {
    const start = Date.now();
    const formRe = new RegExp('pengajuan_tentukan_tanggal/' + id);
    const check = () => {
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError || !tab) return resolve(false);
        if (tab.url && !formRe.test(tab.url)) return resolve(true);
        if (Date.now() - start > timeout) return resolve(false);
        setTimeout(check, 500);
      });
    };
    check();
  });
}

async function runIsiCuti() {
  isiRunning = true;
  broadcast({ action: 'apicutiProgress', text: 'Memulai pengisian nomor surat...' });

  try {
    const res = await chrome.storage.local.get(FILL_KEY);
    const state = res[FILL_KEY];
    if (!state || !Array.isArray(state.queue) || !state.queue.length) {
      broadcast({ action: 'apicutiProgress', text: 'Antrian pengisian kosong.' });
      return { ok: true, done: 0, failed: 0 };
    }

    state.status = 'running';
    const done = state.done || {};
    const targets = state.queue.filter((q) => !done[q.id]);

    let n = 0;
    let failed = 0;

    for (const item of targets) {
      n++;
      const label = '[' + n + '/' + targets.length + '] ' + item.nama;
      let tab;

      try {
        broadcast({ action: 'apicutiProgress', text: label + ' — membuka form di tab baru...' });
        tab = await chrome.tabs.create({ url: item.url, active: false });
        await waitTabLoaded(tab.id);

        broadcast({ action: 'apicutiProgress', text: label + ' — mengisi & menyimpan...' });
        const ok = await waitTabLeaveForm(tab.id, item.id, 30000);

        if (ok) {
          done[item.id] = true;
        } else {
          failed++;
        }

        state.done = done;
        state.log = (ok ? 'Terisi: ' : 'Gagal (timeout): ') + item.nama;
      } catch (e) {
        failed++;
        state.log = 'Gagal: ' + item.nama + ' — ' + e.message;
      }

      if (tab) {
        try { await chrome.tabs.remove(tab.id); } catch (e2) {}
      }

      await chrome.storage.local.set({ [FILL_KEY]: state });
      broadcast({
        action: 'apicutiProgress',
        text: label + (done[item.id] ? ' — OK' : ' — GAGAL')
      });
      await sleep(400);
    }

    state.status = 'idle';
    state.log = 'Selesai. Sukses: ' + (targets.length - failed) + ', Gagal: ' + failed + '.';
    await chrome.storage.local.set({ [FILL_KEY]: state });
    broadcast({ action: 'apicutiProgress', text: state.log });

    return { ok: true, done: targets.length - failed, failed };
  } finally {
    isiRunning = false;
  }
}
