const BULAN_INDO = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

function formatTanggalRange(startDateStr, endDateStr) {
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return `${startDateStr} - ${endDateStr}`;
    }

    const d1 = start.getDate().toString().padStart(2, '0');
    const m1 = BULAN_INDO[start.getMonth()];
    const y1 = start.getFullYear();

    const d2 = end.getDate().toString().padStart(2, '0');
    const m2 = BULAN_INDO[end.getMonth()];
    const y2 = end.getFullYear();

    if (startDateStr === endDateStr) {
        return `${d1} ${m1} ${y1}`;
    } else if (m1 === m2 && y1 === y2) {
        return `${d1} - ${d2} ${m1} ${y1}`;
    } else if (y1 === y2) {
        return `${d1} ${m1} - ${d2} ${m2} ${y1}`;
    } else {
        return `${d1} ${m1} ${y1} - ${d2} ${m2} ${y2}`;
    }
}

function calculateDays(startDateStr, endDateStr, skipWeekend) {
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 1;

    if (!skipWeekend) {
        const diffTime = Math.abs(end - start);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }

    const lo = new Date(Math.min(start.getTime(), end.getTime()));
    const hi = new Date(Math.max(start.getTime(), end.getTime()));
    let total = 0;
    for (const d = new Date(lo); d <= hi; d.setDate(d.getDate() + 1)) {
        const day = d.getDay();
        if (day !== 0 && day !== 6) total++;
    }
    return total;
}

function isRowChecked(tr) {
    const checkbox = tr.querySelector('input[type="checkbox"]');
    const icheckContainer = tr.querySelector('.icheckbox_minimal-red, [class*="icheckbox"]');

    if (checkbox && checkbox.checked) return true;
    if (icheckContainer) {
        if (icheckContainer.classList.contains('checked')) return true;
        if (icheckContainer.getAttribute('aria-checked') === 'true') return true;
    }
    return false;
}

function extractCheckedData() {
    const trList = document.querySelectorAll('table tbody tr');
    const groupedData = {};
    let totalPengajuanCount = 0;

    trList.forEach((tr) => {
        if (!isRowChecked(tr)) return;

        const tds = tr.querySelectorAll('td');
        if (tds.length < 7) return;

        // TD 1: Nama
        const labelsTd1 = tds[1].querySelectorAll('.label');
        const nama = labelsTd1[0] ? labelsTd1[0].innerText.trim() : '';

        // TD 2: Tanggal Cuti & Jenis Cuti
        const labelsTd2 = tds[2].querySelectorAll('.label');
        const rawTanggal = labelsTd2[0] ? labelsTd2[0].innerText.trim() : '';
        const jenisCuti = labelsTd2[1] ? labelsTd2[1].innerText.trim() : '';

        // TD 6 (Index 6): Tanggal Pengajuan
        const tglPengajuan = tds[6] ? tds[6].innerText.trim() : '';

        // Tanggal
        const dateParts = rawTanggal.split(/\s+SD\s+/i);
        let rangeFormatted = rawTanggal;
        let totalHari = 1;

        if (dateParts.length === 2) {
            const startStr = dateParts[0].trim();
            const endStr = dateParts[1].trim();
            totalHari = calculateDays(startStr, endStr, /tahunan/i.test(jenisCuti));
            rangeFormatted = formatTanggalRange(startStr, endStr);
        }

        const detailCuti = `${jenisCuti} ${totalHari} hari (${rangeFormatted}) pengajuan ${tglPengajuan}`;

        if (!groupedData[nama]) {
            groupedData[nama] = [];
        }
        groupedData[nama].push(detailCuti);
        totalPengajuanCount++;
    });

    const names = Object.keys(groupedData);
    if (names.length === 0) {
        return { error: "Silakan centang minimal satu item di tabel terlebih dahulu!" };
    }

    // Format teks dengan pengelompokan nama
    const formattedLines = [];
    let index = 1;

    for (const nama in groupedData) {
        const listCuti = groupedData[nama];

        if (listCuti.length === 1) {
            // Jika hanya ada 1 pengajuan untuk nama tersebut
            formattedLines.push(`${index}. ${nama} ${listCuti[0]}`);
        } else {
            // Jika nama yang sama memiliki lebih dari 1 pengajuan
            formattedLines.push(`${index}. ${nama}`);
            listCuti.forEach((cuti) => {
                formattedLines.push(`   - ${cuti}`);
            });
        }
        index++;
    }

    return {
        text: formattedLines.join('\n'),
        count: totalPengajuanCount
    };
}

function splitDateRange(rawTanggal) {
    const parts = String(rawTanggal || '').split(/\s+SD\s+/i);
    const startStr = parts[0] ? parts[0].trim() : '';
    const endStr = parts[1] ? parts[1].trim() : startStr;
    return { startStr, endStr };
}

