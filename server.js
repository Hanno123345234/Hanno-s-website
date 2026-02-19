const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static("public"));

const rooms = new Map();
const GAME_MODES = ["soft", "spicy", "chaos"];

const PROMPT_SETS = {
  soft: {
    wahrheit: [
      "Was ist deine beste Angewohnheit?",
      "Was war dein lustigster Moment in der Schule?",
      "Welche App nutzt du am meisten?",
      "Welche kleine Sache macht dich direkt glücklich?",
      "Was war dein peinlichster Versprecher?",
      "Mit wem würdest du am ehesten einen Roadtrip machen?",
      "Welche Serie könntest du immer wieder schauen?",
      "Was ist dein harmlosester Crush-Moment gewesen?"
    ],
    pflicht: [
      "Mach 10 Sekunden einen Nachrichtensprecher nach.",
      "Sprich 15 Sekunden wie ein Roboter.",
      "Nenne 3 ehrliche Komplimente für die Runde.",
      "Mach 5 Kniebeugen und zähl laut.",
      "Stell ein Tier 8 Sekunden lang dar.",
      "Erfinde einen Werbeslogan für Wasser.",
      "Sag deinen Namen in 3 Emotionen.",
      "Sprich 20 Sekunden ohne den Buchstaben E."
    ],
    fakeWahrheit: [
      "Was ist dein Lieblingsessen?",
      "Welche Jahreszeit magst du am meisten?",
      "Nenne dein Lieblingsgetränk.",
      "Was ist dein Lieblingswochentag?",
      "Welche Farbe magst du am meisten?",
      "Nenne dein Lieblingsfach in der Schule."
    ],
    fakePflicht: [
      "Nenne drei Obstsorten.",
      "Zähle langsam bis 10.",
      "Nenne zwei Tiere, die fliegen können.",
      "Nenne drei Länder in Europa.",
      "Klatsche zweimal in die Hände.",
      "Nenne drei Farben."
    ]
  },
  spicy: {
    wahrheit: [
      "Wer in dieser Runde hat den besten Vibe und warum?",
      "Was war dein peinlichster Chat-Moment?",
      "Welche Person hier würdest du auf ein 1-zu-1 Treffen mitnehmen?",
      "Was war dein letzter kleiner Crush?",
      "Wann hast du zuletzt jemanden gestalkt (Instagram/TikTok)?",
      "Welche Red Flag ignorierst du manchmal trotzdem?",
      "Was war dein schlimmster Flirt-Fail?",
      "Welche Nachricht bereust du, jemals geschickt zu haben?",
      "Mit wem hier würdest du am ehesten einen Roadtrip machen?",
      "Was ist das Wildeste, was du aus Nervosität gesagt hast?",
      "Was ist dein toxischster \"Ich antworte später\"-Moment gewesen?",
      "Hattest du schon mal einen Crush auf jemanden, den niemand erwartet hätte?",
      "Wann warst du zuletzt richtig eifersüchtig?",
      "Welche erste Nachricht funktioniert bei dir am besten?"
    ],
    pflicht: [
      "Mach 15 Sekunden lang den besten Flirt-Blick in die Kamera.",
      "Lies die letzte Notiz in deinem Handy in dramatischer Stimme vor.",
      "Mach 10 Sekunden Catwalk durchs Zimmer.",
      "Sag 3 ehrliche Komplimente an die Runde.",
      "Imitiere 12 Sekunden eine Person aus der Runde (freundlich).",
      "Mach ein Selfie mit maximal overdramatischem Gesicht.",
      "Sprich 20 Sekunden wie ein Dating-Coach.",
      "Zeig deinen zuletzt benutzten Emoji und begründe ihn.",
      "Sag den Satz \"Ich bin absolut unauffällig\" in 5 verschiedenen Emotionen.",
      "Mach eine 8-Sekunden-Werbung für dich als \"Traum-Date\".",
      "Erfinde einen peinlichen Anmachspruch und trage ihn ernst vor.",
      "Sprich die nächsten 30 Sekunden mit maximal seriöser Nachrichtensprecher-Stimme."
    ],
    fakeWahrheit: [
      "Was ist dein Lieblingsessen?",
      "Welche Jahreszeit magst du am meisten?",
      "Nenne dein Lieblingsgetränk.",
      "Welche App nutzt du am häufigsten?",
      "Was ist dein Lieblingsfilm?",
      "Welche Farbe magst du am meisten?"
    ],
    fakePflicht: [
      "Nenne drei Obstsorten.",
      "Zähle langsam bis 10.",
      "Sag laut den aktuellen Monat.",
      "Nenne drei Farben.",
      "Nenne drei Länder in Europa.",
      "Klatsche zweimal in die Hände."
    ]
  },
  chaos: {
    wahrheit: [
      "Wer wäre in dieser Runde am ehesten ein geheimer Drama-Master?",
      "Welche Nachricht würdest du sofort löschen, wenn jemand dein Handy nimmt?",
      "Was war dein unangenehmster Flirt-Moment ever?",
      "Wen würdest du in der Runde am ehesten nachts anrufen, wenn du Stress hast?",
      "Welche Red Flag würdest du nie öffentlich zugeben?",
      "Was war dein schlimmster \"ich hab zu viel geredet\"-Moment?",
      "Wer könnte hier am ehesten heimlich zwei Chats gleichzeitig führen?",
      "Welcher Satz beschreibt dein Dating-Glück am besten?"
    ],
    pflicht: [
      "Mach 20 Sekunden ein übertriebenes Model-Intro mit Name und Slogan.",
      "Sprich 20 Sekunden in maximal dramatischer Soap-Opera-Stimme.",
      "Mach ein \"Cringe aber confident\" Selfie und zeig es kurz.",
      "Imitiere eine erfundene Dating-Show-Moderation für 15 Sekunden.",
      "Mach 10 Sekunden eine fake Motivationsrede an die Runde.",
      "Gib 3 ultra-overdramatische Ratschläge fürs erste Date.",
      "Stell 10 Sekunden lang deinen inneren Bösewicht dar.",
      "Sag deinen Namen rückwärts und tu so, als wäre es ein Zauberspruch."
    ],
    fakeWahrheit: [
      "Was ist dein Lieblingsobst?",
      "Welche Farbe magst du?",
      "Nenne deinen Lieblingsfilm.",
      "Was ist dein Lieblingsgetränk?",
      "Welchen Wochentag magst du am meisten?",
      "Was ist dein Lieblingsfach?"
    ],
    fakePflicht: [
      "Nenne drei Tiere.",
      "Zähle bis 8.",
      "Nenne drei Städte.",
      "Klatsche einmal.",
      "Sag laut den heutigen Tag.",
      "Nenne zwei Farben."
    ]
  }
};

function createRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let index = 0; index < 5; index += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return rooms.has(code) ? createRoomCode() : code;
}

function randomItem(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function isRateLimited(socket, key, cooldownMs) {
  if (!socket.data.rateLimits) {
    socket.data.rateLimits = {};
  }
  const now = Date.now();
  const previous = socket.data.rateLimits[key] || 0;
  if (now - previous < cooldownMs) {
    return true;
  }
  socket.data.rateLimits[key] = now;
  return false;
}

function clearPhaseTimer(room) {
  if (room.phaseTimer) {
    clearTimeout(room.phaseTimer);
    room.phaseTimer = null;
  }
  room.phaseEndsAt = null;
}

function maxHistorySize(listLength) {
  return Math.min(Math.max(4, Math.floor(listLength * 0.6)), 10);
}

function pickPrompt(room, promptType, candidates) {
  const history = room.promptHistory[promptType];
  const available = candidates.filter((item) => !history.includes(item));
  const selected = available.length > 0 ? randomItem(available) : randomItem(candidates);
  history.push(selected);
  if (history.length > maxHistorySize(candidates.length)) {
    history.shift();
  }
  return selected;
}

function getExpectedVoteCount(room) {
  return room.players.filter((player) => !room.mutedPlayerIds.has(player.id)).length;
}

function getRoomView(room) {
  return {
    code: room.code,
    state: room.state,
    hostId: room.hostId,
    players: room.players.map((player) => ({ id: player.id, name: player.name })),
    votes: room.votes,
    startedAt: room.startedAt,
    settings: room.settings,
    mutedPlayerIds: Array.from(room.mutedPlayerIds),
    scores: room.scores,
    phaseEndsAt: room.phaseEndsAt,
    expectedVotes: room.state === "vote" ? getExpectedVoteCount(room) : null,
    gameMode: room.settings.gameMode
  };
}

function broadcastRoom(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;
  io.to(roomCode).emit("room_update", getRoomView(room));
}

function closeRoomBecauseHostLeft(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;

  clearPhaseTimer(room);

  room.players.forEach((player) => {
    io.to(player.id).emit("room_closed", {
      message: "Der Host hat die Lobby verlassen. Die Lobby wurde geschlossen."
    });

    const playerSocket = io.sockets.sockets.get(player.id);
    if (playerSocket) {
      playerSocket.leave(roomCode);
      playerSocket.data.roomCode = undefined;
    }
  });

  rooms.delete(roomCode);
}

function finishVoting(room, byTimer = false) {
  clearPhaseTimer(room);

  const voteCounts = {};
  Object.values(room.votes).forEach((targetId) => {
    voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
  });

  let topId = null;
  let topVotes = 0;
  let tie = false;

  Object.entries(voteCounts).forEach(([playerId, count]) => {
    if (count > topVotes) {
      topVotes = count;
      topId = playerId;
      tie = false;
      return;
    }

    if (count === topVotes) {
      tie = true;
    }
  });

  const imposterId = room.currentRound.imposterId;
  const imposter = room.players.find((player) => player.id === imposterId);
  const winner = !tie && topId === imposterId ? "gruppe" : "imposter";

  room.state = "ended";
  room.scores[winner] += 1;

  io.to(room.code).emit("round_result", {
    winner,
    imposterId,
    imposterName: imposter ? imposter.name : "Unbekannt",
    voteCounts,
    votedOutId: topId,
    tie,
    byTimer,
    scores: room.scores
  });

  broadcastRoom(room.code);
}

function startVotePhase(room, byTimer = false) {
  clearPhaseTimer(room);
  room.state = "vote";
  room.votes = {};
  room.phaseEndsAt = Date.now() + room.settings.voteSeconds * 1000;

  io.to(room.code).emit("vote_started", {
    byTimer,
    endsAt: room.phaseEndsAt
  });

  room.phaseTimer = setTimeout(() => {
    const liveRoom = rooms.get(room.code);
    if (!liveRoom || liveRoom.state !== "vote") return;
    finishVoting(liveRoom, true);
  }, room.settings.voteSeconds * 1000);

  broadcastRoom(room.code);
}

function assignRound(room) {
  clearPhaseTimer(room);

  const promptSet = PROMPT_SETS[room.settings.gameMode] || PROMPT_SETS.spicy;
  const mode = Math.random() < 0.5 ? "wahrheit" : "pflicht";
  const realPrompt = pickPrompt(room, mode, promptSet[mode]);
  const fakePrompt = pickPrompt(
    room,
    mode === "wahrheit" ? "fakeWahrheit" : "fakePflicht",
    mode === "wahrheit" ? promptSet.fakeWahrheit : promptSet.fakePflicht
  );

  const imposterIndex = Math.floor(Math.random() * room.players.length);
  const imposterId = room.players[imposterIndex].id;

  room.state = "round";
  room.votes = {};
  room.phaseEndsAt = Date.now() + room.settings.roundSeconds * 1000;
  room.currentRound = {
    mode,
    realPrompt,
    fakePrompt,
    imposterId,
    assignments: {}
  };

  room.players.forEach((player) => {
    const isImposter = player.id === imposterId;
    room.currentRound.assignments[player.id] = {
      role: isImposter ? "imposter" : "normal",
      prompt: isImposter ? fakePrompt : realPrompt,
      mode
    };

    io.to(player.id).emit("assignment", room.currentRound.assignments[player.id]);
  });

  room.phaseTimer = setTimeout(() => {
    const liveRoom = rooms.get(room.code);
    if (!liveRoom || liveRoom.state !== "round") return;
    startVotePhase(liveRoom, true);
  }, room.settings.roundSeconds * 1000);

  io.to(room.code).emit("round_started", {
    mode,
    endsAt: room.phaseEndsAt
  });

  broadcastRoom(room.code);
}

function abortRound(room) {
  clearPhaseTimer(room);
  room.state = "lobby";
  room.votes = {};
  room.currentRound = null;

  io.to(room.code).emit("round_aborted", {
    message: "Der Host hat die Runde abgebrochen."
  });

  broadcastRoom(room.code);
}

function tryAutoFinishVote(room) {
  if (room.state !== "vote") return;
  const expectedVotes = getExpectedVoteCount(room);
  if (Object.keys(room.votes).length >= expectedVotes) {
    finishVoting(room, false);
  }
}

function removePlayerFromCurrentRoom(socket) {
  const roomCode = socket.data.roomCode;
  if (!roomCode) return;

  const room = rooms.get(roomCode);
  socket.data.roomCode = undefined;
  if (!room) return;

  room.players = room.players.filter((player) => player.id !== socket.id);
  room.mutedPlayerIds.delete(socket.id);
  delete room.votes[socket.id];

  Object.keys(room.votes).forEach((voterId) => {
    if (room.votes[voterId] === socket.id) {
      delete room.votes[voterId];
    }
  });

  if (room.players.length === 0) {
    clearPhaseTimer(room);
    rooms.delete(roomCode);
    return;
  }

  if (room.hostId === socket.id) {
    closeRoomBecauseHostLeft(roomCode);
    return;
  }

  tryAutoFinishVote(room);
  broadcastRoom(roomCode);
}

function getHostRoom(socket) {
  const roomCode = socket.data.roomCode;
  if (!roomCode) {
    socket.emit("error_message", "Du bist in keinem Raum.");
    return null;
  }

  const room = rooms.get(roomCode);
  if (!room) {
    socket.emit("error_message", "Raum nicht gefunden.");
    return null;
  }

  if (room.hostId !== socket.id) {
    socket.emit("error_message", "Nur der Host darf das.");
    return null;
  }

  return room;
}

function validName(value) {
  return String(value || "").trim().slice(0, 24);
}

io.on("connection", (socket) => {
  socket.on("create_room", ({ name }) => {
    if (isRateLimited(socket, "create_room", 800)) {
      socket.emit("error_message", "Bitte kurz warten.");
      return;
    }

    const trimmedName = validName(name);
    if (!trimmedName) {
      socket.emit("error_message", "Bitte gib einen Namen ein.");
      return;
    }

    const code = createRoomCode();
    const room = {
      code,
      hostId: socket.id,
      players: [{ id: socket.id, name: trimmedName }],
      state: "lobby",
      votes: {},
      currentRound: null,
      startedAt: Date.now(),
      settings: {
        gameMode: "spicy",
        roundSeconds: 45,
        voteSeconds: 30,
        lobbyLocked: false
      },
      mutedPlayerIds: new Set(),
      promptHistory: {
        wahrheit: [],
        pflicht: [],
        fakeWahrheit: [],
        fakePflicht: []
      },
      scores: {
        gruppe: 0,
        imposter: 0
      },
      phaseTimer: null,
      phaseEndsAt: null
    };

    rooms.set(code, room);
    socket.join(code);
    socket.data.roomCode = code;
    socket.emit("joined", { room: getRoomView(room), selfId: socket.id });
    broadcastRoom(code);
  });

  socket.on("join_room", ({ name, code }) => {
    if (isRateLimited(socket, "join_room", 800)) {
      socket.emit("error_message", "Bitte kurz warten.");
      return;
    }

    const trimmedName = validName(name);
    const normalizedCode = String(code || "").trim().toUpperCase();

    if (!trimmedName || !normalizedCode) {
      socket.emit("error_message", "Name und Raumcode sind erforderlich.");
      return;
    }

    const room = rooms.get(normalizedCode);
    if (!room) {
      socket.emit("error_message", "Raum nicht gefunden.");
      return;
    }

    if (room.settings.lobbyLocked) {
      socket.emit("error_message", "Lobby ist gesperrt.");
      return;
    }

    if (room.players.length >= 12) {
      socket.emit("error_message", "Raum ist voll.");
      return;
    }

    if (room.state === "round" || room.state === "vote") {
      socket.emit("error_message", "Spiel läuft bereits.");
      return;
    }

    const duplicateName = room.players.some((player) => player.name.toLowerCase() === trimmedName.toLowerCase());
    if (duplicateName) {
      socket.emit("error_message", "Name ist bereits vergeben.");
      return;
    }

    room.players.push({ id: socket.id, name: trimmedName });
    socket.join(normalizedCode);
    socket.data.roomCode = normalizedCode;
    socket.emit("joined", { room: getRoomView(room), selfId: socket.id });
    broadcastRoom(normalizedCode);
  });

  socket.on("update_name", ({ name }) => {
    if (isRateLimited(socket, "update_name", 400)) {
      socket.emit("error_message", "Bitte kurz warten.");
      return;
    }

    const roomCode = socket.data.roomCode;
    const room = rooms.get(roomCode);
    if (!room) {
      socket.emit("error_message", "Raum nicht gefunden.");
      return;
    }

    const nextName = validName(name);
    if (!nextName) {
      socket.emit("error_message", "Ungültiger Name.");
      return;
    }

    const player = room.players.find((entry) => entry.id === socket.id);
    if (!player) {
      socket.emit("error_message", "Spieler nicht gefunden.");
      return;
    }

    const duplicateName = room.players.some(
      (entry) => entry.id !== socket.id && entry.name.toLowerCase() === nextName.toLowerCase()
    );
    if (duplicateName) {
      socket.emit("error_message", "Name ist bereits vergeben.");
      return;
    }

    player.name = nextName;
    socket.emit("name_updated", { name: nextName });
    broadcastRoom(roomCode);
  });

  socket.on("start_round", () => {
    if (isRateLimited(socket, "start_round", 600)) {
      socket.emit("error_message", "Bitte kurz warten.");
      return;
    }

    const room = getHostRoom(socket);
    if (!room) return;

    if (room.state !== "lobby" && room.state !== "ended") {
      socket.emit("error_message", "Runde kann jetzt nicht gestartet werden.");
      return;
    }

    if (room.players.length < 3) {
      socket.emit("error_message", "Mindestens 3 Spieler benötigt.");
      return;
    }

    assignRound(room);
  });

  socket.on("start_vote", () => {
    if (isRateLimited(socket, "start_vote", 600)) {
      socket.emit("error_message", "Bitte kurz warten.");
      return;
    }

    const room = getHostRoom(socket);
    if (!room) return;
    if (room.state !== "round") {
      socket.emit("error_message", "Abstimmung kann jetzt nicht gestartet werden.");
      return;
    }

    startVotePhase(room, false);
  });

  socket.on("submit_vote", ({ targetId }) => {
    if (isRateLimited(socket, "submit_vote", 350)) {
      socket.emit("error_message", "Nicht so schnell klicken.");
      return;
    }

    const roomCode = socket.data.roomCode;
    const room = rooms.get(roomCode);
    if (!room || room.state !== "vote") return;

    if (room.mutedPlayerIds.has(socket.id)) {
      socket.emit("error_message", "Du bist vom Host stummgeschaltet und kannst nicht abstimmen.");
      return;
    }

    const normalizedTargetId = String(targetId || "");
    const validTarget = room.players.some((player) => player.id === normalizedTargetId);
    if (!validTarget || normalizedTargetId === socket.id) {
      socket.emit("error_message", "Ungültige Abstimmung.");
      return;
    }

    room.votes[socket.id] = normalizedTargetId;
    broadcastRoom(roomCode);
    tryAutoFinishVote(room);
  });

  socket.on("new_round", () => {
    if (isRateLimited(socket, "new_round", 600)) {
      socket.emit("error_message", "Bitte kurz warten.");
      return;
    }

    const room = getHostRoom(socket);
    if (!room) return;
    if (room.state !== "ended") {
      socket.emit("error_message", "Neue Runde erst nach Rundenende.");
      return;
    }

    assignRound(room);
  });

  socket.on("set_game_mode", ({ mode }) => {
    if (isRateLimited(socket, "set_game_mode", 350)) {
      socket.emit("error_message", "Bitte kurz warten.");
      return;
    }

    const room = getHostRoom(socket);
    if (!room) return;
    if (room.state !== "lobby") {
      socket.emit("error_message", "Spielmodus nur in der Lobby änderbar.");
      return;
    }

    const normalizedMode = String(mode || "").toLowerCase();
    if (!GAME_MODES.includes(normalizedMode)) {
      socket.emit("error_message", "Ungültiger Spielmodus.");
      return;
    }

    room.settings.gameMode = normalizedMode;
    broadcastRoom(room.code);
  });

  socket.on("toggle_lobby_lock", () => {
    if (isRateLimited(socket, "toggle_lobby_lock", 350)) {
      socket.emit("error_message", "Bitte kurz warten.");
      return;
    }

    const room = getHostRoom(socket);
    if (!room) return;

    room.settings.lobbyLocked = !room.settings.lobbyLocked;
    broadcastRoom(room.code);
  });

  socket.on("toggle_mute_player", ({ targetId }) => {
    if (isRateLimited(socket, "toggle_mute_player", 350)) {
      socket.emit("error_message", "Bitte kurz warten.");
      return;
    }

    const room = getHostRoom(socket);
    if (!room) return;

    const normalizedTargetId = String(targetId || "");
    if (!normalizedTargetId || normalizedTargetId === socket.id) {
      socket.emit("error_message", "Diesen Spieler kannst du nicht stummschalten.");
      return;
    }

    const targetExists = room.players.some((player) => player.id === normalizedTargetId);
    if (!targetExists) {
      socket.emit("error_message", "Spieler nicht gefunden.");
      return;
    }

    if (room.mutedPlayerIds.has(normalizedTargetId)) {
      room.mutedPlayerIds.delete(normalizedTargetId);
      io.to(normalizedTargetId).emit("muted_status", { muted: false });
    } else {
      room.mutedPlayerIds.add(normalizedTargetId);
      delete room.votes[normalizedTargetId];
      io.to(normalizedTargetId).emit("muted_status", { muted: true });
    }

    tryAutoFinishVote(room);
    broadcastRoom(room.code);
  });

  socket.on("abort_round", () => {
    if (isRateLimited(socket, "abort_round", 600)) {
      socket.emit("error_message", "Bitte kurz warten.");
      return;
    }

    const room = getHostRoom(socket);
    if (!room) return;

    if (room.state !== "round" && room.state !== "vote") {
      socket.emit("error_message", "Es läuft keine Runde.");
      return;
    }

    abortRound(room);
  });

  socket.on("kick_player", ({ targetId }) => {
    if (isRateLimited(socket, "kick_player", 450)) {
      socket.emit("error_message", "Bitte kurz warten.");
      return;
    }

    const room = getHostRoom(socket);
    if (!room) return;

    const normalizedTargetId = String(targetId || "");
    if (!normalizedTargetId || normalizedTargetId === socket.id) {
      socket.emit("error_message", "Diesen Spieler kannst du nicht kicken.");
      return;
    }

    const targetIsInRoom = room.players.some((player) => player.id === normalizedTargetId);
    if (!targetIsInRoom) {
      socket.emit("error_message", "Spieler nicht gefunden.");
      return;
    }

    const targetSocket = io.sockets.sockets.get(normalizedTargetId);
    if (!targetSocket) {
      socket.emit("error_message", "Spieler ist nicht mehr verbunden.");
      return;
    }

    targetSocket.leave(room.code);
    removePlayerFromCurrentRoom(targetSocket);
    io.to(normalizedTargetId).emit("kicked", {
      message: "Du wurdest vom Host aus dem Raum entfernt."
    });
  });

  socket.on("leave_room", () => {
    if (isRateLimited(socket, "leave_room", 250)) return;

    const roomCode = socket.data.roomCode;
    if (!roomCode) {
      socket.emit("left_room");
      return;
    }

    socket.leave(roomCode);
    removePlayerFromCurrentRoom(socket);
    socket.emit("left_room");
  });

  socket.on("disconnect", () => {
    removePlayerFromCurrentRoom(socket);
  });
});

server.on("error", (error) => {
  if (error && error.code === "EADDRINUSE") {
    console.error(`Port ${PORT} ist bereits belegt. Beende den laufenden Prozess oder starte mit PORT=3001 npm start`);
    process.exit(1);
  }

  throw error;
});

server.listen(PORT, () => {
  console.log(`Imposter-Spiel läuft auf http://localhost:${PORT}`);
});
