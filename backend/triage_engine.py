"""
triage_engine.py — rule-based symptom classifier for Swaastha Saathi.

Deliberately NOT a black-box model. Every suggestion traces back to
specific keywords found in the user's message, matched against
data/symptom_knowledge_base.json. This is a routing aid, not a
diagnostic tool — it never claims to identify a disease.
"""

import json
import os
import re
import unicodedata

DATA_DIR = os.path.dirname(__file__)

with open(os.path.join(DATA_DIR, "symptom_knowledge_base.json"), encoding="utf-8") as f:
    KB = json.load(f)

with open(os.path.join(DATA_DIR, "facilities.json"), encoding="utf-8") as f:
    FACILITIES = json.load(f)


def _normalize_text(text):
    """Normalize common Hindi/Hinglish spellings before keyword matching.

    Users often type phonetically ("bukar", "bukhar", "bukhaar",
    "sir dard", "sar dard", "sardard", "pimples", etc.). We keep the
    original message for Gemini, but normalize a copy for deterministic
    safety routing.
    """
    text = unicodedata.normalize("NFKC", str(text or "")).lower().strip()
    text = re.sub(r"[^\w\s\u0900-\u097f]", " ", text)
    text = re.sub(r"\s+", " ", text)

    # High-frequency phonetic/typing variants. These are deliberately
    # conservative and only map to symptom concepts, never diagnoses.
    aliases = {
        "bukar": "bukhar", "bukhaar": "bukhar", "bukhr": "bukhar",
        "bukhar hai": "bukhar", "bukharr": "bukhar",
        "sir dard": "headache", "sar dard": "headache",
        "sardard": "headache", "sir me dard": "headache",
        "sar me dard": "headache", "sir mein dard": "headache",
        "sar mein dard": "headache", "sir ka dard": "headache",
        "sar ka dard": "headache", "sir dard hai": "headache",
        "sar dard hai": "headache", "head ache": "headache",
        "headpain": "headache",
        "khansi": "cough", "khansi hai": "cough",
        "zukam": "cold", "zukaam": "cold", "jukaam": "cold",
        "ulti": "vomit", "vomitting": "vomit", "vomitting hai": "vomit",
        "pimples": "pimple", "pimple": "acne", "acnes": "acne",
        "acne hai": "acne", "bahut acne": "acne", "bohot acne": "acne",
        "bahut pimples": "acne", "bohot pimples": "acne",
        "daane": "pimple", "dane": "pimple", "muhase": "acne",
        "muhase hai": "acne", "muhaase": "acne",
        "pet dard": "stomach pain", "pet mein dard": "stomach pain",
        "pet me dard": "stomach pain",
        "dast": "diarrhea", "loose motions": "loose motion",
        "loose motion": "diarrhea",
        "chakkar": "dizziness", "chakar": "dizziness",
        "kamjori": "weakness", "kamzori": "weakness",
        "jalan peshab": "urine burning", "peshab me jalan": "urine burning",
        "peshab mein jalan": "urine burning",
    }
    # Replace longer phrases first so "sir mein dard" is handled before
    # individual words.
    for source, target in sorted(aliases.items(), key=lambda item: -len(item[0])):
        text = re.sub(r"(?<!\w)" + re.escape(source) + r"(?!\w)", target, text)
    return text


def _matches_any(text, keywords):
    """Return the list of keywords found as substrings in normalized text."""
    return [kw for kw in keywords if kw.lower() in text]


def _nearest_facilities(n=2):
    ranked = sorted(FACILITIES, key=lambda f: f["distance_km"])
    return [{"name": f["name"], "distance_km": f["distance_km"]} for f in ranked[:n]]


def classify(message, language="en"):
    """
    Classify a free-text symptom message.

    Returns one of three shapes, matching what the frontend expects:
      1. Emergency:      {"emergency": True, "message": "..."}
      2. No match:       {"category": None, "message": "..."}
      3. Matched:        {"category": {...}, "urgency": "...",
                           "facilities": [...], "disclaimer": "..."}
    """
    lang = language if language in ("en", "hi") else "en"
    text = _normalize_text(message)

    # 1. Emergency check always runs first and overrides everything else.
    emergency_hits = _matches_any(text, KB["emergency_keywords"])
    if emergency_hits:
        return {
            "emergency": True,
            "message": KB["emergency_message"][lang],
            "matched_keywords": emergency_hits,  # explainability
        }

    # 2. Score each category by number of keyword hits; take the best match.
    best_category = None
    best_hits = []
    for cat in KB["categories"]:
        hits = _matches_any(text, cat["keywords"])
        if len(hits) > len(best_hits):
            best_category = cat
            best_hits = hits

    if not best_category:
        return {
            "category": None,
            "message": KB["no_match_message"][lang],
        }

    return {
        "category": {
            "name": best_category["name"],
            "possible_conditions": best_category["possible_conditions"],
            "specialist": best_category["specialist"],
            "special_note": best_category["special_note"],
        },
        "urgency": best_category["urgency"],
        "facilities": _nearest_facilities(),
        "disclaimer": KB["disclaimer"][lang],
        "matched_keywords": best_hits,  # explainability — not rendered by current UI, safe to include
    }

