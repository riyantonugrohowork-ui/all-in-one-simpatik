const BUTIR_KEGIATAN = [
  { nama: "Mengelola Dokumen Kepegawaian", waktu: 120, satuan: "Dokumen" },
  { nama: "Memeriksa Kelengkapan Dokumen Kepegawaian Masing-Masing ASN", waktu: 120, satuan: "Dokumen" },
  { nama: "Menyusun Administrasi Kepegawaian", waktu: 90, satuan: "Dokumen" },
  { nama: "Menyusun dan mengarsip dokumen", waktu: 60, satuan: "Dokumen" },
  { nama: "Mengikuti Seminar/pelatihan/diklat", waktu: 180, satuan: "Kegiatan" },
  { nama: "Membuat usulan Kenaikan Gaji Berkala", waktu: 120, satuan: "Dokumen" },
  { nama: "Membuat usulan Kenaikan Pangkat", waktu: 90, satuan: "Dokumen" },
  { nama: "Membuat usulan Pensiun ASN", waktu: 90, satuan: "Dokumen" },
  { nama: "Membuat pengajuan cuti bagi ASN", waktu: 90, satuan: "Dokumen" },
  { nama: "Melaksanakan tugas kedinasan lain yang diberikan oleh pimpinan sesuai tugas dan fungsinya", waktu: 60, satuan: "Kegiatan" },
  { nama: "Menyiapkan kegiatan pengelolaan Website dan Portal", waktu: 45, satuan: "Kegiatan" },
  { nama: "Mengikuti Rapat Koordinasi internal", waktu: 180, satuan: "Kegiatan" },
  { nama: "Mengikuti rapat eksternal", waktu: 120, satuan: "Kegiatan" },
  { nama: "Membuat Program Aplikasi Sistem Informasi", waktu: 240, satuan: "Kegiatan" },
  { nama: "Mengembangkan Program Aplikasi Sistem Informasi", waktu: 240, satuan: "Kegiatan" },
  { nama: "Mengikuti apel pagi", waktu: 30, satuan: "Kegiatan" }
];

const STORAGE_KEY = 'riwayat';
const $ = (id) => document.getElementById(id);

function setStatus(msg, type) {
  const el = $('status');
  el.textContent = msg;
  el.className = 'status show ' + (type || 'info');
}

function setInsertStatus(msg, type) {
  const el = $('insert-status');
  el.textContent = msg;
  el.className = 'status show ' + (type || 'info');
}

function todayStr() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + mm + '-' + dd;
}

function initButirDropdown() {
  const sel = $('butir');
  BUTIR_KEGIATAN.forEach((b, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = b.nama;
    sel.appendChild(opt);
  });
  updateButirInfo();
  sel.addEventListener('change', updateButirInfo);
}

function updateButirInfo() {
  const b = BUTIR_KEGIATAN[$('butir').value];
  $('butir-info').textContent = b
    ? 'Waktu: ' + b.waktu + ' menit | Satuan: ' + b.satuan
    : '';
}

async function loadRiwayat() {
  const res = await chrome.storage.local.get(STORAGE_KEY);
  return res[STORAGE_KEY] || [];
}

async function saveRiwayat(items) {
  await chrome.storage.local.set({ [STORAGE_KEY]: items });
}

function itemWaktu(it) {
  const b = BUTIR_KEGIATAN.find((x) => x.nama === it.butir);
  const satuanWaktu = b ? b.waktu : 0;
  return satuanWaktu * (it.kuantitas || 1);
}

function formatMenit(total) {
  const jam = Math.floor(total / 60);
  const menit = total % 60;
  return (jam ? jam + ' jam ' : '') + menit + ' menit';
}

