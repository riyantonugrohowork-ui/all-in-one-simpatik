# AGENTS.md

Unpacked Chrome MV3 extension (no build step, no package.json, no tests). Load via `chrome://extensions` -> Developer mode -> Load unpacked -> this folder. After editing any module's `content.js` or `popup.js`, click the reload icon on the extension card (and refresh the target tab for content.js changes) to pick up changes.

## Structure
Single all-in-one extension. Root `manifest.json` + `popup.html`/`popup.js` render a tab bar; each tab iframes that module's own `popup.html` under a subfolder. Each module keeps its own `manifest.json` for reference but is NOT loaded as a separate extension.

- `manifest.json` — combined MV3 config. Registers background worker, combined popup, all content scripts, and host_permissions for all modules.
- `popup.html` / `popup.js` — root tab shell. Lazily sets each iframe `src` on first tab click, resizes iframe to content height, sets body width to the tab's `data-w`. Tabs: SISDM, E-Cuti, API Cuti, Ubah Cuti, Absen, Rekap Absen, Rekap Data Dukung TPP, e-Kinerja, MYASN, SKP Kadis Rencana Aksi, SKP Kadis Data Dukung, Setting.
- `sisdm/` — SISDM pegawai deep scraper (`content.js` on `sisdm.semarangkota.go.id/pegawai*`). Loop state in `chrome.storage.local` (`status`, `data`, `processedNips`).
- `ecuti/` — E-Cuti konsep surat generator (`content.js` on `e-cuti.semarangkota.go.id`). Popup reads checked rows via `tabs.sendMessage({action:'generateText'})`.
- `absen/` — rekap absen auto-download (`content.js` on `absen.semarangkota.go.id/presensi/rekap-bulanan/asn/*`). State key `rekapProgress`.
- `rekapabsen/` — rekap absen scrape → API (`content.js` on the same page). Opens each pegawai's Rekap modal, scrapes `#rekap_bulanan`, `.rb-summary`, and `#rekap_datadukung` tokens, then asks the service worker to POST to `/rekap-absen`. State key `rekapAbsenProgress`; message actions prefixed `rekapAbsen`. Clear (`rekapAbsenReset`) wipes progress, and Start navigates back to page 1 before processing.
- `datadukung/` — Rekap Data Dukung TPP scrape → API (`content.js` on `tpp.semarangkota.go.id/izin*`). Scrapes tabel "Data Pegawai Tidak Masuk Kerja" per halaman, lalu POST batch ke `/data-dukung-tpp` via service worker (`kirimDataDukungTpp`). State key `dataDukungTppProgress`; message actions prefixed `dataDukungTpp`. Pagination causes full page reload; content script auto-continues via storage flag. `processedIds` keyed by `id_tpp` (dari link edit).
- `ekinerja/` — e-Kinerja bulk input. `background.js` is the shared service worker (`startInsert` queue). Popup + `popup.css`/`popup.js`. Storage key `riwayat`.
- `myasn/` — MYASN bukti dukung auto-fill. Popup injects `myasn/content.js` via `chrome.scripting.executeScript({files:['myasn/content.js']})`. Config key `myasnConfig`.
- `settings/` — shared API settings. Saves `apiConfig` (`{baseUrl, apiKey}`) to `chrome.storage.local`; every tab that calls the external API reads it (currently `apicuti/`). Saving requests `optional_host_permissions` for the entered origin.

## Behavior quirks (easy to break)
- Root popup is a shell only. Cross-tab messaging uses `chrome.tabs.query({active:true, currentWindow:true})`, which resolves to the browser's active tab — same as when each module was standalone.
- MyASN inject path is `myasn/content.js` (relative to extension root) because `executeScript` resolves from the extension root, not the popup folder.
- SISDM `startScrapingLoop` re-checks `chrome.storage.local` status inside the row loop on every iteration — this is how pause/stop work. Don't replace with a one-shot flag.
- SISDM only processes rows where column index 11 (`kedudukan`) === `"Aktif"`; others silently skipped.
- SISDM `processedNips` is a dedup map keyed by NIP (col index 1). `btn-clear` is the only reset.
- SISDM pagination clicks `#pegawai-table_next` and polls `waitForTableToLoad` (max 30 x 500ms); on timeout status forced to `paused`.
- Deliberate throttling in scrapers/automation — keep it; these hit live government portals.
- Downloaded JSON (SISDM): single record as object `{}`, multiple as array `[]` — intentional.
- Each module popup uses `width:100%` + `box-sizing:border-box` so it fills its iframe; root `popup.js` sets the shell width per tab.
- API Base URL/Key live only in the Setting tab (`apiConfig`). `apicuti/popup.js` mirrors it via a `chrome.storage.onChanged` listener; `rekapabsen` sends API requests through `ekinerja/background.js` (`kirimRekapAbsen`), which reads `apiConfig` itself. Don't reintroduce per-tab key/URL inputs.
- `absen/` and `rekapabsen/` content scripts both run on the same rekap-bulanan page. Keep their storage keys and message actions distinct (`start`/`stop` vs `rekapAbsenStart`/`rekapAbsenStop`); the old Absen tab is download-only, Rekap Absen posts to the API.

## Conventions
- Indonesian strings/field names throughout (UI text, logs, JSON keys) — keep new fields/log messages in Indonesian.
- No linter/formatter/test runner configured. Verify manually by loading the extension and testing against the live portals.
