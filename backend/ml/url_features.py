from __future__ import annotations

import ipaddress
import re
from difflib import SequenceMatcher
from urllib.parse import unquote, urlsplit, urlunsplit

import pandas as pd

SUSPICIOUS_TLDS = (".xyz", ".top", ".live", ".tk", ".ru", ".gq")
SCAM_KEYWORDS = (
    "login",
    "verify",
    "secure",
    "update",
    "free",
    "bonus",
    "wallet",
    "crypto",
    "claim",
    "reward",
    "giveaway",
    "support",
    "airdrop",
    "bank",
)
BRANDS = (
    "paypal",
    "google",
    "facebook",
    "amazon",
    "microsoft",
    "telegram",
    "binance",
    "metamask",
    "github",
    "openai",
    "chatgpt",
    "apple",
    "stripe",
    "youtube",
)
CHAR_REPLACEMENTS = str.maketrans(
    {
        "0": "o",
        "1": "l",
        "3": "e",
        "4": "a",
        "5": "s",
        "7": "t",
        "@": "a",
        "$": "s",
        "!": "i",
        "|": "l",
    }
)
SPECIAL_CHARACTER_PATTERN = re.compile(r"[^a-zA-Z0-9]")
ENCODED_CHARACTER_PATTERN = re.compile(r"%[0-9a-fA-F]{2}")
HEX_PATTERN = re.compile(r"(?:0x[0-9a-fA-F]+|%[0-9a-fA-F]{2})")


FEATURE_NAMES = [
    "url_length",
    "hostname_length",
    "path_length",
    "dot_count",
    "hyphen_count",
    "slash_count",
    "digit_count",
    "special_char_count",
    "subdomain_count",
    "contains_at",
    "contains_percent",
    "contains_underscore",
    "contains_equal",
    "contains_question",
    "contains_multiple_double_slash",
    "contains_encoded_chars",
    "contains_hex_pattern",
    "uses_ip_address",
    "uses_https",
    "has_suspicious_tld",
    "abnormal_domain_structure",
    "brand_match_count",
    "brand_max_similarity",
    "has_exact_brand_match",
    "has_brand_impersonation",
    "has_character_replacement",
    "brand_in_path_or_query",
] + [f"keyword_{keyword}" for keyword in SCAM_KEYWORDS]


def normalize_url(raw_url: str) -> str:
    candidate = (raw_url or "").strip()
    if not candidate:
        raise ValueError("URL is empty")

    if not re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*://", candidate):
        candidate = f"https://{candidate}"

    parsed = urlsplit(candidate)
    if parsed.scheme.lower() not in {"http", "https"}:
        raise ValueError("Unsupported scheme")
    if not parsed.hostname:
        raise ValueError("URL hostname is required")

    hostname = parsed.hostname.strip(".").lower()
    if not hostname:
        raise ValueError("URL hostname is required")

    try:
        hostname = hostname.encode("idna").decode("ascii")
    except UnicodeError as exc:
        raise ValueError("Invalid hostname") from exc

    try:
        port = parsed.port
    except ValueError as exc:
        raise ValueError("Invalid port") from exc

    default_port = (parsed.scheme.lower() == "http" and port == 80) or (
        parsed.scheme.lower() == "https" and port == 443
    )
    netloc = hostname if not port or default_port else f"{hostname}:{port}"
    path = parsed.path or "/"
    query = parsed.query
    return urlunsplit((parsed.scheme.lower(), netloc, path, query, ""))


def extract_features(url: str) -> dict[str, float]:
    normalized_url = normalize_url(url)
    parsed = urlsplit(normalized_url)
    hostname = parsed.hostname or ""
    path = unquote(parsed.path or "")
    query = unquote(parsed.query or "")
    combined = f"{hostname} {path} {query}".lower()
    compact_hostname = re.sub(r"[^a-z0-9]+", "", hostname.lower())
    hostname_labels = [label for label in hostname.split(".") if label]

    matched_brands: list[str] = []
    max_similarity = 0.0
    has_exact_brand_match = 0
    has_brand_impersonation = 0
    has_character_replacement = 0
    brand_in_path_or_query = 0

    replaced_hostname = compact_hostname.translate(CHAR_REPLACEMENTS)

    for brand in BRANDS:
        brand_compact = re.sub(r"[^a-z0-9]+", "", brand)
        if brand_compact in compact_hostname:
            matched_brands.append(brand)
            has_exact_brand_match = 1
        if brand_compact in f"{path.lower()} {query.lower()}":
            brand_in_path_or_query = 1
        if brand_compact in replaced_hostname and brand_compact not in compact_hostname:
            has_character_replacement = 1

        for candidate in [compact_hostname, *hostname_labels]:
            if not candidate:
                continue
            similarity = SequenceMatcher(None, candidate, brand_compact).ratio()
            max_similarity = max(max_similarity, similarity)
            if similarity >= 0.8 and brand_compact not in candidate:
                has_brand_impersonation = 1

    if has_character_replacement and not has_exact_brand_match:
        has_brand_impersonation = 1
    brand_match_count = len(matched_brands)

    try:
        ipaddress.ip_address(hostname)
        uses_ip_address = 1
    except ValueError:
        uses_ip_address = 0

    abnormal_domain_structure = int(
        len(hostname_labels) > 4
        or "--" in hostname
        or hostname.startswith("-")
        or hostname.endswith("-")
        or sum(character.isdigit() for character in hostname) >= 4
    )

    features: dict[str, float] = {
        "url_length": len(normalized_url),
        "hostname_length": len(hostname),
        "path_length": len(path),
        "dot_count": normalized_url.count("."),
        "hyphen_count": normalized_url.count("-"),
        "slash_count": normalized_url.count("/"),
        "digit_count": sum(character.isdigit() for character in normalized_url),
        "special_char_count": len(SPECIAL_CHARACTER_PATTERN.findall(normalized_url)),
        "subdomain_count": max(0, len(hostname_labels) - 2),
        "contains_at": int("@" in normalized_url),
        "contains_percent": int("%" in normalized_url),
        "contains_underscore": int("_" in normalized_url),
        "contains_equal": int("=" in normalized_url),
        "contains_question": int("?" in normalized_url),
        "contains_multiple_double_slash": int(normalized_url.count("//") > 1),
        "contains_encoded_chars": int(bool(ENCODED_CHARACTER_PATTERN.search(normalized_url))),
        "contains_hex_pattern": int(bool(HEX_PATTERN.search(normalized_url))),
        "uses_ip_address": uses_ip_address,
        "uses_https": int(parsed.scheme.lower() == "https"),
        "has_suspicious_tld": int(any(hostname.endswith(tld) for tld in SUSPICIOUS_TLDS)),
        "abnormal_domain_structure": abnormal_domain_structure,
        "brand_match_count": float(brand_match_count),
        "brand_max_similarity": round(max_similarity, 4),
        "has_exact_brand_match": has_exact_brand_match,
        "has_brand_impersonation": has_brand_impersonation,
        "has_character_replacement": has_character_replacement,
        "brand_in_path_or_query": brand_in_path_or_query,
    }
    for keyword in SCAM_KEYWORDS:
        features[f"keyword_{keyword}"] = int(keyword in combined)

    return {name: features.get(name, 0.0) for name in FEATURE_NAMES}


def build_feature_dataframe(urls: list[str] | pd.Series) -> pd.DataFrame:
    rows = [extract_features(url) for url in urls]
    return pd.DataFrame(rows, columns=FEATURE_NAMES).fillna(0.0)
