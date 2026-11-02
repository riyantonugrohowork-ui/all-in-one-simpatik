(async function () {
  const { myasnConfig } = await chrome.storage.local.get('myasnConfig');
  if (!myasnConfig) {
    sendMsg('fillResult', 'error', 'Config tidak ditemukan');
    return;
  }

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  function setNativeValue(el, value) {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function sendMsg(type, status, message) {
    try { chrome.runtime.sendMessage({ type, status, message }); } catch (e) {}
  }

  function sendProgress(msg) {
    sendMsg('fillProgress', 'info', msg);
  }

  async function waitForVisibleModal(timeout) {
    const start = Date.now();
    while (Date.now() - start < (timeout || 8000)) {
      const modals = document.querySelectorAll('.modal');
      for (const m of modals) {
        if (m.classList.contains('show') || getComputedStyle(m).display === 'block') {
          return m;
        }
      }
      await sleep(100);
    }
    return null;
  }

  async function waitForModalClose(timeout) {
    const start = Date.now();
    while (Date.now() - start < (timeout || 15000)) {
      const modals = document.querySelectorAll('.modal');
      let visible = false;
      for (const m of modals) {
        if (m.classList.contains('show') || getComputedStyle(m).display === 'block') {
          visible = true;
          break;
        }
      }
      if (!visible) return true;
      await sleep(200);
    }
    return false;
  }

  async function closeModalManually(modal) {
    const closeBtn = modal.querySelector('[data-bs-dismiss="modal"], .btn-close');
    if (closeBtn) {
      closeBtn.click();
      await sleep(500);
      return true;
    }
    if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
      const inst = bootstrap.Modal.getInstance(modal);
      if (inst) { inst.hide(); await sleep(500); return true; }
    }
    modal.style.display = 'none';
    modal.classList.remove('show');
    document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
    document.body.classList.remove('modal-open');
    await sleep(300);
    return true;
  }

  let buktiFilled = 0, buktiSkipped = 0, buktiError = 0;
  let realisasiFilled = 0, realisasiSkipped = 0, realisasiError = 0;

  // ===================== BUKTI DUKUNG =====================
  if (myasnConfig.action === 'bukti' || myasnConfig.action === 'all') {
    const tambahBtns = Array.from(document.querySelectorAll('table .btn.icon.btn-success'))
      .filter(b => b.textContent.trim().includes('Tambah'));

    const total = tambahBtns.length;
    sendProgress('Bukti Dukung: memulai (0/' + total + ')');

    for (let i = 0; i < tambahBtns.length; i++) {
      const btn = tambahBtns[i];

      // Skip if already filled — <ul> has <li>
      const td = btn.closest('td');
      const ul = td ? td.querySelector('ul') : null;
      if (ul && ul.querySelector('li')) {
        buktiSkipped++;
        sendProgress('Bukti Dukung: ' + (i + 1) + '/' + total + ' (sudah ada, skip)');
        continue;
      }

      btn.click();
      const modal = await waitForVisibleModal();

      if (!modal) {
        buktiError++;
        sendProgress('Bukti Dukung: ' + (i + 1) + '/' + total + ' (modal tidak muncul)');
        continue;
      }

      await sleep(400);

      const evidenInput = modal.querySelector('input[name="eviden"]');
      const buktiInput = modal.querySelector('input[name="bukti_eviden"]');

      if (evidenInput) setNativeValue(evidenInput, myasnConfig.eviden || '');
      if (buktiInput) setNativeValue(buktiInput, myasnConfig.buktiLink || '');

      await sleep(600);

      const okBtn = modal.querySelector('.modal-footer .btn-primary');
      if (okBtn) {
        okBtn.disabled = false;
        okBtn.removeAttribute('disabled');
        okBtn.click();
      }

      const closed = await waitForModalClose(8000);
      if (!closed) {
        await closeModalManually(modal);
        buktiError++;
        sendProgress('Bukti Dukung: ' + (i + 1) + '/' + total + ' (gagal simpan)');
      } else {
        buktiFilled++;
        sendProgress('Bukti Dukung: ' + (i + 1) + '/' + total + ' (OK)');
      }

      await sleep(400);
    }
  }

  // ===================== REALISASI =====================
  if (myasnConfig.action === 'realisasi' || myasnConfig.action === 'all') {
    const editBtns = Array.from(document.querySelectorAll('table .btn.icon.btn-warning'))
      .filter(b => b.textContent.trim().includes('Edit') && !b.closest('ul'));

    const total = editBtns.length;
    sendProgress('Realisasi: memulai (0/' + total + ')');

    for (let i = 0; i < editBtns.length; i++) {
      const btn = editBtns[i];

      // Skip if already filled — <span> exists in <td>
      const td = btn.closest('td');
      if (td && td.querySelector('span')) {
        realisasiSkipped++;
        sendProgress('Realisasi: ' + (i + 1) + '/' + total + ' (sudah ada, skip)');
        continue;
      }

      // Detect ASPEK
      const tr = btn.closest('tr');
      let aspek = '';
      if (tr) {
        for (const cell of tr.querySelectorAll('td')) {
          const text = cell.textContent.trim();
          if (text === 'Kuantitas' || text === 'Kualitas' || text === 'Waktu') {
            aspek = text;
            break;
          }
        }
      }

      const isWaktu = aspek === 'Waktu';
      const realisasiValue = isWaktu
        ? (myasnConfig.realisasiWaktu || '1 bulan')
        : (myasnConfig.realisasiNonWaktu || '95%');
      const sumberDataValue = isWaktu
        ? (myasnConfig.sumberDataWaktu || 'Prosentase')
        : (myasnConfig.sumberDataNonWaktu || 'Prosentase');

      btn.click();
      const modal = await waitForVisibleModal();

      if (!modal) {
        realisasiError++;
        sendProgress('Realisasi: ' + (i + 1) + '/' + total + ' (modal tidak muncul)');
        continue;
      }

      await sleep(400);

      const realisasiInput = modal.querySelector('input[name="realisasi"]');
      const sumberDataInput = modal.querySelector('input[name="sumber_data"]');

      if (realisasiInput) setNativeValue(realisasiInput, realisasiValue);
      if (sumberDataInput) setNativeValue(sumberDataInput, sumberDataValue);

      await sleep(600);

      const okBtn = modal.querySelector('.modal-footer .btn-primary');
      if (okBtn) {
        okBtn.disabled = false;
        okBtn.removeAttribute('disabled');
        okBtn.click();
      }

      const closed = await waitForModalClose(8000);
      if (!closed) {
        await closeModalManually(modal);
        realisasiError++;
        sendProgress('Realisasi: ' + (i + 1) + '/' + total + ' (gagal simpan)');
      } else {
        realisasiFilled++;
        sendProgress('Realisasi: ' + (i + 1) + '/' + total + ' (OK, ' + aspek + ')');
      }

      await sleep(400);
    }
  }

  // ===================== HASIL =====================
  const parts = [];
  if (myasnConfig.action === 'bukti' || myasnConfig.action === 'all') {
    parts.push('Bukti Dukung: ' + buktiFilled + ' diisi, ' + buktiSkipped + ' sudah ada' + (buktiError ? ', ' + buktiError + ' error' : ''));
  }
  if (myasnConfig.action === 'realisasi' || myasnConfig.action === 'all') {
    parts.push('Realisasi: ' + realisasiFilled + ' diisi, ' + realisasiSkipped + ' sudah ada' + (realisasiError ? ', ' + realisasiError + ' error' : ''));
  }

  sendMsg('fillResult', 'ok', parts.join(' | '));
})();
