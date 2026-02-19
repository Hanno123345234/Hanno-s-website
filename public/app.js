const socket = typeof window.io === "function" ? window.io() : null;

const homeView = document.getElementById("home");
const roomView = document.getElementById("room");
const profileNameInput = document.getElementById("profileNameInput");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const savedNameText = document.getElementById("savedNameText");
const menuActions = document.getElementById("menuActions");
const joinBox = document.getElementById("joinBox");
const codeInput = document.getElementById("codeInput");
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
const inviteInfo = document.getElementById("inviteInfo");
const qrCodeEl = document.getElementById("qrCode");

const adminBox = document.getElementById("adminBox");
const modeSelect = document.getElementById("modeSelect");
const toggleLockBtn = document.getElementById("toggleLockBtn");
const abortRoundBtn = document.getElementById("abortRoundBtn");

const assignmentBox = document.getElementById("assignmentBox");
const modeBadge = document.getElementById("modeBadge");
const roleBadge = document.getElementById("roleBadge");
const promptText = document.getElementById("promptText");

const voteBox = document.getElementById("voteBox");
const voteButtons = document.getElementById("voteButtons");
const voteInfo = document.getElementById("voteInfo");

const resultBox = document.getElementById("resultBox");
const resultNewRoundBtn = document.getElementById("resultNewRoundBtn");

let selfId = null;
let room = null;
let hasVoted = false;
let timerInterval = null;
let currentQrValue = "";
let isMuted = false;
let lastLobbyLocked = null;
let profileName = "";
const PROFILE_STORAGE_KEY = "imposter_profile_name_v1";

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

function sanitizeAnyName(value) {
  return String(value || "").trim().slice(0, 24);
}

function applyProfileUi() {
  const hasProfile = !!profileName;
  savedNameText.textContent = hasProfile ? `Angemeldet als: ${profileName}` : "Noch nicht angemeldet";
  menuActions.classList.toggle("hidden", !hasProfile);
  joinBox.classList.toggle("hidden", !hasProfile);
  if (hasProfile) {
    profileNameInput.value = profileName;
  }
}

function loadProfile() {
  profileName = sanitizeAnyName(window.localStorage.getItem(PROFILE_STORAGE_KEY) || "");
  applyProfileUi();
}

function saveProfile(nextName) {
  profileName = sanitizeAnyName(nextName);
  if (!profileName) {
    showError("Bitte einen gültigen Namen eingeben.");
    return false;
  }

  window.localStorage.setItem(PROFILE_STORAGE_KEY, profileName);
  applyProfileUi();
  showError("");
  return true;
}

function setView(inRoom) {
  homeView.classList.toggle("active", !inRoom);
  roomView.classList.toggle("active", inRoom);
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
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
    const seconds = String(totalSeconds % 60).padStart(2, "0");
    phaseTimer.textContent = `${minutes}:${seconds}`;
    phaseTimer.classList.toggle("warn", totalSeconds <= 10);

    if (totalSeconds <= 0) {
      resetTimer();
    }
  }

  phaseTimer.classList.remove("hidden");
  refresh();
  timerInterval = window.setInterval(refresh, 250);
}

function pulse(element, className) {
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
  window.setTimeout(() => element.classList.remove(className), 460);
}

function getStateLabel(state) {
  if (state === "lobby") {
    return room?.settings?.lobbyLocked ? "Lobby ist gesperrt" : "Lobby offen für neue Spieler";
  }
  if (state === "round") return "Runde läuft – Aufgabe ausführen";
  if (state === "vote") return "Abstimmung läuft";
  if (state === "ended") return "Runde beendet";
  return "";
}

function getInviteLink(code) {
  const url = new URL(window.location.href);
  url.searchParams.set("code", code);
  return url.toString();
}

async function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const helper = document.createElement("textarea");
  helper.value = text;
  document.body.appendChild(helper);
  helper.select();
  document.execCommand("copy");
  document.body.removeChild(helper);
}

