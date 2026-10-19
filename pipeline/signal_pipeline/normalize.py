"""Canonical URLs, stable ids, dates, categories and entities."""
from __future__ import annotations

import calendar
import hashlib
import re
import time
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from . import config

TRACKING_PARAMS = re.compile(r"^(utm_.*|fbclid|gclid|dclid|mc_cid|mc_eid|ref|ref_src|cmpid|ncid|guccounter|guce_.*|_hsenc|_hsmi|soc_src|soc_trk|taid|sr_share|smid|cid)$", re.I)


def canonical_url(url: str) -> str:
    """Lowercase scheme/host, drop default ports, fragments, tracking params and trailing slashes."""
    parts = urlsplit(url.strip())
    scheme = (parts.scheme or "https").lower()
    if scheme not in ("http", "https"):
        raise ValueError(f"unsupported scheme: {scheme}")
    host = (parts.hostname or "").lower()
    if not host:
        raise ValueError("missing host")
    port = parts.port
    netloc = host if port in (None, 80, 443) else f"{host}:{port}"
    query = urlencode(sorted((k, v) for k, v in parse_qsl(parts.query, keep_blank_values=False) if not TRACKING_PARAMS.match(k)))
    path = re.sub(r"/{2,}", "/", parts.path or "/")
    if len(path) > 1:
        path = path.rstrip("/")
    return urlunsplit((scheme, netloc, path, query, ""))


def article_id(url: str) -> str:
    """Stable id; http and https variants of the same URL share an id."""
    key = re.sub(r"^http://", "https://", canonical_url(url))
    return hashlib.sha1(key.encode("utf-8")).hexdigest()[:16]


def to_iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).replace(microsecond=0).strftime("%Y-%m-%dT%H:%M:%SZ")


def parse_published(parsed: time.struct_time | None, raw: str, now: datetime) -> datetime | None:
    """Returns an aware UTC datetime, or None when missing, malformed or implausibly in the future."""
    dt: datetime | None = None
    if parsed is not None:
        try:
            dt = datetime.fromtimestamp(calendar.timegm(parsed), tz=timezone.utc)
        except (OverflowError, ValueError, TypeError):
            dt = None
    if dt is None and raw:
        try:
            dt = parsedate_to_datetime(raw)
        except (TypeError, ValueError, IndexError):
            try:
                dt = datetime.fromisoformat(raw.strip().replace("Z", "+00:00"))
            except ValueError:
                dt = None
        if dt is not None and dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)  # naive dates are assumed UTC
    if dt is None:
        return None
    dt = dt.astimezone(timezone.utc)
    if dt > now + timedelta(seconds=config.FUTURE_TOLERANCE_S) or dt.year < 2000:
        return None
    return dt


# ---------- Topic / entities ----------

AI_PATTERN = re.compile(
    r"\b(AI|A\.I\.|AGI)\b|artificial intelligence|machine learning|\bLLMs?\b|large language model|neural net|deep learning|"
    r"generative|chatbot|\bOpenAI\b|\bAnthropic\b|\bClaude\b|\bGemini\b|ChatGPT|\bGPT-?\d|Copilot|\bLlama\b|\bMistral\b|"
    r"DeepMind|Hugging ?Face|transformer|diffusion model|\bagents?\b.*\b(model|AI)\b|inference|fine-tun|reasoning model",
    re.I,
)
_AI_CASE_SENSITIVE = re.compile(r"\b(AI|AGI|LLMs?)\b")


def looks_ai_related(title: str, excerpt: str) -> bool:
    text = f"{title} {excerpt}"
    # "AI" must be uppercase to avoid matching words like "ai" in other languages.
    return bool(_AI_CASE_SENSITIVE.search(text)) or bool(AI_PATTERN.search(text.replace(" AI ", " ")))


