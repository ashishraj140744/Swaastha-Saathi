# 🩺 Swaastha-Saathi

## 🌿 AI-Assisted Rural Healthcare & Telemedicine Platform

**Swaastha-Saathi** is a full-stack healthcare platform designed to make healthcare more accessible, especially for rural and underserved communities.

It brings patients, doctors, nurses, medicines, health education, blood donation, pregnancy tracking, nearby healthcare facilities, insurance, and community health services together in one platform.

> ⚠️ **Medical Disclaimer:** Swaastha-Saathi is a healthcare assistance and care-routing platform. It does not replace professional medical diagnosis, treatment, or emergency medical services.

---

## ✨ Features

### 🔐 Authentication
- 🔑 JWT-based authentication
- 👤 Patient registration and login
- 👨‍⚕️ Doctor registration and login
- 👩‍⚕️ Nurse support workflow
- 🔒 Protected APIs
- 🚪 Logout and session handling

### 🏠 Patient Dashboard
Access all major healthcare services from one place:
- 🩺 Symptom Tracker
- 👨‍⚕️ Find a Doctor
- 💻 Virtual Consultation
- 🏥 Meet Doctor
- 👩‍⚕️ Nurse Support
- 🩸 Blood Donation
- 🤰 Pregnancy & Period Tracker
- 🧴 Skin Health
- 💊 Order Medicines
- 🏡 Village Health Hub
- 📍 Nearby Facilities & NGO Camps
- 🛡️ Health Insurance
- 📚 Health Education
- 💬 Feedback & Suggestions
- 📋 Recent Activity
- 📑 Requests & Appointments

---

## 👨‍⚕️ Doctor Dashboard

Doctors get a dedicated clinical workspace instead of the patient dashboard. It includes:

- 📅 Today's appointment queue
- 👥 Patient request count
- 🖥️ Virtual consultation count
- 🩺 Open appointment count
- ⚡ Doctor quick actions
- 📋 Patient requests
- 🗓️ Availability access
- 🧠 Clinical support through the symptom workflow
- 💬 Feedback access
- 🟢 Consultation availability status

The patient dashboard remains unchanged and continues to focus on patient care, health tools and community services.

### 🔑 Login Roles

The application currently provides two login roles:

- ♙ **Patient** — access healthcare services and health tools
- ⚕ **Doctor** — access the dedicated doctor workspace and consultation workflow

The separate pharmacist login option has been removed from the authentication screen.

---

## 🩺 Symptom Tracker

The symptom tracker combines a local triage engine with an optional AI conversational assistant.

### 🧠 Local Triage Engine
The system can handle symptoms related to:
- 🤒 Fever
- 😷 Cough and cold
- 🫁 Respiratory symptoms
- 🤢 Digestive problems
- 🧴 Skin problems
- 🤕 Headache
- 🤰 Pregnancy-related symptoms
- 👶 Child health
- 🚻 Urinary symptoms
- 👁️ Eye problems
- 👂 Ear problems
- 🦷 Dental problems
- 🦴 Joint and muscle pain
- 🩸 Menstrual symptoms
- 🌿 Allergies
- ❤️ Blood pressure and palpitations

It also checks for 🚨 emergency red flags.

### 🤖 Swaastha AI Chat
The optional Gemini-powered assistant can:
- 💬 Have a natural conversation
- ❓ Ask follow-up questions
- 🧠 Understand natural-language symptoms
- 🌐 Support English and Hindi
- 📖 Explain triage results
- 🏥 Guide users toward appropriate care

> 🛡️ The local triage engine remains the safety and urgency layer. AI does not provide a medical diagnosis.

---

## 🚨 Emergency & SOS

Severe symptoms can trigger the emergency workflow.

The system can:
- 🚨 Detect emergency red flags
- 🆘 Trigger SOS support
- 👩‍⚕️ Offer nurse support
- 🏥 Show nearby healthcare facilities
- 📞 Provide emergency guidance
- 👨‍⚕️ Escalate toward a doctor or hospital

### Emergency Flow

```text
🧑 Patient
   ↓
🩺 Symptom Assessment
   ↓
🚨 Severe / High Risk
   ↓
🆘 SOS
   ↓
👩‍⚕️ Nurse Support
   ↓
👨‍⚕️ Doctor / 🏥 Hospital
```

