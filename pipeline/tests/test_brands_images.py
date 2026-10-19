from __future__ import annotations

import json

from signal_pipeline.brands import brands_in, primary_brand
from signal_pipeline.images import OG_PER_SOURCE_PER_RUN, ImageStep, from_html, from_media, valid_image_url
from signal_pipeline.pipeline import run
from signal_pipeline.sources import Source

from .helpers import FakeResponse, ok


def src(**kw) -> Source:
    base = dict(id="s", name="S", homepage="https://s.example/", feed="https://s.example/rss", kind="media", tier=2, owner="s", lang="en", category="business", filter="none")
    base.update(kw)
    return Source(**base)  # type: ignore[arg-type]


# --- brands -----------------------------------------------------------------


def test_single_brand_in_title_is_primary():
    assert primary_brand("Anthropic releases Claude 5 with longer context", src()) == "claude"
    assert primary_brand("OpenAI ships GPT-6 to ChatGPT users", src()) == "openai"
    assert primary_brand("Google expands Gemini to Workspace", src()) == "gemini"


def test_incidental_or_multi_brand_mentions_do_not_get_brand_art():
    assert primary_brand("New AI chip startup raises $200M", src()) is None
    assert primary_brand("Claude vs ChatGPT vs Gemini: a benchmark comparison", src()) is None
    assert primary_brand("OpenAI and Anthropic sign safety pledge", src()) is None


def test_lookalike_names_are_not_brands():
    assert brands_in("Jean-Claude Van Damme stars in robot film") == []
    assert brands_in("Claude Monet exhibition uses AI audio guide") == []
    assert brands_in("Gemini exchange lists new crypto token") == []
    assert brands_in("Winklevoss twins' Gemini expands") == []
    assert brands_in("A gemini zodiac app") == []  # case-sensitive: lowercase word is not the product


def test_official_channel_is_primary_unless_headline_is_about_someone_else():
    official = src(brand="claude")
    assert primary_brand("Introducing our new model card format", official) == "claude"
    assert primary_brand("Claude can now use your calendar", official) == "claude"
    assert primary_brand("What we learned studying ChatGPT and Claude usage", official) is None


# --- image extraction -------------------------------------------------------


def test_valid_image_url_rejects_trackers_and_non_http():
    assert valid_image_url("https://cdn.example.com/a.jpg")
    assert not valid_image_url("data:image/png;base64,AAAA")
    assert not valid_image_url("javascript:alert(1)")
    assert not valid_image_url("https://feeds.feedburner.com/~r/x/~4/pixel.gif")
    assert not valid_image_url("https://example.com/1x1.gif")
    assert not valid_image_url("")


def test_from_media_prefers_media_content_then_largest():
    media = [
        {"url": "https://c.example/thumb.jpg", "medium": "image", "width": "300", "source": "media:thumbnail"},
        {"url": "https://c.example/small.jpg", "medium": "image", "width": "400", "source": "media:content"},
        {"url": "https://c.example/big.jpg", "medium": "image", "width": "1600", "source": "media:content"},
        {"url": "https://c.example/clip.mp4", "type": "video/mp4", "source": "media:content"},
        {"url": "https://c.example/tiny.jpg", "medium": "image", "width": "50", "source": "media:content"},
    ]
    assert from_media(media)["url"] == "https://c.example/big.jpg"
    assert from_media([{"url": "https://c.example/v.mp4", "type": "video/mp4", "source": "enclosure"}]) is None


def test_from_html_takes_first_real_image():
    html = '<p>x</p><img src="https://t.example/pixel.gif" width="1"><img src="https://c.example/real.jpg" alt="A robot">'
    assert from_html(html) == {"url": "https://c.example/real.jpg", "alt": "A robot"}
    assert from_html("<p>no images</p>") is None


# --- full runs with the image step -----------------------------------------

OG_PAGE = b"""<html><head><title>x</title>
<meta property="og:image" content="/img/undated-hero.jpg"><meta property="og:image:alt" content="Hero image">
</head><body><img src="https://c.example/body.jpg"></body></html>"""


def _articles(out_dir):
    out = {}
    for f in (out_dir / "days").glob("*.json"):
        for a in json.loads(f.read_text())["articles"]:
            out[a["url"]] = a
    return out


def test_run_assigns_feed_og_brand_and_fallback_images(sources, routes, make_fetcher, out_dir, now):
    routes["https://example.com/news/undated"] = ok(OG_PAGE, "text/html")
    fetcher, transport = make_fetcher(routes)
    step = ImageStep()
    step.attach(fetcher)
    run(out_dir, sources, fetcher, now, enrichers=[step])
    arts = _articles(out_dir)

    nova = arts["https://example.com/news/nova-3"]
    assert nova["image"] == {"url": "https://cdn.example.com/nova3.jpg", "credit": "Fixture Lab", "kind": "feed", "sourceUrl": "https://example.com/feed.xml"}
    assert nova["brand"] is None

    robot = arts["https://example.com/news/robotics-dataset"]
    assert robot["image"]["url"] == "https://cdn.example.com/robot.png"

    undated = arts["https://example.com/news/undated"]
    assert undated["image"] == {"url": "https://example.com/img/undated-hero.jpg", "alt": "Hero image", "kind": "og", "sourceUrl": "https://example.com/news/undated"}

    # OpenAI headline on a third-party site: the brand is recorded, but brand art is off by default,
    # so the story gets its own image (here the category fallback, since the feed has none).
    voice = arts["https://wire.example.org/2026/10/19/openai-voice"]
    assert voice["brand"] == "openai"
    assert voice["image"]["kind"] != "brand"
    assert "sourceImage" not in voice

    # No image anywhere and og:image not allowed for this host: category fallback.
    audit = arts["https://wire.example.org/2026/10/18/ai-audit-rules"]
    assert audit["image"]["kind"] == "fallback"
    assert audit["image"]["url"] == f"images/fallbacks/{audit['category']}.svg"

    # og:image is only fetched for allowlisted sources/hosts, and private working fields never leak.
    page_calls = [c for c in transport.calls if c not in routes or c == "https://example.com/news/undated"]
    assert all(c.startswith("https://example.com/news/") for c in page_calls)
    assert all(not k.startswith("_") for a in arts.values() for k in a)


