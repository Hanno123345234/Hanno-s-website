const socket = typeof window.io === "function" ? window.io() : null;

const homeView = document.getElementById("home");
const roomView = document.getElementById("room");
const nameInput = document.getElementById("nameInput");
const codeInput = document.getElementById("codeInput");
const createBtn = document.getElementById("createBtn");
const joinBtn = document.getElementById("joinBtn");
const errorBox = document.getElementById("errorBox");
const connectionBadge = document.getElementById("connectionBadge");

const roomCodeEl = document.getElementById("roomCode");
const stateText = document.getElementById("stateText");
const playerList = document.getElementById("playerList");
const hostControls = document.getElementById("hostControls");
const startRoundBtn = document.getElementById("startRoundBtn");
const startVoteBtn = document.getElementById("startVoteBtn");
const newRoundBtn = document.getElementById("newRoundBtn");
const backBtn = document.getElementById("backBtn");
const inviteBox = document.getElementById("inviteBox");
const copyCodeBtn = document.getElementById("copyCodeBtn");
const copyLinkBtn = document.getElementById("copyLinkBtn");
const inviteInfo = document.getElementById("inviteInfo");

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
let assignment = null;
let hasVoted = false;

function setConnectionState(connected, text) {
  if (!connectionBadge) return;
  connectionBadge.textContent = connected ? `● ${text}` : `● ${text}`;
  connectionBadge.classList.toggle("connection-online", connected);
  connectionBadge.classList.toggle("connection-offline", !connected);
  createBtn.disabled = !connected;
  joinBtn.disabled = !connected;
}

function showError(message = "") {
  errorBox.textContent = message;
}

function setView(inRoom) {
  homeView.classList.toggle("active", !inRoom);
  roomView.classList.toggle("active", inRoom);
}

