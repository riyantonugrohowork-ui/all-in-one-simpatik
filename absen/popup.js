(function () {
  const btnStart = document.getElementById("btnStart");
  const btnStop = document.getElementById("btnStop");
  const btnResume = document.getElementById("btnResume");
  const statusText = document.getElementById("statusText");
  const currentEmployee = document.getElementById("currentEmployee");
  const progressText = document.getElementById("progressText");
  const progressBar = document.getElementById("progressBar");
  const logEl = document.getElementById("log");
  const hintEl = document.getElementById("hint");

  let activeTabId = null;

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
    progressText.textContent = `${done} / ${total || "?"}`;
    progressBar.style.width = total ? `${Math.min(100, (done / total) * 100)}%` : "0%";

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
        hintEl.style.display = "block";
        return;
      }
      hintEl.style.display = "none";
      activeTabId = tab.id;
      cb(tab.id);
    });
  }

  function sendAction(action) {
    withActiveTab((tabId) => {
      chrome.tabs.sendMessage(tabId, { action }, (res) => {
        void chrome.runtime.lastError;
        refreshStatus();
      });
    });
  }

  function refreshStatus() {
    withActiveTab((tabId) => {
      chrome.tabs.sendMessage(tabId, { action: "getStatus" }, (res) => {
        if (chrome.runtime.lastError) return;
        if (res && res.state) render(res.state);
      });
    });
  }

  btnStart.addEventListener("click", () => sendAction("start"));
  btnStop.addEventListener("click", () => sendAction("stop"));
  btnResume.addEventListener("click", () => sendAction("resume"));

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "progress") render(msg.state);
  });

  refreshStatus();
  setInterval(refreshStatus, 1000);
})();
