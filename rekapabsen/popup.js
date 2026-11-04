(function () {
  const btnStart = document.getElementById("btnStart");
  const btnStop = document.getElementById("btnStop");
  const btnResume = document.getElementById("btnResume");
  const btnClear = document.getElementById("btnClear");
  const statusText = document.getElementById("statusText");
  const currentEmployee = document.getElementById("currentEmployee");
  const progressText = document.getElementById("progressText");
  const progressBar = document.getElementById("progressBar");
  const okText = document.getElementById("okText");
  const failText = document.getElementById("failText");
  const logEl = document.getElementById("log");
  const hintEl = document.getElementById("hint");
  const apiInfoEl = document.getElementById("apiInfo");

  const DEFAULT_BASE_URL = "https://kepegawaian.it-dpmptsp.my.id/api/v1";

  function renderApiInfo(cfg) {
    const baseUrl = (cfg && cfg.baseUrl) || DEFAULT_BASE_URL;
    const adaKey = !!(cfg && cfg.apiKey && cfg.apiKey.trim());
    apiInfoEl.textContent = "API: " + baseUrl + " · " +
      (adaKey ? "API Key tersimpan" : "API Key belum diisi") +
      " · ubah di tab Setting.";
    apiInfoEl.style.color = adaKey ? "" : "#dd4b39";
  }

  chrome.storage.local.get("apiConfig", (res) => {
    renderApiInfo(res.apiConfig || {});
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.apiConfig) {
      renderApiInfo(changes.apiConfig.newValue || {});
    }
  });

  function render(state) {
    if (!state) return;

    let status = "Idle";
    if (state.done) status = "Selesai";
    else if (state.running) status = "Berjalan";
    else if (state.paused) status = "Berhenti (bisa Resume)";

    statusText.textContent = status;
    currentEmployee.textContent = state.currentEmployee || "-";

    const total = state.total || 0;
    const done = state.totalProcessed || 0;
    progressText.textContent = done + " / " + (total || "?");
    progressBar.style.width = total ? Math.min(100, (done / total) * 100) + "%" : "0%";

    okText.textContent = state.totalBerhasil || 0;
    failText.textContent = state.totalGagal || 0;

    logEl.textContent = (state.log || []).join("\n");
    logEl.scrollTop = logEl.scrollHeight;

    btnStart.disabled = state.running;
    btnStop.disabled = !state.running;
    btnResume.disabled = state.running || !state.paused || state.done;
  }

  function withActiveTab(cb) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab || !tab.url || !tab.url.includes("absen.semarangkota.go.id/presensi/rekap-bulanan")) {
        hintEl.textContent = "Buka halaman rekap bulanan ASN dulu.";
        hintEl.style.display = "block";
        return;
      }
      hintEl.style.display = "none";
      cb(tab.id);
    });
  }

  function sendAction(action) {
    withActiveTab((tabId) => {
      chrome.tabs.sendMessage(tabId, { action: action }, () => {
        if (chrome.runtime.lastError) {
          hintEl.textContent = "Refresh halaman rekap bulanan dulu agar skrip baru aktif.";
          hintEl.style.display = "block";
          return;
        }
        refreshStatus();
      });
    });
  }

  function refreshStatus() {
    withActiveTab((tabId) => {
      chrome.tabs.sendMessage(tabId, { action: "rekapAbsenStatus" }, (res) => {
        if (chrome.runtime.lastError) return;
        if (res && res.state) render(res.state);
      });
    });
  }

  btnStart.addEventListener("click", () => sendAction("rekapAbsenStart"));
  btnStop.addEventListener("click", () => sendAction("rekapAbsenStop"));
  btnResume.addEventListener("click", () => sendAction("rekapAbsenResume"));
  btnClear.addEventListener("click", () => {
    if (!confirm("Hapus progres dan mulai ulang dari data awal?")) return;
    sendAction("rekapAbsenReset");
  });

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.type === "rekapAbsenProgress") render(msg.state);
  });

  refreshStatus();
  setInterval(refreshStatus, 1000);
})();