---

## 👩‍⚕️ Nurse Support

Nurse support is designed for high-risk and severe cases.

The nurse dashboard includes:
- 🚨 Emergency queue
- 🟡 High-priority cases
- 👤 Patient information
- 🩺 Symptoms and triage level
- 📞 Contact patient
- 📝 Initial assessment
- 👨‍⚕️ Escalate to doctor
- 🏥 Refer to healthcare facility

> ⚠️ Nurse support does not replace emergency services or qualified medical treatment.

---

## 👨‍⚕️ Doctor Consultation

Patients can choose between two consultation types.

### 💻 Virtual Consultation
- 📹 Video/audio/chat workflow
- 📅 Doctor appointment
- 🖥️ Consultation room
- 🔔 Join consultation

### 🏥 Meet Doctor
- 🏥 In-person consultation
- 📅 Date and time selection
- 📍 Healthcare facility
- 🧭 Directions

The consultation type appears throughout:
- 📋 Requests
- 📊 Dashboard
- 🕘 Recent Activity
- 👨‍⚕️ Doctor dashboard

---

## 🩸 Blood Donation

Swaastha-Saathi supports both requesting and donating blood.

### 🩸 Request Blood
Users can provide:
- 🩸 Blood group
- 🔢 Required units
- 📍 Location
- 📞 Contact information

### ❤️ Donate Blood
Users can register as donors with:
- 🩸 Blood group
- 📍 Location
- 📞 Contact information
- ✅ Donor consent

```text
❤️ Blood Donor
      ↓
🩸 Donation Registry
      ↓
🩸 Blood Request
      ↓
🤝 Potential Donor
```

---

## 🤰 Pregnancy & Period Tracker

The tracker includes:
- 📅 Period tracking
- 🔄 Cycle length
- 🩸 Period duration
- ⏰ Missed period tracking
- 💧 Flow tracking
- 😣 Pain tracking
- 🌸 Fertile-window estimation
- 🤰 Pregnancy milestone calculation
- 📆 Estimated due date
- 👶 Trimester information

### 🌸 Cycle Health Insights

The tracker can flag patterns that may deserve medical attention:
- 🔄 Repeatedly irregular cycles
- 📆 Very long or short cycles
- ⏰ Repeated missed periods
- 🩸 Heavy or prolonged bleeding
- 😣 Severe menstrual pain
- 🩸 Bleeding between periods
- 🩸 Patterns that may be associated with anemia

The system presents these as **possible concerns, not diagnoses**.

---

## 🧴 Skin Health

The Skin Health module provides AI-assisted visual skincare guidance.

Users can:
- 📸 Upload a skin image
- 🔍 Analyze visible skin characteristics
- ✨ Receive general skincare guidance
- 🌟 Generate a personalized glow-up routine
- 🌅 Get morning and night skincare suggestions
- 🥗 Receive lifestyle recommendations

> ⚠️ Skin image analysis is intended for educational/cosmetic guidance and should not be treated as a medical diagnosis.

---

## 💊 Medicine Store

The medicine section provides:
- 🔎 Medicine search
- 🗂️ Categories
- 💰 Prices
- 📦 Stock levels
- 🛒 Add to cart
- ➕ Quantity controls
- ❌ Remove from cart
- 📍 Delivery address
- 📦 Order confirmation
- 🧾 Order history

### 📦 Automatic Stock Reduction

```text
💊 Available Stock
        ↓
🛒 Order Placed
        ↓
📉 Stock Automatically Reduced
```

---

## 🏡 Village Health Hub

The Village Health Hub provides community-level healthcare services:
- 🚨 Emergency support
- 🆘 SOS
- 💊 Medicine availability
- 🏥 Health camps
- 🤝 NGO camps
- 👩‍⚕️ Community health support
- 🏠 Household dashboard
- 📚 Health education
- 📍 Healthcare facilities

---

## 🏠 Household Dashboard

The household dashboard supports community health workers.

It includes:
- 🔎 Household search
- 🎯 Priority filtering
- ⚠️ Health risk information
- 📋 Pending health actions
- 🔴🟡🟢 Priority levels
- 📝 Household health plans

```text
🏠 Household
    ↓
⚠️ Health Risk
    ↓
🎯 Priority
    ↓
👩‍⚕️ Community Health Worker
    ↓
📋 Follow-up / 🏥 Referral
```

