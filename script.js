// Local development serves the frontend on :8080 and Flask on :5050.
// On Vercel, the frontend and API share the same origin, so use relative /api URLs.
const API_BASE = (location.hostname === "localhost" || location.hostname === "127.0.0.1" || location.hostname === "[::1]")
  ? "http://127.0.0.1:5050"
  : "";

// ================= JWT AUTHENTICATION =================
const authScreen = document.getElementById("authScreen");
const appShell = document.getElementById("appShell");
const authForm = document.getElementById("authForm");
const authToggle = document.getElementById("authToggle");
const loginModeTab = document.getElementById("loginModeTab");
const signupModeTab = document.getElementById("signupModeTab");
const authMessage = document.getElementById("authMessage");
const authRoleButtons = document.querySelectorAll(".auth-role-btn");
let authMode = "login";
let selectedAuthRole = "patient";
let currentUser = null;

function getStoredToken() {
  return localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
}
function getStoredUser() {
  try {
    const raw = localStorage.getItem("user_data") || sessionStorage.getItem("user_data");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function storeSession(data, remember) {
  localStorage.removeItem("auth_token"); localStorage.removeItem("user_data");
  sessionStorage.removeItem("auth_token"); sessionStorage.removeItem("user_data");
  const store = remember ? localStorage : sessionStorage;
  store.setItem("auth_token", data.token);
  store.setItem("user_data", JSON.stringify(data.user));
}
function clearSession() {
  localStorage.removeItem("auth_token"); localStorage.removeItem("user_data");
  sessionStorage.removeItem("auth_token"); sessionStorage.removeItem("user_data");
  currentUser = null;
}
function showAuthMessage(message, type="error") {
  authMessage.hidden = false;
  authMessage.className = `auth-message ${type}`;
  authMessage.textContent = message;
}
function hideAuthMessage() { authMessage.hidden = true; authMessage.textContent = ""; }
function roleLabel(role) { return role.charAt(0).toUpperCase() + role.slice(1); }
function updateRoleUI() {
  const icon = { patient:"♙", doctor:"⚕" }[selectedAuthRole] || "♙";
  const doctorFields = document.getElementById("doctorFields");
  const showDoctor = authMode === "signup" && selectedAuthRole === "doctor";

  document.getElementById("authRoleIcon").textContent = icon;
  doctorFields.hidden = !showDoctor;

  // Never retain or submit role-specific data when it is not applicable.
  if (!showDoctor) {
    document.getElementById("authSpecialization").value = "";
    document.getElementById("authHospital").value = "";
    document.getElementById("authLicense").value = "";
  }
}
function resetAuthForm() {
  authForm.reset();
  document.getElementById("authName").value = "";
  document.getElementById("authPhone").value = "";
  hideAuthMessage(); updateRoleUI();
}
function updateAuthMode() {
  const signup = authMode === "signup";
  loginModeTab.classList.toggle("active", !signup);
  signupModeTab.classList.toggle("active", signup);
  loginModeTab.setAttribute("aria-selected", String(!signup));
  signupModeTab.setAttribute("aria-selected", String(signup));
  document.getElementById("authTitle").textContent = signup ? "Create Account" : "Welcome Back";
  document.getElementById("authSubtitle").textContent = signup
    ? "Join our healthcare community and make a difference"
    : "Sign in to access your healthcare dashboard";
  document.getElementById("signupFields").hidden = !signup;
  document.getElementById("authSubmit").innerHTML = signup ? 'Create Account <span>→</span>' : 'Sign In <span>→</span>';
  document.getElementById("authSwitchText").textContent = signup ? "Already have an account?" : "Don't have an account?";
  document.getElementById("authToggle").textContent = signup ? "Sign In" : "Create Account";
  document.getElementById("forgotPassword").style.display = signup ? "none" : "inline";
  document.getElementById("authPassword").autocomplete = signup ? "new-password" : "current-password";
  resetAuthForm();
  const panel = document.querySelector(".auth-form-panel");
  if (panel) panel.scrollTop = 0;
}
function showApp(user) {
  currentUser = user;
  authScreen.hidden = true;
  appShell.hidden = false;
  const name = user?.name || "User";
  document.getElementById("sidebarUserName").textContent = name;
  document.getElementById("sidebarUserRole").textContent = roleLabel(user?.role || "patient");
  document.getElementById("sidebarUserAvatar").textContent = { patient:"♙", doctor:"⚕" }[user?.role] || "♙";

  // Render the dashboard only after the authenticated user is known.
  // Previously the dashboard could render once as a guest during page boot,
  // then look correct only after visiting another section and returning.
  switchToView("dashboard", { pushHistory: false });
}
function showLogin() {
  authScreen.hidden = false;
  appShell.hidden = true;
}
async function authFetch(url, options = {}) {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(url, { ...options, headers });
  if (response.status === 401) {
    clearSession(); showLogin(); showAuthMessage("Your session has expired. Please sign in again.");
  }
  return response;
}

async function verifyExistingSession() {
  const token = getStoredToken();
  const cachedUser = getStoredUser();
  if (!token || !cachedUser) { showLogin(); return; }
  try {
    const res = await fetch(`${API_BASE}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error("Invalid session");
    const data = await res.json();
    storeSession({ token, user: data.user }, localStorage.getItem("auth_token") === token);
    showApp(data.user);
  } catch {
    clearSession(); showLogin();
  }
}

authRoleButtons.forEach(btn => btn.addEventListener("click", () => {
  authRoleButtons.forEach(b => b.classList.remove("active"));
  btn.classList.add("active"); selectedAuthRole = btn.dataset.role; updateRoleUI();
}));
function setAuthMode(mode) {
  authMode = mode;
  updateAuthMode();
}
authToggle.addEventListener("click", () => setAuthMode(authMode === "login" ? "signup" : "login"));
loginModeTab.addEventListener("click", () => setAuthMode("login"));
signupModeTab.addEventListener("click", () => setAuthMode("signup"));
document.getElementById("togglePassword").addEventListener("click", (e) => {
  const input = document.getElementById("authPassword");
  input.type = input.type === "password" ? "text" : "password";
  e.currentTarget.textContent = input.type === "password" ? "Show" : "Hide";
});
document.getElementById("forgotPassword").addEventListener("click", () => showAuthMessage("Password reset is not configured in this local JWT demo. Create a new account or use your existing password.", "error"));
async function performLogout() {
  try { await authFetch(`${API_BASE}/api/auth/logout`, { method: "POST" }); } catch {}
  clearSession();
  showLogin();
  authMode = "login";
  updateAuthMode();
  showAuthMessage("You have been logged out.", "success");
  window.scrollTo({ top: 0, behavior: "instant" });
}

document.getElementById("logoutBtn")?.addEventListener("click", performLogout);
document.getElementById("globalLogoutBtn")?.addEventListener("click", performLogout);

authForm.addEventListener("submit", async (event) => {
  event.preventDefault(); hideAuthMessage();
  const submit = document.getElementById("authSubmit");
  submit.disabled = true;
  const payload = {
    name: document.getElementById("authName").value.trim(),
    email: document.getElementById("authEmail").value.trim(),
    password: document.getElementById("authPassword").value,
    phone: document.getElementById("authPhone").value.trim(),
    role: selectedAuthRole,
    age: document.getElementById("authAge")?.value ? Number(document.getElementById("authAge").value) : null,
  };

  if (authMode === "signup" && selectedAuthRole === "doctor") {
    Object.assign(payload, {
      specialization: document.getElementById("authSpecialization").value.trim(),
      hospital: document.getElementById("authHospital").value.trim(),
      license_number: document.getElementById("authLicense").value.trim(),
    });
  }

  try {
    const endpoint = authMode === "login" ? "/api/auth/login" : "/api/auth/register";
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || "Authentication failed.");
    storeSession(data.data, document.getElementById("rememberMe").checked);
    showAuthMessage(authMode === "login" ? "Login successful!" : "Registration successful!", "success");
    setTimeout(() => showApp(data.data.user), 300);
  } catch (error) {
    const message = error instanceof TypeError && /fetch/i.test(error.message)
      ? "Authentication server is not running. Please start Swaastha-Saathi with START_SWAASTHA_SAATHI.command and try again."
      : (error.message || "Unable to connect to the authentication server.");
    showAuthMessage(message);
  } finally { submit.disabled = false; }
});

updateAuthMode();
verifyExistingSession();

// script.js — Swaastha Saathi combined platform
let currentLang = "en";

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ================= TOASTS =================
const toastContainer = document.getElementById("toastContainer");
function showToast(message, type = "info") {
  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span>${escapeHtml(message)}</span>`;
  toastContainer.appendChild(el);
  setTimeout(() => {
    el.classList.add("toast-out");
    setTimeout(() => el.remove(), 220);
  }, 4200);
}

// ================= VIEW SWITCHING ==================
const navItems = document.querySelectorAll(".nav-item");
const views = document.querySelectorAll(".view");

let currentView = "dashboard";
let isHistoryNavigation = false;

function switchToView(targetView, { pushHistory = true } = {}) {
  const el = document.getElementById(`view-${targetView}`);
  if (!el) return;

  currentView = targetView;
  navItems.forEach((n) => n.classList.toggle("active", n.dataset.view === targetView));
  views.forEach((v) => v.classList.remove("active"));
  el.classList.add("active");

  // Make the SPA behave like normal pages: browser Back/Forward now works.
  if (pushHistory && !isHistoryNavigation) {
    history.pushState({ view: targetView }, "", `#${targetView}`);
  }
  // Always start the new view at the top so returning to it feels natural.
  window.scrollTo({ top: 0, behavior: "instant" });

  if (targetView === "facilities") loadFacilities();
  if (targetView === "asha") loadHouseholds();
  if (targetView === "education") loadEducation();
  if (targetView === "doctors") loadDoctorFilters().then(() => searchDoctors());
  if (targetView === "dashboard") loadDashboard(true);
  if (targetView === "requests") loadRequests();
  if (targetView === "health-tools") renderToolCards();
  if (targetView === "blood-donation") initBloodDonation();
  if (targetView === "pregnancy") initPregnancyTracker();
  if (targetView === "nurse-support") initNurseSupport();
  if (targetView === "skin-prediction") initSkinScreening();
  if (targetView === "village-health") loadVillageHealth();
  if (targetView === "order-medicine") loadMedicineStore();
  if (targetView === "insurance") initInsurance();
  if (targetView === "feedback") initFeedback();
  setTimeout(() => applyWholePageLanguage(currentLang), 120);
}

navItems.forEach((item) => {
  item.addEventListener("click", () => switchToView(item.dataset.view));
});

// Browser Back/Forward support for this single-page application.
window.addEventListener("popstate", (event) => {
  const viewFromState = event.state?.view || window.location.hash.replace("#", "") || "dashboard";
  isHistoryNavigation = true;
  switchToView(viewFromState, { pushHistory: false });
  isHistoryNavigation = false;
});

// Restore a deep-linked view such as /#village-health after refresh.
const initialView = window.location.hash.replace("#", "");
if (initialView && document.getElementById(`view-${initialView}`)) {
  history.replaceState({ view: initialView }, "", `#${initialView}`);
  switchToView(initialView, { pushHistory: false });
} else {
  history.replaceState({ view: "dashboard" }, "", "#dashboard");
}


// Quick-action buttons on the dashboard reuse the same nav switching.
document.querySelectorAll(".quick-action-btn[data-view]").forEach((btn) => {
  btn.addEventListener("click", () => switchToView(btn.dataset.view));
});

// ---------- Whole UI language switching ----------
const langBtns = document.querySelectorAll(".lang-btn");
const originalTextNodes = new WeakMap();
const originalAttrs = new WeakMap();
let applyingLanguage = false;
const uiText = {
  en:{title:"Describe how you're feeling",subtitle:"Describe your symptoms and get guidance on whether you should see a doctor.",greeting:"Namaste 🙏 Tell me your symptoms in your own words. I can reply in English, Hinglish or Hindi.",placeholder:"e.g. mujhe 3 din se bukhar hai...",send:"Send"},
  hinglish:{title:"Apni tabiyat ke baare mein batayein",subtitle:"Apne symptoms batayein aur jaaniye ki doctor ko kab dikhana chahiye.",greeting:"Namaste 🙏 Apne symptoms apne words mein bataiye. Main English, Hinglish ya Hindi mein reply kar sakta hoon.",placeholder:"jaise: mujhe 3 din se bukhar hai...",send:"Send"},
  hi:{title:"अपनी तबीयत के बारे में बताएं",subtitle:"अपने लक्षण बताएं और जानें कि डॉक्टर को कब दिखाना चाहिए।",greeting:"नमस्ते 🙏 अपने लक्षण अपने शब्दों में बताएं। मैं अंग्रेज़ी, हिंग्लिश या हिंदी में जवाब दे सकता हूँ।",placeholder:"जैसे: मुझे 3 दिन से बुखार है...",send:"भेजें"}
};
const chatTranslations = {
  en:{doctor:"Doctor guidance",seeNow:"Please see a doctor or health worker promptly.",seeToday:"Please arrange a doctor or health-worker assessment today if possible.",selfCare:"You can usually start with self-care and monitor your symptoms. See a doctor if symptoms worsen, persist, or you develop warning signs.",oneQuestion:"One question",emergency:"Emergency"},
  hinglish:{doctor:"Doctor ko kab dikhana hai",seeNow:"Please doctor ya health worker ko jaldi dikhaiye.",seeToday:"Agar possible ho to aaj hi doctor ya health worker se assessment karwa lijiye.",selfCare:"Abhi aap self-care kar sakte hain aur symptoms monitor karein. Agar symptoms badhein, zyada der rahein, ya warning signs aayein to doctor ko dikhaiye.",oneQuestion:"Ek sawaal",emergency:"Emergency"},
  hi:{doctor:"डॉक्टर की सलाह",seeNow:"कृपया जल्द से जल्द डॉक्टर या स्वास्थ्यकर्मी को दिखाएं।",seeToday:"यदि संभव हो तो आज ही डॉक्टर या स्वास्थ्यकर्मी से जांच कराएं।",selfCare:"फिलहाल आप घर पर देखभाल कर सकते हैं और लक्षणों पर नज़र रखें। लक्षण बढ़ें, लंबे समय तक रहें या चेतावनी के संकेत दिखें तो डॉक्टर को दिखाएं।",oneQuestion:"एक सवाल",emergency:"आपातकाल"}
};
const translations = {
  "Dashboard":"डैशबोर्ड", "Overview":"अवलोकन", "For Patients":"मरीजों के लिए", "For ASHA Workers":"आशा कार्यकर्ताओं के लिए", "Health Tools":"स्वास्थ्य उपकरण", "More":"अधिक",
  "Symptom Chat":"लक्षण चैट", "Find a Doctor":"डॉक्टर खोजें", "Facilities & NGOs":"स्वास्थ्य केंद्र और NGO", "Household Dashboard":"घरेलू डैशबोर्ड", "Health Education":"स्वास्थ्य शिक्षा", "Requests":"अनुरोध", "Order Medicines":"दवाइयां ऑर्डर करें", "Lab Tests":"लैब टेस्ट", "Health Records":"स्वास्थ्य रिकॉर्ड", "Insurance":"बीमा", "How this works":"यह कैसे काम करता है",
  "Welcome back 🙏":"वापसी पर स्वागत है 🙏", "Your healthcare activity, upcoming care and useful tools — all in one place.":"आपकी स्वास्थ्य गतिविधियां, आगामी देखभाल और उपयोगी उपकरण — सब एक जगह।", "Care overview":"देखभाल का अवलोकन", "View requests →":"अनुरोध देखें →", "Recent activity":"हाल की गतिविधि", "Clear":"साफ़ करें", "Start a symptom check":"लक्षण जांच शुरू करें", "Find nearby care":"नज़दीकी देखभाल खोजें",
  "Blood Donation":"रक्तदान", "Find donors, requests & blood banks":"डोनर, अनुरोध और ब्लड बैंक खोजें", "Pregnancy & Period":"गर्भावस्था और पीरियड", "Cycle tracking and pregnancy milestones":"साइकिल ट्रैकिंग और गर्भावस्था की जानकारी", "Skin Health":"त्वचा स्वास्थ्य", "Upload a photo for an AI screening demo":"AI स्क्रीनिंग के लिए फोटो अपलोड करें", "Village Health Hub":"ग्राम स्वास्थ्य केंद्र", "Local facilities, services & health resources":"स्थानीय सुविधाएं, सेवाएं और स्वास्थ्य संसाधन",
  "Describe how you're feeling":"आप कैसा महसूस कर रहे हैं बताएं", "This assistant suggests where to seek care. It does not replace a doctor's diagnosis.":"यह सहायक आपको उचित देखभाल तक पहुंचने में मदद करता है। यह डॉक्टर की जांच का विकल्प नहीं है।", "Namaste 🙏 Tell me your symptoms in your own words — English or Hindi, either is fine.":"नमस्ते 🙏 अपने लक्षण अपने शब्दों में बताएं — हिंदी या अंग्रेज़ी, दोनों ठीक हैं।", "Send":"भेजें", "Find a Doctor":"डॉक्टर खोजें", "Search by speciality, date, or location — book a slot instantly.":"विशेषज्ञता, तारीख या स्थान से खोजें — तुरंत स्लॉट बुक करें।", "All Specialities":"सभी विशेषज्ञताएं", "All Locations":"सभी स्थान", "All Specialities":"सभी विशेषज्ञताएं",
  "Health Tools":"स्वास्थ्य उपकरण", "Quick access to the services inspired by the Nabha platform modules.":"नाभा प्लेटफॉर्म से प्रेरित स्वास्थ्य सेवाओं तक त्वरित पहुंच।", "Requests & Appointments":"अनुरोध और अपॉइंटमेंट", "Your bookings and healthcare actions are stored locally so they remain visible after navigation.":"आपकी बुकिंग और स्वास्थ्य गतिविधियां स्थानीय रूप से सुरक्षित रहती हैं ताकि नेविगेशन के बाद भी दिखाई दें।",
  "Pregnancy & Period Tracker":"गर्भावस्था और पीरियड ट्रैकर", "Skin Disease Screening":"त्वचा रोग स्क्रीनिंग", "Not a diagnosis.":"यह निदान नहीं है।", "Blood request created":"रक्त अनुरोध बनाया गया", "Every drop can help":"हर बूंद मदद कर सकती है",
  "Village Health Hub":"ग्राम स्वास्थ्य केंद्र", "A simple local hub for rural health resources, services and emergency support.":"ग्रामीण स्वास्थ्य संसाधनों, सेवाओं और आपातकालीन सहायता का स्थानीय केंद्र।", "Request ASHA support":"आशा सहायता मांगें", "Register for a camp":"स्वास्थ्य शिविर में पंजीकरण", "Medicine availability":"दवाइयों की उपलब्धता", "Upcoming health camps":"आगामी स्वास्थ्य शिविर",
  "Nearby Facilities & NGO Camps":"नज़दीकी स्वास्थ्य केंद्र और NGO शिविर", "Health centres, hospitals, and NGO health camps near you.":"आपके पास स्वास्थ्य केंद्र, अस्पताल और NGO स्वास्थ्य शिविर।", "Search by name or type...":"नाम या प्रकार से खोजें...", "Household Visit Priority":"घरेलू विज़िट प्राथमिकता", "Health Education Topics":"स्वास्थ्य शिक्षा विषय",
  "Order Medicines":"दवाइयां ऑर्डर करें", "Search essential medicines, add them to your cart, and get them delivered to your village or home.":"जरूरी दवाइयां खोजें, कार्ट में जोड़ें और घर या गांव में डिलीवरी पाएं।", "All categories":"सभी श्रेणियां", "Your Cart":"आपकी कार्ट", "Your cart is empty.":"आपकी कार्ट खाली है।", "Add a medicine to begin.":"शुरू करने के लिए दवा जोड़ें।", "Total":"कुल", "Home delivery":"होम डिलीवरी", "Proceed to Checkout":"चेकआउट करें", "Recent medicine orders":"हाल के दवा ऑर्डर", "Refresh":"रिफ्रेश करें",
  "How Swaastha Saathi works":"स्वास्थ्य साथी कैसे काम करता है", "1. You describe symptoms":"1. आप अपने लक्षण बताते हैं", "2. AI-assisted triage":"2. AI-सहायित ट्रायेज", "3. We route you, not diagnose you":"3. हम आपको सही जगह भेजते हैं, निदान नहीं करते", "4. ASHA workers get smart prioritization":"4. आशा कार्यकर्ताओं को स्मार्ट प्राथमिकता मिलती है", "In a real emergency":"वास्तविक आपातकाल में", "Call 108 (ambulance) or go to the nearest hospital immediately. Don't wait for any app.":"108 (एम्बुलेंस) पर कॉल करें या तुरंत नज़दीकी अस्पताल जाएं। किसी ऐप का इंतजार न करें।",
  "Feedback & Suggestions":"प्रतिक्रिया और सुझाव", "Tell us about your experience":"अपने अनुभव के बारे में बताएं", "Overall experience":"समग्र अनुभव", "What did you like?":"आपको क्या पसंद आया?", "What should we improve?":"हमें क्या सुधारना चाहिए?", "Which area needs improvement most?":"किस क्षेत्र में सबसे अधिक सुधार चाहिए?", "What feature should we add next?":"अगला कौन सा फीचर जोड़ना चाहिए?", "Report a problem (optional)":"समस्या बताएं (वैकल्पिक)", "Submit anonymously":"गुमनाम रूप से भेजें", "Submit Feedback":"प्रतिक्रिया भेजें", "Your voice matters":"आपकी राय महत्वपूर्ण है", "Insurance":"बीमा", "Health Insurance":"स्वास्थ्य बीमा", "Affordable protection for your family":"आपके परिवार के लिए किफायती सुरक्षा", "Enrollment summary":"पंजीकरण सारांश", "How Swaastha Sathi earns":"स्वास्थ्य साथी की आय कैसे होगी",
  "Sign In":"साइन इन", "Create Account":"खाता बनाएं", "Welcome Back":"वापसी पर स्वागत है", "Select Your Role":"अपनी भूमिका चुनें", "Patient":"मरीज", "Doctor":"डॉक्टर", "Pharmacist":"फार्मासिस्ट", "For patients":"मरीजों के लिए", "For doctors":"डॉक्टरों के लिए", "For pharmacies":"फार्मेसी के लिए", "Full Name":"पूरा नाम", "Phone Number":"फोन नंबर", "Email Address":"ईमेल पता", "Password":"पासवर्ड", "Remember me":"मुझे याद रखें", "Forgot password?":"पासवर्ड भूल गए?",
  "Fever":"बुखार", "Cough & cold":"खांसी और जुकाम", "Headache":"सिरदर्द", "Stomach pain":"पेट दर्द", "Skin rash":"त्वचा पर दाने", "Urine burning":"पेशाब में जलन", "Eye problem":"आंख की समस्या", "Ear problem":"कान की समस्या", "Tooth pain":"दांत दर्द", "Joint pain":"जोड़ों का दर्द", "Dizziness":"चक्कर", "Period health":"पीरियड स्वास्थ्य", "Allergy":"एलर्जी", "BP / Palpitations":"BP / धड़कन",
};
const placeholderTranslations = {
  "e.g. mujhe 3 din se bukhar hai...":"जैसे: मुझे 3 दिन से बुखार है...",
  "Search medicines, categories...":"दवाइयां या श्रेणी खोजें...", "Search by name or type...":"नाम या प्रकार से खोजें...", "Enter your full name":"अपना पूरा नाम दर्ज करें", "Enter your phone number":"अपना फोन नंबर दर्ज करें", "Enter your password":"अपना पासवर्ड दर्ज करें"
};
function directTextNodes(el){ return [...el.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE && n.textContent.trim()); }
function updateChatLanguage(lang){
  const t=uiText[lang] || uiText.en;
  const title=document.getElementById("chat-title");
  const subtitle=document.getElementById("chat-subtitle");
  const greeting=document.getElementById("greeting-text");
  const input=document.getElementById("chatInput");
  const send=document.getElementById("sendBtn");
  if(title) title.textContent=t.title;
  if(subtitle) subtitle.textContent=t.subtitle;
  if(greeting) greeting.textContent=t.greeting;
  if(input) input.placeholder=t.placeholder;
  if(send) send.textContent=t.send;
}
function applyWholePageLanguage(lang){
  if(applyingLanguage) return;
  applyingLanguage = true;
  document.documentElement.lang = lang === "hi" ? "hi" : "en";
  document.querySelectorAll("body *").forEach(el=>{
    directTextNodes(el).forEach(node=>{
      if(!originalTextNodes.has(node)) originalTextNodes.set(node, node.textContent);
      const original=originalTextNodes.get(node).trim();
      const translated=lang === "hi" ? (translations[original] || original) : original;
      const leading=node.textContent.match(/^\s*/)?.[0] || "";
      const trailing=node.textContent.match(/\s*$/)?.[0] || "";
      node.textContent = leading + translated + trailing;
    });
  });
  document.querySelectorAll("input,textarea").forEach(el=>{
    if(!originalAttrs.has(el)) originalAttrs.set(el, el.getAttribute("placeholder") || "");
    const original=originalAttrs.get(el);
    if(original) el.placeholder=lang === "hi" ? (placeholderTranslations[original] || original) : original;
  });
  document.querySelectorAll(".chip[data-symptom]").forEach(chip=>{
    const original=chip.dataset.originalLabel || chip.textContent.trim();
    chip.dataset.originalLabel=original;
    chip.childNodes.forEach(n=>{ if(n.nodeType===Node.TEXT_NODE) n.remove(); });
    chip.appendChild(document.createTextNode(" " + (lang === "hi" ? (translations[original] || original) : original)));
  });
  updateChatLanguage(lang);
  renderGlowGuide();
  applyingLanguage = false;
}
langBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    langBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentLang = btn.dataset.lang;
    applyWholePageLanguage(currentLang);
    renderHealthTip();
  });
});

