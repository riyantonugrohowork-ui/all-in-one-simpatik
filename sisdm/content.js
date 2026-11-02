const delay = ms => new Promise(res => setTimeout(res, ms));

function cleanSpacing(text) {
    return text.replace(/\s+/g, ' ').trim();
}

function splitBrText(cellEl) {
    let html = cellEl.innerHTML;
    return html.split(/<br\s*\/?>/i).map(part => cleanSpacing(part.replace(/<[^>]+>/g, '')));
}

// --- DEEP PARSER 1: Detail Profil Utama (/pegawai/{id}) ---
function parseProfilePage(htmlText) {
    let parser = new DOMParser();
    let doc = parser.parseFromString(htmlText, 'text/html');
    let data = {};

    let profileBox = doc.querySelector('.box-body.box-profile');
    if (profileBox) {
        let paragraphs = profileBox.querySelectorAll('p, h3');
        paragraphs.forEach(p => {
            let txt = cleanSpacing(p.innerText);
            if (txt.includes("Kelas Jabatan :")) {
                let parts = txt.split("Kelas Jabatan :");
                data.jabatan = parts[0].trim();
                data.kelas_jabatan = parts[1] ? parts[1].replace(/[^0-9]/g, '').trim() : "";
            } else if (txt.includes("Usia :")) {
                data.usia = txt.replace("Usia :", "").trim();
            } else if (txt.includes("KGB Selanjutnya :")) {
                data.kgb_selanjutnya = txt.replace("KGB Selanjutnya :", "").trim();
            } else if (txt.includes("BUP/BUT :")) {
                data.bup_but = txt.replace("BUP/BUT :", "").trim();
            } else if (txt.includes("TMT BUP/BUT:")) {
                data.tmt_bup_but = txt.replace(/TMT BUP\/BUT:\s*/, "").split("(")[0].trim();
            } else if (txt.includes("Capaian Bangkom")) {
                let bParts = txt.split(":");
                data.capaian_bangkom = bParts[1] ? bParts[1].trim() : txt;
            }
        });
    }

    let rows = doc.querySelectorAll('table.table tr');
    rows.forEach(row => {
        let th = row.querySelector('th');
        let td = row.querySelector('td');
        if (th && td) {
            let label = cleanSpacing(th.innerText);
            let value = cleanSpacing(td.innerText);

            if (label === "NIP") data.nip = value;
            else if (label === "NIP Lama") data.nip_lama = value;
            else if (label === "Agama") data.agama = value;
            else if (label === "Gender") data.gender = value;
            else if (label === "Status Perkawinan") data.status_perkawinan = value;
            else if (label === "Status Pegawai") data.status_pegawai = value;
            else if (label === "Pendidikan") data.pendidikan = value;
            else if (label === "Tempat, Tanggal Lahir") {
                let parts = value.split(',');
                data.tempat_lahir = parts[0] ? parts[0].trim() : "";
                data.tanggal_lahir = parts[1] ? parts[1].trim() : "";
            } else if (label === "Golongan") {
                let gMatch = value.match(/^([^\(]+)\(TMT\.\s*([^\)]+)\)/);
                if (gMatch) {
                    data.golongan = gMatch[1].trim();
                    data.tmt_golongan = gMatch[2].trim();
                } else {
                    data.golongan = value;
                    data.tmt_golongan = "";
                }
            }
        }
    });

    let addressLink = doc.querySelector('a[href*="pegawai_alamat"]');
    data.address_edit_url = addressLink ? addressLink.href : null;

    return data;
}

// --- DEEP PARSER 2: Riwayat Anak ---
function parseChildrenPage(htmlText) {
    let parser = new DOMParser();
    let doc = parser.parseFromString(htmlText, 'text/html');
    let childrenList = [];

    let rows = doc.querySelectorAll('table tbody tr');
    rows.forEach(row => {
        let cells = row.querySelectorAll('td');
        if (cells.length === 1 && cells[0].innerText.includes("Tidak ada data")) return;

        if (cells.length >= 8) {
            let ttlValue = cleanSpacing(cells[2].innerText);
            let ttlParts = ttlValue.split(',');

            childrenList.push({
                no: cleanSpacing(cells[0].innerText),
                nama_anak: cleanSpacing(cells[1].innerText),
                tempat_lahir_anak: ttlParts[0] ? ttlParts[0].trim() : "",
                tanggal_lahir_anak: ttlParts[1] ? ttlParts[1].trim() : "",
                usia_anak: cleanSpacing(cells[3].innerText),
                tingkat_pendidikan_anak: cleanSpacing(cells[4].innerText),
                hubungan_keluarga_anak: cleanSpacing(cells[5].innerText),
                gender_anak: cleanSpacing(cells[6].innerText),
                tunjangan_anak: cleanSpacing(cells[7].innerText)
            });
        }
    });
    return childrenList;
}

