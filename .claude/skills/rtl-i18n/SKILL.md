---
name: rtl-i18n
description: Persian/English localisation rules — RTL/LTR layout, logical CSS, mixed Latin names, dates, numerals and machine-translation labelling. Use for any UI string or layout change.
---

# RTL / i18n

- Strings live in `src/lib/i18n.tsx` (`en` is the key source; `fa` must have every key — a unit test enforces it).
- `<html lang dir>` is set from the locale; layout uses logical CSS (`margin-inline`, `inset-inline-start`, `text-align: start`). Never hard-code left/right for layout.
- Directional icons (arrows, chevrons) flip with `[dir=rtl] .icon-dir { transform: scaleX(-1) }`.
- Latin product names inside Persian text are wrapped in `<bdi>` or rendered with `unicode-bidi: isolate` so "GPT-5" doesn't scramble.
- Dates use `Intl.DateTimeFormat('fa-IR')` (Persian calendar + Persian digits); archive days stay UTC.
- Translated titles/excerpts come from `article.tr.fa`; always show a "machine translation" label and keep the original title + source link one click away. Missing translation → show English with a label.