// ================= HEALTH TIP BANNER =================
const healthTips = {
  en: [
    "Boil or filter drinking water during monsoon to avoid waterborne illness.",
    "A fever lasting more than 3 days should be checked by a health worker.",
    "Wash hands with soap before meals and after using the toilet.",
    "Keep ORS packets at home — they're the first response to dehydration.",
    "Complete your child's full vaccination schedule, even if they seem healthy.",
  ],
  hinglish: [
    "Monsoon mein paani boil ya filter karke piyein taaki waterborne illness se bacha ja sake.",
    "Agar fever 3 din se zyada rahe to health worker ya doctor se check karayein.",
    "Khane se pehle aur toilet ke baad soap se haath dhoyein.",
    "Ghar mein ORS packets rakhein — dehydration mein useful hote hain.",
    "Bachche ka vaccination schedule complete rakhein, chahe woh healthy dikhe.",
  ],
  hi: [
    "मानसून में पानी उबालकर या छानकर पिएं ताकि जलजनित बीमारियों से बचा जा सके।",
    "3 दिन से ज़्यादा बुखार हो तो स्वास्थ्यकर्मी से जांच कराएं।",
    "खाने से पहले और शौच के बाद साबुन से हाथ धोएं।",
    "घर में ORS पैकेट रखें — निर्जलीकरण में यह पहली मदद है।",
    "बच्चे का पूरा टीकाकरण करवाएं, भले ही वह स्वस्थ दिखे।",
  ],
};
let tipIndex = 0;
let tipTimer = null;

function renderHealthTip() {
  const tips = healthTips[currentLang];
  const textEl = document.getElementById("healthTipText");
  const dotsEl = document.getElementById("healthTipDots");
  textEl.style.animation = "none";
  // Force reflow so the fade-in animation replays.
  void textEl.offsetWidth;
  textEl.style.animation = "";
  textEl.textContent = tips[tipIndex % tips.length];
  dotsEl.innerHTML = tips.map((_, i) =>
    `<span class="health-tip-dot ${i === tipIndex % tips.length ? "active" : ""}"></span>`
  ).join("");
}

function startHealthTipRotation() {
  clearInterval(tipTimer);
  tipTimer = setInterval(() => {
    tipIndex++;
    renderHealthTip();
  }, 6000);
}

document.getElementById("healthTipBanner").addEventListener("mouseenter", () => clearInterval(tipTimer));
document.getElementById("healthTipBanner").addEventListener("mouseleave", startHealthTipRotation);

renderHealthTip();
startHealthTipRotation();

// ================= QUICK SYMPTOM CHIPS =================
document.querySelectorAll(".chip[data-symptom]").forEach((chip) => {
  chip.addEventListener("click", () => {
    const text = chip.dataset.symptom;
    sendMessage(text);
  });
});

// ================= CHAT / TRIAGE =================
const chatWindow = document.getElementById("chatWindow");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");
let symptomChatHistory = [];

