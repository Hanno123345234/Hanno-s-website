const ADMIN_KEY_STORAGE = "admin_access_key_v1";
const ADMIN_KEY_DRAFT_STORAGE = "admin_access_key_draft_v1";
const ADMIN_COMMAND_DRAFT_STORAGE = "admin_command_draft_v1";
const ADMIN_GRANT_LABEL_STORAGE = "admin_grant_label_v1";
const ADMIN_GRANT_ROLE_STORAGE = "admin_grant_role_v1";
const ADMIN_GRANT_HOURS_STORAGE = "admin_grant_hours_v1";

const adminInfo = document.getElementById("adminInfo");
const adminLoginBox = document.getElementById("adminLoginBox");
const adminPanel = document.getElementById("adminPanel");
const adminKeyInput = document.getElementById("adminKeyInput");
const refreshBtn = document.getElementById("refreshAdminBtn");
const accessBox = document.getElementById("accessBox");
const commandBox = document.getElementById("commandSection");
const summaryList = document.getElementById("summaryList");
const memberList = document.getElementById("memberList");
const banList = document.getElementById("banList");
const muteList = document.getElementById("muteList");
const matchList = document.getElementById("matchList");
const grantInfo = document.getElementById("grantInfo");
const commandInfo = document.getElementById("commandInfo");
const moderationList = document.getElementById("moderationList");
const commandInput = document.getElementById("commandInput");
const navButtons = document.querySelectorAll(".admin-nav-btn");
const grantLabelInput = document.getElementById("grantLabel");
const grantRoleInput = document.getElementById("grantRole");
const grantHoursInput = document.getElementById("grantHours");

let adminKey = window.localStorage.getItem(ADMIN_KEY_STORAGE) || "";
const savedAdminKeyDraft = window.localStorage.getItem(ADMIN_KEY_DRAFT_STORAGE) || "";

if (savedAdminKeyDraft) {
  adminKey = savedAdminKeyDraft;
}

function setInfo(text) {
  adminInfo.textContent = text;
}

function setLoggedIn(isLoggedIn) {
  adminPanel.classList.toggle("hidden", !isLoggedIn);
  refreshBtn.classList.toggle("hidden", !isLoggedIn);
}

function setCommandInfo(text) {
  if (!commandInfo) return;
  commandInfo.textContent = text;
}

function wireAdminNavigation() {
  navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const targetId = String(button.getAttribute("data-target") || "").trim();
      if (!targetId) return;
      const target = document.getElementById(targetId);
      if (!target) return;
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
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
    `Match-Historie: ${summary.totalMatchesTracked || 0}`,
    `Moderation Actions: ${summary.moderationActions || 0}`,
    `Join Logs: ${summary.joinLogCount || 0}`
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

function renderModerationLogs(entries = []) {
  moderationList.innerHTML = "";
  if (!entries.length) {
    const li = document.createElement("li");
    li.textContent = "Noch keine Moderation-Logs.";
    moderationList.appendChild(li);
    return;
  }
  entries.slice(0, 80).forEach((entry) => {
    const li = document.createElement("li");
    const at = entry.at ? new Date(entry.at).toLocaleString("de-DE") : "-";
    const duration = entry.permanent ? "permanent" : (entry.minutes ? `${entry.minutes}m` : "-");
    li.textContent = `${at} • ${entry.action} • ${entry.fingerprint} • ${duration} • ${entry.reason || "-"} • by ${entry.by || "-"}`;
    moderationList.appendChild(li);
  });
}

async function loadModerationLogs() {
  const response = await adminFetch("/api/admin/moderation-logs");
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Moderation-Logs konnten nicht geladen werden");
  }
  renderModerationLogs(data.logs || []);
  return data.logs || [];
}

function parseDurationToken(token) {
  if (!token) return NaN;
  const normalized = String(token).trim().toLowerCase();
  if (/^\d+$/.test(normalized)) {
    return Number(normalized);
  }
  const match = normalized.match(/^(\d+)(m|min|h|d)$/);
  if (!match) return NaN;
  const value = Number(match[1]);
  const unit = match[2];
  if (unit === "m" || unit === "min") return value;
  if (unit === "h") return value * 60;
  if (unit === "d") return value * 1440;
  return NaN;
}

