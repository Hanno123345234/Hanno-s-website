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

const assignmentBox = document.getElementById("assignmentBox");
const modeBadge = document.getElementById("modeBadge");
const roleBadge = document.getElementById("roleBadge");
const promptText = document.getElementById("promptText");

const voteBox = document.getElementById("voteBox");
const voteButtons = document.getElementById("voteButtons");
const voteInfo = document.getElementById("voteInfo");

const resultBox = document.getElementById("resultBox");

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

  room.players.forEach((player) => {
    const li = document.createElement("li");
    const hostTag = player.id === room.hostId ? " 👑" : "";
    const selfTag = player.id === selfId ? " (Du)" : "";
    li.textContent = `${player.name}${hostTag}${selfTag}`;
    playerList.appendChild(li);
  });
}

function renderHostControls() {
  if (!room) return;
  const isHost = room.hostId === selfId;
  hostControls.classList.toggle("hidden", !isHost);

  startRoundBtn.style.display = room.state === "lobby" ? "block" : "none";
  startVoteBtn.style.display = room.state === "round" ? "block" : "none";
  newRoundBtn.style.display = room.state === "ended" ? "block" : "none";
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

if (socket) {
  socket.on("joined", ({ room: joinedRoom, selfId: myId }) => {
    room = joinedRoom;
    selfId = myId;
    assignment = null;
    hasVoted = false;
    assignmentBox.classList.add("hidden");
    resultBox.classList.add("hidden");
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
    renderState();
  });

  socket.on("round_result", (result) => {
    voteBox.classList.add("hidden");
    resultBox.classList.remove("hidden");

    const winnerText = result.winner === "gruppe"
      ? "✅ Gruppe gewinnt – Imposter enttarnt"
      : "😈 Imposter gewinnt – nicht enttarnt";

    const tieText = result.tie ? "Es gab ein Unentschieden bei den Stimmen." : "";

    resultBox.innerHTML = `
      <h3>${winnerText}</h3>
      <p>Imposter war: <strong>${result.imposterName}</strong></p>
      <p>${tieText}</p>
    `;
  });

  socket.on("error_message", (message) => {
    showError(message);
  });
}