function appendUserMessage(text) {
  const div = document.createElement("div");
  div.className = "msg msg-user";
  div.innerHTML = `<div class="msg-bubble">${escapeHtml(text)}</div>`;
  chatWindow.appendChild(div);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function appendBotBubble(html) {
  const div = document.createElement("div");
  div.className = "msg msg-bot";
  div.innerHTML = `<div class="msg-bubble">${html}</div>`;
  chatWindow.appendChild(div);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function urgencyLabel(urgency) {
  const labels = {
    high: currentLang === "hi" ? "उच्च प्राथमिकता" : "High Priority",
    medium: currentLang === "hi" ? "मध्यम प्राथमिकता" : "Medium Priority",
    low: currentLang === "hi" ? "कम प्राथमिकता" : "Low Priority",
  };
  return labels[urgency] || urgency;
}

function renderResult(result) {
  const tr = chatTranslations[currentLang] || chatTranslations.en;
  if (result.emergency) {
    createNurseRequest("Emergency / severe symptoms", true);
    appendBotBubble(`<div class="result-card urgency-emergency"><span class="result-badge badge-high">⚠ ${escapeHtml(tr.emergency)}</span><div class="result-title">${escapeHtml(result.message)}</div><div class="result-special-note">🚑 ${escapeHtml(result.doctor_now || tr.seeNow)} Call 108 or go to the nearest emergency facility now. Do not wait for an AI response.</div><button class="btn-secondary" type="button" data-feature-view="nurse-support">👩‍⚕️ Open Nurse Support</button></div>`);
    return;
  }
  if (!result.category) {
    appendBotBubble(`<span>${escapeHtml(result.message || "Please describe your symptoms.")}</span>`);
    return;
  }
  const cat = result.category;
  if (result.urgency === "high") createNurseRequest(`High-priority symptoms: ${cat.name || "health concern"}`, true);
  const urgencyClass = `urgency-${result.urgency}`;
  const badgeClass = `badge-${result.urgency}`;
  let facilitiesHtml = "";
  if (result.facilities && result.facilities.length > 0) {
    facilitiesHtml = `<div class="facility-mini">${result.facilities.map(f => `<div class="facility-mini-item"><span class="facility-mini-name">${escapeHtml(f.name)}</span><span class="facility-mini-dist">${f.distance_km} km away</span></div>`).join("")}</div>`;
  }
  const specialNoteHtml = cat.special_note ? `<div class="result-special-note">${escapeHtml(cat.special_note)}</div>` : "";
  const guidance = result.care_guidance || (result.urgency === "medium" ? tr.seeToday : tr.selfCare);
  const nurseAction = result.urgency === "high" ? `<div class="result-special-note">👩‍⚕️ Nurse support is available for help with initial assessment and escalation.</div><button class="btn-secondary" type="button" data-feature-view="nurse-support">Request / view nurse support</button>` : "";
  appendBotBubble(`<div class="result-card ${urgencyClass}"><span class="result-badge ${badgeClass}">${urgencyLabel(result.urgency)}</span><div class="result-title">${escapeHtml(cat.name)}</div><div class="result-conditions">Possible: ${cat.possible_conditions.join(", ")}</div><div>Suggested specialist: <strong>${escapeHtml(cat.specialist)}</strong></div><div class="result-special-note"><strong>🩺 ${escapeHtml(tr.doctor)}</strong><br>${escapeHtml(guidance)}</div>${specialNoteHtml}${nurseAction}${facilitiesHtml}<div class="result-disclaimer">${escapeHtml(result.disclaimer)}</div></div>`);
}

function renderAiReply(text, followUp) {
  let html = escapeHtml(text).replace(/\n/g, "<br>");
  if (followUp) html += `<div class="panel-soft" style="margin-top:10px;"><strong>💬 ${(chatTranslations[currentLang] || chatTranslations.en).oneQuestion}</strong><br>${escapeHtml(followUp)}</div>`;
  appendBotBubble(html);
}

function demoTriageResult(text) {
  const lower = text.toLowerCase();
  if (/breath|saans|chest pain|seene|unconscious|bleeding|behosh/.test(lower)) return {emergency:true,message:"This sounds urgent. Please call 108 or go to the nearest hospital right away."};
  let category={name:"General / Unspecified",possible_conditions:["Common cold","Mild viral illness"],specialist:"General Physician",special_note:""}; let urgency="low";
  if (/fever|bukhar/.test(lower)){category={name:"Fever",possible_conditions:["Viral fever","Malaria","Typhoid"],specialist:"General Physician",special_note:"If fever crosses 3 days or comes with rash, seek care sooner."};urgency="medium";}
  else if (/cough|khansi|cold|zukam/.test(lower)){category={name:"Respiratory",possible_conditions:["Common cold","Bronchitis"],specialist:"General Physician",special_note:""};}
  else if (/stomach|pet|motion|dast|vomit/.test(lower)){category={name:"Digestive",possible_conditions:["Gastroenteritis","Food poisoning"],specialist:"General Physician",special_note:"Keep sipping ORS to avoid dehydration."};urgency="medium";}
  else if (/skin|rash|khujli|itch/.test(lower)){category={name:"Skin",possible_conditions:["Allergic rash","Fungal infection"],specialist:"Dermatologist",special_note:""};}
  const tr=chatTranslations[currentLang] || chatTranslations.en;
  const care_guidance=urgency === "medium" ? tr.seeToday : tr.selfCare;
  return {category,urgency,care_guidance,facilities:[{name:"Community Health Centre (demo)",distance_km:3.2},{name:"District Hospital (demo)",distance_km:8.7}],disclaimer:"This is guidance, not a diagnosis. Seek professional medical care when needed."};
}

async function sendMessage(text) {
  appendUserMessage(text);
  chatInput.value = "";
  sendBtn.disabled = true;
  const typingDiv=document.createElement("div"); typingDiv.className="msg msg-bot"; typingDiv.id="typingIndicator"; typingDiv.innerHTML=`<div class="msg-bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div>`; chatWindow.appendChild(typingDiv); chatWindow.scrollTop=chatWindow.scrollHeight;
  try {
    const res=await authFetch(`${API_BASE}/api/symptom-chat`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:text,language:currentLang,history:symptomChatHistory.slice(-8)})});
    if(!res.ok) throw new Error(`Server returned ${res.status}`);
    const data=await res.json();
    document.getElementById("typingIndicator")?.remove();
    symptomChatHistory.push({role:"user",text});
    if(data.emergency || data.triage?.emergency){ renderResult(data.triage || data); renderAiReply(data.reply, null); }
    else { if(data.triage?.category) renderResult(data.triage); renderAiReply(data.reply || data.triage?.message || "Please tell me more about your symptoms.", data.follow_up); }
    symptomChatHistory.push({role:"assistant",text:data.reply || ""});
  } catch(err) {
    document.getElementById("typingIndicator")?.remove();
    const fallback=demoTriageResult(text); renderResult(fallback);
    showToast("AI chat unavailable — local symptom triage is still working.","info");
  } finally { sendBtn.disabled=false; chatInput.focus(); }
}

updateChatLanguage(currentLang);

chatForm.addEventListener("submit",e=>{e.preventDefault();const text=chatInput.value.trim();if(text)sendMessage(text);});

document.querySelectorAll(".chip[data-symptom]").forEach(chip=>chip.addEventListener("click",()=>sendMessage(chip.dataset.symptom)));

// ================= SKELETON HELPERS =================
function skeletonGrid(count = 6) {
  return `<div class="skeleton-grid">${Array(count).fill('<div class="skeleton-card"></div>').join("")}</div>`;
}

// ================= FACILITIES =================
const demoFacilities = [
  { type: "Primary Health Centre", name: "Kangra Valley PHC", distance_km: 2.1, specialists_available: ["General Physician", "Nurse"], beds_total: 6, beds_available: 2, category: "clinic" },
  { type: "Community Health Centre", name: "Dharamsala CHC", distance_km: 4.8, specialists_available: ["General Physician", "Gynaecologist"], beds_total: 20, beds_available: 5, category: "hospital" },
  { type: "District Hospital", name: "Zonal Hospital, Kangra", distance_km: 12.3, specialists_available: ["General Physician", "Surgeon", "Paediatrician"], beds_total: 80, beds_available: 14, category: "hospital" },
  { type: "NGO Health Camp", name: "Sahyog Free Health Camp", distance_km: 1.5, specialists_available: ["General Physician"], beds_total: 0, beds_available: 0, note: "Free camp — runs Tue & Fri, 9am–1pm", category: "ngo" },
];

let allFacilitiesCache = [];
let facilityLocation = null;

function facilityCategory(f) {
  const hay = `${f.type || ""} ${f.name || ""} ${f.tags?.healthcare || ""} ${f.tags?.amenity || ""} ${f.tags?.operator || ""}`.toLowerCase();
  if (/pharmacy|chemist|medical store/.test(hay)) return "pharmacy";
  if (/blood bank|blood centre|blood center/.test(hay)) return "blood";
  if (/ngo|charity|community|camp/.test(hay)) return "ngo";
  if (/hospital/.test(hay)) return "hospital";
  return "clinic";
}

function mapsDirectionsUrl(f) {
  if (f.lat != null && f.lon != null) return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${f.lat},${f.lon}`)}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(f.name || "health facility")}`;
}

function renderFacilityCards(list) {
  const grid = document.getElementById("facilityGrid");
  if (!grid) return;
  if (list.length === 0) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-icon">📍</div><strong>No nearby services found</strong><p>Try another filter or use your location again.</p></div>`;
    return;
  }
  grid.innerHTML = list.map((f, i) => `
    <article class="facility-card" style="animation-delay:${i * 55}ms">
      <div class="facility-card-top"><div class="facility-card-type">${escapeHtml(f.type || "Health service")}</div><span class="location-pill">${f.distance_km != null ? `${Number(f.distance_km).toFixed(1)} km` : "Nearby"}</span></div>
      <div class="facility-card-name">${escapeHtml(f.name || "Unnamed facility")}</div>
      ${f.address ? `<div class="facility-address">📍 ${escapeHtml(f.address)}</div>` : ""}
      <div class="facility-card-row"><span>Services</span><span>${escapeHtml((f.specialists_available || []).join(", ") || "Healthcare service")}</span></div>
      ${f.beds_total > 0 ? `<div class="facility-card-row"><span>Beds</span><span class="beds-tag ${f.beds_available > 0 ? "beds-good" : "beds-none"}">${f.beds_available} / ${f.beds_total} available</span></div>` : ""}
      ${f.note ? `<div class="facility-card-note">${escapeHtml(f.note)}</div>` : ""}
      <div class="facility-card-actions"><a class="btn-secondary facility-direction" href="${mapsDirectionsUrl(f)}" target="_blank" rel="noopener">🧭 Get directions</a>${f.phone ? `<a class="text-btn" href="tel:${escapeHtml(f.phone)}">📞 Call</a>` : ""}</div>
    </article>
  `).join("");
}

function applyFacilityFilters() {
  const q = (document.getElementById("facilitySearch")?.value || "").trim().toLowerCase();
  const type = document.getElementById("facilityTypeFilter")?.value || "all";
  const filtered = allFacilitiesCache.filter(f => {
    const matchesQ = !q || `${f.name || ""} ${f.type || ""} ${f.address || ""} ${(f.specialists_available || []).join(" ")}`.toLowerCase().includes(q);
    const matchesType = type === "all" || facilityCategory(f) === type;
    return matchesQ && matchesType;
  });
  renderFacilityCards(filtered);
}

async function loadFacilities() {
  const grid = document.getElementById("facilityGrid");
  if (!grid) return;
  grid.innerHTML = skeletonGrid(4);
  try {
    const res = await authFetch(`${API_BASE}/api/facilities`);
    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    const data = await res.json();
    allFacilitiesCache = (data.facilities || []).map(f => ({...f, category: facilityCategory(f)}));
    renderFacilityCards(allFacilitiesCache);
  } catch (err) {
    allFacilitiesCache = demoFacilities;
    renderFacilityCards(allFacilitiesCache);
    showToast("Showing saved facility data. Use location for live nearby search.", "info");
  }
}