// --- DEEP PARSER: Riwayat Tanda Jasa (Penghargaan) ---
function parseAwardsPage(htmlText) {
    let parser = new DOMParser();
    let doc = parser.parseFromString(htmlText, 'text/html');
    let awardsList = [];

    let rows = doc.querySelectorAll('table tbody tr');
    rows.forEach(row => {
        let cells = row.querySelectorAll('td');
        if (cells.length === 1 && cells[0].innerText.includes("Tidak ada data")) return;

        if (cells.length >= 7) {
            let skParts = splitBrText(cells[1]);

            awardsList.push({
                no: cleanSpacing(cells[0].innerText),
                nomor_sk_penghargaan: skParts[0] || "",
                tanggal_sk_penghargaan: skParts[1] || "",
                jenis_penghargaan: cleanSpacing(cells[2].innerText),
                nama_penghargaan: cleanSpacing(cells[3].innerText),
                peringkat_penghargaan: cleanSpacing(cells[4].innerText),
                asal_perolehan_penghargaan: cleanSpacing(cells[5].innerText),
                file_penghargaan_url: (cells[6].querySelector('a') && cells[6].querySelector('a').href) || null
            });
        }
    });
    return awardsList;
}

// --- DEEP PARSER: Riwayat KGB (Kenaikan Gaji Berkala) ---
function parseKgbPage(htmlText) {
    let parser = new DOMParser();
    let doc = parser.parseFromString(htmlText, 'text/html');
    let kgbData = {};

    // Info card/alert box (TMT Golongan Terakhir + KGB selanjutnya).
    // Ada 2 div.alert-warning; querySelector tunggal sebelumnya cuma ambil box pertama.
    let alertBoxes = doc.querySelectorAll('div.alert-warning h4');
    alertBoxes.forEach(alertH4 => {
        let combined = cleanSpacing(splitBrText(alertH4).filter(p => p).join(' '));
        if (!combined) return;

        if (/TMT Golongan Terakhir/i.test(combined)) {
            let mDate = combined.match(/TMT Golongan Terakhir\s*:?\s*([0-9]{2}-[0-9]{2}-[0-9]{4})/i);
            if (mDate) kgbData.tmt_golongan_terakhir = mDate[1];
            let mMk = combined.match(/Masa Kerja\s*:?\s*([0-9]+\s*Tahun\s*[0-9]+\s*Bulan)/i);
            if (mMk) kgbData.masa_kerja_terakhir = cleanSpacing(mMk[1]);
        }

        if (/Kenaikan Gaji Berkala selanjutnya/i.test(combined)) {
            let mDate = combined.match(/([0-9]{2}-[0-9]{2}-[0-9]{4})/);
            if (mDate) kgbData.kgb_selanjutnya = mDate[1];
            let mMk = combined.match(/Masa Kerja\s*:?\s*([0-9]+\s*tahun\s*[0-9]+\s*bulan)/i);
            if (mMk) kgbData.masa_kerja_saat_kgb = cleanSpacing(mMk[1]);
            let mGaji = combined.match(/Gaji Pokok sebesar\s*:?\s*(Rp\.?\s*[0-9.,]+)/i);
            if (mGaji) kgbData.gaji_pokok_saat_kgb = cleanSpacing(mGaji[1]);
        }
    });

    // Tabel riwayat KGB
    let kgbList = [];
    let rows = doc.querySelectorAll('table tbody tr');
    rows.forEach(row => {
        let cells = row.querySelectorAll('td');
        if (cells.length === 1 && cells[0].innerText.includes("Tidak ada data")) return;

        if (cells.length >= 10) {
            let skParts = splitBrText(cells[1]);
            let fileLink = cells[8].querySelector('a');
            let verifIcon = cells[9].querySelector('i');

            kgbList.push({
                no: cleanSpacing(cells[0].innerText),
                nomor_sk_kgb: skParts[0] || "",
                tanggal_sk_kgb: skParts[1] || "",
                tmt_kgb: cleanSpacing(cells[2].innerText),
                golongan_kgb: cleanSpacing(cells[3].innerText),
                unit_kerja_kgb: cleanSpacing(cells[4].innerText),
                masa_kerja_kgb: cleanSpacing(cells[5].innerText),
                gaji_lama: cleanSpacing(cells[6].innerText),
                gaji_baru: cleanSpacing(cells[7].innerText),
                file_kgb_url: fileLink ? fileLink.href : null,
                verifikasi: verifIcon ? (verifIcon.classList.contains('fa-check') ? "Terverifikasi" : cleanSpacing(verifIcon.innerText) || "Belum") : ""
            });
        }
    });
    kgbData.riwayat_kgb_detail = kgbList;

    return kgbData;
}

