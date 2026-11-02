function updateUI() {
    chrome.storage.local.get(['status', 'data', 'lastLog'], (res) => {
        const status = res.status || 'idle';
        const data = res.data || [];
        const lastLog = res.lastLog || 'Siap mengekstrak data...';

        const statusEl = document.getElementById('status');
        statusEl.innerText = status.toUpperCase();
        if (status === 'running') statusEl.style.color = '#2ecc71';
        else if (status === 'paused') statusEl.style.color = '#f1c40f';
        else statusEl.style.color = '#e74c3c';

        document.getElementById('count').innerText = data.length;
        document.getElementById('log').innerText = lastLog;
    });
}

chrome.storage.onChanged.addListener(() => {
    updateUI();
});

document.getElementById('btn-start').addEventListener('click', () => {
    chrome.storage.local.set({ status: 'running', lastLog: 'Memulai sinkronisasi data...' }, () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, { action: 'start' }, () => {
                    if (chrome.runtime.lastError) { /* Handled tab context error */ }
                });
            }
        });
    });
});

document.getElementById('btn-pause').addEventListener('click', () => {
    chrome.storage.local.set({ status: 'paused', lastLog: 'Proses dijeda oleh pengguna.' });
});

document.getElementById('btn-stop').addEventListener('click', () => {
    chrome.storage.local.set({ status: 'idle', lastLog: 'Proses ekstraksi dihentikan.' });
});

document.getElementById('btn-dl').addEventListener('click', () => {
    chrome.storage.local.get(['data'], (res) => {
        const data = res.data || [];
        if (data.length === 0) {
            alert("Belum ada data profile yang berhasil dikumpulkan!");
            return;
        }

        // Ketentuan format unduhan: jika 1 data berbentuk Objek {}, jika banyak otomatis Array []
        const outputData = data.length === 1 ? data[0] : data;

        const blob = new Blob([JSON.stringify(outputData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const dateStr = new Date().toISOString().slice(0, 10);
        a.href = url;
        a.download = `data_detail_pegawai_aktif_${dateStr}.json`;
        a.click();
        URL.revokeObjectURL(url);
    });
});

document.getElementById('btn-clear').addEventListener('click', () => {
    if (confirm("Hapus seluruh log dan data penyimpanan ekstensi ini?")) {
        chrome.storage.local.set({ data: [], processedNips: {}, status: 'idle', lastLog: 'Penyimpanan lokal direset kembali.' });
    }
});

updateUI();