async function fetchNearbyOpenStreetMap(lat, lon) {
  const query = `[out:json][timeout:18];(nwr(around:7000,${lat},${lon})[amenity=hospital];nwr(around:7000,${lat},${lon})[amenity=clinic];nwr(around:7000,${lat},${lon})[amenity=pharmacy];nwr(around:7000,${lat},${lon})[healthcare];nwr(around:7000,${lat},${lon})[amenity=blood_bank];nwr(around:7000,${lat},${lon})[social_facility];);out center tags;`;
  const endpoints = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
  let lastErr;
  for (const endpoint of endpoints) {
    try {
      const res = await fetch(`${endpoint}?data=${encodeURIComponent(query)}`, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`OpenStreetMap service ${res.status}`);
      const json = await res.json();
      return (json.elements || []).map(el => {
        const tags = el.tags || {};
        const lat2 = el.lat ?? el.center?.lat;
        const lon2 = el.lon ?? el.center?.lon;
        const category = facilityCategory({ type: tags.amenity || tags.healthcare || tags.social_facility || "Health service", name: tags.name || "Unnamed facility", tags });
        const typeMap = {hospital:"Hospital", clinic:"Clinic / PHC", pharmacy:"Pharmacy", blood:"Blood Bank", ngo:"NGO / Community Health"};
        const name = tags.name || (typeMap[category] || "Nearby health service");
        return { type: typeMap[category] || "Health service", name, distance_km: haversineKm(lat, lon, lat2, lon2), specialists_available: [tags.healthcare || tags.amenity || "Healthcare"], beds_total: 0, beds_available: 0, address: [tags["addr:street"], tags["addr:suburb"], tags["addr:city"]].filter(Boolean).join(", "), phone: tags.phone || tags["contact:phone"], lat: lat2, lon: lon2, category, tags };
      }).filter(f => f.lat != null && f.lon != null && f.name);
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error("Nearby service unavailable");
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371; const dLat = (lat2-lat1)*Math.PI/180; const dLon=(lon2-lon1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

async function useMyLocationForFacilities() {
  const status = document.getElementById("facilityLocationStatus");
  if (!navigator.geolocation) { showToast("Location is not supported by this browser.", "error"); return; }
  status.textContent = "📍 Getting your location…";
  navigator.geolocation.getCurrentPosition(async pos => {
    facilityLocation = { lat: pos.coords.latitude, lon: pos.coords.longitude };
    try {
      const nearby = await fetchNearbyOpenStreetMap(facilityLocation.lat, facilityLocation.lon);
      // Keep useful saved demo services if live OSM has sparse rural coverage.
      const combined = [...nearby, ...demoFacilities].filter((f, idx, arr) => idx === arr.findIndex(x => x.name.toLowerCase() === f.name.toLowerCase()));
      allFacilitiesCache = combined.sort((a,b) => (a.distance_km ?? 9999) - (b.distance_km ?? 9999));
      status.textContent = `📍 Showing services near your location · ${allFacilitiesCache.length} results within about 7 km. Location stays in this browser session.`;
      applyFacilityFilters();
      showToast("Nearby facilities updated from OpenStreetMap.", "success");
    } catch (e) {
      allFacilitiesCache = demoFacilities.slice().sort((a,b)=>a.distance_km-b.distance_km);
      renderFacilityCards(allFacilitiesCache);
      status.textContent = "📍 Location detected, but live map data was unavailable. Showing saved nearby services.";
      showToast("Live map data is temporarily unavailable; using saved facilities.", "info");
    }
  }, err => {
    status.textContent = "📍 Location permission was not granted. You can still search saved facilities manually.";
    showToast("Please allow location access to personalize nearby results.", "warning");
  }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 });
}

document.getElementById("facilitySearch")?.addEventListener("input", applyFacilityFilters);
document.getElementById("facilityTypeFilter")?.addEventListener("change", applyFacilityFilters);
document.getElementById("useMyLocationBtn")?.addEventListener("click", useMyLocationForFacilities);

// ================= ASHA DASHBOARD =================
const demoHouseholds = [
  { family_name: "Devi household", village: "Sidhbari", members: 5, last_visit_days_ago: 34, risk_factors: ["pregnancy", "elderly_member"], pending_items: ["ANC checkup due"], live_priority_score: 82 },
  { family_name: "Thakur household", village: "Naddi", members: 4, last_visit_days_ago: 21, risk_factors: ["infant_under_1"], pending_items: ["Vaccination due"], live_priority_score: 61 },
  { family_name: "Kumar household", village: "Sidhbari", members: 3, last_visit_days_ago: 9, risk_factors: [], pending_items: [], live_priority_score: 24 },
  { family_name: "Sharma household", village: "McLeod Ganj", members: 6, last_visit_days_ago: 46, risk_factors: ["elderly_member", "chronic_condition"], pending_items: ["BP follow-up", "Medicine refill"], live_priority_score: 91 },
  { family_name: "Rawat household", village: "Naddi", members: 4, last_visit_days_ago: 17, risk_factors: ["pregnancy"], pending_items: ["ANC counselling"], live_priority_score: 55 },
];
let householdCache = [];

async function loadHouseholds() {
  const list = document.getElementById("householdList");
  list.innerHTML = skeletonGrid(3);
  try {
    const res = await authFetch(`${API_BASE}/api/asha/households`);
    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    const data = await res.json();
    householdCache = data.households || [];
    renderHouseholdDashboard(householdCache);
  } catch (err) {
    householdCache = demoHouseholds;
    renderHouseholdDashboard(householdCache);
    showToast("Backend not reachable — showing demo household data.", "info");
  }
  const search = document.getElementById("householdSearch");
  const filter = document.getElementById("householdPriorityFilter");
  if (search && !search.dataset.bound) { search.dataset.bound = "1"; search.addEventListener("input", filterHouseholds); }
  if (filter && !filter.dataset.bound) { filter.dataset.bound = "1"; filter.addEventListener("change", filterHouseholds); }
}
function filterHouseholds() {
  const q = (document.getElementById("householdSearch")?.value || "").trim().toLowerCase();
  const f = document.getElementById("householdPriorityFilter")?.value || "all";
  const filtered = householdCache.filter(h => {
    const score = Number(h.live_priority_score || 0);
    const level = score >= 70 ? "high" : score >= 35 ? "medium" : "low";
    return (!q || `${h.family_name} ${h.village}`.toLowerCase().includes(q)) && (f === "all" || f === level);
  });
  renderHouseholdDashboard(filtered);
}
function renderHouseholdDashboard(households) {
  const summary = document.getElementById("householdSummary");
  if (summary) {
    const high = householdCache.filter(h => Number(h.live_priority_score) >= 70).length;
    const pending = householdCache.reduce((n,h) => n + (h.pending_items || []).length, 0);
    const members = householdCache.reduce((n,h) => n + Number(h.members || 0), 0);
    summary.innerHTML = [
      ["🏠", householdCache.length, "Households"], ["👥", members, "People covered"], ["🔴", high, "High priority"], ["⚠️", pending, "Pending actions"]
    ].map(x => `<div class="household-stat panel"><span>${x[0]}</span><strong>${x[1]}</strong><small>${x[2]}</small></div>`).join("");
  }
  renderHouseholds(households);
}
function renderHouseholds(households) {
  const list = document.getElementById("householdList");
  if (!households.length) { list.innerHTML = `<div class="panel empty-state">No households match this filter.</div>`; return; }
  list.innerHTML = households.map((h, i) => {
    const score = Number(h.live_priority_score || 0);
    const priorityClass = score >= 70 ? "priority-high" : score >= 35 ? "priority-medium" : "priority-low";
    const pendingText = (h.pending_items || []).length ? `⚠ ${h.pending_items.join(", ")}` : "No pending items";
    return `<div class="household-card ${priorityClass}" style="animation-delay:${i * 70}ms">
      <div class="household-rank">${i + 1}</div><div class="household-info">
      <div class="household-name">${escapeHtml(h.family_name)} — ${escapeHtml(h.village)}</div>
      <div class="household-meta">${h.members} members · last visited ${h.last_visit_days_ago} days ago${(h.risk_factors||[]).length ? " · " + h.risk_factors.map(r => r.replace(/_/g, " ")).join(", ") : ""}</div>
      <div class="household-pending">${escapeHtml(pendingText)}</div></div>
      <div class="household-score">${score}</div>
      <button class="text-btn household-action" data-household="${escapeHtml(h.family_name)}">View plan</button>
    </div>`;
  }).join("");
  list.querySelectorAll(".household-action").forEach(btn => btn.onclick = () => {
    const h = householdCache.find(x => x.family_name === btn.dataset.household); if (!h) return;
    const advice = (h.pending_items || []).length ? `Priority follow-up: ${(h.pending_items||[]).join(", ")}.` : "Routine wellness visit, screening and health-education check.";
    showToast(`${h.family_name}: ${advice}`, h.live_priority_score >= 70 ? "warning" : "info");
    saveActivity({color:"var(--color-primary)", text:`Household plan reviewed for <strong>${escapeHtml(h.family_name)}</strong>`, time:"Just now"});
  });
}

const demoEducation = [
  { icon: "💧", title_en: "Safe drinking water", title_hi: "सुरक्षित पेयजल", description_en: "Learn how to store drinking water safely, avoid contamination, and recognise signs that water may be unsafe.", description_hi: "पीने के पानी को सुरक्षित रखने, दूषण से बचने और असुरक्षित पानी के संकेत पहचानने की जानकारी।", actions_en:["Use a clean covered container","Keep drinking water separate from wastewater"], actions_hi:["साफ ढके हुए बर्तन का उपयोग करें","पीने के पानी को गंदे पानी से अलग रखें"] },
  { icon: "🧼", title_en: "Handwashing", title_hi: "हाथ धोना", description_en: "Proper handwashing helps reduce the spread of infections, especially before eating and after using the toilet.", description_hi: "सही तरीके से हाथ धोने से संक्रमण फैलने का खतरा कम होता है, खासकर खाने से पहले और शौचालय के बाद।", actions_en:["Wash with soap and running water","Scrub palms, backs, fingers and nails"], actions_hi:["साबुन और बहते पानी से धोएं","हथेली, उंगलियां और नाखून अच्छी तरह साफ करें"] },
  { icon: "🍼", title_en: "Infant nutrition", title_hi: "शिशु पोषण", description_en: "Understand age-appropriate feeding, growth monitoring and when a child should be assessed by a health worker.", description_hi: "उम्र के अनुसार शिशु आहार, विकास की निगरानी और स्वास्थ्यकर्मी से कब संपर्क करना चाहिए इसकी जानकारी।", actions_en:["Track growth and feeding","Seek help for poor feeding or lethargy"], actions_hi:["विकास और आहार पर नजर रखें","कम आहार या सुस्ती में मदद लें"] },
  { icon: "💉", title_en: "Vaccination schedule", title_hi: "टीकाकरण तालिका", description_en: "Learn why routine vaccines matter and how to keep a child's vaccination record up to date.", description_hi: "नियमित टीकों के महत्व और बच्चे के टीकाकरण रिकॉर्ड को अपडेट रखने की जानकारी।", actions_en:["Keep the immunisation card safe","Ask your health worker about missed doses"], actions_hi:["टीकाकरण कार्ड सुरक्षित रखें","छूटी खुराक के लिए स्वास्थ्यकर्मी से पूछें"] },
  { icon: "🦟", title_en: "Mosquito-borne disease", title_hi: "मच्छर जनित रोग", description_en: "Reduce mosquito exposure and learn when fever after mosquito bites needs medical assessment.", description_hi: "मच्छरों से बचाव और मच्छर के काटने के बाद बुखार होने पर कब चिकित्सकीय जांच जरूरी है।", actions_en:["Use nets/screens and remove standing water","Seek care for persistent or severe fever"], actions_hi:["मच्छरदानी/जाली का उपयोग करें और जमा पानी हटाएं","लगातार या तेज बुखार में जांच कराएं"] },
  { icon: "🤰", title_en: "Maternal care", title_hi: "मातृ देखभाल", description_en: "Learn about antenatal visits, nutrition, warning signs and the importance of skilled care during pregnancy.", description_hi: "गर्भावस्था में जांच, पोषण, चेतावनी संकेत और प्रशिक्षित स्वास्थ्यकर्मी की देखभाल का महत्व।", actions_en:["Attend scheduled antenatal visits","Seek urgent care for bleeding, severe headache or reduced fetal movement"], actions_hi:["निर्धारित गर्भावस्था जांच कराएं","खून आना, तेज सिरदर्द या भ्रूण की हलचल कम होने पर तुरंत मदद लें"] },
  { icon: "🫀", title_en: "Blood pressure & heart health", title_hi: "रक्तचाप और हृदय स्वास्थ्य", description_en: "Learn simple ways to monitor blood pressure and reduce cardiovascular risk.", description_hi: "रक्तचाप की निगरानी और हृदय रोग के जोखिम को कम करने के सरल तरीके।", actions_en:["Check blood pressure as advised","Limit excess salt, tobacco and alcohol; stay physically active"], actions_hi:["सलाह के अनुसार रक्तचाप जांचें","अधिक नमक, तंबाकू और शराब से बचें तथा सक्रिय रहें"] },
  { icon: "🩸", title_en: "Anaemia prevention", title_hi: "एनीमिया से बचाव", description_en: "Understand common signs of anaemia and why iron-rich foods and prescribed supplements matter.", description_hi: "एनीमिया के सामान्य संकेत और आयरन युक्त भोजन व निर्धारित सप्लीमेंट के महत्व को समझें।", actions_en:["Include iron-rich foods such as pulses and leafy greens","Take iron supplements only as advised by a health professional"], actions_hi:["दाल और हरी पत्तेदार सब्जियां जैसे आयरन युक्त भोजन लें","आयरन सप्लीमेंट स्वास्थ्यकर्मी की सलाह से लें"] },
  { icon: "🦷", title_en: "Oral & dental health", title_hi: "मुंह और दांतों की देखभाल", description_en: "Daily oral care can reduce tooth decay, gum disease and avoidable pain.", description_hi: "दांतों और मसूड़ों की रोजाना देखभाल से कैविटी, मसूड़ों की बीमारी और दर्द का जोखिम कम होता है।", actions_en:["Brush twice daily with fluoride toothpaste","See a dentist for persistent pain, swelling or bleeding gums"], actions_hi:["फ्लोराइड टूथपेस्ट से दिन में दो बार ब्रश करें","लगातार दर्द, सूजन या मसूड़ों से खून आने पर दंत चिकित्सक से मिलें"] },
  { icon: "🧠", title_en: "Mental wellbeing", title_hi: "मानसिक स्वास्थ्य", description_en: "Learn healthy ways to manage stress and recognise when emotional support may be needed.", description_hi: "तनाव संभालने के स्वस्थ तरीके और भावनात्मक सहायता की जरूरत पहचानने की जानकारी।", actions_en:["Keep a regular sleep and activity routine","Talk to a trusted person or health professional if distress persists"], actions_hi:["नियमित नींद और दिनचर्या बनाए रखें","परेशानी बनी रहे तो भरोसेमंद व्यक्ति या स्वास्थ्यकर्मी से बात करें"] },
  { icon: "🥗", title_en: "Healthy nutrition", title_hi: "स्वस्थ पोषण", description_en: "Build balanced meals with vegetables, pulses, whole grains, protein and enough water.", description_hi: "सब्जियों, दालों, साबुत अनाज, प्रोटीन और पर्याप्त पानी के साथ संतुलित भोजन की जानकारी।", actions_en:["Aim for variety across food groups","Prefer clean water and limit highly processed foods"], actions_hi:["अलग-अलग खाद्य समूहों से विविध भोजन लें","स्वच्छ पानी पिएं और बहुत अधिक प्रोसेस्ड भोजन सीमित करें"] },
  { icon: "🦟", title_en: "Dengue & malaria prevention", title_hi: "डेंगू और मलेरिया से बचाव", description_en: "Reduce mosquito breeding and know when fever needs prompt assessment.", description_hi: "मच्छरों के प्रजनन को रोकें और बुखार में कब जल्दी जांच जरूरी है यह जानें।", actions_en:["Remove standing water and use nets/screens","Seek care for high or persistent fever, severe weakness or bleeding"], actions_hi:["जमा पानी हटाएं और मच्छरदानी/जाली का उपयोग करें","तेज या लगातार बुखार, कमजोरी या खून आने पर जांच कराएं"] },
  { icon: "🫁", title_en: "TB awareness", title_hi: "टीबी जागरूकता", description_en: "Persistent cough, fever, weight loss or night sweats should be assessed rather than ignored.", description_hi: "लगातार खांसी, बुखार, वजन कम होना या रात में पसीना आने पर जांच कराना जरूरी है।", actions_en:["Seek evaluation for a cough lasting 2 weeks or more","Follow the full treatment plan if TB is diagnosed"], actions_hi:["2 सप्ताह या अधिक की खांसी में जांच कराएं","टीबी होने पर पूरा उपचार स्वास्थ्यकर्मी की सलाह के अनुसार लें"] },
  { icon: "🧴", title_en: "Skin care & hygiene", title_hi: "त्वचा की देखभाल", description_en: "Learn basic skin hygiene and when a rash, wound or changing spot needs professional assessment.", description_hi: "त्वचा की स्वच्छता और कब दाने, घाव या बदलते निशान की चिकित्सकीय जांच जरूरी है।", actions_en:["Keep skin clean and dry; avoid sharing personal towels","Seek care for spreading rash, pus, severe pain or a changing mole"], actions_hi:["त्वचा साफ और सूखी रखें; निजी तौलिया साझा न करें","फैलते दाने, पस, तेज दर्द या बदलते तिल में जांच कराएं"] },
  { icon: "👵", title_en: "Healthy ageing", title_hi: "स्वस्थ वृद्धावस्था", description_en: "Older adults benefit from medication review, fall prevention, activity and regular check-ups.", description_hi: "बुजुर्गों के लिए दवा समीक्षा, गिरने से बचाव, गतिविधि और नियमित जांच महत्वपूर्ण हैं।", actions_en:["Keep a current medicine list","Reduce fall hazards at home and ask about routine health checks"], actions_hi:["दवाओं की अद्यतन सूची रखें","घर में गिरने के जोखिम कम करें और नियमित जांच के बारे में पूछें"] },
  { icon: "🚰", title_en: "Diarrhoea & ORS", title_hi: "दस्त और ORS", description_en: "Most uncomplicated diarrhoea care focuses on preventing dehydration while watching for warning signs.", description_hi: "साधारण दस्त में निर्जलीकरण रोकना और चेतावनी संकेतों पर नजर रखना महत्वपूर्ण है।", actions_en:["Use correctly prepared ORS and continue appropriate feeding","Seek urgent care for severe dehydration, blood in stool or inability to drink"], actions_hi:["सही तरीके से बनाया ORS दें और उचित आहार जारी रखें","तेज निर्जलीकरण, मल में खून या पानी न पी पाने पर तुरंत मदद लें"] },
  { icon: "🧼", title_en: "Food safety", title_hi: "खाद्य सुरक्षा", description_en: "Safe food handling helps prevent food poisoning and intestinal infections.", description_hi: "सुरक्षित भोजन संभालने से फूड पॉइजनिंग और आंतों के संक्रमण का खतरा कम होता है।", actions_en:["Wash hands and produce; cook food thoroughly","Separate raw and cooked foods and refrigerate perishables promptly"], actions_hi:["हाथ और सब्जियां/फल धोएं तथा भोजन अच्छी तरह पकाएं","कच्चे और पके भोजन को अलग रखें और खराब होने वाले भोजन को जल्दी ठंडा करें"] },
];
async function loadEducation() {
  const grid = document.getElementById("educationGrid"); grid.innerHTML = skeletonGrid(6);
  try { const res = await authFetch(`${API_BASE}/api/asha/education`); if (!res.ok) throw new Error(); renderEducation(await res.json().then(d=>d.topics)); }
  catch { renderEducation(demoEducation); showToast("Backend not reachable — showing demo education topics.", "info"); }
}
function renderEducation(topics) {
  // Merge backend topics with the richer local library. Backend content wins on matching titles;
  // the local library fills gaps so the education section remains useful offline.
  const byTitle = new Map();
  [...demoEducation, ...(topics || [])].forEach(t => {
    const key = (t.title_en || t.title_hi || "").trim().toLowerCase();
    const previous = byTitle.get(key) || {};
    byTitle.set(key, { ...previous, ...t, description_en: t.description_en || previous.description_en, description_hi: t.description_hi || previous.description_hi, actions_en: t.actions_en || previous.actions_en, actions_hi: t.actions_hi || previous.actions_hi });
  });
  const enriched = Array.from(byTitle.values());
  const grid = document.getElementById("educationGrid");
  grid.innerHTML = enriched.map((t,i) => `<button type="button" class="education-card" data-education-index="${i}" style="animation-delay:${i*55}ms"><div class="education-icon">${t.icon}</div><div class="education-title">${escapeHtml(currentLang === "hi" ? t.title_hi : t.title_en)}</div><div class="education-more">${currentLang === "hi" ? "जानकारी देखने के लिए क्लिक करें →" : "Click to learn more →"}</div></button>`).join("");
  grid.querySelectorAll(".education-card").forEach(card => card.onclick = () => openEducationTopic(enriched[Number(card.dataset.educationIndex)]));
}
function openEducationTopic(t) {
  const hi = currentLang === "hi"; const title = hi ? (t.title_hi||t.title_en) : t.title_en; const desc = hi ? (t.description_hi||t.description_en) : t.description_en;
  document.getElementById("educationModalIcon").textContent=t.icon; document.getElementById("educationModalTitle").textContent=title; document.getElementById("educationModalDescription").textContent=desc;
  const actions=hi ? (t.actions_hi||t.actions_en||[]) : (t.actions_en||[]); document.getElementById("educationModalActions").innerHTML=actions.map(a=>`<div class="education-action-item">✓ ${escapeHtml(a)}</div>`).join("");
  document.getElementById("educationModal").hidden=false;
}
function closeEducationModal(){ const m=document.getElementById("educationModal"); if(m) m.hidden=true; }
document.addEventListener("click", e => { if(e.target.matches("[data-close-education]")) closeEducationModal(); });

// ================= DOCTOR BOOKING =================
let allDoctorsCache = [];

const demoSpecialities = ["General Physician", "Paediatrician", "Gynaecologist", "Dermatologist"];
const demoLocations = ["Dharamsala", "Kangra", "McLeod Ganj"];
const demoDoctors = [
  { id: "d1", name: "Dr. Anjali Sharma", speciality: "General Physician", location: "Dharamsala", experience_years: 9, rating: 4.6, consultation_fee: 300, available_dates: ["2026-08-24", "2026-08-25"], available_slots: ["10:00 AM", "11:30 AM", "4:00 PM"] },
  { id: "d2", name: "Dr. Rakesh Verma", speciality: "Paediatrician", location: "Kangra", experience_years: 14, rating: 4.8, consultation_fee: 400, available_dates: ["2026-08-24"], available_slots: ["9:00 AM", "1:00 PM"] },
  { id: "d3", name: "Dr. Meera Thakur", speciality: "General Physician", location: "McLeod Ganj", experience_years: 5, rating: 4.4, consultation_fee: 0, available_dates: ["2026-08-25"], available_slots: ["10:00 AM"] },
];

async function loadDoctorFilters() {
  const specSelect = document.getElementById("filterSpeciality");
  const locSelect = document.getElementById("filterLocation");
  if (specSelect.dataset.loaded) return;

  try {
    const res = await authFetch(`${API_BASE}/api/doctors/filters`);
    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    const data = await res.json();
    populateDoctorFilters(data.specialities, data.locations);
  } catch (err) {
    populateDoctorFilters(demoSpecialities, demoLocations);
  }
  specSelect.dataset.loaded = "true";
}

function populateDoctorFilters(specialities, locations) {
  const specSelect = document.getElementById("filterSpeciality");
  const locSelect = document.getElementById("filterLocation");
  specialities.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s; opt.textContent = s;
    specSelect.appendChild(opt);
  });
  locations.forEach(l => {
    const opt = document.createElement("option");
    opt.value = l; opt.textContent = l;
    locSelect.appendChild(opt);
  });
}

function renderDoctorCards(doctors) {
  const list = document.getElementById("doctorList");
  if (doctors.length === 0) {
    list.innerHTML = `<p style="color:var(--color-text-muted);font-size:13px;">No doctors match these filters. Try widening your search.</p>`;
    return;
  }
  list.innerHTML = doctors.map((d, i) => `
    <div class="doctor-card" style="animation-delay:${i * 55}ms">
      <div class="doctor-card-name">${escapeHtml(d.name)}</div>
      <div class="doctor-card-speciality">${escapeHtml(d.speciality)} · ${d.experience_years} yrs exp · ⭐ ${d.rating}</div>
      <div class="doctor-card-meta"><span>${escapeHtml(d.location)}</span></div>
      <div class="doctor-card-meta">
        <span class="doctor-card-fee ${d.consultation_fee === 0 ? 'free' : ''}">${d.consultation_fee === 0 ? "Free (NGO camp)" : `₹${d.consultation_fee}`}</span>
        <span>${d.available_dates.length} dates available</span>
      </div>
      <button class="btn-primary" onclick="openBookingModal('${d.id}')">Book Appointment</button>
    </div>
  `).join("");
}

async function searchDoctors() {
  const list = document.getElementById("doctorList");
  list.innerHTML = skeletonGrid(4);

  const speciality = document.getElementById("filterSpeciality").value;
  const location = document.getElementById("filterLocation").value;
  const date = document.getElementById("filterDate").value;

  const params = new URLSearchParams();
  if (speciality) params.set("speciality", speciality);
  if (location) params.set("location", location);
  if (date) params.set("date", date);

  try {
    const res = await authFetch(`${API_BASE}/api/doctors/search?${params.toString()}`);
    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    const data = await res.json();
    allDoctorsCache = data.doctors;
    renderDoctorCards(allDoctorsCache);
  } catch (err) {
    allDoctorsCache = demoDoctors.filter(d =>
      (!speciality || d.speciality === speciality) &&
      (!location || d.location === location)
    );
    renderDoctorCards(allDoctorsCache);
    showToast("Backend not reachable — showing demo doctor listings.", "info");
  }
}

document.getElementById("filterSpeciality").addEventListener("change", searchDoctors);
document.getElementById("filterLocation").addEventListener("change", searchDoctors);
document.getElementById("filterDate").addEventListener("change", searchDoctors);
document.getElementById("clearFiltersBtn").addEventListener("click", () => {
  document.getElementById("filterSpeciality").value = "";
  document.getElementById("filterLocation").value = "";
  document.getElementById("filterDate").value = "";
  searchDoctors();
});

// ---------- Booking modal ----------
const bookingModal = document.getElementById("bookingModal");
let currentBookingDoctor = null;

function openBookingModal(doctorId) {
  const doctor = allDoctorsCache.find(d => d.id === doctorId);
  if (!doctor) return;
  currentBookingDoctor = doctor;

  document.getElementById("modalDoctorName").textContent = doctor.name;
  document.getElementById("modalDoctorMeta").textContent =
    `${doctor.speciality} · ${doctor.location} · ${doctor.consultation_fee === 0 ? "Free" : "₹" + doctor.consultation_fee}`;
  document.getElementById("modalPatientName").value = "";
  document.getElementById("modalConsultationType").value = "virtual";
  document.getElementById("modalError").textContent = "";

  const dateSelect = document.getElementById("modalDateSelect");
  dateSelect.innerHTML = doctor.available_dates.map(d => `<option value="${d}">${d}</option>`).join("");

  const slotSelect = document.getElementById("modalSlotSelect");
  slotSelect.innerHTML = doctor.available_slots.map(s => `<option value="${s}">${s}</option>`).join("");

  bookingModal.classList.add("active");
}

document.getElementById("modalCancelBtn").addEventListener("click", () => {
  bookingModal.classList.remove("active");
});

document.getElementById("modalConfirmBtn").addEventListener("click", async () => {
  const patientName = document.getElementById("modalPatientName").value.trim();
  const date = document.getElementById("modalDateSelect").value;
  const slot = document.getElementById("modalSlotSelect").value;
  const consultationType = document.getElementById("modalConsultationType").value;
  const errorDiv = document.getElementById("modalError");

  if (!patientName) {
    errorDiv.textContent = "Please enter your name.";
    return;
  }

  try {
    const res = await authFetch(`${API_BASE}/api/doctors/book`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        doctor_id: currentBookingDoctor.id,
        date, slot, patient_name: patientName, consultation_type: consultationType,
      }),
    });
    const data = await res.json();

    if (data.success) {
      bookingModal.classList.remove("active");
      saveAppointment({
        id: data.booking.id || `appt-${Date.now()}`,
        doctorId: currentBookingDoctor.id,
        doctorName: data.booking.doctor_name || currentBookingDoctor.name,
        speciality: currentBookingDoctor.speciality,
        date: data.booking.date,
        slot: data.booking.slot,
        status: "Confirmed",
        consultationType,
        createdAt: new Date().toISOString()
      });
      showToast(`${consultationType === "virtual" ? "Virtual" : "In-person"} booking confirmed with ${data.booking.doctor_name} on ${data.booking.date} at ${data.booking.slot}.`, "success");
      loadDashboard(true);
    } else {
      errorDiv.textContent = data.error || "Booking failed. Please try another slot.";
    }
  } catch (err) {
    // Offline demo confirmation so the flow still feels complete without a backend.
    bookingModal.classList.remove("active");
    saveAppointment({
      id: `appt-${Date.now()}`, doctorId: currentBookingDoctor.id, doctorName: currentBookingDoctor.name,
      speciality: currentBookingDoctor.speciality, date, slot, consultationType, status: "Confirmed", createdAt: new Date().toISOString()
    });
    showToast(`Demo ${consultationType === "virtual" ? "virtual" : "in-person"} booking confirmed with ${currentBookingDoctor.name} on ${date} at ${slot}.`, "success");
    loadDashboard(true);
  }
});


