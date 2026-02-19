const socket = typeof window.io === "function" ? window.io() : null;

const homeView = document.getElementById("amongHome");
const roomView = document.getElementById("amongRoom");
const nameInput = document.getElementById("amongNameInput");
const codeInput = document.getElementById("amongCodeInput");
const createBtn = document.getElementById("amongCreateBtn");
const joinBtn = document.getElementById("amongJoinBtn");
const errorEl = document.getElementById("amongError");

const backBtn = document.getElementById("amongBackBtn");
const roomCodeEl = document.getElementById("amongRoomCode");
const stateEl = document.getElementById("amongState");
const roleEl = document.getElementById("amongRole");
const meetingEl = document.getElementById("amongMeeting");
const bodyEl = document.getElementById("amongBody");

const hostControls = document.getElementById("amongHostControls");
const startBtn = document.getElementById("amongStartBtn");

const actionBox = document.getElementById("amongActions");
const taskBtn = document.getElementById("amongTaskBtn");
const meetingBtn = document.getElementById("amongMeetingBtn");
const reportBtn = document.getElementById("amongReportBtn");

const killBox = document.getElementById("amongKillBox");
const killTargets = document.getElementById("amongKillTargets");

const voteBox = document.getElementById("amongVoteBox");
const voteInfo = document.getElementById("amongVoteInfo");
const voteTargets = document.getElementById("amongVoteTargets");

const playersEl = document.getElementById("amongPlayers");
const logsEl = document.getElementById("amongLogs");

let room = null;
let selfId = null;
let role = null;
let tasks = [];
let voted = false;

function showError(message = "") {
  errorEl.textContent = message;
}

function sanitizeName(value) {
  return String(value || "").trim().slice(0, 24);
}

function sanitizeCode(value) {
  return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);
}

function setView(inRoom) {
  homeView.classList.toggle("active", !inRoom);
  roomView.classList.toggle("active", inRoom);
}

function resetRoom() {
  room = null;
  selfId = null;
  role = null;
  tasks = [];
  voted = false;
  setView(false);
}

function myPlayer() {
  return room?.players?.find((player) => player.id === selfId) || null;
}

function renderKillTargets() {
  killTargets.innerHTML = "";
  if (!room || role !== "imposter" || room.state !== "playing") return;

  room.players.filter((player) => player.id !== selfId && player.alive).forEach((player) => {
    const btn = document.createElement("button");
    btn.textContent = `Eliminieren: ${player.name}`;
    btn.className = "kick-btn";
    btn.addEventListener("click", () => {
      socket.emit("among_kill", { targetId: player.id });
    });
    killTargets.appendChild(btn);
  });
}

function renderVoteTargets() {
  voteTargets.innerHTML = "";
  if (!room || room.state !== "meeting") return;

  room.players.filter((player) => player.alive).forEach((player) => {
    const btn = document.createElement("button");
    btn.textContent = player.name;
    btn.disabled = voted;
    btn.addEventListener("click", () => {
      socket.emit("among_vote", { targetId: player.id });
      voted = true;
      renderVoteTargets();
    });
    voteTargets.appendChild(btn);
  });

  const skipBtn = document.createElement("button");
  skipBtn.textContent = "Skip";
  skipBtn.disabled = voted;
  skipBtn.addEventListener("click", () => {
    socket.emit("among_vote", { targetId: "skip" });
    voted = true;
    renderVoteTargets();
  });
  voteTargets.appendChild(skipBtn);
}

function renderPlayers() {
  playersEl.innerHTML = "";
  if (!room) return;

  room.players.forEach((player) => {
    const li = document.createElement("li");
    li.textContent = `${player.name}${player.id === room.hostId ? " 👑" : ""}${player.id === selfId ? " (Du)" : ""}${player.alive ? "" : " ☠️"} • Tasks ${player.tasksDone}/${player.tasksTotal}`;
    playersEl.appendChild(li);
  });
}

function renderLogs() {
  logsEl.innerHTML = "";
  if (!room) return;

  (room.logs || []).slice().reverse().forEach((entry) => {
    const li = document.createElement("li");
    li.textContent = entry.message;
    logsEl.appendChild(li);
  });
}