---

## 📍 Nearby Facilities & NGO Camps

The application can use the user's location to find nearby healthcare resources.

Supported categories include:
- 🏥 Hospitals
- 🏥 Clinics
- 🏪 PHCs / health centres
- 💊 Pharmacies
- 🩸 Blood banks
- 🤝 NGO/community services
- 🏕️ Health camps

Users can:
- 📍 Detect current location
- 🔎 Search facilities
- 🗂️ Filter facilities
- 📏 Sort by distance
- 🧭 Get directions
- 📞 Call available facilities

---

## 📚 Health Education

Interactive health education topics include:
- 🚰 Safe drinking water
- 🧼 Handwashing
- 🍼 Infant nutrition
- 💉 Vaccination
- 🦟 Mosquito-borne diseases
- 🤰 Maternal care
- ❤️ Blood pressure & heart health
- 🩸 Anaemia
- 🦷 Dental health
- 🧠 Mental wellbeing
- 🥗 Healthy nutrition
- 🦟 Dengue & malaria prevention
- 🫁 TB awareness
- 🧴 Skin hygiene
- 👵 Healthy ageing
- 💧 ORS & diarrhoea
- 🍎 Food safety

Clicking a topic opens detailed information explaining:
- 💡 What it means
- ❤️ Why it matters
- 🛡️ Prevention
- ✅ Practical advice
- 🚨 When to seek professional help

---

## 🛡️ Health Insurance

The insurance module demonstrates a healthcare business model.

Users can:
- 📋 View insurance plans
- ⚖️ Compare coverage
- 👤 Enter age
- 💰 Calculate premium
- 👴 Receive senior-citizen discount
- 📝 Enroll in a demo plan

### 👴 Senior Citizen Discount

Users aged **60 or above** receive the configured senior-citizen discount.

```text
💰 Base Premium: ₹599/month
👴 Age: 65
🎁 Senior Discount: 20%
💳 Final Premium: ₹479/month
```

> ℹ️ This is a demonstration feature. Real insurance implementation would require licensed insurance-provider integration.

---

## 💬 Feedback & Suggestions

Users can submit:
- ⭐ 1–5 star rating
- ❤️ What they liked
- 🛠️ What should be improved
- 🩺 Which feature needs improvement
- 💡 New feature suggestions
- 🐛 Bug reports
- 🎨 UI feedback
- 👤 Name/email
- 🕵️ Anonymous feedback

Feedback is stored through the application backend.

---

## 🌐 Language Support

Swaastha-Saathi supports:
- 🇬🇧 English
- 🇮🇳 Hindi

The language system covers major areas of the application including:
- 🧭 Navigation
- 🏠 Dashboard
- 🩺 Symptom Tracker
- 📚 Health Education
- 🏡 Village Health
- 💊 Medicine Store
- 🩸 Blood Donation
- 🤰 Pregnancy Tracker
- 👨‍⚕️ Consultations
- 💬 Feedback

---


## 🤖 Gemini AI Setup (One-Time)

Swaastha-Saathi now reads the Gemini API key automatically from `backend/.env`.

### 1. Create the local `.env`

Copy:

```text
backend/.env.example
```

to:

```text
backend/.env
```

Then put your Gemini key in it:

```env
GEMINI_API_KEY=AIzaSyYourKeyHere
```

You only need to enter the key **once on that computer**. You do not need to paste it into the website every time.

> 🔒 `backend/.env` is ignored by Git and should never be committed to GitHub. Keep the key in the backend only; it is never sent to the frontend.

### 2. Swaastha AI Symptom Chat

The **Symptom Chat** uses the Gemini API through the Flask backend:

```text
Patient
   ↓
Symptom Chat (Frontend)
   ↓
POST /api/symptom-chat
   ↓
Local triage / emergency check
   ↓
Gemini API (if configured)
   ↓
Swaastha AI response
```

The deterministic local triage engine remains the urgency/safety layer. Gemini is used for the conversational explanation and follow-up questions.

### 3. Start the app

#### 🍎 macOS

Double-click:

```text
START_SWAASTHA_SAATHI.command
```

#### 🪟 Windows

Double-click:

```text
START_SWAASTHA_SAATHI.bat
```

