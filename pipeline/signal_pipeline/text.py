"""Turns untrusted feed HTML into short plain text. Nothing from a feed is ever rendered as HTML."""
from __future__ import annotations

import html
import re
from html.parser import HTMLParser

_WS = re.compile(r"\s+")
_SKIP_TAGS = {"script", "style", "noscript", "iframe", "svg", "template", "object", "embed", "form"}
_BLOCK_TAGS = {"p", "br", "div", "li", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "tr", "section", "article"}


class _TextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self.skip = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in _SKIP_TAGS:
            self.skip += 1
        elif tag in _BLOCK_TAGS:
            self.parts.append(" ")

    def handle_endtag(self, tag: str) -> None:
        if tag in _SKIP_TAGS and self.skip:
            self.skip -= 1
        elif tag in _BLOCK_TAGS:
            self.parts.append(" ")

    def handle_data(self, data: str) -> None:
        if not self.skip:
            self.parts.append(data)


def html_to_text(value: str | None) -> str:
    if not value:
        return ""
    parser = _TextExtractor()
    try:
        parser.feed(value)
        parser.close()
        text = "".join(parser.parts)
    except Exception:  # malformed markup: fall back to crude tag stripping
        text = re.sub(r"<[^>]*>", " ", value)
    text = html.unescape(text)
    text = text.replace(" ", " ")
    # Drop control characters (keeps \n\t which collapse below) and stray angle brackets.
    text = "".join(ch for ch in text if ch >= " " or ch in "\n\t")
    return _WS.sub(" ", text).strip()


_BOILERPLATE = [
    re.compile(r"\s*The post .{1,200}? appeared first on .{1,120}?\.?\s*$", re.I),
    re.compile(r"\s*Continue reading\.?\s*$", re.I),
    re.compile(r"\s*Read more\.?\s*$", re.I),
    re.compile(r"\s*\[(?:…|\.\.\.)\]\s*$"),
]


# arXiv feeds put a machine header in front of the abstract and leave TeX commands in it.
_ARXIV_HEADER = re.compile(r"^arXiv:\s*\d{4}\.\d{4,5}(?:v\d+)?\s+Announce Type:\s*\S+\s*(?:Abstract:\s*)?", re.I)
_TEX_COMMAND = re.compile(r"\\[A-Za-z]+\*?\{([^{}]*)\}")
# Some feeds send the alt text of the cover picture as the summary; that describes an image, not the story.
_IMAGE_CAPTION = re.compile(r"^(?:Cover|Hero|Featured|Header|Thumbnail) image\b", re.I)


def tidy_excerpt(text: str) -> str:
    """Drops feed machinery from plain excerpt text; running it again on its own output changes nothing."""
    text = _ARXIV_HEADER.sub("", text).replace("``", "\u201c").replace("''", "\u201d")
    # Nested commands unwrap from the inside out: \\textbf{\\textsc{x}} -> x.
    for _ in range(3):
        text = _TEX_COMMAND.sub(r"\1", text)
    text = text.strip()
    return "" if _IMAGE_CAPTION.match(text) else text


def clean_excerpt(value: str | None, max_chars: int) -> str:
    text = html_to_text(value)
    for pat in _BOILERPLATE:
        text = pat.sub("", text)
    return truncate(tidy_excerpt(text), max_chars)


def truncate(text: str, max_chars: int) -> str:
    if len(text) <= max_chars:
        return text
    cut = text[: max_chars - 1]
    space = cut.rfind(" ")
    if space > max_chars * 0.6:
        cut = cut[:space]
    return cut.rstrip(" ,;:.-—") + "…"
