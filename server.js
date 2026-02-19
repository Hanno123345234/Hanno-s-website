const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static("public"));

const rooms = new Map();

const PROMPTS = {
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
    "Welche Person hier wirkt am unschuldigsten, ist es aber safe nicht?",
    "Hattest du schon mal einen Crush auf jemanden, den niemand erwartet hätte?",
    "Wann warst du zuletzt richtig eifersüchtig?",
    "Welche erste Nachricht funktioniert bei dir am besten?"
  ],
  pflicht: [
    "Mach 15 Sekunden lang den besten Flirt-Blick in die Kamera.",
    "Lies die letzte Notiz in deinem Handy in dramatischer Stimme vor.",
    "Schick einem Kontakt ein harmloses \"Ey, wir müssen reden 😳\" und zeig die Reaktion später.",
    "Mach 10 Sekunden Catwalk durchs Zimmer.",
    "Sag 3 ehrliche Komplimente an die Runde.",
    "Erfinde einen peinlichen Spitznamen für dich selbst und nutze ihn 1 Runde lang.",
    "Imitiere 12 Sekunden eine Person aus der Runde (freundlich).",
    "Mach ein Selfie mit maximal overdramatischem Gesicht.",
    "Sprich 20 Sekunden wie ein Dating-Coach.",
    "Zeig deinen zuletzt benutzten Emoji und begründe ihn.",
    "Sag den Satz \"Ich bin absolut unauffällig\" in 5 verschiedenen Emotionen.",
    "Mach eine 8-Sekunden-Werbung für dich als \"Traum-Date\".",
    "Erfinde einen peinlichen Anmachspruch und trage ihn ernst vor.",
    "Mach 5 Kniebeugen und sag bei jeder den Namen deines Lieblingssnacks.",
    "Sprich die nächsten 30 Sekunden mit maximal seriöser Nachrichtensprecher-Stimme."
  ],
  fakeWahrheit: [
    "Was ist dein Lieblingsessen?",
    "Welche Jahreszeit magst du am meisten?",
    "Nenne dein Lieblingsgetränk.",
    "Welche App nutzt du am häufigsten?",
    "Was ist dein Lieblingswochentag?",
    "Welche Farbe magst du am meisten?",
    "Was ist dein Lieblingsfilm?",
    "Nenne dein Lieblingsfach in der Schule."
  ],
  fakePflicht: [
    "Nenne drei Obstsorten.",
    "Zähle langsam bis 10.",
    "Nenne zwei Tiere, die fliegen können.",
    "Sag deinen Vornamen rückwärts.",
    "Nenne drei Länder in Europa.",
    "Klatsche zweimal in die Hände.",
    "Nenne drei Farben.",
    "Sag laut den aktuellen Monat."
  ]
};

function createRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  if (rooms.has(code)) {
    return createRoomCode();
  }
  return code;
}

function randomItem(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function getRoomView(room) {
  return {
    code: room.code,
    state: room.state,
    hostId: room.hostId,
    players: room.players.map((p) => ({ id: p.id, name: p.name })),
    votes: room.votes,
    startedAt: room.startedAt
  };
}

function broadcastRoom(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;
  io.to(roomCode).emit("room_update", getRoomView(room));
}

function assignRound(room) {
  const mode = Math.random() < 0.5 ? "wahrheit" : "pflicht";
  const realPrompt = randomItem(PROMPTS[mode]);
  const fakePrompt = randomItem(mode === "wahrheit" ? PROMPTS.fakeWahrheit : PROMPTS.fakePflicht);
  const imposterIndex = Math.floor(Math.random() * room.players.length);
  const imposterId = room.players[imposterIndex].id;

  room.state = "round";
  room.votes = {};
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

  broadcastRoom(room.code);
}

function finishVoting(room) {
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
    } else if (count === topVotes) {
      tie = true;
    }
  });

  const imposterId = room.currentRound.imposterId;
  const imposter = room.players.find((p) => p.id === imposterId);
  const result = !tie && topId === imposterId ? "gruppe" : "imposter";

  room.state = "ended";

  io.to(room.code).emit("round_result", {
    winner: result,
    imposterId,
    imposterName: imposter ? imposter.name : "Unbekannt",
    voteCounts,
    votedOutId: topId,
    tie
  });

  broadcastRoom(room.code);
}

