"""
app.py — Swaastha-Saathi backend.

Flask + JSON files. No database yet (see README "Known limitations").
Every route here is called directly by script.js — if you rename a
route, update API_BASE calls in script.js too.
"""

import json
import os
import secrets
import uuid
import base64
import requests
from dotenv import load_dotenv
from datetime import datetime, timedelta, timezone
from functools import wraps

import bcrypt
import jwt
from flask import Flask, jsonify, request
from flask_cors import CORS

import triage_engine

DATA_DIR = os.path.dirname(__file__)
# Load local secrets from backend/.env automatically. The file is git-ignored.
load_dotenv(os.path.join(DATA_DIR, ".env"))

app = Flask(__name__)
CORS(app)  # frontend is served from a different port (8080) during dev

def load_jwt_secret():
    """Use an exported JWT_SECRET when available, otherwise persist one locally.

    This keeps the local demo easy to run without requiring the user to
    export the secret every time the backend starts.
    """
    env_secret = os.environ.get("JWT_SECRET")
    if env_secret:
        return env_secret

    secret_file = os.path.join(DATA_DIR, ".jwt_secret")
    if os.path.exists(secret_file):
        with open(secret_file, encoding="utf-8") as f:
            saved = f.read().strip()
        if saved:
            return saved

    generated = secrets.token_urlsafe(48)
    with open(secret_file, "w", encoding="utf-8") as f:
        f.write(generated)
    return generated

JWT_SECRET = load_jwt_secret()
JWT_ALGORITHM = "HS256"
JWT_EXPIRES_HOURS = 24
USERS_FILE = os.path.join(os.path.dirname(__file__), "users.json")

def load_users():
    if not os.path.exists(USERS_FILE):
        return []
    with open(USERS_FILE, encoding="utf-8") as f:
        return json.load(f)

def save_users(users):
    tmp = USERS_FILE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(users, f, indent=2, ensure_ascii=False)
    os.replace(tmp, USERS_FILE)

def public_user(user):
    return {k: v for k, v in user.items() if k != "password_hash"}

