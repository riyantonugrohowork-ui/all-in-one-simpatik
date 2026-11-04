document.addEventListener('DOMContentLoaded', () => {
    const elApiInfo = document.getElementById('apiInfo');
    const elKode = document.getElementById('kode');
    const elNomorAwal = document.getElementById('nomorAwal');
    const elTahun = document.getElementById('tahun');
    const elSumber = document.getElementById('sumberLabel');
    const elCekRiwayat = document.getElementById('cekRiwayat');
    const elAbaikanGate = document.getElementById('abaikanGate');
    const elTeks = document.getElementById('teksCuti');
    const elStatus = document.getElementById('statusMsg');
    const elHasilWrap = document.getElementById('hasilWrap');
    const elHasil = document.getElementById('hasilBox');
    const btnSalinTabel = document.getElementById('btnSalinTabel');
    let tsvTerakhir = '';
    let hasilTerakhir = [];
    let tahunTerakhir = [];
    const btnAmbil = document.getElementById('btnAmbil');
    const btnBerikutnya = document.getElementById('btnBerikutnya');
    const btnKirim = document.getElementById('btnKirim');
    const btnIsiWeb = document.getElementById('btnIsiWeb');
    const elIsiWebGroup = document.getElementById('isiWebGroup');

    const DEFAULTS = {
        kode: '800',
        sumberLabel: 'ext-ecuti-v1'
    };
    const STORE_KEY = 'apicutiConfig';
    const API_CONFIG_KEY = 'apiConfig';
    const DEFAULT_BASE_URL = 'https://kepegawaian.it-dpmptsp.my.id/api/v1';
    let apiConfig = { baseUrl: DEFAULT_BASE_URL, apiKey: '' };

    function setStatus(msg, cls) {
        elStatus.innerText = msg;
        elStatus.className = 'status' + (cls ? ' ' + cls : '');
    }

    function showHasil(html) {
        elHasil.innerHTML = html;
        elHasilWrap.style.display = 'block';
    }

    function hideHasil() {
        elHasilWrap.style.display = 'none';
        elHasil.innerHTML = '';
        tsvTerakhir = '';
        elIsiWebGroup.style.display = 'none';
    }

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function terapkanApiConfig(cfg) {
        apiConfig = {
            baseUrl: (cfg.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, ''),
            apiKey: cfg.apiKey || ''
        };
        elApiInfo.innerHTML = 'API: <b>' + esc(apiConfig.baseUrl) + '</b> &middot; ' +
            (apiConfig.apiKey
                ? 'API Key tersimpan'
                : '<span style="color:#dd4b39">API Key belum diisi</span>') +
            ' &middot; ubah di tab <b>Setting</b>.';
    }

    chrome.storage.local.get([API_CONFIG_KEY], (res) => {
        terapkanApiConfig(res[API_CONFIG_KEY] || {});
    });

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes[API_CONFIG_KEY]) {
            terapkanApiConfig(changes[API_CONFIG_KEY].newValue || {});
        }
    });

    // Susun kolom Pengajuan dari field yang dikembalikan API.
    // Contoh: "Cuti Tahunan 2 hari (09 - 10 November 2026) pengajuan 29-10-2026 12:53:14"
    function teksPengajuan(h) {
        let s = '';
        if (h.jenis) s += h.jenis + (h.hari ? ' ' + h.hari + ' hari' : '');
        const rentang = h.rentang || h.tanggal_text || h.tanggal || h.periode ||
            (h.tanggal_mulai ? h.tanggal_mulai + (h.tanggal_selesai && h.tanggal_selesai !== h.tanggal_mulai ? ' - ' + h.tanggal_selesai : '') : '');
        if (rentang) s += ' (' + rentang + ')';
        if (h.pengajuan) s += (s ? ' ' : '') + 'pengajuan ' + h.pengajuan;
        return s || '-';
    }

    function renderHasil(data) {
        const hasil = data.hasil || [];
        hasilTerakhir = hasil;
        let tahun = Array.isArray(data.tahun) && data.tahun.length ? data.tahun : null;
        if (!tahun && hasil.length && hasil[0].sisa) {
            tahun = Object.keys(hasil[0].sisa).map((t) => parseInt(t, 10))
                .filter((n) => !isNaN(n)).sort((a, b) => b - a);
        }
        if (!tahun || !tahun.length) tahun = [new Date().getFullYear()];
        tahunTerakhir = tahun;

        const kepala = ['No', 'Nama', 'Pengajuan', 'Nomor Surat']
            .concat(tahun.map((t) => 'Sisa ' + t));

        const barisTsv = [kepala.join('\t')];
        const barisHtml = hasil.map((h) => {
            const sisa = tahun.map((t) => (h.sisa && h.sisa[t] != null ? h.sisa[t] : 0));
            const sel = [h.no != null ? h.no : '', h.nama || '', teksPengajuan(h), h.nomor || (h.duplikat ? 'DUPLIKAT' : '-')]
                .concat(sisa);
            barisTsv.push(sel.join('\t'));
            return '<tr' + (h.duplikat ? ' class="duplikat"' : '') + '>' +
                '<td>' + esc(sel[0]) + '</td>' +
                '<td class="wrap">' + esc(sel[1]) + '</td>' +
                '<td class="wrap">' + esc(sel[2]) + '</td>' +
                '<td>' + esc(sel[3]) + '</td>' +
                sisa.map((v) => '<td style="text-align:center">' + esc(v) + '</td>').join('') +
                '</tr>';
        });

        let html = '<table><thead><tr>' +
            kepala.map((k) => '<th>' + esc(k) + '</th>').join('') +
            '</tr></thead><tbody>' + (barisHtml.join('') || '<tr><td colspan="' + kepala.length + '">Tidak ada hasil.</td></tr>') + '</tbody></table>';

        if ((data.duplikat || []).length) {
            html += '<div class="sub"><b>Duplikat (' + data.duplikat.length + '):</b>\n' +
                data.duplikat.map((d) => esc(d.nama || '-') + ' | ' + esc(d.pengajuan || '-') + ' | ' + esc(d.jenis || '-')).join('\n') + '</div>';
        }
        if ((data.tak_dikenali || []).length) {
            html += '<div class="sub"><b>Tak dikenali (' + data.tak_dikenali.length + '):</b>\n' +
                data.tak_dikenali.map((t) => esc(t.mentah || t.nama || JSON.stringify(t))).join('\n') + '</div>';
        }

        tsvTerakhir = barisTsv.join('\n');
        showHasil(html);
        elIsiWebGroup.style.display = 'flex';
    }

    btnSalinTabel.addEventListener('click', () => {
        if (!tsvTerakhir) return;
        navigator.clipboard.writeText(tsvTerakhir).then(() => {
            const old = btnSalinTabel.innerText;
            btnSalinTabel.innerText = 'Tersalin!';
            setTimeout(() => { btnSalinTabel.innerText = old; }, 2000);
        });
    });

    // Muat konfigurasi khusus tab API Cuti (API Key & Base URL ada di tab Setting)
    chrome.storage.local.get([STORE_KEY], (res) => {
        const cfg = res[STORE_KEY] || {};
        elKode.value = cfg.kode || DEFAULTS.kode;
        elTahun.value = cfg.tahun || '';
        elSumber.value = cfg.sumberLabel || DEFAULTS.sumberLabel;
        elCekRiwayat.checked = !!cfg.cekRiwayat;
        elAbaikanGate.checked = !!cfg.abaikanGate;
    });

    function simpanConfig() {
        chrome.storage.local.set({
            [STORE_KEY]: {
                kode: elKode.value.trim() || DEFAULTS.kode,
                tahun: elTahun.value.trim(),
                sumberLabel: elSumber.value.trim() || DEFAULTS.sumberLabel,
                cekRiwayat: elCekRiwayat.checked,
                abaikanGate: elAbaikanGate.checked
            }
        });
    }

    [elKode, elTahun, elSumber].forEach((el) => {
        el.addEventListener('change', simpanConfig);
    });
    [elCekRiwayat, elAbaikanGate].forEach((el) => {
        el.addEventListener('change', simpanConfig);
    });

    function baseUrl() {
        return apiConfig.baseUrl;
    }

    function kode() {
        return elKode.value.trim() || DEFAULTS.kode;
    }

    function parseTahun() {
        const raw = elTahun.value.trim();
        if (!raw) return undefined;
        const arr = raw.split(/[,\s]+/).map((s) => parseInt(s, 10)).filter((n) => !isNaN(n));
        if (!arr.length) return undefined;
        return [...new Set(arr)].sort((a, b) => b - a);
    }

    function apiHeaders() {
        return {
            'Content-Type': 'application/json',
            'X-API-Key': apiConfig.apiKey
        };
    }

    function cekPrasyarat() {
        if (!apiConfig.apiKey) {
            setStatus('API Key belum diisi. Buka tab Setting untuk mengisinya.', 'err');
            return false;
        }
        if (!elTeks.value.trim()) {
            setStatus('Ambil data centang dari halaman e-Cuti dahulu.', 'err');
            return false;
        }
        return true;
    }

    async function bacaError(res) {
        let body = {};
        try { body = await res.json(); } catch (e) { /* bukan JSON */ }
        if (res.status === 401) return 'API Key salah / tidak aktif / kadaluarsa (401).';
        if (res.status === 403) return 'API Key tidak punya akses (403).';
        if (res.status === 409 && body.kode_error === 'belum_impor')
            return 'Gagal: impor cuti hari ini belum dilakukan (409). Centang "Abaikan gate impor" bila darurat.';
        if (res.status === 422) {
            const rincian = body.errors ? ' ' + JSON.stringify(body.errors) : '';
            return 'Input tidak valid (422): ' + (body.error || body.message || 'periksa format data') + rincian;
        }
        if (res.status === 429) return 'Limit 60/menit terlampaui (429), coba lagi semenit kemudian.';
        return 'Gagal (' + res.status + '): ' + (body.error || body.message || res.statusText);
    }

    function kirimPesanKeHalaman(payload, cb) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs[0]) return;
            chrome.tabs.sendMessage(tabs[0].id, payload, (response) => {
                if (chrome.runtime.lastError) {
                    setStatus('Buka & refresh halaman e-cuti.semarangkota.go.id dahulu.', 'err');
                    return;
                }
                if (cb) cb(response);
            });
        });
    }

    function ambilData() {
        setStatus('Membaca data centang dari halaman...');
        hideHasil();
        kirimPesanKeHalaman({ action: 'generateText' }, (response) => {
            if (!response) return;
            if (response.error) {
                elTeks.value = '';
                setStatus(response.error, 'err');
                return;
            }
            elTeks.value = response.text || '';
            setStatus('Berhasil menarik ' + (response.count || 0) + ' data centang. Siap dikirim.', 'ok');
        });
    }

    async function cekNomor() {
        if (!apiConfig.apiKey) {
            setStatus('API Key belum diisi. Buka tab Setting untuk mengisinya.', 'err');
            return;
        }
        setStatus('Menanyakan nomor awal berikutnya...');
        try {
            const res = await fetch(
                baseUrl() + '/generator-surat-cuti/berikutnya?kode=' + encodeURIComponent(kode()),
                { headers: { 'X-API-Key': apiConfig.apiKey } }
            );
            if (!res.ok) {
                setStatus(await bacaError(res), 'err');
                return;
            }
            const data = await res.json();
            setStatus(
                'Nomor awal berikutnya: ' + data.nomor_awal + ' (kode ' + data.kode + ')' +
                (data.import_hari_ini ? ', impor hari ini sudah dilakukan.' : ', impor hari ini BELUM dilakukan!'),
                'ok'
            );
            if (!elNomorAwal.value.trim() && data.nomor_awal) {
                elNomorAwal.value = data.nomor_awal;
            }
        } catch (e) {
            setStatus('Jaringan gagal: ' + e.message, 'err');
        }
    }

    async function kirimKeApi() {
        if (!cekPrasyarat()) return;
        simpanConfig();
        btnKirim.disabled = true;
        setStatus('Mengirim ke API...');
        hideHasil();

        const body = {
            teks: elTeks.value,
            kode: kode(),
            sumber_label: elSumber.value.trim() || DEFAULTS.sumberLabel,
            cek_riwayat: elCekRiwayat.checked,
            abaikan_gate: elAbaikanGate.checked
        };
        const nomorAwal = parseInt(elNomorAwal.value, 10);
        if (!isNaN(nomorAwal)) body.nomor_awal = nomorAwal;
        const tahun = parseTahun();
        if (tahun) body.tahun = tahun;

        try {
            const res = await fetch(baseUrl() + '/generator-surat-cuti', {
                method: 'POST',
                headers: apiHeaders(),
                body: JSON.stringify(body)
            });
            if (!res.ok) {
                setStatus(await bacaError(res), 'err');
                return;
            }
            const data = await res.json();
            setStatus(
                'Tersimpan! Batch ' + data.batch + ': ' + data.jumlah_bernomor + ' bernomor, ' +
                data.jumlah_duplikat + ' duplikat. Nomor berikutnya: ' + data.nomor_berikutnya + '.',
                'ok'
            );

            renderHasil(data);
        } catch (e) {
            setStatus('Jaringan gagal: ' + e.message, 'err');
        } finally {
            btnKirim.disabled = false;
        }
    }

    function normalNama(s) {
        return String(s == null ? '' : s).replace(/\s+/g, ' ').trim().toUpperCase();
    }

    // Buka tiap form "Pemberian Nomor Surat OPD" di tab baru lewat background,
    // isi No Surat + Sisa Cuti (N, N-1, N-2), klik Save and go to list, lalu tutup tab.
    function isiKeWeb() {
        if (!hasilTerakhir.length) {
            setStatus('Klik "Kirim ke API" dulu supaya nomor surat & sisa cuti tersedia.', 'err');
            return;
        }

        setStatus('Membaca baris centang berlink "Pemberian Nomor Surat"...');
        kirimPesanKeHalaman({ action: 'ambilBarisTtdOpd' }, (response) => {
            if (!response) return;

            const baris = (response.data || []).filter((b) => b.id && b.url);
            if (!baris.length) {
                setStatus('Tidak ada baris tercentang yang punya link "Pemberian Nomor Surat".', 'err');
                return;
            }

            const map = {};
            hasilTerakhir.forEach((h) => {
                const key = normalNama(h.nama);
                if (key && !map[key]) map[key] = h;
            });

            const tahunN = (tahunTerakhir && tahunTerakhir.length) ? tahunTerakhir[0] : new Date().getFullYear();
            const queue = [];
            const takCocok = [];

            baris.forEach((b) => {
                const h = map[normalNama(b.nama)];
                if (!h) { takCocok.push(b.nama); return; }
                const sisa = h.sisa || {};
                queue.push({
                    id: b.id,
                    nama: b.nama,
                    url: b.url,
                    no_surat: h.nomor || '',
                    sisa_cuti: sisa[tahunN] != null ? sisa[tahunN] : 0,
                    sisa_cuti_n1: sisa[tahunN - 1] != null ? sisa[tahunN - 1] : 0,
                    sisa_cuti_n2: sisa[tahunN - 2] != null ? sisa[tahunN - 2] : 0
                });
            });

            if (!queue.length) {
                setStatus('Tidak ada baris OPD yang cocok dengan hasil API.', 'err');
                return;
            }

            chrome.storage.local.set({
                apicutiFill: { status: 'running', queue: queue, done: {}, log: 'Memulai pengisian...' }
            }, () => {
                chrome.runtime.sendMessage({ action: 'startIsiCuti' }, (resp) => {
                    if (chrome.runtime.lastError) {
                        setStatus('Gagal memulai: ' + chrome.runtime.lastError.message, 'err');
                        return;
                    }
                    if (resp && resp.ok === false) {
                        setStatus(resp.error || 'Gagal memulai pengisian.', 'err');
                        return;
                    }
                    setStatus(
                        'Mengisi ' + queue.length + ' pengajuan di tab baru...' +
                        (takCocok.length ? ' Dilewati (tak ada di hasil API): ' + takCocok.join(', ') : ''),
                        'ok'
                    );
                });
            });
        });
    }

    chrome.runtime.onMessage.addListener((msg) => {
        if (msg && msg.action === 'apicutiProgress' && msg.text) {
            const selesai = /^Selesai\./.test(msg.text);
            setStatus(msg.text, selesai ? 'ok' : '');
        }
    });

    btnAmbil.addEventListener('click', ambilData);
    btnBerikutnya.addEventListener('click', cekNomor);
    btnKirim.addEventListener('click', kirimKeApi);
    btnIsiWeb.addEventListener('click', isiKeWeb);

    ambilData();
});
