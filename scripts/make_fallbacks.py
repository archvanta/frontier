"""Generates the category fallback artwork in public/images/fallbacks/ (abstract, no photos).

Black ground with a soft blue light, a small glass tile and the category glyph in the site's blue accent.
No text in the art: cards crop it freely and already show the category chip.

Run: python3 scripts/make_fallbacks.py
"""
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "public" / "images" / "fallbacks"

# Simple geometric glyphs per category, drawn in a 200x200 box.
GLYPHS = {
    "models": '<rect x="30" y="30" width="140" height="140" rx="6"/><rect x="65" y="65" width="70" height="70"/><path d="M30 100H65M135 100H170M100 30V65M100 135V170"/>',
    "research": '<circle cx="100" cy="100" r="70"/><circle cx="100" cy="100" r="40"/><circle cx="100" cy="100" r="10"/><path d="M100 20V180M20 100H180"/>',
    "products": '<rect x="40" y="25" width="120" height="150" rx="14"/><path d="M40 55H160M80 160H120"/><circle cx="100" cy="105" r="22"/>',
    "business": '<path d="M25 170H175M45 170V110M85 170V80M125 170V95M165 170V45"/><path d="M45 110L85 80L125 95L165 45"/>',
    "policy": '<path d="M100 20L170 50V100C170 140 140 168 100 182C60 168 30 140 30 100V50Z"/><path d="M70 100L92 122L132 78"/>',
    "open-source": '<path d="M70 60L30 100L70 140M130 60L170 100L130 140M115 40L85 160"/>',
    "hardware": '<rect x="55" y="55" width="90" height="90" rx="4"/><rect x="80" y="80" width="40" height="40"/><path d="M75 55V30M100 55V30M125 55V30M75 145V170M100 145V170M125 145V170M55 75H30M55 100H30M55 125H30M145 75H170M145 100H170M145 125H170"/>',
    "safety": '<circle cx="100" cy="100" r="72"/><path d="M100 50V108"/><circle cx="100" cy="138" r="6"/>',
}

LABELS = {
    "models": "MODELS", "research": "RESEARCH", "products": "PRODUCTS", "business": "BUSINESS",
    "policy": "POLICY", "open-source": "OPEN SOURCE", "hardware": "HARDWARE", "safety": "SAFETY",
}


# Per-category lighting: (primary glow, secondary glow), all from the single blue family.
LIGHT = {
    "models": ("#3a6bff", "#9fd0ff"),
    "research": ("#2e6bf0", "#6fb4ff"),
    "products": ("#4a82ff", "#2e6bf0"),
    "business": ("#2f5fe0", "#8cc4ff"),
    "policy": ("#3a6bff", "#5b9dff"),
    "open-source": ("#4f8dff", "#2e6bf0"),
    "hardware": ("#2e6bf0", "#9fd0ff"),
    "safety": ("#3f6ef0", "#6fb4ff"),
}


def svg(cat: str) -> str:
    a, b = LIGHT[cat]
    grid = "".join(f'<path d="M{x} 0V360"/>' for x in range(0, 641, 32)) + "".join(
        f'<path d="M0 {y}H640"/>' for y in range(0, 361, 32)
    )
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" role="img" aria-label="{LABELS[cat]} category artwork">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#030305"/><stop offset=".6" stop-color="#06070c"/><stop offset="1" stop-color="#0a0d1a"/></linearGradient>
<radialGradient id="ga" cx="66%" cy="38%" r="48%"><stop offset="0" stop-color="{a}" stop-opacity=".5"/><stop offset="1" stop-color="{a}" stop-opacity="0"/></radialGradient>
<radialGradient id="gb" cx="22%" cy="88%" r="46%"><stop offset="0" stop-color="{b}" stop-opacity=".32"/><stop offset="1" stop-color="{b}" stop-opacity="0"/></radialGradient>
<radialGradient id="fade" cx="50%" cy="45%" r="62%"><stop offset=".35" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<mask id="m"><rect width="640" height="360" fill="url(#fade)"/></mask>
<linearGradient id="glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset="1" stop-color="#fff" stop-opacity=".03"/></linearGradient>
<linearGradient id="edge" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".45" stop-color="#fff" stop-opacity=".05"/><stop offset="1" stop-color="{b}" stop-opacity=".45"/></linearGradient>
<filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs>
<rect width="640" height="360" fill="url(#bg)"/>
<rect width="640" height="360" fill="url(#ga)"/>
<rect width="640" height="360" fill="url(#gb)"/>
<g stroke="#ffffff" stroke-opacity=".05" stroke-width="1" mask="url(#m)">{grid}</g>
<circle cx="420" cy="150" r="118" fill="none" stroke="#fff" stroke-opacity=".06"/>
<circle cx="420" cy="150" r="160" fill="none" stroke="#fff" stroke-opacity=".035"/>
<rect x="335" y="65" width="170" height="170" rx="40" fill="url(#glass)" stroke="url(#edge)" stroke-width="1.5"/>
<g transform="translate(375 105) scale(.45)" fill="none" stroke="#5b9dff" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)">{GLYPHS[cat]}</g>
</svg>
"""


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for cat in GLYPHS:
        (OUT / f"{cat}.svg").write_text(svg(cat), encoding="utf-8")
    print(f"wrote {len(GLYPHS)} files to {OUT}")


if __name__ == "__main__":
    main()