// --- DEEP PARSER 3: Form Edit Alamat ---
function parseAddressPage(htmlText) {
    let parser = new DOMParser();
    let doc = parser.parseFromString(htmlText, 'text/html');
    let addressData = {};

    const getInputValue = (id) => {
        let el = doc.getElementById(id);
        return el ? el.value.trim() : "";
    };

    const getSelectedText = (id) => {
        let el = doc.getElementById(id);
        if (!el) return "";
        let optSelected = el.querySelector('option[selected="selected"]') || el.querySelector('option[selected]');
        if (optSelected) return optSelected.innerText.trim();
        return el.options[el.selectedIndex] ? el.options[el.selectedIndex].innerText.trim() : "";
    };

    addressData.jenis_domisili = getSelectedText('jns_rmh');
    addressData.alamat_domisili = getInputValue('almt_pgw');
    addressData.rt_domisili = getInputValue('rt_pgw');
    addressData.rw_domisili = getInputValue('rw_pgw');
    addressData.kode_pos_domisili = getInputValue('kode_pos');
    addressData.provinsi_domisili = getSelectedText('Kd_Prop');
    addressData.kota_domisili = getSelectedText('Kd_Kota');
    addressData.kecamatan_domisili = getSelectedText('Kd_Kec');
    addressData.kelurahan_domisili = getSelectedText('Kd_Kel');

    addressData.alamat_ktp = getInputValue('almt_pgwktp');
    addressData.rt_ktp = getInputValue('rt_pgwktp');
    addressData.rw_ktp = getInputValue('rw_pgwktp');
    addressData.kode_pos_ktp = getInputValue('kode_posktp');
    addressData.provinsi_ktp = getSelectedText('Kd_Propktp');
    addressData.kota_ktp = getSelectedText('Kd_Kotaktp');
    addressData.kecamatan_ktp = getSelectedText('Kd_Kecktp');
    addressData.kelurahan_ktp = getSelectedText('Kd_Kelktp');

    return addressData;
}

// --- DEEP PARSER 4: Form Edit Riwayat Kompetensi (/riwayat_kompetensi/{id}/edit) ---
function parseCompetencyEditForm(htmlText) {
    let parser = new DOMParser();
    let doc = parser.parseFromString(htmlText, 'text/html');
    let data = {};

    const getValById = (id) => {
        let el = doc.getElementById(id);
        return el ? el.value.trim() : "";
    };

    const getValByName = (name) => {
        let el = doc.querySelector(`input[name="${name}"]`);
        return el ? el.value.trim() : "";
    };

    const getSelectedText = (id) => {
        let el = doc.getElementById(id);
        if (!el) return "";
        let optSelected = el.querySelector('option[selected="selected"]') || el.querySelector('option[selected]');
        if (optSelected) return optSelected.innerText.trim();
        return el.options[el.selectedIndex] ? el.options[el.selectedIndex].innerText.trim() : "";
    };

    data.jenis = getSelectedText('jenis');
    data.nomor_sertifikat = getValById('nomor_sertifikat');
    data.tanggal_sertifikat = getValByName('tanggal_sertifikat');
    data.nama_kompetensi = getValById('nama');
    data.penyelenggara = getValById('penyelenggara');
    data.tanggal_mulai = getValById('tanggal_mulai');
    data.tanggal_selesai = getValByName('tanggal_selesai');
    data.jumlah_jam = getValById('jumlah_jam');

    return data;
}

// --- DEEP PARSER 5: Form Edit Riwayat CPNS (/pegawai/{id}/riwayat_cpns/{id}/edit) ---
function parseCpnsEditForm(htmlText) {
    let parser = new DOMParser();
    let doc = parser.parseFromString(htmlText, 'text/html');
    let data = {};

    const getValById = (id) => {
        let el = doc.getElementById(id);
        return el ? el.value.trim() : "";
    };

    const getValByName = (name) => {
        let el = doc.querySelector(`[name="${name}"]`);
        return el ? el.value.trim() : "";
    };

    const getSelectedText = (id) => {
        let el = doc.getElementById(id);
        if (!el) return "";
        let optSelected = el.querySelector('option[selected="selected"]') || el.querySelector('option[selected]');
        if (optSelected) return optSelected.innerText.trim();
        return el.options[el.selectedIndex] ? el.options[el.selectedIndex].innerText.trim() : "";
    };

    data.nomor_sk = getValById('nomor_sk') || getValByName('nomor_sk');
    data.tanggal_sk = getValByName('tanggal_sk');
    data.tmt_sk = getValById('tmt_sk') || getValByName('tmt_sk');
    data.kd_golongan = getValById('kd_golongan');
    data.golongan = getSelectedText('kd_golongan');
    data.jabatan = getValById('jabatan');
    data.unit_kerja = getValById('unit_kerja');
    data.masa_kerja_tahun = getValById('masa_kerja_tahun');
    data.masa_kerja_bulan = getValByName('masa_kerja_bulan');
    data.gaji = getValById('gaji');

    let fileInput = doc.querySelector('input[type="file"][name^="files["]');
    let fileLink = doc.querySelector('a[href*="/preview?filename="]');
    data.file_field_name = fileInput ? fileInput.getAttribute('name') : "";
    data.file_url = fileLink ? fileLink.href : null;

    return data;
}

