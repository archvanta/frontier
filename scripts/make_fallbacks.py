"""Generates the category fallback artwork in public/images/fallbacks/ (abstract, no photos).

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


def svg(cat: str) -> str:
    grid = "".join(f'<path d="M{x} 0V360"/>' for x in range(0, 641, 40)) + "".join(
        f'<path d="M0 {y}H640"/>' for y in range(0, 361, 40)
    )
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" role="img" aria-label="{LABELS[cat]} category artwork">
<defs><radialGradient id="g" cx="78%" cy="40%" r="70%"><stop offset="0" stop-color="#1f2a12"/><stop offset="1" stop-color="#0d0f0e"/></radialGradient></defs>
<rect width="640" height="360" fill="url(#g)"/>
<g stroke="#efeadf" stroke-opacity=".06" stroke-width="1">{grid}</g>
<g transform="translate(390 70) scale(1.1)" fill="none" stroke="#c6ff3d" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">{GLYPHS[cat]}</g>
<rect x="32" y="32" width="10" height="10" fill="#c6ff3d"/>
<text x="52" y="42" fill="#efeadf" fill-opacity=".7" font-family="ui-monospace,Menlo,monospace" font-size="13" letter-spacing="2">SIGNAL AI / CATEGORY</text>
<text x="32" y="318" fill="#efeadf" font-family="Space Grotesk,Inter,system-ui,sans-serif" font-weight="700" font-size="46" letter-spacing="-1">{LABELS[cat]}</text>
</svg>
"""


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for cat in GLYPHS:
        (OUT / f"{cat}.svg").write_text(svg(cat), encoding="utf-8")
    print(f"wrote {len(GLYPHS)} files to {OUT}")


if __name__ == "__main__":
    main()
