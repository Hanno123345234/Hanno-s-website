const socket = typeof window.io === "function" ? window.io() : null;

const PROFILE_STORAGE_KEY = "imposter_profile_name_v2";
const ROOM_SESSION_KEY = "imposter_room_session_v2";
const RECENT_PLAYERS_KEY = "imposter_recent_players_v2";

const homeView = document.getElementById("home");
const roomView = document.getElementById("room");

const profileNameInput = document.getElementById("profileNameInput");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const savedNameText = document.getElementById("savedNameText");
const menuActions = document.getElementById("menuActions");
const joinBox = document.getElementById("joinBox");
const codeInput = document.getElementById("codeInput");
const pinInput = document.getElementById("pinInput");
const spectatorToggle = document.getElementById("spectatorToggle");
const recentPlayersEl = document.getElementById("recentPlayers");

const createBtn = document.getElementById("createBtn");
const joinBtn = document.getElementById("joinBtn");
const errorBox = document.getElementById("errorBox");
const connectionBadge = document.getElementById("connectionBadge");

const roomCodeEl = document.getElementById("roomCode");
const stateText = document.getElementById("stateText");
const phaseTimer = document.getElementById("phaseTimer");
const roomNotice = document.getElementById("roomNotice");
const scoreGroup = document.getElementById("scoreGroup");
const scoreImposter = document.getElementById("scoreImposter");
const modeBadgeRoom = document.getElementById("modeBadgeRoom");

const playerList = document.getElementById("playerList");
const spectatorList = document.getElementById("spectatorList");
const renameInput = document.getElementById("renameInput");
const renameBtn = document.getElementById("renameBtn");

const hostControls = document.getElementById("hostControls");
const startRoundBtn = document.getElementById("startRoundBtn");
const startVoteBtn = document.getElementById("startVoteBtn");
const newRoundBtn = document.getElementById("newRoundBtn");
const backBtn = document.getElementById("backBtn");

const inviteBox = document.getElementById("inviteBox");
const copyCodeBtn = document.getElementById("copyCodeBtn");
const copyLinkBtn = document.getElementById("copyLinkBtn");
const pinDisplay = document.getElementById("pinDisplay");
const recentInviteList = document.getElementById("recentInviteList");
const inviteInfo = document.getElementById("inviteInfo");
const qrCodeEl = document.getElementById("qrCode");

const adminBox = document.getElementById("adminBox");
const modeSelect = document.getElementById("modeSelect");
const customTruthInput = document.getElementById("customTruthInput");
const customDareInput = document.getElementById("customDareInput");
const addTruthBtn = document.getElementById("addTruthBtn");
const addDareBtn = document.getElementById("addDareBtn");
const toggleLockBtn = document.getElementById("toggleLockBtn");
const abortRoundBtn = document.getElementById("abortRoundBtn");
const auditList = document.getElementById("auditList");
const statsList = document.getElementById("statsList");

const assignmentBox = document.getElementById("assignmentBox");
const modeBadge = document.getElementById("modeBadge");
const roleBadge = document.getElementById("roleBadge");
const promptText = document.getElementById("promptText");

const voteBox = document.getElementById("voteBox");
const voteButtons = document.getElementById("voteButtons");
const voteInfo = document.getElementById("voteInfo");

const resultBox = document.getElementById("resultBox");
const resultNewRoundBtn = document.getElementById("resultNewRoundBtn");

let profileName = "";
let selfId = null;
let room = null;
let participantType = "player";
let hasVoted = false;
let isMuted = false;
let timerInterval = null;
let currentQrValue = "";
let tryingAutoRejoin = false;

function sanitizeName(value) {
  return String(value || "").trim().slice(0, 24);
}

function sanitizeCode(value) {
  return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);
}

function sanitizePin(value) {
  return String(value || "").trim().replace(/[^0-9]/g, "").slice(0, 4);
}

function getFilterLabel(filterValue) {
  if (filterValue === "family") return "Familie";
  if (filterValue === "normal") return "Normal";
  if (filterValue === "spicy") return "Scharf";
  return filterValue || "Normal";
}

function showError(message = "") {
  errorBox.textContent = message;
  roomNotice.textContent = message;
  roomNotice.classList.toggle("hidden", !message);
}

function showInviteInfo(message = "") {
  inviteInfo.textContent = message;
}

