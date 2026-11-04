(function () {
  "use strict";

  const STORAGE_KEY = "dataDukungTppProgress";
  const SUMBER_LABEL = "ext-tpp-v1";
  const BATCH_SIZE = 200;
  const DELAY_BETWEEN_PAGES_MS = 2000;

  function defaultState() {
    return {
      running: false,
      paused: false,
      done: false,
      processedIds: [],
      total: null,
      totalProcessed: 0,
      totalBerhasil: 0,
      totalGagal: 0,
      currentEmployee: null,
      log: [],
    };
  }

  let state = defaultState();
  let loopToken = 0;

  function delayMs(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function saveState() {
    chrome.storage.local.set({ [STORAGE_KEY]: state });
  }

  function log(message) {
    const line = "[" + new Date().toLocaleTimeString() + "] " + message;
    state.log.push(line);
    if (state.log.length > 80) state.log.shift();
    notifyPopup();
  }

  function notifyPopup(extra) {
    if (extra) Object.assign(state, extra);
    saveState();
    chrome.runtime.sendMessage({ type: "dataDukungTppProgress", state }, function () {
      void chrome.runtime.lastError;
    });
  }

  function cleanText(str) {
    return (str || "").replace(/\s+/g, " ").trim();
  }

  /* ========== Scraping ========== */

  function getPageMeta() {
    var unitKerjaInput = document.querySelector('input[name="unitkerja"]');
    var bulanSelect = document.querySelector('select[name="bulan"]');
    var tahunInput = document.querySelector('input[name="tahun"]');

    return {
      unitKerja: unitKerjaInput ? unitKerjaInput.value : "",
      bulan: bulanSelect ? parseInt(bulanSelect.value) || 0 : 0,
      tahun: tahunInput ? parseInt(tahunInput.value) || 0 : 0,
    };
  }

  function scrapeRows() {
    var meta = getPageMeta();
    var table = document.querySelector(".box-body table.table");
    if (!table) return [];

    var rows = table.querySelectorAll("tbody tr");
    var items = [];

    rows.forEach(function (row) {
      var cells = row.querySelectorAll("td");
      if (cells.length < 8) return;

      // ----- Nama -----
      var namaEl = cells[1].querySelector("strong");
      var nama = namaEl ? cleanText(namaEl.textContent) : "";

      // ----- NIP, Golongan, Eselon dari <small> -----
      var smallEl = cells[1].querySelector("small");
      var nip = "", golongan = "", eselon = "";
      if (smallEl) {
        var parts = smallEl.innerHTML
          .split(/<br\s*\/?>/i)
          .map(function (s) { return s.replace(/<[^>]+>/g, "").trim(); })
          .filter(Boolean);
        nip = parts[0] || "";
        // parts[1] = status pegawai (mis. "PEGAWAI NEGERI SIPIL")
        var golEsLine = parts[2] || "";
        var golMatch = golEsLine.match(/Golongan:\s*([^,]+)/i);
        if (golMatch) golongan = golMatch[1].trim();
        var esMatch = golEsLine.match(/Eselon:\s*(.+)/i);
        if (esMatch) eselon = esMatch[1].trim();
      }

      // ----- SKPD (baris pertama sebelum <br>) -----
      var skpdParts = cells[2].innerHTML
        .split(/<br\s*\/?>/i)
        .map(function (s) { return s.replace(/<[^>]+>/g, "").trim(); })
        .filter(Boolean);
      var skpd = skpdParts[0] || "";

      // ----- Keterangan: teks utama + detail di <small> -----
      var ketSmall = cells[4].querySelector("small");
      var ketDetail = ketSmall ? cleanText(ketSmall.textContent) : "";
      var ketClone = cells[4].cloneNode(true);
      var ketSmallClone = ketClone.querySelector("small");
      if (ketSmallClone) ketSmallClone.remove();
      var ketMain = cleanText(ketClone.textContent);
      var keterangan = ketMain + (ketDetail ? " " + ketDetail : "");

      // ----- File pendukung -----
      var fileLink = cells[5].querySelector("a");
      var filePendukungStatus = "belum";
      var filePendukungNama = "";
      var filePendukungUrl = "";
      if (fileLink) {
        var href = fileLink.getAttribute("href") || "";
        var fileText = cleanText(fileLink.textContent);
        if (href && href !== "javascript:void(0)" && fileText.indexOf("Belum Diupload") === -1) {
          filePendukungStatus = "ada";
          filePendukungUrl = href;
          filePendukungNama = fileText;
        }
      }

      // ----- Jumlah hari -----
      var jumlahHari = parseInt(cleanText(cells[6].textContent)) || 0;

      // ----- id_tpp dari link edit -----
      var editLink = cells[7].querySelector('a[href*="/izin/edit/"]');
      var idTpp = 0;
      if (editLink) {
        var m = (editLink.getAttribute("href") || "").match(/\/izin\/edit\/(\d+)/);
        if (m) idTpp = parseInt(m[1]);
      }

      if (!nip || !idTpp) return;

      items.push({
        id_tpp: idTpp,
        nip: nip,
        nama: nama,
        golongan: golongan,
        eselon: eselon,
        skpd: skpd,
        unit_kerja: meta.unitKerja,
        bulan: meta.bulan,
        tahun: meta.tahun,
        keterangan: keterangan,
        jumlah_hari: jumlahHari,
        file_pendukung_status: filePendukungStatus,
        file_pendukung_nama: filePendukungNama,
        file_pendukung_url: filePendukungUrl,
      });
    });

    return items;
  }

  /* ========== Pagination ========== */

  function getNextPageLink() {
    return document.querySelector('.pagination a[rel="next"]');
  }

  function getCurrentPage() {
    var active = document.querySelector(".pagination li.active span");
    return active ? parseInt(active.textContent) || 1 : 1;
  }

  /* ========== API call via service worker ========== */

  function kirimDataDukungTpp(items) {
    return new Promise(function (resolve) {
      chrome.runtime.sendMessage(
        { action: "kirimDataDukungTpp", payload: { sumber_label: SUMBER_LABEL, items: items } },
        function (res) {
          if (chrome.runtime.lastError) {
            resolve({ ok: false, error: chrome.runtime.lastError.message });
            return;
          }
          resolve(res || { ok: false, error: "Tidak ada respons dari service worker" });
        }
      );
    });
  }

  /* ========== Processing loop ========== */

  async function processCurrentPage(myToken) {
    var currentPage = getCurrentPage();
    log("Memproses halaman " + currentPage + "...");

    var allRows = scrapeRows();
    if (allRows.length === 0) {
      log("Halaman " + currentPage + ": tidak ada baris data.");
      return true;
    }

    var newRows = allRows.filter(function (r) {
      return state.processedIds.indexOf(r.id_tpp) === -1;
    });

    if (newRows.length === 0) {
      log("Halaman " + currentPage + ": semua baris sudah terproses sebelumnya.");
      return true;
    }

    // Kirim dalam batch maks BATCH_SIZE
    for (var i = 0; i < newRows.length; i += BATCH_SIZE) {
      if (!state.running || myToken !== loopToken) return false;

      var batch = newRows.slice(i, i + BATCH_SIZE);
      var namaSet = {};
      batch.forEach(function (r) { namaSet[r.nama] = true; });
      var namaList = Object.keys(namaSet);

      notifyPopup({ currentEmployee: namaList.slice(0, 3).join(", ") + (namaList.length > 3 ? " ..." : "") });
      log("Kirim " + batch.length + " baris ke API...");

      var res = await kirimDataDukungTpp(batch);

      if (!state.running || myToken !== loopToken) return false;

      if (res.ok) {
        var dibuat = res.dibuat || 0;
        var diperbarui = res.diperbarui || 0;
        state.totalBerhasil += batch.length;
        batch.forEach(function (r) {
          if (state.processedIds.indexOf(r.id_tpp) === -1) {
            state.processedIds.push(r.id_tpp);
          }
        });
        state.totalProcessed = state.processedIds.length;
        log("OK: " + batch.length + " baris (" + dibuat + " dibuat, " + diperbarui + " diperbarui)");
      } else {
        state.totalGagal += batch.length;
        log("GAGAL: " + (res.error || "tanpa keterangan"));
      }
      notifyPopup();
    }

    return true;
  }

  async function loopPages(myToken) {
    while (state.running && myToken === loopToken) {
      await processCurrentPage(myToken);
      if (!state.running || myToken !== loopToken) return;

      var nextLink = getNextPageLink();
      if (!nextLink) {
        // Tidak ada halaman selanjutnya
        state.running = false;
        state.done = true;
        state.currentEmployee = null;
        log("Selesai. Total terkirim: " + state.totalProcessed +
          ", berhasil: " + state.totalBerhasil +
          ", gagal: " + state.totalGagal);
        notifyPopup();
        return;
      }

      // Navigasi ke halaman berikutnya (full page reload)
      log("Pindah ke halaman berikutnya...");
      saveState();
      await delayMs(DELAY_BETWEEN_PAGES_MS);

      if (!state.running || myToken !== loopToken) return;

      // Klik link → page reload → content script baru akan auto-continue
      nextLink.click();
      return;
    }
  }

  /* ========== Start / Stop / Resume / Reset ========== */

  function startProcessing(reset) {
    if (reset) {
      state = defaultState();
    }

    chrome.storage.local.get("apiConfig", function (res) {
      var cfg = res.apiConfig || {};
      if (!cfg.apiKey || !cfg.apiKey.trim()) {
        state.running = false;
        state.paused = true;
        state.currentEmployee = null;
        log("API Key belum diisi. Buka tab Setting untuk mengisinya.");
        notifyPopup();
        return;
      }

      state.running = true;
      state.paused = false;
      state.done = false;
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

  /* ========== Init: restore state & auto-continue ========== */

  chrome.storage.local.get(STORAGE_KEY, function (res) {
    if (res && res[STORAGE_KEY]) {
      state = Object.assign(defaultState(), res[STORAGE_KEY]);
      if (state.running) {
        // Auto-continue setelah page reload (navigasi pagination)
        log("Melanjutkan proses setelah navigasi halaman...");
        loopToken += 1;
        loopPages(loopToken);
      }
    }
  });

  /* ========== Message listener ========== */

  chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    if (!msg || typeof msg.action !== "string" || msg.action.indexOf("dataDukungTpp") !== 0) {
      return false;
    }

    if (msg.action === "dataDukungTppStart") {
      startProcessing(true);
      sendResponse({ ok: true });
    } else if (msg.action === "dataDukungTppResume") {
      startProcessing(false);
      sendResponse({ ok: true });
    } else if (msg.action === "dataDukungTppStop") {
      requestStop();
      notifyPopup();
      sendResponse({ ok: true });
    } else if (msg.action === "dataDukungTppReset") {
      resetProgress();
      notifyPopup();
      sendResponse({ ok: true });
    } else if (msg.action === "dataDukungTppStatus") {
      sendResponse({ state: state });
    }
    return true;
  });
})();