function startVirtualConsultation(appointmentId){
  const appt=getAppointments().find(a=>a.id===appointmentId);
  if(!appt) return;
  // Demo-safe consultation room. It never claims a real clinician is connected.
  const room=`swaastha-${String(appointmentId).replace(/[^a-zA-Z0-9]/g,"")}`;
  const url=`https://meet.jit.si/${encodeURIComponent(room)}`;
  saveActivity({color:"var(--color-primary)",text:`Virtual consultation opened with <strong>${escapeHtml(appt.doctorName)}</strong>`,time:"Just now"});
  window.open(url,"_blank","noopener,noreferrer");
}

function openDirections(place){
  const url=`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`;
  window.open(url,"_blank","noopener,noreferrer");
}

// ================= NURSE SUPPORT =================
function nurseRequestsKey(){ return `swasthya_nurse_requests_${currentUser?.email||"guest"}`; }
function getNurseRequests(){ try{return JSON.parse(localStorage.getItem(nurseRequestsKey())||"[]")}catch{return []} }
function saveNurseRequests(list){ localStorage.setItem(nurseRequestsKey(),JSON.stringify(list)); }
function createNurseRequest(reason="High-risk symptoms", auto=false){
  const list=getNurseRequests();
  const active=list.find(r=>r.status==="Requested"||r.status==="In review");
  if(active) return active;
  const req={id:`NUR-${Date.now()}`,reason,contact:"",status:"Requested",createdAt:new Date().toISOString(),auto};
  list.unshift(req); saveNurseRequests(list); saveActivity({color:"var(--color-urgent-high)",text:`Nurse support requested: <strong>${escapeHtml(reason)}</strong>`,time:"Just now"});
  renderNurseSupport();
  return req;
}
function renderNurseSupport(){
  const list=getNurseRequests(); const summary=document.getElementById("nurseSupportSummary");
  if(summary){ const active=list.find(r=>r.status!=="Resolved"); summary.innerHTML=active?`<strong>🟠 ${escapeHtml(active.status)}</strong><br>${escapeHtml(active.reason)}<br><small>Request ${escapeHtml(active.id)}</small>`:`No active nurse request.`; }
  const box=document.getElementById("nurseRequestsList"); if(!box)return;
  box.innerHTML=list.length?list.map(r=>`<article class="request-card"><div class="request-icon">👩‍⚕️</div><div class="request-body"><span class="eyebrow">Nurse support</span><h3>${escapeHtml(r.reason)}</h3><p>${escapeHtml(r.id)} · ${r.auto?"Triggered by high-risk triage":"Requested from dashboard"}</p></div><span class="status-pill">${escapeHtml(r.status)}</span></article>`).join(""):`<div class="empty-state panel"><h3>No nurse requests</h3><p>Use nurse support when you need help with a high-risk or difficult-to-manage situation.</p></div>`;
}
function initNurseSupport(){
  const btn=document.getElementById("requestNurseBtn"); if(btn && !btn.dataset.bound){ btn.dataset.bound="1"; btn.onclick=()=>{ const reason=document.getElementById("nurseReason").value; const phone=document.getElementById("nursePhone").value.trim(); if(phone && !/^\d{10}$/.test(phone)){document.getElementById("nurseRequestResult").textContent="Enter a valid 10-digit phone number or leave it blank.";return;} const req=createNurseRequest(reason,false); req.contact=phone; const list=getNurseRequests(); const idx=list.findIndex(x=>x.id===req.id); if(idx>=0)list[idx]=req; saveNurseRequests(list); document.getElementById("nurseRequestResult").innerHTML=`<strong>Request ${escapeHtml(req.id)} created.</strong><br>A nurse can review the request. For life-threatening symptoms, call 108 now.`; showToast("Nurse support requested.","success"); renderNurseSupport(); }; }
  renderNurseSupport();
}

// ================= SOS =================
const sosModal = document.getElementById("sosModal");
function triggerSOS(source="Emergency Support"){
  saveActivity({color:"var(--color-urgent-high)",text:`SOS emergency support triggered from <strong>${escapeHtml(source)}</strong>`,time:"Just now"});
  const note=document.querySelector("#sosModal .modal-meta"); if(note) note.innerHTML=`SOS triggered from <strong>${escapeHtml(source)}</strong>. If this is life-threatening, don't wait for triage or an appointment — call the ambulance now.`;
  sosModal.classList.add("active");
}
document.getElementById("sosBtn").addEventListener("click", () => triggerSOS("SOS button"));
document.getElementById("sosCancelBtn").addEventListener("click", () => sosModal.classList.remove("active"));