// --- UTILITY: Ambil Semua URL Link Edit Riwayat CPNS ---
function extractCpnsEditUrls(htmlText) {
    let parser = new DOMParser();
    let doc = parser.parseFromString(htmlText, 'text/html');
    let urls = [];

    let editLinks = doc.querySelectorAll('a[title="Edit"]');
    editLinks.forEach(link => {
        if (link.href && link.href.includes('/riwayat_cpns/') && link.href.includes('/edit')) {
            urls.push(link.href);
        }
    });

    if (urls.length === 0) {
        doc.querySelectorAll('a[href]').forEach(link => {
            if (link.href && link.href.includes('/riwayat_cpns/') && link.href.includes('/edit')) {
                urls.push(link.href);
            }
        });
    }

    return [...new Set(urls)];
}

// --- UTILITY: Ambil Semua URL Link Edit Riwayat PPPK ---
function extractPppkEditUrls(htmlText) {
    let parser = new DOMParser();
    let doc = parser.parseFromString(htmlText, 'text/html');
    let urls = [];

    let editLinks = doc.querySelectorAll('a[title="Edit"]');
    editLinks.forEach(link => {
        if (link.href && link.href.includes('/riwayat_pppk/') && link.href.includes('/edit')) {
            urls.push(link.href);
        }
    });

    if (urls.length === 0) {
        doc.querySelectorAll('a[href]').forEach(link => {
            if (link.href && link.href.includes('/riwayat_pppk/') && link.href.includes('/edit')) {
                urls.push(link.href);
            }
        });
    }

    return [...new Set(urls)];
}

// --- DEEP PARSER 8: Riwayat PPPK (/pegawai/{id}/riwayat_pppk) ---
function parsePppkPage(htmlText) {
    let parser = new DOMParser();
    let doc = parser.parseFromString(htmlText, 'text/html');
    let pppkList = [];

    let rows = doc.querySelectorAll('table tbody tr');
    rows.forEach(row => {
        let cells = row.querySelectorAll('td');
        if (cells.length === 1 && cells[0].innerText.includes("Tidak ada data")) return;

        if (cells.length >= 7) {
            let skParts = splitBrText(cells[1]);
            let fileLink = cells[6].querySelector('a');
            let verifIcon = cells[7] ? cells[7].querySelector('i') : null;

            pppkList.push({
                no: cleanSpacing(cells[0].innerText),
                nomor_sk_pppk: skParts[0] || "",
                tanggal_sk_pppk: skParts[1] || "",
                tmt_sk_pppk: cleanSpacing(cells[2].innerText),
                golongan_pppk: cleanSpacing(cells[3].innerText),
                jabatan_pppk: cleanSpacing(cells[4].innerText),
                unit_kerja_pppk: cleanSpacing(cells[5].innerText),
                file_pppk_url: fileLink ? fileLink.href : null,
                verifikasi: verifIcon ? (verifIcon.classList.contains('fa-check') ? "Terverifikasi" : (verifIcon.classList.contains('fa-question') ? "Belum" : cleanSpacing(verifIcon.innerText) || "")) : ""
            });
        }
    });
    return pppkList;
}

// --- DEEP PARSER 9: Form Edit Riwayat PPPK (/pegawai/{id}/riwayat_pppk/{id}/edit) ---
function parsePppkEditForm(htmlText) {
    let parser = new DOMParser();
    let doc = parser.parseFromString(htmlText, 'text/html');
    let data = {};

    const getValById = (id) => {
        let el = doc.getElementById(id);
        return el ? el.value.trim() : "";
    };

    const getValByName = (name) => {
        let el = doc.querySelector(`[name="${name}"]`);
        return el ? el.value.trim() : "";
    };

    const getSelectedText = (id) => {
        let el = doc.getElementById(id);
        if (!el) return "";
        let optSelected = el.querySelector('option[selected="selected"]') || el.querySelector('option[selected]');
        if (optSelected) return optSelected.innerText.trim();
        return el.options[el.selectedIndex] ? el.options[el.selectedIndex].innerText.trim() : "";
    };

    let allInputs = {};
    doc.querySelectorAll('input[name], select[name], textarea[name]').forEach(el => {
        let name = el.getAttribute('name');
        if (name === '_token' || name === '_method') return;
        if (el.tagName === 'SELECT') {
            allInputs[name] = getSelectedText(el.id) || el.value.trim();
        } else {
            allInputs[name] = el.value.trim();
        }
    });
    data.fields = allInputs;

    data.nomor_sk = getValById('nomor_sk') || getValByName('nomor_sk');
    data.tanggal_sk = getValByName('tanggal_sk');
    data.tmt_sk = getValById('tmt_sk') || getValByName('tmt_sk') || getValByName('tmt');
    data.golongan = getValById('golongan') || getValByName('golongan') || getSelectedText('golongan') || getSelectedText('kd_golongan');
    data.jabatan = getValById('jabatan') || getValByName('jabatan');
    data.unit_kerja = getValById('unit_kerja') || getValByName('unit_kerja');

    let fileInput = doc.querySelector('input[type="file"][name^="files["]');
    let fileLink = doc.querySelector('a[href*="/preview?filename="]');
    data.file_field_name = fileInput ? fileInput.getAttribute('name') : "";
    data.file_url = fileLink ? fileLink.href : null;

    return data;
}

