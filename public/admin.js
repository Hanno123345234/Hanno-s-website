const ADMIN_KEY_STORAGE = "admin_access_key_v1";

const adminInfo = document.getElementById("adminInfo");
const adminLoginBox = document.getElementById("adminLoginBox");
const adminPanel = document.getElementById("adminPanel");
const adminKeyInput = document.getElementById("adminKeyInput");
const refreshBtn = document.getElementById("refreshAdminBtn");
const accessBox = document.getElementById("accessBox");
const summaryList = document.getElementById("summaryList");
const memberList = document.getElementById("memberList");
const banList = document.getElementById("banList");
const muteList = document.getElementById("muteList");
const matchList = document.getElementById("matchList");
const grantInfo = document.getElementById("grantInfo");

let adminKey = window.localStorage.getItem(ADMIN_KEY_STORAGE) || "";

function setInfo(text) {
  adminInfo.textContent = text;
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

function createActionButton(label, onClick, variant = "") {
  const button = document.createElement("button");
  button.textContent = label;
  button.className = `mini-btn ${variant}`.trim();
  button.type = "button";
  button.addEventListener("click", onClick);
  return button;
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

function renderSummary(summary = {}, access = {}) {
  summaryList.innerHTML = "";
  const rows = [
    `Rolle: ${access.role || "-"}`,
    `Registrierte Nutzer: ${summary.registeredUsers || 0}`,
    `Aktive Räume: ${summary.activeRooms || 0}`,
    `Aktive Queue: ${summary.activeQueue || 0}`,
    `Online Fingerprints: ${summary.activeOnlineFingerprints || 0}`,
    `Match-Historie: ${summary.totalMatchesTracked || 0}`
  ];
  rows.forEach((text) => {
    const li = document.createElement("li");
    li.textContent = text;
    summaryList.appendChild(li);
  });
}

function renderMembers(members = [], access = {}) {
  memberList.innerHTML = "";
  const canEdit = !!access.canEdit;

  members.slice(0, 120).forEach((member) => {
    const li = document.createElement("li");
    const line = document.createElement("span");
    const lastSeen = member.lastSeenAt ? new Date(member.lastSeenAt).toLocaleString("de-DE") : "-";
    line.textContent = `${member.name} (${member.fingerprint}) • Online: ${member.online ? "ja" : "nein"} • Spiele: ${member.gamesPlayed} • Wins: ${member.wins} (${member.winRate}%) • Last Seen: ${lastSeen}`;
    li.appendChild(line);

    if (canEdit) {
      const actions = document.createElement("div");
      actions.className = "player-actions";

      actions.appendChild(createActionButton("Mute 30m", async () => {
        await postAdmin("/api/admin/mute", { fingerprint: member.fingerprint, minutes: 30, reason: "admin_ui_mute" });
        await loadAdmin();
      }));

      actions.appendChild(createActionButton("Unmute", async () => {
        await postAdmin("/api/admin/unmute", { fingerprint: member.fingerprint });
        await loadAdmin();
      }));

      actions.appendChild(createActionButton("Ban 24h", async () => {
        await postAdmin("/api/admin/ban", { fingerprint: member.fingerprint, minutes: 24 * 60, reason: "admin_ui_ban" });
        await loadAdmin();
      }, "kick-btn"));

      actions.appendChild(createActionButton("Unban", async () => {
        await postAdmin("/api/admin/unban", { fingerprint: member.fingerprint });
        await loadAdmin();
      }, "mute-btn"));

      li.appendChild(actions);
    }

    memberList.appendChild(li);
  });
}

function renderBanMuteList(listEl, entries = [], label) {
  listEl.innerHTML = "";
  if (!entries.length) {
    const li = document.createElement("li");
    li.textContent = `Keine aktiven ${label}.`;
    listEl.appendChild(li);
    return;
  }
  entries.forEach((entry) => {
    const li = document.createElement("li");
    const until = entry.until ? new Date(entry.until).toLocaleString("de-DE") : "-";
    li.textContent = `${entry.fingerprint} • bis ${until} • ${entry.reason || "-"}`;
    listEl.appendChild(li);
  });
}

function renderMatches(matches = []) {
  matchList.innerHTML = "";
  if (!matches.length) {
    const li = document.createElement("li");
    li.textContent = "Noch keine Match-Daten.";
    matchList.appendChild(li);
    return;
  }
  matches.slice(0, 80).forEach((match) => {
    const li = document.createElement("li");
    const names = (match.players || []).map((entry) => `${entry.name}:${entry.role}`).join(", ");
    li.textContent = `${new Date(match.at).toLocaleString("de-DE")} • ${match.code} • ${match.queueType} • Winner: ${match.winner} • ${names}`;
    matchList.appendChild(li);
  });
}

async function loadAdmin() {
  setInfo("Lade Admin-Daten…");
  try {
    const response = await adminFetch("/api/admin");
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "Kein Zugriff");
    }

    renderSummary(data.summary, data.access);
    renderMembers(data.members, data.access);
    renderBanMuteList(banList, data.bans || [], "Bans");
    renderBanMuteList(muteList, data.mutes || [], "Mutes");
    renderMatches(data.recentMatches || []);

    accessBox.classList.toggle("hidden", !data.access?.canGrant);
    setInfo(`Aktualisiert (${data.access?.role || "viewer"})`);
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
  await loadAdmin();
});

document.getElementById("adminLogoutBtn").addEventListener("click", () => {
  adminKey = "";
  window.localStorage.removeItem(ADMIN_KEY_STORAGE);
  setLoggedIn(false);
  setInfo("Abgemeldet");
});

document.getElementById("refreshAdminBtn").addEventListener("click", loadAdmin);

document.getElementById("grantAccessBtn").addEventListener("click", async () => {
  try {
    const label = String(document.getElementById("grantLabel").value || "").trim();
    const role = String(document.getElementById("grantRole").value || "viewer");
    const expiresHours = Number(document.getElementById("grantHours").value || 72);
    const result = await postAdmin("/api/admin/access/grant", {
      label,
      role,
      expiresHours
    });
    grantInfo.textContent = `Code: ${result.accessCode} • Rolle: ${result.role} • Ablauf: ${result.expiresHours}h`;
  } catch (error) {
    grantInfo.textContent = error.message || "Konnte Access nicht erstellen";
  }
});

if (adminKey) {
  adminKeyInput.value = adminKey;
  loadAdmin();
} else {
  setLoggedIn(false);
  setInfo("Bitte einloggen");
}