// ================= MEDICINE STORE =================
let medicineCatalog = [];
let medicineCart = [];
function medicineCartKey(){ return `swasthya_medicine_cart_${currentUser?.email||"guest"}`; }
function medicineOrdersKey(){ return `swasthya_medicine_orders_${currentUser?.email||"guest"}`; }
function getMedicineCart(){ try{return JSON.parse(localStorage.getItem(medicineCartKey())||"[]")}catch{return []} }
function saveMedicineCart(){ localStorage.setItem(medicineCartKey(),JSON.stringify(medicineCart)); renderMedicineCart(); }
function formatINR(n){ return `₹${Number(n).toLocaleString("en-IN")}`; }
async function loadMedicineStore(){
  medicineCart=getMedicineCart();
  const grid=document.getElementById("medicineGrid"); if(!grid)return;
  grid.innerHTML='<div class="loading-state">Loading medicines…</div>';
  try{
    const q=document.getElementById("medicineSearch")?.value||"";
    const cat=document.getElementById("medicineCategory")?.value||"";
    const r=await authFetch(`${API_BASE}/api/medicines?q=${encodeURIComponent(q)}&category=${encodeURIComponent(cat)}`);
    const d=await r.json(); if(!r.ok)throw new Error(d.message||"Could not load medicines");
    medicineCatalog=d.medicines||[];
    const catEl=document.getElementById("medicineCategory");
    if(catEl && catEl.options.length===1){ (d.categories||[]).forEach(c=>catEl.insertAdjacentHTML("beforeend",`<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`)); }
    renderMedicineGrid(); renderMedicineCart(); loadMedicineOrders();
  }catch(e){grid.innerHTML=`<div class="error-box">${escapeHtml(e.message)}</div>`;}
}
function renderMedicineGrid(){
  const grid=document.getElementById("medicineGrid"); if(!grid)return;
  if(!medicineCatalog.length){grid.innerHTML='<div class="empty-cart panel">No medicines matched your search.</div>';return;}
  grid.innerHTML=medicineCatalog.map(m=>{
    const disabled=m.stock<=0;
    const badge=m.stock<=0?'out':m.stock<=10?'low':m.stock<=25?'limited':'ok';
    return `<article class="medicine-card ${disabled?'medicine-disabled':''}">
      <div class="medicine-art"><span>${m.icon||'💊'}</span></div>
      <div class="medicine-card-body"><div class="medicine-category">${escapeHtml(m.category)}</div><h3>${escapeHtml(m.name)}</h3><p>${escapeHtml(m.unit||'Pack')}</p>
      <div class="medicine-meta"><strong>${formatINR(m.price)}</strong><span class="stock-pill ${badge}">${escapeHtml(m.status)} · ${m.stock}</span></div>
      <button class="btn-primary full-width" ${disabled?'disabled':''} data-add-medicine="${m.id}">${disabled?'Out of stock':'Add to cart'}</button></div>
    </article>`;
  }).join("");
  grid.querySelectorAll("[data-add-medicine]").forEach(btn=>btn.onclick=()=>addMedicineToCart(btn.dataset.addMedicine));
}
function addMedicineToCart(id){
  const med=medicineCatalog.find(x=>x.id===id); if(!med)return;
  const line=medicineCart.find(x=>x.id===id); const next=(line?.quantity||0)+1;
  if(next>med.stock){showToast(`Only ${med.stock} ${med.name} available.`,"error");return;}
  if(line) line.quantity=next; else medicineCart.push({id,quantity:1,name:med.name,price:med.price,unit:med.unit,icon:med.icon});
  saveMedicineCart(); showToast(`${med.name} added to cart.`,"success");
}
function renderMedicineCart(){
  const box=document.getElementById("cartItems"), count=document.getElementById("cartCount"), totalEl=document.getElementById("cartTotal"), checkout=document.getElementById("checkoutMedicineBtn"); if(!box)return;
  const total=medicineCart.reduce((s,x)=>s+x.price*x.quantity,0); const countN=medicineCart.reduce((s,x)=>s+x.quantity,0);
  count.textContent=`${countN} item${countN===1?'':'s'}`; totalEl.textContent=formatINR(total); checkout.disabled=!medicineCart.length;
  if(!medicineCart.length){box.innerHTML='<div class="empty-cart">Your cart is empty.<br><small>Add a medicine to begin.</small></div>';return;}
  box.innerHTML=medicineCart.map(x=>`<div class="cart-line"><span class="cart-icon">${x.icon||'💊'}</span><div class="cart-info"><strong>${escapeHtml(x.name)}</strong><small>${formatINR(x.price)} · ${escapeHtml(x.unit||'')}</small><div class="qty-control"><button data-cart-dec="${x.id}">−</button><span>${x.quantity}</span><button data-cart-inc="${x.id}">+</button></div></div><strong>${formatINR(x.price*x.quantity)}</strong><button class="cart-remove" title="Remove" data-cart-remove="${x.id}">×</button></div>`).join("");
  box.querySelectorAll("[data-cart-inc]").forEach(b=>b.onclick=()=>changeCartQty(b.dataset.cartInc,1));
  box.querySelectorAll("[data-cart-dec]").forEach(b=>b.onclick=()=>changeCartQty(b.dataset.cartDec,-1));
  box.querySelectorAll("[data-cart-remove]").forEach(b=>b.onclick=()=>removeCartLine(b.dataset.cartRemove));
}
function changeCartQty(id,delta){ const line=medicineCart.find(x=>x.id===id); const med=medicineCatalog.find(x=>x.id===id); if(!line)return; const next=line.quantity+delta; if(next<1)return removeCartLine(id); if(med&&next>med.stock){showToast(`Only ${med.stock} available.`,"error");return;} line.quantity=next; saveMedicineCart(); }
function removeCartLine(id){medicineCart=medicineCart.filter(x=>x.id!==id);saveMedicineCart();}
function openMedicineCheckout(){
  if(!medicineCart.length)return;
  const modal=document.getElementById("medicineCheckoutModal"); const summary=document.getElementById("checkoutSummary");
  summary.innerHTML=medicineCart.map(x=>`<div><span>${escapeHtml(x.name)} × ${x.quantity}</span><strong>${formatINR(x.price*x.quantity)}</strong></div>`).join("")+`<hr><div><strong>Total</strong><strong>${formatINR(medicineCart.reduce((s,x)=>s+x.price*x.quantity,0))}</strong></div>`;
  document.getElementById("orderPhone").value=currentUser?.phone||""; document.getElementById("orderAddress").value=localStorage.getItem(`swasthya_delivery_address_${currentUser?.email||''}`)||""; document.getElementById("orderCheckoutError").textContent=""; modal.classList.add("active");
}
async function placeMedicineOrder(){
  const phone=document.getElementById("orderPhone").value.trim(), address=document.getElementById("orderAddress").value.trim(), err=document.getElementById("orderCheckoutError"), btn=document.getElementById("orderConfirmBtn"); err.textContent="";
  if(!/^\d{10}$/.test(phone.replace(/\D/g,""))){err.textContent="Enter a valid 10-digit phone number.";return;} if(address.length<10){err.textContent="Enter a complete delivery address.";return;}
  btn.disabled=true;
  try{const r=await authFetch(`${API_BASE}/api/medicines/orders`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({phone:phone.replace(/\D/g,""),address,items:medicineCart.map(x=>({id:x.id,quantity:x.quantity}))})});const d=await r.json();if(!r.ok)throw new Error(d.message||"Order could not be placed");
    localStorage.setItem(`swasthya_delivery_address_${currentUser?.email||''}`,address); medicineCart=[];saveMedicineCart();document.getElementById("medicineCheckoutModal").classList.remove("active");
    saveActivity({color:"var(--color-primary)",text:`Medicine order <strong>${escapeHtml(d.order.id)}</strong> placed — ${escapeHtml(d.order.delivery_message)}`,time:"Just now"});showToast(d.order.delivery_message,"success");renderMedicineCart();loadMedicineStore();loadDashboard(true);
  }catch(e){err.textContent=e.message;}finally{btn.disabled=false;}
}
async function loadMedicineOrders(){const box=document.getElementById("medicineOrdersList");if(!box)return;try{const r=await authFetch(`${API_BASE}/api/medicines/orders`);const d=await r.json();if(!r.ok)throw new Error(d.message||"Could not load orders");box.innerHTML=(d.orders||[]).slice(0,8).map(o=>`<div class="order-history-row"><div><strong>${escapeHtml(o.id)}</strong><small>${new Date(o.created_at).toLocaleString()} · ${escapeHtml(o.status)}</small></div><div><strong>${formatINR(o.total)}</strong><small>${escapeHtml(o.delivery_message)}</small></div></div>`).join("")||'<div class="empty-cart">No medicine orders yet.</div>';}catch(e){box.innerHTML=`<div class="error-box">${escapeHtml(e.message)}</div>`;}}

document.getElementById("medicineSearch")?.addEventListener("input",()=>{clearTimeout(window.__medSearchTimer);window.__medSearchTimer=setTimeout(loadMedicineStore,250);});
document.getElementById("medicineCategory")?.addEventListener("change",loadMedicineStore);
document.getElementById("checkoutMedicineBtn")?.addEventListener("click",openMedicineCheckout);
document.getElementById("refreshOrdersBtn")?.addEventListener("click",loadMedicineOrders);
document.getElementById("orderCancelBtn")?.addEventListener("click",()=>document.getElementById("medicineCheckoutModal").classList.remove("active"));
document.getElementById("orderConfirmBtn")?.addEventListener("click",placeMedicineOrder);

// ================= DASHBOARD & LOCAL ACTIVITY =================
const demoDashboard = {
  urgency: { high: 8, medium: 21, low: 71 },
};

