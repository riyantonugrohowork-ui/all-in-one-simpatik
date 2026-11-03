(async function () {
  const { skpDukungConfig } = await chrome.storage.local.get('skpDukungConfig');
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function send(msg) {
    try { chrome.runtime.sendMessage(msg); } catch (e) {}
  }

  function progress(message) {
    send({ type: 'skpDukungProgress', status: 'info', message });
  }

  function selesai(status, message, mode) {
    send({ type: 'skpDukungResult', status, message, mode });
  }

  function setNativeValue(el, value) {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function findTabel() {
    const tabel = Array.from(document.querySelectorAll('table'));
    return tabel.find((t) => {
      const head = t.querySelector('thead');
      if (!head) return false;
      const teks = head.textContent;
      return /BUKTI DUKUNG/i.test(teks) && /REALISASI/i.test(teks);
    }) || tabel.find((t) => t.querySelector('tbody tr .btn-success')) || null;
  }

  function barisIndikator(tabel) {
    return Array.from(tabel.querySelectorAll('tbody tr'))
      .filter((tr) => tr.querySelectorAll('td').length >= 6);
  }

  function selBukti(tr) {
    return Array.from(tr.querySelectorAll('td'))
      .find((td) => td.querySelector('button.btn-success')) || null;
  }

  function selRealisasi(tr) {
    return Array.from(tr.querySelectorAll('td')).find((td) => {
      return Array.from(td.querySelectorAll('button.btn-warning'))
        .some((b) => !b.closest('ul'));
    }) || null;
  }

  function tombolTeks(scope, pola) {
    return Array.from(scope.querySelectorAll('button'))
      .find((b) => pola.test(b.textContent.trim())) || null;
  }

  async function waitForVisibleModal(timeout) {
    const start = Date.now();
    while (Date.now() - start < (timeout || 8000)) {
      const modal = document.querySelector('.modal.show')
        || Array.from(document.querySelectorAll('.modal')).find((m) => getComputedStyle(m).display === 'block');
      if (modal) return modal.querySelector('.modal-content') || modal;
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
    const pembungkus = modal.closest('.modal') || modal;
    const tombol = modal.querySelector('[data-bs-dismiss="modal"], .btn-close');
    if (tombol) {
      tombol.click();
      await sleep(400);
      return;
    }
    if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
      const inst = bootstrap.Modal.getInstance(pembungkus);
      if (inst) {
        inst.hide();
        await sleep(400);
        return;
      }
    }
    pembungkus.style.display = 'none';
    pembungkus.classList.remove('show');
    document.querySelectorAll('.modal-backdrop').forEach((b) => b.remove());
    document.body.classList.remove('modal-open');
    await sleep(300);
  }

  async function isiModal(nilai) {
    const modal = await waitForVisibleModal(8000);
    if (!modal) return 'modal tidak muncul';

    await sleep(300);
    let terisi = 0;

    Object.keys(nilai).forEach((nama) => {
      const input = modal.querySelector('input[name="' + nama + '"]');
      if (input) {
        setNativeValue(input, nilai[nama] || '');
        terisi++;
      }
    });

    if (!terisi) {
      await tutupModal(modal);
      return 'input modal tidak ditemukan';
    }

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

  async function konfirmasiModal() {
    const modal = await waitForVisibleModal(800);
    if (!modal) return false;

    const tombol = modal.querySelector('.modal-footer .btn-primary')
      || Array.from(modal.querySelectorAll('.modal-footer button'))
        .find((b) => /^(ok|ya|hapus|setuju)/i.test(b.textContent.trim()));

    if (tombol) {
      tombol.disabled = false;
      tombol.removeAttribute('disabled');
      tombol.click();
      await waitForModalClose(8000);
      return true;
    }

    await tutupModal(modal);
    return false;
  }

  if (!skpDukungConfig) {
    selesai('err', 'Config tidak ditemukan.', '');
    return;
  }

  const tabel = findTabel();
  if (!tabel) {
    selesai('err', 'Tabel data dukung tidak ditemukan di halaman ini.', skpDukungConfig.mode);
    return;
  }

  const daftarBaris = barisIndikator(tabel);
  if (!daftarBaris.length) {
    selesai('err', 'Baris indikator tidak ditemukan.', skpDukungConfig.mode);
    return;
  }

  // ===================== BACA DARI WEB =====================
  if (skpDukungConfig.mode === 'baca') {
    progress(`Membaca ${daftarBaris.length} baris...`);

    const hasil = {};
    let judulDariWeb = '';

    for (let i = 0; i < daftarBaris.length; i++) {
      const tr = daftarBaris[i];

      const tdBukti = selBukti(tr);
      const tautan = tdBukti ? tdBukti.querySelector('ul li a') : null;

      const tdRealisasi = selRealisasi(tr);
      const span = tdRealisasi ? tdRealisasi.querySelector('span[title], span') : null;

      let realisasi = '';
      if (span) {
        const teks = span.textContent.trim();
        const pisah = teks.match(/^([\d.,]+\s*%?)\s*berdasarkan\s*(.*)$/i);
        realisasi = pisah ? pisah[1].trim() : teks;
      }

      if (tautan && !judulDariWeb) judulDariWeb = tautan.textContent.trim();

      hasil[i + 1] = {
        url: tautan ? tautan.href : '',
        realisasi
      };
    }

    const { skpDukungData } = await chrome.storage.local.get('skpDukungData');
    const gabung = Object.assign({}, skpDukungData || {});
    Object.keys(hasil).forEach((k) => {
      const web = hasil[k];
      const lama = gabung[k] || {};
      const baru = {
        url: web.url || lama.url || '',
        realisasi: web.realisasi || lama.realisasi || ''
      };
      if (baru.url || baru.realisasi) {
        gabung[k] = baru;
      } else {
        delete gabung[k];
      }
    });

    await chrome.storage.local.set({ skpDukungData: gabung });

    if (judulDariWeb) {
      const { skpDukungJudul } = await chrome.storage.local.get('skpDukungJudul');
      if (!skpDukungJudul) await chrome.storage.local.set({ skpDukungJudul: judulDariWeb });
    }

    const adaBukti = Object.keys(hasil).filter((k) => hasil[k].url).length;
    const adaRealisasi = Object.keys(hasil).filter((k) => hasil[k].realisasi).length;
    selesai('ok', `Terbaca: ${adaBukti} bukti dukung, ${adaRealisasi} realisasi dari ${daftarBaris.length} baris.`, 'baca');
    return;
  }

  // ===================== BERSIHKAN DI WEB =====================
  if (skpDukungConfig.mode === 'hapus') {
    let buktiHapus = 0;
    let realisasiKosong = 0;
    let gagal = 0;
    let pesanGagal = '';

    progress(`Membersihkan ${daftarBaris.length} baris di web...`);

    for (let i = 0; i < daftarBaris.length; i++) {
      let tr = barisIndikator(tabel)[i];

      const tdBukti = tr ? selBukti(tr) : null;
      const jumlahLi = tdBukti ? tdBukti.querySelectorAll('ul li').length : 0;

      for (let j = jumlahLi - 1; j >= 0; j--) {
        tr = barisIndikator(tabel)[i];
        const tdSekarang = tr ? selBukti(tr) : null;
        const li = tdSekarang ? tdSekarang.querySelectorAll('ul li')[j] : null;
        if (!li) continue;

        const tombolHapus = tombolTeks(li, /hapus/i) || li.querySelector('button.btn-danger');
        if (!tombolHapus) {
          gagal++;
          pesanGagal = `Baris ${i + 1}: tombol Hapus tidak ditemukan.`;
          continue;
        }

        tombolHapus.click();
        await konfirmasiModal();
        buktiHapus++;
        await sleep(400);
      }

      tr = barisIndikator(tabel)[i];
      const tdRealisasi = tr ? selRealisasi(tr) : null;
      const adaNilai = tdRealisasi ? !!tdRealisasi.querySelector('span') : false;

      if (adaNilai) {
        const tombolEdit = tombolTeks(tdRealisasi, /edit/i);
        if (!tombolEdit) {
          gagal++;
          pesanGagal = `Baris ${i + 1}: tombol edit realisasi tidak ditemukan.`;
        } else {
          tombolEdit.click();
          const error = await isiModal({ realisasi: '', sumber_data: '' });
          if (error) {
            gagal++;
            pesanGagal = `Baris ${i + 1} realisasi: ${error}.`;
          } else {
            realisasiKosong++;
          }
          await sleep(300);
        }
      }

      progress(`Baris ${i + 1} selesai (${i + 1}/${daftarBaris.length}).`);
    }

    const ringkas = `${buktiHapus} bukti dukung dihapus, ${realisasiKosong} realisasi dikosongkan, ${gagal} gagal`
      + (pesanGagal ? ` | ${pesanGagal}` : '');
    selesai(gagal ? 'err' : 'ok', ringkas, 'hapus');
    return;
  }

  // ===================== ISI KE WEB =====================
  const target = skpDukungConfig.rows || [];
  if (!target.length) {
    selesai('err', 'Tidak ada data untuk dikirim.', 'isi');
    return;
  }

  let buktiOk = 0;
  let buktiLompat = 0;
  let realisasiOk = 0;
  let gagal = 0;
  let pesanGagal = '';

  progress(`Memproses ${target.length} baris.`);

  for (let i = 0; i < target.length; i++) {
    const paket = target[i];
    const idx = Number(paket.key) - 1;
    const item = paket.item || {};

    let tr = barisIndikator(tabel)[idx];
    if (!tr) {
      gagal++;
      pesanGagal = `Baris ${paket.key} tidak ada di halaman.`;
      continue;
    }

    if (item.judul || item.url) {
      const tdBukti = selBukti(tr);
      if (!tdBukti) {
        gagal++;
        pesanGagal = `Sel Bukti Dukung baris ${paket.key} tidak ditemukan.`;
      } else {
        const liLama = tdBukti.querySelector('ul li');

        if (liLama && !skpDukungConfig.overwrite) {
          buktiLompat++;
          progress(`Baris ${paket.key}: bukti dukung sudah ada, dilewati.`);
        } else {
          let tombol = null;
          let mode = 'tambah';

          if (liLama) {
            tombol = tombolTeks(liLama, /edit/i);
            mode = 'edit';
          }
          if (!tombol) tombol = tombolTeks(tdBukti, /tambah/i);
          if (!tombol) tombol = tdBukti.querySelector('button.btn-success');

          if (!tombol) {
            gagal++;
            pesanGagal = `Tombol bukti dukung baris ${paket.key} tidak ditemukan.`;
          } else {
            tombol.click();
            const error = await isiModal({
              eviden: item.judul || '',
              bukti_eviden: item.url || ''
            });
            if (error) {
              gagal++;
              pesanGagal = `Baris ${paket.key} bukti (${mode}): ${error}.`;
              progress(pesanGagal);
            } else {
              buktiOk++;
            }
            await sleep(400);
          }
        }
      }
    }

    if (item.realisasi) {
      tr = barisIndikator(tabel)[idx];
      const tdRealisasi = tr ? selRealisasi(tr) : null;
      if (!tdRealisasi) {
        gagal++;
        pesanGagal = `Sel realisasi baris ${paket.key} tidak ditemukan.`;
        continue;
      }

      const tombolEdit = tombolTeks(tdRealisasi, /edit/i);
      if (!tombolEdit) {
        gagal++;
        pesanGagal = `Tombol edit realisasi baris ${paket.key} tidak ditemukan.`;
        continue;
      }

      tombolEdit.click();
      const error = await isiModal({
        realisasi: item.realisasi || '',
        sumber_data: item.sumber || ''
      });
      if (error) {
        gagal++;
        pesanGagal = `Baris ${paket.key} realisasi: ${error}.`;
        progress(pesanGagal);
      } else {
        realisasiOk++;
      }
      await sleep(400);
    }

    progress(`Baris ${paket.key} selesai (${i + 1}/${target.length}).`);
  }

  const ringkas = `${buktiOk} bukti dukung, ${realisasiOk} realisasi, ${buktiLompat} dilewati, ${gagal} gagal`
    + (pesanGagal ? ` | ${pesanGagal}` : '');
  selesai(gagal ? 'err' : 'ok', ringkas, 'isi');
})();
