(async function () {
  const { skpKadisWeb } = await chrome.storage.local.get('skpKadisWeb');
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function send(status, message) {
    try { chrome.runtime.sendMessage({ type: 'skpProgress', status, message }); } catch (e) {}
  }

  function done(status, message) {
    try { chrome.runtime.sendMessage({ type: 'skpResult', status, message }); } catch (e) {}
  }

  function setNativeValue(el, value) {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function findTabel() {
    const tabel = Array.from(document.querySelectorAll('table'));
    const utama = tabel.find((t) => {
      const head = t.querySelector('thead');
      return head && /RENCANA HASIL KERJA/i.test(head.textContent);
    });
    if (utama) return utama;
    return tabel.find((t) => t.querySelector('tbody tr .btn-success')) || null;
  }

  function tombolTambah(tr) {
    const kandidat = Array.from(tr.querySelectorAll('button'));
    return kandidat.find((b) => /tambah/i.test(b.textContent.trim())) || null;
  }

  function selAksi(tr) {
    const sel = Array.from(tr.querySelectorAll('td'));
    return sel.length ? sel[sel.length - 1] : null;
  }

  function daftarAksi(tr) {
    const td = selAksi(tr);
    if (!td) return [];
    return Array.from(td.querySelectorAll('ol > li'));
  }

  function jumlahAksi(tr) {
    return daftarAksi(tr).length;
  }

  function sudahAdaAksi(tr) {
    return jumlahAksi(tr) > 0;
  }

  function tombolEdit(tr, index) {
    const li = daftarAksi(tr)[index];
    if (!li) return null;
    return li.querySelector('.btn-warning')
      || Array.from(li.querySelectorAll('button')).find((b) => /edit/i.test(b.textContent.trim()))
      || null;
  }

  async function waitForVisibleModal(timeout) {
    const start = Date.now();
    while (Date.now() - start < (timeout || 8000)) {
      const modal = document.querySelector('.modal.show')
        || Array.from(document.querySelectorAll('.modal')).find((m) => getComputedStyle(m).display === 'block');
      if (modal) {
        return modal.querySelector('.modal-content') || modal;
      }
      await sleep(100);
    }
    return null;
  }

  async function waitForModalClose(timeout) {
    const start = Date.now();
    while (Date.now() - start < (timeout || 10000)) {
      const modal = document.querySelector('.modal.show')
        || Array.from(document.querySelectorAll('.modal')).find((m) => getComputedStyle(m).display === 'block');
      if (!modal) return true;
      await sleep(200);
    }
    return false;
  }

  async function tutupModal(modal) {
    const tombol = modal.querySelector('[data-bs-dismiss="modal"], .btn-close');
    if (tombol) {
      tombol.click();
      await sleep(400);
      return;
    }
    if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
      const pembungkus = modal.closest('.modal') || modal;
      const inst = bootstrap.Modal.getInstance(pembungkus);
      if (inst) {
        inst.hide();
        await sleep(400);
        return;
      }
    }
    const pembungkus = modal.closest('.modal') || modal;
    pembungkus.style.display = 'none';
    pembungkus.classList.remove('show');
    document.querySelectorAll('.modal-backdrop').forEach((b) => b.remove());
    document.body.classList.remove('modal-open');
    await sleep(300);
  }

  async function isiModal(item) {
    const modal = await waitForVisibleModal(8000);
    if (!modal) return 'modal tidak muncul';

    await sleep(300);
    const inputDeskripsi = modal.querySelector('input[name="deskripsi"]');
    const inputTarget = modal.querySelector('input[name="target"]');

    if (!inputDeskripsi) {
      await tutupModal(modal);
      return 'input Rencana Aksi tidak ditemukan';
    }

    setNativeValue(inputDeskripsi, item.deskripsi || '');
    if (inputTarget) setNativeValue(inputTarget, item.target || '');
    await sleep(400);

    const tombolOk = modal.querySelector('.modal-footer .btn-primary');
    if (!tombolOk) {
      await tutupModal(modal);
      return 'tombol OK tidak ditemukan';
    }

    tombolOk.disabled = false;
    tombolOk.removeAttribute('disabled');
    tombolOk.click();

    const tutup = await waitForModalClose(10000);
    if (!tutup) {
      await tutupModal(modal);
      return 'gagal simpan (modal tidak menutup)';
    }
    return '';
  }

  if (!skpKadisWeb || !Array.isArray(skpKadisWeb.rows) || !skpKadisWeb.rows.length) {
    done('err', 'Tidak ada rencana aksi untuk dikirim.');
    return;
  }

  const tabel = findTabel();
  if (!tabel) {
    done('err', 'Tabel Rencana Aksi tidak ditemukan di halaman ini.');
    return;
  }

  const baris = Array.from(tabel.querySelectorAll('tbody tr'));
  if (!baris.length) {
    done('err', 'Baris tabel Rencana Aksi kosong.');
    return;
  }

  const target = skpKadisWeb.rows;
  const totalItem = target.reduce((n, r) => n + r.items.length, 0);
  let sukses = 0;
  let diedit = 0;
  let lompat = 0;
  let gagal = 0;
  let pesanGagal = '';

  send('info', `Memproses ${target.length} baris, ${totalItem} rencana aksi (0/${totalItem}).`);

  for (let i = 0; i < target.length; i++) {
    const item = target[i];
    const tr = baris[item.no - 1];

    if (!tr) {
      gagal += item.items.length;
      pesanGagal = `Baris ${item.no} tidak ada di halaman.`;
      continue;
    }

    if (!skpKadisWeb.overwrite && sudahAdaAksi(tr)) {
      lompat += item.items.length;
      send('info', `Baris ${item.no}: sudah ada rencana aksi, dilewati.`);
      continue;
    }

    if (skpKadisWeb.overwrite) {
      const jumlahWeb = jumlahAksi(tr);
      if (jumlahWeb > item.items.length) {
        pesanGagal = `Baris ${item.no}: ${jumlahWeb} aksi di web, hanya ${item.items.length} di popup (sisanya tidak diubah).`;
      }
    }

    for (let j = 0; j < item.items.length; j++) {
      const barisTerbaru = Array.from(tabel.querySelectorAll('tbody tr'))[item.no - 1];
      if (!barisTerbaru) {
        gagal++;
        pesanGagal = `Baris ${item.no} hilang saat proses.`;
        break;
      }

      const btnEdit = skpKadisWeb.overwrite ? tombolEdit(barisTerbaru, j) : null;
      const btnTambah = btnEdit ? null : tombolTambah(barisTerbaru);
      const btn = btnEdit || btnTambah;

      if (!btn) {
        gagal++;
        pesanGagal = `Baris ${item.no}: tombol Edit/Tambah untuk aksi ke-${j + 1} tidak ditemukan.`;
        send('err', pesanGagal);
        continue;
      }

      const mode = btnEdit ? 'edit' : 'tambah';
      btn.click();
      const error = await isiModal(item.items[j]);
      if (error) {
        gagal++;
        pesanGagal = `Baris ${item.no}: ${error}.`;
        send('err', `Baris ${item.no} (${j + 1}/${item.items.length}, ${mode}): ${error}`);
      } else {
        sukses++;
        if (btnEdit) diedit++;
      }
      await sleep(400);
    }
    send('info', `Baris ${item.no} selesai (${i + 1}/${target.length}).`);
  }

  const ringkas = `${sukses} berhasil (${diedit} edit), ${lompat} dilewati, ${gagal} gagal` + (pesanGagal ? ` | ${pesanGagal}` : '');
  done(gagal ? 'err' : 'ok', ringkas);
})();