function render() {
  if (!room) return;

  const me = myPlayer();
  const alive = me?.alive;
  const isHost = room.hostId === selfId;

  roomCodeEl.textContent = room.code;
  stateEl.textContent = `Status: ${room.state}`;
  meetingEl.textContent = room.meeting ? "Aktiv" : "-";
  bodyEl.textContent = room.deadBody?.name || "-";

  hostControls.classList.toggle("hidden", !isHost || room.state !== "lobby");
  actionBox.classList.toggle("hidden", !(room.state === "playing" && alive));
  killBox.classList.toggle("hidden", !(room.state === "playing" && role === "imposter" && alive));
  voteBox.classList.toggle("hidden", room.state !== "meeting" || !alive);

  taskBtn.disabled = role !== "crewmate" || room.state !== "playing" || !alive;
  meetingBtn.disabled = room.state !== "playing" || !alive;
  reportBtn.disabled = room.state !== "playing" || !alive || !room.deadBody;

  voteInfo.textContent = room.meeting ? `${room.meeting.votesCount} Stimmen abgegeben` : "";

  renderPlayers();
  renderLogs();
  renderKillTargets();
  renderVoteTargets();
}

createBtn.addEventListener("click", () => {
  if (!socket) return;
  const name = sanitizeName(nameInput.value);
  if (!name) {
    showError("Bitte Namen eingeben.");
    return;
  }

  showError("");
  socket.emit("among_create_room", { name });
});

joinBtn.addEventListener("click", () => {
  if (!socket) return;
  const name = sanitizeName(nameInput.value);
  const code = sanitizeCode(codeInput.value);
  if (!name || !code) {
    showError("Name + Code eingeben.");
    return;
  }

  showError("");
  socket.emit("among_join_room", { name, code });
});

codeInput.addEventListener("input", () => {
  codeInput.value = sanitizeCode(codeInput.value);
});

startBtn.addEventListener("click", () => {
  if (!socket) return;
  socket.emit("among_start_game");
});

taskBtn.addEventListener("click", () => {
  if (!socket) return;
  socket.emit("among_complete_task");
});

meetingBtn.addEventListener("click", () => {
  if (!socket) return;
  socket.emit("among_call_meeting");
});

reportBtn.addEventListener("click", () => {
  if (!socket) return;
  socket.emit("among_report_body");
});

backBtn.addEventListener("click", () => {
  if (!socket) {
    resetRoom();
    return;
  }
  socket.emit("among_leave_room");
  resetRoom();
});

if (socket) {
  socket.on("among_joined", ({ code, selfId: nextSelfId }) => {
    selfId = nextSelfId;
    if (!room) {
      room = {
        code,
        state: "lobby",
        players: [],
        logs: []
      };
    }
    setView(true);
    render();
  });

  socket.on("among_room_update", (updatedRoom) => {
    room = updatedRoom;
    render();
  });

  socket.on("among_role", (payload) => {
    role = payload.role;
    tasks = payload.tasks || [];
    roleEl.classList.remove("hidden");
    roleEl.textContent = `Rolle: ${role} • Aufgaben: ${tasks.join(", ")}`;
  });

  socket.on("among_game_started", () => {
    voted = false;
    showError("");
  });

  socket.on("among_meeting_started", ({ reason, reporterName }) => {
    voted = false;
    showError(`Meeting (${reason}) von ${reporterName}`);
  });

  socket.on("among_meeting_result", ({ ejected, tie }) => {
    if (tie || !ejected) {
      showError("Meeting Ergebnis: Niemand wurde rausgewählt.");
    } else {
      showError(`Meeting Ergebnis: ${ejected.name} (${ejected.role}) wurde rausgewählt.`);
    }
  });

  socket.on("among_game_over", ({ winner }) => {
    showError(winner === "crew" ? "Crew gewinnt!" : "Imposter gewinnt!");
  });

  socket.on("among_error", (message) => {
    showError(message);
  });

  socket.on("among_left", () => {
    resetRoom();
  });

  socket.on("among_closed", ({ message }) => {
    showError(message || "Lobby geschlossen");
    resetRoom();
  });
}
