document.addEventListener('DOMContentLoaded', () => {
    const btnGenerate = document.getElementById('btnGenerate');
    const btnCopy = document.getElementById('btnCopy');
    const selStatus = document.getElementById('statusAsn');
    const resultText = document.getElementById('resultText');
    const statusMsg = document.getElementById('statusMsg');

    const getEl = (f) => document.getElementById(f);

    function buildBlock(item) {
        const nama = item.nama || (item.nip ? `Pegawai NIP ${item.nip}` : '-');
        const tujuan = item.jenisTujuan || item.jenisAwalText || '-';

        const ket = item.jenisTujuan
            ? `2. Jenis Cuti : ${item.jenisAwalText || '-'} menjadi ${tujuan.toLowerCase()}`
            : `2. Jenis Cuti : ${item.jenisAwalText || '-'} (tidak diubah)`;

        return [
            `Status ASN: ${selStatus.value}`,
            `Nama : ${nama}`,
            `NIP : ${item.nip || '-'}`,
            `Jenis Cuti : ${tujuan}`,
            `Alasan Cuti : ${item.keperluan || '-'}`,
            `Tanggal Cuti : ${item.tanggalText || '-'}`,
            '',
            `Ket :`,
            `1. STATUS ASN : ${selStatus.value}`,
            ket,
            `3. ${item.nip || '-'}`
        ].join('\n');
    }

    function refresh(items) {
        if (!items || !items.length) {
            resultText.value = '';
            return;
        }

        const sep = '\n----------------------------------------\n';
        resultText.value = items.map(buildBlock).join(sep) + '\n\nTerima Kasih🙏🏻';
    }

    function sendToPage(payload, cb) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs[0]) return;
            chrome.tabs.sendMessage(tabs[0].id, payload, (response) => {
                if (chrome.runtime.lastError) {
                    statusMsg.innerText = 'Buka & refresh halaman e-cuti.semarangkota.go.id dahulu.';
                    return;
                }
                if (cb) cb(response);
            });
        });
    }

    function loadDataFromPage() {
        statusMsg.innerText = 'Membaca data centang...';

        sendToPage({ action: 'ubahStatusList' }, (response) => {
            if (!response) return;

            if (response.error) {
                refresh([]);
                statusMsg.innerText = response.error;
                return;
            }

            const items = response.data || [];
            refresh(items);

            if (!items.length) {
                statusMsg.innerText = 'Baris centang tidak ditemukan. Centang pengajuan di tabel e-Cuti.';
                return;
            }

            const sudahTahunan = items.filter((i) => /tahunan/i.test(i.jenisAwalText || '')).length;
            statusMsg.innerText = `${items.length} pengajuan terbaca` +
                (sudahTahunan ? `, ${sudahTahunan} sudah Cuti Tahunan (jenis tetap).` : '.');
        });
    }

    selStatus.addEventListener('change', loadDataFromPage);

    btnGenerate.addEventListener('click', loadDataFromPage);

    btnCopy.addEventListener('click', () => {
        if (!resultText.value) return;
        resultText.select();
        navigator.clipboard.writeText(resultText.value).then(() => {
            const old = btnCopy.innerText;
            btnCopy.innerText = 'Tersalin!';
            setTimeout(() => { btnCopy.innerText = old; }, 2000);
        });
    });

    loadDataFromPage();
});