function removePlayerFromCurrentRoom(socket) {
  const roomCode = socket.data.roomCode;
  if (!roomCode) return;

  const room = rooms.get(roomCode);
  socket.data.roomCode = undefined;
  if (!room) return;

  room.players = room.players.filter((p) => p.id !== socket.id);
  delete room.votes[socket.id];

  if (room.currentRound) {
    Object.keys(room.votes).forEach((voterId) => {
      if (room.votes[voterId] === socket.id) {
        delete room.votes[voterId];
      }
    });
  }

  if (room.players.length === 0) {
    rooms.delete(roomCode);
    return;
  }

  if (room.hostId === socket.id) {
    room.hostId = room.players[0].id;
  }

  if (room.state === "vote" && Object.keys(room.votes).length === room.players.length) {
    finishVoting(room);
    return;
  }

  broadcastRoom(roomCode);
}

io.on("connection", (socket) => {
  socket.on("create_room", ({ name }) => {
    const trimmedName = String(name || "").trim().slice(0, 24);
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
      startedAt: Date.now()
    };

    rooms.set(code, room);
    socket.join(code);
    socket.data.roomCode = code;
    socket.emit("joined", { room: getRoomView(room), selfId: socket.id });
    broadcastRoom(code);
  });

  socket.on("join_room", ({ name, code }) => {
    const trimmedName = String(name || "").trim().slice(0, 24);
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

    if (room.players.length >= 12) {
      socket.emit("error_message", "Raum ist voll.");
      return;
    }

    if (room.state !== "lobby") {
      socket.emit("error_message", "Spiel läuft bereits.");
      return;
    }

    room.players.push({ id: socket.id, name: trimmedName });
    socket.join(normalizedCode);
    socket.data.roomCode = normalizedCode;
    socket.emit("joined", { room: getRoomView(room), selfId: socket.id });
    broadcastRoom(normalizedCode);
  });

  socket.on("start_round", () => {
    const roomCode = socket.data.roomCode;
    const room = rooms.get(roomCode);
    if (!room) return;
    if (room.hostId !== socket.id) return;

    if (room.players.length < 3) {
      socket.emit("error_message", "Mindestens 3 Spieler benötigt.");
      return;
    }

    assignRound(room);
  });

  socket.on("start_vote", () => {
    const roomCode = socket.data.roomCode;
    const room = rooms.get(roomCode);
    if (!room) return;
    if (room.hostId !== socket.id) return;
    if (room.state !== "round") return;

    room.state = "vote";
    room.votes = {};
    io.to(roomCode).emit("vote_started");
    broadcastRoom(roomCode);
  });

  socket.on("submit_vote", ({ targetId }) => {
    const roomCode = socket.data.roomCode;
    const room = rooms.get(roomCode);
    if (!room || room.state !== "vote") return;

    const validTarget = room.players.some((p) => p.id === targetId);
    if (!validTarget || targetId === socket.id) {
      return;
    }

    room.votes[socket.id] = targetId;
    broadcastRoom(roomCode);

    if (Object.keys(room.votes).length === room.players.length) {
      finishVoting(room);
    }
  });

  socket.on("new_round", () => {
    const roomCode = socket.data.roomCode;
    const room = rooms.get(roomCode);
    if (!room) return;
    if (room.hostId !== socket.id) return;
    if (room.state !== "ended") return;

    assignRound(room);
  });

  socket.on("kick_player", ({ targetId }) => {
    const roomCode = socket.data.roomCode;
    const room = rooms.get(roomCode);
    if (!room) return;
    if (room.hostId !== socket.id) return;

    const normalizedTargetId = String(targetId || "");
    if (!normalizedTargetId || normalizedTargetId === socket.id) return;

    const targetIsInRoom = room.players.some((player) => player.id === normalizedTargetId);
    if (!targetIsInRoom) return;

    const targetSocket = io.sockets.sockets.get(normalizedTargetId);
    if (!targetSocket) return;

    targetSocket.leave(roomCode);
    removePlayerFromCurrentRoom(targetSocket);
    io.to(normalizedTargetId).emit("kicked", {
      message: "Du wurdest vom Host aus dem Raum entfernt."
    });
  });

  socket.on("leave_room", () => {
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