function resetToHome() {
  room = null;
  selfId = null;
  hasVoted = false;
  isMuted = false;
  lastLobbyLocked = null;
  currentQrValue = "";
  playerList.innerHTML = "";
  voteButtons.innerHTML = "";
  voteInfo.textContent = "";
  resultBox.classList.add("hidden");
  resultBox.innerHTML = "";
  assignmentBox.classList.add("hidden");
  voteBox.classList.add("hidden");
  inviteBox.classList.add("hidden");
  adminBox.classList.add("hidden");
  showInviteInfo("");
  roomNotice.textContent = "";
  roomNotice.classList.add("hidden");
  resultNewRoundBtn.classList.add("hidden");
  qrCodeEl.innerHTML = "";
  resetTimer();
  setView(false);
}

function renderQrForHost() {
  if (!room) return;
  const inviteLink = getInviteLink(room.code);
  if (currentQrValue === inviteLink) return;
  currentQrValue = inviteLink;
  qrCodeEl.innerHTML = "";

  const qrImage = document.createElement("img");
  qrImage.alt = "QR Code Einladung";
  qrImage.loading = "lazy";
  qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(inviteLink)}`;
  qrImage.addEventListener("error", () => {
    qrCodeEl.textContent = "QR aktuell nicht verfügbar";
    showInviteInfo("QR konnte nicht geladen werden. Link kopieren funktioniert weiterhin.");
  });
  qrCodeEl.appendChild(qrImage);
}

function renderVoteOptions() {
  voteButtons.innerHTML = "";
  if (!room) return;

  room.players
    .filter((player) => player.id !== selfId)
    .forEach((player) => {
      const button = document.createElement("button");
      button.textContent = player.name;
      button.disabled = hasVoted || isMuted;
      button.addEventListener("click", () => {
        socket.emit("submit_vote", { targetId: player.id });
        hasVoted = true;
        renderVoteOptions();
      });
      voteButtons.appendChild(button);
    });
}

function renderPlayers() {
  playerList.innerHTML = "";
  if (!room) return;

  const isHost = room.hostId === selfId;
  const mutedIds = new Set(room.mutedPlayerIds || []);

  room.players.forEach((player) => {
    const item = document.createElement("li");
    if (mutedIds.has(player.id)) {
      item.classList.add("player-muted");
    }

    const hostTag = player.id === room.hostId ? " 👑" : "";
    const selfTag = player.id === selfId ? " (Du)" : "";
    const mutedTag = mutedIds.has(player.id) ? " 🔇" : "";

    const nameSpan = document.createElement("span");
    nameSpan.className = "player-name";
    nameSpan.textContent = `${player.name}${hostTag}${selfTag}${mutedTag}`;
    item.appendChild(nameSpan);

    if (isHost && player.id !== selfId) {
      const actions = document.createElement("div");
      actions.className = "player-actions";

      const muteBtn = document.createElement("button");
      muteBtn.className = "mute-btn";
      muteBtn.textContent = mutedIds.has(player.id) ? "Entstumm" : "Stumm";
      muteBtn.addEventListener("click", () => {
        socket.emit("toggle_mute_player", { targetId: player.id });
      });

      const kickBtn = document.createElement("button");
      kickBtn.className = "kick-btn";
      kickBtn.textContent = "Kicken";
      kickBtn.addEventListener("click", () => {
        socket.emit("kick_player", { targetId: player.id });
      });

      actions.appendChild(muteBtn);
      actions.appendChild(kickBtn);
      item.appendChild(actions);
    }

    playerList.appendChild(item);
  });
}

function renderHostControls() {
  if (!room) return;

  const isHost = room.hostId === selfId;
  hostControls.classList.toggle("hidden", !isHost);
  inviteBox.classList.toggle("hidden", !isHost);
  adminBox.classList.toggle("hidden", !isHost);

  if (isHost) {
    modeSelect.value = room.settings.gameMode;
    toggleLockBtn.textContent = room.settings.lobbyLocked ? "Lobby entsperren" : "Lobby sperren";
    abortRoundBtn.disabled = !(room.state === "round" || room.state === "vote");
    renderQrForHost();
  }

  startRoundBtn.style.display = room.state === "lobby" ? "block" : "none";
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
  modeBadgeRoom.textContent = `Modus: ${room.settings?.gameMode || "spicy"}`;
  isMuted = (room.mutedPlayerIds || []).includes(selfId);

  renderPlayers();
  renderHostControls();
  renderCountdown(room.phaseEndsAt || null);

  if (room.state === "vote") {
    voteBox.classList.remove("hidden");
    voteInfo.textContent = `${Object.keys(room.votes || {}).length}/${room.expectedVotes ?? room.players.length} Stimmen abgegeben${isMuted ? " • Du bist stummgeschaltet" : ""}`;
    renderVoteOptions();
  } else {
    voteBox.classList.add("hidden");
    voteInfo.textContent = "";
  }
}

function sanitizeName() {
  return sanitizeAnyName(profileName);
}

saveProfileBtn.addEventListener("click", () => {
  saveProfile(profileNameInput.value);
});

createBtn.addEventListener("click", () => {
  if (!socket || !socket.connected) {
    showError("Keine Serververbindung. Starte den Server mit npm start.");
    return;
  }

  const name = sanitizeName();
  if (!name) {
    showError("Bitte melde dich zuerst mit deinem Namen an.");
    return;
  }

  showError("");
  socket.emit("create_room", { name });
});

joinBtn.addEventListener("click", () => {
  if (!socket || !socket.connected) {
    showError("Keine Serververbindung. Starte den Server mit npm start.");
    return;
  }

  const name = sanitizeName();
  const code = String(codeInput.value || "").trim().toUpperCase();
  if (!name || !code) {
    showError("Bitte anmelden und Raumcode eingeben.");
    return;
  }

  showError("");
  socket.emit("join_room", { name, code });
});

profileNameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    saveProfileBtn.click();
  }
});

codeInput.addEventListener("input", () => {
  codeInput.value = String(codeInput.value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 5);
});

codeInput.addEventListener("keydown", (event) => {
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
  if (!room) return;
  try {
    await copyText(getInviteLink(room.code));
    showInviteInfo("Einladungslink kopiert ✅");
  } catch {
    showInviteInfo("Kopieren fehlgeschlagen.");
  }
});

modeSelect.addEventListener("change", () => {
  if (!socket) return;
  socket.emit("set_game_mode", { mode: modeSelect.value });
});

toggleLockBtn.addEventListener("click", () => {
  if (!socket) return;
  toggleLockBtn.disabled = true;
  showInviteInfo("Lobby-Status wird aktualisiert...");
  socket.emit("toggle_lobby_lock");
  window.setTimeout(() => {
    toggleLockBtn.disabled = false;
  }, 450);
});

abortRoundBtn.addEventListener("click", () => {
  if (!socket) return;
  socket.emit("abort_round");
});

renameBtn.addEventListener("click", () => {
  if (!socket || !room) return;
  const nextName = sanitizeAnyName(renameInput.value);
  if (!nextName) {
    showError("Bitte einen gültigen neuen Namen eingeben.");
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
  hasVoted = false;
  assignmentBox.classList.add("hidden");
  resultBox.classList.add("hidden");
});

resultNewRoundBtn.addEventListener("click", () => {
  if (!socket) return;
  socket.emit("new_round");
  hasVoted = false;
  assignmentBox.classList.add("hidden");
  resultBox.classList.add("hidden");
  resultNewRoundBtn.classList.add("hidden");
});

backBtn.addEventListener("click", () => {
  if (!socket || !socket.connected) {
    resetToHome();
    return;
  }

  socket.emit("leave_room");
  resetToHome();
});

const initialCode = new URLSearchParams(window.location.search).get("code");
if (initialCode) {
  codeInput.value = String(initialCode).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);
}

loadProfile();

if (!socket) {
  setConnectionState(false, "Socket nicht geladen");
  showError("Socket.IO nicht gefunden. Öffne die App über den Node-Server, nicht als Datei.");
} else {
  setConnectionState(false, "Verbinde…");

  socket.on("connect", () => {
    setConnectionState(true, "Verbunden");
    showError("");
  });

  socket.on("disconnect", () => {
    setConnectionState(false, "Getrennt");
  });

  socket.on("connect_error", () => {
    setConnectionState(false, "Server nicht erreichbar");
    showError("Server nicht erreichbar. Bitte npm start ausführen.");
  });

  socket.on("joined", ({ room: joinedRoom, selfId: myId }) => {
    room = joinedRoom;
    lastLobbyLocked = !!joinedRoom?.settings?.lobbyLocked;
    selfId = myId;
    hasVoted = false;
    assignmentBox.classList.add("hidden");
    resultBox.classList.add("hidden");
    resultNewRoundBtn.classList.add("hidden");
    showInviteInfo("");
    renameInput.value = profileName;
    setView(true);
    renderState();
  });

  socket.on("room_update", (updatedRoom) => {
    const nextLobbyLocked = !!updatedRoom?.settings?.lobbyLocked;
    if (lastLobbyLocked !== null && lastLobbyLocked !== nextLobbyLocked) {
      showInviteInfo(nextLobbyLocked ? "Lobby ist jetzt gesperrt 🔒" : "Lobby ist offen 🔓");
    }
    lastLobbyLocked = nextLobbyLocked;
    room = updatedRoom;
    renderState();
  });

  socket.on("assignment", (data) => {
    hasVoted = false;
    resultBox.classList.add("hidden");
    assignmentBox.classList.remove("hidden");
    modeBadge.textContent = data.mode === "wahrheit" ? "Wahrheit" : "Pflicht";
    roleBadge.textContent = data.role === "imposter" ? "Rolle: Imposter" : "Rolle: Normal";
    promptText.textContent = data.prompt;
    pulse(assignmentBox, "pulse");
  });

  socket.on("round_started", ({ endsAt }) => {
    renderCountdown(endsAt);
    pulse(stateText, "pulse");
  });

  socket.on("vote_started", ({ endsAt }) => {
    hasVoted = false;
    resultBox.classList.add("hidden");
    resultNewRoundBtn.classList.add("hidden");
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
      ? "✅ Gruppe gewinnt – Imposter enttarnt"
      : "😈 Imposter gewinnt – nicht enttarnt";

    const tieText = result.tie ? "Es gab ein Unentschieden bei den Stimmen." : "";
    const hostHint = room && room.hostId === selfId
      ? ""
      : "Warte auf den Host für die nächste Runde.";

    resultBox.innerHTML = `
      <h3>${winnerText}</h3>
      <p>Imposter war: <strong>${result.imposterName}</strong></p>
      <p>${tieText}</p>
      <p>${hostHint}</p>
    `;

    if (room) {
      room.scores = result.scores;
    }

    renderState();
    pulse(resultBox, "pop");
  });

  socket.on("muted_status", ({ muted }) => {
    isMuted = !!muted;
    showError(muted ? "Du wurdest vom Host stummgeschaltet." : "Du bist nicht mehr stummgeschaltet.");
  });

  socket.on("left_room", () => {
    resetToHome();
  });

  socket.on("kicked", ({ message }) => {
    showError(message || "Du wurdest vom Host entfernt.");
    resetToHome();
  });

  socket.on("room_closed", ({ message }) => {
    showError(message || "Die Lobby wurde geschlossen.");
    resetToHome();
  });

  socket.on("name_updated", ({ name }) => {
    profileName = sanitizeAnyName(name);
    window.localStorage.setItem(PROFILE_STORAGE_KEY, profileName);
    applyProfileUi();
    renameInput.value = profileName;
    showError("Name erfolgreich geändert ✅");
  });

  socket.on("error_message", (message) => {
    showError(message);
  });
}
