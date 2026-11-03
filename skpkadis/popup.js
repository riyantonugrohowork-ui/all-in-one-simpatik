document.addEventListener('DOMContentLoaded', () => {
    const STORAGE_KEY = 'skpKadisAksi';
    const BADGE = 'Organisasi';

    const RENCANA = [
        {
            rkk: 'Meningkatnya Penanaman Modal',
            indikator: [
                { nama: 'Tingkat Pertumbuhan Nilai Investasi Daerah', target: '0.75%' }
            ]
        },
        {
            rkk: 'Meningkatnya Realisasi Investasi Kota Semarang',
            indikator: [
                { nama: 'Realisasi penanaman modal (PMA/PMDN)', target: 'Rp. 9.974.250.000.000' }
            ]
        },
        {
            rkk: 'Meningkatnya kualitas kinerja Dinas Penanaman Modal dan Pelayanan Terpadu Satu Pintu Kota Semarang',
            indikator: [
                { nama: 'Indeks Kepuasan Masyarakat Dinas Penanaman Modal dan Pelayanan Terpadu Satu Pintu Kota Semarang', target: '90' },
                { nama: 'Nilai Akuntabilitas Kinerja Instansi Pemerintah (AKIP) Dinas Penanaman Modal dan Pelayanan Terpadu Satu Pintu Kota Semarang', target: '78.2' }
            ]
        },
        {
            rkk: 'Terwujudnya pelayanan internal yang berkualitas dalam mendukung kinerja Dinas Penanaman Modal dan Pelayanan Terpadu Satu Pintu Kota Semarang',
            indikator: [
                { nama: 'Persentase kinerja pelayanan umum dan kepegawaian Dinas Penanaman Modal dan Pelayanan Terpadu Satu Pintu Kota Semarang', target: '100%' },
                { nama: 'Persentase perencanaan serta pelaporan kinerja dan keuangan Dinas Penanaman Modal dan Pelayanan Terpadu Satu Pintu Kota Semarang', target: '100%' }
            ]
        },
        {
            rkk: 'Meningkatnya ekosistem penanaman modal yang berkelanjutan',
            indikator: [
                { nama: 'Persentase Peningkatan Investor Berskala Nasional (PMDN/PMA)', target: '2.5%' }
            ]
        },
        {
            rkk: 'Meningkatnya Eksposur Potensi Daerah Kepada Calon Investor',
            indikator: [
                { nama: 'Persentase Kepeminatan Pelaku Usaha Untuk Berinvestasi di Kota Semarang Terhadap Target yang Ditetapkan', target: '70%' }
            ]
        },
        {
            rkk: 'Meningkatnya kemudahan pelayanan penanaman modal yang cepat, tepat dan transparan Pada Bidang Kesejahteraan Rakyat',
            indikator: [
                { nama: 'Persentase Pelaku Usaha Pada Bidang Kesejahteraan Rakyat yang Memperoleh Izin Sesuai Ketentuan', target: '100%' }
            ]
        },
        {
            rkk: 'Meningkatnya kemudahan pelayanan penanaman modal yang cepat, tepat dan transparan Pada Bidang Perekonomian',
            indikator: [
                { nama: 'Persentase Pelaku Usaha Pada Bidang Perekonomian yang Memperoleh Izin Sesuai Ketentuan', target: '100%' }
            ]
        },
        {
            rkk: 'Meningkatnya kemudahan pelayanan penanaman modal yang cepat, tepat dan transparan Pada Perizinan Dasar dan Bidang Pembangunan',
            indikator: [
                { nama: 'Persentase Pelaku Usaha Pada Perizinan Dasar dan Bidang  Pembangunan yang Memperoleh Izin Sesuai Ketentuan', target: '100%' }
            ]
        },
        {
            rkk: 'Meningkatnya kemudahan pelayanan pengaduan penanaman modal dan perizinan',
            indikator: [
                { nama: 'Persentase Pengaduan Penanaman Modal dan Perizinan yang Ditindak Lanjuti', target: '95%' }
            ]
        },
        {
            rkk: 'Meningkatnya kepatuhan perizinan dan penanaman modal yang tertib dan akuntabel',
            indikator: [
                { nama: 'Persentase Realisasi Investasi Terhadap Target Investasi', target: '100%' }
            ]
        },
        {
            rkk: 'Meningkatnya sistem informasi penanaman modal yang terpadu dan terintegras',
            indikator: [
                { nama: 'Persentase pengelolaan data dan sistem informasi penanaman modal', target: '100%' }
            ]
        }
    ];

    const AKSI_AWAL = {
        1: [{ deskripsi: 'Terlaksananya pelaporan LKPM', target: '0.75 %' }],
        2: [{ deskripsi: 'Terlaksananya Pendampingan pelaku Usaha dalam kepatuhan LKPM', target: '90% - 100%' }],
        3: [{ deskripsi: 'Terlaksananya Survey Kepuasan Masyarakat terhadap Kinerja pelayanan di DPMPTSP Kota Semarang', target: '90% - 100%' }],
        4: [{ deskripsi: 'Terlaksananya pelayanan umum dan kepegawaian, serta kinerja pelaporan dan keuangan DPMPTSP Kota Semarang', target: '90% - 100%' }],
        5: [{ deskripsi: 'Terlaksananya Promosi bagi pelaku usaha untuk meningkatkan investor berskala nasional (PMDN/PMA)', target: '0.62%' }],
        6: [{ deskripsi: 'Terlaksananya Kepeminatan Pelaku Usaha Untuk Berinvestasi di Kota Semarang Terhadap Target yang Ditetapkan', target: '70%' }],
        7: [{ deskripsi: 'Terlaksananya pelayanan penanaman modal yang cepat, tepat dan transparan Pada Bidang Kesejahteraan Rakyat', target: '90% - 100%' }],
        8: [{ deskripsi: 'Terlaksananya pelayanan penanaman modal yang cepat, tepat dan transparan Pada Bidang Perekonomian', target: '90% - 100%' }],
        9: [{ deskripsi: 'Terlaksananya pelayanan penanaman modal yang cepat, tepat dan transparan Pada Perizinan Dasar dan Bidang Pembangunan', target: '90% - 100%' }],
        10: [{ deskripsi: 'Terlaksananya pelayanan konsultasi dan pengaduan penanaman modal dan perizinan yang ditindaklanjuti', target: '90% - 100%' }],
        11: [{ deskripsi: 'Terlaksananya Pengawasan Kepatuhan perizinan dan penanaman modal yang tertib dan akuntabel', target: '90% - 100%' }],
        12: [{ deskripsi: 'Terlaksananya pengelolaan data dan sistem informasi penanaman modal', target: '90% - 100%' }]
    };

    const tabelBody = document.getElementById('tabelBody');
    const statusMsg = document.getElementById('statusMsg');
    const overlay = document.getElementById('modalOverlay');
    const modalTitle = document.getElementById('modalTitle');
    const inputDeskripsi = document.getElementById('inputDeskripsi');
    const inputTarget = document.getElementById('inputTarget');
    const modalError = document.getElementById('modalError');
    const btnOk = document.getElementById('btnOk');
    const btnClose = document.getElementById('btnClose');
    const btnCloseX = document.getElementById('btnCloseX');
    const btnIsiSemua = document.getElementById('btnIsiSemua');
    const chkOverwrite = document.getElementById('chkOverwrite');

    let data = {};
    let modalState = { rowKey: null, index: -1 };

    function el(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    }

    function save(cb) {
        chrome.storage.local.set({ [STORAGE_KEY]: data }, () => {
            if (cb) cb();
        });
    }

    function renderRow(no, item) {
        const rowKey = String(no);
        const tr = document.createElement('tr');

        tr.appendChild(el('td', null, String(no)));

        const tdKiri = el('td', null);
        tdKiri.appendChild(document.createTextNode(item.rkk + ' '));
        tdKiri.appendChild(el('br'));
        tdKiri.appendChild(el('span', 'badge', ' ' + BADGE + ' '));
        tdKiri.appendChild(el('br'));
        tdKiri.appendChild(document.createTextNode(' Indikator : '));
        tdKiri.appendChild(el('br'));

        const olInd = el('ol', 'indikator');
        item.indikator.forEach((ind) => {
            const li = el('li');
            li.appendChild(document.createTextNode('- ' + ind.nama + ' '));
            li.appendChild(el('br'));
            li.appendChild(el('span', 'target-tahunan', 'Target Tahunan : ' + ind.target));
            olInd.appendChild(li);
        });
        tdKiri.appendChild(olInd);
        tr.appendChild(tdKiri);

        const tdAksi = el('td', 'kolom-aksi');
        const btnTambah = el('button', 'btn-tambah', ' Tambah ');
        btnTambah.type = 'button';
        btnTambah.dataset.row = rowKey;
        btnTambah.dataset.action = 'tambah';
        tdAksi.appendChild(btnTambah);

        const list = data[rowKey] || [];
        const olAksi = el('ol', 'aksi-list');
        if (!list.length) {
            olAksi.appendChild(el('li', 'kosong', 'Belum ada rencana aksi'));
        } else {
            list.forEach((aksi, idx) => {
                const li = el('li');
                li.appendChild(document.createTextNode(aksi.deskripsi + '  Target : '));
                li.appendChild(el('b', null, aksi.target || '-'));

                const divBtn = el('div', 'buttons');
                const btnEdit = el('button', 'btn-edit', 'Edit');
                btnEdit.type = 'button';
                btnEdit.dataset.row = rowKey;
                btnEdit.dataset.index = String(idx);
                btnEdit.dataset.action = 'edit';

                const btnHapus = el('button', 'btn-hapus', 'Hapus');
                btnHapus.type = 'button';
                btnHapus.dataset.row = rowKey;
                btnHapus.dataset.index = String(idx);
                btnHapus.dataset.action = 'hapus';

                divBtn.appendChild(btnEdit);
                divBtn.appendChild(btnHapus);
                li.appendChild(divBtn);
                olAksi.appendChild(li);
            });
        }
        tdAksi.appendChild(olAksi);

        const btnWeb = el('button', 'btn-row-web', 'Isi ke Web');
        btnWeb.type = 'button';
        btnWeb.dataset.row = rowKey;
        btnWeb.dataset.action = 'web';
        btnWeb.disabled = !list.length;
        tdAksi.appendChild(btnWeb);

        tr.appendChild(tdAksi);

        return tr;
    }

    function render() {
        tabelBody.textContent = '';
        RENCANA.forEach((item, i) => {
            tabelBody.appendChild(renderRow(i + 1, item));
        });

        let total = 0;
        Object.keys(data).forEach((k) => { total += (data[k] || []).length; });
        statusMsg.innerText = total
            ? `${total} rencana aksi tersimpan.`
            : 'Belum ada rencana aksi. Data tersimpan otomatis di browser.';
    }

    function posisiModal(anchor) {
        const content = overlay.querySelector('.modal-content');
        if (!anchor) {
            content.style.marginTop = '16px';
            return;
        }
        const atas = anchor.getBoundingClientRect().top;
        const tinggi = content.offsetHeight || 260;
        const maks = Math.max(16, document.documentElement.scrollHeight - tinggi - 16);
        content.style.marginTop = Math.max(16, Math.min(atas - 20, maks)) + 'px';
    }

    function openModal(rowKey, index, anchor) {
        modalState = { rowKey, index: index === undefined ? -1 : index };
        const isEdit = modalState.index >= 0;
        modalTitle.textContent = isEdit ? 'Edit Rencana Aksi' : 'Tambah Rencana Aksi';

        if (isEdit) {
            const aksi = (data[rowKey] || [])[modalState.index] || {};
            inputDeskripsi.value = aksi.deskripsi || '';
            inputTarget.value = aksi.target || '';
        } else {
            inputDeskripsi.value = '';
            inputTarget.value = '';
        }

        modalError.textContent = '';
        overlay.classList.add('show');
        posisiModal(anchor);
        inputDeskripsi.focus();
    }

    function closeModal() {
        overlay.classList.remove('show');
        modalState = { rowKey: null, index: -1 };
    }

    function simpanAksi() {
        const deskripsi = inputDeskripsi.value.trim();
        const target = inputTarget.value.trim();

        if (!deskripsi) {
            modalError.textContent = 'Rencana Aksi wajib diisi.';
            inputDeskripsi.focus();
            return;
        }

        const rowKey = modalState.rowKey;
        if (!data[rowKey]) data[rowKey] = [];

        if (modalState.index >= 0) {
            data[rowKey][modalState.index] = { deskripsi, target };
        } else {
            data[rowKey].push({ deskripsi, target });
        }

        save(() => {
            closeModal();
            render();
        });
    }

    function setWebDisabled(state) {
        document.querySelectorAll('button').forEach((b) => { b.disabled = state; });
        chkOverwrite.disabled = state;
    }

    async function isiKeWeb(rows) {
        if (!rows.length) {
            statusMsg.innerText = 'Belum ada rencana aksi untuk dikirim.';
            return;
        }

        setWebDisabled(true);
        statusMsg.innerText = 'Mengirim ke halaman web...';

        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const tab = tabs[0];
        if (!tab) {
            statusMsg.innerText = 'Tab aktif tidak ditemukan.';
            setWebDisabled(false);
            return;
        }

        await chrome.storage.local.set({
            skpKadisWeb: { rows, overwrite: chkOverwrite.checked }
        });

        try {
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['skpkadis/content.js']
            });
        } catch (e) {
            statusMsg.innerText = 'Gagal injeksi: ' + e.message + ' Buka halaman SKP Kadis di tab aktif dahulu.';
            setWebDisabled(false);
        }
    }

    function rowsUntukWeb(rowKey) {
        const list = data[rowKey] || [];
        return list.length ? [{ no: Number(rowKey), items: list }] : [];
    }

    function semuaRows() {
        return Object.keys(data)
            .map((k) => ({ no: Number(k), items: data[k] || [] }))
            .filter((r) => r.items.length)
            .sort((a, b) => a.no - b.no);
    }

    chrome.runtime.onMessage.addListener((msg) => {
        if (msg.type === 'skpProgress') {
            statusMsg.innerText = msg.message;
        } else if (msg.type === 'skpResult') {
            setWebDisabled(false);
            render();
            statusMsg.innerText = msg.message;
        }
    });

    btnIsiSemua.addEventListener('click', () => isiKeWeb(semuaRows()));

    chkOverwrite.addEventListener('change', () => {
        chrome.storage.local.set({ skpKadisWeb: { rows: semuaRows(), overwrite: chkOverwrite.checked } });
    });

    chrome.storage.local.get('skpKadisWeb', (res) => {
        const cfg = res.skpKadisWeb;
        if (cfg && cfg.overwrite) chkOverwrite.checked = true;
    });

    tabelBody.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;

        const rowKey = btn.dataset.row;
        const action = btn.dataset.action;

        if (action === 'tambah') {
            openModal(rowKey, undefined, btn);
            return;
        }

        if (action === 'edit') {
            openModal(rowKey, Number(btn.dataset.index), btn);
            return;
        }

        if (action === 'web') {
            isiKeWeb(rowsUntukWeb(rowKey));
            return;
        }

        if (action === 'hapus') {
            const index = Number(btn.dataset.index);
            const aksi = (data[rowKey] || [])[index];
            if (!aksi) return;

            if (btn.dataset.confirm !== '1') {
                btn.dataset.confirm = '1';
                btn.textContent = 'Yakin?';
                statusMsg.innerText = `Klik Hapus lagi untuk menghapus "${aksi.deskripsi}".`;
                setTimeout(() => {
                    btn.dataset.confirm = '';
                    btn.textContent = 'Hapus';
                }, 3000);
                return;
            }

            data[rowKey].splice(index, 1);
            if (!data[rowKey].length) delete data[rowKey];
            save(render);
        }
    });

    btnOk.addEventListener('click', simpanAksi);
    btnClose.addEventListener('click', closeModal);
    btnCloseX.addEventListener('click', closeModal);

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay.classList.contains('show')) closeModal();
    });

    document.getElementById('formAksi').addEventListener('submit', (e) => {
        e.preventDefault();
        simpanAksi();
    });

    chrome.storage.local.get(STORAGE_KEY, (res) => {
        if (res[STORAGE_KEY] === undefined) {
            data = JSON.parse(JSON.stringify(AKSI_AWAL));
            save(render);
            return;
        }
        data = res[STORAGE_KEY] || {};
        render();
    });
});