// --- UTILITY: Ambil Semua URL Link Edit Riwayat Jabatan ---
function extractJabatanEditUrls(htmlText) {
    let parser = new DOMParser();
    let doc = parser.parseFromString(htmlText, 'text/html');
    let urls = [];

    let editLinks = doc.querySelectorAll('a[href*="/riwayat_jabatan/"][href*="/edit"]');
    editLinks.forEach(link => {
        if (link.href) urls.push(link.href);
    });

    return urls;
}

// --- DEEP PARSER 6: Riwayat Jabatan (/pegawai/{id}/riwayat_jabatan) ---
function parseJabatanPage(htmlText) {
    let parser = new DOMParser();
    let doc = parser.parseFromString(htmlText, 'text/html');
    let jabatanList = [];

    let rows = doc.querySelectorAll('table tbody tr');
    rows.forEach(row => {
        let cells = row.querySelectorAll('td');
        if (cells.length === 1 && cells[0].innerText.includes("Tidak ada data")) return;

        if (cells.length >= 8) {
            let skParts = splitBrText(cells[5]);
            let fileLink = cells[7].querySelector('a');
            let verifIcon = cells[8] ? cells[8].querySelector('i') : null;

            jabatanList.push({
                no: cleanSpacing(cells[0].innerText),
                jenis_jabatan: cleanSpacing(cells[1].innerText),
                jabatan_baru: cleanSpacing(cells[2].innerText),
                unit_kerja: cleanSpacing(cells[3].innerText),
                opd: cleanSpacing(cells[4].innerText),
                nomor_sk_jabatan: skParts[0] || "",
                tanggal_sk_jabatan: skParts[1] || "",
                tmt_sk_jabatan: cells[6] ? cleanSpacing(cells[6].innerText) : "",
                file_jabatan_url: fileLink ? fileLink.href : null,
                verifikasi: verifIcon ? (verifIcon.classList.contains('fa-check') ? "Terverifikasi" : (verifIcon.classList.contains('fa-question') ? "Belum" : cleanSpacing(verifIcon.innerText) || "")) : ""
            });
        }
    });
    return jabatanList;
}

// --- DEEP PARSER 7: Form Edit Riwayat Jabatan (/pegawai/{id}/riwayat_jabatan/{id}/edit) ---
function parseJabatanEditForm(htmlText) {
    let parser = new DOMParser();
    let doc = parser.parseFromString(htmlText, 'text/html');
    let data = {};

    const getValById = (id) => {
        let el = doc.getElementById(id);
        return el ? el.value.trim() : "";
    };

    const getValByName = (name) => {
        let el = doc.querySelector(`[name="${name}"]`);
        return el ? el.value.trim() : "";
    };

    const getSelectedText = (id) => {
        let el = doc.getElementById(id);
        if (!el) return "";
        let optSelected = el.querySelector('option[selected="selected"]') || el.querySelector('option[selected]');
        if (optSelected) return optSelected.innerText.trim();
        return el.options[el.selectedIndex] ? el.options[el.selectedIndex].innerText.trim() : "";
    };

    let allInputs = {};
    doc.querySelectorAll('input[name], select[name], textarea[name]').forEach(el => {
        let name = el.getAttribute('name');
        if (name === '_token' || name === '_method') return;
        if (el.tagName === 'SELECT') {
            allInputs[name] = getSelectedText(el.id) || el.value.trim();
        } else {
            allInputs[name] = el.value.trim();
        }
    });
    data.fields = allInputs;

    data.jenis_jabatan = getSelectedText('jenis_jabatan') || getSelectedText('jenis');
    data.nomor_sk = getValById('nomor_sk') || getValByName('nomor_sk');
    data.tmt_sk = getValById('tmt_sk') || getValByName('tmt_sk');
    data.jabatan = getValById('jabatan') || getValByName('jabatan');
    data.unit_kerja = getValById('unit_kerja') || getValByName('unit_kerja');

    let fileInput = doc.querySelector('input[type="file"][name^="files["]');
    let fileLink = doc.querySelector('a[href*="/preview?filename="]');
    data.file_field_name = fileInput ? fileInput.getAttribute('name') : "";
    data.file_url = fileLink ? fileLink.href : null;

    return data;
}

