# Hero video

> The homepage hero is now the news carousel (`src/components/NewsHero.tsx`). These intro-video files are kept as shipped assets for a possible return of the video, but nothing on the site loads them at the moment.

| File | What it is |
|---|---|
| `signal-ai-intro.mp4` | The user-supplied 10 s intro clip (`gemini_generated_video_11fc5a59.mp4`, 1280×720, 24 fps), re-encoded with ffmpeg: H.264 High, CRF 27, `+faststart`, **audio track removed** (4.96 MB → 1.05 MB). |
| `signal-ai-intro.webm` | Same clip as VP9 (CRF 40, no audio, 0.87 MB) for browsers without H.264. |
| `signal-ai-intro-poster.webp` | Frame at 2.5 s of the real clip, used as poster and as the reduced-motion / small-screen / Save-Data fallback. |

Re-create from the original:
```bash
ffmpeg -i original.mp4 -an -c:v libx264 -profile:v high -pix_fmt yuv420p -preset slow -crf 27 -movflags +faststart -vf scale=1280:720 signal-ai-intro.mp4
ffmpeg -i original.mp4 -an -c:v libvpx-vp9 -b:v 0 -crf 40 -row-mt 1 -vf scale=1280:720 signal-ai-intro.webm
ffmpeg -ss 2.5 -i original.mp4 -frames:v 1 poster.png && convert poster.png -quality 78 signal-ai-intro-poster.webp
```
The two UI-reference videos are **not** site assets and must never be placed here.