The Windows launcher creates the virtual environment, installs dependencies, starts Flask, starts the frontend, and opens the browser automatically.

### 4. If you change the Gemini key

Edit:

```text
backend/.env
```

and restart the application. No frontend changes are required.

# 🛠️ Technology Stack

### 🎨 Frontend
- 🌐 HTML5
- 🎨 CSS3
- ⚡ JavaScript
- 📱 Responsive UI
- 📍 Browser Geolocation API

### 🐍 Backend
- Python
- Flask
- REST APIs
- JWT Authentication
- bcrypt password hashing

### 📦 Data
- JSON-based storage for the demo
- Local application data

### 🤖 AI
- Gemini API
- Explainable rule-based symptom triage

### 🌍 External Services
- OpenStreetMap / location services
- Gemini API (optional)

---

# 📁 Project Structure

```text
🩺 Swaastha-Saathi/
│
├── 🌐 index.html
├── 🎨 style.css
├── ⚡ script.js
│
├── 🚀 START_SWAASTHA_SAATHI.command
├── 🪟 START_SWAASTHA_SAATHI.bat
├── 📖 README.md
├── 🗺️ ROADMAP.md
├── 🔒 .gitignore
│
└── 📂 backend/
    │
    ├── 🐍 app.py
    ├── 🔐 .env.example
    ├── 🧠 triage_engine.py
    ├── 📦 requirements.txt
    │
    ├── 🩺 symptom_knowledge_base.json
    ├── 👨‍⚕️ doctors.json
    ├── 📍 facilities.json
    ├── 📚 education.json
    ├── 🏠 households.json
    ├── 💊 medicines.json
    │
    ├── 👤 users.json
    ├── 📦 medicine_orders.json
    ├── 🏡 village_requests.json
    └── 💬 feedback.json
```

---

# 🚀 How to Run

## ⭐ Recommended: One-Click Startup

You **do NOT need to manually create a virtual environment or repeatedly enter terminal commands.**

### 🍎 macOS

1. 📥 Download/extract the project.
2. 📂 Open the project folder.
3. 🖱️ Double-click:

```text
🚀 START_SWAASTHA_SAATHI.command
```

The launcher automatically handles the setup and starts Swaastha-Saathi.

### ⚙️ What the launcher does

```text
🖱️ Double-click
      ↓
🐍 Check Python environment
      ↓
📦 Install dependencies if required
      ↓
🔐 Configure local JWT environment
      ↓
🚀 Start Flask backend
      ↓
🌐 Start frontend
      ↓
🌍 Open Swaastha-Saathi
```

The website will normally be available at:

```text
🌐 http://localhost:8080
```

### 🔒 If macOS blocks the launcher

Right-click:

```text
🚀 START_SWAASTHA_SAATHI.command
```

Choose:

```text
▶️ Open
```

Then select **Open** if macOS asks for confirmation.

---

## 🛠️ Troubleshooting: Authentication server

If the login/register screen says **“Authentication server is not running”**:

1. Close old Swaastha-Saathi tabs.
2. Double-click `START_SWAASTHA_SAATHI.command`.
3. Keep the Terminal window open while using the website.
4. Flask runs on `http://127.0.0.1:5050` and the frontend on `http://localhost:8080`.
5. The launcher waits for `/api/health` before opening the browser.

Port **5050** is used locally to avoid a common macOS conflict with port 5000.

Verify the backend with:

```bash
curl http://127.0.0.1:5050/api/health
```

A working backend returns `{"status":"ok"}`.

# 💻 Manual Startup

If you want to run the application manually:

```bash
cd "backend"
```

Create a virtual environment:

```bash
python3 -m venv venv
```

Activate it:

```bash
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Start the backend:

```bash
python3 app.py
```

Backend:

```text
🐍 http://127.0.0.1:5050
```

Start the frontend from the project root:

```bash
python3 -m http.server 8080
```

Open:

```text
🌐 http://localhost:8080
```

---

# 🤖 Gemini AI Setup

Gemini powers the symptom conversation and is configured once on the backend.

1. 🔑 Create a Gemini API key from Google AI Studio.
2. Copy `backend/.env.example` to `backend/.env`.
3. Put your key in:

```env
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

4. Start Swaastha-Saathi normally. The frontend never asks for the key and the key is never sent to browser JavaScript. The Skin Health image flow also sends the uploaded image to the same backend Gemini configuration for a personalized Glow-Up Analysis.

