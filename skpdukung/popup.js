document.addEventListener('DOMContentLoaded', () => {
    const STORAGE_KEY = 'skpDukungData';
    const VERSI_DATA = 2;
    const BADGE = 'Organisasi';

    const BARIS = [
        {
            no: 1,
            rkk: 'Meningkatnya Penanaman Modal',
            aksi: 'Terlaksananya pelaporan LKPM',
            aksiTarget: '0.75 %',
            ik: 'Tingkat Pertumbuhan Nilai Investasi Daerah',
            target: '0.75%',
            sumber: 'Data pertumbuhan nilai investasi daerah'
        },
        {
            no: 2,
            rkk: 'Meningkatnya Realisasi Investasi Kota Semarang',
            aksi: 'Terlaksananya Pendampingan pelaku Usaha dalam kepatuhan LKPM',
            aksiTarget: '90% - 100%',
            ik: 'Realisasi penanaman modal (PMA/PMDN)',
            target: 'Rp. 9.974.250.000.000',
            sumber: 'Jumlah pendampingan Pelaku usaha'
        },
        {
            no: 3,
            rkk: 'Meningkatnya kualitas kinerja Dinas Penanaman Modal dan Pelayanan Terpadu Satu Pintu Kota Semarang',
            aksi: 'Terlaksananya Survey Kepuasan Masyarakat terhadap Kinerja pelayanan di DPMPTSP Kota Semarang',
            aksiTarget: '90% - 100%',
            ik: 'Indeks Kepuasan Masyarakat Dinas Penanaman Modal dan Pelayanan Terpadu Satu Pintu Kota Semarang',
            target: '90',
            sumber: 'data SKM'
        },
        {
            no: 3,
            rkk: 'Meningkatnya kualitas kinerja Dinas Penanaman Modal dan Pelayanan Terpadu Satu Pintu Kota Semarang',
            aksi: 'Terlaksananya Survey Kepuasan Masyarakat terhadap Kinerja pelayanan di DPMPTSP Kota Semarang',
            aksiTarget: '90% - 100%',
            ik: 'Nilai Akuntabilitas Kinerja Instansi Pemerintah (AKIP) Dinas Penanaman Modal dan Pelayanan Terpadu Satu Pintu Kota Semarang',
            target: '78.2',
            sumber: 'data e Sakip'
        },
        {
            no: 4,
            rkk: 'Terwujudnya pelayanan internal yang berkualitas dalam mendukung kinerja Dinas Penanaman Modal dan Pelayanan Terpadu Satu Pintu Kota Semarang',
            aksi: 'Terlaksananya pelayanan umum dan kepegawaian, serta kinerja pelaporan dan keuangan DPMPTSP Kota Semarang',
            aksiTarget: '90% - 100%',
            ik: 'Persentase kinerja pelayanan umum dan kepegawaian Dinas Penanaman Modal dan Pelayanan Terpadu Satu Pintu Kota Semarang',
            target: '100%',
            sumber: 'Data Administrasi kepegawaian'
        },
        {
            no: 4,
            rkk: 'Terwujudnya pelayanan internal yang berkualitas dalam mendukung kinerja Dinas Penanaman Modal dan Pelayanan Terpadu Satu Pintu Kota Semarang',
            aksi: 'Terlaksananya pelayanan umum dan kepegawaian, serta kinerja pelaporan dan keuangan DPMPTSP Kota Semarang',
            aksiTarget: '90% - 100%',
            ik: 'Persentase perencanaan serta pelaporan kinerja dan keuangan Dinas Penanaman Modal dan Pelayanan Terpadu Satu Pintu Kota Semarang',
            target: '100%',
            sumber: 'data perencanaan dan keuangan'
        },
        {
            no: 5,
            rkk: 'Meningkatnya ekosistem penanaman modal yang berkelanjutan',
            aksi: 'Terlaksananya Promosi bagi pelaku usaha untuk meningkatkan investor berskala nasional (PMDN/PMA)',
            aksiTarget: '0.62%',
            ik: 'Persentase Peningkatan Investor Berskala Nasional (PMDN/PMA)',
            target: '2.5%',
            sumber: 'data investor berskala nasional'
        },
        {
            no: 6,
            rkk: 'Meningkatnya Eksposur Potensi Daerah Kepada Calon Investor',
            aksi: 'Terlaksananya Kepeminatan Pelaku Usaha Untuk Berinvestasi di Kota Semarang Terhadap Target yang Ditetapkan',
            aksiTarget: '70%',
            ik: 'Persentase Kepeminatan Pelaku Usaha Untuk Berinvestasi di Kota Semarang Terhadap Target yang Ditetapkan',
            target: '70%',
            sumber: 'Data kepeminatan pelaku usaha berinvestasi'
        },
        {
            no: 7,
            rkk: 'Meningkatnya kemudahan pelayanan penanaman modal yang cepat, tepat dan transparan Pada Bidang Kesejahteraan Rakyat',
            aksi: 'Terlaksananya pelayanan penanaman modal yang cepat, tepat dan transparan Pada Bidang Kesejahteraan Rakyat',
            aksiTarget: '90% - 100%',
            ik: 'Persentase Pelaku Usaha Pada Bidang Kesejahteraan Rakyat yang Memperoleh Izin Sesuai Ketentuan',
            target: '100%',
            sumber: 'Data OSS dan MPPD'
        },
        {
            no: 8,
            rkk: 'Meningkatnya kemudahan pelayanan penanaman modal yang cepat, tepat dan transparan Pada Bidang Perekonomian',
            aksi: 'Terlaksananya pelayanan penanaman modal yang cepat, tepat dan transparan Pada Bidang Perekonomian',
            aksiTarget: '90% - 100%',
            ik: 'Persentase Pelaku Usaha Pada Bidang Perekonomian yang Memperoleh Izin Sesuai Ketentuan',
            target: '100%',
            sumber: 'Data OSS RBA'
        },
        {
            no: 9,
            rkk: 'Meningkatnya kemudahan pelayanan penanaman modal yang cepat, tepat dan transparan Pada Perizinan Dasar dan Bidang Pembangunan',
            aksi: 'Terlaksananya pelayanan penanaman modal yang cepat, tepat dan transparan Pada Perizinan Dasar dan Bidang Pembangunan',
            aksiTarget: '90% - 100%',
            ik: 'Persentase Pelaku Usaha Pada Perizinan Dasar dan Bidang  Pembangunan yang Memperoleh Izin Sesuai Ketentuan',
            target: '100%',
            sumber: 'Data PBG dan PKKPR'
        },
        {
            no: 10,
            rkk: 'Meningkatnya kemudahan pelayanan pengaduan penanaman modal dan perizinan',
            aksi: 'Terlaksananya pelayanan konsultasi dan pengaduan penanaman modal dan perizinan yang ditindaklanjuti',
            aksiTarget: '90% - 100%',
            ik: 'Persentase Pengaduan Penanaman Modal dan Perizinan yang Ditindak Lanjuti',
            target: '95%',
            sumber: 'Data Pengaduan'
        },
        {
            no: 11,
            rkk: 'Meningkatnya kepatuhan perizinan dan penanaman modal yang tertib dan akuntabel',
            aksi: 'Terlaksananya Pengawasan Kepatuhan perizinan dan penanaman modal yang tertib dan akuntabel',
            aksiTarget: '90% - 100%',
            ik: 'Persentase Realisasi Investasi Terhadap Target Investasi',
            target: '100%',
            sumber: 'realisasi investasi terhadap target'
        },
        {
            no: 12,
            rkk: 'Meningkatnya sistem informasi penanaman modal yang terpadu dan terintegras',
            aksi: 'Terlaksananya pengelolaan data dan sistem informasi penanaman modal',
            aksiTarget: '90% - 100%',
            ik: 'Persentase pengelolaan data dan sistem informasi penanaman modal',
            target: '100%',
            sumber: 'Pengolahan Data'
        }
    ];

    const DEFAULT_REALISASI = {
        1: '%',
        2: '%',
        3: '%',
        4: '',
        5: '%',
        6: '%',
        7: '%',
        8: '%',
        9: '%',
        10: '%',
        11: '%',
        12: '%',
        13: '%',
        14: '%'
    };

    const tabelBody = document.getElementById('tabelBody');
    const statusMsg = document.getElementById('statusMsg');
    const btnIsiSemua = document.getElementById('btnIsiSemua');
    const btnBaca = document.getElementById('btnBaca');
    const chkOverwrite = document.getElementById('chkOverwrite');
    const inputJudulGlobal = document.getElementById('inputJudulGlobal');
    const btnBersihkan = document.getElementById('btnBersihkan');
    const btnBersihkanWeb = document.getElementById('btnBersihkanWeb');

    let data = {};
    let judulGlobal = '';
    let timerSimpan = null;
    let tabTerakhir = null;

    function aktifkanAutoConfirm() {
        if (!window.__skpConfirmAsli) {
            window.__skpConfirmAsli = window.confirm;
            window.confirm = () => true;
        }
        clearTimeout(window.__skpConfirmTimer);
        window.__skpConfirmTimer = setTimeout(() => {
            if (window.__skpConfirmAsli) {
                window.confirm = window.__skpConfirmAsli;
                window.__skpConfirmAsli = null;
            }
        }, 180000);
    }

    function matikanAutoConfirm() {
        if (window.__skpConfirmAsli) {
            window.confirm = window.__skpConfirmAsli;
            window.__skpConfirmAsli = null;
        }
        clearTimeout(window.__skpConfirmTimer);
    }

    function sumberBaris(rowKeyVal) {
        const baris = BARIS[Number(rowKeyVal) - 1];
        return baris ? baris.sumber : '';
    }

    function defaultRealisasi(rowKeyVal) {
        return DEFAULT_REALISASI[Number(rowKeyVal)] || '';
    }

    function el(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    }

    function rowKey(index) {
        return String(index + 1);
    }

    function entry(rowKeyVal) {
        return data[rowKeyVal] || {};
    }

    function inputTeks(rowKeyVal, field, value, placeholder, maxLength, readOnly) {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'input-inline';
        input.value = value || '';
        input.placeholder = placeholder || '';
        input.maxLength = maxLength;
        input.autocomplete = 'off';
        input.dataset.row = rowKeyVal;
        input.dataset.field = field;
        if (readOnly) input.readOnly = true;
        return input;
    }

    function tombolIsi(rowKeyVal) {
        const btn = el('button', 'btn-isi', 'Isi ke Web');
        btn.type = 'button';
        btn.dataset.action = 'isi';
        btn.dataset.row = rowKeyVal;
        return btn;
    }

    function renderRow(item, index) {
        const rowKeyVal = rowKey(index);
        const isi = entry(rowKeyVal);

        const tr = document.createElement('tr');
        tr.appendChild(el('td', null, String(item.no)));

        const tdKiri = el('td', null);
        tdKiri.appendChild(document.createTextNode(item.rkk + ' '));
        tdKiri.appendChild(el('br'));
        tdKiri.appendChild(el('span', 'badge', ' ' + BADGE + ' '));
        tdKiri.appendChild(el('span', 'sub-aksi', item.aksi + '  Target : ' + item.aksiTarget));
        tr.appendChild(tdKiri);

        tr.appendChild(el('td', null, item.ik));
        tr.appendChild(el('td', null, item.target));

        const tdBukti = el('td', 'kolom-bukti');
        tdBukti.appendChild(inputTeks(rowKeyVal, 'url', isi.url, 'Link Google Drive/Dropbox/etc', 255));
        tdBukti.appendChild(tombolIsi(rowKeyVal));
        tr.appendChild(tdBukti);

        const tdRealisasi = el('td', 'kolom-realisasi');
        tdRealisasi.appendChild(inputTeks(
            rowKeyVal,
            'realisasi',
            isi.realisasi !== undefined ? isi.realisasi : defaultRealisasi(rowKeyVal),
            '',
            45
        ));
        tdRealisasi.appendChild(inputTeks(
            rowKeyVal,
            'sumber',
            sumberBaris(rowKeyVal),
            '',
            255,
            true
        ));
        tr.appendChild(tdRealisasi);

        return tr;
    }

    function render() {
        tabelBody.textContent = '';
        BARIS.forEach((item, i) => {
            tabelBody.appendChild(renderRow(item, i));
        });
        tampilkanStatus();
    }

    function hitung() {
        let bukti = 0;
        let realisasi = 0;
        Object.keys(data).forEach((k) => {
            const e = data[k] || {};
            if (e.url) bukti++;
            if (e.realisasi && e.realisasi !== '%') realisasi++;
        });
        return { bukti, realisasi };
    }

    function tampilkanStatus(pesan) {
        if (pesan) {
            statusMsg.innerText = pesan;
            return;
        }
        const { bukti, realisasi } = hitung();
        statusMsg.innerText = `${bukti} bukti dukung, ${realisasi} realisasi tersimpan.`;
    }

    function simpanSekarang() {
        if (timerSimpan) {
            clearTimeout(timerSimpan);
            timerSimpan = null;
        }
        chrome.storage.local.set({ [STORAGE_KEY]: data });
    }

    function simpanTertunda(pesan) {
        tampilkanStatus(pesan);
        if (timerSimpan) clearTimeout(timerSimpan);
        timerSimpan = setTimeout(() => {
            timerSimpan = null;
            chrome.storage.local.set({ [STORAGE_KEY]: data });
        }, 300);
    }

    function simpanJudul() {
        chrome.storage.local.set({ skpDukungJudul: judulGlobal });
    }

    function setNilai(rowKeyVal, field, nilai) {
        if (!data[rowKeyVal]) data[rowKeyVal] = {};
        data[rowKeyVal][field] = nilai.trim();
        if (!data[rowKeyVal].url && data[rowKeyVal].realisasi === undefined) delete data[rowKeyVal];
    }

    function setWebDisabled(state) {
        document.querySelectorAll('button').forEach((b) => { b.disabled = state; });
        chkOverwrite.disabled = state;
    }

    function paketRow(rowKeyVal) {
        const item = entry(rowKeyVal);
        const realisasi = item.realisasi && item.realisasi !== '%' ? item.realisasi : '';
        if (!(item.url || realisasi)) return null;
        return {
            key: rowKeyVal,
            item: {
                judul: item.url ? judulGlobal : '',
                url: item.url || '',
                realisasi,
                sumber: sumberBaris(rowKeyVal)
            }
        };
    }

    function semuaPaket() {
        return Object.keys(data)
            .map((k) => paketRow(k))
            .filter(Boolean)
            .sort((a, b) => Number(a.key) - Number(b.key));
    }

    async function inject(mode, rows) {
        setWebDisabled(true);
        tampilkanStatus(mode === 'baca' ? 'Membaca data dari web...' : 'Mengirim ke halaman web...');

        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const tab = tabs[0];
        if (!tab) {
            tampilkanStatus('Tab aktif tidak ditemukan.');
            setWebDisabled(false);
            return;
        }

        await chrome.storage.local.set({
            skpDukungConfig: { mode, rows, overwrite: chkOverwrite.checked }
        });

        tabTerakhir = tab.id;

        try {
            if (mode === 'hapus') {
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    world: 'MAIN',
                    func: aktifkanAutoConfirm
                });
            }

            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['skpdukung/content.js']
            });
        } catch (e) {
            tampilkanStatus('Gagal injeksi: ' + e.message + ' Buka halaman SKP Kadis di tab aktif dahulu.');
            setWebDisabled(false);
        }
    }

    tabelBody.addEventListener('input', (e) => {
        const input = e.target.closest('input[data-field]');
        if (!input || input.readOnly) return;
        setNilai(input.dataset.row, input.dataset.field, input.value);
    });

    tabelBody.addEventListener('keyup', (e) => {
        const input = e.target.closest('input[data-field]');
        if (!input || input.readOnly) return;
        simpanTertunda('Menyimpan...');
    });

    tabelBody.addEventListener('change', (e) => {
        const input = e.target.closest('input[data-field]');
        if (!input || input.readOnly) return;
        setNilai(input.dataset.row, input.dataset.field, input.value);
        simpanSekarang();
        tampilkanStatus();
    });

    tabelBody.addEventListener('focusout', (e) => {
        const input = e.target.closest('input[data-field]');
        if (!input || input.readOnly) return;
        setNilai(input.dataset.row, input.dataset.field, input.value);
        simpanSekarang();
        tampilkanStatus();
    });

    inputJudulGlobal.addEventListener('input', () => {
        judulGlobal = inputJudulGlobal.value.trim();
    });

    inputJudulGlobal.addEventListener('keyup', () => {
        simpanJudul();
        simpanTertunda('Menyimpan...');
    });

    inputJudulGlobal.addEventListener('change', () => {
        judulGlobal = inputJudulGlobal.value.trim();
        simpanJudul();
        tampilkanStatus();
    });

    inputJudulGlobal.addEventListener('focusout', () => {
        judulGlobal = inputJudulGlobal.value.trim();
        simpanJudul();
        tampilkanStatus();
    });

    tabelBody.addEventListener('focusin', (e) => {
        const input = e.target.closest('input[data-field="realisasi"]');
        if (input && input.value === '%') input.setSelectionRange(0, 0);
    });

    tabelBody.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;

        const rowKeyVal = btn.dataset.row;
        const paket = paketRow(rowKeyVal);
        if (!paket) {
            tampilkanStatus('Baris ini belum ada data untuk dikirim.');
            return;
        }
        inject('isi', [paket]);
    });

    btnIsiSemua.addEventListener('click', () => {
        const semua = semuaPaket();
        if (!semua.length) {
            tampilkanStatus('Belum ada data untuk dikirim.');
            return;
        }
        inject('isi', semua);
    });

    btnBaca.addEventListener('click', () => inject('baca', []));

    function kosongkanIsian() {
        data = {};
        BARIS.forEach((_, i) => {
            data[String(i + 1)] = { realisasi: '' };
        });
        chrome.storage.local.set({ [STORAGE_KEY]: data });
    }

    function bersihkanSemua() {
        kosongkanIsian();
        judulGlobal = '';
        inputJudulGlobal.value = '';
        chrome.storage.local.set({ skpDukungJudul: '' });
        render();
        tampilkanStatus('Semua input dibersihkan.');
    }

    btnBersihkan.addEventListener('click', () => {
        if (btnBersihkan.dataset.confirm !== '1') {
            btnBersihkan.dataset.confirm = '1';
            btnBersihkan.textContent = 'Yakin?';
            tampilkanStatus('Klik Bersihkan lagi untuk menghapus semua isian.');
            setTimeout(() => {
                btnBersihkan.dataset.confirm = '';
                btnBersihkan.textContent = 'Bersihkan';
            }, 3000);
            return;
        }
        btnBersihkan.dataset.confirm = '';
        btnBersihkan.textContent = 'Bersihkan';
        bersihkanSemua();
    });

    btnBersihkanWeb.addEventListener('click', () => {
        if (btnBersihkanWeb.dataset.confirm !== '1') {
            btnBersihkanWeb.dataset.confirm = '1';
            btnBersihkanWeb.textContent = 'Yakin?';
            tampilkanStatus('Klik Bersihkan Web lagi untuk menghapus bukti dukung dan realisasi di portal.');
            setTimeout(() => {
                btnBersihkanWeb.dataset.confirm = '';
                btnBersihkanWeb.textContent = 'Bersihkan Web';
            }, 4000);
            return;
        }
        btnBersihkanWeb.dataset.confirm = '';
        btnBersihkanWeb.textContent = 'Bersihkan Web';
        inject('hapus', []);
    });

    chkOverwrite.addEventListener('change', () => {
        chrome.storage.local.set({
            skpDukungConfig: { mode: 'isi', rows: semuaPaket(), overwrite: chkOverwrite.checked }
        });
    });

    chrome.runtime.onMessage.addListener((msg) => {
        if (msg.type === 'skpDukungProgress') {
            tampilkanStatus(msg.message);
        } else if (msg.type === 'skpDukungResult') {
            setWebDisabled(false);
            if (msg.mode === 'baca') {
                chrome.storage.local.get([STORAGE_KEY, 'skpDukungJudul'], (res) => {
                    data = res[STORAGE_KEY] || {};
                    judulGlobal = res.skpDukungJudul || judulGlobal;
                    inputJudulGlobal.value = judulGlobal;
                    render();
                    tampilkanStatus(msg.message);
                });
            } else if (msg.mode === 'hapus') {
                tampilkanStatus(msg.message);
                if (tabTerakhir) {
                    chrome.scripting.executeScript({
                        target: { tabId: tabTerakhir },
                        world: 'MAIN',
                        func: matikanAutoConfirm
                    }).catch(() => {});
                }
            } else {
                tampilkanStatus(msg.message);
            }
        }
    });

    chrome.storage.local.get([STORAGE_KEY, 'skpDukungJudul', 'skpDukungConfig', 'skpDukungVersi'], (res) => {
        const cfg = res.skpDukungConfig;
        if (cfg && cfg.overwrite) chkOverwrite.checked = true;

        data = res[STORAGE_KEY] || {};
        judulGlobal = res.skpDukungJudul || '';

        const versiLama = res.skpDukungVersi !== VERSI_DATA;
        let perluSimpan = false;

        Object.keys(data).forEach((k) => {
            const item = data[k];
            if (!item) return;

            if (item.judul) {
                if (!judulGlobal) judulGlobal = item.judul;
                delete item.judul;
                perluSimpan = true;
            }

            if (versiLama && item.realisasi) {
                item.realisasi = item.realisasi.includes('%') ? '%' : '';
                perluSimpan = true;
            }

            if (!item.url && item.realisasi === undefined) {
                delete data[k];
                perluSimpan = true;
            }
        });

        inputJudulGlobal.value = judulGlobal;

        const simpan = {};
        if (perluSimpan) {
            simpan[STORAGE_KEY] = data;
            simpan.skpDukungJudul = judulGlobal;
        }
        if (versiLama) simpan.skpDukungVersi = VERSI_DATA;
        if (Object.keys(simpan).length) chrome.storage.local.set(simpan);

        render();
    });
});
