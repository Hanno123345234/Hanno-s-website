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
const commandList = document.getElementById("discordCommandList");
const cmdTriggerInput = document.getElementById("cmdTriggerInput");
const cmdModeSelect = document.getElementById("cmdModeSelect");
const cmdEmbedFields = document.getElementById("cmdEmbedFields");
const cmdSearchInput = document.getElementById("cmdSearchInput");
const cmdFilterAction = document.getElementById("cmdFilterAction");
const cmdEmbedTitleInput = document.getElementById("cmdEmbedTitleInput");
const cmdEmbedColorInput = document.getElementById("cmdEmbedColorInput");
const cmdResponseInput = document.getElementById("cmdResponseInput");
const cmdEnabledInput = document.getElementById("cmdEnabledInput");
const cmdSaveBtn = document.getElementById("cmdSaveBtn");
const cmdResetBtn = document.getElementById("cmdResetBtn");
const cmdStatusInfo = document.getElementById("cmdStatusInfo");

let adminKey = window.localStorage.getItem(ADMIN_KEY_STORAGE) || "";
const draftKey = window.localStorage.getItem(ADMIN_KEY_DRAFT_STORAGE) || "";
if (draftKey) adminKey = draftKey;

let canEditAdmin = false;
let discordCommands = [];
let editingTrigger = null;

function setInfo(text) {
  adminInfo.textContent = String(text || "");
}

function setCommandStatus(text) {
  if (!cmdStatusInfo) return;
  cmdStatusInfo.textContent = String(text || "");
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

  entries.forEach((entry) => {
    const li = document.createElement("li");
    li.className = "ai-log-item";

    const at = entry.at ? new Date(entry.at).toLocaleString("de-DE") : "-";
    const state = entry.ok ? "ok" : `error: ${entry.error || "-"}`;

    const meta = document.createElement("div");
    meta.textContent = `${at} • ${entry.endpoint || "-"} • ${entry.mode || "-"} • ${state} • ${entry.provider || "-"}/${entry.model || "-"}`;

    const question = document.createElement("div");
    question.textContent = `Q: ${String(entry.prompt || "-")}`;

    const answer = document.createElement("div");
    answer.textContent = `A: ${String(entry.response || "-")}`;

    li.appendChild(meta);
    li.appendChild(question);
    li.appendChild(answer);
    aiLogList.appendChild(li);
  });
}

