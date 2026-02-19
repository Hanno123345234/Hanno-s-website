const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
  if (req.path === "/" || req.path.endsWith(".html")) {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
  }
  next();
});

app.use(express.static("public"));

const rooms = new Map();
const amongRooms = new Map();
const CONTENT_FILTERS = ["family", "normal", "spicy"];
const FILTER_PROMPT_MAP = {
  family: "soft",
  normal: "spicy",
  spicy: "chaos"
};

const PROMPT_SETS = {
  soft: {
    wahrheit: [
      "What is your best habit?",
      "What was your funniest moment at school?",
      "Which app do you use the most?",
      "What small thing instantly makes you happy?",
      "Who would you most likely go on a road trip with?",
      "Which series could you rewatch forever?"
    ],
    pflicht: [
      "Imitate a news anchor for 10 seconds.",
      "Speak like a robot for 15 seconds.",
      "Give 3 honest compliments to the group.",
      "Do 5 squats and count out loud.",
      "Act like an animal for 8 seconds.",
      "Invent a slogan for bottled water."
    ],
    fakeWahrheit: [
      "What is your favorite food?",
      "Which season do you like most?",
      "Name your favorite drink.",
      "Which color do you like most?"
    ],
    fakePflicht: [
      "Name three fruits.",
      "Count slowly to 10.",
      "Name three countries in Europe.",
      "Clap your hands twice."
    ]
  },
  spicy: {
    wahrheit: [
      "Who in this round has the best vibe and why?",
      "What was your most embarrassing chat moment?",
      "Who was your last small crush?",
      "Which red flag do you sometimes ignore anyway?",
      "What was your worst flirting fail?",
      "When were you last truly jealous?"
    ],
    pflicht: [
      "Do your best flirty camera look for 15 seconds.",
      "Do a 10-second catwalk through the room.",
      "Talk like a dating coach for 20 seconds.",
      "Say \"I am totally inconspicuous\" in 5 emotions.",
      "Invent a cringe pickup line and present it seriously.",
      "Make an 8-second ad for yourself as the \"dream date\"."
    ],
    fakeWahrheit: [
      "What is your favorite food?",
      "Which season do you like most?",
      "Name your favorite drink.",
      "What is your favorite movie?"
    ],
    fakePflicht: [
      "Name three fruits.",
      "Count slowly to 10.",
      "Say the current month out loud.",
      "Name three colors."
    ]
  },
  chaos: {
    wahrheit: [
      "Which message would you delete immediately if someone grabbed your phone?",
      "What was your most awkward flirting moment ever?",
      "Which red flag would you never admit publicly?",
      "Who here is most likely to secretly juggle two chats at once?",
      "Who here would you call at night when you're stressed?",
      "What was your worst \"I talked too much\" moment?"
    ],
    pflicht: [
      "Talk for 20 seconds in a super dramatic soap-opera voice.",
      "Take a \"cringe but confident\" selfie and show it briefly.",
      "Give a fake motivational speech to the group for 10 seconds.",
      "Give 3 ultra-overdramatic tips for a first date.",
      "Act out your inner villain for 10 seconds.",
      "Say your name backwards like a magic spell."
    ],
    fakeWahrheit: [
      "What is your favorite fruit?",
      "Which color do you like?",
      "Name your favorite movie.",
      "What is your favorite drink?"
    ],
    fakePflicht: [
      "Name three animals.",
      "Count to 8.",
      "Name three cities.",
      "Clap once."
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

function createPin() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function validName(value) {
  return String(value || "").trim().slice(0, 24);
}

function randomItem(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function nowIso() {
  return new Date().toISOString();
}

function addAudit(room, message) {
  room.auditLog.push({ message, at: nowIso() });
  if (room.auditLog.length > 80) {
    room.auditLog.shift();
  }
}

function isRateLimited(socket, key, cooldownMs, eventLabel) {
  if (!socket.data.rateLimits) {
    socket.data.rateLimits = {};
  }

  const now = Date.now();
  const previous = socket.data.rateLimits[key] || 0;
  const diff = now - previous;

  if (diff < cooldownMs) {
    socket.emit("cooldown", {
      action: eventLabel || key,
      retryMs: cooldownMs - diff
    });
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
  return Math.min(Math.max(4, Math.floor(listLength * 0.7)), 12);
}

function updateStatName(room, name) {
  const key = name.toLowerCase();
  if (!room.playerStats[key]) {
    room.playerStats[key] = {
      name,
      rounds: 0,
      imposterRounds: 0,
      groupWins: 0,
      imposterWins: 0,
      votesGiven: 0,
      votesCorrect: 0,
      suspected: 0
    };
  } else {
    room.playerStats[key].name = name;
  }
}

function getStat(room, name) {
  updateStatName(room, name);
  return room.playerStats[name.toLowerCase()];
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

function getRoomView(room, viewerSocketId = null) {
  const isHostViewer = viewerSocketId && room.hostId === viewerSocketId;

  return {
    code: room.code,
    state: room.state,
    hostId: room.hostId,
    players: room.players.map((player) => ({ id: player.id, name: player.name })),
    spectators: room.spectators.map((spectator) => ({ id: spectator.id, name: spectator.name })),
    votes: room.votes,
    startedAt: room.startedAt,
    settings: room.settings,
    mutedPlayerIds: Array.from(room.mutedPlayerIds),
    scores: room.scores,
    phaseEndsAt: room.phaseEndsAt,
    expectedVotes: room.state === "vote" ? getExpectedVoteCount(room) : null,
    contentFilter: room.settings.contentFilter,
    customPromptCounts: {
      wahrheit: room.customPrompts.wahrheit.length,
      pflicht: room.customPrompts.pflicht.length
    },
    recentPlayers: room.recentPlayers,
    auditLog: isHostViewer ? room.auditLog.slice(-20) : [],
    playerStats: isHostViewer ? Object.values(room.playerStats) : [],
    pin: isHostViewer ? room.pin : null
  };
}

function broadcastRoom(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;

  room.players.forEach((player) => {
    io.to(player.id).emit("room_update", getRoomView(room, player.id));
  });
  room.spectators.forEach((spectator) => {
    io.to(spectator.id).emit("room_update", getRoomView(room, spectator.id));
  });
}

function closeRoomBecauseHostLeft(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;

  clearPhaseTimer(room);
  [...room.players, ...room.spectators].forEach((entry) => {
    io.to(entry.id).emit("room_closed", {
      message: "The host left the lobby. The lobby was closed."
    });

    const targetSocket = io.sockets.sockets.get(entry.id);
    if (targetSocket) {
      targetSocket.leave(roomCode);
      targetSocket.data.roomCode = undefined;
      targetSocket.data.participantType = undefined;
    }
  });

  rooms.delete(roomCode);
}

function finishVoting(room, byTimer = false) {
  clearPhaseTimer(room);

  const voteCounts = {};
  Object.entries(room.votes).forEach(([voterId, targetId]) => {
    voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;

    const voter = room.players.find((player) => player.id === voterId);
    if (voter) {
      const stat = getStat(room, voter.name);
      stat.votesGiven += 1;
      if (targetId === room.currentRound.imposterId) {
        stat.votesCorrect += 1;
      }
    }
  });

  Object.entries(voteCounts).forEach(([targetId, count]) => {
    const target = room.players.find((player) => player.id === targetId);
    if (target) {
      const stat = getStat(room, target.name);
      stat.suspected += count;
    }
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

  room.players.forEach((player) => {
    const stat = getStat(room, player.name);
    stat.rounds += 1;
    if (player.id === imposterId) {
      stat.imposterRounds += 1;
      if (winner === "imposter") stat.imposterWins += 1;
    } else if (winner === "gruppe") {
      stat.groupWins += 1;
    }
  });

  addAudit(room, `Round finished: ${winner === "gruppe" ? "Group" : "Imposter"} wins.`);

  io.to(room.code).emit("round_result", {
    winner,
    imposterId,
    imposterName: imposter ? imposter.name : "Unknown",
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

  addAudit(room, byTimer ? "Vote phase auto-started." : "Vote phase started by host.");

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

  const setKey = FILTER_PROMPT_MAP[room.settings.contentFilter] || "spicy";
  const promptSet = PROMPT_SETS[setKey];

  const mode = Math.random() < 0.5 ? "wahrheit" : "pflicht";
  const allRealPrompts = [...promptSet[mode], ...room.customPrompts[mode]];
  const realPrompt = pickPrompt(room, mode, allRealPrompts);
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

  room.spectators.forEach((spectator) => {
    io.to(spectator.id).emit("spectator_assignment", {
      message: "You are spectating and do not receive a secret task."
    });
  });

  addAudit(room, `New round started (${mode}, filter: ${room.settings.contentFilter}).`);

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

  addAudit(room, "Round aborted by host.");

  io.to(room.code).emit("round_aborted", {
    message: "The host aborted the round."
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

function removeParticipantFromRoom(socket, reason = "leave") {
  const roomCode = socket.data.roomCode;
  if (!roomCode) return;

  const room = rooms.get(roomCode);
  socket.data.roomCode = undefined;
  socket.data.participantType = undefined;

  if (!room) return;

  const isPlayer = room.players.some((player) => player.id === socket.id);
  const isSpectator = room.spectators.some((spec) => spec.id === socket.id);

  if (isSpectator) {
    room.spectators = room.spectators.filter((spec) => spec.id !== socket.id);
    if (room.players.length === 0 && room.spectators.length === 0) {
      clearPhaseTimer(room);
      rooms.delete(roomCode);
      return;
    }
    broadcastRoom(roomCode);
    return;
  }

  if (!isPlayer) return;

  const leavingPlayer = room.players.find((player) => player.id === socket.id);
  const leavingName = leavingPlayer ? leavingPlayer.name : "";
  const leavingAssignment = room.currentRound ? room.currentRound.assignments[socket.id] : null;

  room.players = room.players.filter((player) => player.id !== socket.id);
  room.mutedPlayerIds.delete(socket.id);
  delete room.votes[socket.id];

  Object.keys(room.votes).forEach((voterId) => {
    if (room.votes[voterId] === socket.id) {
      delete room.votes[voterId];
    }
  });

  if (room.currentRound && room.currentRound.assignments[socket.id]) {
    delete room.currentRound.assignments[socket.id];
  }

  if (reason === "disconnect" && leavingName && room.hostId !== socket.id) {
    room.reconnectTokens[leavingName.toLowerCase()] = {
      expiresAt: Date.now() + 90 * 1000,
      role: "player",
      assignment: leavingAssignment
    };
    addAudit(room, `${leavingName} lost connection (rejoin possible for 90s).`);
  }

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
    socket.emit("error_message", "You are not in a room.");
    return null;
  }

  const room = rooms.get(roomCode);
  if (!room) {
    socket.emit("error_message", "Room not found.");
    return null;
  }

  if (room.hostId !== socket.id) {
    socket.emit("error_message", "Only the host can do that.");
    return null;
  }

  return room;
}

function attachPlayer(room, socket, name, asRejoin = false) {
  room.players.push({ id: socket.id, name });
  socket.data.participantType = "player";

  updateStatName(room, name);
  if (!room.recentPlayers.includes(name)) {
    room.recentPlayers.unshift(name);
    room.recentPlayers = room.recentPlayers.slice(0, 12);
  }

  addAudit(room, asRejoin ? `${name} reconnected.` : `${name} joined.`);
}

function attachSpectator(room, socket, name, asRejoin = false) {
  room.spectators.push({ id: socket.id, name });
  socket.data.participantType = "spectator";
  addAudit(room, asRejoin ? `Spectator ${name} reconnected.` : `Spectator ${name} joined.`);
}

function createAmongCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let index = 0; index < 5; index += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return amongRooms.has(code) ? createAmongCode() : code;
}

function amongTaskPool() {
  return [
    "Calibrate reactor panel",
    "Sort security logs",
    "Decrypt data chip",
    "Fix navigation path",
    "Sync power distributor",
    "Realign communications"
  ];
}

function amongBroadcast(roomCode) {
  const room = amongRooms.get(roomCode);
  if (!room) return;

  io.to(roomCode).emit("among_room_update", {
    code: room.code,
    state: room.state,
    hostId: room.hostId,
    players: room.players.map((player) => ({
      id: player.id,
      name: player.name,
      alive: player.alive,
      tasksDone: player.tasksDone,
      tasksTotal: player.tasksTotal,
      emergencyLeft: player.emergencyLeft
    })),
    meeting: room.meeting ? {
      active: true,
      reason: room.meeting.reason,
      reporterName: room.meeting.reporterName,
      votesCount: Object.keys(room.meeting.votes).length,
      endsAt: room.meeting.endsAt
    } : null,
    deadBody: room.deadBody,
    winner: room.winner,
    logs: room.logs.slice(-20)
  });
}

function amongLog(room, message) {
  room.logs.push({ message, at: nowIso() });
  if (room.logs.length > 80) room.logs.shift();
}

function amongAlive(room) {
  return room.players.filter((player) => player.alive);
}

function amongCheckWin(room) {
  if (room.winner) return true;

  const alive = amongAlive(room);
  const aliveImposters = alive.filter((player) => player.role === "imposter").length;
  const aliveCrew = alive.filter((player) => player.role === "crewmate").length;

  if (aliveImposters <= 0) {
    room.winner = "crew";
  } else if (aliveImposters >= aliveCrew) {
    room.winner = "imposter";
  } else {
    const crew = room.players.filter((player) => player.role === "crewmate");
    const allTasksDone = crew.length > 0 && crew.every((player) => player.tasksDone >= player.tasksTotal);
    if (allTasksDone) {
      room.winner = "crew";
    }
  }

  if (room.winner) {
    room.state = "ended";
    room.deadBody = null;
    if (room.meeting?.timer) clearTimeout(room.meeting.timer);
    room.meeting = null;
    amongLog(room, room.winner === "crew" ? "Crew wins the round." : "Imposter wins the round.");
    io.to(room.code).emit("among_game_over", { winner: room.winner });
    amongBroadcast(room.code);
    return true;
  }

  return false;
}

function amongResolveMeeting(room) {
  if (!room.meeting) return;
  if (room.meeting.timer) clearTimeout(room.meeting.timer);

  const tally = {};
  Object.values(room.meeting.votes).forEach((target) => {
    tally[target] = (tally[target] || 0) + 1;
  });

  let topTarget = null;
  let topCount = 0;
  let tie = false;

  Object.entries(tally).forEach(([target, count]) => {
    if (count > topCount) {
      topCount = count;
      topTarget = target;
      tie = false;
    } else if (count === topCount) {
      tie = true;
    }
  });

  let ejected = null;
  if (!tie && topTarget && topTarget !== "skip") {
    const targetPlayer = room.players.find((player) => player.id === topTarget);
    if (targetPlayer && targetPlayer.alive) {
      targetPlayer.alive = false;
      ejected = { id: targetPlayer.id, name: targetPlayer.name, role: targetPlayer.role };
      amongLog(room, `${targetPlayer.name} was voted off the ship.`);
    }
  } else {
    amongLog(room, "Meeting ended with no ejection.");
  }

  room.state = "playing";
  room.deadBody = null;
  room.meeting = null;

  io.to(room.code).emit("among_meeting_result", {
    ejected,
    tie,
    tally
  });

  if (!amongCheckWin(room)) {
    amongBroadcast(room.code);
  }
}

function amongStartMeeting(room, reason, reporterName) {
  if (room.meeting || room.state !== "playing") return;

  room.state = "meeting";
  room.meeting = {
    reason,
    reporterName,
    votes: {},
    endsAt: Date.now() + 45000,
    timer: null
  };

  room.meeting.timer = setTimeout(() => {
    const liveRoom = amongRooms.get(room.code);
    if (!liveRoom || !liveRoom.meeting) return;
    amongResolveMeeting(liveRoom);
  }, 45000);

  amongLog(room, `Meeting gestartet (${reason}) von ${reporterName}.`);
  io.to(room.code).emit("among_meeting_started", {
    reason,
    reporterName,
    endsAt: room.meeting.endsAt
  });
  amongBroadcast(room.code);
}

function amongRemoveSocket(socket, reason = "leave") {
  const roomCode = socket.data.amongRoomCode;
  if (!roomCode) return;

  const room = amongRooms.get(roomCode);
  socket.data.amongRoomCode = undefined;
  if (!room) return;

  room.players = room.players.filter((player) => player.id !== socket.id);
  if (room.meeting?.votes?.[socket.id]) {
    delete room.meeting.votes[socket.id];
  }

  if (room.players.length === 0) {
    if (room.meeting?.timer) clearTimeout(room.meeting.timer);
    amongRooms.delete(roomCode);
    return;
  }

  if (room.hostId === socket.id) {
    io.to(room.code).emit("among_closed", { message: "Host left the lobby." });
    if (room.meeting?.timer) clearTimeout(room.meeting.timer);
    amongRooms.delete(roomCode);
    return;
  }

  if (reason === "disconnect") {
    amongLog(room, "A player lost connection.");
  }

  amongCheckWin(room);
  amongBroadcast(room.code);
}

io.on("connection", (socket) => {
  socket.on("among_create_room", ({ name }) => {
    if (isRateLimited(socket, "among_create_room", 900, "among_create_room")) {
      socket.emit("error_message", "Please wait a moment.");
      return;
    }

    const trimmedName = validName(name);
    if (!trimmedName) {
      socket.emit("among_error", "Please enter a name.");
      return;
    }

    const code = createAmongCode();
    const room = {
      code,
      hostId: socket.id,
      state: "lobby",
      players: [{
        id: socket.id,
        name: trimmedName,
        role: null,
        alive: true,
        tasksDone: 0,
        tasksTotal: 3,
        emergencyLeft: 1,
        killCooldownUntil: 0
      }],
      logs: [],
      deadBody: null,
      meeting: null,
      winner: null
    };

    amongLog(room, `${trimmedName} created the Among lobby.`);
    amongRooms.set(code, room);
    socket.join(code);
    socket.data.amongRoomCode = code;

    socket.emit("among_joined", { code, selfId: socket.id });
    amongBroadcast(code);
  });

  socket.on("among_join_room", ({ name, code }) => {
    if (isRateLimited(socket, "among_join_room", 700, "among_join_room")) {
      socket.emit("among_error", "Please wait a moment.");
      return;
    }

    const trimmedName = validName(name);
    const normalizedCode = String(code || "").trim().toUpperCase();
    if (!trimmedName || !normalizedCode) {
      socket.emit("among_error", "Name and room code are required.");
      return;
    }

    const room = amongRooms.get(normalizedCode);
    if (!room) {
      socket.emit("among_error", "Room not found.");
      return;
    }

    if (room.state !== "lobby") {
      socket.emit("among_error", "Game is already running.");
      return;
    }

    if (room.players.length >= 12) {
      socket.emit("among_error", "Room is full.");
      return;
    }

    const duplicate = room.players.some((player) => player.name.toLowerCase() === trimmedName.toLowerCase());
    if (duplicate) {
      socket.emit("among_error", "Name is already taken.");
      return;
    }

    room.players.push({
      id: socket.id,
      name: trimmedName,
      role: null,
      alive: true,
      tasksDone: 0,
      tasksTotal: 3,
      emergencyLeft: 1,
      killCooldownUntil: 0
    });
    socket.join(normalizedCode);
    socket.data.amongRoomCode = normalizedCode;

    amongLog(room, `${trimmedName} joined.`);
    socket.emit("among_joined", { code: normalizedCode, selfId: socket.id });
    amongBroadcast(normalizedCode);
  });

  socket.on("among_start_game", () => {
    const roomCode = socket.data.amongRoomCode;
    const room = amongRooms.get(roomCode);
    if (!room) return;
    if (room.hostId !== socket.id) {
      socket.emit("among_error", "Only the host can start.");
      return;
    }

    if (room.players.length < 4) {
      socket.emit("among_error", "At least 4 players are required.");
      return;
    }

    room.state = "playing";
    room.winner = null;
    room.deadBody = null;
    room.players.forEach((player) => {
      player.alive = true;
      player.tasksDone = 0;
      player.tasksTotal = 3;
      player.emergencyLeft = 1;
      player.killCooldownUntil = 0;
      player.role = "crewmate";
    });

    const imposterIndex = Math.floor(Math.random() * room.players.length);
    room.players[imposterIndex].role = "imposter";
    room.players[imposterIndex].killCooldownUntil = Date.now() + 10000;

    const tasks = amongTaskPool();
    room.players.forEach((player) => {
      if (player.role === "crewmate") {
        const shuffled = [...tasks].sort(() => Math.random() - 0.5).slice(0, 3);
        io.to(player.id).emit("among_role", { role: "crewmate", tasks: shuffled });
      } else {
        io.to(player.id).emit("among_role", { role: "imposter", tasks: ["Sabotage", "Fake alibi", "Eliminate"] });
      }
    });

    amongLog(room, "Game started.");
    io.to(room.code).emit("among_game_started");
    amongBroadcast(room.code);
  });

  socket.on("among_complete_task", () => {
    const roomCode = socket.data.amongRoomCode;
    const room = amongRooms.get(roomCode);
    if (!room || room.state !== "playing") return;

    const player = room.players.find((entry) => entry.id === socket.id);
    if (!player || !player.alive || player.role !== "crewmate") return;
    if (player.tasksDone >= player.tasksTotal) return;

    player.tasksDone += 1;
    amongLog(room, `${player.name} completed a task.`);
    amongCheckWin(room);
    amongBroadcast(roomCode);
  });

  socket.on("among_kill", ({ targetId }) => {
    const roomCode = socket.data.amongRoomCode;
    const room = amongRooms.get(roomCode);
    if (!room || room.state !== "playing") return;

    const killer = room.players.find((entry) => entry.id === socket.id);
    const target = room.players.find((entry) => entry.id === String(targetId || ""));
    if (!killer || !target) return;
    if (!killer.alive || killer.role !== "imposter") return;
    if (!target.alive || target.id === killer.id) return;

    if (Date.now() < killer.killCooldownUntil) {
      socket.emit("among_error", "Kill cooldown active.");
      return;
    }

    target.alive = false;
    killer.killCooldownUntil = Date.now() + 20000;
    room.deadBody = {
      id: target.id,
      name: target.name
    };

    amongLog(room, `${target.name} was eliminated.`);
    io.to(room.code).emit("among_body_found", { name: target.name });
    if (!amongCheckWin(room)) amongBroadcast(roomCode);
  });

  socket.on("among_report_body", () => {
    const roomCode = socket.data.amongRoomCode;
    const room = amongRooms.get(roomCode);
    if (!room || room.state !== "playing" || !room.deadBody) return;

    const reporter = room.players.find((entry) => entry.id === socket.id);
    if (!reporter || !reporter.alive) return;

    amongStartMeeting(room, "body", reporter.name);
  });

  socket.on("among_call_meeting", () => {
    const roomCode = socket.data.amongRoomCode;
    const room = amongRooms.get(roomCode);
    if (!room || room.state !== "playing") return;

    const caller = room.players.find((entry) => entry.id === socket.id);
    if (!caller || !caller.alive) return;
    if (caller.emergencyLeft <= 0) {
      socket.emit("among_error", "No emergency meetings left.");
      return;
    }

    caller.emergencyLeft -= 1;
    amongStartMeeting(room, "emergency", caller.name);
  });

  socket.on("among_vote", ({ targetId }) => {
    const roomCode = socket.data.amongRoomCode;
    const room = amongRooms.get(roomCode);
    if (!room || room.state !== "meeting" || !room.meeting) return;

    const voter = room.players.find((entry) => entry.id === socket.id);
    if (!voter || !voter.alive) return;
    if (room.meeting.votes[socket.id]) {
      socket.emit("among_error", "You already voted.");
      return;
    }

    const normalizedTarget = String(targetId || "skip");
    const validTarget = normalizedTarget === "skip" || room.players.some((entry) => entry.id === normalizedTarget && entry.alive);
    if (!validTarget) {
      socket.emit("among_error", "Invalid vote.");
      return;
    }

    room.meeting.votes[socket.id] = normalizedTarget;
    amongBroadcast(roomCode);

    const aliveCount = amongAlive(room).length;
    if (Object.keys(room.meeting.votes).length >= aliveCount) {
      amongResolveMeeting(room);
    }
  });

  socket.on("among_leave_room", () => {
    const roomCode = socket.data.amongRoomCode;
    if (!roomCode) return;
    socket.leave(roomCode);
    amongRemoveSocket(socket, "leave");
    socket.emit("among_left");
  });

  socket.on("create_room", ({ name }) => {
    if (isRateLimited(socket, "create_room", 900, "create_room")) {
      socket.emit("error_message", "Please wait a moment.");
      return;
    }

    const trimmedName = validName(name);
    if (!trimmedName) {
      socket.emit("error_message", "Please enter a name.");
      return;
    }

    const code = createRoomCode();
    const pin = createPin();

    const room = {
      code,
      pin,
      hostId: socket.id,
      players: [{ id: socket.id, name: trimmedName }],
      spectators: [],
      state: "lobby",
      votes: {},
      currentRound: null,
      startedAt: Date.now(),
      settings: {
        contentFilter: "normal",
        roundSeconds: 45,
        voteSeconds: 30,
        lobbyLocked: false,
        requirePin: true
      },
      mutedPlayerIds: new Set(),
      promptHistory: {
        wahrheit: [],
        pflicht: [],
        fakeWahrheit: [],
        fakePflicht: []
      },
      customPrompts: {
        wahrheit: [],
        pflicht: []
      },
      scores: {
        gruppe: 0,
        imposter: 0
      },
      phaseTimer: null,
      phaseEndsAt: null,
      auditLog: [],
      playerStats: {},
      reconnectTokens: {},
      recentPlayers: []
    };

    updateStatName(room, trimmedName);
    room.recentPlayers.push(trimmedName);
    addAudit(room, `${trimmedName} created the lobby.`);

    rooms.set(code, room);
    socket.join(code);
    socket.data.roomCode = code;
    socket.data.participantType = "player";

    socket.emit("joined", { room: getRoomView(room, socket.id), selfId: socket.id, participantType: "player" });
    broadcastRoom(code);
  });

  socket.on("join_room", ({ name, code, pin, spectator = false, rejoin = false }) => {
    if (isRateLimited(socket, "join_room", 800, "join_room")) {
      socket.emit("error_message", "Please wait a moment.");
      return;
    }

    const trimmedName = validName(name);
    const normalizedCode = String(code || "").trim().toUpperCase();
    const normalizedPin = String(pin || "").trim();
    const joinAsSpectator = !!spectator;

    if (!trimmedName || !normalizedCode) {
      socket.emit("error_message", "Name and room code are required.");
      return;
    }

    const room = rooms.get(normalizedCode);
    if (!room) {
      socket.emit("error_message", "Room not found.");
      return;
    }

    if (room.settings.requirePin && room.pin !== normalizedPin) {
      socket.emit("error_message", "Wrong PIN.");
      return;
    }

    const token = room.reconnectTokens[trimmedName.toLowerCase()];
    const validReconnect = token && token.expiresAt > Date.now() && rejoin;

    if (room.settings.lobbyLocked && !validReconnect) {
      socket.emit("error_message", "Lobby is locked.");
      return;
    }

    if (!joinAsSpectator && room.players.length >= 12) {
      socket.emit("error_message", "Room is full.");
      return;
    }

    if (room.state === "round" || room.state === "vote") {
      if (!joinAsSpectator && !validReconnect) {
        socket.emit("error_message", "Round in progress. Join as spectator.");
        return;
      }
    }

    const duplicateInPlayers = room.players.some((player) => player.name.toLowerCase() === trimmedName.toLowerCase());
    const duplicateInSpectators = room.spectators.some((spec) => spec.name.toLowerCase() === trimmedName.toLowerCase());

    if ((duplicateInPlayers || duplicateInSpectators) && !validReconnect) {
      socket.emit("error_message", "Name is already taken.");
      return;
    }

    socket.join(normalizedCode);
    socket.data.roomCode = normalizedCode;

    if (validReconnect && token.role === "player") {
      attachPlayer(room, socket, trimmedName, true);
      if (room.state === "round" && token.assignment) {
        room.currentRound.assignments[socket.id] = token.assignment;
        io.to(socket.id).emit("assignment", token.assignment);
      }
      delete room.reconnectTokens[trimmedName.toLowerCase()];
      socket.emit("joined", { room: getRoomView(room, socket.id), selfId: socket.id, participantType: "player" });
    } else if (joinAsSpectator || (validReconnect && token.role === "spectator")) {
      attachSpectator(room, socket, trimmedName, validReconnect);
      delete room.reconnectTokens[trimmedName.toLowerCase()];
      socket.emit("joined", { room: getRoomView(room, socket.id), selfId: socket.id, participantType: "spectator" });
    } else {
      attachPlayer(room, socket, trimmedName, false);
      socket.emit("joined", { room: getRoomView(room, socket.id), selfId: socket.id, participantType: "player" });
      if (room.state === "round") {
        io.to(socket.id).emit("spectator_assignment", {
          message: "You joined during an active round and are spectator until the next round."
        });
        room.players = room.players.filter((player) => player.id !== socket.id);
        attachSpectator(room, socket, trimmedName, false);
      }
    }

    broadcastRoom(normalizedCode);
  });

  socket.on("update_name", ({ name }) => {
    if (isRateLimited(socket, "update_name", 500, "update_name")) {
      socket.emit("error_message", "Please wait a moment.");
      return;
    }

    const roomCode = socket.data.roomCode;
    const room = rooms.get(roomCode);
    if (!room) {
      socket.emit("error_message", "Room not found.");
      return;
    }

    const nextName = validName(name);
    if (!nextName) {
      socket.emit("error_message", "Invalid name.");
      return;
    }

    const duplicate = [...room.players, ...room.spectators].some(
      (entry) => entry.id !== socket.id && entry.name.toLowerCase() === nextName.toLowerCase()
    );
    if (duplicate) {
      socket.emit("error_message", "Name is already taken.");
      return;
    }

    const oldPlayer = room.players.find((player) => player.id === socket.id);
    const oldSpectator = room.spectators.find((spec) => spec.id === socket.id);
    const oldName = oldPlayer ? oldPlayer.name : oldSpectator ? oldSpectator.name : null;

    if (!oldName) {
      socket.emit("error_message", "Player not found.");
      return;
    }

    if (oldPlayer) {
      oldPlayer.name = nextName;
    } else {
      oldSpectator.name = nextName;
    }

    updateStatName(room, nextName);

    addAudit(room, `${oldName} is now ${nextName}.`);
    socket.emit("name_updated", { name: nextName });
    broadcastRoom(roomCode);
  });

  socket.on("set_content_filter", ({ filter }) => {
    if (isRateLimited(socket, "set_content_filter", 350, "set_content_filter")) {
      socket.emit("error_message", "Please wait a moment.");
      return;
    }

    const room = getHostRoom(socket);
    if (!room) return;
    if (room.state !== "lobby") {
      socket.emit("error_message", "Filter can only be changed in lobby.");
      return;
    }

    const normalizedFilter = String(filter || "").toLowerCase();
    if (!CONTENT_FILTERS.includes(normalizedFilter)) {
      socket.emit("error_message", "Invalid filter.");
      return;
    }

    room.settings.contentFilter = normalizedFilter;
    addAudit(room, `Content filter set to ${normalizedFilter}.`);
    broadcastRoom(room.code);
  });

  socket.on("add_custom_prompt", ({ kind, text }) => {
    if (isRateLimited(socket, "add_custom_prompt", 350, "add_custom_prompt")) {
      socket.emit("error_message", "Please wait a moment.");
      return;
    }

    const room = getHostRoom(socket);
    if (!room) return;

    const normalizedKind = String(kind || "").toLowerCase();
    const normalizedText = String(text || "").trim().slice(0, 180);
    if (!["wahrheit", "pflicht"].includes(normalizedKind) || !normalizedText) {
      socket.emit("error_message", "Invalid question/task.");
      return;
    }

    room.customPrompts[normalizedKind].push(normalizedText);
    addAudit(room, `Custom ${normalizedKind} prompt added.`);
    broadcastRoom(room.code);
  });

  socket.on("toggle_lobby_lock", () => {
    if (isRateLimited(socket, "toggle_lobby_lock", 350, "toggle_lobby_lock")) {
      socket.emit("error_message", "Please wait a moment.");
      return;
    }

    const room = getHostRoom(socket);
    if (!room) return;

    room.settings.lobbyLocked = !room.settings.lobbyLocked;
    addAudit(room, room.settings.lobbyLocked ? "Lobby locked." : "Lobby unlocked.");
    broadcastRoom(room.code);
  });

  socket.on("toggle_mute_player", ({ targetId }) => {
    if (isRateLimited(socket, "toggle_mute_player", 350, "toggle_mute_player")) {
      socket.emit("error_message", "Please wait a moment.");
      return;
    }

    const room = getHostRoom(socket);
    if (!room) return;

    const normalizedTargetId = String(targetId || "");
    if (!normalizedTargetId || normalizedTargetId === socket.id) {
      socket.emit("error_message", "Invalid player.");
      return;
    }

    const target = room.players.find((player) => player.id === normalizedTargetId);
    if (!target) {
      socket.emit("error_message", "Player not found.");
      return;
    }

    if (room.mutedPlayerIds.has(normalizedTargetId)) {
      room.mutedPlayerIds.delete(normalizedTargetId);
      io.to(normalizedTargetId).emit("muted_status", { muted: false });
      addAudit(room, `${target.name} was unmuted.`);
    } else {
      room.mutedPlayerIds.add(normalizedTargetId);
      delete room.votes[normalizedTargetId];
      io.to(normalizedTargetId).emit("muted_status", { muted: true });
      addAudit(room, `${target.name} was muted.`);
    }

    tryAutoFinishVote(room);
    broadcastRoom(room.code);
  });

  socket.on("kick_player", ({ targetId }) => {
    if (isRateLimited(socket, "kick_player", 450, "kick_player")) {
      socket.emit("error_message", "Please wait a moment.");
      return;
    }

    const room = getHostRoom(socket);
    if (!room) return;

    const normalizedTargetId = String(targetId || "");
    if (!normalizedTargetId || normalizedTargetId === socket.id) {
      socket.emit("error_message", "Invalid player.");
      return;
    }

    const targetSocket = io.sockets.sockets.get(normalizedTargetId);
    const targetPlayer = room.players.find((player) => player.id === normalizedTargetId)
      || room.spectators.find((spec) => spec.id === normalizedTargetId);

    if (!targetSocket || !targetPlayer) {
      socket.emit("error_message", "Player not found.");
      return;
    }

    targetSocket.leave(room.code);
    removeParticipantFromRoom(targetSocket, "kick");
    io.to(normalizedTargetId).emit("kicked", {
      message: "You were removed from the room by the host."
    });
    addAudit(room, `${targetPlayer.name} was kicked.`);
    broadcastRoom(room.code);
  });

  socket.on("start_round", () => {
    if (isRateLimited(socket, "start_round", 600, "start_round")) {
      socket.emit("error_message", "Please wait a moment.");
      return;
    }

    const room = getHostRoom(socket);
    if (!room) return;

    if (room.state !== "lobby" && room.state !== "ended") {
      socket.emit("error_message", "Round cannot be started right now.");
      return;
    }

    if (room.players.length < 3) {
      socket.emit("error_message", "At least 3 active players are required.");
      return;
    }

    assignRound(room);
  });

  socket.on("start_vote", () => {
    if (isRateLimited(socket, "start_vote", 600, "start_vote")) {
      socket.emit("error_message", "Please wait a moment.");
      return;
    }

    const room = getHostRoom(socket);
    if (!room) return;

    if (room.state !== "round") {
      socket.emit("error_message", "Voting cannot be started right now.");
      return;
    }

    startVotePhase(room, false);
  });

  socket.on("submit_vote", ({ targetId }) => {
    if (isRateLimited(socket, "submit_vote", 500, "submit_vote")) {
      socket.emit("error_message", "Don't click that fast.");
      return;
    }

    const roomCode = socket.data.roomCode;
    const room = rooms.get(roomCode);
    if (!room || room.state !== "vote") return;

    if (socket.data.participantType !== "player") {
      socket.emit("error_message", "As spectator you cannot vote.");
      return;
    }

    if (room.mutedPlayerIds.has(socket.id)) {
      socket.emit("error_message", "You are muted and cannot vote.");
      return;
    }

    if (room.votes[socket.id]) {
      socket.emit("error_message", "You already voted.");
      return;
    }

    const normalizedTargetId = String(targetId || "");
    const validTarget = room.players.some((player) => player.id === normalizedTargetId);
    if (!validTarget || normalizedTargetId === socket.id) {
      socket.emit("error_message", "Invalid vote.");
      return;
    }

    room.votes[socket.id] = normalizedTargetId;
    addAudit(room, "A vote was submitted.");
    broadcastRoom(roomCode);
    tryAutoFinishVote(room);
  });

  socket.on("new_round", () => {
    if (isRateLimited(socket, "new_round", 600, "new_round")) {
      socket.emit("error_message", "Please wait a moment.");
      return;
    }

    const room = getHostRoom(socket);
    if (!room) return;

    if (room.state !== "ended") {
      socket.emit("error_message", "New round only after round end.");
      return;
    }

    assignRound(room);
  });

  socket.on("abort_round", () => {
    if (isRateLimited(socket, "abort_round", 600, "abort_round")) {
      socket.emit("error_message", "Please wait a moment.");
      return;
    }

    const room = getHostRoom(socket);
    if (!room) return;

    if (room.state !== "round" && room.state !== "vote") {
      socket.emit("error_message", "No round is currently running.");
      return;
    }

    abortRound(room);
  });

  socket.on("leave_room", () => {
    if (isRateLimited(socket, "leave_room", 200, "leave_room")) return;

    const roomCode = socket.data.roomCode;
    if (!roomCode) {
      socket.emit("left_room");
      return;
    }

    socket.leave(roomCode);
    removeParticipantFromRoom(socket, "leave");
    socket.emit("left_room");
  });

  socket.on("disconnect", () => {
    amongRemoveSocket(socket, "disconnect");
    removeParticipantFromRoom(socket, "disconnect");
  });
});

server.on("error", (error) => {
  if (error && error.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use. Stop the running process or start with PORT=3001 npm start`);
    process.exit(1);
  }

  throw error;
});

server.listen(PORT, () => {
  console.log(`Imposter game running on http://localhost:${PORT}`);
});
