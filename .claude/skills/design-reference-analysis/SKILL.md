---
name: design-reference-analysis
description: Inspect local UI reference videos/stills with ffprobe/ffmpeg and record observed traits vs assumptions. Use when reference media changes or design direction is questioned.
---

# Design reference analysis

Reference media lives outside Git (`references/`, ignored). Never commit it or extracted frames.

1. `ffprobe -v error -show_entries format=duration:stream=width,height,codec_name -of compact <file>`
2. Extract a contact sheet into an ignored temp dir: `ffmpeg -i <file> -vf "fps=1/5,scale=480:-1,tile=3x3" -frames:v 2 tmp/sheet_%d.jpg`
3. Look at the frames. Write only what you actually saw into `docs/design/reference-analysis.md` under **Observed**; anything inferred goes under **Assumptions**.
4. Map each trait to a concrete token/component decision in `docs/DESIGN-SYSTEM.md`.
5. Do not clone layouts or artwork from references; use them as general art direction.
