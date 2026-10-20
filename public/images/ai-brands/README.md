# Brand character artwork

Original editorial illustrations supplied by the site owner (generated with Google Gemini). They are **unofficial** artwork — not Anthropic, OpenAI or Google mascots, and not endorsed by them. The UI labels them "Unofficial editorial illustration".

| File | Used for | Source upload |
|---|---|---|
| `claude-character.webp` | Stories whose primary subject is Claude / Anthropic | `Gemini_Generated_Image_bxhrry….jpeg` (2048² → 800², WebP q80) |
| `openai-character.webp` | Stories whose primary subject is OpenAI (ChatGPT, GPT, Sora, …) | `Gemini_Generated_Image_v14n6a….jpeg` |
| `gemini-character.webp` | Stories whose primary subject is Google Gemini | `Gemini_Generated_Image_ddghce….jpeg` |

To replace one, keep the exact filename (square, ≥ 800 px, WebP). The mapping lives in `pipeline/signal_pipeline/brands.py`; if a file is missing the card falls back to the category artwork. Never generate images per story.

The same three files are the company filter on the AI Games page (`#/ai-games`), where they are shown with the "Unofficial editorial illustration" note. The tall poster used in that page's hero is `public/images/games/ai-games-poster.webp` (from `Gemini_Generated_Image_pci85j…jpeg`, 1376×3072 → 900×2009, WebP q78).
