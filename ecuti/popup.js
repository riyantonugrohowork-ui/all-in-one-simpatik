document.addEventListener('DOMContentLoaded', () => {
    const btnGenerate = document.getElementById('btnGenerate');
    const btnCopy = document.getElementById('btnCopy');
    const resultText = document.getElementById('resultText');
    const statusMsg = document.getElementById('statusMsg');

    function loadDataFromPage() {
        statusMsg.innerText = "Membaca data dari halaman...";

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs[0]) return;

            // Kirim perintah ke content.js di halaman web yang aktif
            chrome.tabs.sendMessage(tabs[0].id, { action: "generateText" }, (response) => {
                if (chrome.runtime.lastError) {
                    resultText.value = "";
                    statusMsg.innerText = "Buka & refresh halaman e-cuti.semarangkota.go.id dahulu.";
                    return;
                }

                if (response && response.text) {
                    resultText.value = response.text;
                    statusMsg.innerText = `Berhasil menarik ${response.count} data centang.`;
                } else if (response && response.error) {
                    resultText.value = "";
                    statusMsg.innerText = response.error;
                }
            });
        });
    }

    // Ambil data langsung saat popup dibuka
    loadDataFromPage();

    // Tombol Refresh
    btnGenerate.addEventListener('click', loadDataFromPage);

    // Tombol Salin
    btnCopy.addEventListener('click', () => {
        if (!resultText.value) return;
        resultText.select();
        navigator.clipboard.writeText(resultText.value).then(() => {
            btnCopy.innerText = "✅ Tersalin!";
            setTimeout(() => {
                btnCopy.innerText = "📋 Salin Teks";
            }, 2000);
        });
    });
});