// --- DEEP PARSER 10: Riwayat Pangkat (/pegawai/{id}/riwayat_pangkat) ---
function parsePangkatPage(htmlText) {
    let parser = new DOMParser();
    let doc = parser.parseFromString(htmlText, 'text/html');
    let pangkatList = [];

    let rows = doc.querySelectorAll('table tbody tr');
    rows.forEach(row => {
        let cells = row.querySelectorAll('td');
        if (cells.length === 1 && cells[0].innerText.includes("Tidak ada data")) return;

        if (cells.length >= 11) {
            let skParts = splitBrText(cells[3]);
            let masaKerjaText = cleanSpacing(cells[5].innerText);
            let masaTahun = masaKerjaText.match(/(\d+)\s*tahun/i);
            let masaBulan = masaKerjaText.match(/(\d+)\s*bulan/i);
            let fileLink = cells[8].querySelector('a');
            let verifIcon = cells[9] ? cells[9].querySelector('i') : null;

            pangkatList.push({
                no: cleanSpacing(cells[0].innerText),
                pangkat: cleanSpacing(cells[1].innerText),
                golongan: cleanSpacing(cells[2].innerText),
                nomor_sk_pangkat: skParts[0] || "",
                tanggal_sk_pangkat: skParts[1] || "",
                tmt_sk_pangkat: cleanSpacing(cells[4].innerText),
                masa_kerja_tahun: masaTahun ? masaTahun[1] : "",
                masa_kerja_bulan: masaBulan ? masaBulan[1] : "",
                jenis_kenaikan_pangkat: cleanSpacing(cells[6].innerText),
                siasn: cleanSpacing(cells[7].innerText),
                file_pangkat_url: fileLink ? fileLink.href : null,
                verifikasi: verifIcon ? (verifIcon.classList.contains('fa-check') ? "Terverifikasi" : (verifIcon.classList.contains('fa-question') ? "Belum" : cleanSpacing(verifIcon.innerText) || "")) : ""
            });
        }
    });
    return pangkatList;
}

// --- UTILITY: Ambil Semua URL Link Edit Riwayat Pangkat ---
function extractPangkatEditUrls(htmlText) {
    let parser = new DOMParser();
    let doc = parser.parseFromString(htmlText, 'text/html');
    let urls = [];

    doc.querySelectorAll('a[href]').forEach(link => {
        if (link.href && link.href.includes('/riwayat_pangkat/') && link.href.includes('/edit')) {
            urls.push(link.href);
        }
    });

    return [...new Set(urls)];
}

// --- UTILITY: Ambil Semua URL Link Edit dari Daftar Riwayat Kompetensi ---
function extractCompetencyEditUrls(htmlText) {
    let parser = new DOMParser();
    let doc = parser.parseFromString(htmlText, 'text/html');
    let urls = [];

    let editLinks = doc.querySelectorAll('a[href*="/riwayat_kompetensi/"][href*="/edit"]');
    editLinks.forEach(link => {
        if (link.href) urls.push(link.href);
    });

    return urls;
}

function waitForTableToLoad(oldFirstNip) {
    return new Promise((resolve) => {
        let attempts = 0;
        let interval = setInterval(() => {
            attempts++;
            let currentRows = document.querySelectorAll('#pegawai-table tbody tr');
            let currentFirstNip = currentRows[0] ? currentRows[0].cells[1].innerText.trim() : '';
            if (currentFirstNip !== oldFirstNip || currentRows.length === 0) {
                clearInterval(interval);
                resolve(true);
            }
            if (attempts > 30) {
                clearInterval(interval);
                resolve(false);
            }
        }, 500);
    });
}

async function getStorageData(keys) {
    return new Promise((resolve) => {
        chrome.storage.local.get(keys, (res) => resolve(res));
    });
}

async function setStorageData(dataObj) {
    return new Promise((resolve) => {
        chrome.storage.local.set(dataObj, () => resolve());
    });
}