ENTITY_PATTERNS: dict[str, re.Pattern[str]] = {
    "openai": re.compile(r"\bOpenAI\b|ChatGPT|\bGPT-?\d|\bSora\b|\bDALL[·-]?E\b|\bCodex\b", re.I),
    "anthropic": re.compile(r"\bAnthropic\b|\bClaude\b", re.I),
    "google": re.compile(r"\bGoogle\b|\bGemini\b|DeepMind|\bGemma\b|\bAlphabet\b", re.I),
    "microsoft": re.compile(r"\bMicrosoft\b|\bCopilot\b|\bAzure\b|\bGitHub\b", re.I),
    "meta": re.compile(r"\bMeta\b(?! description)|\bLlama\b|\bFacebook\b", re.I),
    "nvidia": re.compile(r"\bNvidia\b|\bCUDA\b|\bBlackwell\b", re.I),
    "apple": re.compile(r"\bApple\b|Apple Intelligence|\bSiri\b", re.I),
    "amazon": re.compile(r"\bAmazon\b|\bAWS\b|\bAlexa\b|\bBedrock\b", re.I),
    "mistral": re.compile(r"\bMistral\b", re.I),
    "xai": re.compile(r"\bxAI\b|\bGrok\b"),
    "deepseek": re.compile(r"\bDeepSeek\b", re.I),
    "alibaba": re.compile(r"\bAlibaba\b|\bQwen\b", re.I),
    "huggingface": re.compile(r"Hugging ?Face", re.I),
}


def detect_entities(title: str, excerpt: str) -> list[str]:
    text = f"{title} {excerpt}"
    return sorted(k for k, pat in ENTITY_PATTERNS.items() if pat.search(text))


# Ordered: the first matching rule wins. Title matches are checked before excerpt matches.
CATEGORY_RULES: list[tuple[str, re.Pattern[str]]] = [
    ("safety", re.compile(r"\b(AI safety|alignment|red[- ]team|jailbreak|misuse|catastrophic risk|guardrails?|interpretability|safety (?:research|framework|evaluation|report|card))\b", re.I)),
    ("policy", re.compile(r"\b(regulat\w*|legislat\w*|\blaw\b|lawsuit|sues?|court|judge|copyright|senate|congress|parliament|government|ministry|white house|EU AI Act|AI Act|executive order|antitrust|FTC|ban(?:s|ned)?|policy|election)\b", re.I)),
    ("hardware", re.compile(r"\b(chips?|GPUs?|TPUs?|semiconductor\w*|data ?cent(?:er|re)s?|accelerators?|supercomputer|Blackwell|H100|H200|B200|wafer|fab|compute cluster|power grid)\b", re.I)),
    ("open-source", re.compile(r"\b(open[- ]source|open[- ]weights?|open model|Apache 2\.0|MIT licen[cs]e|released on Hugging ?Face|GitHub repo)\b", re.I)),
    ("business", re.compile(r"\b(raises?|raised|funding|valuation|acqui(?:re|res|red|sition)|IPO|revenue|earnings|investors?|investment|partnership|layoffs?|hires?|hiring|CEO|startup|deal|billion|stake)\b", re.I)),
    ("research", re.compile(r"\b(paper|arXiv|study|researchers?|benchmark|dataset|preprint|scientists?|experiment|findings)\b", re.I)),
    ("models", re.compile(r"\b(GPT-?\d[\w.-]*|Claude [\w.]+|Gemini [\w.]+|Llama ?\d|Mistral|Qwen|DeepSeek|model release|new model|frontier model|reasoning model|language model|multimodal model|weights)\b", re.I)),
    ("products", re.compile(r"\b(app|feature|launch(?:es|ed)?|rolls? out|rolling out|available|update|API|tool|assistant|agent|plugin|extension|integration|beta|preview)\b", re.I)),
]


def categorize(title: str, excerpt: str, default: str) -> str:
    for text in (title, excerpt):
        for cat, pat in CATEGORY_RULES:
            if pat.search(text):
                return cat
    return default
