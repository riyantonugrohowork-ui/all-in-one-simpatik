document.addEventListener('DOMContentLoaded', () => {
    const elBaseUrl = document.getElementById('baseUrl');
    const elApiKey = document.getElementById('apiKey');
    const elStatus = document.getElementById('statusMsg');
    const btnSimpan = document.getElementById('btnSimpan');
    const btnShowKey = document.getElementById('btnShowKey');

    const DEFAULT_BASE_URL = 'https://kepegawaian.it-dpmptsp.my.id/api/v1';
    const STORE_KEY = 'apiConfig';

    function setStatus(msg, cls) {
        elStatus.innerText = msg;
        elStatus.className = 'status' + (cls ? ' ' + cls : '');
    }

    function rapikanBaseUrl(v) {
        return (v || '').trim().replace(/\/+$/, '') || DEFAULT_BASE_URL;
    }

    // Muat konfigurasi tersimpan. Bila belum ada, pakai nilai lama dari tab API Cuti.
    chrome.storage.local.get([STORE_KEY, 'apicutiConfig'], (res) => {
        if (res[STORE_KEY]) {
            elBaseUrl.value = res[STORE_KEY].baseUrl || DEFAULT_BASE_URL;
            elApiKey.value = res[STORE_KEY].apiKey || '';
            setStatus('Konfigurasi tersimpan.');
            return;
        }
        const lama = res.apicutiConfig || {};
        elBaseUrl.value = lama.baseUrl || DEFAULT_BASE_URL;
        elApiKey.value = lama.apiKey || '';
        setStatus('Belum disimpan. Klik Simpan agar dipakai semua tab.');
    });

    btnShowKey.addEventListener('click', () => {
        elApiKey.type = elApiKey.type === 'password' ? 'text' : 'password';
    });

    function originPattern(url) {
        try {
            const u = new URL(url);
            if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
            return u.origin + '/*';
        } catch (e) {
            return null;
        }
    }

    btnSimpan.addEventListener('click', () => {
        const baseUrl = rapikanBaseUrl(elBaseUrl.value);
        const pattern = originPattern(baseUrl);
        if (!pattern) {
            setStatus('Base URL tidak valid. Contoh: https://contoh.com/api/v1', 'err');
            return;
        }
        const apiKey = elApiKey.value.trim();

        // Simpan dulu supaya nilai tidak hilang bila dialog izin menutup popup.
        chrome.storage.local.set({ [STORE_KEY]: { baseUrl: baseUrl, apiKey: apiKey } }, () => {
            if (chrome.runtime.lastError) {
                setStatus('Gagal menyimpan: ' + chrome.runtime.lastError.message, 'err');
                return;
            }
            elBaseUrl.value = baseUrl;
            elApiKey.value = apiKey;
            setStatus('Tersimpan. Semua tab yang membutuhkan API memakai konfigurasi ini.', 'ok');
        });

        // Minta izin origin langsung di dalam klik (user gesture).
        chrome.permissions.request({ origins: [pattern] }, (granted) => {
            if (chrome.runtime.lastError) return;
            if (!granted) {
                setStatus('Tersimpan, tetapi izin akses ke ' + baseUrl + ' ditolak sehingga API tidak bisa dihubungi.', 'err');
            }
        });
    });
});