function setConnectionState(connected, text) {
  connectionBadge.textContent = `● ${text}`;
  connectionBadge.classList.toggle("connection-online", connected);
  connectionBadge.classList.toggle("connection-offline", !connected);
  createBtn.disabled = !connected;
  joinBtn.disabled = !connected;
}

function setView(inRoom) {
  homeView.classList.toggle("active", !inRoom);
  roomView.classList.toggle("active", inRoom);
}

function saveSession(session) {
  window.localStorage.setItem(ROOM_SESSION_KEY, JSON.stringify(session));
}

function loadSession() {
  try {
    return JSON.parse(window.localStorage.getItem(ROOM_SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

function clearSession() {
  window.localStorage.removeItem(ROOM_SESSION_KEY);
}

function loadProfile() {
  profileName = sanitizeName(window.localStorage.getItem(PROFILE_STORAGE_KEY) || "");
  applyProfileUi();
}

function saveProfile(name) {
  const next = sanitizeName(name);
  if (!next) {
    showError("Bitte gib einen gültigen Namen ein.");
    return false;
  }
  profileName = next;
  window.localStorage.setItem(PROFILE_STORAGE_KEY, profileName);
  applyProfileUi();
  showError("");
  return true;
}

function loadRecentPlayers() {
  try {
    return JSON.parse(window.localStorage.getItem(RECENT_PLAYERS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveRecentPlayers(list) {
  window.localStorage.setItem(RECENT_PLAYERS_KEY, JSON.stringify(list.slice(0, 20)));
}

function addRecentPlayer(name) {
  const normalized = sanitizeName(name);
  if (!normalized || normalized.toLowerCase() === profileName.toLowerCase()) return;
  const list = loadRecentPlayers().filter((entry) => entry.toLowerCase() !== normalized.toLowerCase());
  list.unshift(normalized);
  saveRecentPlayers(list);
  renderRecentPlayers();
}

function renderRecentPlayers() {
  const list = loadRecentPlayers();
  recentPlayersEl.innerHTML = "";
  if (list.length === 0) {
    recentPlayersEl.innerHTML = '<span class="subtitle">Noch keine letzten Spieler</span>';
    return;
  }

  list.slice(0, 8).forEach((name) => {
    const button = document.createElement("button");
    button.textContent = name;
    button.className = "mini-btn";
    button.addEventListener("click", () => {
      profileNameInput.value = name;
      saveProfileBtn.click();
    });
    recentPlayersEl.appendChild(button);
  });
}

function applyProfileUi() {
  const hasProfile = !!profileName;
  savedNameText.textContent = hasProfile ? `Angemeldet als: ${profileName}` : "Noch nicht angemeldet";
  menuActions.classList.toggle("hidden", !hasProfile);
  joinBox.classList.toggle("hidden", !hasProfile);
  if (hasProfile) profileNameInput.value = profileName;
}

function getInviteLink(code, pin) {
  const url = new URL(window.location.href);
  url.searchParams.set("code", code);
  url.searchParams.set("pin", pin);
  return url.toString();
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const helper = document.createElement("textarea");
  helper.value = value;
  document.body.appendChild(helper);
  helper.select();
  document.execCommand("copy");
  document.body.removeChild(helper);
}

function resetTimer() {
  if (timerInterval) {
    window.clearInterval(timerInterval);
    timerInterval = null;
  }
  phaseTimer.classList.add("hidden");
  phaseTimer.classList.remove("warn");
  phaseTimer.textContent = "00:00";
}

function renderCountdown(endsAt) {
  resetTimer();
  if (!endsAt) return;

  function refresh() {
    const leftMs = Math.max(0, endsAt - Date.now());
    const totalSeconds = Math.ceil(leftMs / 1000);
    phaseTimer.textContent = `${String(Math.floor(totalSeconds / 60)).padStart(2, "0")}:${String(totalSeconds % 60).padStart(2, "0")}`;
    phaseTimer.classList.toggle("warn", totalSeconds <= 10);
    if (totalSeconds <= 0) resetTimer();
  }

  phaseTimer.classList.remove("hidden");
  refresh();
  timerInterval = window.setInterval(refresh, 250);
}

function pulse(element, className) {
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
  window.setTimeout(() => element.classList.remove(className), 420);
}

function getStateLabel(state) {
  if (!room) return "";
  if (state === "lobby") return room.settings.lobbyLocked ? "Lobby ist gesperrt" : "Lobby offen";
  if (state === "round") return participantType === "spectator" ? "Runde läuft (Zuschauer)" : "Runde läuft";
  if (state === "vote") return participantType === "spectator" ? "Abstimmung läuft (Zuschauer)" : "Abstimmung läuft";
  if (state === "ended") return "Runde beendet";
  return "";
}

function renderQrForHost() {
  if (!room || !room.pin) return;
  const link = getInviteLink(room.code, room.pin);
  if (currentQrValue === link) return;
  currentQrValue = link;
  qrCodeEl.innerHTML = "";

  const img = document.createElement("img");
  img.alt = "Einladungs-QR-Code";
  img.loading = "lazy";
  img.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(link)}`;
  img.addEventListener("error", () => {
    qrCodeEl.textContent = "QR nicht verfügbar";
    showInviteInfo("QR aktuell nicht verfügbar. Link kopieren funktioniert weiterhin.");
  });
  qrCodeEl.appendChild(img);
}

function renderInviteRecent() {
  recentInviteList.innerHTML = "";
  if (!room || !room.recentPlayers?.length) return;

  room.recentPlayers.slice(0, 6).forEach((name) => {
    const btn = document.createElement("button");
    btn.className = "mini-btn";
    btn.textContent = name;
    btn.addEventListener("click", async () => {
      try {
        const link = getInviteLink(room.code, room.pin || "");
        const text = `Hey ${name}, komm in Raum ${room.code} mit PIN ${room.pin}: ${link}`;
        await copyText(text);
        showInviteInfo(`Einladungstext für ${name} kopiert ✅`);
      } catch {
        showInviteInfo("Kopieren fehlgeschlagen.");
      }
    });
    recentInviteList.appendChild(btn);
  });
}

function renderVoteOptions() {
  voteButtons.innerHTML = "";
  if (!room || participantType !== "player") return;

  room.players.filter((player) => player.id !== selfId).forEach((player) => {
    const btn = document.createElement("button");
    btn.textContent = player.name;
    btn.disabled = hasVoted || isMuted;
    btn.addEventListener("click", () => {
      socket.emit("submit_vote", { targetId: player.id });
      hasVoted = true;
      renderVoteOptions();
    });
    voteButtons.appendChild(btn);
  });
}

function renderPlayers() {
  playerList.innerHTML = "";
  spectatorList.innerHTML = "";
  if (!room) return;

  const isHost = room.hostId === selfId;
  const mutedSet = new Set(room.mutedPlayerIds || []);

  room.players.forEach((player) => {
    const item = document.createElement("li");
    const name = document.createElement("span");
    name.className = "player-name";
    name.textContent = `${player.name}${player.id === room.hostId ? " 👑" : ""}${player.id === selfId ? " (Du)" : ""}${mutedSet.has(player.id) ? " 🔇" : ""}`;
    item.appendChild(name);

    if (mutedSet.has(player.id)) item.classList.add("player-muted");

    if (isHost && player.id !== selfId) {
      const actions = document.createElement("div");
      actions.className = "player-actions";

      const muteBtn = document.createElement("button");
      muteBtn.className = "mute-btn";
      muteBtn.textContent = mutedSet.has(player.id) ? "Stumm aus" : "Stumm";
      muteBtn.addEventListener("click", () => socket.emit("toggle_mute_player", { targetId: player.id }));

      const kickBtn = document.createElement("button");
      kickBtn.className = "kick-btn";
      kickBtn.textContent = "Rauswerfen";
      kickBtn.addEventListener("click", () => socket.emit("kick_player", { targetId: player.id }));

      actions.appendChild(muteBtn);
      actions.appendChild(kickBtn);
      item.appendChild(actions);
    }

    playerList.appendChild(item);
  });

  room.spectators.forEach((spec) => {
    const item = document.createElement("li");
    item.textContent = `${spec.name}${spec.id === selfId ? " (Du)" : ""}`;
    spectatorList.appendChild(item);
  });
}

function renderAuditAndStats() {
  if (!room) return;

  auditList.innerHTML = "";
  (room.auditLog || []).slice().reverse().forEach((entry) => {
    const li = document.createElement("li");
    const time = new Date(entry.at).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
    li.textContent = `[${time}] ${entry.message}`;
    auditList.appendChild(li);
  });

  statsList.innerHTML = "";
  (room.playerStats || []).forEach((stat) => {
    const li = document.createElement("li");
    li.textContent = `${stat.name}: Stimmen ${stat.votesCorrect}/${stat.votesGiven}, Verdächtigt ${stat.suspected}, S(Gruppe/Hochst) ${stat.groupWins}/${stat.imposterWins}`;
    statsList.appendChild(li);
  });
}

function renderHostControls() {
  if (!room) return;
  const isHost = room.hostId === selfId;

  hostControls.classList.toggle("hidden", !isHost);
  inviteBox.classList.toggle("hidden", !isHost);
  adminBox.classList.toggle("hidden", !isHost);

  if (isHost) {
    modeSelect.value = room.settings.contentFilter || "normal";
    toggleLockBtn.textContent = room.settings.lobbyLocked ? "Lobby entsperren" : "Lobby sperren";
    abortRoundBtn.disabled = !(room.state === "round" || room.state === "vote");
    pinDisplay.textContent = room.pin || "----";
    renderQrForHost();
    renderInviteRecent();
    renderAuditAndStats();
  }

  startRoundBtn.style.display = room.state === "lobby" || room.state === "ended" ? "block" : "none";
  startVoteBtn.style.display = room.state === "round" ? "block" : "none";
  newRoundBtn.style.display = room.state === "ended" ? "block" : "none";
  resultNewRoundBtn.classList.toggle("hidden", !(isHost && room.state === "ended"));
}

function renderState() {
  if (!room) return;

  roomCodeEl.textContent = room.code;
  stateText.textContent = getStateLabel(room.state);
  scoreGroup.textContent = room.scores?.gruppe ?? 0;
  scoreImposter.textContent = room.scores?.imposter ?? 0;
  modeBadgeRoom.textContent = `Filter: ${getFilterLabel(room.settings?.contentFilter)}`;

  isMuted = (room.mutedPlayerIds || []).includes(selfId);
  renderPlayers();
  renderHostControls();
  renderCountdown(room.phaseEndsAt || null);

  if (room.state === "vote") {
    voteBox.classList.remove("hidden");
    if (participantType === "spectator") {
      voteInfo.textContent = "Du bist Zuschauer und kannst nicht abstimmen.";
      voteButtons.innerHTML = "";
    } else {
      voteInfo.textContent = `${Object.keys(room.votes || {}).length}/${room.expectedVotes ?? room.players.length} Stimmen abgegeben${isMuted ? " • Du bist stummgeschaltet" : ""}`;
      renderVoteOptions();
    }
  } else {
    voteBox.classList.add("hidden");
    voteInfo.textContent = "";
  }
}

function resetToHome() {
  room = null;
  selfId = null;
  participantType = "player";
  hasVoted = false;
  isMuted = false;
  currentQrValue = "";

  playerList.innerHTML = "";
  spectatorList.innerHTML = "";
  voteButtons.innerHTML = "";
  voteInfo.textContent = "";
  resultBox.classList.add("hidden");
  resultBox.innerHTML = "";
  assignmentBox.classList.add("hidden");
  voteBox.classList.add("hidden");
  inviteBox.classList.add("hidden");
  adminBox.classList.add("hidden");
  resultNewRoundBtn.classList.add("hidden");
  roomNotice.textContent = "";
  roomNotice.classList.add("hidden");
  showInviteInfo("");
  pinDisplay.textContent = "----";
  qrCodeEl.innerHTML = "";
  auditList.innerHTML = "";
  statsList.innerHTML = "";
  resetTimer();
  setView(false);
  clearSession();
}

function attemptAutoRejoin() {
  if (!socket || !socket.connected || room || tryingAutoRejoin || !profileName) return;
  const session = loadSession();
  if (!session?.code || !session?.pin) return;

  tryingAutoRejoin = true;
  socket.emit("join_room", {
    name: profileName,
    code: session.code,
    pin: session.pin,
    spectator: !!session.spectator,
    rejoin: true
  });
  window.setTimeout(() => {
    tryingAutoRejoin = false;
  }, 1500);
}

saveProfileBtn.addEventListener("click", () => {
  saveProfile(profileNameInput.value);
});

createBtn.addEventListener("click", () => {
  if (!socket || !socket.connected) {
    showError("Keine Serververbindung.");
    return;
  }
  if (!profileName) {
    showError("Bitte zuerst anmelden.");
    return;
  }

  showError("");
  socket.emit("create_room", { name: profileName });
});

joinBtn.addEventListener("click", () => {
  if (!socket || !socket.connected) {
    showError("Keine Serververbindung.");
    return;
  }
  if (!profileName) {
    showError("Bitte zuerst anmelden.");
    return;
  }

  const code = sanitizeCode(codeInput.value);
  const pin = sanitizePin(pinInput.value);
  if (!code || pin.length !== 4) {
    showError("Raumcode + 4-stellige PIN eingeben.");
    return;
  }

  showError("");
  socket.emit("join_room", {
    name: profileName,
    code,
    pin,
    spectator: spectatorToggle.checked,
    rejoin: false
  });
});

profileNameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    saveProfileBtn.click();
  }
});

codeInput.addEventListener("input", () => {
  codeInput.value = sanitizeCode(codeInput.value);
});

pinInput.addEventListener("input", () => {
  pinInput.value = sanitizePin(pinInput.value);
});

codeInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    joinBtn.click();
  }
});

pinInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    joinBtn.click();
  }
});

copyCodeBtn.addEventListener("click", async () => {
  if (!room) return;
  try {
    await copyText(room.code);
    showInviteInfo("Raumcode kopiert ✅");
  } catch {
    showInviteInfo("Kopieren fehlgeschlagen.");
  }
});

copyLinkBtn.addEventListener("click", async () => {
  if (!room || !room.pin) return;
  try {
    await copyText(getInviteLink(room.code, room.pin));
    showInviteInfo("Einladungslink kopiert ✅");
  } catch {
    showInviteInfo("Kopieren fehlgeschlagen.");
  }
});

modeSelect.addEventListener("change", () => {
  if (!socket) return;
  socket.emit("set_content_filter", { filter: modeSelect.value });
});

addTruthBtn.addEventListener("click", () => {
  if (!socket) return;
  const text = String(customTruthInput.value || "").trim();
  if (!text) return;
  socket.emit("add_custom_prompt", { kind: "wahrheit", text });
  customTruthInput.value = "";
});

addDareBtn.addEventListener("click", () => {
  if (!socket) return;
  const text = String(customDareInput.value || "").trim();
  if (!text) return;
  socket.emit("add_custom_prompt", { kind: "pflicht", text });
  customDareInput.value = "";
});

toggleLockBtn.addEventListener("click", () => {
  if (!socket) return;
  socket.emit("toggle_lobby_lock");
});

abortRoundBtn.addEventListener("click", () => {
  if (!socket) return;
  socket.emit("abort_round");
});

renameBtn.addEventListener("click", () => {
  if (!socket || !room) return;
  const nextName = sanitizeName(renameInput.value);
  if (!nextName) {
    showError("Bitte gib einen gültigen Namen ein.");
    return;
  }
  socket.emit("update_name", { name: nextName });
});

startRoundBtn.addEventListener("click", () => {
  if (!socket) return;
  socket.emit("start_round");
  assignmentBox.classList.add("hidden");
  resultBox.classList.add("hidden");
});

startVoteBtn.addEventListener("click", () => {
  if (!socket) return;
  socket.emit("start_vote");
});

newRoundBtn.addEventListener("click", () => {
  if (!socket) return;
  socket.emit("new_round");
});

resultNewRoundBtn.addEventListener("click", () => {
  if (!socket) return;
  socket.emit("new_round");
});

backBtn.addEventListener("click", () => {
  if (!socket || !socket.connected) {
    resetToHome();
    return;
  }

  socket.emit("leave_room");
  resetToHome();
});

const initialCode = sanitizeCode(new URLSearchParams(window.location.search).get("code"));
const initialPin = sanitizePin(new URLSearchParams(window.location.search).get("pin"));
if (initialCode) codeInput.value = initialCode;
if (initialPin) pinInput.value = initialPin;

loadProfile();
renderRecentPlayers();

if (!socket) {
  setConnectionState(false, "Socket nicht geladen");
  showError("Socket.IO nicht gefunden.");
} else {
  setConnectionState(false, "Verbinden…");

  socket.on("connect", () => {
    setConnectionState(true, "Verbunden");
    showError("");
    attemptAutoRejoin();
  });

  socket.on("disconnect", () => {
    setConnectionState(false, "Getrennt");
  });

  socket.on("connect_error", () => {
    setConnectionState(false, "Server nicht erreichbar");
    showError("Server nicht erreichbar.");
  });

  socket.on("joined", ({ room: joinedRoom, selfId: myId, participantType: nextType }) => {
    room = joinedRoom;
    selfId = myId;
    participantType = nextType || "player";
    hasVoted = false;
    tryingAutoRejoin = false;

    assignmentBox.classList.add("hidden");
    resultBox.classList.add("hidden");
    resultNewRoundBtn.classList.add("hidden");

    renameInput.value = profileName;
    setView(true);
    renderState();

    const pin = room.pin || sanitizePin(pinInput.value);
    saveSession({ code: room.code, pin, spectator: participantType === "spectator" });
  });

  socket.on("room_update", (updatedRoom) => {
    room = updatedRoom;
    renderState();

    (room.players || []).forEach((player) => addRecentPlayer(player.name));
    (room.spectators || []).forEach((spec) => addRecentPlayer(spec.name));
  });

  socket.on("assignment", (data) => {
    hasVoted = false;
    assignmentBox.classList.remove("hidden");
    resultBox.classList.add("hidden");
    modeBadge.textContent = data.mode === "wahrheit" ? "Wahrheit" : "Pflicht";
    roleBadge.textContent = data.role === "imposter" ? "Rolle: Hochstapler" : "Rolle: Normal";
    promptText.textContent = data.prompt;
    pulse(assignmentBox, "pulse");
  });

  socket.on("spectator_assignment", ({ message }) => {
    assignmentBox.classList.remove("hidden");
    modeBadge.textContent = "Zuschauer";
    roleBadge.textContent = "Rolle: Zuschauer";
    promptText.textContent = message;
  });

  socket.on("round_started", ({ endsAt }) => {
    renderCountdown(endsAt);
    pulse(stateText, "pulse");
  });

  socket.on("vote_started", ({ endsAt }) => {
    hasVoted = false;
    renderCountdown(endsAt);
    renderState();
    pulse(voteBox, "pulse");
  });

  socket.on("round_aborted", ({ message }) => {
    assignmentBox.classList.add("hidden");
    voteBox.classList.add("hidden");
    resultBox.classList.add("hidden");
    showError(message || "Runde abgebrochen.");
  });

  socket.on("round_result", (result) => {
    voteBox.classList.add("hidden");
    resultBox.classList.remove("hidden");

    const winnerText = result.winner === "gruppe"
      ? "✅ Gruppe gewinnt – Hochstapler enttarnt"
      : "😈 Hochstapler gewinnt – nicht enttarnt";

    const tieText = result.tie ? "Es war ein Unentschieden." : "";
    const hostHint = room && room.hostId === selfId ? "" : "Warte, bis der Host die nächste Runde startet.";

    resultBox.innerHTML = `
      <h3>${winnerText}</h3>
      <p>Hochstapler war: <strong>${result.imposterName}</strong></p>
      <p>${tieText}</p>
      <p>${hostHint}</p>
    `;

    if (room) room.scores = result.scores;
    renderState();
    pulse(resultBox, "pop");
  });

  socket.on("muted_status", ({ muted }) => {
    isMuted = !!muted;
    showError(muted ? "Du bist stummgeschaltet." : "Du bist nicht mehr stummgeschaltet.");
  });

  socket.on("cooldown", ({ action, retryMs }) => {
    const seconds = Math.max(1, Math.ceil((retryMs || 0) / 1000));
    showError(`Cooldown (${action}): warte ${seconds}s.`);
  });

  socket.on("name_updated", ({ name }) => {
    profileName = sanitizeName(name);
    window.localStorage.setItem(PROFILE_STORAGE_KEY, profileName);
    applyProfileUi();
    renameInput.value = profileName;
    showError("Name aktualisiert ✅");
  });

  socket.on("left_room", () => {
    resetToHome();
  });

  socket.on("kicked", ({ message }) => {
    showError(message || "Du wurdest entfernt.");
    resetToHome();
  });

  socket.on("room_closed", ({ message }) => {
    showError(message || "Lobby wurde geschlossen.");
    resetToHome();
  });

  socket.on("error_message", (message) => {
    showError(message);
  });
}