function formatTanggalSingkat(startStr, endStr) {
    const s = new Date(startStr);
    const e = new Date(endStr);
    if (isNaN(s.getTime())) return startStr || '';
    const eOk = !isNaN(e.getTime());

    if (!eOk || startStr === endStr) {
        return `${s.getDate()} ${BULAN_INDO[s.getMonth()]} ${s.getFullYear()}`;
    }
    if (s.getFullYear() !== e.getFullYear()) {
        return `${s.getDate()} ${BULAN_INDO[s.getMonth()]} ${s.getFullYear()} - ${e.getDate()} ${BULAN_INDO[e.getMonth()]} ${e.getFullYear()}`;
    }
    if (s.getMonth() !== e.getMonth()) {
        return `${s.getDate()} ${BULAN_INDO[s.getMonth()]} - ${e.getDate()} ${BULAN_INDO[e.getMonth()]} ${e.getFullYear()}`;
    }
    return `${s.getDate()} - ${e.getDate()} ${BULAN_INDO[s.getMonth()]} ${s.getFullYear()}`;
}

function jenisTahunan(jenisAwal) {
    const text = String(jenisAwal || '');
    if (/tahunan/i.test(text)) return 'Cuti Tahunan';
    if (/alasan penting/i.test(text)) return 'Cuti Tahunan';
    return '';
}

function extractCheckedList() {
    const trList = document.querySelectorAll('table tbody tr');
    const items = [];

    trList.forEach((tr) => {
        if (!isRowChecked(tr)) return;

        const tds = tr.querySelectorAll('td');
        if (tds.length < 3) return;

        const labelsTd1 = tds[1].querySelectorAll('.label');
        const nama = labelsTd1[0] ? labelsTd1[0].innerText.trim() : '';
        const nipText = labelsTd1[1] ? labelsTd1[1].innerText.trim() : '';
        const nip = (nipText.match(/\d{16,18}/) || [''])[0];

        const labelsTd2 = tds[2].querySelectorAll('.label');
        const rawTanggal = labelsTd2[0] ? labelsTd2[0].innerText.trim() : '';
        const jenisAwalText = labelsTd2[1] ? labelsTd2[1].innerText.trim() : '';
        const keperluan = labelsTd2[2] ? labelsTd2[2].innerText.trim() : '';

        const { startStr, endStr } = splitDateRange(rawTanggal);

        items.push({
            nama,
            nip,
            jenisAwalText,
            jenisTujuan: jenisTahunan(jenisAwalText),
            keperluan,
            tanggalText: formatTanggalSingkat(startStr, endStr)
        });
    });

    return items;
}

// Mendengarkan permintaan dari popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "generateText") {
        sendResponse(extractCheckedData());
        return;
    }

    if (request.action === "ubahStatusList") {
        const items = extractCheckedList();
        if (!items.length) {
            sendResponse({ error: "Silakan centang minimal satu pengajuan cuti di tabel." });
            return;
        }
        sendResponse({ data: items });
        return;
    }

    if (request.action === "ambilBarisTtdOpd") {
        sendResponse({ data: ambilBarisTtdOpd() });
        return;
    }
});

// --- Isi otomatis form "Pemberian Nomor Surat" (penentuan_save) ---
const FILL_KEY = 'apicutiFill';

function delayFill(ms) {
    return new Promise((res) => setTimeout(res, ms));
}

function fillStorageGet(keys) {
    return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
}

function ambilIdForm() {
    const m = location.pathname.match(/pengajuan_tentukan_tanggal\/(\d+)/);
    return m ? m[1] : null;
}

// Baris yang dicentang DAN berstatus "Pemberian Nomor Surat OPD".
function ambilBarisTtdOpd() {
    const trList = document.querySelectorAll('table tbody tr');
    const items = [];

    trList.forEach((tr) => {
        if (!isRowChecked(tr)) return;

        const tds = tr.querySelectorAll('td');
        if (tds.length < 8) return;

        const status = tds[5] ? tds[5].innerText.trim() : '';
        if (!/pemberian nomor surat opd/i.test(status)) return;

        const checkbox = tr.querySelector('input[type="checkbox"][name="id[]"]');
        const id = checkbox ? checkbox.value : '';
        const labelsTd1 = tds[1].querySelectorAll('.label');
        const nama = labelsTd1[0] ? labelsTd1[0].innerText.trim() : '';
        const link = tr.querySelector('a[href*="pengajuan_tentukan_tanggal/"]');

        if (id && link) items.push({ id, nama, url: link.href });
    });

    return items;
}

function setNilaiInput(el, val) {
    if (!el) return;
    el.value = val == null ? '' : String(val);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
}

function isiFormPenentuan(item) {
    const noSurat = document.getElementById('no_surat');
    if (!noSurat) return false;

    setNilaiInput(noSurat, item.no_surat);
    setNilaiInput(document.getElementById('sisa_cuti'), item.sisa_cuti);
    setNilaiInput(document.getElementById('sisa_cuti_n1'), item.sisa_cuti_n1);
    setNilaiInput(document.getElementById('sisa_cuti_n2'), item.sisa_cuti_n2);
    return true;
}

async function jalankanIsiOtomatis() {
    const id = ambilIdForm();
    if (!id) return;

    const res = await fillStorageGet([FILL_KEY]);
    const state = res[FILL_KEY];
    if (!state || state.status !== 'running' || !Array.isArray(state.queue)) return;

    const item = state.queue.find((q) => q.id === id);
    if (!item) return;

    if (!isiFormPenentuan(item)) return;

    await delayFill(700);
    const btn = document.querySelector('.btn_save_back');
    if (btn) btn.click();
}

if (/pengajuan_tentukan_tanggal\/\d+/.test(location.pathname)) {
    jalankanIsiOtomatis();
}
