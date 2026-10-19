---
name: image-attribution
description: How SIGNAL AI chooses, attributes and falls back for story images, including the fixed Claude/OpenAI/Gemini character art. Use when touching images.py or image components.
---

# Images and attribution

Order of preference per story:
1. **Brand art** (only while `BRAND_ART_ENABLED` in `config.py` is on — currently **off** by the owner's request; brand stories then use steps 2–4 and the next run restores stored stories) when the story's *primary* subject is Claude/Anthropic, OpenAI, or Gemini (title-level or official-source rule in `brands.py`) → `images/ai-brands/<brand>-character.webp`. Keep the genuine source image in `sourceImage`.
2. **Feed image**: `media:content`, `media:thumbnail`, image `enclosure`, or the first `<img>` in the feed HTML.
3. **og:image** from the article page, only for hosts in the source's `og_hosts`, new items only, 8 s timeout, 512 KB cap.
4. **Category fallback** SVG in `public/images/fallbacks/`.

Rules: never generate images; never present the character art as a news photo or an official mascot (UI labels it "Unofficial editorial illustration"); store `credit`/`alt`/`sourceUrl` separately; hotlink with `referrerPolicy="no-referrer"` and `loading="lazy"`; on load error swap to the category fallback.