function currentActivityKey() {
  const email = currentUser?.email || "guest";
  return `swasthya_activity_${email}`;
}
function currentAppointmentsKey() {
  const email = currentUser?.email || "guest";
  return `swasthya_appointments_${email}`;
}
function getActivities() {
  try { return JSON.parse(localStorage.getItem(currentActivityKey()) || "[]"); } catch { return []; }
}
function saveActivity(item) {
  const list = getActivities().filter(x => x.id !== item.id);
  list.unshift({ ...item, id: item.id || `activity-${Date.now()}`, createdAt: item.createdAt || new Date().toISOString() });
  localStorage.setItem(currentActivityKey(), JSON.stringify(list.slice(0, 20)));
  updateRequestCount();
}
function getAppointments() {
  try { return JSON.parse(localStorage.getItem(currentAppointmentsKey()) || "[]"); } catch { return []; }
}
function saveAppointment(item) {
  const list = getAppointments().filter(x => x.id !== item.id);
  list.unshift(item);
  localStorage.setItem(currentAppointmentsKey(), JSON.stringify(list.slice(0, 20)));
  saveActivity({
    id: `appointment-${item.id}`,
    color: "var(--color-primary)",
    text: `Appointment booked with <strong>${escapeHtml(item.doctorName)}</strong> for ${escapeHtml(item.date)} at ${escapeHtml(item.slot)}`,
    time: "Just now",
    createdAt: new Date().toISOString()
  });
}
function formatRelativeTime(iso) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.round(hrs / 24)} day ago`;
}
function updateRequestCount() {
  const el = document.getElementById("requestCount");
  if (!el) return;
  el.textContent = getAppointments().filter(a => a.status !== "Completed").length;
}
function animateCount(el, target, duration = 700) {
  const startTime = performance.now();
  function tick(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(target * eased);
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function renderDoctorDashboard() {
  const box = document.getElementById("doctorDashboard");
  const patient = document.getElementById("patientDashboard");
  if (!box || !patient) return;
  if (currentUser?.role !== "doctor") {
    box.hidden = true;
    patient.hidden = false;
    return;
  }
  box.hidden = false;
  patient.hidden = true;
  const appointments = getAppointments();
  const confirmed = appointments.filter(a => a.status !== "Completed");
  const today = new Date().toISOString().slice(0,10);
  const todayAppointments = confirmed.filter(a => a.date === today);
  const patients = new Set(confirmed.map(a => a.patientName).filter(Boolean));
  const virtual = confirmed.filter(a => a.consultationType === "virtual").length;
  const doctorName = currentUser?.name || "Doctor";
  box.innerHTML = `
    <div class="doctor-hero">
      <div class="doctor-hero-copy">
        <span class="eyebrow">⚕ Doctor workspace</span>
        <h1>Good day, Dr. ${escapeHtml(doctorName.split(" ")[0])} 👋</h1>
        <p>Your clinical dashboard is focused on today's appointments, patient requests and consultation workflow.</p>
      </div>
      <div class="doctor-status"><span class="doctor-status-dot"></span> Available for consultations</div>
    </div>
    <div class="doctor-stat-grid">
      <div class="doctor-stat-card"><div class="doctor-stat-icon">📅</div><div class="doctor-stat-value">${todayAppointments.length}</div><div class="doctor-stat-label">Today's appointments</div><div class="doctor-stat-note">${todayAppointments.length ? "Ready for review" : "No appointments today"}</div></div>
      <div class="doctor-stat-card"><div class="doctor-stat-icon">👥</div><div class="doctor-stat-value">${patients.size}</div><div class="doctor-stat-label">Patient requests</div><div class="doctor-stat-note">Active consultations</div></div>
      <div class="doctor-stat-card"><div class="doctor-stat-icon">🖥️</div><div class="doctor-stat-value">${virtual}</div><div class="doctor-stat-label">Virtual consultations</div><div class="doctor-stat-note">Join from requests</div></div>
      <div class="doctor-stat-card"><div class="doctor-stat-icon">🩺</div><div class="doctor-stat-value">${confirmed.length}</div><div class="doctor-stat-label">Open appointments</div><div class="doctor-stat-note">Across your dashboard</div></div>
    </div>
    <div class="doctor-dashboard-grid">
      <div class="doctor-panel">
        <div class="panel-heading-row"><h3>📅 Today's clinical queue</h3><span class="small-note">${today}</span></div>
        <div class="doctor-appointment-list">
          ${todayAppointments.length ? todayAppointments.map(a => `<div class="doctor-appointment"><div class="doctor-patient"><div class="doctor-patient-avatar">👤</div><div><strong>${escapeHtml(a.patientName || "Patient")}</strong><span>${escapeHtml(a.slot || "Scheduled")} · ${a.consultationType === "virtual" ? "🖥️ Virtual" : "🏥 In-person"}</span></div></div><div class="doctor-appointment-actions">${a.consultationType === "virtual" ? `<button class="btn-primary" type="button" data-join-appointment="${escapeHtml(a.id)}">Join</button>` : `<button class="btn-secondary" type="button" data-view="requests">Details</button>`}</div></div>`).join("") : `<div class="empty-care"><div>📭</div><div><strong>No appointments for today</strong><span>New patient bookings will appear in your clinical queue.</span></div></div>`}
        </div>
      </div>
      <div class="doctor-panel">
        <div class="panel-heading-row"><h3>⚡ Doctor actions</h3><span class="small-note">Quick access</span></div>
        <div class="doctor-action-grid">
          <button class="doctor-action-card" data-view="requests"><span>📋</span><strong>Patient requests</strong><small>Review bookings and consultation details.</small></button>
          <button class="doctor-action-card" data-view="doctors"><span>🗓️</span><strong>Availability</strong><small>View available consultation slots.</small></button>
          <button class="doctor-action-card" data-view="chat"><span>🩺</span><strong>Clinical support</strong><small>Review symptom context before consultation.</small></button>
          <button class="doctor-action-card" data-view="feedback"><span>💬</span><strong>Feedback</strong><small>See how the platform can improve.</small></button>
        </div>
        <div class="doctor-insight"><strong>💡 Clinical reminder</strong><p class="small-note" style="margin:6px 0 0;">Review patient symptoms and consultation type before starting a session. Emergency cases should be escalated appropriately.</p></div>
      </div>
    </div>`;
  box.querySelectorAll("[data-view]").forEach(b => b.addEventListener("click", () => switchToView(b.dataset.view)));
  box.querySelectorAll("[data-join-appointment]").forEach(b => b.addEventListener("click", () => startVirtualConsultation(b.dataset.joinAppointment)));
}

function loadDashboard() {
  if (currentUser?.role === "doctor") { renderDoctorDashboard(); return; }
  renderDoctorDashboard();
  const appointments = getAppointments();
  const activities = getActivities();
  const stats = [
    { icon: "📅", value: appointments.length, label: "Appointments", trend: appointments.length ? `${appointments.filter(a => a.status === "Confirmed").length} confirmed` : "No bookings yet", trendClass: appointments.length ? "up" : "watch" },
    { icon: "🩺", value: allDoctorsCache.length || 3, label: "Doctors available", trend: "Search & book a slot", trendClass: "up" },
    { icon: "💬", value: Number(localStorage.getItem(`swasthya_checks_${currentUser?.email || "guest"}`) || 0), label: "Symptom checks", trend: "Your local activity", trendClass: "up" },
    { icon: "🏥", value: 4, label: "Nearby facilities", trend: "Open local directory", trendClass: "up" },
  ];
  const statGrid = document.getElementById("statGrid");
  statGrid.innerHTML = stats.map(s => `<div class="stat-card"><div class="stat-icon">${s.icon}</div><div class="stat-value" data-target="${s.value}">0</div><div class="stat-label">${escapeHtml(s.label)}</div><div class="stat-trend ${s.trendClass}">${escapeHtml(s.trend)}</div></div>`).join("");
  statGrid.querySelectorAll(".stat-value").forEach(el => animateCount(el, Number(el.dataset.target)));

  const greeting = document.getElementById("dashboardGreeting");
  if (greeting) greeting.textContent = `Welcome back, ${(currentUser?.name || "friend").split(" ")[0]} 🙏`;

  const upcoming = appointments[0];
  const care = document.getElementById("careOverview");
  care.innerHTML = upcoming ? `
    <div class="upcoming-card"><div class="upcoming-icon">🩺</div><div><span class="eyebrow">Next appointment</span><strong>${escapeHtml(upcoming.doctorName)}</strong><span>${escapeHtml(upcoming.date)} · ${escapeHtml(upcoming.slot)}</span><span class="appointment-type-badge">${upcoming.consultationType === "in-person" ? "🏥 Meet doctor" : "🖥️ Virtual consultation"}</span></div><div class="upcoming-actions"><button class="btn-secondary" data-view="requests">View</button>${upcoming.consultationType === "virtual" ? `<button class="btn-primary" type="button" data-join-appointment="${escapeHtml(upcoming.id)}">Join</button>` : `<button class="btn-secondary" type="button" data-directions="${encodeURIComponent(upcoming.doctorName)}">Directions</button>`}</div></div>` : `
    <div class="empty-care"><div>📅</div><div><strong>No upcoming appointments</strong><span>Find a doctor and your booking will appear here automatically.</span></div><button class="btn-primary" data-view="doctors">Find a doctor</button></div>`;
  care.querySelectorAll("[data-view]").forEach(b => b.addEventListener("click", () => switchToView(b.dataset.view)));
  care.querySelectorAll("[data-join-appointment]").forEach(b => b.addEventListener("click", () => startVirtualConsultation(b.dataset.joinAppointment)));
  care.querySelectorAll("[data-directions]").forEach(b => b.addEventListener("click", () => openDirections(decodeURIComponent(b.dataset.directions))));

  const { high, medium, low } = demoDashboard.urgency;
  const total = high + medium + low;
  const donut = document.getElementById("donutChart");
  if (donut) {
    donut.style.setProperty("--donut-a", `${(high / total) * 100}%`);
    donut.style.setProperty("--donut-b", `${((high + medium) / total) * 100}%`);
  }
  const feed = document.getElementById("activityFeed");
  const fallback = [
    { color: "var(--color-primary)", text: "Your dashboard is ready. Book a doctor or start a symptom check to create activity.", time: "Now" },
    { color: "var(--color-urgent-medium)", text: "Health tools are available from the four cards above.", time: "Now" },
  ];
  const items = activities.length ? activities : fallback;
  feed.innerHTML = items.slice(0, 6).map(a => `<div class="activity-item"><span class="activity-dot" style="background:${a.color || "var(--color-primary)"}"></span><div><div class="activity-text">${a.text}</div><div class="activity-time">${a.createdAt ? formatRelativeTime(a.createdAt) : a.time}</div></div></div>`).join("");
  updateRequestCount();
  renderNurseSupport();
}

function loadRequests() {
  const grid = document.getElementById("requestsGrid");
  const appointments = getAppointments();
  if (!appointments.length) {
    grid.innerHTML = `<div class="empty-state panel"><div class="empty-state-icon">🔔</div><h3>No requests yet</h3><p>Book a doctor from Find a Doctor and your appointment will appear here.</p><button class="btn-primary" data-view="doctors">Find a doctor</button></div>`;
    grid.querySelector("[data-view]")?.addEventListener("click", e => switchToView(e.currentTarget.dataset.view));
    updateRequestCount(); return;
  }
  grid.innerHTML = appointments.map(a => `<article class="request-card"><div class="request-icon">🩺</div><div class="request-body"><span class="eyebrow">Appointment</span><h3>${escapeHtml(a.doctorName)}</h3><p>${escapeHtml(a.speciality || "Medical consultation")}</p><div class="request-meta"><span>📅 ${escapeHtml(a.date)}</span><span>⏰ ${escapeHtml(a.slot)}</span><span>${a.consultationType === "in-person" ? "🏥 Meet doctor" : "🖥️ Virtual"}</span></div><div class="request-actions">${a.consultationType === "virtual" ? `<button class="btn-primary" type="button" data-join-appointment="${escapeHtml(a.id)}">🖥️ Join consultation</button>` : `<button class="btn-secondary" type="button" data-directions="${encodeURIComponent(a.doctorName)}">🧭 Directions</button>`}</div></div><span class="status-pill">${escapeHtml(a.status || "Confirmed")}</span></article>`).join("");
  grid.querySelectorAll("[data-join-appointment]").forEach(b => b.addEventListener("click", () => startVirtualConsultation(b.dataset.joinAppointment)));
  grid.querySelectorAll("[data-directions]").forEach(b => b.addEventListener("click", () => openDirections(decodeURIComponent(b.dataset.directions))));
  updateRequestCount();
}

document.getElementById("clearActivityBtn")?.addEventListener("click", () => {
  localStorage.removeItem(currentActivityKey());
  loadDashboard(true);
  showToast("Recent activity cleared.", "success");
});

// ================= HEALTH TOOL CARDS =================
function renderToolCards() {}
document.querySelectorAll("[data-feature-view]").forEach(card => card.addEventListener("click", () => switchToView(card.dataset.featureView)));

// ================= BLOOD DONATION =================
function initBloodDonation() {
  const results = document.getElementById("donorResults");
  const compatible = { "O-": ["O-"], "O+": ["O+", "O-"], "A-": ["A-", "O-"], "A+": ["A+", "A-", "O+", "O-"], "B-": ["B-", "O-"], "B+": ["B+", "B-", "O+", "O-"], "AB-": ["AB-", "A-", "B-", "O-"], "AB+": ["All groups"] };
  const group = document.getElementById("bloodGroup");
  const render = () => { results.innerHTML = (compatible[group.value] || []).map(g => `<span class="donor-chip">🩸 ${g}</span>`).join(""); };
  group.onchange = render; render();
  document.getElementById("bloodRequestBtn").onclick = () => {
    const loc = document.getElementById("bloodLocation").value.trim() || "your area"; const units = document.getElementById("bloodUnits").value || 1;
    saveActivity({ color:"var(--color-urgent-high)", text:`Blood request created for <strong>${escapeHtml(units)} unit(s) of ${escapeHtml(group.value)}</strong> near ${escapeHtml(loc)}`, time:"Just now" }); showToast("Blood request saved locally.","success");
  };
  const donateBtn=document.getElementById("bloodDonateBtn");
  if(donateBtn) donateBtn.onclick=()=>{
    const dg=document.getElementById("donorBloodGroup").value, loc=document.getElementById("donorLocation").value.trim(), phone=document.getElementById("donorPhone").value.trim(), consent=document.getElementById("donorConsent").checked, out=document.getElementById("donorRegistrationResult");
    if(!loc || !/^\d{10}$/.test(phone) || !consent){ out.textContent="Enter a valid 10-digit phone, location, and consent to register."; return; }
    const donors=JSON.parse(localStorage.getItem("swasthya_donors")||"[]"); donors.push({id:`DON-${Date.now()}`,blood_group:dg,location:loc,phone,created_at:new Date().toISOString(),user_id:currentUser?.id||null}); localStorage.setItem("swasthya_donors",JSON.stringify(donors));
    out.innerHTML=`<strong>Donor registration successful.</strong><br>Blood group: ${escapeHtml(dg)} · Location: ${escapeHtml(loc)}<br>Your contact details are stored locally in this demo.`; saveActivity({color:"var(--color-primary)",text:`Registered as a <strong>${escapeHtml(dg)} blood donor</strong>`,time:"Just now"}); showToast("Thank you for registering as a donor.","success");
  };
}

// ================= PREGNANCY / PERIOD =================
function initPregnancyTracker() {
  const fmt = d => d.toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"});
  const openCycleInsights = (flags) => {
    const modal=document.getElementById("cycleInsightModal");
    const list=document.getElementById("cycleInsightList");
    const title=document.getElementById("cycleInsightTitle");
    const intro=document.getElementById("cycleInsightIntro");
    if(!modal || !list) return;
    title.textContent = flags.length ? "🌸 Your cycle pattern needs attention" : "🌸 Your cycle pattern looks within the expected range";
    intro.textContent = flags.length ? "Your answers show patterns that can sometimes be associated with health conditions. This tracker cannot diagnose the cause." : "No major warning pattern was detected from the information entered. Keep tracking your cycles so changes are easier to notice.";
    list.innerHTML = flags.length ? flags.map(f=>`<div class="cycle-insight-item"><div class="cycle-insight-item-title">${f.icon} ${escapeHtml(f.name)}</div><p>${escapeHtml(f.reason)}</p><small><strong>What to do:</strong> ${escapeHtml(f.action)}</small></div>`).join("") : `<div class="cycle-insight-ok">✓ Keep tracking your cycle, flow and symptoms. If your usual pattern changes, consider speaking with a healthcare professional.</div>`;
    modal.classList.add("active"); modal.setAttribute("aria-hidden","false");
  };
  const closeCycleInsights = () => { const m=document.getElementById("cycleInsightModal"); if(m){m.classList.remove("active");m.setAttribute("aria-hidden","true");} };
  const closeBtn=document.getElementById("cycleInsightClose"); if(closeBtn) closeBtn.onclick=closeCycleInsights;
  const cycleModal=document.getElementById("cycleInsightModal"); if(cycleModal) cycleModal.addEventListener("click",e=>{if(e.target===cycleModal) closeCycleInsights();});

  const cycleBtn=document.getElementById("calculateCycleBtn");
  if(cycleBtn) cycleBtn.onclick = () => {
    const raw=document.getElementById("periodStart").value;
    const len=Number(document.getElementById("cycleLength").value||28);
    const duration=Number(document.getElementById("periodDuration").value||5);
    const flow=document.getElementById("periodFlow").value;
    const pain=document.getElementById("periodPain").value;
    const missed=Number(document.getElementById("missedPeriods").value||0);
    const box=document.getElementById("cycleResult");
    if(!raw){box.textContent="Select your last period date.";return;}
    if(len<15 || len>90 || duration<1 || duration>30){box.textContent="Please enter realistic cycle and period-duration values.";return;}
    const d=new Date(`${raw}T00:00:00`); const next=new Date(d); next.setDate(next.getDate()+len);
    const fertileStart=new Date(next); fertileStart.setDate(fertileStart.getDate()-16);
    const fertileEnd=new Date(next); fertileEnd.setDate(fertileEnd.getDate()-12);
    box.innerHTML=`<strong>Estimated next period:</strong> ${fmt(next)}<br><strong>Estimated fertile window:</strong> ${fmt(fertileStart)} – ${fmt(fertileEnd)}<br><span class="small-note">Cycle dates are estimates and should not be used as contraception.</span>`;

    const flags=[];
    if(len<21 || len>35) flags.push({icon:"🔄",name:"Irregular cycle pattern",reason:`A cycle of about ${len} days is outside the commonly expected 21–35 day range for adults. Irregular cycles can have many causes, including hormonal changes, thyroid problems, stress, weight changes or PCOS.`,action:"Track the next few cycles and discuss repeated irregularity with a gynecologist or clinician."});
    if(missed>=3) flags.push({icon:"⏸️",name:"Repeated missed periods",reason:"Missing periods for 3 months or more can be called amenorrhea and has several possible causes, including pregnancy, PCOS, thyroid problems, stress, weight change or some medications.",action:"If pregnancy is possible, take an appropriate pregnancy test and arrange a clinical evaluation."});
    else if(missed>0) flags.push({icon:"⏰",name:"Missed/late periods",reason:"A missed period can happen for many reasons, including pregnancy, stress, weight changes, hormonal contraception and hormonal conditions.",action:"If pregnancy is possible, consider a pregnancy test; seek clinical advice if missed periods repeat."});
    if(duration>7 || flow==="very-heavy") flags.push({icon:"🩸",name:"Heavy or prolonged bleeding pattern",reason:"Bleeding lasting more than 7 days or very heavy flow can be associated with conditions such as fibroids, adenomyosis, endometriosis, bleeding disorders or hormonal/ovulatory problems.",action:"Arrange a clinical assessment, especially if you feel dizzy, faint, unusually tired or short of breath."});
    else if(flow==="heavy") flags.push({icon:"🩸",name:"Heavy-flow pattern",reason:"Heavy menstrual bleeding can have several causes and may sometimes contribute to iron-deficiency anemia.",action:"Track how often you need to change menstrual products and discuss persistent heavy bleeding with a clinician."});
    if(pain==="severe") flags.push({icon:"💗",name:"Severe period pain",reason:"Severe pain that interferes with daily activities can occur with conditions such as endometriosis, adenomyosis or fibroids, although other causes are possible.",action:"Consider a gynecology evaluation rather than relying only on pain tracking."});
    const resultLabel=flags.length?`<br><strong>⚠ ${flags.length} health pattern${flags.length>1?'s':''} detected.</strong> Review the insight popup for possible causes and next steps.`:`<br><strong>✓ No major warning pattern detected from these entries.</strong>`;
    box.innerHTML += resultLabel;
    saveActivity({color:"var(--color-primary)",text:"Cycle health analyzed",time:"Just now"});
    openCycleInsights(flags);
  };

  const pregBtn=document.getElementById("calculatePregnancyBtn");
  if(pregBtn) pregBtn.onclick = () => {
    const raw=document.getElementById("pregnancyLmp").value; const box=document.getElementById("pregnancyResult"); const guidance=document.getElementById("pregnancyGuidance"); if(!raw){box.textContent="Select the first day of your last menstrual period."; guidance.hidden=true; return;}
    const lmp=new Date(`${raw}T00:00:00`); const due=new Date(lmp); due.setDate(due.getDate()+280); const days=Math.max(0,Math.floor((Date.now()-lmp.getTime())/86400000)); const weeks=Math.floor(days/7); const day=days%7; const trimester=weeks<14?"First trimester":weeks<28?"Second trimester":"Third trimester";
    box.innerHTML=`<strong>Estimated due date:</strong> ${due.toLocaleDateString()}<br><strong>Estimated pregnancy age:</strong> ${weeks} weeks ${day} days<br><strong>Stage:</strong> ${trimester}`;
    const tips = weeks<14 ? ["Book/attend an antenatal visit and discuss prenatal supplements with a clinician.","Avoid alcohol, tobacco and non-prescribed medicines.","Seek urgent care for heavy bleeding, severe abdominal pain, fainting or severe vomiting."] : weeks<28 ? ["Keep regular antenatal appointments and monitor blood pressure/weight as advised.","Follow clinician advice on iron/folate and other supplements.","Seek urgent care for bleeding, severe headache/vision changes, fluid leakage or significant abdominal pain."] : ["Continue scheduled antenatal visits and discuss birth planning with your maternity team.","Ask your clinician about fetal movement monitoring and warning signs.","Seek urgent care for bleeding, fluid leakage, severe headache/vision changes, severe pain or noticeably reduced fetal movement."];
    guidance.hidden=false; guidance.innerHTML=`<strong>What to do next — ${trimester}</strong><ul>${tips.map(x=>`<li>${escapeHtml(x)}</li>`).join("")}</ul><p class="medical-disclaimer">These are general educational reminders, not a prescription. Your obstetric clinician should personalise care for you.</p>`;
    saveActivity({color:"var(--color-primary)",text:"Pregnancy milestone and care guidance calculated",time:"Just now"});
  };
}

// ================= SKIN HEALTH =================
function renderGlowGuide() {
  const title = document.getElementById("glowGuideTitle");
  const box = document.getElementById("glowGuideText");
  if (!title || !box) return;
  const lang = currentLang || "en";
  const guides = {
    en: {title:"🩺 Skin Image Health Check", lines:[
      "Upload a clear, well-lit close-up and Gemini will describe what is visibly present.",
      "It can suggest possible categories (for example, acne-like bumps or an irritant-looking rash), but an image alone cannot confirm the cause.",
      "If a medicine is appropriate, the assistant will limit itself to general non-prescription ingredient categories and label-directed use—not a prescription.",
      "For painful, spreading, infected-looking, rapidly worsening or severe skin problems, get an in-person medical assessment."
    ], note:"AI image analysis is educational guidance, not a diagnosis or prescription."},
    hinglish: {title:"🩺 Skin Image Health Check", lines:[
      "Clear aur achhi-light wali close-up photo upload karein; Gemini jo visibly dikh raha hai uska explanation dega.",
      "AI possible category bata sakta hai, jaise acne-like bumps ya irritation/rash jaisa appearance, lekin photo se exact diagnosis confirm nahi hota.",
      "Agar suitable ho to AI sirf general OTC ingredient category aur label ke hisaab se use batayega—prescription nahi.",
      "Agar problem painful, fail rahi ho, pus/infection jaisi lage, ya rapidly worse ho rahi ho, doctor/dermatologist ko dikhayein."
    ], note:"AI image analysis educational guidance hai, diagnosis ya prescription nahi."},
    hi: {title:"🩺 त्वचा की फोटो स्वास्थ्य जांच", lines:[
      "साफ और अच्छी रोशनी वाली त्वचा की नज़दीकी फोटो अपलोड करें; Gemini दिखाई देने वाली चीज़ों का वर्णन करेगा।",
      "AI संभावित श्रेणी बता सकता है, जैसे मुंहासे जैसे दाने या जलन/रैश जैसा दिखना, लेकिन केवल फोटो से सही निदान की पुष्टि नहीं होती।",
      "जरूरत होने पर AI केवल सामान्य OTC ingredient category और लेबल के अनुसार उपयोग बताएगा—प्रिस्क्रिप्शन नहीं।",
      "दर्द, फैलाव, पस/इन्फेक्शन, तेजी से बिगड़ने या गंभीर समस्या में डॉक्टर/त्वचा विशेषज्ञ से जांच कराएं।"
    ], note:"AI फोटो विश्लेषण शैक्षिक जानकारी है, निदान या प्रिस्क्रिप्शन नहीं।"}
  };
  const g = guides[lang] || guides.en;
  title.textContent = g.title;
  box.innerHTML = `<ul>${g.lines.map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul><p class="medical-disclaimer">${escapeHtml(g.note)}</p>`;
}

async function initSkinScreening() {
  const input = document.getElementById("skinImageInput");
  const zone = document.getElementById("skinUploadZone");
  const btn = document.getElementById("chooseSkinImageBtn");
  const uploadBtn = document.getElementById("uploadSkinImageBtn");
  const fileName = document.getElementById("skinFileName");
  const wrap = document.getElementById("skinPreviewWrap");
  const img = document.getElementById("skinPreview");
  const result = document.getElementById("skinResult");
  if (!input || !zone || !btn || !uploadBtn || !fileName || !wrap || !img || !result) return;

  renderGlowGuide();
  let selectedFile = null;

  // The label is linked to the native file input, so the browser's file picker opens reliably.
  // Do not auto-submit after selection.
  btn.onclick = null;
  zone.onclick = (e) => {
    if (e.target.closest("button, label, input")) return;
    input.click();
  };

  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      selectedFile = null;
      uploadBtn.disabled = true;
      fileName.textContent = "No image selected";
      showToast("Please choose an image file.", "error");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      selectedFile = null;
      uploadBtn.disabled = true;
      fileName.textContent = "No image selected";
      showToast("Image must be smaller than 8 MB.", "error");
      return;
    }

    selectedFile = file;
    uploadBtn.disabled = false;
    fileName.textContent = file.name;
    img.src = URL.createObjectURL(file);
    wrap.hidden = false;
    result.innerHTML = `<div class="panel-soft"><strong>Image ready.</strong><p class="small-note">Click “Upload & Analyze with Gemini” to send this image securely to the backend.</p></div>`;
  };

  uploadBtn.onclick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedFile) {
      showToast("Choose an image first.", "error");
      input.click();
      return;
    }

    uploadBtn.disabled = true;
    const oldLabel = uploadBtn.textContent;
    uploadBtn.textContent = "Uploading & analyzing…";
    result.innerHTML = `<div class="loading-state">🔎 Uploading your image securely and analyzing it with Gemini…</div>`;

    try {
      // ONE multipart upload to the same backend Gemini configuration used by Symptom Chat.
      // The Gemini API key stays server-side in backend/.env and never reaches this browser.
      const fd = new FormData();
      fd.append("image", selectedFile, selectedFile.name);
      const r = await authFetch(`${API_BASE}/api/skin/glowup`, { method: "POST", body: fd });
      const d = await r.json().catch(() => ({}));

      if (!r.ok || !d.success) {
        throw new Error(d.message || "Gemini image analysis failed. Please try again.");
      }

      let html = "";
      if (Array.isArray(d.observations) && d.observations.length) {
        html += `<div class="panel-soft"><div class="ai-result-head"><strong>🔎 What the image shows</strong><span class="status-pill">Gemini</span></div><ul>${d.observations.map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul></div>`;
      }
      if (d.text) {
        html += `<div class="panel-soft"><div class="ai-result-head"><strong>✨ Personalized Glow-Up Analysis</strong><span class="status-pill">Gemini</span></div><div class="ai-reply-text">${escapeHtml(d.text).replace(/\n/g, "<br>")}</div><p class="medical-disclaimer">${escapeHtml(d.disclaimer || "Glow-up guidance is cosmetic/educational, not a medical diagnosis.")}</p></div>`;
      }
      if (!html) throw new Error("The AI returned no skin guidance.");
      result.innerHTML = html;
      showToast("Image uploaded and analyzed successfully.", "success");
    } catch (e) {
      result.innerHTML = `<div class="error-box"><strong>Glow-Up analysis could not be completed.</strong><small>${escapeHtml(e.message || "Please try again.")}</small><p class="small-note">Your image was selected successfully. Check that the backend is running and GEMINI_API_KEY is configured in backend/.env.</p></div>`;
    } finally {
      uploadBtn.disabled = false;
      uploadBtn.textContent = oldLabel;
    }
  };
}

// ================= VILLAGE HEALTH HUB =================
async function loadVillageHealth() {
  const grid=document.getElementById("villageGrid");
  try {
    const r=await authFetch(`${API_BASE}/api/village/resources`); const d=await r.json(); if(!r.ok) throw new Error(d.message||"Could not load village resources");
    const cards=[
      ["🏥","Primary Health Centre","Find PHCs and referral facilities for routine and maternal care.","Open facilities","facilities"],
      ["👩‍⚕️","ASHA / Community Worker","Request a community visit for maternal-child care, follow-ups or local guidance.","Request support","request"],
      ["💊","Medicine Availability","Check essential medicines and identify low/out-of-stock items.","Check stock","stock"],
      ["🚑","Emergency Support","For a medical emergency, contact your local emergency service immediately.","Emergency info","emergency"],
      ["📅","Health Camps","See upcoming screening, vaccination and maternal-health camps.","View camps","camps"],
      ["📚","Health Education","Use the existing ASHA education library for prevention and family health.","Open education","education"]
    ];
    grid.innerHTML=cards.map(([icon,title,desc,cta,action])=>`<article class="village-card"><div class="village-icon">${icon}</div><h3>${title}</h3><p>${desc}</p><button class="btn-secondary village-cta" data-action="${action}">${cta}</button></article>`).join("");
    document.getElementById("medicineList").innerHTML=d.medicines.map(m=>`<div class="data-row"><span>${escapeHtml(m.name)}</span><span class="stock-pill ${m.stock===0?'out':m.stock<20?'low':'ok'}">${escapeHtml(m.status)} · ${m.stock}</span></div>`).join("");
    document.getElementById("campList").innerHTML=d.camps.map(c=>`<div class="camp-item"><strong>${escapeHtml(c.name)}</strong><span>📅 ${escapeHtml(c.date)} · 📍 ${escapeHtml(c.location)}</span><small>${c.services.map(escapeHtml).join(" · ")}</small></div>`).join("");
    grid.querySelectorAll(".village-cta").forEach(btn=>btn.onclick=()=>handleVillageAction(btn.dataset.action,d));
    document.getElementById("villageRequestBtn").onclick=()=>submitVillageRequest("ASHA support");
    document.getElementById("villageCampBtn").onclick=()=>submitVillageRequest("Health camp registration");
  } catch(e) { grid.innerHTML=`<div class="error-box">${escapeHtml(e.message)}</div>`; }
}
function handleVillageAction(action,data){
  if(action==="facilities") return switchToView("facilities");
  if(action==="education") return switchToView("education");
  if(action==="request") return submitVillageRequest("ASHA support");
  if(action==="stock") { switchToView("order-medicine"); setTimeout(()=>document.getElementById("medicineSearch")?.focus(),100); return; }
  if(action==="camps") return document.getElementById("campList")?.scrollIntoView({behavior:"smooth"});
  if(action==="emergency") { triggerSOS("Village Health Hub"); }
}
async function submitVillageRequest(type){
  const details=prompt(type+" — describe what you need:"); if(!details) return;
  try { const r=await authFetch(`${API_BASE}/api/village/requests`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type,details})}); const d=await r.json(); if(!r.ok) throw new Error(d.message||"Request failed"); saveActivity({color:"var(--color-primary)",text:`Village health request submitted: <strong>${escapeHtml(type)}</strong>`,time:"Just now"}); showToast("Request submitted successfully.","success"); loadDashboard(true); } catch(e){showToast(e.message,"error");}
}

updateRequestCount();
loadDashboard();

// ================= FEEDBACK =================
let selectedFeedbackRating = 0;
function initFeedback(){
  const form=document.getElementById("feedbackForm"); if(!form || form.dataset.ready) return;
  form.dataset.ready="1";
  const stars=[...document.querySelectorAll(".rating-star")];
  stars.forEach(star=>star.addEventListener("click",()=>{
    selectedFeedbackRating=Number(star.dataset.rating);
    stars.forEach(s=>s.classList.toggle("selected",Number(s.dataset.rating)<=selectedFeedbackRating));
  }));
  document.getElementById("feedbackAnonymous")?.addEventListener("change",e=>{
    document.getElementById("feedbackIdentityFields").hidden=e.target.checked;
  });
  form.addEventListener("submit",submitFeedback);
}
async function submitFeedback(e){
  e.preventDefault();
  const result=document.getElementById("feedbackResult");
  if(!selectedFeedbackRating){ result.textContent="Please select a rating first."; result.className="result-box error"; return; }
  const anonymous=document.getElementById("feedbackAnonymous").checked;
  const body={
    rating:selectedFeedbackRating, anonymous,
    name:document.getElementById("feedbackName").value.trim(),
    email:document.getElementById("feedbackEmail").value.trim(),
    liked:document.getElementById("feedbackLiked").value.trim(),
    improve:document.getElementById("feedbackImprove").value.trim(),
    area:document.getElementById("feedbackArea").value,
    feature:document.getElementById("feedbackFeature").value.trim(),
    problem:document.getElementById("feedbackProblem").value.trim()
  };
  try{
    const r=await authFetch(`${API_BASE}/api/feedback`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    const d=await r.json(); if(!r.ok) throw new Error(d.message||"Could not submit feedback");
    result.textContent=d.message; result.className="result-box success";
    saveActivity({color:"var(--color-primary)",text:"Feedback submitted — thank you for helping improve Swaastha-Saathi!",time:"Just now"});
    document.getElementById("feedbackForm").reset(); selectedFeedbackRating=0;
    document.querySelectorAll(".rating-star").forEach(s=>s.classList.remove("selected"));
    document.getElementById("feedbackIdentityFields").hidden=false;
    showToast("Thank you for your feedback!","success");
  }catch(err){ result.textContent=err.message; result.className="result-box error"; }
}

// ================= HEALTH INSURANCE =================
const insurancePlans = [
  {id:"care-basic", name:"Care Basic", icon:"🩺", monthly:299, cover:"₹2 lakh", features:["Hospitalisation cover","Cashless network support","Basic ambulance benefit"]},
  {id:"family-shield", name:"Family Shield", icon:"👨‍👩‍👧", monthly:599, cover:"₹5 lakh", features:["Family floater demo plan","Hospitalisation cover","Preventive health check"]},
  {id:"senior-care", name:"Senior Care", icon:"👵", monthly:449, cover:"₹5 lakh", features:["Designed for 60+ users","Hospitalisation cover","Annual health check"]}
];
function insuranceKey(){ return `swasthya_insurance_${currentUser?.email||"guest"}`; }
function initInsurance(){
  const box=document.getElementById("insurancePlans"); if(!box) return;
  box.innerHTML=insurancePlans.map(p=>`<article class="insurance-card panel"><div class="insurance-card-top"><span class="insurance-plan-icon">${p.icon}</span><span class="status-pill">${p.cover} cover</span></div><h3>${p.name}</h3><div class="insurance-price">₹${p.monthly}<small>/month</small></div><ul>${p.features.map(x=>`<li>✓ ${x}</li>`).join("")}</ul><button class="btn-primary full-width" data-insure="${p.id}">Choose plan</button></article>`).join("");
  box.querySelectorAll("[data-insure]").forEach(btn=>btn.onclick=()=>openInsuranceEnrollment(btn.dataset.insure));
  renderInsuranceEnrollment();
}
function openInsuranceEnrollment(id){
  const plan=insurancePlans.find(p=>p.id===id); if(!plan) return;
  const existing=currentUser?.age ? Number(currentUser.age) : "";
  const age=prompt("Enter your age to calculate the premium. Users aged 60+ get a 20% senior discount.", existing);
  if(age===null) return;
  const n=Number(age);
  if(!Number.isInteger(n)||n<1||n>120){ showToast("Please enter a valid age.","error"); return; }
  const senior=n>=60, discount=senior?0.20:0, final=Math.round(plan.monthly*(1-discount));
  const name=currentUser?.name||"Member";
  const record={planId:plan.id,planName:plan.name,age:n,basePremium:plan.monthly,discountPercent:discount*100,finalPremium:final,cover:plan.cover,createdAt:new Date().toISOString(),status:"Enrollment requested"};
  localStorage.setItem(insuranceKey(),JSON.stringify(record));
  document.getElementById("insuranceEnrollment").hidden=false;
  document.getElementById("insuranceEnrollmentBody").innerHTML=`<div class="insurance-summary"><div><span>Member</span><strong>${escapeHtml(name)}</strong></div><div><span>Plan</span><strong>${escapeHtml(plan.name)}</strong></div><div><span>Age</span><strong>${n}</strong></div><div><span>Base premium</span><strong>₹${plan.monthly}/month</strong></div><div><span>Senior discount</span><strong>${discount?"20%":"Not applicable"}</strong></div><div class="insurance-final"><span>Demo premium after discount</span><strong>₹${final}/month</strong></div></div><p class="small-note">This is a demo enrollment request. No real payment or insurance policy is issued. A licensed insurer/TPA partner would complete underwriting and payment.</p>`;
  saveActivity({color:"var(--color-primary)",text:`Insurance enrollment requested: <strong>${escapeHtml(plan.name)}</strong> — ₹${final}/month${senior?" with 20% senior discount":""}`,time:"Just now"});
  showToast(senior?"20% senior-citizen discount applied.":"Plan selected. Enrollment request saved.","success");
}
function renderInsuranceEnrollment(){
  const body=document.getElementById("insuranceEnrollmentBody"), wrap=document.getElementById("insuranceEnrollment"); if(!body||!wrap)return;
  const r=JSON.parse(localStorage.getItem(insuranceKey())||"null"); if(!r){wrap.hidden=true;return;}
  wrap.hidden=false; body.innerHTML=`<div class="insurance-summary"><div><span>Plan</span><strong>${escapeHtml(r.planName)}</strong></div><div><span>Age</span><strong>${r.age}</strong></div><div><span>Senior discount</span><strong>${r.discountPercent?"20%":"Not applicable"}</strong></div><div class="insurance-final"><span>Demo premium</span><strong>₹${r.finalPremium}/month</strong></div></div><p class="small-note">Status: ${escapeHtml(r.status)}. No real payment has been collected.</p>`;
}