def test_og_fetches_are_capped_per_source(make_fetcher, sources, now):
    lab = next(s for s in sources if s.id == "lab")
    fetcher, transport = make_fetcher({})
    step = ImageStep()
    step.attach(fetcher)
    new = [
        {"url": f"https://example.com/news/{i}", "sourceId": "lab", "title": "Plain story", "category": "models", "_media": [], "_html": ""}
        for i in range(OG_PER_SOURCE_PER_RUN + 5)
    ]
    step(new, new, {"lab": lab}, now)
    assert len(transport.calls) == OG_PER_SOURCE_PER_RUN
    assert all(a["image"]["kind"] == "fallback" for a in new)  # 404s → fallback


def test_og_disabled_never_fetches_pages(make_fetcher, sources, now):
    lab = next(s for s in sources if s.id == "lab")
    fetcher, transport = make_fetcher({"https://example.com/news/x": ok(OG_PAGE, "text/html")})
    step = ImageStep(og_enabled=False)
    step.attach(fetcher)
    new = [{"url": "https://example.com/news/x", "sourceId": "lab", "title": "Plain", "category": "models", "_media": [], "_html": ""}]
    step(new, new, {"lab": lab}, now)
    assert transport.calls == []
    assert new[0]["image"]["kind"] == "fallback"


def test_og_page_without_image_or_failing_falls_back(make_fetcher, sources, now):
    lab = next(s for s in sources if s.id == "lab")
    fetcher, _ = make_fetcher({
        "https://example.com/news/a": ok(b"<html><head><title>no og</title></head></html>", "text/html"),
        "https://example.com/news/b": FakeResponse(500),
    })
    step = ImageStep()
    step.attach(fetcher)
    new = [
        {"url": f"https://example.com/news/{k}", "sourceId": "lab", "title": "Plain", "category": "models", "_media": [], "_html": ""}
        for k in "ab"
    ]
    step(new, new, {"lab": lab}, now)
    assert [a["image"]["kind"] for a in new] == ["fallback", "fallback"]


def test_brand_art_when_enabled_keeps_the_genuine_image(make_fetcher, sources, now):
    lab = next(s for s in sources if s.id == "lab")
    step = ImageStep(og_enabled=False, brand_art=True)
    a = {"url": "https://example.com/news/x", "sourceId": "lab", "title": "OpenAI ships GPT-6 to ChatGPT users",
         "category": "models", "_media": [{"url": "https://cdn.example.com/gpt6.jpg", "source": "media:content"}], "_html": ""}
    step([a], [a], {"lab": lab}, now)
    assert a["brand"] == "openai"
    assert a["image"]["kind"] == "brand"
    assert a["image"]["url"] == "images/ai-brands/openai-character.webp"
    assert "unofficial" in a["image"]["alt"]
    assert a["sourceImage"]["url"] == "https://cdn.example.com/gpt6.jpg"


def test_turning_brand_art_off_restores_stored_stories(sources, now):
    stored_with_photo = {"brand": "claude", "category": "models",
                         "image": {"url": "images/ai-brands/claude-character.webp", "kind": "brand", "alt": "x"},
                         "sourceImage": {"url": "https://cdn.example.com/c.jpg", "kind": "feed"}}
    stored_without = {"brand": "gemini", "category": "products",
                      "image": {"url": "images/ai-brands/gemini-character.webp", "kind": "brand", "alt": "x"},
                      "sourceImage": None}
    plain = {"brand": None, "category": "research", "image": {"url": "https://cdn.example.com/p.jpg", "kind": "feed"}}
    pool = [stored_with_photo, stored_without, plain]
    ImageStep(brand_art=False)([], pool, {}, now)
    assert stored_with_photo["image"] == {"url": "https://cdn.example.com/c.jpg", "kind": "feed"}
    assert stored_without["image"] == {"url": "images/fallbacks/products.svg", "kind": "fallback"}
    assert all("sourceImage" not in a for a in pool)
    assert plain["image"]["kind"] == "feed"

    # Turning it back on brings the art back and keeps the genuine image alongside.
    ImageStep(brand_art=True)([], pool, {}, now)
    assert stored_with_photo["image"]["kind"] == "brand"
    assert stored_with_photo["sourceImage"]["url"] == "https://cdn.example.com/c.jpg"
    assert stored_without["image"]["kind"] == "brand" and stored_without["sourceImage"] is None
    assert plain["image"]["kind"] == "feed" and "sourceImage" not in plain
