const socket = typeof window.io === "function" ? window.io() : null;

const homeView = document.getElementById("amongHome");
const roomView = document.getElementById("amongRoom");
const nameInput = document.getElementById("amongNameInput");
const codeInput = document.getElementById("amongCodeInput");
const createBtn = document.getElementById("amongCreateBtn");
const joinBtn = document.getElementById("amongJoinBtn");
const errorEl = document.getElementById("amongError");
const quickCasualBtn = document.getElementById("amongQuickCasualBtn");
const quickRankedBtn = document.getElementById("amongQuickRankedBtn");
const leaveQueueBtn = document.getElementById("amongLeaveQueueBtn");
const joinPartyBtn = document.getElementById("amongJoinPartyBtn");
const partyInput = document.getElementById("amongPartyInput");
const queueCasualEl = document.getElementById("queueCasual");
const queueRankedEl = document.getElementById("queueRanked");

const backBtn = document.getElementById("amongBackBtn");
const roomCodeEl = document.getElementById("amongRoomCode");
const stateEl = document.getElementById("amongState");
const roleEl = document.getElementById("amongRole");
const meetingEl = document.getElementById("amongMeeting");
const bodyEl = document.getElementById("amongBody");
const partyCodeEl = document.getElementById("amongPartyCode");
const queueModeEl = document.getElementById("amongQueueMode");
const voiceEl = document.getElementById("amongVoice");

const hostControls = document.getElementById("amongHostControls");
const startBtn = document.getElementById("amongStartBtn");

const actionBox = document.getElementById("amongActions");
const taskBtn = document.getElementById("amongTaskBtn");
const meetingBtn = document.getElementById("amongMeetingBtn");
const reportBtn = document.getElementById("amongReportBtn");
const fixSabotageBtn = document.getElementById("amongFixSabotageBtn");

const movementBox = document.getElementById("amongMovement");
const moveTargetsEl = document.getElementById("amongMoveTargets");

const killBox = document.getElementById("amongKillBox");
const killTargets = document.getElementById("amongKillTargets");
const sabotageLightsBtn = document.getElementById("amongSabotageLightsBtn");
const sabotageReactorBtn = document.getElementById("amongSabotageReactorBtn");

const roleActionsBox = document.getElementById("amongRoleActions");
const roleActionTargetsEl = document.getElementById("amongRoleActionTargets");
const hackerScanBtn = document.getElementById("amongHackerScanBtn");
const tricksterBtn = document.getElementById("amongTricksterBtn");

const voteBox = document.getElementById("amongVoteBox");
const voteInfo = document.getElementById("amongVoteInfo");
const voteTargets = document.getElementById("amongVoteTargets");

const playersEl = document.getElementById("amongPlayers");
const logsEl = document.getElementById("amongLogs");
const highlightsEl = document.getElementById("amongHighlights");
const chatListEl = document.getElementById("amongChatList");
const chatInputEl = document.getElementById("amongChatInput");
const chatSendBtn = document.getElementById("amongChatSendBtn");
const voiceStatusEl = document.getElementById("amongVoiceStatus");
const voiceStartBtn = document.getElementById("amongVoiceStartBtn");
const voiceMuteBtn = document.getElementById("amongVoiceMuteBtn");
const voiceLeaveBtn = document.getElementById("amongVoiceLeaveBtn");
const voiceAudioMount = document.getElementById("amongVoiceAudioMount");
const rematchBtn = document.getElementById("amongRematchBtn");

let room = null;
let selfId = null;
let role = null;
let tasks = [];
let voted = false;
let localVoiceStream = null;
let processedVoiceStream = null;
let voiceAudioContext = null;
let micMuted = false;
const voicePeers = new Map();
let lastChatSendAt = 0;

const RTC_CONFIG = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

const CHAT_SEND_COOLDOWN_MS = 400;
const VOICE_AUDIO_CONSTRAINTS = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: false,
    channelCount: 2,
    sampleRate: 48000,
    sampleSize: 16
  },
  video: false
};

const FINGERPRINT_KEY = "among_fingerprint_v1";