async function runAdminCommand(raw) {
  const input = String(raw || "").trim();
  if (!input.startsWith("*")) {
    throw new Error("Command muss mit * starten");
  }
  const tokens = input.split(/\s+/).filter(Boolean);
  const command = (tokens[0] || "").toLowerCase();

  if (command === "*md") {
    const logs = await loadModerationLogs();
    return `Moderation-Logs geladen (${logs.length})`;
  }

  if (command === "*unban") {
    const fingerprint = tokens[1];
    if (!fingerprint) throw new Error("Nutze: *unban <fingerprint>");
    await postAdmin("/api/admin/unban", { fingerprint });
    return `Unban gesetzt für ${fingerprint}`;
  }

  if (command === "*unmute") {
    const fingerprint = tokens[1];
    if (!fingerprint) throw new Error("Nutze: *unmute <fingerprint>");
    await postAdmin("/api/admin/unmute", { fingerprint });
    return `Unmute gesetzt für ${fingerprint}`;
  }

  if (command === "*ban") {
    const fingerprint = tokens[1];
    if (!fingerprint) throw new Error("Nutze: *ban <fingerprint> <reason...> [zeit]");
    const tail = tokens.slice(2);
    let minutes = null;
    if (tail.length) {
      const maybeDuration = parseDurationToken(tail[tail.length - 1]);
      if (Number.isFinite(maybeDuration) && maybeDuration > 0) {
        minutes = maybeDuration;
        tail.pop();
      }
    }
    const reason = tail.join(" ").trim() || "admin_command_ban";
    await postAdmin("/api/admin/ban", {
      fingerprint,
      reason,
      ...(minutes ? { minutes } : {})
    });
    return minutes
      ? `Ban gesetzt für ${fingerprint} (${minutes}m)`
      : `Permanenter Ban gesetzt für ${fingerprint}`;
  }

  if (command === "*mute") {
    const fingerprint = tokens[1];
    const minutes = parseDurationToken(tokens[2]);
    if (!fingerprint || !Number.isFinite(minutes) || minutes <= 0) {
      throw new Error("Nutze: *mute <fingerprint> <zeit> [reason...]");
    }
    const reason = tokens.slice(3).join(" ").trim() || "admin_command_mute";
    await postAdmin("/api/admin/mute", { fingerprint, minutes, reason });
    return `Mute gesetzt für ${fingerprint} (${minutes}m)`;
  }

  throw new Error("Unbekannter Command. Erlaubt: *ban *unban *mute *unmute *md");
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
    renderModerationLogs([]);
    await loadModerationLogs();

    accessBox.classList.toggle("hidden", !data.access?.canGrant);
    commandBox.classList.toggle("hidden", !data.access?.canEdit);
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
  window.localStorage.setItem(ADMIN_KEY_DRAFT_STORAGE, adminKey);
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

document.getElementById("runCommandBtn").addEventListener("click", async () => {
  try {
    setCommandInfo("Command läuft…");
    const message = await runAdminCommand(commandInput.value);
    setCommandInfo(message);
    await loadAdmin();
  } catch (error) {
    setCommandInfo(error.message || "Command fehlgeschlagen");
  }
});

commandInput.addEventListener("keydown", async (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  document.getElementById("runCommandBtn").click();
});

adminKeyInput.addEventListener("input", () => {
  const value = String(adminKeyInput.value || "");
  window.localStorage.setItem(ADMIN_KEY_DRAFT_STORAGE, value);
});

if (commandInput) {
  const commandDraft = window.localStorage.getItem(ADMIN_COMMAND_DRAFT_STORAGE);
  if (commandDraft !== null) {
    commandInput.value = commandDraft;
  }

  commandInput.addEventListener("input", () => {
    window.localStorage.setItem(ADMIN_COMMAND_DRAFT_STORAGE, String(commandInput.value || ""));
  });
}

if (grantLabelInput) {
  const grantLabelDraft = window.localStorage.getItem(ADMIN_GRANT_LABEL_STORAGE);
  if (grantLabelDraft !== null) {
    grantLabelInput.value = grantLabelDraft;
  }

  grantLabelInput.addEventListener("input", () => {
    window.localStorage.setItem(ADMIN_GRANT_LABEL_STORAGE, String(grantLabelInput.value || ""));
  });
}

if (grantRoleInput) {
  const savedRole = window.localStorage.getItem(ADMIN_GRANT_ROLE_STORAGE);
  if (savedRole) {
    grantRoleInput.value = savedRole;
  }

  grantRoleInput.addEventListener("change", () => {
    window.localStorage.setItem(ADMIN_GRANT_ROLE_STORAGE, String(grantRoleInput.value || "viewer"));
  });
}

if (grantHoursInput) {
  const savedHours = window.localStorage.getItem(ADMIN_GRANT_HOURS_STORAGE);
  if (savedHours) {
    grantHoursInput.value = savedHours;
  }

  grantHoursInput.addEventListener("input", () => {
    window.localStorage.setItem(ADMIN_GRANT_HOURS_STORAGE, String(grantHoursInput.value || ""));
  });
}

if (adminKey) {
  adminKeyInput.value = adminKey;
  loadAdmin();
} else {
  setLoggedIn(false);
  setInfo("Bitte einloggen");
}

wireAdminNavigation();