The symptom assistant supports **English, Hinglish (Roman Hindi)** and **Hindi (Devanagari)**. It also normalizes common phonetic spellings such as `bukar/bukhar`, `sir/sar dard`, and `pimple/acne/muhase` before triage.

### 🛡️ Security

Never commit an API key to GitHub.

Do not place secrets directly inside:

```text
❌ index.html
❌ script.js
❌ style.css
```

Keep API credentials on the backend/local configuration.

---

# 🧪 Testing

The local symptom engine can be tested with:

```bash
cd "backend"
python3 test_triage_engine.py
```

---

# 🔐 Security & Production Notes

This project is primarily a college/demo/prototype application.

For production deployment, consider:

- 🔒 HTTPS
- 🗄️ Production database
- 🔐 Environment variables/secrets management
- 🍪 Secure token/cookie handling
- 🚦 Rate limiting
- 📝 Audit logging
- 🔒 Encryption of sensitive health information
- 👥 Strong role-based access control
- 🧹 Input validation
- 🏥 Clinician verification
- 📜 Applicable Indian healthcare/privacy/telemedicine compliance

---

# ⚠️ Medical Disclaimer

Swaastha-Saathi is a healthcare assistance and education platform.

It does **not**:

- ❌ Diagnose diseases
- ❌ Replace doctors
- ❌ Replace nurses
- ❌ Replace emergency services
- ❌ Guarantee medical outcomes

AI-generated information can be incorrect.

🚨 **For severe or emergency symptoms, seek immediate professional medical assistance.**

---

# 🎯 Project Vision

Swaastha-Saathi aims to connect the complete healthcare journey:

```text
                         🧑 PATIENT
                             │
                             ↓
                     🩺 SYMPTOM CHECK
                             │
                             ↓
                         🧠 TRIAGE
                             │
              ┌──────────────┼──────────────┐
              ↓              ↓              ↓
          🟢 SELF-CARE    🟡 DOCTOR      🔴 EMERGENCY
              │              │              │
              │        ┌─────┴─────┐        ↓
              │        ↓           ↓       🆘 SOS
              │      💻 VIRTUAL  🏥 MEET    │
              │        DOCTOR     DOCTOR    ↓
              │           │          │    👩‍⚕️ NURSE
              │           └────┬─────┘       │
              │                ↓             ↓
              │         💊 PRESCRIPTION   👨‍⚕️ DOCTOR
              │                │             │
              ↓                ↓             ↓
         📚 EDUCATION     💊 MEDICINE    🏥 HOSPITAL
                             STORE
```

Alongside the core healthcare journey:

```text
🩸 Blood Donation
🤰 Pregnancy & Period Tracking
🧴 Skin Health
🏡 Village Health
🏠 Household Health
📚 Health Education
📍 Nearby Facilities
🤝 NGO Camps
🛡️ Insurance
💬 Feedback
```

---

# ❤️ Swaastha-Saathi

### 🌿 Technology for accessible healthcare.

**Built with ❤️ using Python, Flask, HTML, CSS, JavaScript, JWT .**

## 🔐 Authentication & Logout

Swaastha-Saathi has two roles: **Patient** and **Doctor**. After login, the dashboard is rendered using the authenticated user's role immediately, so the first dashboard view matches the correct account without requiring a second navigation.

A visible **Log out** button is available at the top-right of the application, and the account menu in the sidebar also supports logout. Logging out clears the JWT session from browser storage and returns to the Sign In screen.

If the app shows an authentication-server error, start the project with `START_SWAASTHA_SAATHI.command` and wait until the backend health check reports that the server is ready.

## Symptom Chat updates

The Symptom Chat now supports three response languages:
- English
- Hinglish (Roman Hindi + simple English)
- Hindi (Devanagari)

The chat also shows an explicit **Doctor guidance** section after triage so the user can understand whether to monitor at home, arrange a same-day assessment, or seek urgent care.

The Gemini API key is loaded from `backend/.env` as `GEMINI_API_KEY`. It is never placed in frontend JavaScript. The backend retries transient Gemini failures and tries fallback models before returning the local triage result.

The Symptom Chat no longer contains the old **Swaastha AI / Configure AI** status card in the top-right corner.
