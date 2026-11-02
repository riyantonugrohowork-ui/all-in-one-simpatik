# AGENTS.md

Unpacked Chrome MV3 extension (no build step, no package.json, no tests). Load via `chrome://extensions` -> Developer mode -> Load unpacked -> this folder. After editing any module's `content.js` or `popup.js`, click the reload icon on the extension card (and refresh the target tab for content.js changes) to pick up changes.

## Structure
Single all-in-one extension. Root `manifest.json` + `popup.html`/`popup.js` render a tab bar; each tab iframes that module's own `popup.html` under a subfolder. Each module keeps its own `manifest.json` for reference but is NOT loaded as a separate extension.

- `manifest.json` — combined MV3 config. Registers background worker, combined popup, all content scripts, and host_permissions for all modules.
- `popup.html` / `popup.js` — root tab shell. Lazily sets each iframe `src` on first tab click, resizes iframe to content height, sets body width to the tab's `data-w`. Tabs: SISDM, E-Cuti, Absen, e-Kinerja, MYASN.
- `sisdm/` — SISDM pegawai deep scraper (`content.js` on `sisdm.semarangkota.go.id/pegawai*`). Loop state in `chrome.storage.local` (`status`, `data`, `processedNips`).
- `ecuti/` — E-Cuti konsep surat generator (`content.js` on `e-cuti.semarangkota.go.id`). Popup reads checked rows via `tabs.sendMessage({action:'generateText'})`.
- `absen/` — rekap absen auto-download (`content.js` on `absen.semarangkota.go.id/presensi/rekap-bulanan/asn/*`). State key `rekapProgress`.
- `ekinerja/` — e-Kinerja bulk input. `background.js` is the shared service worker (`startInsert` queue). Popup + `popup.css`/`popup.js`. Storage key `riwayat`.
- `myasn/` — MYASN bukti dukung auto-fill. Popup injects `myasn/content.js` via `chrome.scripting.executeScript({files:['myasn/content.js']})`. Config key `myasnConfig`.

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

## Conventions
- Indonesian strings/field names throughout (UI text, logs, JSON keys) — keep new fields/log messages in Indonesian.
- No linter/formatter/test runner configured. Verify manually by loading the extension and testing against the live portals.