def issue_token(user):
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user["id"],
        "email": user["email"],
        "role": user["role"],
        "iat": now,
        "exp": now + timedelta(hours=JWT_EXPIRES_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def token_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return jsonify({"success": False, "message": "Authentication required."}), 401
        token = auth.split(" ", 1)[1].strip()
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        except jwt.ExpiredSignatureError:
            return jsonify({"success": False, "message": "Session expired. Please log in again."}), 401
        except jwt.InvalidTokenError:
            return jsonify({"success": False, "message": "Invalid authentication token."}), 401
        user = next((u for u in load_users() if u["id"] == payload.get("sub")), None)
        if not user:
            return jsonify({"success": False, "message": "User no longer exists."}), 401
        request.current_user = public_user(user)
        return fn(*args, **kwargs)
    return wrapper


def load_json(filename):
    with open(os.path.join(DATA_DIR, filename), encoding="utf-8") as f:
        return json.load(f)


# In-memory booking store: {doctor_id: {(date, slot): patient_name}}
# Resets on server restart — matches "no persistent history yet".
_bookings = {}


# ------------------------------------------------------------------
# Authentication — JWT + role-based registration/login
# ------------------------------------------------------------------
@app.route("/api/auth/register", methods=["POST"])
def register():
    body = request.get_json(silent=True) or {}
    name = (body.get("name") or "").strip()
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""
    role = (body.get("role") or "patient").strip().lower()

    if not name or not email or not password:
        return jsonify({"success": False, "message": "Name, email and password are required."}), 400
    if len(password) < 6:
        return jsonify({"success": False, "message": "Password must be at least 6 characters."}), 400
    if role not in {"patient", "doctor"}:
        return jsonify({"success": False, "message": "Invalid role."}), 400

    users = load_users()
    if any(u["email"] == email and u["role"] == role for u in users):
        return jsonify({"success": False, "message": "An account with this email already exists for this role."}), 409

    user = {
        "id": str(uuid.uuid4()),
        "name": name,
        "email": email,
        "role": role,
        "phone": body.get("phone", ""),
        "age": body.get("age", None),
        "specialization": body.get("specialization", ""),
        "hospital": body.get("hospital", ""),
        "license_number": body.get("license_number", ""),
        "pharmacy_name": body.get("pharmacy_name", ""),
        "address": body.get("address", ""),
        "password_hash": bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    users.append(user)
    save_users(users)
    return jsonify({"success": True, "message": "Registration successful.", "data": {"user": public_user(user), "token": issue_token(user), "userType": role}}), 201

@app.route("/api/auth/login", methods=["POST"])
def login():
    body = request.get_json(silent=True) or {}
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""
    role = (body.get("role") or "patient").strip().lower()

    user = next((u for u in load_users() if u["email"] == email and u["role"] == role), None)
    if not user or not bcrypt.checkpw(password.encode("utf-8"), user["password_hash"].encode("utf-8")):
        return jsonify({"success": False, "message": "Invalid email, password or role."}), 401

    return jsonify({"success": True, "message": "Login successful.", "data": {"user": public_user(user), "token": issue_token(user), "userType": role}})

@app.route("/api/auth/me")
@token_required
def auth_me():
    return jsonify({"success": True, "user": request.current_user})

@app.route("/api/auth/logout", methods=["POST"])
@token_required
def auth_logout():
    # JWTs are stateless; the client removes the token.
    return jsonify({"success": True, "message": "Logged out successfully."})

# ------------------------------------------------------------------
# Health
# ------------------------------------------------------------------
@app.route("/api/health")
def health():
    return jsonify({"status": "ok"})


# ------------------------------------------------------------------
# Feedback — local JSON storage for the demo
# ------------------------------------------------------------------
FEEDBACK_FILE = os.path.join(DATA_DIR, "feedback.json")

def load_feedback():
    if not os.path.exists(FEEDBACK_FILE):
        return []
    try:
        with open(FEEDBACK_FILE, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, json.JSONDecodeError):
        return []

def save_feedback(items):
    tmp = FEEDBACK_FILE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(items, f, indent=2, ensure_ascii=False)
    os.replace(tmp, FEEDBACK_FILE)

@app.route("/api/feedback", methods=["POST"])
@token_required
def submit_feedback():
    body = request.get_json(silent=True) or {}
    try:
        rating = int(body.get("rating", 0))
    except (TypeError, ValueError):
        rating = 0
    if rating < 1 or rating > 5:
        return jsonify({"success": False, "message": "Please select a rating from 1 to 5."}), 400

    anonymous = bool(body.get("anonymous", False))
    record = {
        "id": str(uuid.uuid4()),
        "user_id": request.current_user.get("id"),
        "name": "Anonymous" if anonymous else (body.get("name") or request.current_user.get("name", "User")),
        "email": "" if anonymous else (body.get("email") or request.current_user.get("email", "")),
        "rating": rating,
        "liked": (body.get("liked") or "").strip()[:2000],
        "improve": (body.get("improve") or "").strip()[:3000],
        "area": (body.get("area") or "Other").strip()[:100],
        "feature": (body.get("feature") or "").strip()[:2000],
        "problem": (body.get("problem") or "").strip()[:3000],
        "anonymous": anonymous,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    items = load_feedback()
    items.append(record)
    save_feedback(items[-1000:])
    return jsonify({"success": True, "message": "Thank you! Your feedback has been submitted.", "feedback_id": record["id"]}), 201


# ------------------------------------------------------------------
# Triage (symptom chat)
# ------------------------------------------------------------------
@app.route("/api/triage", methods=["POST"])
@token_required
def triage():
    body = request.get_json(silent=True) or {}
    message = body.get("message", "")
    language = body.get("language", "en")

    if not message or not message.strip():
        return jsonify({"category": None, "message": "Please describe your symptoms."}), 400

    result = triage_engine.classify(message, language)
    return jsonify(result)


@app.route("/api/symptom-chat", methods=["POST"])
@token_required
def symptom_chat():
    """Symptom conversation: deterministic triage first, Gemini second."""
    body = request.get_json(silent=True) or {}
    message = (body.get("message") or "").strip()
    language = (body.get("language") or "en").lower()
    history = body.get("history") or []
    if language not in {"en", "hinglish", "hi"}:
        language = "en"
    if not message:
        return jsonify({"success": False, "message": "Please describe your symptoms."}), 400

    # The rules engine remains the safety/urgency layer. Hinglish uses the
    # same English keyword/routing data, while Gemini speaks Hinglish.
    triage_language = "hi" if language == "hi" else "en"
    triage_result = triage_engine.classify(message, triage_language)

    # Explicitly tell the user whether professional care is recommended.
    guidance = {
        "en": {
            "high": "Please arrange a doctor or health-worker assessment today if possible.",
            "medium": "Please arrange a doctor or health-worker assessment today if possible, especially if symptoms persist or worsen.",
            "low": "You can usually start with self-care and monitor your symptoms. See a doctor if symptoms worsen, persist, or warning signs appear.",
        },
        "hinglish": {
            "high": "Agar possible ho to aaj hi doctor ya health worker se assessment karwa lijiye.",
            "medium": "Agar possible ho to aaj hi doctor ya health worker se assessment karwa lijiye, khaaskar agar symptoms bane rahein ya badhein.",
            "low": "Abhi aap self-care kar sakte hain aur symptoms monitor karein. Agar symptoms badhein, zyada der rahein ya warning signs aayein to doctor ko dikhaiye.",
        },
        "hi": {
            "high": "यदि संभव हो तो आज ही डॉक्टर या स्वास्थ्यकर्मी से जांच कराएं।",
            "medium": "यदि संभव हो तो आज ही डॉक्टर या स्वास्थ्यकर्मी से जांच कराएं, खासकर यदि लक्षण बने रहें या बढ़ें।",
            "low": "फिलहाल आप घर पर देखभाल कर सकते हैं और लक्षणों पर नज़र रखें। लक्षण बढ़ें, लंबे समय तक रहें या चेतावनी के संकेत दिखें तो डॉक्टर को दिखाएं।",
        },
    }
    if triage_result.get("urgency"):
        triage_result["care_guidance"] = guidance[language].get(triage_result["urgency"], guidance[language]["low"])

    if triage_result.get("emergency"):
        emergency_reply = {
            "en": "This may be an emergency. Please call 108 or go to the nearest emergency department immediately. Do not wait for an AI response or appointment.",
            "hinglish": "Yeh emergency ho sakti hai. Please turant 108 par call karein ya nearest emergency department jaayein. AI ke reply ya appointment ka wait mat karein.",
            "hi": "यह आपातकाल हो सकता है। कृपया तुरंत 108 पर कॉल करें या नज़दीकी आपातकालीन विभाग जाएं। AI के जवाब या अपॉइंटमेंट का इंतज़ार न करें।",
        }[language]
        return jsonify({"success": True, "emergency": True, "triage": triage_result, "reply": emergency_reply})

    key = get_gemini_key()
    if not key:
        return jsonify({"success": True, "ai_configured": False, "triage": triage_result,
                        "reply": triage_result.get("message") or guidance[language]["low"],
                        "follow_up": None})

    history_clean = []
    for item in history[-8:]:
        if not isinstance(item, dict):
            continue
        role = "model" if item.get("role") == "assistant" else "user"
        text = str(item.get("text") or "").strip()
        if text:
            history_clean.append({"role": role, "parts": [{"text": text[:1200]}]})

    triage_context = json.dumps(triage_result, ensure_ascii=False)[:5000]
    lang_name = {
        "en": "English",
        "hinglish": "natural Hinglish written in Roman script (Hindi words in English letters mixed naturally with simple English; NEVER use Devanagari)",
        "hi": "Hindi written in Devanagari script",
    }[language]
    system = f"""You are Swaastha-Saathi's symptom conversation assistant for rural/community health.
Reply ONLY in {lang_name}.

Language rules:
- English: clear simple English.
- Hinglish: use Roman Hindi + simple English naturally, e.g. 'Aapko sar dard kab se hai?' Do NOT switch to Devanagari.
- Hindi: use natural Devanagari Hindi.
- Understand phonetic and misspelled user text such as bukar/bukhar/bukhaar, sir/sar dard, sardard, pimple/pimples/acne/muhase, khansi, chakkar, pet dard, etc. The app's triage result below is authoritative for routing.

Safety rules:
- You are not a doctor. Do not diagnose a disease or prescribe prescription medicines.
- Clearly explain whether the user can monitor at home, should see a doctor/health worker today, or needs urgent/emergency care.
- Never contradict an emergency result from the app.
- Give only practical, low-risk self-care suggestions when appropriate.
- Ask at most ONE important follow-up question if it would change the guidance.
- Keep responses short, warm and easy to understand.

Authoritative deterministic triage result:
{triage_context}

Authoritative care guidance:
{triage_result.get('care_guidance', guidance[language]['low'])}

If a follow-up is needed, end with exactly one line: FOLLOW_UP: <one question>
Otherwise end with exactly: FOLLOW_UP: NONE"""

    # Use Gemini's systemInstruction instead of pretending the system prompt is a user message.
    # This makes language and safety instructions much more reliable across turns.
    contents = []
    contents.extend(history_clean)
    contents.append({"role": "user", "parts": [{"text": message}]})
    payload = {
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": contents,
        "generationConfig": {"temperature": 0.15, "maxOutputTokens": 700},
    }

    models_to_try = []
    for model in [GEMINI_MODEL] + GEMINI_FALLBACK_MODELS:
        if model and model not in models_to_try:
            models_to_try.append(model)

    last_error = None
    for model in models_to_try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        for attempt in range(4):
            try:
                r = requests.post(
                    url,
                    headers={"Content-Type": "application/json", "x-goog-api-key": key},
                    json=payload,
                    timeout=45,
                )
                if r.status_code == 200:
                    data = r.json()
                    text = ""
                    for candidate in data.get("candidates", []):
                        for part in candidate.get("content", {}).get("parts", []):
                            if part.get("text"):
                                text += part["text"]
                    text = text.strip()
                    follow_up = None
                    if "FOLLOW_UP:" in text:
                        reply, follow = text.rsplit("FOLLOW_UP:", 1)
                        text = reply.strip()
                        follow = follow.strip()
                        if follow and follow.upper() != "NONE":
                            follow_up = follow
                    if not text:
                        text = triage_result.get("message") or guidance[language]["low"]
                    return jsonify({
                        "success": True,
                        "ai_configured": True,
                        "triage": triage_result,
                        "reply": text,
                        "follow_up": follow_up,
                        "model": model,
                    })

                try:
                    detail = r.json()
                except Exception:
                    detail = r.text[:500]
                last_error = f"Gemini {model} returned HTTP {r.status_code}: {detail}"
                # Retry only transient failures. A 400/401/403/404 is a configuration/model issue,
                # so move directly to the next configured fallback model.
                if r.status_code not in {408, 409, 425, 429, 500, 502, 503, 504}:
                    break
            except requests.RequestException as exc:
                last_error = str(exc)
            if attempt < 3:
                import time
                time.sleep(min(8, 1.0 * (2 ** attempt)))

    # Never make the user lose the local triage result just because Gemini is unavailable.
    return jsonify({"success": True, "ai_configured": True, "ai_error": True,
                    "triage": triage_result,
                    "reply": triage_result.get("message") or guidance[language]["low"],
                    "follow_up": None, "detail": last_error})

    # Never make the user lose the local triage result just because Gemini is unavailable.
    return jsonify({"success": True, "ai_configured": True, "ai_error": True,
                    "triage": triage_result,
                    "reply": triage_result.get("message") or guidance[language]["low"],
                    "follow_up": None, "detail": last_error})


# ------------------------------------------------------------------
# Facilities
# ------------------------------------------------------------------
@app.route("/api/facilities")
@token_required
def facilities():
    return jsonify({"facilities": load_json("facilities.json")})


# ------------------------------------------------------------------
# ASHA — households (priority score computed here, not hardcoded)
# ------------------------------------------------------------------
def _priority_score(household):
    """
    Explainable priority formula:
      +15 per risk factor, +20 per pending health item,
      + up to 30 for time since last visit (capped at 60 days),
    then capped to 100. Every point traces back to a specific field —
    intentional, so a health worker can be told exactly why a
    household ranks where it does.
    """
    risk_score = len(household["risk_factors"]) * 15
    pending_score = len(household["pending_items"]) * 20
    days_score = min(household["last_visit_days_ago"], 60) * 0.5
    return min(round(risk_score + pending_score + days_score), 100)


@app.route("/api/asha/households")
@token_required
def asha_households():
    households = load_json("households.json")
    for h in households:
        h["live_priority_score"] = _priority_score(h)
    households.sort(key=lambda h: h["live_priority_score"], reverse=True)
    return jsonify({"households": households})


@app.route("/api/asha/education")
@token_required
def asha_education():
    return jsonify({"topics": load_json("education.json")})


# ------------------------------------------------------------------
# Village Health Hub — actionable rural-health resources
# ------------------------------------------------------------------
VILLAGE_REQUESTS_FILE = os.path.join(DATA_DIR, "village_requests.json")
SKIN_TOKEN_FILE = os.path.join(DATA_DIR, ".hf_token")
SKIN_MODEL = "Tanishq77/skin-condition-classifier"
GEMINI_TOKEN_FILE = os.path.join(DATA_DIR, ".gemini_key")
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
GEMINI_FALLBACK_MODELS = ["gemini-2.5-flash-lite", "gemini-flash-latest"]

def load_village_requests():
    if not os.path.exists(VILLAGE_REQUESTS_FILE):
        return []
    try:
        return load_json("village_requests.json")
    except Exception:
        return []

def save_village_requests(items):
    tmp = VILLAGE_REQUESTS_FILE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(items, f, indent=2, ensure_ascii=False)
    os.replace(tmp, VILLAGE_REQUESTS_FILE)

@app.route("/api/village/resources")
@token_required
def village_resources():
    facilities = load_json("facilities.json")
    households = load_json("households.json")
    # Village stock mirrors the same persistent pharmacy inventory used by
    # Order Medicines, so an order immediately changes availability here too.
    medicines = [
        {"name":m["name"], "stock":int(m.get("stock",0)), "status":stock_status(int(m.get("stock",0)))}
        for m in load_medicines()
    ]
    camps = [
        {"name":"Village Wellness Camp", "date":"Saturday", "location":"Sidhbari PHC", "services":["BP check","Sugar check","Maternal counselling"]},
        {"name":"Mother & Child Health Day", "date":"Next Tuesday", "location":"Naddi Community Centre", "services":["ANC","Vaccination","Nutrition"]},
    ]
    return jsonify({"facilities": facilities, "medicines": medicines, "camps": camps,
                    "households": households, "request_count": len([r for r in load_village_requests() if r.get("user_id") == request.current_user["id"]])})

@app.route("/api/village/requests", methods=["GET", "POST"])
@token_required
def village_requests():
    items = load_village_requests()
    if request.method == "GET":
        mine = [r for r in items if r.get("user_id") == request.current_user["id"]]
        return jsonify({"requests": mine})
    body = request.get_json(silent=True) or {}
    kind = (body.get("type") or "support").strip()
    details = (body.get("details") or "").strip()
    if not details:
        return jsonify({"success":False,"message":"Please add request details."}), 400
    item = {"id":str(uuid.uuid4()), "user_id":request.current_user["id"], "type":kind, "details":details,
            "status":"Submitted", "created_at":datetime.now(timezone.utc).isoformat()}
    items.append(item); save_village_requests(items)
    return jsonify({"success":True,"request":item}), 201

# ------------------------------------------------------------------
# Skin Health — optional Hugging Face inference API
# ------------------------------------------------------------------
def get_gemini_key():
    env = os.environ.get("GEMINI_API_KEY", "").strip()
    if env: return env
    if os.path.exists(GEMINI_TOKEN_FILE):
        return open(GEMINI_TOKEN_FILE, encoding="utf-8").read().strip()
    return ""

def get_skin_token():
    env = os.environ.get("HF_TOKEN", "").strip()
    if env: return env
    if os.path.exists(SKIN_TOKEN_FILE):
        return open(SKIN_TOKEN_FILE, encoding="utf-8").read().strip()
    return ""

@app.route("/api/skin/config", methods=["GET", "POST"])
@token_required
def skin_config():
    if request.method == "GET":
        return jsonify({"configured": bool(get_skin_token()) or bool(get_gemini_key()), "hf_configured": bool(get_skin_token()), "gemini_configured": bool(get_gemini_key()), "model": SKIN_MODEL, "gemini_model": GEMINI_MODEL})
    body=request.get_json(silent=True) or {}
    token=(body.get("token") or "").strip()
    gemini=(body.get("gemini_key") or "").strip()
    if not token and not gemini:
        return jsonify({"success":False,"message":"Add a Hugging Face token (hf_) or a Google Gemini API key."}),400
    if token:
        if not token.startswith("hf_"):
            return jsonify({"success":False,"message":"Hugging Face tokens should begin with hf_."}),400
        with open(SKIN_TOKEN_FILE,"w",encoding="utf-8") as f: f.write(token)
    if gemini:
        with open(GEMINI_TOKEN_FILE,"w",encoding="utf-8") as f: f.write(gemini)
    return jsonify({"success":True,"configured":True,"hf_configured":bool(get_skin_token()),"gemini_configured":bool(get_gemini_key())})

@app.route("/api/skin/predict", methods=["POST"])
@token_required
def skin_predict():
    token=get_skin_token()
    image=request.files.get("image")
    if not image:
        return jsonify({"success":False,"message":"Please upload an image."}),400
    raw=image.read()
    if len(raw) > 8*1024*1024:
        return jsonify({"success":False,"message":"Image must be smaller than 8 MB."}),400
    try:
        if not token:
            key=get_gemini_key()
            if not key:
                return jsonify({"success":False,"configured":False,"message":"Skin image screening is not configured. Add GEMINI_API_KEY to backend/.env and restart the app."}), 503
            b64=base64.b64encode(raw).decode("ascii")
            prompt="""Analyze this face/skin image for a cosmetic, non-diagnostic skin-health screening. Do not diagnose disease. Return ONLY JSON with keys: observations (array of 3-6 short visible observations such as apparent oiliness, dryness, uneven tone, acne-like blemishes, redness, texture, under-eye puffiness), skin_focus (array of 3 short priorities), and note (one short disclaimer). If the photo is not a usable close-up of skin/face, say that in observations."""
            payload={"contents":[{"parts":[{"inlineData":{"mimeType":image.mimetype or "image/jpeg","data":b64}},{"text":prompt}]}],"generationConfig":{"temperature":0.1,"responseMimeType":"application/json","maxOutputTokens":500}}
            url=f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"
            r=requests.post(url,headers={"Content-Type":"application/json","x-goog-api-key":key},json=payload,timeout=60)
            if r.status_code != 200:
                try: detail=r.json()
                except Exception: detail={"error":r.text[:300]}
                return jsonify({"success":False,"message":"Gemini skin analysis failed.","detail":detail}),502
            data=r.json(); text=""
            for c in data.get("candidates",[]):
                for part in c.get("content",{}).get("parts",[]):
                    if part.get("text"): text += part["text"]
            try: parsed=json.loads(text)
            except Exception: parsed={"observations":[text],"skin_focus":[],"note":"Educational cosmetic guidance only."}
            preds=[{"label":x,"score":None} for x in parsed.get("observations",[])[:5]]
            return jsonify({"success":True,"model":GEMINI_MODEL,"predictions":preds,"skin_focus":parsed.get("skin_focus",[]),"disclaimer":"This is a cosmetic visual screening, not a medical diagnosis. See a dermatologist for persistent, painful, rapidly changing or concerning skin problems."})

        url=f"https://router.huggingface.co/hf-inference/models/{SKIN_MODEL}"
        r=requests.post(url,headers={"Authorization":f"Bearer {token}","Content-Type":image.mimetype or "application/octet-stream"},data=raw,timeout=45)
        if r.status_code != 200:
            try: detail=r.json()
            except Exception: detail={"error":r.text[:300]}
            return jsonify({"success":False,"message":"Skin model request failed.","detail":detail}),502
        result=r.json()
        if not isinstance(result,list): return jsonify({"success":False,"message":"The skin model returned an unexpected response."}),502
        top=sorted(result,key=lambda x:x.get("score",0),reverse=True)[:3]
        return jsonify({"success":True,"model":SKIN_MODEL,"predictions":top,
                        "disclaimer":"AI screening is educational and not a medical diagnosis. Please consult a dermatologist for any concerning lesion or persistent symptoms."})
    except requests.RequestException as exc:
        return jsonify({"success":False,"message":"Could not reach the skin AI service.","detail":str(exc)}),502


@app.route("/api/skin/glowup", methods=["POST"])
@token_required
def skin_glowup():
    """Analyze an uploaded skin image with the same server-side Gemini setup as Symptom Chat.

    This is visual health guidance, not a diagnosis or prescription. The model may suggest
    general OTC ingredient categories when appropriate, but must not prescribe medicines.
    """
    key = get_gemini_key()
    image = request.files.get("image")
    if not image:
        return jsonify({"success": False, "message": "Please choose an image file first."}), 400

    raw = image.read()
    if not raw:
        return jsonify({"success": False, "message": "The selected image is empty."}), 400
    if len(raw) > 8 * 1024 * 1024:
        return jsonify({"success": False, "message": "Image must be smaller than 8 MB."}), 400
    mime = (image.mimetype or "").lower()
    allowed_mimes = {"image/jpeg", "image/png", "image/webp", "image/jpg"}
    if mime not in allowed_mimes and not mime.startswith("image/"):
        return jsonify({"success": False, "message": "Please upload a JPG, PNG or WEBP image."}), 400
    if not key:
        return jsonify({"success": False, "message": "Gemini image analysis is not configured. Add GEMINI_API_KEY to backend/.env and restart the app."}), 503

    prompt = """You are reviewing a user-provided skin photo for general health guidance.
This is NOT a medical diagnosis. Do not claim certainty from an image and do not prescribe prescription medicines.
Do not identify the person or infer sensitive traits. If the image is unclear, not actually skin, too distant,
or poorly lit, say that clearly and ask for a clearer close-up.

Return ONLY valid JSON with exactly these keys:
observations: array of 3-6 short statements describing only visible findings (examples: redness, scaling,
dryness, bumps, acne-like spots, discoloration, swelling, crusting). Use cautious wording such as "looks like"
or "may be consistent with".
likely_categories: array of up to 3 non-diagnostic possibilities, such as "irritant/contact rash",
"acne-like breakouts", "dry/eczema-like irritation", "fungal-looking rash", or "needs in-person assessment".
care_level: one of "self_care", "doctor_today", "urgent", "emergency".
text: concise advice with these headings:
1. What the image looks like
2. What it could be (not a diagnosis)
3. What you can do now
4. Medicine/OTC options (only general non-prescription ingredient categories when reasonably appropriate;
never give a prescription, antibiotic, steroid, antifungal or other drug regimen based only on the image)
5. When to see a doctor
For medicine/OTC options, give label-directed examples only when appropriate and include a brief caution to stop
if irritation occurs. For a possible rash, prefer gentle care and avoiding new products; do not recommend steroid creams
or antibiotics just from the photo. If infection is possible, recommend clinician/pharmacist assessment rather than
self-prescribing.
disclaimer: one short sentence stating that image analysis cannot confirm a diagnosis or replace a clinician.
Keep it practical, simple, and medically cautious."""

    try:
        b64 = base64.b64encode(raw).decode("ascii")
        payload = {
            "systemInstruction": {"parts": [{"text": "You are Swaastha Saathi's cautious skin-image health assistant. Describe visible findings without diagnosing. Never prescribe medicines from an image. Escalate concerning signs to a clinician."}]},
            "contents": [{"role": "user", "parts": [
                {"inlineData": {"mimeType": mime, "data": b64}},
                {"text": prompt}
            ]}],
            "generationConfig": {"temperature": 0.15, "responseMimeType": "application/json", "maxOutputTokens": 1400}
        }

        models_to_try = []
        for model in [GEMINI_MODEL] + GEMINI_FALLBACK_MODELS:
            if model and model not in models_to_try:
                models_to_try.append(model)

        last_error = None
        transient = {408, 409, 425, 429, 500, 502, 503, 504}
        text = ""
        used_model = GEMINI_MODEL
        for model in models_to_try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
            for attempt in range(4):
                try:
                    r = requests.post(url, headers={"Content-Type": "application/json", "x-goog-api-key": key}, json=payload, timeout=60)
                    if r.status_code == 200:
                        data = r.json()
                        chunks = []
                        for candidate in data.get("candidates", []):
                            for part in candidate.get("content", {}).get("parts", []):
                                if part.get("text"):
                                    chunks.append(part["text"])
                        text = "".join(chunks).strip()
                        if text:
                            used_model = model
                            break
                        last_error = "Gemini returned no text."
                    else:
                        try:
                            detail = r.json()
                        except Exception:
                            detail = r.text[:500]
                        last_error = f"Gemini {model} returned HTTP {r.status_code}: {detail}"
                        if r.status_code not in transient:
                            break
                except requests.RequestException as exc:
                    last_error = str(exc)
                if text:
                    break
                if attempt < 3:
                    import time
                    time.sleep(min(8, 1.0 * (2 ** attempt)))
            if text:
                break

        if not text:
            return jsonify({"success": False, "message": "Gemini image analysis failed. Please try again.", "detail": last_error}), 502

        cleaned = text.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.replace("```json", "", 1).replace("```", "", 1).strip()
        try:
            parsed = json.loads(cleaned)
        except Exception:
            parsed = {"observations": [], "likely_categories": [], "care_level": "doctor_today", "text": text,
                      "disclaimer": "Image analysis cannot confirm a diagnosis or replace a clinician."}

        observations = parsed.get("observations") if isinstance(parsed.get("observations"), list) else []
        observations = [str(x)[:300] for x in observations[:6] if str(x).strip()]
        categories = parsed.get("likely_categories") if isinstance(parsed.get("likely_categories"), list) else []
        categories = [str(x)[:200] for x in categories[:3] if str(x).strip()]
        care_level = str(parsed.get("care_level") or "doctor_today").lower()
        if care_level not in {"self_care", "doctor_today", "urgent", "emergency"}:
            care_level = "doctor_today"
        text = str(parsed.get("text") or "").strip()
        disclaimer = str(parsed.get("disclaimer") or "Image analysis cannot confirm a diagnosis or replace a clinician.")
        if not text:
            text = "The image was received, but the AI did not return enough guidance. Please try a clearer, well-lit close-up."

        return jsonify({"success": True, "text": text, "observations": observations, "likely_categories": categories,
                        "care_level": care_level, "model": used_model, "disclaimer": disclaimer})
    except Exception as exc:
        return jsonify({"success": False, "message": "Could not analyze the skin image.", "detail": str(exc)}), 502

if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5050"))
    app.run(host="127.0.0.1", port=port, debug=False, use_reloader=False)