function resetToHome() {
  room = null;
  selfId = null;
  assignment = null;
  hasVoted = false;
  playerList.innerHTML = "";
  voteButtons.innerHTML = "";
  voteInfo.textContent = "";
  resultBox.classList.add("hidden");
  resultBox.innerHTML = "";
  assignmentBox.classList.add("hidden");
  voteBox.classList.add("hidden");
  resultNewRoundBtn.classList.add("hidden");
  inviteBox.classList.add("hidden");
  inviteInfo.textContent = "";
  setView(false);
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

function getStateLabel(state) {
  if (state === "lobby") return "Lobby: Warte auf den Host";
  if (state === "round") return "Runde läuft: Aufgabe machen";
  if (state === "vote") return "Abstimmung läuft";
  if (state === "ended") return "Runde beendet";
  return "";
}

function renderVoteOptions() {
  voteButtons.innerHTML = "";
  if (!room) return;

  room.players
    .filter((p) => p.id !== selfId)
    .forEach((player) => {
      const button = document.createElement("button");
      button.textContent = player.name;
      button.disabled = hasVoted;
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

  room.players.forEach((player) => {
    const li = document.createElement("li");
    const hostTag = player.id === room.hostId ? " 👑" : "";
    const selfTag = player.id === selfId ? " (Du)" : "";
    const nameSpan = document.createElement("span");
    nameSpan.className = "player-name";
    nameSpan.textContent = `${player.name}${hostTag}${selfTag}`;
    li.appendChild(nameSpan);

    if (isHost && player.id !== selfId) {
      const kickBtn = document.createElement("button");
      kickBtn.className = "kick-btn";
      kickBtn.textContent = "Kicken";
      kickBtn.addEventListener("click", () => {
        socket.emit("kick_player", { targetId: player.id });
      });
      li.appendChild(kickBtn);
    }

    playerList.appendChild(li);
  });
}

function renderHostControls() {
  if (!room) return;
  const isHost = room.hostId === selfId;
  hostControls.classList.toggle("hidden", !isHost);
  inviteBox.classList.toggle("hidden", !isHost);

  startRoundBtn.style.display = room.state === "lobby" ? "block" : "none";
  startVoteBtn.style.display = room.state === "round" ? "block" : "none";
  newRoundBtn.style.display = room.state === "ended" ? "block" : "none";

  resultNewRoundBtn.classList.toggle("hidden", !(isHost && room.state === "ended"));
}

function renderState() {
  if (!room) return;

  roomCodeEl.textContent = room.code;
  stateText.textContent = getStateLabel(room.state);
  renderPlayers();
  renderHostControls();

  voteInfo.textContent = room.state === "vote"
    ? `${Object.keys(room.votes || {}).length}/${room.players.length} Stimmen abgegeben`
    : "";

  if (room.state === "vote") {
    voteBox.classList.remove("hidden");
    renderVoteOptions();
  } else {
    voteBox.classList.add("hidden");
  }
}

function sanitizeName() {
  return String(nameInput.value || "").trim().slice(0, 24);
}

copyCodeBtn.addEventListener("click", async () => {
  if (!room) return;
  try {
    await copyText(room.code);
    inviteInfo.textContent = "Raumcode kopiert ✅";
  } catch {
    inviteInfo.textContent = "Kopieren fehlgeschlagen.";
  }
});

copyLinkBtn.addEventListener("click", async () => {
  if (!room) return;
  try {
    const inviteLink = getInviteLink(room.code);
    await copyText(inviteLink);
    inviteInfo.textContent = "Einladungslink kopiert ✅";
  } catch {
    inviteInfo.textContent = "Kopieren fehlgeschlagen.";
  }
});

createBtn.addEventListener("click", () => {
  if (!socket || !socket.connected) {
    showError("Keine Serververbindung. Starte den Server mit npm start.");
    return;
  }

  const name = sanitizeName();
  if (!name) {
    showError("Bitte gib einen Namen ein.");
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
    showError("Name und Raumcode eingeben.");
    return;
  }

  showError("");
  socket.emit("join_room", { name, code });
});

nameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    createBtn.click();
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

const initialCode = new URLSearchParams(window.location.search).get("code");
if (initialCode) {
  codeInput.value = String(initialCode).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);
}

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
}

startRoundBtn.addEventListener("click", () => {
  if (!socket) return;
  socket.emit("start_round");
  assignment = null;
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
  assignment = null;
  hasVoted = false;
  assignmentBox.classList.add("hidden");
  resultBox.classList.add("hidden");
});

resultNewRoundBtn.addEventListener("click", () => {
  if (!socket) return;
  socket.emit("new_round");
  assignment = null;
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

if (socket) {
  socket.on("joined", ({ room: joinedRoom, selfId: myId }) => {
    room = joinedRoom;
    selfId = myId;
    assignment = null;
    hasVoted = false;
    assignmentBox.classList.add("hidden");
    resultBox.classList.add("hidden");
    resultNewRoundBtn.classList.add("hidden");
    setView(true);
    renderState();
  });

  socket.on("room_update", (updatedRoom) => {
    room = updatedRoom;
    renderState();
  });

  socket.on("assignment", (data) => {
    assignment = data;
    hasVoted = false;
    resultBox.classList.add("hidden");
    assignmentBox.classList.remove("hidden");
    modeBadge.textContent = data.mode === "wahrheit" ? "Wahrheit" : "Pflicht";
    roleBadge.textContent = data.role === "imposter" ? "Rolle: Imposter" : "Rolle: Normal";
    promptText.textContent = data.prompt;
  });

  socket.on("vote_started", () => {
    hasVoted = false;
    resultBox.classList.add("hidden");
    resultNewRoundBtn.classList.add("hidden");
    renderState();
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

    renderHostControls();
  });

  socket.on("left_room", () => {
    resetToHome();
  });

  socket.on("kicked", ({ message }) => {
    showError(message || "Du wurdest vom Host entfernt.");
    resetToHome();
  });

  socket.on("error_message", (message) => {
    showError(message);
  });
}