function getFingerprint() {
  let value = window.localStorage.getItem(FINGERPRINT_KEY);
  if (value) return value;
  value = `fp_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
  window.localStorage.setItem(FINGERPRINT_KEY, value);
  return value;
}

function showError(message = "") {
  errorEl.textContent = message;
}

function sanitizeName(value) {
  return String(value || "").trim().slice(0, 24);
}

function sanitizeCode(value) {
  return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);
}

function sanitizePartyCode(value) {
  return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

function getStateLabel(state) {
  if (state === "lobby") return "Lobby";
  if (state === "playing") return "Spiel läuft";
  if (state === "meeting") return "Besprechung läuft";
  if (state === "ended") return "Spiel beendet";
  return state;
}

function getRoleLabel(roleValue) {
  if (roleValue === "crewmate") return "Crewmitglied";
  if (roleValue === "imposter") return "Hochstapler";
  if (roleValue === "medic") return "Medic";
  if (roleValue === "hacker") return "Hacker";
  if (roleValue === "trickster") return "Trickster";
  return roleValue;
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
  stopVoice();
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
    btn.textContent = `Ausschalten: ${player.name}`;
    btn.className = "kick-btn";
    btn.addEventListener("click", () => {
      socket.emit("among_kill", { targetId: player.id });
    });
    killTargets.appendChild(btn);
  });
}

function renderMovementTargets() {
  moveTargetsEl.innerHTML = "";
  if (!room || room.state !== "playing") return;
  const me = myPlayer();
  if (!me || !me.alive) return;

  const neighbors = room.map?.nodes?.[me.position] || [];
  neighbors.forEach((node) => {
    const btn = document.createElement("button");
    btn.textContent = `Gehe zu: ${node}`;
    btn.addEventListener("click", () => {
      socket.emit("among_move", { to: node });
    });
    moveTargetsEl.appendChild(btn);
  });
}

function renderRoleActions() {
  roleActionTargetsEl.innerHTML = "";
  hackerScanBtn.classList.add("hidden");
  tricksterBtn.classList.add("hidden");
  if (!room || room.state !== "playing") return;

  if (role === "medic") {
    room.players.filter((player) => player.alive && player.id !== selfId).forEach((player) => {
      const btn = document.createElement("button");
      btn.textContent = `Shield: ${player.name}`;
      btn.addEventListener("click", () => {
        socket.emit("among_medic_shield", { targetId: player.id });
      });
      roleActionTargetsEl.appendChild(btn);
    });
  }

  if (role === "hacker") {
    hackerScanBtn.classList.remove("hidden");
  }

  if (role === "trickster") {
    tricksterBtn.classList.remove("hidden");
  }
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
  skipBtn.textContent = "Überspringen";
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
    const roleSuffix = room.state === "ended" && player.role ? ` • ${getRoleLabel(player.role)}` : "";
    const profile = player.profile ? ` • L${player.profile.level} ELO ${player.profile.elo}` : "";
    li.textContent = `${player.name}${player.id === room.hostId ? " 👑" : ""}${player.id === selfId ? " (Du)" : ""}${player.alive ? "" : " ☠️"} • Aufgaben ${player.tasksDone}/${player.tasksTotal}${roleSuffix}${profile} • @${player.position}`;
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

function renderHighlights() {
  highlightsEl.innerHTML = "";
  if (!room) return;
  (room.highlights || []).slice().reverse().forEach((entry) => {
    const li = document.createElement("li");
    li.textContent = entry.text;
    highlightsEl.appendChild(li);
  });
}

function renderChat() {
  chatListEl.innerHTML = "";
  if (!room) return;
  (room.chat || []).slice().reverse().forEach((entry) => {
    const li = document.createElement("li");
    const time = entry.at ? new Date(entry.at).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) : "--:--";
    li.textContent = `[${time}] ${entry.senderName}: ${entry.text}`;
    chatListEl.appendChild(li);
  });
}

function setVoiceStatus(text) {
  const peers = voicePeers.size;
  voiceStatusEl.textContent = peers > 0 ? `${text} • ${peers} verbunden` : text;
}

function createProcessedVoiceStream(inputStream) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;

  try {
    const context = new AudioCtx({ sampleRate: 48000, latencyHint: "interactive" });
    const source = context.createMediaStreamSource(inputStream);

    const highpass = context.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = 90;
    highpass.Q.value = 0.7;

    const presence = context.createBiquadFilter();
    presence.type = "peaking";
    presence.frequency.value = 2800;
    presence.Q.value = 1.2;
    presence.gain.value = 2.4;

    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -20;
    compressor.knee.value = 25;
    compressor.ratio.value = 3;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.22;

    const destination = context.createMediaStreamDestination();

    source.connect(highpass);
    highpass.connect(presence);
    presence.connect(compressor);
    compressor.connect(destination);

    voiceAudioContext = context;
    return destination.stream;
  } catch {
    return null;
  }
}

function getOutboundVoiceStream() {
  return processedVoiceStream || localVoiceStream;
}

function normalizeVoiceSdp(sdpText) {
  if (typeof sdpText !== "string") return sdpText;
  const opusFmtp = /a=fmtp:(\d+) ([^\r\n]+)/g;
  let normalized = sdpText.replace(opusFmtp, (full, payloadType, params) => {
    const lower = params.toLowerCase();
    if (!lower.includes("minptime") && !lower.includes("useinbandfec") && !lower.includes("opus")) {
      return full;
    }

    const parts = params.split(";").map((entry) => entry.trim()).filter(Boolean);
    const setParam = (key, value) => {
      const index = parts.findIndex((entry) => entry.toLowerCase().startsWith(`${key.toLowerCase()}=`));
      if (index >= 0) {
        parts[index] = `${key}=${value}`;
      } else {
        parts.push(`${key}=${value}`);
      }
    };

    setParam("maxaveragebitrate", "128000");
    setParam("stereo", "1");
    setParam("sprop-stereo", "1");
    setParam("useinbandfec", "1");
    setParam("usedtx", "0");
    setParam("cbr", "1");
    setParam("maxplaybackrate", "48000");
    setParam("sprop-maxcapturerate", "48000");
    setParam("minptime", "10");

    return `a=fmtp:${payloadType} ${parts.join(";")}`;
  });

  if (/a=ptime:\d+/i.test(normalized)) {
    normalized = normalized.replace(/a=ptime:\d+/gi, "a=ptime:20");
  } else {
    normalized += "\r\na=ptime:20";
  }

  return normalized;
}

function tuneAudioSenderParams(peer) {
  const senders = peer.getSenders().filter((sender) => sender.track && sender.track.kind === "audio");
  senders.forEach((sender) => {
    const parameters = sender.getParameters() || {};
    if (!Array.isArray(parameters.encodings) || parameters.encodings.length === 0) {
      parameters.encodings = [{}];
    }
    parameters.encodings[0].maxBitrate = 192000;
    parameters.encodings[0].dtx = false;
    parameters.degradationPreference = "maintain-framerate";
    sender.setParameters(parameters).catch(() => {
      // unsupported in some browsers
    });
  });
}

function cleanupVoicePeer(peerId) {
  const peer = voicePeers.get(peerId);
  if (!peer) return;
  try {
    peer.close();
  } catch {
    // noop
  }
  voicePeers.delete(peerId);
  const audio = document.getElementById(`amongVoiceAudio-${peerId}`);
  if (audio) {
    audio.srcObject = null;
    audio.remove();
  }
}

function updateLocalMicTrack() {
  if (!localVoiceStream) return;
  localVoiceStream.getAudioTracks().forEach((track) => {
    track.enabled = !micMuted;
  });
  voiceMuteBtn.textContent = micMuted ? "Mikro aktivieren" : "Mikro stumm";
}

function ensureVoicePeer(peerId, initiateOffer = false) {
  const outboundStream = getOutboundVoiceStream();
  if (!outboundStream) return null;
  if (peerId === selfId) return null;
  const existing = voicePeers.get(peerId);
  if (existing) return existing;

  const peer = new RTCPeerConnection(RTC_CONFIG);
  voicePeers.set(peerId, peer);

  outboundStream.getTracks().forEach((track) => {
    if (track.kind === "audio") {
      track.contentHint = "speech";
    }
    peer.addTrack(track, outboundStream);
  });

  peer.onicecandidate = (event) => {
    if (!event.candidate) return;
    socket.emit("among_voice_ice", {
      targetId: peerId,
      candidate: event.candidate
    });
  };

  peer.ontrack = (event) => {
    let audio = document.getElementById(`amongVoiceAudio-${peerId}`);
    if (!audio) {
      audio = document.createElement("audio");
      audio.id = `amongVoiceAudio-${peerId}`;
      audio.autoplay = true;
      audio.playsInline = true;
      voiceAudioMount.appendChild(audio);
    }
    audio.srcObject = event.streams[0];
  };

  peer.onconnectionstatechange = () => {
    const state = peer.connectionState;
    if (["failed", "closed", "disconnected"].includes(state)) {
      cleanupVoicePeer(peerId);
    }
  };

  if (initiateOffer) {
    peer.createOffer({ offerToReceiveAudio: true, voiceActivityDetection: true })
      .then((offer) => peer.setLocalDescription(offer))
      .then(() => {
        tuneAudioSenderParams(peer);
        socket.emit("among_voice_offer", {
          targetId: peerId,
          sdp: {
            type: peer.localDescription?.type,
            sdp: normalizeVoiceSdp(peer.localDescription?.sdp)
          }
        });
      })
      .catch(() => {
        cleanupVoicePeer(peerId);
      });
  }

  return peer;
}

function syncVoicePeers() {
  if (!room || !getOutboundVoiceStream() || !selfId) return;
  const targetIds = room.players.map((player) => player.id).filter((id) => id !== selfId);

  Array.from(voicePeers.keys()).forEach((peerId) => {
    if (!targetIds.includes(peerId)) {
      cleanupVoicePeer(peerId);
    }
  });

  targetIds.forEach((peerId) => {
    const shouldInitiate = selfId > peerId;
    ensureVoicePeer(peerId, shouldInitiate);
  });
}

async function startVoice() {
  if (localVoiceStream) {
    setVoiceStatus("Voice aktiv");
    syncVoicePeers();
    return;
  }

  try {
    localVoiceStream = await navigator.mediaDevices.getUserMedia(VOICE_AUDIO_CONSTRAINTS);
    processedVoiceStream = createProcessedVoiceStream(localVoiceStream);
    micMuted = false;
    updateLocalMicTrack();
    setVoiceStatus(processedVoiceStream ? "Voice HQ aktiv" : "Voice aktiv");
    syncVoicePeers();
  } catch {
    setVoiceStatus("Voice Zugriff abgelehnt");
    showError("Mikrofon nicht verfügbar.");
  }
}

function stopVoice() {
  Array.from(voicePeers.keys()).forEach((peerId) => cleanupVoicePeer(peerId));
  if (localVoiceStream) {
    localVoiceStream.getTracks().forEach((track) => track.stop());
    localVoiceStream = null;
  }
  if (processedVoiceStream) {
    processedVoiceStream.getTracks().forEach((track) => track.stop());
    processedVoiceStream = null;
  }
  if (voiceAudioContext) {
    voiceAudioContext.close().catch(() => {
      // noop
    });
    voiceAudioContext = null;
  }
  micMuted = false;
  voiceAudioMount.innerHTML = "";
  setVoiceStatus("Voice aus");
  voiceMuteBtn.textContent = "Mikro stumm";
}

function render() {
  if (!room) return;

  const me = myPlayer();
  const alive = me?.alive;
  const isHost = room.hostId === selfId;

  roomCodeEl.textContent = room.code;
  stateEl.textContent = `Status: ${getStateLabel(room.state)}`;
  meetingEl.textContent = room.meeting ? "Aktiv" : "-";
  bodyEl.textContent = room.deadBody ? `${room.deadBody.name} @ ${room.deadBody.room || "?"}` : "-";
  partyCodeEl.textContent = room.partyCode || "------";
  queueModeEl.textContent = room.queueType || "casual";
  voiceEl.textContent = room.voiceChannel || "-";

  if (room.queueSizes) {
    queueCasualEl.textContent = String(room.queueSizes.casual || 0);
    queueRankedEl.textContent = String(room.queueSizes.ranked || 0);
  }

  hostControls.classList.toggle("hidden", !isHost || room.state !== "lobby");
  actionBox.classList.toggle("hidden", !(room.state === "playing" && alive));
  killBox.classList.toggle("hidden", !(room.state === "playing" && role === "imposter" && alive));
  movementBox.classList.toggle("hidden", !(room.state === "playing" && alive));
  roleActionsBox.classList.toggle("hidden", !(room.state === "playing" && alive && ["medic", "hacker", "trickster"].includes(role)));
  voteBox.classList.toggle("hidden", room.state !== "meeting" || !alive);
  rematchBtn.classList.toggle("hidden", room.state !== "ended");

  taskBtn.disabled = !["crewmate", "medic", "hacker", "trickster"].includes(role) || room.state !== "playing" || !alive;
  meetingBtn.disabled = room.state !== "playing" || !alive;
  reportBtn.disabled = room.state !== "playing" || !alive || !room.deadBody;
  fixSabotageBtn.disabled = room.state !== "playing" || !alive || !room.map?.sabotage;
  sabotageLightsBtn.disabled = room.state !== "playing" || !alive || role !== "imposter";
  sabotageReactorBtn.disabled = room.state !== "playing" || !alive || role !== "imposter";

  voteInfo.textContent = room.meeting ? `${room.meeting.votesCount} Stimmen abgegeben` : "";

  renderPlayers();
  renderLogs();
  renderHighlights();
  renderChat();
  renderKillTargets();
  renderMovementTargets();
  renderRoleActions();
  renderVoteTargets();

  if (localVoiceStream) {
    syncVoicePeers();
  }
}

createBtn.addEventListener("click", () => {
  if (!socket) return;
  const name = sanitizeName(nameInput.value);
  if (!name) {
    showError("Bitte Namen eingeben.");
    return;
  }

  showError("");
  socket.emit("among_create_room", { name, fingerprint: getFingerprint(), queueType: "casual" });
});

quickCasualBtn.addEventListener("click", () => {
  if (!socket) return;
  const name = sanitizeName(nameInput.value);
  if (!name) {
    showError("Bitte Namen eingeben.");
    return;
  }
  socket.emit("among_quick_play", { name, fingerprint: getFingerprint(), queueType: "casual" });
  showError("Quick-Play Casual gesucht...");
});

quickRankedBtn.addEventListener("click", () => {
  if (!socket) return;
  const name = sanitizeName(nameInput.value);
  if (!name) {
    showError("Bitte Namen eingeben.");
    return;
  }
  socket.emit("among_quick_play", { name, fingerprint: getFingerprint(), queueType: "ranked" });
  showError("Quick-Play Ranked gesucht...");
});

leaveQueueBtn.addEventListener("click", () => {
  if (!socket) return;
  socket.emit("among_leave_queue");
  showError("Queue verlassen.");
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
  socket.emit("among_join_room", { name, code, fingerprint: getFingerprint() });
});

joinPartyBtn.addEventListener("click", () => {
  if (!socket) return;
  const name = sanitizeName(nameInput.value);
  const partyCode = sanitizePartyCode(partyInput.value);
  if (!name || !partyCode) {
    showError("Name + Party-Code eingeben.");
    return;
  }
  socket.emit("among_join_party", { name, fingerprint: getFingerprint(), partyCode });
});

codeInput.addEventListener("input", () => {
  codeInput.value = sanitizeCode(codeInput.value);
});

partyInput.addEventListener("input", () => {
  partyInput.value = sanitizePartyCode(partyInput.value);
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

fixSabotageBtn.addEventListener("click", () => {
  if (!socket) return;
  socket.emit("among_fix_sabotage");
});

sabotageLightsBtn.addEventListener("click", () => {
  if (!socket) return;
  socket.emit("among_start_sabotage", { type: "lights" });
});

sabotageReactorBtn.addEventListener("click", () => {
  if (!socket) return;
  socket.emit("among_start_sabotage", { type: "reactor" });
});

hackerScanBtn.addEventListener("click", () => {
  if (!socket) return;
  socket.emit("among_hacker_scan");
});

tricksterBtn.addEventListener("click", () => {
  if (!socket) return;
  socket.emit("among_trickster_decoy");
});

rematchBtn.addEventListener("click", () => {
  if (!socket) return;
  socket.emit("among_rematch_ready");
  showError("Rematch bereit gesendet.");
});

chatSendBtn.addEventListener("click", () => {
  if (!socket || !room) return;
  const now = Date.now();
  if (now - lastChatSendAt < CHAT_SEND_COOLDOWN_MS) {
    showError("Chat-Cooldown aktiv.");
    return;
  }
  const text = String(chatInputEl.value || "").trim();
  if (!text) return;
  lastChatSendAt = now;
  socket.emit("among_chat_send", { text });
  chatInputEl.value = "";
});

chatInputEl.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  chatSendBtn.click();
});

voiceStartBtn.addEventListener("click", () => {
  startVoice();
});

voiceMuteBtn.addEventListener("click", () => {
  micMuted = !micMuted;
  updateLocalMicTrack();
});

voiceLeaveBtn.addEventListener("click", () => {
  stopVoice();
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
  socket.on("among_queue_update", (payload) => {
    queueCasualEl.textContent = String(payload?.casual || 0);
    queueRankedEl.textContent = String(payload?.ranked || 0);
  });

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

  socket.on("among_chat_message", (entry) => {
    if (!room) return;
    if (!Array.isArray(room.chat)) room.chat = [];
    room.chat.push(entry);
    if (room.chat.length > 80) {
      room.chat.shift();
    }
    renderChat();
  });

  socket.on("among_voice_offer", async ({ fromId, sdp }) => {
    if (!localVoiceStream) return;
    const peer = ensureVoicePeer(fromId, false);
    if (!peer) return;
    try {
      await peer.setRemoteDescription(new RTCSessionDescription({ type: sdp?.type, sdp: normalizeVoiceSdp(sdp?.sdp) }));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      tuneAudioSenderParams(peer);
      socket.emit("among_voice_answer", {
        targetId: fromId,
        sdp: {
          type: peer.localDescription?.type,
          sdp: normalizeVoiceSdp(peer.localDescription?.sdp)
        }
      });
    } catch {
      cleanupVoicePeer(fromId);
    }
  });

  socket.on("among_voice_answer", async ({ fromId, sdp }) => {
    const peer = voicePeers.get(fromId);
    if (!peer) return;
    try {
      await peer.setRemoteDescription(new RTCSessionDescription({ type: sdp?.type, sdp: normalizeVoiceSdp(sdp?.sdp) }));
    } catch {
      cleanupVoicePeer(fromId);
    }
  });

  socket.on("among_voice_ice", async ({ fromId, candidate }) => {
    const peer = voicePeers.get(fromId);
    if (!peer) return;
    try {
      await peer.addIceCandidate(new RTCIceCandidate(candidate));
    } catch {
      // ignore invalid candidates
    }
  });

  socket.on("among_role", (payload) => {
    role = payload.role;
    tasks = payload.tasks || [];
    roleEl.classList.remove("hidden");
    roleEl.textContent = `Rolle: ${getRoleLabel(role)} • Aufgaben: ${tasks.join(", ")} • Position: ${payload.position || "cafeteria"}`;
  });

  socket.on("among_game_started", () => {
    voted = false;
    showError("");
  });

  socket.on("among_meeting_started", ({ reason, reporterName }) => {
    voted = false;
    const reasonLabel = reason === "body" ? "Leiche gemeldet" : "Notfall";
    showError(`Besprechung (${reasonLabel}) wurde von ${reporterName} gestartet`);
  });

  socket.on("among_meeting_result", ({ ejected, tie }) => {
    if (tie || !ejected) {
      showError("Besprechungs-Ergebnis: Niemand wurde rausgewählt.");
    } else {
      showError(`Besprechungs-Ergebnis: ${ejected.name} (${getRoleLabel(ejected.role)}) wurde rausgewählt.`);
    }
  });

  socket.on("among_game_over", ({ winner }) => {
    showError(winner === "crew" ? "Crew gewinnt!" : "Hochstapler gewinnt!");
  });

  socket.on("among_hack_result", ({ suspects }) => {
    showError(`Hacker Scan: Verdächtige -> ${(suspects || []).join(", ") || "keine"}`);
  });

  socket.on("among_error", (message) => {
    showError(message);
  });

  socket.on("among_left", () => {
    stopVoice();
    resetRoom();
  });

  socket.on("among_closed", ({ message }) => {
    stopVoice();
    showError(message || "Lobby geschlossen");
    resetRoom();
  });
}