function sanitizeHexColor(raw, fallback = "#87CEFA") {
  const value = String(raw || "").trim();
  const m = value.match(/^#?[0-9a-fA-F]{6}$/);
  if (!m) return fallback;
  return `#${value.replace(/^#/, "").toUpperCase()}`;
}

function updateCommandModeUI() {
  const isEmbed = String(cmdModeSelect.value || "text") === "embed";
  if (cmdEmbedFields) cmdEmbedFields.classList.toggle("hidden", !isEmbed);
}

function commandModeView(modeRaw) {
  const mode = String(modeRaw || "text").toLowerCase();
  if (mode === "embed") return { label: "EMBED", badgeClass: "is-embed" };
  if (mode === "dm") return { label: "DM", badgeClass: "is-dm" };
  if (mode === "ban") return { label: "BAN", badgeClass: "is-ban" };
  if (mode === "mute") return { label: "MUTE", badgeClass: "is-mute" };
  if (mode === "kick") return { label: "KICK", badgeClass: "is-kick" };
  if (mode === "role") return { label: "ROLE", badgeClass: "is-role" };
  return { label: "TEXT", badgeClass: "is-text" };
}

function resetCommandForm() {
  editingTrigger = null;
  cmdTriggerInput.value = "";
  cmdModeSelect.value = "text";
  cmdEmbedTitleInput.value = "";
  cmdEmbedColorInput.value = "#87CEFA";
  cmdResponseInput.value = "";
  cmdEnabledInput.checked = true;
  cmdSaveBtn.textContent = "Command speichern";
  updateCommandModeUI();
  setCommandStatus("Bereit. Neuen Command anlegen oder bestehenden bearbeiten.");
}

function setCommandEditorEnabled(enabled) {
  cmdTriggerInput.disabled = !enabled;
  cmdModeSelect.disabled = !enabled;
  cmdEmbedTitleInput.disabled = !enabled;
  cmdEmbedColorInput.disabled = !enabled;
  cmdResponseInput.disabled = !enabled;
  cmdEnabledInput.disabled = !enabled;
  cmdSaveBtn.disabled = !enabled;
  cmdResetBtn.disabled = !enabled;
}

async function saveDiscordCommands() {
  const payload = {
    commands: discordCommands.map((entry) => ({
      trigger: entry.trigger,
      response: entry.response,
      enabled: entry.enabled !== false,
      mode: entry.mode || "text",
      embedTitle: entry.embedTitle || "",
      embedColor: sanitizeHexColor(entry.embedColor || "#87CEFA")
    }))
  };
  const data = await postAdmin("/api/admin/discord-commands", payload);
  discordCommands = Array.isArray(data?.commands) ? data.commands : [];
  if (data?.persisted === false && data?.persistError) {
    setInfo(`Gespeichert, aber Warnung: ${data.persistError}`);
  }
  return data;
}

function renderDiscordCommands() {
  commandList.innerHTML = "";
  if (!discordCommands.length) {
    const li = document.createElement("li");
    li.className = "command-empty";
    li.textContent = "Noch keine Commands angelegt.";
    commandList.appendChild(li);
    setCommandStatus("0 Commands vorhanden. Lege deinen ersten Command an.");
    return;
  }

  const search = String(cmdSearchInput?.value || "").trim().toLowerCase();
  const actionFilter = String(cmdFilterAction?.value || "all").trim().toLowerCase();

  const visibleCommands = discordCommands.filter((entry) => {
    const mode = String(entry.mode || "text").toLowerCase();
    if (actionFilter !== "all" && mode !== actionFilter) return false;
    if (!search) return true;
    const haystack = `${entry.trigger || ""} ${entry.response || ""} ${entry.embedTitle || ""}`.toLowerCase();
    return haystack.includes(search);
  });

  if (!visibleCommands.length) {
    const li = document.createElement("li");
    li.className = "command-empty";
    li.textContent = "Keine Commands passend zur Suche gefunden.";
    commandList.appendChild(li);
    const activeSearch = search ? `Suche: "${search}"` : "Suche: -";
    const activeFilter = actionFilter !== "all" ? `Filter: ${actionFilter}` : "Filter: alle";
    setCommandStatus(`Keine Treffer. ${activeSearch} | ${activeFilter}`);
    return;
  }

  setCommandStatus(`${visibleCommands.length} von ${discordCommands.length} Commands sichtbar.`);

  visibleCommands
    .slice()
    .sort((a, b) => String(a.trigger).localeCompare(String(b.trigger)))
    .forEach((entry) => {
      const li = document.createElement("li");
      li.className = "command-card";

      const mode = String(entry.mode || "text").toLowerCase();
      const modeView = commandModeView(mode);

      const header = document.createElement("div");
      header.className = "command-card-header";

      const title = document.createElement("h4");
      title.className = "command-card-title";
      title.textContent = String(entry.trigger || "-");

      const actionBadge = document.createElement("span");
      actionBadge.className = `command-action-badge ${modeView.badgeClass}`;
      actionBadge.textContent = modeView.label;

      header.appendChild(title);
      header.appendChild(actionBadge);

      const chips = document.createElement("div");
      chips.className = "command-card-chips";

      const rateChip = document.createElement("span");
      rateChip.className = "command-chip chip-rate";
      rateChip.textContent = "Rate Limited";

      const stateChip = document.createElement("span");
      stateChip.className = `command-chip ${entry.enabled === false ? "chip-disabled" : "chip-enabled"}`;
      stateChip.textContent = entry.enabled === false ? "Disabled" : "Enabled";

      chips.appendChild(rateChip);
      chips.appendChild(stateChip);

      const preview = document.createElement("div");
      preview.className = "command-card-preview";
      const previewText = String(entry.response || "").trim();
      preview.textContent = previewText ? previewText.slice(0, 160) : "Keine Vorschau";

      const actions = document.createElement("div");
      actions.className = "command-card-actions";

      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "mini-btn command-card-btn";
      editBtn.textContent = "Edit";
      editBtn.disabled = !canEditAdmin;
      editBtn.addEventListener("click", () => {
        editingTrigger = entry.trigger;
        cmdTriggerInput.value = entry.trigger;
        cmdModeSelect.value = entry.mode || "text";
        cmdEmbedTitleInput.value = entry.embedTitle || "";
        cmdEmbedColorInput.value = sanitizeHexColor(entry.embedColor || "#87CEFA");
        cmdResponseInput.value = entry.response || "";
        cmdEnabledInput.checked = entry.enabled !== false;
        cmdSaveBtn.textContent = "Command aktualisieren";
        updateCommandModeUI();
      });

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "kick-btn command-card-btn";
      deleteBtn.textContent = "Delete";
      deleteBtn.disabled = !canEditAdmin;
      deleteBtn.addEventListener("click", async () => {
        if (!window.confirm(`Command *${entry.trigger} loeschen?`)) return;
        try {
          discordCommands = discordCommands.filter((item) => item.trigger !== entry.trigger);
          await saveDiscordCommands();
          renderDiscordCommands();
          setInfo(`Command *${entry.trigger} geloescht.`);
          if (editingTrigger === entry.trigger) resetCommandForm();
        } catch (error) {
          setInfo(error.message || "Command konnte nicht geloescht werden");
        }
      });

      actions.appendChild(editBtn);
      actions.appendChild(deleteBtn);
      li.appendChild(header);
      li.appendChild(chips);
      li.appendChild(preview);
      li.appendChild(actions);
      commandList.appendChild(li);
    });
}

async function loadDiscordCommands() {
  const response = await adminFetch("/api/admin/discord-commands");
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Discord Commands konnten nicht geladen werden");
  }
  discordCommands = Array.isArray(data?.commands) ? data.commands : [];
  if (data?.persisted === false && data?.persistError) {
    setInfo(`Warnung: ${data.persistError}`);
  }
  if (discordCommands.length) {
    setCommandStatus(`${discordCommands.length} Commands geladen.`);
  } else {
    setCommandStatus("Noch keine Commands vorhanden.");
  }
  renderDiscordCommands();
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

    canEditAdmin = !!adminData?.access?.canEdit;
    renderAiControl(aiData, canEditAdmin);
    renderAiLogs(aiData.logs || []);
    setCommandEditorEnabled(canEditAdmin);
    await loadDiscordCommands();
    setInfo(`Aktualisiert (${adminData?.access?.role || "viewer"})`);
    setLoggedIn(true);
  } catch (error) {
    setLoggedIn(false);
    setCommandEditorEnabled(false);
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

cmdSaveBtn.addEventListener("click", async () => {
  if (!canEditAdmin) {
    setInfo("Keine Bearbeitungsrechte fuer Commands.");
    return;
  }

  const trigger = String(cmdTriggerInput.value || "").trim().toLowerCase().replace(/\s+/g, "");
  const mode = String(cmdModeSelect.value || "text").trim().toLowerCase();
  const response = String(cmdResponseInput.value || "").trim();
  const embedTitle = String(cmdEmbedTitleInput.value || "").trim();
  const embedColor = sanitizeHexColor(cmdEmbedColorInput.value || "#87CEFA");

  if (!/^[a-z0-9][a-z0-9_-]{1,31}$/.test(trigger)) {
    setInfo("Trigger ungueltig. Erlaubt: a-z, 0-9, _, -, Laenge 2-32.");
    return;
  }
  if (!response) {
    setInfo("Antwort darf nicht leer sein.");
    return;
  }

  const allowedModes = new Set(["text", "embed", "dm", "ban", "mute", "kick", "role"]);
  const normalizedMode = allowedModes.has(mode) ? mode : "text";

  const next = {
    trigger,
    response,
    enabled: !!cmdEnabledInput.checked,
    mode: normalizedMode,
    embedTitle,
    embedColor
  };

  try {
    const existingIndex = discordCommands.findIndex((entry) => entry.trigger === trigger);
    if (existingIndex >= 0) {
      discordCommands[existingIndex] = next;
    } else {
      discordCommands.push(next);
    }

    if (editingTrigger && editingTrigger !== trigger) {
      discordCommands = discordCommands.filter((entry) => entry.trigger !== editingTrigger);
    }

    const out = await saveDiscordCommands();
    if (cmdSearchInput) cmdSearchInput.value = "";
    if (cmdFilterAction) cmdFilterAction.value = "all";
    renderDiscordCommands();
    resetCommandForm();
    const sync = out?.sync || {};
    if (sync.attempted) {
      if (sync.ok) setInfo(`Command *${trigger} gespeichert und Bot sofort synchronisiert.`);
      else {
        const syncError = String(sync.error || "").toLowerCase();
        if (syncError.includes("timeout")) {
          setInfo(`Command *${trigger} gespeichert. Bot-Sync laeuft verzoegert, der Polling-Fallback uebernimmt.`);
        } else {
          setInfo(`Command *${trigger} gespeichert. Sofort-Sync fehlgeschlagen: ${sync.error || "unknown"}.`);
        }
      }
    } else {
      setInfo(`Command *${trigger} gespeichert.`);
    }
    setCommandStatus(`Command *${trigger} gespeichert und unten in der Liste aktualisiert.`);
  } catch (error) {
    setInfo(error.message || "Command konnte nicht gespeichert werden");
    setCommandStatus("Speichern fehlgeschlagen. Bitte Eingaben und Zugriff pruefen.");
  }
});

cmdResetBtn.addEventListener("click", () => {
  if (cmdSearchInput) cmdSearchInput.value = "";
  if (cmdFilterAction) cmdFilterAction.value = "all";
  renderDiscordCommands();
  resetCommandForm();
  setInfo("Formular zurueckgesetzt.");
});

if (cmdModeSelect) cmdModeSelect.addEventListener("change", updateCommandModeUI);
if (cmdSearchInput) {
  cmdSearchInput.addEventListener("input", () => {
    renderDiscordCommands();
    const query = String(cmdSearchInput.value || "").trim();
    if (query) setCommandStatus(`Suche aktiv: "${query}"`);
  });
}
if (cmdFilterAction) {
  cmdFilterAction.addEventListener("change", () => {
    renderDiscordCommands();
    const mode = String(cmdFilterAction.value || "all");
    setCommandStatus(mode === "all" ? "Filter entfernt. Alle Aktionen sichtbar." : `Filter aktiv: ${mode}`);
  });
}

adminKeyInput.addEventListener("input", () => {
  window.localStorage.setItem(ADMIN_KEY_DRAFT_STORAGE, String(adminKeyInput.value || ""));
});

if (adminKey) {
  adminKeyInput.value = adminKey;
  resetCommandForm();
  updateCommandModeUI();
  loadAdmin();
} else {
  setLoggedIn(false);
  setCommandEditorEnabled(false);
  resetCommandForm();
  updateCommandModeUI();
  setInfo("Bitte einloggen");
}