async function startScrapingLoop() {
    let loopRows = document.querySelectorAll('#pegawai-table tbody tr');
    if (loopRows.length === 0) {
        await setStorageData({ status: 'paused', lastLog: "Tabel pegawai tidak ditemukan. Pastikan tab terbuka di halaman daftar pegawai (https://sisdm.semarangkota.go.id/pegawai)." });
        return;
    }

    while (true) {
        let state = await getStorageData(['status', 'data', 'processedNips']);
        if (state.status !== 'running') break;

        let rows = document.querySelectorAll('#pegawai-table tbody tr');
        if (rows.length === 1 && rows[0].innerText.includes('Loading')) {
            await delay(1000);
            continue;
        }

        let pageFinished = true;

        for (let row of rows) {
            let freshState = await getStorageData(['status', 'data', 'processedNips']);
            if (freshState.status !== 'running') {
                pageFinished = false;
                break;
            }

            let kedudukan = row.cells[11] ? row.cells[11].innerText.trim() : '';
            if (kedudukan !== "Aktif") continue;

            let detailLinkEl = row.querySelector('a[href*="/pegawai/"][title="Lihat"]');
            let nipCell = row.cells[1];
            if (!detailLinkEl || !nipCell) continue;

            let nip = nipCell.innerText.trim();
            let processedNips = freshState.processedNips || {};

            if (processedNips[nip]) continue;

            let parentMetadata = {
                nip_tabel_utama: nip,
                nama_tabel_utama: row.cells[2] ? row.cells[2].innerText.trim() : '',
                pangkat_tabel_utama: row.cells[4] ? row.cells[4].innerText.trim() : ''
            };

            await setStorageData({ lastLog: `Deep Fetching Profil: ${parentMetadata.nama_tabel_utama}...` });

            try {
                let profileUrl = detailLinkEl.href;

                // STEP 1: Fetch Profile Utama
                let resProfile = await fetch(profileUrl);
                let htmlProfile = await resProfile.text();
                let parsedProfile = parseProfilePage(htmlProfile);

                // STEP 2: Fetch Riwayat Anak
                let childrenUrl = profileUrl.replace(/\/$/, "") + "/riwayat_anak";
                let resChildren = await fetch(childrenUrl);
                let htmlChildren = await resChildren.text();
                let parsedChildrenList = parseChildrenPage(htmlChildren);

                // STEP 3: Fetch Form Edit Alamat (Jika Link Ditemukan)
                let parsedAddress = {};
                if (parsedProfile.address_edit_url) {
                    let resAddress = await fetch(parsedProfile.address_edit_url);
                    let htmlAddress = await resAddress.text();
                    parsedAddress = parseAddressPage(htmlAddress);
                }
                delete parsedProfile.address_edit_url;

                // STEP 4: Fetch Riwayat Tanda Jasa (Penghargaan)
                let awardsUrl = profileUrl.replace(/\/$/, "") + "/riwayat_tanda_jasa";
                let resAwards = await fetch(awardsUrl);
                let htmlAwards = await resAwards.text();
                let parsedAwards = parseAwardsPage(htmlAwards);

                // STEP 5: Fetch Riwayat KGB (PNS / CPNS, bukan PPPK)
                let parsedKgb = {};
                let statusKgbUpper = (parsedProfile.status_pegawai || "").toUpperCase();
                if (!statusKgbUpper.includes("PPPK")) {
                    let kgbUrl = profileUrl.replace(/\/$/, "") + "/riwayat_kgb";
                    let resKgb = await fetch(kgbUrl);
                    let htmlKgb = await resKgb.text();
                    parsedKgb = parseKgbPage(htmlKgb);
                    await delay(300);
                }

                // STEP 6: Fetch Riwayat Kompetensi & Setiap Detail Form Editnya
                let competencyList = [];
                let competencyListUrl = profileUrl.replace(/\/$/, "") + "/riwayat_kompetensi";
                let resCompList = await fetch(competencyListUrl);
                let htmlCompList = await resCompList.text();

                let editUrls = extractCompetencyEditUrls(htmlCompList);
                for (let editUrl of editUrls) {
                    let resEditForm = await fetch(editUrl);
                    let htmlEditForm = await resEditForm.text();
                    let formRecord = parseCompetencyEditForm(htmlEditForm);
                    competencyList.push(formRecord);
                    await delay(300); // Jedag-jedug tipis antarequest form
                }

                // STEP 7: Fetch Riwayat CPNS & Setiap Detail Form Editnya
                let cpnsList = [];
                let cpnsListUrl = profileUrl.replace(/\/$/, "") + "/riwayat_cpns";
                let resCpnsList = await fetch(cpnsListUrl);
                let htmlCpnsList = await resCpnsList.text();

                let cpnsEditUrls = extractCpnsEditUrls(htmlCpnsList);
                if (cpnsEditUrls.length === 0) {
                    // Fallback: halaman riwayat_cpns langsung berisi form (tanpa link edit)
                    let embedded = parseCpnsEditForm(htmlCpnsList);
                    if (embedded.nomor_sk || embedded.tmt_sk) cpnsList.push(embedded);
                }
                for (let editUrl of cpnsEditUrls) {
                    let resEditForm = await fetch(editUrl);
                    let htmlEditForm = await resEditForm.text();
                    cpnsList.push(parseCpnsEditForm(htmlEditForm));
                    await delay(300);
                }

                // STEP 8: Fetch Riwayat Jabatan & Setiap Detail Form Editnya
                let jabatanList = [];
                let jabatanListUrl = profileUrl.replace(/\/$/, "") + "/riwayat_jabatan";
                let resJabatanList = await fetch(jabatanListUrl);
                let htmlJabatanList = await resJabatanList.text();
                let parsedJabatanTable = parseJabatanPage(htmlJabatanList);

                let jabatanEditUrls = extractJabatanEditUrls(htmlJabatanList);
                let jabatanDetailList = [];
                for (let editUrl of jabatanEditUrls) {
                    let resEditForm = await fetch(editUrl);
                    let htmlEditForm = await resEditForm.text();
                    jabatanDetailList.push(parseJabatanEditForm(htmlEditForm));
                    await delay(300);
                }

                // STEP 9: Fetch Riwayat Pangkat (hanya untuk CPNS/PNS, bukan PPPK)
                let pangkatList = [];
                let statusPegawaiUpper = (parsedProfile.status_pegawai || "").toUpperCase();
                if (!statusPegawaiUpper.includes("PPPK")) {
                    let pangkatListUrl = profileUrl.replace(/\/$/, "") + "/riwayat_pangkat";
                    let resPangkatList = await fetch(pangkatListUrl);
                    let htmlPangkatList = await resPangkatList.text();
                    pangkatList = parsePangkatPage(htmlPangkatList);
                }

                // STEP 10: Fetch Riwayat PPPK (hanya untuk PPPK/PPPK Paruh Waktu)
                let pppkList = [];
                let pppkDetailList = [];
                let statusUpper = (parsedProfile.status_pegawai || "").toUpperCase();
                if (statusUpper.includes("PPPK")) {
                    let pppkListUrl = profileUrl.replace(/\/$/, "") + "/riwayat_pppk";
                    let resPppkList = await fetch(pppkListUrl);
                    let htmlPppkList = await resPppkList.text();
                    pppkList = parsePppkPage(htmlPppkList);

                    let pppkEditUrls = extractPppkEditUrls(htmlPppkList);
                    for (let editUrl of pppkEditUrls) {
                        let resEditForm = await fetch(editUrl);
                        let htmlEditForm = await resEditForm.text();
                        pppkDetailList.push(parsePppkEditForm(htmlEditForm));
                        await delay(300);
                    }
                }

                let finalCompleteRecord = {
                    data_tabel_utama: parentMetadata,
                    detail_profil: parsedProfile,
                    riwayat_anak: parsedChildrenList,
                    data_alamat: parsedAddress,
                    riwayat_penghargaan: parsedAwards,
                    riwayat_kgb: parsedKgb,
                    riwayat_kompetensi: competencyList,
                    riwayat_cpns: cpnsList,
                    riwayat_jabatan: parsedJabatanTable,
                    riwayat_jabatan_detail: jabatanDetailList,
                    riwayat_pangkat: pangkatList,
                    riwayat_pppk: pppkList,
                    riwayat_pppk_detail: pppkDetailList,
                    sumber_url: profileUrl
                };

                let currentData = freshState.data || [];
                currentData.push(finalCompleteRecord);
                processedNips[nip] = true;

                await setStorageData({ data: currentData, processedNips: processedNips });
                await delay(1200);
            } catch (err) {
                console.error(`Gagal memproses NIP ${nip}:`, err);
            }
        }

        let postLoopState = await getStorageData(['status']);
        if (postLoopState.status !== 'running') break;

        if (pageFinished) {
            let nextButton = document.querySelector('#pegawai-table_next');
            if (nextButton && !nextButton.classList.contains('disabled')) {
                let nextLink = nextButton.querySelector('a');
                if (nextLink) {
                    await setStorageData({ lastLog: "Berpindah halaman tabel utama..." });
                    let firstNipBefore = rows[0] ? rows[0].cells[1].innerText.trim() : '';
                    nextLink.click();

                    let success = await waitForTableToLoad(firstNipBefore);
                    if (!success) {
                        await setStorageData({ status: 'paused', lastLog: "Gagal memuat halaman baru." });
                        break;
                    }
                } else {
                    break;
                }
            } else {
                await setStorageData({ status: 'idle', lastLog: "Selesai! Seluruh data pegawai Aktif berhasil dihimpun." });
                break;
            }
        }
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'start') {
        startScrapingLoop();
    }
    sendResponse({ received: true });
});

chrome.storage.local.get(['status'], (res) => {
    if (res.status === 'running') {
        startScrapingLoop();
    }
});