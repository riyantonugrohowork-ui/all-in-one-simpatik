# Taste
- Wants source/reference data kept exactly as copied (verbatim, unchanged); only the derived input field should be editable. Confidence: 0.5
- Prefers inline inputs directly in the table over modal/popup dialogs — no popup: everything editable in place. Confidence: 0.6
- When a field's value is identical across all rows, wants it factored out into a single shared input at the top instead of repeated per row. Confidence: 0.6
- Wants editable input fields to start blank, not pre-filled with default/example values or pre-populated from stored data ("all input fields empty"). Confidence: 0.6
- Wants entered form values persisted automatically as they type (save on input/blur to extension storage), plus a separate explicit "clear all" control — persistence and wiping are separate actions. Confidence: 0.55
- Keep destructive actions narrowly scoped: clearing/deleting on the target site must not wipe locally saved input data — local drafts stay intact unless explicitly told to clear them. Confidence: 0.6
- Wants shared configuration (API base URL, API key, etc.) centralized in one settings location persisted to local storage and consumed by every module that needs it, rather than duplicated fields in each tab. Confidence: 0.5