function statusBadge(it) {
  const s = it.status || 'pending';
  const label = s === 'done' ? 'OK' : s === 'error' ? 'GAGAL' : 'ANTRI';
  return '<span class="st st-' + s + '" title="' + (it.error ? it.error.replace(/"/g, '') : '') + '">' + label + '</span>';
}

function renderList() {
  loadRiwayat().then((items) => {
    const pending = items.filter((i) => i.status !== 'done').length;
    $('list-count').textContent = items.length;
    $('btn-insert').disabled = pending === 0;
    $('btn-insert').textContent = pending > 0
      ? 'Insert ke e-Kinerja (' + pending + ')'
      : 'Insert ke e-Kinerja';

    const container = $('list-container');
    container.innerHTML = '';

    if (!items.length) {
      container.innerHTML = '<div class="empty">Belum ada aktivitas tercatat</div>';
      return;
    }

    const byDate = {};
    items.forEach((it, idx) => {
      (byDate[it.tanggal] = byDate[it.tanggal] || []).push({ ...it, idx });
    });

    const dates = Object.keys(byDate).sort().reverse();
    dates.forEach((dt) => {
      const dayEl = document.createElement('div');
      dayEl.className = 'list-day';

      const dayTotal = byDate[dt].reduce((sum, it) => sum + itemWaktu(it), 0);

      const header = document.createElement('div');
      header.className = 'list-day-header';
      header.textContent = dt + ' — Total: ' + formatMenit(dayTotal);
      dayEl.appendChild(header);

      byDate[dt].forEach((it) => {
        const el = document.createElement('div');
        el.className = 'list-item';

        const del = document.createElement('button');
        del.className = 'del';
        del.textContent = 'hapus';
        del.addEventListener('click', async () => {
          const all = await loadRiwayat();
          all.splice(it.idx, 1);
          await saveRiwayat(all);
          renderList();
        });

        const butir = document.createElement('div');
        butir.className = 'butir';
        butir.innerHTML = statusBadge(it) + ' ';
        butir.appendChild(document.createTextNode(it.butir));
        butir.appendChild(del);

        const meta = document.createElement('div');
        meta.className = 'meta';
        meta.textContent = 'Kuantitas: ' + it.kuantitas +
          ' | Waktu: ' + formatMenit(itemWaktu(it)) +
          (it.catatan ? ' | ' + it.catatan : '') +
          (it.error ? ' | ' + it.error : '');

        el.appendChild(butir);
        el.appendChild(meta);
        dayEl.appendChild(el);
      });

      container.appendChild(dayEl);
    });
  });
}

function initTabs() {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));
      btn.classList.add('active');
      $(btn.dataset.tab).classList.add('active');
      if (btn.dataset.tab === 'tab-list') renderList();
    });
  });
}

async function submitForm() {
  const tanggal = $('tanggal').value;
  const idx = $('butir').value;
  const catatan = $('catatan').value.trim();
  const kuantitas = parseInt($('kuantitas').value, 10) || 1;

  if (!tanggal) { setStatus('Tanggal wajib diisi', 'err'); return; }

  const butir = BUTIR_KEGIATAN[idx];

  const items = await loadRiwayat();
  items.push({
    tanggal,
    butir: butir.nama,
    catatan,
    kuantitas,
    status: 'pending',
    ts: Date.now()
  });
  await saveRiwayat(items);

  setStatus('Ditambahkan ke daftar: ' + butir.nama, 'ok');
  $('catatan').value = '';
  $('kuantitas').value = '1';
}

async function startInsert() {
  const btn = $('btn-insert');
  btn.disabled = true;
  setInsertStatus('Memulai...', 'info');

  try {
    const resp = await chrome.runtime.sendMessage({ action: 'startInsert' });
    if (resp && resp.ok) {
      setInsertStatus('Selesai. Sukses: ' + (resp.done || 0) + ', Gagal: ' + (resp.failed || 0),
        resp.failed ? 'err' : 'ok');
    } else {
      setInsertStatus('Gagal: ' + (resp && resp.error ? resp.error : 'unknown'), 'err');
    }
  } catch (e) {
    setInsertStatus('Error: ' + e.message, 'err');
  } finally {
    renderList();
  }
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'progress') {
    setInsertStatus(msg.step, 'info');
  }
  if (msg.action === 'queueProgress') {
    setInsertStatus(msg.text, 'info');
    renderList();
  }
});

document.addEventListener('DOMContentLoaded', () => {
  $('tanggal').value = todayStr();
  initButirDropdown();
  initTabs();
  renderList();
  $('btn-submit').addEventListener('click', submitForm);
  $('btn-insert').addEventListener('click', startInsert);
  $('btn-clear').addEventListener('click', async () => {
    if (confirm('Hapus semua riwayat?')) {
      await saveRiwayat([]);
      renderList();
      setInsertStatus('', 'info');
      $('insert-status').className = 'status';
    }
  });
});
