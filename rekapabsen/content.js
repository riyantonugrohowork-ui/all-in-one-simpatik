(function () {
  "use strict";

  const STORAGE_KEY = "rekapAbsenProgress";
  const SUMBER_LABEL = "ext-rekap-absen-v1";
  const MIN_DELAY_BETWEEN_EMPLOYEE = 3000;
  const MAX_DELAY_BETWEEN_EMPLOYEE = 5000;
  const DOM_STABLE_MS = 900;
  const DATA_DUKUNG_GRACE_MS = 3500;

  const BULAN = {
    januari: 1, februari: 2, maret: 3, april: 4, mei: 5, juni: 6,
    juli: 7, agustus: 8, september: 9, oktober: 10, november: 11, desember: 12
  };

  function defaultState() {
    return {
      running: false,
      paused: false,
      done: false,
      mulaiDariAwal: false,
      total: null,
      processedNips: [],
      totalProcessed: 0,
      totalBerhasil: 0,
      totalGagal: 0,
      currentEmployee: null,
      log: [],
    };
  }

  let state = defaultState();
  let loopToken = 0;

  function delay(min, max) {
    const ms = min + Math.random() * (max - min);
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function saveState() {
    chrome.storage.local.set({ [STORAGE_KEY]: state });
  }

  function log(message) {
    const line = `[${new Date().toLocaleTimeString()}] ${message}`;
    state.log.push(line);
    if (state.log.length > 80) state.log.shift();
    notifyPopup();
  }

  function notifyPopup(extra) {
    if (extra) Object.assign(state, extra);
    saveState();
    chrome.runtime.sendMessage({ type: "rekapAbsenProgress", state }, () => {
      void chrome.runtime.lastError;
    });
  }

  function textOf(el) {
    return el ? el.textContent.trim() : "";
  }

  function getTotalCount() {
    const info = document.querySelector("#rk-pager-top .pg-info") ||
      document.querySelector("#rk-pager-bottom .pg-info");
    if (!info) return null;
    const m = info.textContent.match(/dari\s+(\d+)\s+pegawai/i);
    return m ? parseInt(m[1], 10) : null;
  }

  function parseOnclickArgs(onclick) {
    const m = String(onclick || "").match(/rekap\((.*)\)\s*;?\s*$/);
    if (!m) return null;
    const args = [];
    const re = /'((?:[^'\\]|\\.)*)'/g;
    let match;
    while ((match = re.exec(m[1]))) {
      args.push(match[1].replace(/\\'/g, "'").replace(/\\\\/g, "\\"));
    }
    return args;
  }

  function getRowsOnCurrentPage() {
    const buttons = Array.from(
      document.querySelectorAll("#rk-body .pt-actions button.btn-primary")
    );
    return buttons
      .map((btn) => {
        const args = parseOnclickArgs(btn.getAttribute("onclick"));
        if (!args || args.length < 2) return null;
        return {
          nip: args[0],
          name: args[1],
          jabatan: args[2] || "",
          opd: args[3] || "",
          button: btn,
        };
      })
      .filter(Boolean);
  }

  function modalSnapshot() {
    const harian = document.getElementById("rekap_bulanan");
    const dukung = document.getElementById("rekap_datadukung");
    const ringkas = document.querySelector(".rb-summary");
    return [
      harian ? harian.textContent : "",
      dukung ? dukung.textContent : "",
      ringkas ? ringkas.textContent : "",
    ].join("|");
  }

  function dukungSnapshot() {
    const el = document.getElementById("rekap_datadukung");
    return el ? el.textContent : "";
  }

  function jumlahDataDukung() {
    return document.querySelectorAll('#rekap_datadukung button[onclick*="lihat_dd"]').length;
  }

  function waitForModalData(nip, sebelum, dukungSebelum, timeoutMs) {
    return new Promise((resolve) => {
      const start = Date.now();
      let harianSiapSejak = 0;
      let snapshotTerakhir = null;
      let stabilSejak = 0;

      const iv = setInterval(() => {
        const titleEl = document.getElementById("rekap_title");
        const cocok = titleEl && titleEl.textContent.includes(nip);
        const sekarang = modalSnapshot();
        const adaHarian = document.querySelectorAll("#rekap_bulanan tr").length > 0;

        if (!cocok || !adaHarian) {
          snapshotTerakhir = sekarang;
          stabilSejak = 0;
          harianSiapSejak = 0;
        } else {
          if (!harianSiapSejak) harianSiapSejak = Date.now();

          if (sekarang !== snapshotTerakhir) {
            snapshotTerakhir = sekarang;
            stabilSejak = Date.now();
          } else if (!stabilSejak) {
            stabilSejak = Date.now();
          }

          const stabil = Date.now() - stabilSejak >= DOM_STABLE_MS;
          const dukungBerubah = dukungSnapshot() !== dukungSebelum;
          const graceLewat = Date.now() - harianSiapSejak >= DATA_DUKUNG_GRACE_MS;
          const adaDukung = jumlahDataDukung() > 0;

          // Bila tabel data dukung kosong, tunggu grace supaya request yang
          // datang belakangan tidak terlewat. Bila sudah ada baris, tunggu
          // isinya berubah dan stabil.
          const dukungSiap = adaDukung ? (dukungBerubah || graceLewat) : graceLewat;

          if (sekarang && sekarang !== sebelum && stabil && dukungSiap) {
            clearInterval(iv);
            resolve(true);
            return;
          }
        }

        if (Date.now() - start > timeoutMs) {
          clearInterval(iv);
          resolve(false);
        }
      }, 200);
    });
  }

  function waitForPageChange(prevFirstNip, timeoutMs) {
    return new Promise((resolve) => {
      const start = Date.now();
      const iv = setInterval(() => {
        const rows = getRowsOnCurrentPage();
        const changed = rows.length > 0 && rows[0].nip !== prevFirstNip;
        if (changed || Date.now() - start > timeoutMs) {
          clearInterval(iv);
          resolve(changed);
        }
      }, 200);
    });
  }

  function closeModal() {
    const dismissBtn =
      document.querySelector('#modal_footer button[data-dismiss="modal"]') ||
      document.querySelector(".modal.show .close") ||
      document.querySelector(".modal.in .close");
    if (dismissBtn) dismissBtn.click();
  }

  async function keHalamanAwal() {
    const aktif = document.querySelector("#rk-pager-top .rk-page.active") ||
      document.querySelector("#rk-pager-bottom .rk-page.active");
    if (aktif && aktif.getAttribute("data-page") === "1") return;

    const btn = document.querySelector('#rk-pager-top .rk-page[data-page="1"]') ||
      document.querySelector('#rk-pager-bottom .rk-page[data-page="1"]');
    if (!btn) return;

    const rows = getRowsOnCurrentPage();
    const prevFirstNip = rows.length ? rows[0].nip : null;

    log("Kembali ke halaman pertama...");
    btn.click();
    await waitForPageChange(prevFirstNip, 6000);
    await delay(600, 1000);
  }

  function normalTanggal(teks) {
    const m = String(teks || "").match(/(\d{1,2})-(\d{1,2})-(\d{4})/);
    if (!m) return null;
    return m[3] + "-" + m[2].padStart(2, "0") + "-" + m[1].padStart(2, "0");
  }

  function normalJam(teks) {
    const m = String(teks || "").match(/(\d{1,2})-(\d{1,2})-(\d{4})\s+(\d{1,2}:\d{2}:\d{2})/);
    if (!m) return null;
    return m[3] + "-" + m[2].padStart(2, "0") + "-" + m[1].padStart(2, "0") + " " + m[4];
  }

  function nilaiSelisih(teks) {
    const s = String(teks || "").trim();
    if (!s || s === "-") return null;
    return s;
  }

  function nilaiStatus(teks) {
    const s = String(teks || "").trim();
    if (!s || s === "-") return null;
    return s;
  }

  function parsePeriode() {
    const judul = textOf(document.getElementById("rekap_title"));
    const m = judul.match(/(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+(\d{4})/i);
    if (m) {
      return { bulan: BULAN[m[1].toLowerCase()], tahun: parseInt(m[2], 10) };
    }
    const bulanEl = document.getElementById("select-bulan");
    const tahunEl = document.getElementById("select-tahun");
    return {
      bulan: bulanEl ? parseInt(bulanEl.value, 10) : new Date().getMonth() + 1,
      tahun: tahunEl ? parseInt(tahunEl.value, 10) : new Date().getFullYear(),
    };
  }

  function ringkasanTeks(label) {
    const rows = document.querySelectorAll(".rb-summary .rb-sum-row");
    for (const row of rows) {
      const l = row.querySelector(".rb-sum-label");
      const v = row.querySelector(".rb-sum-val");
      if (l && v && l.textContent.trim().toLowerCase() === label) return v.textContent.trim();
    }
    return "";
  }

  function ringkasanAngka(id, label) {
    const el = document.getElementById(id);
    if (el) {
      const n = parseInt(el.textContent.replace(/[^\d]/g, ""), 10);
      if (!isNaN(n)) return n;
    }
    const alt = parseInt(String(ringkasanTeks(label)).replace(/[^\d]/g, ""), 10);
    return isNaN(alt) ? 0 : alt;
  }

  function parseRingkasan() {
    const ket = textOf(document.getElementById("jml_keterlambatan")) ||
      ringkasanTeks("keterlambatan") || "00:00:00";
    return {
      hari_kerja: ringkasanAngka("jml_hari_kerja", "hari kerja"),
      hadir: ringkasanAngka("jml_masuk", "hadir"),
      tidak_hadir: ringkasanAngka("jml_tidak_masuk", "tidak hadir"),
      konfirmasi: ringkasanAngka("jml_konfirmasi", "konfirmasi"),
      keterlambatan: ket,
    };
  }

  function parseHarian() {
    const hasil = [];
    document.querySelectorAll("#rekap_bulanan tr").forEach((tr) => {
      const tds = tr.querySelectorAll("td");
      if (tds.length < 7) return;
      const tanggal = normalTanggal(tds[1].textContent);
      if (!tanggal) return;
      const hari = (tds[1].textContent.split(",")[0] || "").trim().toUpperCase();
      hasil.push({
        tanggal: tanggal,
        hari: hari,
        jam_hadir: normalJam(tds[2].textContent),
        hadir_selisih: nilaiSelisih(tds[3].textContent),
        jam_pulang: normalJam(tds[4].textContent),
        pulang_selisih: nilaiSelisih(tds[5].textContent),
        status: nilaiStatus(tds[6].textContent),
      });
    });
    return hasil;
  }

  function parseDataDukung() {
    const hasil = [];
    document.querySelectorAll("#rekap_datadukung tr").forEach((tr) => {
      const tds = tr.querySelectorAll("td");
      if (tds.length < 5) return;
      const mulai = normalTanggal(tds[0].textContent);
      if (!mulai) return;
      const btn = tr.querySelector('button[onclick*="lihat_dd"]');
      const onclick = btn ? btn.getAttribute("onclick") || "" : "";
      const m = onclick.match(/lihat_dd\('([^']*)'/);
      const item = {
        tanggal_mulai: mulai,
        tanggal_selesai: normalTanggal(tds[1].textContent) || mulai,
        keterangan: tds[2].textContent.trim(),
        jenis: tds[3].textContent.trim(),
      };
      if (m) item.token = m[1];
      hasil.push(item);
    });
    return hasil;
  }

  function scrapeModal(row) {
    const periode = parsePeriode();
    return {
      nip: row.nip,
      nama: row.name,
      jabatan: row.jabatan,
      opd: row.opd,
      bulan: periode.bulan,
      tahun: periode.tahun,
      sumber_label: SUMBER_LABEL,
      ringkasan: parseRingkasan(),
      harian: parseHarian(),
      data_dukung: parseDataDukung(),
    };
  }

  function kirimRekapAbsen(payload) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "kirimRekapAbsen", payload }, (res) => {
        if (chrome.runtime.lastError) {
          resolve({ ok: false, error: chrome.runtime.lastError.message });
          return;
        }
        resolve(res || { ok: false, error: "Tidak ada respons dari background." });
      });
    });
  }

  async function processEmployee(row, myToken) {
    notifyPopup({ currentEmployee: row.name });
    log(`Buka rekap: ${row.name}`);

    const sebelum = modalSnapshot();
    const dukungSebelum = dukungSnapshot();
    row.button.click();

    const siap = await waitForModalData(row.nip, sebelum, dukungSebelum, 20000);

    if (myToken !== loopToken) {
      closeModal();
      return false;
    }

    if (!siap) {
      log(`GAGAL: data modal tidak muncul untuk ${row.name}`);
      closeModal();
      await delay(500, 900);
      return false;
    }

    await delay(300, 600);
    const payload = scrapeModal(row);

    log(`Kirim ke API: ${row.name} (${payload.harian.length} harian, ${payload.data_dukung.length} data dukung)`);
    const res = await kirimRekapAbsen(payload);

    if (myToken !== loopToken) {
      closeModal();
      return false;
    }

    if (res.ok) {
      state.totalBerhasil += 1;
      log(`TERSIMPAN: ${row.name}${res.aksi ? " (" + res.aksi + ")" : ""}`);
    } else {
      state.totalGagal += 1;
      log(`GAGAL API: ${row.name} — ${res.error || "tanpa keterangan"}`);
    }

    closeModal();
    await delay(400, 800);
    await delay(MIN_DELAY_BETWEEN_EMPLOYEE, MAX_DELAY_BETWEEN_EMPLOYEE);
    return res.ok;
  }

  async function loopPages(myToken) {
    if (state.mulaiDariAwal) {
      state.mulaiDariAwal = false;
      await keHalamanAwal();
      if (!state.running || myToken !== loopToken) return;
    }

    while (state.running && myToken === loopToken) {
      if (state.total == null) {
        state.total = getTotalCount();
      }

      const rows = getRowsOnCurrentPage();

      for (const row of rows) {
        if (!state.running || myToken !== loopToken) return;
        if (state.processedNips.includes(row.nip)) continue;

        await processEmployee(row, myToken);

        if (myToken !== loopToken) return;

        state.processedNips.push(row.nip);
        state.totalProcessed = state.processedNips.length;
        notifyPopup();

        if (!state.running) return;
      }

      if (!state.running || myToken !== loopToken) return;

      const nextBtn =
        document.querySelector("#rk-pager-top .rk-next") ||
        document.querySelector("#rk-pager-bottom .rk-next");

      if (!nextBtn || nextBtn.disabled) {
        state.running = false;
        state.done = true;
        state.currentEmployee = null;
        log(`Selesai. Berhasil: ${state.totalBerhasil}, gagal: ${state.totalGagal}.`);
        notifyPopup();
        break;
      }

      const prevFirstNip = rows.length ? rows[0].nip : null;
      log("Pindah ke halaman berikutnya...");
      nextBtn.click();
      await waitForPageChange(prevFirstNip, 6000);
      await delay(800, 1500);
    }
  }

  function startProcessing(reset) {
    if (reset) {
      state = defaultState();
    }

    chrome.storage.local.get(["apiConfig", "rekapProgress"], (res) => {
      const cfg = res.apiConfig || {};
      if (!cfg.apiKey || !cfg.apiKey.trim()) {
        state.running = false;
        state.paused = true;
        state.currentEmployee = null;
        log("API Key belum diisi. Buka tab Setting untuk mengisinya.");
        notifyPopup();
        return;
      }

      const download = res.rekapProgress;
      if (download && download.running) {
        state.running = false;
        state.paused = true;
        state.currentEmployee = null;
        log("Tab Absen (download) sedang berjalan. Hentikan dulu sebelum Rekap Absen.");
        notifyPopup();
        return;
      }

      state.running = true;
      state.paused = false;
      state.done = false;
      state.mulaiDariAwal = !!reset;
      loopToken += 1;
      notifyPopup();
      loopPages(loopToken);
    });
  }

  function requestStop() {
    state.running = false;
    state.paused = true;
    loopToken += 1;
    log("Dihentikan oleh user.");
  }

  function resetProgress() {
    loopToken += 1;
    state = defaultState();
    log("Progres dihapus. Mulai lagi dari data awal.");
  }

  chrome.storage.local.get(STORAGE_KEY, (res) => {
    if (res && res[STORAGE_KEY]) {
      state = Object.assign(defaultState(), res[STORAGE_KEY]);
      if (state.running) {
        state.running = false;
        state.paused = true;
        state.currentEmployee = null;
      }
      saveState();
    }
  });

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg || typeof msg.action !== "string" || msg.action.indexOf("rekapAbsen") !== 0) {
      return false;
    }

    if (msg.action === "rekapAbsenStart") {
      startProcessing(true);
      sendResponse({ ok: true });
    } else if (msg.action === "rekapAbsenResume") {
      startProcessing(false);
      sendResponse({ ok: true });
    } else if (msg.action === "rekapAbsenStop") {
      requestStop();
      notifyPopup();
      sendResponse({ ok: true });
    } else if (msg.action === "rekapAbsenReset") {
      resetProgress();
      sendResponse({ ok: true });
    } else if (msg.action === "rekapAbsenStatus") {
      sendResponse({ state });
    }
    return true;
  });
})();
