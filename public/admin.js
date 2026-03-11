const ADMIN_KEY_STORAGE = "admin_access_key_v1";
const ADMIN_KEY_DRAFT_STORAGE = "admin_access_key_draft_v1";

const adminInfo = document.getElementById("adminInfo");
const adminPanel = document.getElementById("adminPanel");
const adminKeyInput = document.getElementById("adminKeyInput");
const refreshBtn = document.getElementById("refreshAdminBtn");

const aiLogList = document.getElementById("aiLogList");
const aiControlInfo = document.getElementById("aiControlInfo");
const enableAiBtn = document.getElementById("enableAiBtn");
const disableAiBtn = document.getElementById("disableAiBtn");

let adminKey = window.localStorage.getItem(ADMIN_KEY_STORAGE) || "";
const draftKey = window.localStorage.getItem(ADMIN_KEY_DRAFT_STORAGE) || "";
if (draftKey) adminKey = draftKey;

function setInfo(text) {
  adminInfo.textContent = String(text || "");
}

function setLoggedIn(isLoggedIn) {
  adminPanel.classList.toggle("hidden", !isLoggedIn);
  refreshBtn.classList.toggle("hidden", !isLoggedIn);
}

async function adminFetch(url, options = {}) {
  const headers = {
    ...(options.headers || {}),
    "x-admin-key": adminKey
  };
  return fetch(url, {
    ...options,
    headers,
    cache: "no-store"
  });
}

async function postAdmin(path, payload) {
  const response = await adminFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Aktion fehlgeschlagen");
  }
  return data;
}

function renderAiControl(info = {}, canEdit) {
  const enabled = info?.aiEnabled === true;
  const provider = String(info?.provider || "-");
  const model = String(info?.model || "-");

  aiControlInfo.textContent = `Status: ${enabled ? "aktiv" : "deaktiviert"} • Provider: ${provider} • Modell: ${model}`;

  enableAiBtn.disabled = !canEdit || enabled;
  disableAiBtn.disabled = !canEdit || !enabled;
}

function renderAiLogs(entries = []) {
  aiLogList.innerHTML = "";
  if (!entries.length) {
    const li = document.createElement("li");
    li.textContent = "Noch keine KI-Logs.";
    aiLogList.appendChild(li);
    return;
  }

  entries.slice(0, 180).forEach((entry) => {
    const li = document.createElement("li");
    const at = entry.at ? new Date(entry.at).toLocaleString("de-DE") : "-";
    const state = entry.ok ? "ok" : `error: ${entry.error || "-"}`;
    const prompt = String(entry.prompt || "").slice(0, 120);
    const response = String(entry.response || "").slice(0, 120);
    li.textContent = `${at} • ${entry.endpoint || "-"} • ${entry.mode || "-"} • ${state} • ${entry.provider || "-"}/${entry.model || "-"} • Q: ${prompt || "-"} • A: ${response || "-"}`;
    aiLogList.appendChild(li);
  });
}

async function loadAdmin() {
  setInfo("Lade Admin-Daten…");
  try {
    const adminResponse = await adminFetch("/api/admin");
    const adminData = await adminResponse.json().catch(() => ({}));
    if (!adminResponse.ok) {
      throw new Error(adminData.error || "Kein Zugriff");
    }

    const aiResponse = await adminFetch("/api/admin/ai/logs");
    const aiData = await aiResponse.json().catch(() => ({}));
    if (!aiResponse.ok) {
      throw new Error(aiData.error || "KI-Logs konnten nicht geladen werden");
    }

    const canEdit = !!adminData?.access?.canEdit;
    renderAiControl(aiData, canEdit);
    renderAiLogs(aiData.logs || []);
    setInfo(`Aktualisiert (${adminData?.access?.role || "viewer"})`);
    setLoggedIn(true);
  } catch (error) {
    setLoggedIn(false);
    setInfo(error.message || "Admin-Login fehlgeschlagen");
  }
}

document.getElementById("adminLoginBtn").addEventListener("click", async () => {
  adminKey = String(adminKeyInput.value || "").trim();
  if (!adminKey) {
    setInfo("Bitte Admin-Key eingeben.");
    return;
  }
  window.localStorage.setItem(ADMIN_KEY_STORAGE, adminKey);
  window.localStorage.setItem(ADMIN_KEY_DRAFT_STORAGE, adminKey);
  await loadAdmin();
});

document.getElementById("adminLogoutBtn").addEventListener("click", () => {
  adminKey = "";
  window.localStorage.removeItem(ADMIN_KEY_STORAGE);
  setLoggedIn(false);
  setInfo("Abgemeldet");
});

refreshBtn.addEventListener("click", loadAdmin);

enableAiBtn.addEventListener("click", async () => {
  try {
    await postAdmin("/api/admin/ai/toggle", { enabled: true });
    setInfo("KI wurde global eingeschaltet.");
    await loadAdmin();
  } catch (error) {
    setInfo(error.message || "KI konnte nicht eingeschaltet werden");
  }
});

disableAiBtn.addEventListener("click", async () => {
  try {
    await postAdmin("/api/admin/ai/toggle", { enabled: false });
    setInfo("KI wurde global ausgeschaltet.");
    await loadAdmin();
  } catch (error) {
    setInfo(error.message || "KI konnte nicht ausgeschaltet werden");
  }
});

adminKeyInput.addEventListener("input", () => {
  window.localStorage.setItem(ADMIN_KEY_DRAFT_STORAGE, String(adminKeyInput.value || ""));
});

if (adminKey) {
  adminKeyInput.value = adminKey;
  loadAdmin();
} else {
  setLoggedIn(false);
  setInfo("Bitte einloggen");
}
