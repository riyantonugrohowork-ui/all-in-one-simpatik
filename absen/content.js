(function () {
  "use strict";

  const STORAGE_KEY = "rekapProgress";
  const MIN_DELAY_BETWEEN_EMPLOYEE = 3000;
  const MAX_DELAY_BETWEEN_EMPLOYEE = 5000;

  function defaultState() {
    return {
      running: false,
      paused: false,
      done: false,
      total: null,
      processedNips: [],
      totalProcessed: 0,
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
    if (state.log.length > 50) state.log.shift();
    notifyPopup();
  }

  function notifyPopup(extra) {
    if (extra) Object.assign(state, extra);
    saveState();
    chrome.runtime.sendMessage({ type: "progress", state }, () => {
      void chrome.runtime.lastError;
    });
  }

  function getTotalCount() {
    const info = document.querySelector("#rk-pager-top .pg-info") ||
      document.querySelector("#rk-pager-bottom .pg-info");
    if (!info) return null;
    const m = info.textContent.match(/dari\s+(\d+)\s+pegawai/i);
    return m ? parseInt(m[1], 10) : null;
  }

  function getRowsOnCurrentPage() {
    const buttons = Array.from(
      document.querySelectorAll("#rk-body .pt-actions button.btn-primary")
    );
    return buttons
      .map((btn) => {
        const onclick = btn.getAttribute("onclick") || "";
        const m = onclick.match(/rekap\('([^']*)','([^']*)'/);
        return m ? { nip: m[1], name: m[2], button: btn } : null;
      })
      .filter(Boolean);
  }

  function waitForModal(nip, timeoutMs) {
    return new Promise((resolve) => {
      const start = Date.now();
      const iv = setInterval(() => {
        const titleEl = document.getElementById("rekap_title");
        if (titleEl && titleEl.textContent.includes(nip)) {
          clearInterval(iv);
          resolve(true);
          return;
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

  async function processEmployee(row) {
    notifyPopup({ currentEmployee: row.name });
    log(`Buka rekap: ${row.name}`);
    row.button.click();

    const modalOk = await waitForModal(row.nip, 15000);
    if (!modalOk) {
      log(`GAGAL: modal tidak muncul untuk ${row.name}`);
      closeModal();
      return;
    }

    await delay(400, 800);

    const cetakBtn = document.querySelector("#modal_footer button.print");
    if (cetakBtn) {
      cetakBtn.click();
      log(`Cetak diklik: ${row.name}`);
    } else {
      log(`GAGAL: tombol Cetak tidak ditemukan untuk ${row.name}`);
    }

    await delay(MIN_DELAY_BETWEEN_EMPLOYEE, MAX_DELAY_BETWEEN_EMPLOYEE);

    closeModal();
    await delay(500, 900);
  }

  async function loopPages(myToken) {
    while (state.running && myToken === loopToken) {
      if (state.total == null) {
        state.total = getTotalCount();
      }

      const rows = getRowsOnCurrentPage();

      for (const row of rows) {
        if (!state.running || myToken !== loopToken) return;
        if (state.processedNips.includes(row.nip)) continue;

        await processEmployee(row);

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
        log("Selesai. Semua pegawai sudah diproses.");
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
    state.running = true;
    state.paused = false;
    state.done = false;
    loopToken += 1;
    notifyPopup();
    loopPages(loopToken);
  }

  function requestStop() {
    state.running = false;
    state.paused = true;
    loopToken += 1;
    log("Dihentikan oleh user.");
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
    if (msg.action === "start") {
      startProcessing(true);
      sendResponse({ ok: true });
    } else if (msg.action === "resume") {
      startProcessing(false);
      sendResponse({ ok: true });
    } else if (msg.action === "stop") {
      requestStop();
      notifyPopup();
      sendResponse({ ok: true });
    } else if (msg.action === "getStatus") {
      sendResponse({ state });
    }
    return true;
  });
})();
