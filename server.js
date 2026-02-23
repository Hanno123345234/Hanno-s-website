const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const ADMIN_OWNER_KEY = String(process.env.ADMIN_OWNER_KEY || process.env.ADMIN_KEY || "Anna").trim();
const ADMIN_EDITOR_KEY = String(process.env.ADMIN_EDITOR_KEY || "hanno123").trim();
const ADMIN_BOOTSTRAP_CODES = String(process.env.ADMIN_ACCESS_CODES || "").trim();

app.use((req, res, next) => {
  if (req.path === "/" || req.path.endsWith(".html")) {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
  }
  next();
});

app.use(express.static("public"));
app.use(express.json());

function randomAdminToken() {
  return `${Math.random().toString(36).slice(2, 8)}${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeAdminRole(role) {
  const normalized = String(role || "viewer").trim().toLowerCase();
  if (["viewer", "editor", "owner"].includes(normalized)) return normalized;
  return "viewer";
}

function parseAdminBootstrapCodes() {
  const map = new Map();
  if (!ADMIN_BOOTSTRAP_CODES) return map;

  ADMIN_BOOTSTRAP_CODES
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .forEach((entry) => {
      const [roleRaw, tokenRaw] = entry.split(":");
      const token = String(tokenRaw || "").trim();
      if (!token) return;
      map.set(token, {
        role: normalizeAdminRole(roleRaw),
        label: "env",
        createdAt: nowIso(),
        expiresAt: null,
        createdBy: "env"
      });
    });

  return map;
}

function resolveAdminAuth(req) {
  const key = String(req.get("x-admin-key") || req.query.access || "").trim();
  if (!key) {
    return { ok: false, status: 401, message: "Missing admin key." };
  }

  if (ADMIN_OWNER_KEY && key === ADMIN_OWNER_KEY) {
    return { ok: true, role: "owner", source: "owner-key" };
  }

  if (ADMIN_EDITOR_KEY && key === ADMIN_EDITOR_KEY) {
    return { ok: true, role: "editor", source: "editor-key" };
  }

  const tokenEntry = adminAccessTokens.get(key);
  if (!tokenEntry) {
    return { ok: false, status: 403, message: "Invalid admin key." };
  }

  if (tokenEntry.expiresAt && tokenEntry.expiresAt <= Date.now()) {
    adminAccessTokens.delete(key);
    return { ok: false, status: 403, message: "Admin key expired." };
  }

  return {
    ok: true,
    role: tokenEntry.role,
    source: tokenEntry.label || "token",
    tokenKey: key
  };
}

function hasAdminRole(userRole, neededRole) {
  const rank = {
    viewer: 1,
    editor: 2,
    owner: 3
  };
  return (rank[userRole] || 0) >= (rank[neededRole] || 0);
}

function requireAdminRole(req, res, neededRole = "viewer") {
  const auth = resolveAdminAuth(req);
  if (!auth.ok) {
    res.status(auth.status || 403).json({ error: auth.message || "Unauthorized" });
    return null;
  }
  if (!hasAdminRole(auth.role, neededRole)) {
    res.status(403).json({ error: `Requires ${neededRole} access.` });
    return null;
  }
  return auth;
}

function adminPublicMemberView() {
  const onlineSet = new Set(amongOnlineByFingerprint.keys());
  return [...amongProfiles.entries()]
    .map(([fingerprint, profile]) => ({
      fingerprint,
      name: profile.displayName,
      level: profile.level,
      elo: profile.elo,
      risk: profile.risk || 0,
      reports: profile.reports || 0,
      gamesPlayed: profile.gamesPlayed || 0,
      wins: profile.wins || 0,
      winRate: profile.gamesPlayed > 0 ? Number(((profile.wins / profile.gamesPlayed) * 100).toFixed(1)) : 0,
      firstSeenAt: profile.firstSeenAt || null,
      lastSeenAt: profile.lastSeenAt || null,
      lastRoomCode: profile.lastRoomCode || null,
      mutedUntil: profile.adminMutedUntil || null,
      mutedReason: profile.adminMutedReason || null,
      bannedUntil: getAmongSoftBanEntry(fingerprint)?.until || null,
      bannedPermanent: !!getAmongSoftBanEntry(fingerprint)?.permanent,
      bannedReason: getAmongSoftBanEntry(fingerprint)?.reason || null,
      online: onlineSet.has(fingerprint)
    }))
    .sort((first, second) => {
      const firstTime = first.lastSeenAt ? new Date(first.lastSeenAt).getTime() : 0;
      const secondTime = second.lastSeenAt ? new Date(second.lastSeenAt).getTime() : 0;
      return secondTime - firstTime;
    })
    .slice(0, 400);
}

function pushLimited(list, entry, maxSize = 800) {
  list.push(entry);
  if (list.length > maxSize) {
    list.splice(0, list.length - maxSize);
  }
}

function getAmongSoftBanEntry(fingerprint) {
  if (!fingerprint) return null;
  const entry = amongSoftBans.get(fingerprint);
  if (!entry) return null;
  if (!entry.permanent && entry.until && entry.until <= Date.now()) {
    amongSoftBans.delete(fingerprint);
    return null;
  }
  return entry;
}

function logModerationAction(action, payload = {}) {
  pushLimited(
    amongModerationLogs,
    {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      at: nowIso(),
      action,
      ...payload
    },
    1200
  );
}

function logJoinAction(action, payload = {}) {
  pushLimited(
    amongJoinLogs,
    {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      at: nowIso(),
      action,
      ...payload
    },
    1500
  );
}

function emitAmongAdminStatus(socket, fingerprint) {
  const fp = normalizeFingerprint(fingerprint || socket?.data?.amongFingerprint);
  const ban = getAmongSoftBanEntry(fp);
  const mute = getAmongAdminMute(fp);
  io.to(socket.id).emit("among_admin_status", {
    fingerprint: fp,
    banned: !!ban,
    banUntil: ban?.until || null,
    banReason: ban?.reason || null,
    banPermanent: !!ban?.permanent,
    muted: !!mute,
    muteUntil: mute?.until || null,
    muteReason: mute?.reason || null
  });
}

function blockIfBanned(socket, fingerprintOverride = null) {
  const fp = normalizeFingerprint(fingerprintOverride || socket?.data?.amongFingerprint);
  const ban = getAmongSoftBanEntry(fp);
  if (!ban) return false;

  emitAmongAdminStatus(socket, fp);
  const untilText = ban.permanent || !ban.until
    ? "permanent"
    : new Date(ban.until).toLocaleString("de-DE");
  io.to(socket.id).emit("among_error", `Du bist gebannt für ${untilText}. Grund: ${ban.reason || "admin_ban"}`);
  return true;
}

app.get("/api/stats", (req, res) => {
  const profiles = [...amongProfiles.values()];
  const roleStats = {
    crewWinRate: 0,
    imposterWinRate: 0
  };
  const totalRoleWins = amongAnalytics.roleWins.crew + amongAnalytics.roleWins.imposter;
  if (totalRoleWins > 0) {
    roleStats.crewWinRate = Number(((amongAnalytics.roleWins.crew / totalRoleWins) * 100).toFixed(1));
    roleStats.imposterWinRate = Number(((amongAnalytics.roleWins.imposter / totalRoleWins) * 100).toFixed(1));
  }

  res.json({
    roleStats,
    killHeatmap: amongAnalytics.killHeatmap,
    eloTop: profiles
      .map((profile) => ({ name: profile.displayName, elo: profile.elo, level: profile.level }))
      .sort((first, second) => second.elo - first.elo)
      .slice(0, 20),
    eloHistory: profiles
      .filter((profile) => Array.isArray(profile.eloHistory) && profile.eloHistory.length > 0)
      .slice(0, 30)
      .map((profile) => ({ name: profile.displayName, history: profile.eloHistory.slice(-12) })),
    highlights: amongAnalytics.highlights.slice(-50)
  });
});

app.get("/api/moderation/status", (req, res) => {
  const fingerprint = normalizeFingerprint(req.query?.fingerprint);
  if (!fingerprint) {
    res.status(400).json({ error: "fingerprint is required." });
    return;
  }

  const ban = getAmongSoftBanEntry(fingerprint);
  const mute = getAmongAdminMute(fingerprint);

  res.json({
    ok: true,
    fingerprint,
    banned: !!ban,
    banUntil: ban?.until || null,
    banReason: ban?.reason || null,
    banPermanent: !!ban?.permanent,
    muted: !!mute,
    muteUntil: mute?.until || null,
    muteReason: mute?.reason || null
  });
});

app.post("/api/moderation/ping", (req, res) => {
  const fingerprint = normalizeFingerprint(req.body?.fingerprint);
  const name = validName(req.body?.name) || "Player";
  const mode = String(req.body?.mode || "unknown").trim().slice(0, 30) || "unknown";

  if (!fingerprint) {
    res.status(400).json({ error: "fingerprint is required." });
    return;
  }

  touchAmongProfile(fingerprint, name, null);
  logJoinAction("open_site", {
    fingerprint,
    name,
    mode,
    ip: req.ip || null
  });

  const ban = getAmongSoftBanEntry(fingerprint);
  const mute = getAmongAdminMute(fingerprint);
  res.json({
    ok: true,
    status: {
      fingerprint,
      banned: !!ban,
      banUntil: ban?.until || null,
      banReason: ban?.reason || null,
      banPermanent: !!ban?.permanent,
      muted: !!mute,
      muteUntil: mute?.until || null,
      muteReason: mute?.reason || null
    }
  });
});

app.get("/api/admin", (req, res) => {
  const auth = requireAdminRole(req, res, "viewer");
  if (!auth) return;

  const bans = [...amongSoftBans.entries()].map(([fingerprint, entry]) => ({
    fingerprint,
    until: entry.until,
    reason: entry.reason,
    permanent: !!entry.permanent
  }));

  const mutes = [...amongAdminMutes.entries()].map(([fingerprint, entry]) => ({
    fingerprint,
    until: entry.until,
    reason: entry.reason
  }));

  const risk = [...amongProfiles.values()]
    .map((profile) => ({
      name: profile.displayName,
      risk: profile.risk,
      lastFlags: (profile.riskHistory || []).slice(-5)
    }))
    .sort((first, second) => second.risk - first.risk)
    .slice(0, 30);

  const reports = [...amongProfiles.values()]
    .map((profile) => ({ name: profile.displayName, reports: profile.reports || 0 }))
    .filter((entry) => entry.reports > 0)
    .sort((first, second) => second.reports - first.reports)
    .slice(0, 30);

  res.json({
    access: {
      role: auth.role,
      source: auth.source,
      canEdit: hasAdminRole(auth.role, "editor"),
      canGrant: hasAdminRole(auth.role, "owner")
    },
    summary: {
      registeredUsers: amongProfiles.size,
      activeRooms: amongRooms.size,
      activeQueue: amongQueue.casual.length + amongQueue.ranked.length,
      activeOnlineFingerprints: amongOnlineByFingerprint.size,
      totalMatchesTracked: amongMatchHistory.length,
      moderationActions: amongModerationLogs.length,
      joinLogCount: amongJoinLogs.length
    },
    members: adminPublicMemberView(),
    recentMatches: amongMatchHistory.slice(-120).reverse(),
    bans,
    mutes,
    risk,
    reports
  });
});

app.get("/api/admin/join-logs", (req, res) => {
  const auth = requireAdminRole(req, res, "viewer");
  if (!auth) return;
  res.json({
    ok: true,
    logs: amongJoinLogs.slice(-400).reverse()
  });
});

app.get("/api/admin/moderation-logs", (req, res) => {
  const auth = requireAdminRole(req, res, "viewer");
  if (!auth) return;
  res.json({
    ok: true,
    logs: amongModerationLogs.slice(-500).reverse()
  });
});

app.post("/api/admin/ban", (req, res) => {
  const auth = requireAdminRole(req, res, "editor");
  if (!auth) return;

  const fingerprint = normalizeFingerprint(req.body?.fingerprint);
  const minutesRaw = Number(req.body?.minutes);
  const permanent = req.body?.permanent === true || !Number.isFinite(minutesRaw);
  const minutes = permanent ? null : Math.max(1, Math.min(60 * 24 * 30, Math.round(minutesRaw)));
  const reason = String(req.body?.reason || "admin_ban").trim().slice(0, 140) || "admin_ban";

  if (!fingerprint) {
    res.status(400).json({ error: "fingerprint is required." });
    return;
  }

  amongSoftBans.set(fingerprint, {
    until: permanent ? null : Date.now() + minutes * 60 * 1000,
    reason,
    permanent
  });

  logModerationAction("ban", {
    fingerprint,
    reason,
    until: permanent ? null : new Date(Date.now() + minutes * 60 * 1000).toISOString(),
    permanent,
    by: auth.source || "admin"
  });

  const onlineSockets = amongOnlineByFingerprint.get(fingerprint);
  if (onlineSockets) {
    [...onlineSockets].forEach((socketId) => {
      const liveSocket = io.sockets.sockets.get(socketId);
      if (!liveSocket) return;
      emitAmongAdminStatus(liveSocket, fingerprint);
      const roomCode = liveSocket.data.amongRoomCode;
      if (!roomCode) return;
      liveSocket.leave(roomCode);
      amongRemoveSocket(liveSocket, "admin-ban");
    });
  }

  res.json({ ok: true, fingerprint, minutes, reason, permanent });
});

app.post("/api/admin/unban", (req, res) => {
  const auth = requireAdminRole(req, res, "editor");
  if (!auth) return;

  const fingerprint = normalizeFingerprint(req.body?.fingerprint);
  if (!fingerprint) {
    res.status(400).json({ error: "fingerprint is required." });
    return;
  }

  amongSoftBans.delete(fingerprint);
  logModerationAction("unban", {
    fingerprint,
    by: auth.source || "admin"
  });
  const onlineSockets = amongOnlineByFingerprint.get(fingerprint);
  if (onlineSockets) {
    [...onlineSockets].forEach((socketId) => {
      const liveSocket = io.sockets.sockets.get(socketId);
      if (!liveSocket) return;
      emitAmongAdminStatus(liveSocket, fingerprint);
    });
  }
  res.json({ ok: true, fingerprint });
});

app.post("/api/admin/mute", (req, res) => {
  const auth = requireAdminRole(req, res, "editor");
  if (!auth) return;

  const fingerprint = normalizeFingerprint(req.body?.fingerprint);
  const minutesRaw = Number(req.body?.minutes);
  const minutes = Number.isFinite(minutesRaw) ? Math.max(1, Math.min(60 * 24 * 30, Math.round(minutesRaw))) : 30;
  const reason = String(req.body?.reason || "admin_mute").trim().slice(0, 140) || "admin_mute";

  if (!fingerprint) {
    res.status(400).json({ error: "fingerprint is required." });
    return;
  }

  const until = Date.now() + minutes * 60 * 1000;
  amongAdminMutes.set(fingerprint, {
    until,
    reason
  });

  const profile = ensureAmongProfile(fingerprint, amongProfiles.get(fingerprint)?.displayName || "Player");
  profile.adminMutedUntil = new Date(until).toISOString();
  profile.adminMutedReason = reason;

  logModerationAction("mute", {
    fingerprint,
    reason,
    until: new Date(until).toISOString(),
    by: auth.source || "admin"
  });

  const onlineSockets = amongOnlineByFingerprint.get(fingerprint);
  if (onlineSockets) {
    [...onlineSockets].forEach((socketId) => {
      const liveSocket = io.sockets.sockets.get(socketId);
      if (!liveSocket) return;
      emitAmongAdminStatus(liveSocket, fingerprint);
    });
  }

  res.json({ ok: true, fingerprint, minutes, reason });
});

app.post("/api/admin/unmute", (req, res) => {
  const auth = requireAdminRole(req, res, "editor");
  if (!auth) return;

  const fingerprint = normalizeFingerprint(req.body?.fingerprint);
  if (!fingerprint) {
    res.status(400).json({ error: "fingerprint is required." });
    return;
  }

  amongAdminMutes.delete(fingerprint);
  const profile = amongProfiles.get(fingerprint);
  if (profile) {
    profile.adminMutedUntil = null;
    profile.adminMutedReason = null;
  }

  logModerationAction("unmute", {
    fingerprint,
    by: auth.source || "admin"
  });

  const onlineSockets = amongOnlineByFingerprint.get(fingerprint);
  if (onlineSockets) {
    [...onlineSockets].forEach((socketId) => {
      const liveSocket = io.sockets.sockets.get(socketId);
      if (!liveSocket) return;
      emitAmongAdminStatus(liveSocket, fingerprint);
    });
  }

  res.json({ ok: true, fingerprint });
});

app.post("/api/admin/access/grant", (req, res) => {
  const auth = requireAdminRole(req, res, "owner");
  if (!auth) return;

  const role = normalizeAdminRole(req.body?.role);
  const label = String(req.body?.label || "team-member").trim().slice(0, 40) || "team-member";
  const hoursRaw = Number(req.body?.expiresHours);
  const expiresHours = Number.isFinite(hoursRaw) ? Math.max(1, Math.min(24 * 365, Math.round(hoursRaw))) : 72;
  const token = randomAdminToken();

  adminAccessTokens.set(token, {
    role: role === "owner" ? "editor" : role,
    label,
    createdAt: nowIso(),
    expiresAt: Date.now() + expiresHours * 60 * 60 * 1000,
    createdBy: auth.source || "owner"
  });

  res.json({
    ok: true,
    accessCode: token,
    role: role === "owner" ? "editor" : role,
    label,
    expiresHours
  });
});

app.get("/api/admin/access", (req, res) => {
  const auth = requireAdminRole(req, res, "owner");
  if (!auth) return;

  const entries = [...adminAccessTokens.entries()].map(([token, entry]) => ({
    tokenPreview: `${token.slice(0, 4)}••••${token.slice(-2)}`,
    role: entry.role,
    label: entry.label,
    createdAt: entry.createdAt,
    expiresAt: entry.expiresAt ? new Date(entry.expiresAt).toISOString() : null,
    createdBy: entry.createdBy
  }));

  res.json({
    ownerConfigured: !!ADMIN_OWNER_KEY,
    entries: entries.sort((first, second) => {
      const firstTime = first.expiresAt ? new Date(first.expiresAt).getTime() : Number.MAX_SAFE_INTEGER;
      const secondTime = second.expiresAt ? new Date(second.expiresAt).getTime() : Number.MAX_SAFE_INTEGER;
      return firstTime - secondTime;
    })
  });
});

const rooms = new Map();
const amongRooms = new Map();
const amongQueue = {
  casual: [],
  ranked: []
};
const amongProfiles = new Map();
const amongSoftBans = new Map();
const amongAdminMutes = new Map();
const amongMatchHistory = [];
const amongJoinLogs = [];
const amongModerationLogs = [];
const sharedPromptPacks = new Map();
const amongOnlineByFingerprint = new Map();
const adminAccessTokens = parseAdminBootstrapCodes();
const amongAnalytics = {
  roleWins: {
    crew: 0,
    imposter: 0
  },
  killHeatmap: {
    cafeteria: 0,
    admin: 0,
    medbay: 0,
    electrical: 0,
    security: 0,
    reactor: 0,
    navigation: 0
  },
  highlights: []
};
const CONTENT_FILTERS = ["family", "normal", "spicy"];
const FILTER_PROMPT_MAP = {
  family: "soft",
  normal: "spicy",
  spicy: "chaos"
};

const PROMPT_SETS = {
  soft: {
    wahrheit: [
      "Was ist deine beste Gewohnheit?",
      "Was war dein lustigster Moment in der Schule?",
      "Welche App benutzt du am meisten?",
      "Welche Kleinigkeit macht dich sofort glücklich?",
      "Mit wem würdest du am ehesten einen Roadtrip machen?",
      "Welche Serie könntest du immer wieder schauen?"
    ],
    pflicht: [
      "Imitiere 10 Sekunden lang einen Nachrichtensprecher.",
      "Sprich 15 Sekunden wie ein Roboter.",
      "Gib der Gruppe 3 ehrliche Komplimente.",
      "Mach 5 Kniebeugen und zähle laut.",
      "Tu 8 Sekunden lang so, als wärst du ein Tier.",
      "Erfinde einen Werbespruch für Mineralwasser."
    ],
    fakeWahrheit: [
      "Was ist dein Lieblingsessen?",
      "Welche Jahreszeit magst du am liebsten?",
      "Nenne dein Lieblingsgetränk.",
      "Welche Farbe magst du am meisten?"
    ],
    fakePflicht: [
      "Nenne drei Früchte.",
      "Zähle langsam bis 10.",
      "Nenne drei Länder in Europa.",
      "Klatsche zweimal in die Hände."
    ]
  },
  spicy: {
    wahrheit: [
      "Wer hat in dieser Runde die beste Ausstrahlung und warum?",
      "Was war dein peinlichster Chat-Moment?",
      "Wer war dein letzter kleiner Crush?",
      "Welche Red Flag ignorierst du manchmal trotzdem?",
      "Was war dein schlimmster Flirt-Fail?",
      "Wann warst du zuletzt richtig eifersüchtig?"
    ],
    pflicht: [
      "Mach 15 Sekunden lang deinen besten Flirt-Blick in die Kamera.",
      "Mach einen 10-Sekunden-Catwalk durch den Raum.",
      "Rede 20 Sekunden wie ein Dating-Coach.",
      "Sag \"Ich bin total unauffällig\" in 5 Emotionen.",
      "Erfinde einen cringe Anmachspruch und sag ihn ganz ernst.",
      "Mach 8 Sekunden Werbung für dich als das \"Traumdate\"."
    ],
    fakeWahrheit: [
      "Was ist dein Lieblingsessen?",
      "Welche Jahreszeit magst du am liebsten?",
      "Nenne dein Lieblingsgetränk.",
      "Was ist dein Lieblingsfilm?"
    ],
    fakePflicht: [
      "Nenne drei Früchte.",
      "Zähle langsam bis 10.",
      "Sag den aktuellen Monat laut.",
      "Nenne drei Farben."
    ]
  },
  chaos: {
    wahrheit: [
      "Welche Nachricht würdest du sofort löschen, wenn jemand dein Handy nimmt?",
      "Was war dein peinlichster Flirt-Moment überhaupt?",
      "Welche Red Flag würdest du nie öffentlich zugeben?",
      "Wer hier würde am ehesten heimlich zwei Chats gleichzeitig führen?",
      "Wen hier würdest du nachts anrufen, wenn du gestresst bist?",
      "Was war dein schlimmster \"Ich hab zu viel geredet\"-Moment?"
    ],
    pflicht: [
      "Rede 20 Sekunden mit einer extrem dramatischen Soap-Opera-Stimme.",
      "Mach ein \"cringe aber selbstbewusst\"-Selfie und zeig es kurz.",
      "Halte 10 Sekunden eine Fake-Motivationsrede an die Gruppe.",
      "Gib 3 ultra-überdramatische Tipps für ein erstes Date.",
      "Spiele 10 Sekunden lang deinen inneren Bösewicht.",
      "Sag deinen Namen rückwärts wie ein Zauberspruch."
    ],
    fakeWahrheit: [
      "Was ist deine Lieblingsfrucht?",
      "Welche Farbe magst du?",
      "Nenne deinen Lieblingsfilm.",
      "Was ist dein Lieblingsgetränk?"
    ],
    fakePflicht: [
      "Nenne drei Tiere.",
      "Zähle bis 8.",
      "Nenne drei Städte.",
      "Klatsche einmal."
    ]
  }
};

const ROUND_EVENTS = [
  {
    id: "speed_round",
    title: "Speed Round",
    description: "Do it fast: the action phase is shortened.",
    roundSeconds: 30
  },
  {
    id: "speed_vote",
    title: "Hot Vote",
    description: "Voting is shorter this round.",
    voteSeconds: 18
  },
  {
    id: "fog_vote",
    title: "Fog Vote",
    description: "Vote count stays hidden until voting ends.",
    hideVoteProgress: true
  },
  {
    id: "spotlight",
    title: "Spotlight",
    description: "One random player gets bonus XP if they survive the round.",
    spotlightBonusXp: 15
  }
];

const AMONG_DAILY_MISSIONS = [
  { id: "play_rounds", target: 3, xp: 60, title: "Daily Grinder" },
  { id: "complete_tasks", target: 8, xp: 70, title: "Task Machine" },
  { id: "meetings", target: 2, xp: 45, title: "Town Crier" },
  { id: "votes", target: 5, xp: 50, title: "Sharp Voter" }
];

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

const quizRooms = new Map();

const QUIZ_DUEL_QUESTIONS = [
  { q: "Wie viele Minuten sind 2,5 Stunden?", a: ["120", "150", "180", "210"], c: 1 },
  { q: "Was ist die Lösung von 3(x - 2) = 15?", a: ["x = 3", "x = 5", "x = 7", "x = 9"], c: 2 },
  { q: "Welche Zahl ist eine Primzahl?", a: ["21", "29", "33", "35"], c: 1 },
  { q: "Wie heißt die Hauptstadt von Kanada?", a: ["Toronto", "Vancouver", "Ottawa", "Montreal"], c: 2 },
  { q: "In welchem Jahr begann der Erste Weltkrieg?", a: ["1912", "1914", "1918", "1939"], c: 1 },
  { q: "Welche Einheit hat elektrische Spannung?", a: ["Watt", "Volt", "Ohm", "Newton"], c: 1 },
  { q: "Welches Gas entsteht bei der Photosynthese als Produkt?", a: ["Sauerstoff", "Stickstoff", "Kohlenstoffdioxid", "Wasserstoff"], c: 0 },
  { q: "Welche Aussage ist richtig?", a: ["Die Erde ist der Sonne näher als die Venus.", "Der Mond leuchtet selbst.", "Die Erde rotiert in ca. 24 Stunden einmal.", "Jupiter ist kleiner als die Erde."], c: 2 },
  { q: "Wie nennt man eine Zahl, die nur durch 1 und sich selbst teilbar ist?", a: ["gerade Zahl", "Primzahl", "Quadratzahl", "Bruch"], c: 1 },
  { q: "Welche der folgenden Formen hat genau eine Symmetrieachse?", a: ["gleichseitiges Dreieck", "gleichschenkliges Dreieck", "Quadrat", "Kreis"], c: 1 },
  { q: "Was ist 15% von 200?", a: ["15", "20", "30", "45"], c: 2 },
  { q: "Wie viele Seiten hat ein regelmäßiges Sechseck?", a: ["5", "6", "7", "8"], c: 1 },
  { q: "Welche Aussage beschreibt einen Akkusativ?", a: ["2. Fall", "3. Fall", "4. Fall", "5. Fall"], c: 2 },
  { q: "Wer schrieb 'Faust'?", a: ["Goethe", "Schiller", "Kafka", "Brecht"], c: 0 },
  { q: "Welche Stadt liegt an der Spree?", a: ["Hamburg", "Berlin", "Köln", "Dresden"], c: 1 },
  { q: "Welche Zahl ist eine Quadratzahl?", a: ["18", "20", "25", "27"], c: 2 },
  { q: "Welche Formel ist richtig?", a: ["Fläche Rechteck = a + b", "Umfang Kreis = 2πr", "Dichte = Masse · Volumen", "Kraft = Masse / Beschleunigung"], c: 1 },
  { q: "Was ist die Hauptstadt von Australien?", a: ["Sydney", "Canberra", "Melbourne", "Perth"], c: 1 },
  { q: "Was ist eine Metapher?", a: ["wörtliche Beschreibung", "Vergleich ohne 'wie'", "Reimform", "Aufzählung"], c: 1 },
  { q: "Welcher Kontinent hat die meisten Länder?", a: ["Europa", "Afrika", "Asien", "Südamerika"], c: 1 },
  { q: "Was ist die Lösung von 2^5?", a: ["16", "24", "32", "64"], c: 2 },
  { q: "Welche ist eine chemische Formel für Wasser?", a: ["CO2", "H2O", "O2", "NaCl"], c: 1 },
  { q: "Welche Aussage zur Demokratie passt am besten?", a: ["Eine Person entscheidet alles.", "Wahlen bestimmen Vertreter.", "Nur Könige bestimmen Gesetze.", "Es gibt keine Regeln."], c: 1 },
  { q: "Welche Zahl ist am nächsten an 1/3?", a: ["0,25", "0,33", "0,5", "0,75"], c: 1 },
  { q: "Was bedeutet 'Dreiviertel' als Dezimalzahl?", a: ["0,25", "0,5", "0,75", "1,25"], c: 2 },
  { q: "Welche Aussage ist richtig?", a: ["Ein Quadrat ist immer auch ein Rechteck.", "Ein Rechteck ist immer ein Quadrat.", "Ein Dreieck hat vier Seiten.", "Ein Kreis hat Ecken."], c: 0 },
  { q: "Welche Ebene trennt Nord- und Südhalbkugel?", a: ["Nullmeridian", "Äquator", "Wendekreis", "Polarkreis"], c: 1 },
  { q: "Wie heißt die Hauptstadt von Italien?", a: ["Mailand", "Rom", "Neapel", "Florenz"], c: 1 },
  { q: "Welche Größe misst man in Newton (N)?", a: ["Druck", "Energie", "Kraft", "Leistung"], c: 2 },
  { q: "Was passiert bei einer Oxidation?", a: ["Elektronen werden aufgenommen", "Elektronen werden abgegeben", "Atome verschwinden", "Wasser wird zu Eis"], c: 1 },
  { q: "Welche Aussage zu Klimazonen ist richtig?", a: ["Die Tropen liegen an den Polen.", "Die gemäßigte Zone liegt zwischen Tropen und Polarzone.", "Es gibt nur eine Klimazone.", "In der Polarzone ist es immer warm."], c: 1 },
  { q: "Was ist die Summe der Innenwinkel in einem Dreieck?", a: ["90°", "120°", "180°", "360°"], c: 2 },
  { q: "Welche Stadt ist Hauptstadt von Spanien?", a: ["Barcelona", "Madrid", "Sevilla", "Valencia"], c: 1 },
  { q: "Welche Aussage ist richtig?", a: ["Prozent bedeutet 'von 100'.", "Prozent bedeutet 'von 10'.", "Prozent ist eine Längeneinheit.", "Prozent ist immer größer als 1."], c: 0 },
  { q: "Wie heißt der Vorgang, wenn Wasser zu Dampf wird?", a: ["Kondensieren", "Schmelzen", "Verdampfen", "Gefrieren"], c: 2 },
  { q: "Welche ist ein Beispiel für erneuerbare Energie?", a: ["Braunkohle", "Erdgas", "Windkraft", "Benzin"], c: 2 },
  { q: "Welche Aussage ist richtig?", a: ["Ein Atom besteht nur aus Elektronen.", "Der Zellkern enthält DNA.", "Bakterien sind immer Pflanzen.", "Alle Viren sind Lebewesen."], c: 1 },
  { q: "Wie nennt man die erste Zeile eines Gedichts oft?", a: ["Strophe", "Vers", "Refrain", "Kapitel"], c: 1 },
  { q: "Welche Aussage ist richtig?", a: ["Nordsee ist ein See.", "Die Alpen sind ein Gebirge.", "Sahara ist ein Ozean.", "Der Rhein ist ein Gebirge."], c: 1 },
  { q: "Wie viele Grad hat ein rechter Winkel?", a: ["45°", "60°", "90°", "180°"], c: 2 },
  { q: "Wenn a = 4 und b = 7, was ist a·b?", a: ["11", "21", "24", "28"], c: 3 },
  { q: "Was bedeutet 'These' in einem Text am ehesten?", a: ["Hauptaussage", "Beispiel", "Schlusswort", "Überschrift"], c: 0 },
  { q: "Welche Aussage ist richtig?", a: ["Das Mittelalter endet vor der Antike.", "Die Antike kommt vor dem Mittelalter.", "Die Neuzeit kommt vor dem Mittelalter.", "Es gibt keine Reihenfolge."], c: 1 },
  { q: "Wie viele Millimeter sind 3,2 Zentimeter?", a: ["0,32", "3,2", "32", "320"], c: 2 },
  { q: "Welche Aussage ist richtig?", a: ["Ein Halbtonschritt ist größer als ein Ganzton.", "In Musik ist ein Takt eine Zeiteinheit.", "Noten sind nur für Klavier.", "Rhythmus ist immer zufällig."], c: 1 },
  { q: "Welche ist die richtige Reihenfolge der Planeten (von der Sonne aus)?", a: ["Mars, Erde, Venus", "Venus, Erde, Mars", "Erde, Venus, Mars", "Jupiter, Saturn, Uranus"], c: 1 },
  { q: "Welche Aussage zur EU ist richtig?", a: ["Alle Länder Europas sind automatisch in der EU.", "Die EU hat gemeinsame Regeln und Zusammenarbeit.", "Die EU ist ein einzelnes Land.", "Die EU hat keine eigenen Institutionen."], c: 1 }
];

function createQuizCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let index = 0; index < 5; index += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  const collision = rooms.has(code) || quizRooms.has(code) || amongRooms.has(code);
  return collision ? createQuizCode() : code;
}

function shuffleList(list) {
  const cloned = [...list];
  for (let i = cloned.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
  }
  return cloned;
}

function quizRoomView(room) {
  return {
    code: room.code,
    players: room.players.map((p) => p.name),
    scores: room.scores,
    started: room.started
  };
}

function quizBroadcastRoom(room) {
  io.to(room.code).emit("quiz_room_update", quizRoomView(room));
}

function quizSendQuestion(room) {
  const q = QUIZ_DUEL_QUESTIONS[room.order[room.currentIndex]];
  io.to(room.code).emit("quiz_question", {
    code: room.code,
    questionNumber: room.currentIndex + 1,
    totalQuestions: room.questionCount,
    turnPlayerIndex: room.turnPlayerIndex,
    players: room.players.map((p) => p.name),
    scores: room.scores,
    question: {
      text: q.q,
      answers: q.a
    }
  });
}

function quizCleanupRoom(room) {
  if (!room) return;
  if (room.cooldownTimer) {
    clearTimeout(room.cooldownTimer);
    room.cooldownTimer = null;
  }
  quizRooms.delete(room.code);
}

function quizLeaveSocket(socket) {
  const code = socket.data.quizRoomCode;
  if (!code) return;
  socket.leave(code);
  socket.data.quizRoomCode = null;
  socket.data.quizPlayerIndex = null;

  const room = quizRooms.get(code);
  if (!room) return;

  room.players = room.players.filter((p) => p.id !== socket.id);
  if (room.players.length === 0) {
    quizCleanupRoom(room);
    return;
  }

  io.to(code).emit("quiz_opponent_left");
  quizCleanupRoom(room);
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
      jokerRounds: 0,
      groupWins: 0,
      imposterWins: 0,
      jokerWins: 0,
      votesGiven: 0,
      votesCorrect: 0,
      suspected: 0,
      xp: 0,
      level: 1
    };
  } else {
    room.playerStats[key].name = name;
    if (typeof room.playerStats[key].xp !== "number") {
      room.playerStats[key].xp = 0;
    }
    if (typeof room.playerStats[key].level !== "number") {
      room.playerStats[key].level = 1;
    }
    if (typeof room.playerStats[key].jokerRounds !== "number") {
      room.playerStats[key].jokerRounds = 0;
    }
    if (typeof room.playerStats[key].jokerWins !== "number") {
      room.playerStats[key].jokerWins = 0;
    }
  }
}

function getLevelFromXp(xp) {
  return 1 + Math.floor(Math.max(0, xp) / 120);
}

function addXp(room, name, amount) {
  const stat = getStat(room, name);
  stat.xp += Math.max(0, amount);
  stat.level = getLevelFromXp(stat.xp);
}

function createRoundEvent(room) {
  const selected = { ...randomItem(ROUND_EVENTS) };

  if (selected.id === "spotlight") {
    const spotlightPlayer = randomItem(room.players);
    selected.spotlightPlayerId = spotlightPlayer.id;
    selected.spotlightPlayerName = spotlightPlayer.name;
    selected.description = `${selected.description} Spotlight: ${spotlightPlayer.name}.`;
  }

  return selected;
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
  const activeEvent = room.currentRound?.event
    ? {
      id: room.currentRound.event.id,
      title: room.currentRound.event.title,
      description: room.currentRound.event.description,
      hideVoteProgress: !!room.currentRound.event.hideVoteProgress,
      spotlightPlayerId: room.currentRound.event.spotlightPlayerId || null,
      spotlightPlayerName: room.currentRound.event.spotlightPlayerName || null
    }
    : null;

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
    activeEvent,
    expectedVotes: room.state === "vote" ? getExpectedVoteCount(room) : null,
    contentFilter: room.settings.contentFilter,
    customPromptCounts: {
      wahrheit: room.customPrompts.wahrheit.length,
      pflicht: room.customPrompts.pflicht.length
    },
    recentPlayers: room.recentPlayers,
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
        message: "Der Host hat die Lobby verlassen. Die Lobby wurde geschlossen."
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
  const jokerId = room.currentRound.jokerId;
  const imposter = room.players.find((player) => player.id === imposterId);
  const winner = !tie && topId === jokerId
    ? "joker"
    : !tie && topId === imposterId
      ? "gruppe"
      : "imposter";

  room.state = "ended";
  room.scores[winner] = (room.scores[winner] || 0) + 1;

  room.players.forEach((player) => {
    const stat = getStat(room, player.name);
    stat.rounds += 1;
    addXp(room, player.name, 10);

    const assignedRole = room.currentRound.assignments[player.id]?.role;

    if (assignedRole === "imposter") {
      stat.imposterRounds += 1;
      if (winner === "imposter") {
        stat.imposterWins += 1;
        addXp(room, player.name, 30);
      }
    } else if (assignedRole === "joker") {
      stat.jokerRounds += 1;
      if (winner === "joker") {
        stat.jokerWins += 1;
        addXp(room, player.name, 40);
      }
    } else if (winner === "gruppe") {
      stat.groupWins += 1;
      addXp(room, player.name, 18);
    }

    if (!tie && topId === imposterId && room.votes[player.id] === imposterId) {
      addXp(room, player.name, 12);
    }

    if (assignedRole === "detective" && room.votes[player.id] === imposterId) {
      addXp(room, player.name, 18);
    }

    if (room.currentRound.event?.id === "spotlight" && room.currentRound.event.spotlightPlayerId === player.id) {
      addXp(room, player.name, room.currentRound.event.spotlightBonusXp || 0);
    }
  });

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
  const voteSeconds = room.currentRound?.event?.voteSeconds || room.settings.voteSeconds;
  room.phaseEndsAt = Date.now() + voteSeconds * 1000;

  io.to(room.code).emit("vote_started", {
    byTimer,
    endsAt: room.phaseEndsAt
  });

  room.phaseTimer = setTimeout(() => {
    const liveRoom = rooms.get(room.code);
    if (!liveRoom || liveRoom.state !== "vote") return;
    finishVoting(liveRoom, true);
  }, voteSeconds * 1000);

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
  const remainingForRoles = room.players.filter((player) => player.id !== imposterId);
  const detectiveId = room.players.length >= 5 && remainingForRoles.length > 0
    ? randomItem(remainingForRoles).id
    : null;
  const remainingForJoker = remainingForRoles.filter((player) => player.id !== detectiveId);
  const jokerId = room.players.length >= 6 && remainingForJoker.length > 0
    ? randomItem(remainingForJoker).id
    : null;

  const event = createRoundEvent(room);
  const roundSeconds = event.roundSeconds || room.settings.roundSeconds;

  room.state = "round";
  room.votes = {};
  room.phaseEndsAt = Date.now() + roundSeconds * 1000;
  room.currentRound = {
    mode,
    realPrompt,
    fakePrompt,
    imposterId,
    detectiveId,
    jokerId,
    event,
    assignments: {}
  };

  room.players.forEach((player) => {
    const isImposter = player.id === imposterId;
    const isDetective = player.id === detectiveId;
    const isJoker = player.id === jokerId;

    let role = "normal";
    if (isImposter) role = "imposter";
    if (isDetective) role = "detective";
    if (isJoker) role = "joker";

    let hint = null;
    if (isDetective) {
      const decoy = randomItem(room.players.filter((entry) => entry.id !== player.id && entry.id !== imposterId));
      const imposterName = room.players.find((entry) => entry.id === imposterId)?.name || "?";
      hint = decoy
        ? `Detective-Hinweis: Der Hochstapler ist entweder ${imposterName} oder ${decoy.name}.`
        : "Detective-Hinweis: Achte auf unpassende Reaktionen.";
    }

    let prompt = realPrompt;
    if (isImposter) {
      prompt = fakePrompt;
    } else if (isJoker) {
      prompt = `${realPrompt} (Geheimes Joker-Ziel: Lass dich rausvoten.)`;
    }

    room.currentRound.assignments[player.id] = {
      role,
      prompt,
      mode,
      hint
    };

    io.to(player.id).emit("assignment", room.currentRound.assignments[player.id]);
  });

  room.spectators.forEach((spectator) => {
    io.to(spectator.id).emit("spectator_assignment", {
      message: "Du bist Zuschauer und erhältst keine geheime Aufgabe."
    });
  });

  const filterLabel =
    room.settings.contentFilter === "family"
      ? "Familie"
      : room.settings.contentFilter === "normal"
        ? "Normal"
        : room.settings.contentFilter === "spicy"
          ? "Scharf"
          : room.settings.contentFilter;
  room.phaseTimer = setTimeout(() => {
    const liveRoom = rooms.get(room.code);
    if (!liveRoom || liveRoom.state !== "round") return;
    startVotePhase(liveRoom, true);
  }, roundSeconds * 1000);

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
    socket.emit("error_message", "Du bist in keinem Raum.");
    return null;
  }

  const room = rooms.get(roomCode);
  if (!room) {
    socket.emit("error_message", "Raum nicht gefunden.");
    return null;
  }

  if (room.hostId !== socket.id) {
    socket.emit("error_message", "Das kann nur der Host.");
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

}

function attachSpectator(room, socket, name, asRejoin = false) {
  room.spectators.push({ id: socket.id, name });
  socket.data.participantType = "spectator";
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeFingerprint(value) {
  const normalized = String(value || "").trim().slice(0, 80);
  return normalized || null;
}

function createPartyCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let index = 0; index < 6; index += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  const duplicate = [...amongRooms.values()].some((room) => room.partyCode === code);
  return duplicate ? createPartyCode() : code;
}

function ensureAmongProfile(fingerprint, fallbackName = "Player") {
  const key = fingerprint || `anon:${fallbackName.toLowerCase()}`;
  if (!amongProfiles.has(key)) {
    amongProfiles.set(key, {
      key,
      displayName: fallbackName,
      xp: 0,
      level: 1,
      elo: 1000,
      titles: ["Rookie"],
      badges: [],
      banners: ["Default"],
      emotes: ["wave"],
      equipped: {
        title: "Rookie",
        badge: null,
        banner: "Default",
        emote: "wave"
      },
      friends: [],
      reports: 0,
      seasonTier: 1,
      eloHistory: [{ at: nowIso(), elo: 1000 }],
      missionsDay: todayKey(),
      missions: AMONG_DAILY_MISSIONS.map((mission) => ({ id: mission.id, progress: 0, completed: false })),
      risk: 0,
      riskHistory: [],
      firstSeenAt: nowIso(),
      lastSeenAt: nowIso(),
      lastRoomCode: null,
      gamesPlayed: 0,
      wins: 0,
      lastResult: null,
      adminMutedUntil: null,
      adminMutedReason: null
    });
  }

  const profile = amongProfiles.get(key);
  profile.displayName = fallbackName || profile.displayName;

  if (profile.missionsDay !== todayKey()) {
    profile.missionsDay = todayKey();
    profile.missions = AMONG_DAILY_MISSIONS.map((mission) => ({ id: mission.id, progress: 0, completed: false }));
  }

  profile.level = 1 + Math.floor(profile.xp / 250);
  profile.seasonTier = 1 + Math.floor(profile.xp / 500);

  if (!Array.isArray(profile.friends)) {
    profile.friends = [];
  }
  if (!Array.isArray(profile.eloHistory)) {
    profile.eloHistory = [{ at: nowIso(), elo: profile.elo || 1000 }];
  }
  if (!profile.equipped) {
    profile.equipped = {
      title: "Rookie",
      badge: null,
      banner: "Default",
      emote: "wave"
    };
  }
  if (typeof profile.gamesPlayed !== "number") profile.gamesPlayed = 0;
  if (typeof profile.wins !== "number") profile.wins = 0;
  if (!profile.firstSeenAt) profile.firstSeenAt = nowIso();
  if (!profile.lastSeenAt) profile.lastSeenAt = nowIso();
  if (typeof profile.lastResult !== "string" && profile.lastResult !== null) profile.lastResult = null;
  if (profile.adminMutedUntil === undefined) profile.adminMutedUntil = null;
  if (profile.adminMutedReason === undefined) profile.adminMutedReason = null;

  return profile;
}

function touchAmongProfile(fingerprint, fallbackName, roomCode = null) {
  const profile = ensureAmongProfile(fingerprint, fallbackName);
  profile.lastSeenAt = nowIso();
  if (roomCode) profile.lastRoomCode = roomCode;
  return profile;
}

function addAmongXp(profile, amount) {
  profile.xp += Math.max(0, amount || 0);
  profile.level = 1 + Math.floor(profile.xp / 250);
  profile.seasonTier = 1 + Math.floor(profile.xp / 500);
  unlockCosmetics(profile);
}

function updateAmongMission(profile, missionId, amount = 1) {
  const mission = profile.missions.find((entry) => entry.id === missionId);
  const config = AMONG_DAILY_MISSIONS.find((entry) => entry.id === missionId);
  if (!mission || !config || mission.completed) return;

  mission.progress += Math.max(1, amount);
  if (mission.progress >= config.target) {
    mission.completed = true;
    addAmongXp(profile, config.xp);
    if (!profile.titles.includes(config.title)) {
      profile.titles.push(config.title);
    }
    if (!profile.badges.includes(`daily:${config.id}`)) {
      profile.badges.push(`daily:${config.id}`);
    }
  }
}

function recordElo(profile) {
  profile.eloHistory.push({ at: nowIso(), elo: profile.elo });
  if (profile.eloHistory.length > 60) {
    profile.eloHistory.shift();
  }
}

function unlockCosmetics(profile) {
  if (profile.level >= 5 && !profile.badges.includes("bronze-star")) {
    profile.badges.push("bronze-star");
  }
  if (profile.level >= 10 && !profile.titles.includes("Elite")) {
    profile.titles.push("Elite");
  }
  if (profile.level >= 12 && !profile.banners.includes("Neon")) {
    profile.banners.push("Neon");
  }
  if (profile.level >= 15 && !profile.emotes.includes("gg")) {
    profile.emotes.push("gg");
  }
}

function markAmongOnline(fingerprint, socketId) {
  if (!fingerprint) return;
  if (!amongOnlineByFingerprint.has(fingerprint)) {
    amongOnlineByFingerprint.set(fingerprint, new Set());
  }
  amongOnlineByFingerprint.get(fingerprint).add(socketId);
}

function markAmongOffline(fingerprint, socketId) {
  if (!fingerprint) return;
  const set = amongOnlineByFingerprint.get(fingerprint);
  if (!set) return;
  set.delete(socketId);
  if (set.size === 0) {
    amongOnlineByFingerprint.delete(fingerprint);
  }
}

function isFriendOnline(fingerprint) {
  if (!fingerprint) return false;
  const set = amongOnlineByFingerprint.get(fingerprint);
  return !!set && set.size > 0;
}

function buildThemePrompts(theme) {
  const normalizedTheme = String(theme || "general").trim().slice(0, 30) || "general";
  const truth = [
    `What is your hottest take about ${normalizedTheme}?`,
    `What is your most chaotic ${normalizedTheme} memory?`,
    `Who in this room fits ${normalizedTheme} vibes most and why?`,
    `What would you never admit about ${normalizedTheme} in public?`
  ];
  const dare = [
    `Sell ${normalizedTheme} as a product in 10 seconds.`,
    `Do a dramatic ad for ${normalizedTheme}.`,
    `Explain ${normalizedTheme} like a movie trailer.`,
    `Give a fake TED talk about ${normalizedTheme} for 15 seconds.`
  ];
  return { truth, dare, theme: normalizedTheme };
}

function isAmongSoftBanned(fingerprint) {
  return !!getAmongSoftBanEntry(fingerprint);
}

function getAmongAdminMute(fingerprint) {
  if (!fingerprint) return null;
  const entry = amongAdminMutes.get(fingerprint);
  if (!entry) return null;
  if (entry.until <= Date.now()) {
    amongAdminMutes.delete(fingerprint);
    const profile = amongProfiles.get(fingerprint);
    if (profile) {
      profile.adminMutedUntil = null;
      profile.adminMutedReason = null;
    }
    return null;
  }
  return entry;
}

function bumpAmongRisk(socket, reason, points = 1) {
  const fingerprint = socket.data.amongFingerprint;
  if (!fingerprint) return;
  const profile = ensureAmongProfile(fingerprint, socket.data.amongName || "Player");
  profile.risk += points;
  profile.riskHistory.push({ reason, at: nowIso(), points });
  if (profile.riskHistory.length > 40) {
    profile.riskHistory.shift();
  }
  if (profile.risk >= 12) {
    amongSoftBans.set(fingerprint, {
      until: Date.now() + 15 * 60 * 1000,
      reason: "Suspicious behavior",
      permanent: false
    });
    logModerationAction("auto_soft_ban", {
      fingerprint,
      reason: "Suspicious behavior",
      until: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      by: "anti-cheat"
    });
    profile.risk = 0;
    socket.emit("among_error", "Soft-ban active for 15 minutes (anti-cheat).");
  }
}

function amongMapTemplate() {
  return {
    nodes: {
      cafeteria: ["admin", "medbay", "navigation"],
      admin: ["cafeteria", "electrical", "security"],
      medbay: ["cafeteria", "reactor"],
      electrical: ["admin", "security", "reactor"],
      security: ["admin", "electrical", "reactor"],
      reactor: ["medbay", "electrical", "security"],
      navigation: ["cafeteria"]
    },
    sabotage: null
  };
}

function getAmongProfileView(player) {
  const profile = ensureAmongProfile(player.fingerprint, player.name);
  return {
    level: profile.level,
    xp: profile.xp,
    elo: profile.elo,
    seasonTier: profile.seasonTier,
    titles: profile.titles.slice(-3),
    badges: profile.badges.slice(-4),
    banners: profile.banners.slice(-3),
    emotes: profile.emotes.slice(-4),
    equipped: profile.equipped,
    friends: profile.friends.length,
    missions: profile.missions
  };
}

function removeFromAmongQueue(socketId) {
  ["casual", "ranked"].forEach((queueType) => {
    amongQueue[queueType] = amongQueue[queueType].filter((entry) => entry.socketId !== socketId);
  });
}

function amongQueueView() {
  return {
    casual: amongQueue.casual.length,
    ranked: amongQueue.ranked.length
  };
}

function maybeCreateQuickPlayRoom(queueType) {
  const queue = amongQueue[queueType];
  const required = 4;
  if (!queue || queue.length < required) return;

  const group = queue.splice(0, required);
  const hostEntry = group[0];
  const hostSocket = io.sockets.sockets.get(hostEntry.socketId);
  if (!hostSocket) return;

  const code = createAmongCode();
  const room = {
    code,
    partyCode: createPartyCode(),
    queueType,
    hostId: hostSocket.id,
    state: "lobby",
    players: [],
    logs: [],
    deadBody: null,
    meeting: null,
    winner: null,
    rematchReady: new Set(),
    highlights: [],
    map: amongMapTemplate(),
    voiceChannel: `voice-${code}`,
    voiceState: "open"
  };

  amongRooms.set(code, room);
  amongLog(room, `Quick Play room created (${queueType}).`);

  group.forEach((entry) => {
    const targetSocket = io.sockets.sockets.get(entry.socketId);
    if (!targetSocket) return;
    targetSocket.join(code);
    targetSocket.data.amongRoomCode = code;
    targetSocket.data.amongFingerprint = entry.fingerprint;
    targetSocket.data.amongName = entry.name;

    room.players.push({
      id: targetSocket.id,
      name: entry.name,
      fingerprint: entry.fingerprint,
      role: null,
      alive: true,
      tasksDone: 0,
      tasksTotal: 3,
      emergencyLeft: 1,
      killCooldownUntil: 0,
      position: "cafeteria",
      vision: 1,
      shieldUntil: 0,
      abilityCooldowns: {}
    });

    const profile = ensureAmongProfile(entry.fingerprint, entry.name);
    updateAmongMission(profile, "play_rounds", 1);

    targetSocket.emit("among_joined", {
      code,
      selfId: targetSocket.id,
      partyCode: room.partyCode,
      queueType,
      profile: getAmongProfileView({ fingerprint: entry.fingerprint, name: entry.name })
    });
  });

  amongBroadcast(code);
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
    partyCode: room.partyCode || null,
    queueType: room.queueType || "casual",
    voiceChannel: room.voiceChannel || null,
    voiceState: room.voiceState || "open",
    state: room.state,
    hostId: room.hostId,
    players: room.players.map((player) => ({
      id: player.id,
      name: player.name,
      alive: player.alive,
      tasksDone: player.tasksDone,
      tasksTotal: player.tasksTotal,
      emergencyLeft: player.emergencyLeft,
      position: player.position,
      role: room.state === "ended" ? player.role : null,
      profile: getAmongProfileView(player)
    })),
    rematchReady: Array.from(room.rematchReady || []),
    meeting: room.meeting ? {
      active: true,
      reason: room.meeting.reason,
      reporterName: room.meeting.reporterName,
      votesCount: Object.keys(room.meeting.votes).length,
      endsAt: room.meeting.endsAt
    } : null,
    deadBody: room.deadBody,
    map: {
      sabotage: room.map?.sabotage || null,
      nodes: room.map?.nodes || {}
    },
    chat: (room.chat || []).slice(-40),
    winner: room.winner,
    logs: room.logs.slice(-20),
    highlights: (room.highlights || []).slice(-6),
    queueSizes: amongQueueView()
  });
}

function amongLog(room, message) {
  room.logs.push({ message, at: nowIso() });
  if (room.logs.length > 80) room.logs.shift();
}

function pushAmongAnalyticsHighlight(text) {
  amongAnalytics.highlights.push({ at: nowIso(), text });
  if (amongAnalytics.highlights.length > 120) {
    amongAnalytics.highlights.shift();
  }
}

function amongAlive(room) {
  return room.players.filter((player) => player.alive);
}

function amongCheckWin(room) {
  if (room.winner) return true;

  const alive = amongAlive(room);
  const aliveImposters = alive.filter((player) => player.role === "imposter").length;
  const aliveCrew = alive.filter((player) => player.role !== "imposter").length;

  if (aliveImposters <= 0) {
    room.winner = "crew";
  } else if (aliveImposters >= aliveCrew) {
    room.winner = "imposter";
  } else {
    const crew = room.players.filter((player) => player.role !== "imposter");
    const allTasksDone = crew.length > 0 && crew.every((player) => player.tasksDone >= player.tasksTotal);
    if (allTasksDone) {
      room.winner = "crew";
    }
  }

  if (room.winner) {
    room.state = "ended";
    room.voiceState = "open";
    room.deadBody = null;
    amongAnalytics.roleWins[room.winner] = (amongAnalytics.roleWins[room.winner] || 0) + 1;
    if (room.meeting?.timer) clearTimeout(room.meeting.timer);
    room.meeting = null;
    room.rematchReady = new Set();

    const aliveWinners = room.players.filter((player) => {
      if (room.winner === "crew") return player.role !== "imposter" && player.alive;
      return player.role === "imposter" && player.alive;
    });
    const mvp = aliveWinners[0] || room.players[0];
    if (mvp) {
      room.highlights.push({
        at: nowIso(),
        text: `MVP: ${mvp.name} (${mvp.role || "crew"})`
      });
      pushAmongAnalyticsHighlight(`[${room.code}] MVP: ${mvp.name} (${mvp.role || "crew"})`);
    }

    room.players.forEach((player) => {
      const profile = ensureAmongProfile(player.fingerprint, player.name);
      const baseXp = player.role === room.winner || (room.winner === "crew" && player.role !== "imposter") ? 55 : 22;
      addAmongXp(profile, baseXp);
      updateAmongMission(profile, "play_rounds", 1);
      profile.gamesPlayed += 1;
      const won = room.winner === "imposter" ? player.role === "imposter" : player.role !== "imposter";
      if (won) {
        profile.wins += 1;
      }
      profile.lastResult = won ? "win" : "loss";
      profile.lastSeenAt = nowIso();
      profile.lastRoomCode = room.code;

      if (room.queueType === "ranked") {
        profile.elo += won ? 16 : -12;
        if (profile.elo < 800) profile.elo = 800;
      }

      if (room.highlights.length > 20) {
        room.highlights.shift();
      }
    });

    amongLog(room, room.winner === "crew" ? "Crew gewinnt die Runde." : "Hochstapler gewinnt die Runde.");
    pushAmongAnalyticsHighlight(`[${room.code}] Winner: ${room.winner}`);
    amongMatchHistory.push({
      at: nowIso(),
      code: room.code,
      queueType: room.queueType,
      winner: room.winner,
      playerCount: room.players.length,
      players: room.players.map((player) => ({
        name: player.name,
        fingerprint: player.fingerprint || null,
        role: player.role,
        alive: !!player.alive
      }))
    });
    if (amongMatchHistory.length > 200) {
      amongMatchHistory.shift();
    }
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
      amongLog(room, `${targetPlayer.name} wurde rausgewählt.`);
      room.highlights.push({
        at: nowIso(),
        text: `Meeting ejection: ${targetPlayer.name} (${targetPlayer.role})`
      });
    }
  } else {
    amongLog(room, "Besprechung endete ohne Rauswahl.");
  }

  Object.keys(room.meeting.votes).forEach((voterId) => {
    const voter = room.players.find((player) => player.id === voterId);
    if (!voter) return;
    const profile = ensureAmongProfile(voter.fingerprint, voter.name);
    updateAmongMission(profile, "votes", 1);
    addAmongXp(profile, 8);
  });

  room.state = "playing";
  room.voiceState = "task-muted";
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
  room.voiceState = "meeting-open";
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

  const reasonLabel = reason === "body" ? "Leiche" : reason === "emergency" ? "Notfall" : reason;
  amongLog(room, `Besprechung gestartet (${reasonLabel}) von ${reporterName}.`);
  io.to(room.code).emit("among_meeting_started", {
    reason,
    reporterName,
    endsAt: room.meeting.endsAt
  });
  amongBroadcast(room.code);
}

function amongRemoveSocket(socket, reason = "leave") {
  const roomCode = socket.data.amongRoomCode;
  removeFromAmongQueue(socket.id);
  if (!roomCode) return;

  const room = amongRooms.get(roomCode);
  socket.data.amongRoomCode = undefined;
  if (!room) return;

  room.players = room.players.filter((player) => player.id !== socket.id);
  if (room.rematchReady) {
    room.rematchReady.delete(socket.id);
  }
  if (room.meeting?.votes?.[socket.id]) {
    delete room.meeting.votes[socket.id];
  }

  if (room.players.length === 0) {
    if (room.meeting?.timer) clearTimeout(room.meeting.timer);
    amongRooms.delete(roomCode);
    return;
  }

  if (room.hostId === socket.id) {
    io.to(room.code).emit("among_closed", { message: "Host hat die Lobby verlassen." });
    if (room.meeting?.timer) clearTimeout(room.meeting.timer);
    amongRooms.delete(roomCode);
    return;
  }

  if (reason === "disconnect") {
    amongLog(room, "Ein Spieler hat die Verbindung verloren.");
  }

  amongCheckWin(room);
  amongBroadcast(room.code);
}

function amongCanUseAbility(player, key, cooldownMs) {
  const now = Date.now();
  const until = player.abilityCooldowns?.[key] || 0;
  if (until > now) {
    return { ok: false, retryMs: until - now };
  }
  player.abilityCooldowns[key] = now + cooldownMs;
  return { ok: true, retryMs: 0 };
}

function amongRolePlan(players) {
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  const plan = {
    imposterId: shuffled[0]?.id || null,
    medicId: null,
    hackerId: null,
    tricksterId: null
  };

  const extras = shuffled.slice(1);
  if (extras[0]) plan.medicId = extras[0].id;
  if (extras[1]) plan.hackerId = extras[1].id;
  if (extras[2]) plan.tricksterId = extras[2].id;
  return plan;
}

function amongStartGame(room) {
  room.state = "playing";
  room.voiceState = "task-muted";
  room.winner = null;
  room.deadBody = null;
  room.meeting = null;
  room.highlights.push({ at: nowIso(), text: "Match started" });
  room.map.sabotage = null;

  const plan = amongRolePlan(room.players);
  const tasks = amongTaskPool();

  room.players.forEach((player) => {
    player.alive = true;
    player.tasksDone = 0;
    player.tasksTotal = 3;
    player.emergencyLeft = 1;
    player.killCooldownUntil = 0;
    player.position = "cafeteria";
    player.vision = 1;
    player.shieldUntil = 0;
    player.abilityCooldowns = {};
    player.role = "crewmate";
  });

  const imposter = room.players.find((player) => player.id === plan.imposterId);
  if (imposter) {
    imposter.role = "imposter";
    imposter.killCooldownUntil = Date.now() + 10000;
  }
  const medic = room.players.find((player) => player.id === plan.medicId);
  if (medic) medic.role = "medic";
  const hacker = room.players.find((player) => player.id === plan.hackerId);
  if (hacker) hacker.role = "hacker";
  const trickster = room.players.find((player) => player.id === plan.tricksterId);
  if (trickster) trickster.role = "trickster";

  room.players.forEach((player) => {
    const taskList = [...tasks].sort(() => Math.random() - 0.5).slice(0, 3);
    const roleTasks = player.role === "imposter"
      ? ["Sabotage", "Fake alibi", "Eliminate"]
      : taskList;
    io.to(player.id).emit("among_role", {
      role: player.role,
      tasks: roleTasks,
      position: player.position
    });
  });

  amongLog(room, "Game started.");
  io.to(room.code).emit("among_game_started");
  amongBroadcast(room.code);
}

function amongCanRelayVoice(fromSocket, targetId) {
  const roomCode = fromSocket.data.amongRoomCode;
  if (!roomCode) return false;
  const room = amongRooms.get(roomCode);
  if (!room) return false;
  const fromFingerprint = normalizeFingerprint(fromSocket.data.amongFingerprint);
  if (getAmongAdminMute(fromFingerprint)) return false;
  const fromPlayer = room.players.find((entry) => entry.id === fromSocket.id);
  const targetPlayer = room.players.find((entry) => entry.id === String(targetId || ""));
  return !!fromPlayer && !!targetPlayer;
}

io.on("connection", (socket) => {
  socket.emit("among_queue_update", amongQueueView());

  socket.on("among_track_open", ({ fingerprint, name }) => {
    const fp = normalizeFingerprint(fingerprint);
    const safeName = validName(name) || "Player";
    socket.data.amongFingerprint = fp;
    socket.data.amongName = safeName;
    touchAmongProfile(fp, safeName, null);
    logJoinAction("open_site", {
      fingerprint: fp,
      name: safeName,
      socketId: socket.id,
      ip: socket.handshake.address || null
    });
    emitAmongAdminStatus(socket, fp);
  });

  socket.on("among_create_room", ({ name, fingerprint, queueType = "casual" }) => {
    if (isRateLimited(socket, "among_create_room", 900, "among_create_room")) {
      socket.emit("among_error", "Please wait a moment.");
      return;
    }

    const trimmedName = validName(name);
    const fp = normalizeFingerprint(fingerprint);
    if (!trimmedName) {
      socket.emit("among_error", "Please enter a name.");
      return;
    }
    if (blockIfBanned(socket, fp)) {
      return;
    }

    removeFromAmongQueue(socket.id);
    const code = createAmongCode();
    const room = {
      code,
      partyCode: createPartyCode(),
      queueType: queueType === "ranked" ? "ranked" : "casual",
      hostId: socket.id,
      state: "lobby",
      players: [{
        id: socket.id,
        name: trimmedName,
        fingerprint: fp,
        role: null,
        alive: true,
        tasksDone: 0,
        tasksTotal: 3,
        emergencyLeft: 1,
        killCooldownUntil: 0,
        position: "cafeteria",
        vision: 1,
        shieldUntil: 0,
        abilityCooldowns: {}
      }],
      logs: [],
      deadBody: null,
      meeting: null,
      winner: null,
      rematchReady: new Set(),
      highlights: [],
      chat: [],
      chat: [],
      map: amongMapTemplate(),
      voiceChannel: `voice-${code}`,
      voiceState: "open"
    };

    amongRooms.set(code, room);
    socket.join(code);
    socket.data.amongRoomCode = code;
    socket.data.amongFingerprint = fp;
    socket.data.amongName = trimmedName;
    touchAmongProfile(fp, trimmedName, code);
    logJoinAction("create_room", {
      fingerprint: fp,
      name: trimmedName,
      roomCode: code,
      queueType: room.queueType,
      socketId: socket.id,
      ip: socket.handshake.address || null
    });
    amongLog(room, `${trimmedName} created the room.`);

    socket.emit("among_joined", {
      code,
      selfId: socket.id,
      partyCode: room.partyCode,
      queueType: room.queueType,
      profile: getAmongProfileView(room.players[0])
    });
    emitAmongAdminStatus(socket, fp);
    amongBroadcast(code);
  });

  socket.on("among_quick_play", ({ name, fingerprint, queueType = "casual" }) => {
    const trimmedName = validName(name);
    const fp = normalizeFingerprint(fingerprint);
    const normalizedQueue = queueType === "ranked" ? "ranked" : "casual";
    if (!trimmedName) {
      socket.emit("among_error", "Please enter a name.");
      return;
    }
    if (blockIfBanned(socket, fp)) {
      return;
    }

    socket.data.amongFingerprint = fp;
    socket.data.amongName = trimmedName;
    touchAmongProfile(fp, trimmedName, null);
    logJoinAction("quick_play_queue", {
      fingerprint: fp,
      name: trimmedName,
      queueType: normalizedQueue,
      socketId: socket.id,
      ip: socket.handshake.address || null
    });
    removeFromAmongQueue(socket.id);
    amongQueue[normalizedQueue].push({
      socketId: socket.id,
      name: trimmedName,
      fingerprint: fp
    });

    io.emit("among_queue_update", amongQueueView());
    maybeCreateQuickPlayRoom(normalizedQueue);
    io.emit("among_queue_update", amongQueueView());
  });

  socket.on("among_join_party", ({ name, fingerprint, partyCode }) => {
    const trimmedName = validName(name);
    const normalizedPartyCode = String(partyCode || "").trim().toUpperCase();
    const fp = normalizeFingerprint(fingerprint);
    if (!trimmedName || !normalizedPartyCode) {
      socket.emit("among_error", "Name and party code are required.");
      return;
    }
    if (blockIfBanned(socket, fp)) {
      return;
    }
    const room = [...amongRooms.values()].find((entry) => entry.partyCode === normalizedPartyCode);
    if (!room || room.state !== "lobby") {
      socket.emit("among_error", "Party room not found.");
      return;
    }
    if (room.players.length >= 12) {
      socket.emit("among_error", "Room is full.");
      return;
    }
    if (fp && room.players.some((player) => player.fingerprint && player.fingerprint === fp)) {
      socket.emit("among_error", "Fingerprint already used in this room.");
      return;
    }

    socket.join(room.code);
    socket.data.amongRoomCode = room.code;
    socket.data.amongFingerprint = fp;
    socket.data.amongName = trimmedName;

    room.players.push({
      id: socket.id,
      name: trimmedName,
      fingerprint: fp,
      role: null,
      alive: true,
      tasksDone: 0,
      tasksTotal: 3,
      emergencyLeft: 1,
      killCooldownUntil: 0,
      position: "cafeteria",
      vision: 1,
      shieldUntil: 0,
      abilityCooldowns: {}
    });
    touchAmongProfile(fp, trimmedName, room.code);
    logJoinAction("join_party", {
      fingerprint: fp,
      name: trimmedName,
      roomCode: room.code,
      partyCode: normalizedPartyCode,
      socketId: socket.id,
      ip: socket.handshake.address || null
    });
    amongLog(room, `${trimmedName} joined via party code.`);
    socket.emit("among_joined", {
      code: room.code,
      selfId: socket.id,
      partyCode: room.partyCode,
      queueType: room.queueType,
      profile: getAmongProfileView(room.players[room.players.length - 1])
    });
    emitAmongAdminStatus(socket, fp);
    amongBroadcast(room.code);
  });

  socket.on("among_join_room", ({ name, code, fingerprint }) => {
    if (isRateLimited(socket, "among_join_room", 700, "among_join_room")) {
      socket.emit("among_error", "Please wait a moment.");
      return;
    }

    const trimmedName = validName(name);
    const normalizedCode = String(code || "").trim().toUpperCase();
    const fp = normalizeFingerprint(fingerprint);
    if (!trimmedName || !normalizedCode) {
      socket.emit("among_error", "Name and room code are required.");
      return;
    }
    if (blockIfBanned(socket, fp)) {
      return;
    }

    const room = amongRooms.get(normalizedCode);
    if (!room) {
      socket.emit("among_error", "Room not found.");
      return;
    }

    if (room.state !== "lobby") {
      socket.emit("among_error", "Game already running.");
      return;
    }

    if (room.players.length >= 12) {
      socket.emit("among_error", "Room is full.");
      return;
    }
    if (fp && room.players.some((player) => player.fingerprint && player.fingerprint === fp)) {
      socket.emit("among_error", "Fingerprint already used in this room.");
      return;
    }

    const duplicate = room.players.some((player) => player.name.toLowerCase() === trimmedName.toLowerCase());
    if (duplicate) {
      socket.emit("among_error", "Name already taken.");
      return;
    }

    socket.join(normalizedCode);
    socket.data.amongRoomCode = normalizedCode;
    socket.data.amongFingerprint = fp;
    socket.data.amongName = trimmedName;
    room.players.push({
      id: socket.id,
      name: trimmedName,
      fingerprint: fp,
      role: null,
      alive: true,
      tasksDone: 0,
      tasksTotal: 3,
      emergencyLeft: 1,
      killCooldownUntil: 0,
      position: "cafeteria",
      vision: 1,
      shieldUntil: 0,
      abilityCooldowns: {}
    });

    touchAmongProfile(fp, trimmedName, normalizedCode);
    logJoinAction("join_room", {
      fingerprint: fp,
      name: trimmedName,
      roomCode: normalizedCode,
      socketId: socket.id,
      ip: socket.handshake.address || null
    });
    amongLog(room, `${trimmedName} joined.`);
    socket.emit("among_joined", {
      code: normalizedCode,
      selfId: socket.id,
      partyCode: room.partyCode,
      queueType: room.queueType,
      profile: getAmongProfileView(room.players[room.players.length - 1])
    });
    emitAmongAdminStatus(socket, fp);
    amongBroadcast(normalizedCode);
  });

  socket.on("among_start_game", () => {
    if (blockIfBanned(socket)) return;
    const roomCode = socket.data.amongRoomCode;
    const room = amongRooms.get(roomCode);
    if (!room) return;
    if (room.hostId !== socket.id) {
      socket.emit("among_error", "Only host can start.");
      return;
    }
    if (room.players.length < 4) {
      socket.emit("among_error", "At least 4 players required.");
      return;
    }
    amongStartGame(room);
  });

  socket.on("among_move", ({ to }) => {
    if (blockIfBanned(socket)) return;
    const room = amongRooms.get(socket.data.amongRoomCode);
    if (!room || room.state !== "playing") return;
    const player = room.players.find((entry) => entry.id === socket.id);
    if (!player || !player.alive) return;
    const next = String(to || "").toLowerCase();
    const neighbors = room.map?.nodes?.[player.position] || [];
    if (!neighbors.includes(next)) {
      bumpAmongRisk(socket, "invalid_move", 1);
      socket.emit("among_error", "Invalid movement path.");
      return;
    }
    player.position = next;
    amongBroadcast(room.code);
  });

  socket.on("among_start_sabotage", ({ type }) => {
    if (blockIfBanned(socket)) return;
    const room = amongRooms.get(socket.data.amongRoomCode);
    if (!room || room.state !== "playing") return;
    const player = room.players.find((entry) => entry.id === socket.id);
    if (!player || !player.alive || player.role !== "imposter") return;

    const check = amongCanUseAbility(player, "sabotage", 30000);
    if (!check.ok) {
      socket.emit("among_error", `Sabotage cooldown: ${Math.ceil(check.retryMs / 1000)}s`);
      return;
    }
    if (room.map.sabotage) {
      socket.emit("among_error", "Sabotage already active.");
      return;
    }

    const sabotageType = type === "reactor" ? "reactor" : "lights";
    room.map.sabotage = {
      type: sabotageType,
      startedAt: Date.now(),
      endsAt: sabotageType === "reactor" ? Date.now() + 30000 : Date.now() + 22000,
      fixedBy: []
    };
    room.highlights.push({ at: nowIso(), text: `Sabotage started: ${sabotageType}` });
    amongLog(room, `Sabotage started (${sabotageType}).`);

    if (sabotageType === "reactor") {
      setTimeout(() => {
        const liveRoom = amongRooms.get(room.code);
        if (!liveRoom || liveRoom.state !== "playing") return;
        if (!liveRoom.map.sabotage || liveRoom.map.sabotage.type !== "reactor") return;
        liveRoom.winner = "imposter";
        amongCheckWin(liveRoom);
      }, 30000);
    }

    amongBroadcast(room.code);
  });

  socket.on("among_fix_sabotage", () => {
    if (blockIfBanned(socket)) return;
    const room = amongRooms.get(socket.data.amongRoomCode);
    if (!room || room.state !== "playing" || !room.map.sabotage) return;
    const player = room.players.find((entry) => entry.id === socket.id);
    if (!player || !player.alive || player.role === "imposter") return;

    if (room.map.sabotage.type === "lights" && player.position !== "electrical") {
      socket.emit("among_error", "Fix lights in Electrical.");
      return;
    }
    if (room.map.sabotage.type === "reactor" && player.position !== "reactor") {
      socket.emit("among_error", "Fix reactor in Reactor room.");
      return;
    }

    if (!room.map.sabotage.fixedBy.includes(player.id)) {
      room.map.sabotage.fixedBy.push(player.id);
    }
    const required = room.map.sabotage.type === "reactor" ? 2 : 1;
    if (room.map.sabotage.fixedBy.length >= required) {
      amongLog(room, `Sabotage fixed by ${room.map.sabotage.fixedBy.length} crew.`);
      room.highlights.push({ at: nowIso(), text: `Sabotage fixed (${room.map.sabotage.type})` });
      room.map.sabotage = null;
    }
    amongBroadcast(room.code);
  });

  socket.on("among_medic_shield", ({ targetId }) => {
    if (blockIfBanned(socket)) return;
    const room = amongRooms.get(socket.data.amongRoomCode);
    if (!room || room.state !== "playing") return;
    const medic = room.players.find((entry) => entry.id === socket.id);
    const target = room.players.find((entry) => entry.id === String(targetId || ""));
    if (!medic || !target || !medic.alive || !target.alive) return;
    if (medic.role !== "medic") return;

    const check = amongCanUseAbility(medic, "medic_shield", 25000);
    if (!check.ok) {
      socket.emit("among_error", `Shield cooldown: ${Math.ceil(check.retryMs / 1000)}s`);
      return;
    }
    target.shieldUntil = Date.now() + 15000;
    amongLog(room, `${medic.name} shielded ${target.name}.`);
    amongBroadcast(room.code);
  });

  socket.on("among_hacker_scan", () => {
    if (blockIfBanned(socket)) return;
    const room = amongRooms.get(socket.data.amongRoomCode);
    if (!room || room.state !== "playing") return;
    const hacker = room.players.find((entry) => entry.id === socket.id);
    if (!hacker || !hacker.alive || hacker.role !== "hacker") return;

    const check = amongCanUseAbility(hacker, "hacker_scan", 22000);
    if (!check.ok) {
      socket.emit("among_error", `Scan cooldown: ${Math.ceil(check.retryMs / 1000)}s`);
      return;
    }

    const candidates = room.players.filter((entry) => entry.id !== hacker.id);
    const possible = candidates.filter((entry) => entry.role === "imposter" || Math.random() < 0.35).slice(0, 2);
    io.to(hacker.id).emit("among_hack_result", {
      suspects: possible.map((entry) => entry.name)
    });
  });

  socket.on("among_trickster_decoy", () => {
    if (blockIfBanned(socket)) return;
    const room = amongRooms.get(socket.data.amongRoomCode);
    if (!room || room.state !== "playing") return;
    const trickster = room.players.find((entry) => entry.id === socket.id);
    if (!trickster || !trickster.alive || trickster.role !== "trickster") return;

    const check = amongCanUseAbility(trickster, "trickster_decoy", 20000);
    if (!check.ok) {
      socket.emit("among_error", `Decoy cooldown: ${Math.ceil(check.retryMs / 1000)}s`);
      return;
    }

    amongLog(room, `Decoy signal detected near ${trickster.position}.`);
    room.highlights.push({ at: nowIso(), text: `Trickster decoy in ${trickster.position}` });
    amongBroadcast(room.code);
  });

  socket.on("among_complete_task", () => {
    if (blockIfBanned(socket)) return;
    const roomCode = socket.data.amongRoomCode;
    const room = amongRooms.get(roomCode);
    if (!room || room.state !== "playing") return;

    const player = room.players.find((entry) => entry.id === socket.id);
    if (!player || !player.alive || player.role === "imposter") return;
    if (player.tasksDone >= player.tasksTotal) return;

    player.tasksDone += 1;
    const profile = ensureAmongProfile(player.fingerprint, player.name);
    updateAmongMission(profile, "complete_tasks", 1);
    addAmongXp(profile, 10);
    amongLog(room, `${player.name} completed a task.`);
    amongCheckWin(room);
    amongBroadcast(roomCode);
  });

  socket.on("among_kill", ({ targetId }) => {
    if (blockIfBanned(socket)) return;
    const roomCode = socket.data.amongRoomCode;
    const room = amongRooms.get(roomCode);
    if (!room || room.state !== "playing") return;

    const killer = room.players.find((entry) => entry.id === socket.id);
    const target = room.players.find((entry) => entry.id === String(targetId || ""));
    if (!killer || !target) return;
    if (!killer.alive || killer.role !== "imposter") return;
    if (!target.alive || target.id === killer.id) return;
    if (killer.position !== target.position) {
      bumpAmongRisk(socket, "cross_room_kill", 2);
      socket.emit("among_error", "Target must be in the same room.");
      return;
    }

    if (Date.now() < killer.killCooldownUntil) {
      socket.emit("among_error", "Kill cooldown active.");
      return;
    }

    if (target.shieldUntil > Date.now()) {
      socket.emit("among_error", "Target is shielded by Medic.");
      killer.killCooldownUntil = Date.now() + 8000;
      return;
    }

    target.alive = false;
    killer.killCooldownUntil = Date.now() + 20000;
    room.deadBody = {
      id: target.id,
      name: target.name,
      room: target.position
    };

    amongLog(room, `${target.name} was eliminated in ${target.position}.`);
    room.highlights.push({ at: nowIso(), text: `Kill in ${target.position}: ${target.name}` });
    amongAnalytics.killHeatmap[target.position] = (amongAnalytics.killHeatmap[target.position] || 0) + 1;
    pushAmongAnalyticsHighlight(`[${room.code}] Kill in ${target.position}: ${target.name}`);
    io.to(room.code).emit("among_body_found", { name: target.name });
    if (!amongCheckWin(room)) amongBroadcast(roomCode);
  });

  socket.on("among_report_body", () => {
    if (blockIfBanned(socket)) return;
    const roomCode = socket.data.amongRoomCode;
    const room = amongRooms.get(roomCode);
    if (!room || room.state !== "playing" || !room.deadBody) return;

    const reporter = room.players.find((entry) => entry.id === socket.id);
    if (!reporter || !reporter.alive) return;
    if (reporter.position !== room.deadBody.room) {
      socket.emit("among_error", "You can only report in the body room.");
      return;
    }

    const profile = ensureAmongProfile(reporter.fingerprint, reporter.name);
    updateAmongMission(profile, "meetings", 1);
    amongStartMeeting(room, "body", reporter.name);
  });

  socket.on("among_call_meeting", () => {
    if (blockIfBanned(socket)) return;
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
    const profile = ensureAmongProfile(caller.fingerprint, caller.name);
    updateAmongMission(profile, "meetings", 1);
    amongStartMeeting(room, "emergency", caller.name);
  });

  socket.on("among_vote", ({ targetId }) => {
    if (blockIfBanned(socket)) return;
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
      bumpAmongRisk(socket, "invalid_vote_target", 1);
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

  socket.on("among_rematch_ready", () => {
    if (blockIfBanned(socket)) return;
    const room = amongRooms.get(socket.data.amongRoomCode);
    if (!room || room.state !== "ended") return;
    room.rematchReady.add(socket.id);
    amongBroadcast(room.code);

    if (room.rematchReady.size >= room.players.length && room.players.length >= 4) {
      room.rematchReady.clear();
      amongStartGame(room);
    }
  });

  socket.on("among_leave_queue", () => {
    removeFromAmongQueue(socket.id);
    io.emit("among_queue_update", amongQueueView());
  });

  socket.on("among_chat_send", ({ text }) => {
    if (blockIfBanned(socket)) return;
    if (isRateLimited(socket, "among_chat_send", 350, "among_chat_send")) {
      return;
    }

    const roomCode = socket.data.amongRoomCode;
    const room = amongRooms.get(roomCode);
    if (!room) return;

    const sender = room.players.find((entry) => entry.id === socket.id);
    if (!sender) return;
    const adminMute = getAmongAdminMute(sender.fingerprint);
    if (adminMute) {
      socket.emit("among_error", `Admin muted you until ${new Date(adminMute.until).toLocaleString("de-DE")}.`);
      return;
    }

    const normalizedText = String(text || "").trim().slice(0, 220);
    if (!normalizedText) return;

    const entry = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      senderId: sender.id,
      senderName: sender.name,
      text: normalizedText,
      at: nowIso()
    };

    room.chat.push(entry);
    if (room.chat.length > 80) {
      room.chat.shift();
    }

    io.to(room.code).emit("among_chat_message", entry);
  });

  socket.on("among_voice_offer", ({ targetId, sdp }) => {
    if (blockIfBanned(socket)) return;
    if (!amongCanRelayVoice(socket, targetId)) return;
    if (!sdp || typeof sdp.sdp !== "string" || typeof sdp.type !== "string") return;
    if (sdp.sdp.length > 20000) return;
    io.to(String(targetId)).emit("among_voice_offer", {
      fromId: socket.id,
      sdp
    });
  });

  socket.on("among_voice_answer", ({ targetId, sdp }) => {
    if (blockIfBanned(socket)) return;
    if (!amongCanRelayVoice(socket, targetId)) return;
    if (!sdp || typeof sdp.sdp !== "string" || typeof sdp.type !== "string") return;
    if (sdp.sdp.length > 20000) return;
    io.to(String(targetId)).emit("among_voice_answer", {
      fromId: socket.id,
      sdp
    });
  });

  socket.on("among_voice_ice", ({ targetId, candidate }) => {
    if (blockIfBanned(socket)) return;
    if (!amongCanRelayVoice(socket, targetId)) return;
    if (!candidate || typeof candidate.candidate !== "string") return;
    if (candidate.candidate.length > 1500) return;
    io.to(String(targetId)).emit("among_voice_ice", {
      fromId: socket.id,
      candidate
    });
  });

  socket.on("among_leave_room", () => {
    const roomCode = socket.data.amongRoomCode;
    if (!roomCode) return;
    socket.leave(roomCode);
    removeFromAmongQueue(socket.id);
    amongRemoveSocket(socket, "leave");
    socket.emit("among_left");
  });

  // --- Quiz-Duell (2 players, online by room code) ---
  socket.on("quiz_create_room", ({ name, questionCount }) => {
    if (isRateLimited(socket, "quiz_create_room", 900, "quiz_create_room")) {
      socket.emit("quiz_error", "Bitte kurz warten.");
      return;
    }

    quizLeaveSocket(socket);

    const trimmedName = validName(name);
    if (!trimmedName) {
      socket.emit("quiz_error", "Bitte einen Namen eingeben.");
      return;
    }

    const requested = Math.round(Number(questionCount || 10));
    const count = Math.max(4, Math.min(40, Number.isFinite(requested) ? requested : 10));
    if (count > QUIZ_DUEL_QUESTIONS.length) {
      socket.emit("quiz_error", `Zu wenig Fragen im Pool (${QUIZ_DUEL_QUESTIONS.length}).`);
      return;
    }

    const code = createQuizCode();
    const room = {
      code,
      players: [{ id: socket.id, name: trimmedName }],
      scores: [0, 0],
      questionCount: count,
      started: false,
      order: null,
      currentIndex: 0,
      turnPlayerIndex: 0,
      answered: false,
      cooldownTimer: null
    };

    quizRooms.set(code, room);
    socket.join(code);
    socket.data.quizRoomCode = code;
    socket.data.quizPlayerIndex = 0;

    socket.emit("quiz_room_created", {
      code,
      playerIndex: 0,
      players: room.players.map((p) => p.name),
      scores: room.scores
    });
    quizBroadcastRoom(room);
  });

  socket.on("quiz_join_room", ({ name, code }) => {
    if (isRateLimited(socket, "quiz_join_room", 800, "quiz_join_room")) {
      socket.emit("quiz_error", "Bitte kurz warten.");
      return;
    }

    quizLeaveSocket(socket);

    const trimmedName = validName(name);
    const normalizedCode = String(code || "").trim().toUpperCase();
    if (!trimmedName || !normalizedCode) {
      socket.emit("quiz_error", "Name und Code sind erforderlich.");
      return;
    }

    const room = quizRooms.get(normalizedCode);
    if (!room) {
      socket.emit("quiz_error", "Raum nicht gefunden.");
      return;
    }
    if (room.started) {
      socket.emit("quiz_error", "Spiel läuft schon.");
      return;
    }
    if (room.players.length >= 2) {
      socket.emit("quiz_error", "Raum ist voll.");
      return;
    }

    room.players.push({ id: socket.id, name: trimmedName });
    socket.join(room.code);
    socket.data.quizRoomCode = room.code;
    socket.data.quizPlayerIndex = 1;

    socket.emit("quiz_joined", {
      code: room.code,
      playerIndex: 1,
      players: room.players.map((p) => p.name),
      scores: room.scores
    });

    quizBroadcastRoom(room);

    // Start game automatically when 2nd player joins.
    room.started = true;
    room.currentIndex = 0;
    room.turnPlayerIndex = 0;
    room.answered = false;
    room.order = shuffleList([...Array(QUIZ_DUEL_QUESTIONS.length).keys()]).slice(0, room.questionCount);
    quizBroadcastRoom(room);
    quizSendQuestion(room);
  });

  socket.on("quiz_answer", ({ code, selectedIndex }) => {
    if (isRateLimited(socket, "quiz_answer", 250, "quiz_answer")) {
      return;
    }

    const normalizedCode = String(code || "").trim().toUpperCase();
    const room = quizRooms.get(normalizedCode);
    if (!room || !room.started) return;
    if (socket.data.quizRoomCode !== room.code) return;

    const currentPlayer = room.players[room.turnPlayerIndex];
    if (!currentPlayer || currentPlayer.id !== socket.id) return;
    if (room.answered) return;

    const idx = Math.max(0, Math.min(3, Math.round(Number(selectedIndex))));
    const q = QUIZ_DUEL_QUESTIONS[room.order[room.currentIndex]];
    const correctIndex = q.c;
    const correct = idx === correctIndex;
    if (correct) {
      room.scores[room.turnPlayerIndex] += 1;
    }

    room.answered = true;
    io.to(room.code).emit("quiz_reveal", {
      code: room.code,
      correctIndex,
      selectedIndex: idx,
      correct,
      correctAnswer: q.a[correctIndex],
      scores: room.scores
    });

    if (room.cooldownTimer) {
      clearTimeout(room.cooldownTimer);
    }
    room.cooldownTimer = setTimeout(() => {
      const liveRoom = quizRooms.get(room.code);
      if (!liveRoom) return;

      liveRoom.currentIndex += 1;
      liveRoom.turnPlayerIndex = (liveRoom.turnPlayerIndex + 1) % 2;
      liveRoom.answered = false;

      if (liveRoom.currentIndex >= liveRoom.questionCount) {
        io.to(liveRoom.code).emit("quiz_game_over", {
          code: liveRoom.code,
          players: liveRoom.players.map((p) => p.name),
          scores: liveRoom.scores
        });
        quizCleanupRoom(liveRoom);
        return;
      }

      quizSendQuestion(liveRoom);
    }, 2000);
  });

  socket.on("quiz_leave_room", () => {
    quizLeaveSocket(socket);
  });

  socket.on("create_room", ({ name }) => {
    if (isRateLimited(socket, "create_room", 900, "create_room")) {
      socket.emit("error_message", "Bitte kurz warten.");
      return;
    }

    const trimmedName = validName(name);
    if (!trimmedName) {
      socket.emit("error_message", "Bitte einen Namen eingeben.");
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
        imposter: 0,
        joker: 0
      },
      phaseTimer: null,
      phaseEndsAt: null,
      playerStats: {},
      reconnectTokens: {},
      recentPlayers: []
    };

    updateStatName(room, trimmedName);
    room.recentPlayers.push(trimmedName);
    rooms.set(code, room);
    socket.join(code);
    socket.data.roomCode = code;
    socket.data.participantType = "player";

    socket.emit("joined", { room: getRoomView(room, socket.id), selfId: socket.id, participantType: "player" });
    broadcastRoom(code);
  });

  socket.on("join_room", ({ name, code, pin, spectator = false, rejoin = false }) => {
    if (isRateLimited(socket, "join_room", 800, "join_room")) {
      socket.emit("error_message", "Bitte kurz warten.");
      return;
    }

    const trimmedName = validName(name);
    const normalizedCode = String(code || "").trim().toUpperCase();
    const normalizedPin = String(pin || "").trim();
    const joinAsSpectator = !!spectator;

    if (!trimmedName || !normalizedCode) {
      socket.emit("error_message", "Name und Raumcode sind erforderlich.");
      return;
    }

    const room = rooms.get(normalizedCode);
    if (!room) {
      socket.emit("error_message", "Raum nicht gefunden.");
      return;
    }

    if (room.settings.requirePin && room.pin !== normalizedPin) {
      socket.emit("error_message", "Falsche PIN.");
      return;
    }

    const token = room.reconnectTokens[trimmedName.toLowerCase()];
    const validReconnect = token && token.expiresAt > Date.now() && rejoin;

    if (room.settings.lobbyLocked && !validReconnect) {
      socket.emit("error_message", "Lobby ist gesperrt.");
      return;
    }

    if (!joinAsSpectator && room.players.length >= 12) {
      socket.emit("error_message", "Raum ist voll.");
      return;
    }

    if (room.state === "round" || room.state === "vote") {
      if (!joinAsSpectator && !validReconnect) {
        socket.emit("error_message", "Runde läuft. Bitte als Zuschauer beitreten.");
        return;
      }
    }

    const duplicateInPlayers = room.players.some((player) => player.name.toLowerCase() === trimmedName.toLowerCase());
    const duplicateInSpectators = room.spectators.some((spec) => spec.name.toLowerCase() === trimmedName.toLowerCase());

    if ((duplicateInPlayers || duplicateInSpectators) && !validReconnect) {
      socket.emit("error_message", "Name ist bereits vergeben.");
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
          message: "Du bist während einer aktiven Runde beigetreten und bist bis zur nächsten Runde Zuschauer."
        });
        room.players = room.players.filter((player) => player.id !== socket.id);
        attachSpectator(room, socket, trimmedName, false);
      }
    }

    broadcastRoom(normalizedCode);
  });

  socket.on("update_name", ({ name }) => {
    if (isRateLimited(socket, "update_name", 500, "update_name")) {
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

    const duplicate = [...room.players, ...room.spectators].some(
      (entry) => entry.id !== socket.id && entry.name.toLowerCase() === nextName.toLowerCase()
    );
    if (duplicate) {
      socket.emit("error_message", "Name ist bereits vergeben.");
      return;
    }

    const oldPlayer = room.players.find((player) => player.id === socket.id);
    const oldSpectator = room.spectators.find((spec) => spec.id === socket.id);
    const oldName = oldPlayer ? oldPlayer.name : oldSpectator ? oldSpectator.name : null;

    if (!oldName) {
      socket.emit("error_message", "Spieler nicht gefunden.");
      return;
    }

    if (oldPlayer) {
      oldPlayer.name = nextName;
    } else {
      oldSpectator.name = nextName;
    }

    updateStatName(room, nextName);

    socket.emit("name_updated", { name: nextName });
    broadcastRoom(roomCode);
  });

  socket.on("set_content_filter", ({ filter }) => {
    if (isRateLimited(socket, "set_content_filter", 350, "set_content_filter")) {
      socket.emit("error_message", "Bitte kurz warten.");
      return;
    }

    const room = getHostRoom(socket);
    if (!room) return;
    if (room.state !== "lobby") {
      socket.emit("error_message", "Filter kann nur in der Lobby geändert werden.");
      return;
    }

    const normalizedFilter = String(filter || "").toLowerCase();
    if (!CONTENT_FILTERS.includes(normalizedFilter)) {
      socket.emit("error_message", "Ungültiger Filter.");
      return;
    }

    room.settings.contentFilter = normalizedFilter;
    broadcastRoom(room.code);
  });

  socket.on("add_custom_prompt", ({ kind, text }) => {
    if (isRateLimited(socket, "add_custom_prompt", 350, "add_custom_prompt")) {
      socket.emit("error_message", "Bitte kurz warten.");
      return;
    }

    const room = getHostRoom(socket);
    if (!room) return;

    const normalizedKind = String(kind || "").toLowerCase();
    const normalizedText = String(text || "").trim().slice(0, 180);
    if (!["wahrheit", "pflicht"].includes(normalizedKind) || !normalizedText) {
      socket.emit("error_message", "Ungültige Frage/Aufgabe.");
      return;
    }

    room.customPrompts[normalizedKind].push(normalizedText);
    broadcastRoom(room.code);
  });

  socket.on("list_prompt_packs", () => {
    const list = [...sharedPromptPacks.values()].slice(-30).reverse().map((entry) => ({
      id: entry.id,
      name: entry.name,
      by: entry.by,
      truthCount: entry.truth.length,
      dareCount: entry.dare.length,
      createdAt: entry.createdAt
    }));
    socket.emit("prompt_packs", list);
  });

  socket.on("share_prompt_pack", ({ name }) => {
    const room = getHostRoom(socket);
    if (!room) return;

    const packName = String(name || "").trim().slice(0, 40);
    if (!packName) {
      socket.emit("error_message", "Pack-Name fehlt.");
      return;
    }

    const truth = room.customPrompts.wahrheit.slice(-80);
    const dare = room.customPrompts.pflicht.slice(-80);
    if (truth.length + dare.length < 4) {
      socket.emit("error_message", "Mindestens 4 Custom-Prompts nötig.");
      return;
    }

    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    sharedPromptPacks.set(id, {
      id,
      name: packName,
      by: room.players.find((entry) => entry.id === socket.id)?.name || "Host",
      truth,
      dare,
      createdAt: nowIso()
    });

    socket.emit("pack_shared", { id, name: packName });
  });

  socket.on("import_prompt_pack", ({ id }) => {
    const room = getHostRoom(socket);
    if (!room) return;

    const pack = sharedPromptPacks.get(String(id || ""));
    if (!pack) {
      socket.emit("error_message", "Pack nicht gefunden.");
      return;
    }

    room.customPrompts.wahrheit = [...new Set([...room.customPrompts.wahrheit, ...pack.truth])].slice(-140);
    room.customPrompts.pflicht = [...new Set([...room.customPrompts.pflicht, ...pack.dare])].slice(-140);
    broadcastRoom(room.code);
  });

  socket.on("toggle_lobby_lock", () => {
    if (isRateLimited(socket, "toggle_lobby_lock", 350, "toggle_lobby_lock")) {
      socket.emit("error_message", "Bitte kurz warten.");
      return;
    }

    const room = getHostRoom(socket);
    if (!room) return;

    room.settings.lobbyLocked = !room.settings.lobbyLocked;
    broadcastRoom(room.code);
  });

  socket.on("toggle_mute_player", ({ targetId }) => {
    if (isRateLimited(socket, "toggle_mute_player", 350, "toggle_mute_player")) {
      socket.emit("error_message", "Bitte kurz warten.");
      return;
    }

    const room = getHostRoom(socket);
    if (!room) return;

    const normalizedTargetId = String(targetId || "");
    if (!normalizedTargetId || normalizedTargetId === socket.id) {
      socket.emit("error_message", "Ungültiger Spieler.");
      return;
    }

    const target = room.players.find((player) => player.id === normalizedTargetId);
    if (!target) {
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

  socket.on("kick_player", ({ targetId }) => {
    if (isRateLimited(socket, "kick_player", 450, "kick_player")) {
      socket.emit("error_message", "Bitte kurz warten.");
      return;
    }

    const room = getHostRoom(socket);
    if (!room) return;

    const normalizedTargetId = String(targetId || "");
    if (!normalizedTargetId || normalizedTargetId === socket.id) {
      socket.emit("error_message", "Ungültiger Spieler.");
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
      message: "Du wurdest vom Host aus dem Raum entfernt."
    });
    broadcastRoom(room.code);
  });

  socket.on("start_round", () => {
    if (isRateLimited(socket, "start_round", 600, "start_round")) {
      socket.emit("error_message", "Bitte kurz warten.");
      return;
    }

    const room = getHostRoom(socket);
    if (!room) return;

    if (room.state !== "lobby" && room.state !== "ended") {
      socket.emit("error_message", "Runde kann gerade nicht gestartet werden.");
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
      socket.emit("error_message", "Bitte kurz warten.");
      return;
    }

    const room = getHostRoom(socket);
    if (!room) return;

    if (room.state !== "round") {
      socket.emit("error_message", "Abstimmung kann gerade nicht gestartet werden.");
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
      socket.emit("error_message", "Du bist stummgeschaltet und kannst nicht abstimmen.");
      return;
    }

    if (room.votes[socket.id]) {
      socket.emit("error_message", "Du hast bereits abgestimmt.");
      return;
    }

    const normalizedTargetId = String(targetId || "");
    const validTarget = room.players.some((player) => player.id === normalizedTargetId);
    if (!validTarget || normalizedTargetId === socket.id) {
      socket.emit("error_message", "Ungültige Stimme.");
      return;
    }

    room.votes[socket.id] = normalizedTargetId;
    broadcastRoom(roomCode);
    tryAutoFinishVote(room);
  });

  socket.on("new_round", () => {
    if (isRateLimited(socket, "new_round", 600, "new_round")) {
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

  socket.on("abort_round", () => {
    if (isRateLimited(socket, "abort_round", 600, "abort_round")) {
      socket.emit("error_message", "Bitte kurz warten.");
      return;
    }

    const room = getHostRoom(socket);
    if (!room) return;

    if (room.state !== "round" && room.state !== "vote") {
      socket.emit("error_message", "Es läuft aktuell keine Runde.");
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
    io.emit("among_queue_update", amongQueueView());
    removeParticipantFromRoom(socket, "disconnect");
    quizLeaveSocket(socket);
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
  console.log(`Hochstapler-Spiel läuft auf http://localhost:${PORT}`);
});
