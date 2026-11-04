(function () {
  var btnStart = document.getElementById("btnStart");
  var btnStop = document.getElementById("btnStop");
  var btnResume = document.getElementById("btnResume");
  var btnClear = document.getElementById("btnClear");
  var statusText = document.getElementById("statusText");
  var currentEmployee = document.getElementById("currentEmployee");
  var progressText = document.getElementById("progressText");
  var progressBar = document.getElementById("progressBar");
  var okText = document.getElementById("okText");
  var failText = document.getElementById("failText");
  var logEl = document.getElementById("log");
  var hintEl = document.getElementById("hint");
  var apiInfoEl = document.getElementById("apiInfo");

  var DEFAULT_BASE_URL = "https://kepegawaian.it-dpmptsp.my.id/api/v1";

  function renderApiInfo(cfg) {
    var baseUrl = (cfg && cfg.baseUrl) || DEFAULT_BASE_URL;
    var adaKey = !!(cfg && cfg.apiKey && cfg.apiKey.trim());
    apiInfoEl.textContent = "API: " + baseUrl + " · " +
      (adaKey ? "API Key tersimpan" : "API Key belum diisi") +
      " · ubah di tab Setting.";
    apiInfoEl.style.color = adaKey ? "" : "#dd4b39";
  }

  chrome.storage.local.get("apiConfig", function (res) {
    renderApiInfo(res.apiConfig || {});
  });

  chrome.storage.onChanged.addListener(function (changes, area) {
    if (area === "local" && changes.apiConfig) {
      renderApiInfo(changes.apiConfig.newValue || {});
    }
  });

  function render(state) {
    if (!state) return;

    var status = "Idle";
    if (state.done) status = "Selesai";
    else if (state.running) status = "Berjalan";
    else if (state.paused) status = "Berhenti (bisa Resume)";

    statusText.textContent = status;
    currentEmployee.textContent = state.currentEmployee || "-";

    var done = state.totalProcessed || 0;
    progressText.textContent = done + " baris terkirim";
    progressBar.style.width = done > 0 ? "100%" : "0%";

    okText.textContent = state.totalBerhasil || 0;
    failText.textContent = state.totalGagal || 0;

    logEl.textContent = (state.log || []).join("\n");
    logEl.scrollTop = logEl.scrollHeight;

    btnStart.disabled = state.running;
    btnStop.disabled = !state.running;
    btnResume.disabled = state.running || !state.paused || state.done;
  }

  function withActiveTab(cb) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      var tab = tabs[0];
      if (!tab || !tab.url || tab.url.indexOf("tpp.semarangkota.go.id/izin") === -1) {
        hintEl.textContent = "Buka halaman tpp.semarangkota.go.id/izin dulu.";
        hintEl.style.display = "block";
        return;
      }
      hintEl.style.display = "none";
      cb(tab.id);
    });
  }

  function sendAction(action) {
    withActiveTab(function (tabId) {
      chrome.tabs.sendMessage(tabId, { action: action }, function () {
        if (chrome.runtime.lastError) {
          hintEl.textContent = "Refresh halaman tpp.semarangkota.go.id/izin dulu agar skrip aktif.";
          hintEl.style.display = "block";
          return;
        }
        refreshStatus();
      });
    });
  }

  function refreshStatus() {
    withActiveTab(function (tabId) {
      chrome.tabs.sendMessage(tabId, { action: "dataDukungTppStatus" }, function (res) {
        if (chrome.runtime.lastError) return;
        if (res && res.state) render(res.state);
      });
    });
  }

  btnStart.addEventListener("click", function () { sendAction("dataDukungTppStart"); });
  btnStop.addEventListener("click", function () { sendAction("dataDukungTppStop"); });
  btnResume.addEventListener("click", function () { sendAction("dataDukungTppResume"); });
  btnClear.addEventListener("click", function () {
    if (!confirm("Hapus progres dan mulai ulang dari data awal?")) return;
    sendAction("dataDukungTppReset");
  });

  chrome.runtime.onMessage.addListener(function (msg) {
    if (msg && msg.type === "dataDukungTppProgress") render(msg.state);
  });

  // Tampilkan state tersimpan saat popup dibuka (sebelum content script merespons)
  chrome.storage.local.get("dataDukungTppProgress", function (res) {
    if (res && res.dataDukungTppProgress) {
      render(res.dataDukungTppProgress);
    }
  });

  refreshStatus();
  setInterval(refreshStatus, 1000);
})();

