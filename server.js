const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const multer = require("multer");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");

const app = express();
const server = http.createServer(app);
app.disable("x-powered-by");
app.set("trust proxy", 1);
const STATIC_SITE_DIR = String(process.env.STATIC_SITE_DIR || "public").trim() || "public";
const PUBLIC_STATIC_DIR = path.resolve(__dirname, STATIC_SITE_DIR);

function parseSocketIoCorsOrigin(raw) {
  const value = String(raw || "").trim();
  if (!value) return true; // reflect request origin
  if (value === "*") return "*";
  const list = value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (list.length === 0) return true;
  if (list.length === 1) return list[0];
  return list;
}

const io = new Server(server, {
  cors: {
    origin: parseSocketIoCorsOrigin(process.env.SOCKET_IO_CORS_ORIGIN),
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;
const ADMIN_OWNER_KEY = String(process.env.ADMIN_OWNER_KEY || process.env.ADMIN_KEY || "Anna").trim();
const ADMIN_EDITOR_KEY = String(process.env.ADMIN_EDITOR_KEY || "hanno123").trim();
const ADMIN_BOOTSTRAP_CODES = String(process.env.ADMIN_ACCESS_CODES || "").trim();
const AI_ENABLED_BY_DEFAULT = String(process.env.AI_ENABLED || "true").trim().toLowerCase() !== "false";
const AI_PROVIDER = String(process.env.AI_PROVIDER || "github").trim().toLowerCase();
const OPENAI_API_KEY = String(process.env.OPENAI_API_KEY || "").trim();
const OPENAI_MODEL = String(process.env.QUIZ_AI_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini").trim();
const GITHUB_TOKEN = String(process.env.GITHUB_TOKEN || process.env.GITHUB_MODELS_TOKEN || "").trim();
const GITHUB_MODEL = String(process.env.GITHUB_MODEL || "microsoft/Phi-3.5-mini-instruct").trim();
const GITHUB_MODEL_FALLBACKS = String(
  process.env.GITHUB_MODEL_FALLBACKS
    || "gpt-4o-mini,openai/gpt-4o-mini,gpt-4.1-mini,openai/gpt-4.1-mini,meta/Llama-3.2-3B-Instruct,microsoft/Phi-3.5-mini-instruct,microsoft/phi-3.5-mini-instruct"
)
  .split(",")
  .map((entry) => entry.trim())
  .filter(Boolean);
const GITHUB_MODELS_ENDPOINT = String(
  process.env.GITHUB_MODELS_ENDPOINT || "https://models.inference.ai.azure.com/chat/completions"
).trim();
const SCRIMS_API_BASE = String(process.env.SCRIMS_API_BASE || "").trim().replace(/\/+$/, "");
const SCRIMS_API_BASES = String(process.env.SCRIMS_API_BASES || "")
  .split(",")
  .map((entry) => String(entry || "").trim().replace(/\/+$/, ""))
  .filter(Boolean);
const SCRIMS_API_KEY = String(process.env.SCRIMS_API_KEY || "").trim();
const SCRIMS_DISCORD_CLIENT_ID = String(process.env.DISCORD_CLIENT_ID || "").trim();
const SCRIMS_DISCORD_CLIENT_SECRET = String(process.env.DISCORD_CLIENT_SECRET || "").trim();
const SCRIMS_DISCORD_REDIRECT_URI = String(process.env.DISCORD_REDIRECT_URI || "https://hanno-s-website.onrender.com/auth/discord/callback").trim();
const SCRIMS_DISCORD_TOKEN = String(process.env.DISCORD_TOKEN || process.env.TOKEN || process.env.BOT_TOKEN || process.env.DISCORD_BOT_TOKEN || "").trim();
const SCRIMS_GUILD_ID = String(process.env.SCRIMS_GUILD_ID || process.env.DISCORD_GUILD_ID || process.env.GUILD_ID || "").trim();
const SCRIMS_DROPMAP_PATH = path.join(__dirname, "dropmap_web_marks.json");
const SCRIMS_CREATE_HISTORY_PATH = path.join(__dirname, "scrims_create_history.json");
const DISCORD_COMMANDS_PATH = path.join(__dirname, "discord_commands.json");
const DISCORD_COMMANDS_FALLBACK_PATH = path.join(os.tmpdir(), "hanno_discord_commands.json");
const WICK_SETTINGS_PATH = path.join(__dirname, "wick_settings.json");
const WICK_SETTINGS_FALLBACK_PATH = path.join(os.tmpdir(), "hanno_wick_settings.json");
const DISCORD_COMMANDS_STORAGE = String(process.env.DISCORD_COMMANDS_STORAGE || "github").trim().toLowerCase();
const DISCORD_COMMANDS_GITHUB_REPO = String(process.env.DISCORD_COMMANDS_GITHUB_REPO || "Hanno123345234/Hanno-s-website").trim();
const DISCORD_COMMANDS_GITHUB_PATH = String(process.env.DISCORD_COMMANDS_GITHUB_PATH || "data/discord_commands.json").trim();
const DISCORD_COMMANDS_GITHUB_BRANCH = String(process.env.DISCORD_COMMANDS_GITHUB_BRANCH || "main").trim();
const DISCORD_COMMANDS_GITHUB_TOKEN = String(process.env.DISCORD_COMMANDS_GITHUB_TOKEN || GITHUB_TOKEN).trim();
const WICK_SETTINGS_GITHUB_REPO = String(process.env.WICK_SETTINGS_GITHUB_REPO || DISCORD_COMMANDS_GITHUB_REPO).trim();
const WICK_SETTINGS_GITHUB_PATH = String(process.env.WICK_SETTINGS_GITHUB_PATH || "data/wick_settings.json").trim();
const WICK_SETTINGS_GITHUB_BRANCH = String(process.env.WICK_SETTINGS_GITHUB_BRANCH || DISCORD_COMMANDS_GITHUB_BRANCH).trim();
const WICK_SETTINGS_GITHUB_TOKEN = String(process.env.WICK_SETTINGS_GITHUB_TOKEN || DISCORD_COMMANDS_GITHUB_TOKEN).trim();
const DISCORD_COMMANDS_BOT_KEY = String(process.env.DISCORD_COMMANDS_BOT_KEY || "").trim();
const DISCORD_COMMANDS_ALLOW_PUBLIC_READ = String(process.env.DISCORD_COMMANDS_ALLOW_PUBLIC_READ || "false").trim().toLowerCase() === "true";
const BOT_DYNAMIC_COMMANDS_REFRESH_URL = String(process.env.BOT_DYNAMIC_COMMANDS_REFRESH_URL || "").trim();
const BOT_DYNAMIC_COMMANDS_REFRESH_KEY = String(process.env.BOT_DYNAMIC_COMMANDS_REFRESH_KEY || "").trim();
const BOT_WICK_SETTINGS_REFRESH_URL = String(process.env.BOT_WICK_SETTINGS_REFRESH_URL || BOT_DYNAMIC_COMMANDS_REFRESH_URL).trim();
const BOT_WICK_SETTINGS_REFRESH_KEY = String(process.env.BOT_WICK_SETTINGS_REFRESH_KEY || BOT_DYNAMIC_COMMANDS_REFRESH_KEY).trim();
let discordCommandsCache = null;
let discordCommandsPersistOk = true;
let discordCommandsPersistError = null;
let discordCommandsPersistPath = DISCORD_COMMANDS_PATH;
let discordCommandsGithubSha = null;
let wickSettingsCache = null;
let wickSettingsPersistOk = true;
let wickSettingsPersistError = null;
let wickSettingsPersistPath = WICK_SETTINGS_PATH;
let wickSettingsGithubSha = null;
const scrimsWebSessions = new Map();
const scrimsOAuthStates = new Map();
const SCRIMS_SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7;
const SCRIMS_OAUTH_STATE_MAX_AGE_MS = 1000 * 60 * 10;
const CLIPS_STORAGE_DIR = path.resolve(String(process.env.CLIPS_STORAGE_DIR || path.join(__dirname, "data", "clips")).trim());
const CLIPS_PUBLIC_DIR = path.join(CLIPS_STORAGE_DIR, "files");
const CLIPS_INDEX_PATH = path.join(CLIPS_STORAGE_DIR, "index.json");
const CLIPS_MAX_SIZE_MB = Math.max(10, Math.min(2048, Number(process.env.CLIPS_MAX_SIZE_MB || 200)));
const CLIPS_MAX_FILE_SIZE_BYTES = CLIPS_MAX_SIZE_MB * 1024 * 1024;
const CLIPS_RETENTION_DAYS = Math.max(1, Math.min(365, Number(process.env.CLIPS_RETENTION_DAYS || 10)));
const CLIPS_RETENTION_MS = CLIPS_RETENTION_DAYS * 24 * 60 * 60 * 1000;
const CLIPS_CLEANUP_INTERVAL_MS = 1000 * 60 * 60 * 6;
const CLIPS_GALLERY_DEFAULT_LIMIT = 12;
const CLIPS_GALLERY_MAX_LIMIT = 50;
const CLIPS_PUBLIC_LOCKDOWN = String(process.env.CLIPS_PUBLIC_LOCKDOWN || "false").trim().toLowerCase() === "true";
const CLIPS_OWNER_COOKIE_ID = "clip_owner_id";
const CLIPS_OWNER_COOKIE_SIG = "clip_owner_sig";
const CLIPS_OWNER_SECRET = String(process.env.CLIPS_OWNER_SECRET || process.env.SESSION_SECRET || `${ADMIN_OWNER_KEY}:${ADMIN_EDITOR_KEY}:clips-owner-v1`).trim();
const CLIPS_ACCESS_CODE = String(process.env.CLIPS_ACCESS_CODE || "Anna").trim();
const CLIPS_ACCESS_COOKIE = "clip_access_token";
const CLIPS_ACCESS_SECRET = String(process.env.CLIPS_ACCESS_SECRET || CLIPS_OWNER_SECRET).trim();
const CLIPS_ACCESS_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7;
const CLIPS_OWNER_ID_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 365;
const CLIPS_MUTATION_RATE_LIMIT_WINDOW_MS = 1000 * 60 * 10;
const CLIPS_MUTATION_RATE_LIMIT_MAX = 30;
const GLOBAL_API_RATE_LIMIT_WINDOW_MS = 1000 * 60;
const GLOBAL_API_RATE_LIMIT_MAX = Math.max(60, Number(process.env.GLOBAL_API_RATE_LIMIT_MAX || 240));
const MODMAIL_STORE_PATH = path.join(CLIPS_STORAGE_DIR, "modmail_messages.json");
const MODMAIL_MAX_ENTRIES = 3000;
const MODMAIL_RATE_LIMIT_WINDOW_MS = 1000 * 60 * 10;
const MODMAIL_RATE_LIMIT_MAX = 6;
const modmailRateLimit = new Map();
const clipsMutationRateLimit = new Map();
const ALLOWED_VIDEO_MIME_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-matroska",
  "video/ogg"
]);

try {
  fs.mkdirSync(CLIPS_PUBLIC_DIR, { recursive: true });
} catch (error) {
  console.error("Failed to create clips directory:", error);
}

app.use((req, res, next) => {
  res.set("X-Content-Type-Options", "nosniff");
  res.set("X-Frame-Options", "SAMEORIGIN");
  res.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (req.secure) {
    res.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
});

app.use((req, res, next) => {
  if (req.path === "/" || req.path.endsWith(".html")) {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
  }
  next();
});

app.use((req, res, next) => {
  if (!CLIPS_PUBLIC_LOCKDOWN) {
    next();
    return;
  }

  if (req.path === "/") {
    res.redirect(302, "/clips");
    return;
  }

  const allowedExactPaths = new Set([
    "/clips",
    "/admin",
    "/admin.js",
    "/styles.css",
    "/pwa.js",
    "/manifest.webmanifest",
    "/api/admin",
    "/api/clips/auth",
    "/api/clips/auth-status",
    "/api/clips/upload",
    "/api/clips/latest",
    "/api/modmail/create"
  ]);

  const allowedPrefixPaths = [
    "/clip/",
    "/clip-files/",
    "/api/clips/",
    "/api/admin/"
  ];

  const isAllowed = allowedExactPaths.has(req.path)
    || allowedPrefixPaths.some((prefix) => req.path.startsWith(prefix));

  if (isAllowed) {
    next();
    return;
  }

  const wantsJson = String(req.headers.accept || "").includes("application/json") || req.path.startsWith("/api/");
  if (wantsJson) {
    res.status(403).json({ ok: false, error: "This service only allows clip upload and clip viewing." });
    return;
  }

  res.status(403).type("text/plain; charset=utf-8").send("Access denied. This service is limited to the clip upload area.");
});

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "same-origin" }
}));

const globalApiLimiter = rateLimit({
  windowMs: GLOBAL_API_RATE_LIMIT_WINDOW_MS,
  max: GLOBAL_API_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    error: "Too many requests. Please retry in a minute."
  }
});

app.use("/api", globalApiLimiter);

app.use((req, res, next) => {
  if (req.method !== "GET") {
    next();
    return;
  }

  const rawPath = String(req.path || "").trim();
  if (!rawPath) {
    next();
    return;
  }

  if (rawPath.endsWith(".html")) {
    const cleanPath = rawPath.slice(0, -5) || "/";
    res.redirect(301, cleanPath);
    return;
  }

  const blockedPrefix = rawPath.startsWith("/api/")
    || rawPath.startsWith("/auth/")
    || rawPath.startsWith("/clip/")
    || rawPath.startsWith("/clip-files/")
    || rawPath.startsWith("/clips/");

  if (blockedPrefix) {
    next();
    return;
  }

  const htmlRelative = rawPath === "/" ? "index.html" : `${rawPath.slice(1)}.html`;
  const htmlAbs = path.join(PUBLIC_STATIC_DIR, htmlRelative);
  if (!htmlAbs.startsWith(PUBLIC_STATIC_DIR)) {
    next();
    return;
  }

  if (fs.existsSync(htmlAbs) && fs.statSync(htmlAbs).isFile()) {
    res.sendFile(htmlAbs);
    return;
  }

  next();
});

app.use(express.static(PUBLIC_STATIC_DIR));
app.use("/clip-files", clipsRequireAccess, express.static(CLIPS_PUBLIC_DIR));
app.use(express.json({ limit: "256kb" }));

function scrimsNowMs() {
  return Date.now();
}

function scrimsRandomToken(bytes = 24) {
  return crypto.randomBytes(bytes).toString("hex");
}

function scrimsAuthFailureRedirect(reason = "callback") {
  const safeReason = String(reason || "callback").trim() || "callback";
  return `/dropmap.html?auth=failed&reason=${encodeURIComponent(safeReason)}`;
}

function clipsLoadIndex() {
  const state = scrimsLoadJson(CLIPS_INDEX_PATH, { items: {} });
  if (!state || typeof state !== "object") return { items: {} };
  if (!state.items || typeof state.items !== "object") state.items = {};
  return state;
}

function clipsSaveIndex(data) {
  return scrimsSaveJson(CLIPS_INDEX_PATH, data);
}

function clipsCreateId() {
  return crypto.randomBytes(9).toString("hex");
}

function clipsSafeFileExt(file = {}) {
  const byMime = {
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/quicktime": ".mov",
    "video/x-matroska": ".mkv",
    "video/ogg": ".ogv"
  };

  if (byMime[file.mimetype]) return byMime[file.mimetype];

  const ext = path.extname(String(file.originalname || "")).toLowerCase();
  if ([".mp4", ".webm", ".mov", ".mkv", ".ogv"].includes(ext)) return ext;
  return ".mp4";
}

function clipsEscapeHtml(raw) {
  return String(raw || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function clipsBaseUrl(req) {
  return `${req.protocol}://${req.get("host")}`;
}

function clipsParseTimestamp(value) {
  const ts = Date.parse(String(value || ""));
  return Number.isFinite(ts) ? ts : 0;
}

function clipsBuildVideoPath(fileName = "") {
  return `/clip-files/${encodeURIComponent(String(fileName || ""))}`;
}

function clipsBuildSharePath(id = "") {
  return `/clip/${encodeURIComponent(String(id || ""))}`;
}

function clipsSafeEqualText(leftRaw = "", rightRaw = "") {
  try {
    const left = Buffer.from(String(leftRaw || ""), "utf8");
    const right = Buffer.from(String(rightRaw || ""), "utf8");
    if (left.length !== right.length) return false;
    return crypto.timingSafeEqual(left, right);
  } catch (error) {
    return false;
  }
}

function clipsSignAccessPayload(payload = "") {
  return crypto.createHmac("sha256", CLIPS_ACCESS_SECRET).update(String(payload || "")).digest("hex");
}

function clipsCreateAccessToken() {
  const expiresAt = Date.now() + CLIPS_ACCESS_MAX_AGE_MS;
  const payload = `v1.${expiresAt}`;
  const signature = clipsSignAccessPayload(payload);
  return `${payload}.${signature}`;
}

function clipsHasValidAccess(req) {
  const cookies = scrimsParseCookies(req);
  const token = String(cookies[CLIPS_ACCESS_COOKIE] || "").trim();
  if (!token) return false;

  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return false;

  const expiresAt = Number(parts[1]);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return false;

  const payload = `${parts[0]}.${parts[1]}`;
  const expectedSig = clipsSignAccessPayload(payload);
  if (!/^[a-f0-9]{64}$/.test(parts[2])) return false;
  return clipsSafeEqualText(parts[2], expectedSig);
}

function clipsGrantAccess(req, res) {
  const token = clipsCreateAccessToken();
  const secureCookie = req.secure || String(req.get("x-forwarded-proto") || "").toLowerCase() === "https";
  appendSetCookie(res, scrimsSerializeCookie(CLIPS_ACCESS_COOKIE, token, {
    maxAge: Math.floor(CLIPS_ACCESS_MAX_AGE_MS / 1000),
    sameSite: "Strict",
    secure: secureCookie
  }));
}

function clipsRequireAccess(req, res, next) {
  if (clipsHasValidAccess(req)) {
    next();
    return;
  }

  const wantsJson = req.path.startsWith("/api/") || String(req.headers.accept || "").includes("application/json");
  if (wantsJson) {
    res.status(401).json({ ok: false, error: "Access code required." });
    return;
  }

  res.status(401).type("text/plain; charset=utf-8").send("Access code required.");
}

function clipsSignOwnerId(ownerId = "") {
  return crypto.createHmac("sha256", CLIPS_OWNER_SECRET).update(String(ownerId || "")).digest("hex");
}

function clipsCreateOwnerId() {
  return `co_${crypto.randomBytes(12).toString("hex")}`;
}

function clipsParseOwnerCookies(req) {
  const cookies = scrimsParseCookies(req);
  const ownerId = String(cookies[CLIPS_OWNER_COOKIE_ID] || "").trim();
  const ownerSig = String(cookies[CLIPS_OWNER_COOKIE_SIG] || "").trim();
  if (!/^co_[a-f0-9]{24}$/.test(ownerId)) return "";
  if (!/^[a-f0-9]{64}$/.test(ownerSig)) return "";

  const expected = clipsSignOwnerId(ownerId);
  try {
    const left = Buffer.from(ownerSig, "hex");
    const right = Buffer.from(expected, "hex");
    if (left.length !== right.length) return "";
    if (!crypto.timingSafeEqual(left, right)) return "";
  } catch (error) {
    return "";
  }
  return ownerId;
}

function appendSetCookie(res, cookieValue) {
  const current = res.getHeader("Set-Cookie");
  if (!current) {
    res.setHeader("Set-Cookie", cookieValue);
    return;
  }
  if (Array.isArray(current)) {
    res.setHeader("Set-Cookie", [...current, cookieValue]);
    return;
  }
  res.setHeader("Set-Cookie", [String(current), cookieValue]);
}

function clipsEnsureOwnerSession(req, res) {
  const existing = clipsParseOwnerCookies(req);
  if (existing) return existing;

  const ownerId = clipsCreateOwnerId();
  const ownerSig = clipsSignOwnerId(ownerId);
  const cookieMaxAge = Math.floor(CLIPS_OWNER_ID_MAX_AGE_MS / 1000);
  const secureCookie = req.secure || String(req.get("x-forwarded-proto") || "").toLowerCase() === "https";
  appendSetCookie(res, scrimsSerializeCookie(CLIPS_OWNER_COOKIE_ID, ownerId, {
    maxAge: cookieMaxAge,
    sameSite: "Strict",
    secure: secureCookie
  }));
  appendSetCookie(res, scrimsSerializeCookie(CLIPS_OWNER_COOKIE_SIG, ownerSig, {
    maxAge: cookieMaxAge,
    sameSite: "Strict",
    secure: secureCookie
  }));
  return ownerId;
}

function clipsIsTrustedMutationRequest(req) {
  const host = String(req.get("host") || "").trim().toLowerCase();
  if (!host) return false;
  const candidates = [req.get("origin"), req.get("referer")].filter(Boolean);
  for (const raw of candidates) {
    try {
      const parsed = new URL(String(raw));
      if (String(parsed.host || "").trim().toLowerCase() !== host) return false;
    } catch (error) {
      return false;
    }
  }
  return true;
}

function clipsRateLimitKey(req, ownerId = "") {
  const ip = String(req.ip || req.headers["x-forwarded-for"] || "unknown").trim();
  return `${ownerId || "anon"}|${ip}`;
}

function clipsIsRateLimited(req, ownerId = "") {
  const key = clipsRateLimitKey(req, ownerId);
  const now = Date.now();
  const prev = clipsMutationRateLimit.get(key) || [];
  const kept = prev.filter((ts) => ts > now - CLIPS_MUTATION_RATE_LIMIT_WINDOW_MS);
  kept.push(now);
  clipsMutationRateLimit.set(key, kept);
  return kept.length > CLIPS_MUTATION_RATE_LIMIT_MAX;
}

function clipsListForOwner(index, ownerId, limit = CLIPS_GALLERY_DEFAULT_LIMIT) {
  const max = Math.max(1, Math.min(CLIPS_GALLERY_MAX_LIMIT, Number(limit) || CLIPS_GALLERY_DEFAULT_LIMIT));
  return Object.values(index.items || {})
    .filter((item) => item && item.id && item.fileName && item.ownerId === ownerId)
    .sort((a, b) => clipsParseTimestamp(b.uploadedAt) - clipsParseTimestamp(a.uploadedAt))
    .slice(0, max);
}

function clipsListLatest(index, limit = CLIPS_GALLERY_DEFAULT_LIMIT) {
  const max = Math.max(1, Math.min(CLIPS_GALLERY_MAX_LIMIT, Number(limit) || CLIPS_GALLERY_DEFAULT_LIMIT));
  return Object.values(index.items || {})
    .filter((item) => item && item.id && item.fileName)
    .sort((a, b) => clipsParseTimestamp(b.uploadedAt) - clipsParseTimestamp(a.uploadedAt))
    .slice(0, max);
}

function clipsTryDeleteFile(fileName = "") {
  try {
    const safeName = path.basename(String(fileName || ""));
    if (!safeName) return false;
    const absPath = path.join(CLIPS_PUBLIC_DIR, safeName);
    if (!fs.existsSync(absPath)) return false;
    fs.unlinkSync(absPath);
    return true;
  } catch (error) {
    return false;
  }
}

function clipsPurgeExpired(reason = "scheduled") {
  const now = Date.now();
  const threshold = now - CLIPS_RETENTION_MS;
  const index = clipsLoadIndex();
  let changed = false;
  let deletedCount = 0;

  for (const [clipId, item] of Object.entries(index.items || {})) {
    if (!item || !item.fileName) {
      delete index.items[clipId];
      changed = true;
      continue;
    }

    const uploadedAtMs = clipsParseTimestamp(item.uploadedAt);
    const isExpired = uploadedAtMs > 0 && uploadedAtMs <= threshold;
    const filePath = path.join(CLIPS_PUBLIC_DIR, path.basename(String(item.fileName || "")));
    const fileMissing = !fs.existsSync(filePath);

    if (!isExpired && !fileMissing) continue;

    clipsTryDeleteFile(item.fileName);
    delete index.items[clipId];
    changed = true;
    deletedCount += 1;
  }

  if (changed) {
    clipsSaveIndex(index);
    if (deletedCount > 0) {
      console.log(`[clips] Purged ${deletedCount} entries (${reason}). Retention=${CLIPS_RETENTION_DAYS}d`);
    }
  }
}

function clipsDeleteById(clipId = "", reason = "manual", deletedBy = "admin") {
  const id = String(clipId || "").trim();
  if (!id) return { ok: false, error: "Missing clip id." };

  const index = clipsLoadIndex();
  const item = index?.items?.[id];
  if (!item) return { ok: false, error: "Clip not found." };

  clipsTryDeleteFile(item.fileName);
  delete index.items[id];
  clipsSaveIndex(index);
  console.log(`[clips] Deleted ${id} (${reason}) by ${deletedBy}`);

  return { ok: true, item };
}

function modmailLoadState() {
  const state = scrimsLoadJson(MODMAIL_STORE_PATH, { items: [] });
  if (!state || typeof state !== "object") return { items: [] };
  if (!Array.isArray(state.items)) state.items = [];
  return state;
}

function modmailSaveState(state) {
  return scrimsSaveJson(MODMAIL_STORE_PATH, state);
}

function modmailNewId() {
  return `mm_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`;
}

function modmailNormalizeType(raw) {
  const value = String(raw || "").trim().toLowerCase();
  if (["bug", "change", "feedback", "other"].includes(value)) return value;
  return "other";
}

function modmailIsRateLimited(ipRaw) {
  const ip = String(ipRaw || "unknown").trim();
  const now = Date.now();
  const prev = modmailRateLimit.get(ip) || [];
  const kept = prev.filter((ts) => ts > now - MODMAIL_RATE_LIMIT_WINDOW_MS);
  kept.push(now);
  modmailRateLimit.set(ip, kept);
  return kept.length > MODMAIL_RATE_LIMIT_MAX;
}

function modmailSanitizeText(raw, max = 800) {
  return String(raw || "").trim().slice(0, max);
}

const clipsStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, CLIPS_PUBLIC_DIR);
  },
  filename: (req, file, cb) => {
    const clipId = clipsCreateId();
    req.clipId = clipId;
    cb(null, `${clipId}${clipsSafeFileExt(file)}`);
  }
});

const clipsUpload = multer({
  storage: clipsStorage,
  limits: {
    fileSize: CLIPS_MAX_FILE_SIZE_BYTES
  },
  fileFilter: (_req, file, cb) => {
    const mimetype = String(file.mimetype || "").toLowerCase();
    const ext = path.extname(String(file.originalname || "")).toLowerCase();
    const validExt = [".mp4", ".webm", ".mov", ".mkv", ".ogv"].includes(ext);
    if (ALLOWED_VIDEO_MIME_TYPES.has(mimetype) || validExt) {
      cb(null, true);
      return;
    }
    cb(new Error("Unsupported file type. Allowed: mp4, webm, mov, mkv, ogv"));
  }
});

function scrimsParseCookies(req) {
  const out = {};
  const raw = String((req && req.headers && req.headers.cookie) || "");
  if (!raw) return out;
  for (const chunk of raw.split(";")) {
    const i = chunk.indexOf("=");
    if (i < 0) continue;
    const k = chunk.slice(0, i).trim();
    const v = chunk.slice(i + 1).trim();
    if (!k) continue;
    out[k] = decodeURIComponent(v);
  }
  return out;
}

function scrimsSerializeCookie(name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(String(value || ""))}`];
  parts.push(`Path=${options.path || "/"}`);
  if (options.httpOnly !== false) parts.push("HttpOnly");
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  if (options.secure) parts.push("Secure");
  if (Number.isFinite(options.maxAge)) parts.push(`Max-Age=${Math.max(0, Math.floor(options.maxAge))}`);
  return parts.join("; ");
}

function scrimsPruneSessions() {
  const now = scrimsNowMs();
  for (const [sid, session] of scrimsWebSessions.entries()) {
    if (!session || Number(session.expiresAt || 0) <= now) scrimsWebSessions.delete(sid);
  }
  for (const [state, meta] of scrimsOAuthStates.entries()) {
    if (!meta || Number(meta.expiresAt || 0) <= now) scrimsOAuthStates.delete(state);
  }
}

function scrimsGetSession(req) {
  scrimsPruneSessions();
  const cookies = scrimsParseCookies(req);
  const sid = String(cookies.sid || "");
  if (!sid) return null;
  const session = scrimsWebSessions.get(sid) || null;
  if (!session) return null;
  if (Number(session.expiresAt || 0) <= scrimsNowMs()) {
    scrimsWebSessions.delete(sid);
    return null;
  }
  return session;
}

function scrimsDiscordAvatarUrl(user) {
  if (!user || !user.id) return "";
  if (user.avatar) return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`;
  let idx = 0;
  try { idx = Number(BigInt(String(user.id)) % 5n); } catch (error) {}
  return `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
}

function scrimsLoadJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return fallback;
  }
}

function scrimsSaveJson(filePath, data) {
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  const backupPath = `${filePath}.bak`;
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), "utf8");

    if (fs.existsSync(filePath)) {
      fs.copyFileSync(filePath, backupPath);
    }

    try {
      fs.renameSync(tmpPath, filePath);
    } catch (renameError) {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      fs.renameSync(tmpPath, filePath);
    }

    return true;
  } catch (error) {
    try {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    } catch (cleanupError) {}
    return false;
  }
}

function appendScrimsCreateHistory(entry) {
  const maxEntries = 2000;
  const state = scrimsLoadJson(SCRIMS_CREATE_HISTORY_PATH, { entries: [] });
  const list = Array.isArray(state && state.entries) ? state.entries : [];
  list.push({ at: new Date().toISOString(), ...entry });
  if (list.length > maxEntries) list.splice(0, list.length - maxEntries);
  return scrimsSaveJson(SCRIMS_CREATE_HISTORY_PATH, { entries: list });
}

function normalizeHexColor(raw, fallback = "#87CEFA") {
  const value = String(raw || "").trim();
  if (!value) return fallback;
  const m = value.match(/^#?[0-9a-fA-F]{6}$/);
  if (!m) return fallback;
  return `#${value.replace(/^#/, "").toUpperCase()}`;
}

function normalizeDiscordCommandEntry(entry, index = 0) {
  const trigger = String(entry?.trigger || entry?.name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
  if (!/^[a-z0-9][a-z0-9_-]{1,31}$/.test(trigger)) {
    throw new Error(`Invalid trigger at index ${index + 1}. Use 2-32 chars: a-z, 0-9, _ or -.`);
  }

  const response = String(entry?.response || entry?.content || "").trim();
  if (!response) throw new Error(`Missing response for trigger '${trigger}'.`);
  if (response.length > 1800) throw new Error(`Response too long for '${trigger}' (max 1800 chars).`);

  const modeRaw = String(entry?.mode || "text").trim().toLowerCase();
  const mode = ["text", "embed", "dm", "ban", "mute", "kick", "role"].includes(modeRaw) ? modeRaw : "text";
  const embedTitle = String(entry?.embedTitle || "").trim().slice(0, 120);
  const embedColor = normalizeHexColor(entry?.embedColor || "#87CEFA");

  return {
    trigger,
    response,
    enabled: entry?.enabled !== false,
    deleteTriggerMessage: entry?.deleteTriggerMessage === true,
    mode,
    embedTitle,
    embedColor,
    updatedAt: new Date().toISOString()
  };
}

function canUseGithubCommandsStorage() {
  return DISCORD_COMMANDS_STORAGE === "github"
    && !!DISCORD_COMMANDS_GITHUB_REPO
    && !!DISCORD_COMMANDS_GITHUB_PATH
    && !!DISCORD_COMMANDS_GITHUB_BRANCH
    && !!DISCORD_COMMANDS_GITHUB_TOKEN;
}

function githubCommandsStorageLabel() {
  return `github:${DISCORD_COMMANDS_GITHUB_REPO}/${DISCORD_COMMANDS_GITHUB_PATH}@${DISCORD_COMMANDS_GITHUB_BRANCH}`;
}

function normalizeDiscordCommandList(list = []) {
  const normalized = [];
  const seen = new Set();
  for (let i = 0; i < list.length; i += 1) {
    const item = normalizeDiscordCommandEntry(list[i], i);
    if (seen.has(item.trigger)) {
      throw new Error(`Duplicate trigger '${item.trigger}'.`);
    }
    seen.add(item.trigger);
    normalized.push(item);
  }
  normalized.sort((a, b) => a.trigger.localeCompare(b.trigger));
  return normalized;
}

function canUseGithubWickStorage() {
  return DISCORD_COMMANDS_STORAGE === "github"
    && !!WICK_SETTINGS_GITHUB_REPO
    && !!WICK_SETTINGS_GITHUB_PATH
    && !!WICK_SETTINGS_GITHUB_BRANCH
    && !!WICK_SETTINGS_GITHUB_TOKEN;
}

function wickSettingsStorageLabel() {
  return `github:${WICK_SETTINGS_GITHUB_REPO}/${WICK_SETTINGS_GITHUB_PATH}@${WICK_SETTINGS_GITHUB_BRANCH}`;
}

function normalizeWickGuildConfig(raw = {}) {
  const out = {
    enabled: raw?.enabled !== false,
    logChannelId: String(raw?.logChannelId || "").trim() || null,
    autoStrikeOnWarn: raw?.autoStrikeOnWarn !== false,
    timeoutAt3: Math.max(0, Number(raw?.timeoutAt3 || 30) || 30),
    timeoutAt5: Math.max(0, Number(raw?.timeoutAt5 || 1440) || 1440),
    antiRaid: {
      enabled: raw?.antiRaid?.enabled !== false,
      joins: Math.max(2, Number(raw?.antiRaid?.joins || 8) || 8),
      seconds: Math.max(5, Number(raw?.antiRaid?.seconds || 20) || 20),
      slowmodeSeconds: Math.max(0, Number(raw?.antiRaid?.slowmodeSeconds || 15) || 15)
    },
    antiNuke: {
      enabled: raw?.antiNuke?.enabled !== false,
      maxChannelDeletePerMinute: Math.max(1, Number(raw?.antiNuke?.maxChannelDeletePerMinute || 4) || 4),
      maxRoleDeletePerMinute: Math.max(1, Number(raw?.antiNuke?.maxRoleDeletePerMinute || 3) || 3),
      lockdownMinutes: Math.max(1, Number(raw?.antiNuke?.lockdownMinutes || 10) || 10)
    },
    linkShield: {
      enabled: raw?.linkShield?.enabled === true,
      blockDiscordInvites: raw?.linkShield?.blockDiscordInvites !== false,
      whitelistDomains: Array.isArray(raw?.linkShield?.whitelistDomains)
        ? raw.linkShield.whitelistDomains.map((s) => String(s || "").trim().toLowerCase()).filter(Boolean).slice(0, 200)
        : []
    },
    updatedAt: new Date().toISOString()
  };
  return out;
}

function normalizeWickSettingsState(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  const guildsIn = src?.guilds && typeof src.guilds === "object" ? src.guilds : {};
  const guildsOut = {};
  for (const [guildIdRaw, value] of Object.entries(guildsIn)) {
    const guildId = String(guildIdRaw || "").trim();
    if (!/^\d{5,30}$/.test(guildId)) continue;
    guildsOut[guildId] = normalizeWickGuildConfig(value || {});
  }
  return {
    guilds: guildsOut,
    updatedAt: new Date().toISOString()
  };
}

async function fetchWickSettingsFromGithub() {
  const apiUrl = `https://api.github.com/repos/${WICK_SETTINGS_GITHUB_REPO}/contents/${encodeURIComponent(WICK_SETTINGS_GITHUB_PATH).replace(/%2F/g, "/")}?ref=${encodeURIComponent(WICK_SETTINGS_GITHUB_BRANCH)}`;
  const response = await fetch(apiUrl, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${WICK_SETTINGS_GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "hanno-wick-storage"
    },
    signal: AbortSignal.timeout(10_000)
  });

  if (response.status === 404) {
    wickSettingsGithubSha = null;
    return { state: { guilds: {} }, sha: null };
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(String(payload?.message || `GitHub read failed (${response.status})`));
  }

  const b64 = String(payload?.content || "").replace(/\n/g, "");
  const decoded = b64 ? Buffer.from(b64, "base64").toString("utf8") : "{}";
  const parsed = JSON.parse(decoded || "{}");
  return {
    state: normalizeWickSettingsState(parsed),
    sha: String(payload?.sha || "") || null
  };
}

async function saveWickSettingsToGithub(state) {
  const contentB64 = Buffer.from(JSON.stringify(state, null, 2), "utf8").toString("base64");
  const apiUrl = `https://api.github.com/repos/${WICK_SETTINGS_GITHUB_REPO}/contents/${encodeURIComponent(WICK_SETTINGS_GITHUB_PATH).replace(/%2F/g, "/")}`;
  const body = {
    message: `update wick settings (${new Date().toISOString()})`,
    content: contentB64,
    branch: WICK_SETTINGS_GITHUB_BRANCH
  };
  if (wickSettingsGithubSha) body.sha = wickSettingsGithubSha;

  const response = await fetch(apiUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${WICK_SETTINGS_GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "hanno-wick-storage"
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000)
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(String(payload?.message || `GitHub write failed (${response.status})`));
  }

  wickSettingsGithubSha = String(payload?.content?.sha || payload?.commit?.sha || "") || wickSettingsGithubSha;
}

async function loadWickSettings() {
  if (wickSettingsCache && typeof wickSettingsCache === "object") return JSON.parse(JSON.stringify(wickSettingsCache));

  if (canUseGithubWickStorage()) {
    try {
      const remote = await fetchWickSettingsFromGithub();
      wickSettingsCache = remote.state;
      wickSettingsGithubSha = remote.sha || null;
      wickSettingsPersistOk = true;
      wickSettingsPersistError = null;
      wickSettingsPersistPath = wickSettingsStorageLabel();
      return JSON.parse(JSON.stringify(wickSettingsCache));
    } catch (error) {
      wickSettingsPersistOk = false;
      wickSettingsPersistError = `GitHub read failed, fallback active: ${String(error?.message || error)}`;
    }
  }

  let raw = scrimsLoadJson(WICK_SETTINGS_PATH, null);
  if (!raw || typeof raw !== "object") {
    raw = scrimsLoadJson(WICK_SETTINGS_FALLBACK_PATH, { guilds: {} });
    if (raw && typeof raw === "object") wickSettingsPersistPath = WICK_SETTINGS_FALLBACK_PATH;
  }

  wickSettingsCache = normalizeWickSettingsState(raw || { guilds: {} });
  return JSON.parse(JSON.stringify(wickSettingsCache));
}

async function saveWickSettings(inputState) {
  const state = normalizeWickSettingsState(inputState);
  wickSettingsCache = state;

  if (canUseGithubWickStorage()) {
    try {
      if (!wickSettingsGithubSha) {
        const current = await fetchWickSettingsFromGithub();
        wickSettingsGithubSha = current.sha || null;
      }
      await saveWickSettingsToGithub(state);
      wickSettingsPersistOk = true;
      wickSettingsPersistError = null;
      wickSettingsPersistPath = wickSettingsStorageLabel();
      return JSON.parse(JSON.stringify(state));
    } catch (error) {
      wickSettingsPersistOk = false;
      wickSettingsPersistError = `GitHub write failed, fallback active: ${String(error?.message || error)}`;
    }
  }

  const wrotePrimary = scrimsSaveJson(WICK_SETTINGS_PATH, state);
  if (wrotePrimary) {
    wickSettingsPersistOk = true;
    wickSettingsPersistError = null;
    wickSettingsPersistPath = WICK_SETTINGS_PATH;
    return JSON.parse(JSON.stringify(state));
  }

  const wroteFallback = scrimsSaveJson(WICK_SETTINGS_FALLBACK_PATH, state);
  if (wroteFallback) {
    wickSettingsPersistOk = true;
    wickSettingsPersistError = `Primary path not writable, using fallback: ${WICK_SETTINGS_FALLBACK_PATH}`;
    wickSettingsPersistPath = WICK_SETTINGS_FALLBACK_PATH;
    return JSON.parse(JSON.stringify(state));
  }

  wickSettingsPersistOk = false;
  wickSettingsPersistError = "Failed to write Wick settings file on primary and fallback paths (using in-memory cache).";
  return JSON.parse(JSON.stringify(state));
}

async function notifyBotWickSettingsRefresh() {
  if (!BOT_WICK_SETTINGS_REFRESH_URL) {
    return { attempted: false, ok: false, error: "BOT_WICK_SETTINGS_REFRESH_URL not configured" };
  }
  try {
    const headers = { "Content-Type": "application/json" };
    if (BOT_WICK_SETTINGS_REFRESH_KEY) headers["x-refresh-key"] = BOT_WICK_SETTINGS_REFRESH_KEY;
    const response = await fetch(BOT_WICK_SETTINGS_REFRESH_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ reason: "wick_settings_save" }),
      signal: AbortSignal.timeout(8000)
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        attempted: true,
        ok: false,
        error: String(payload?.error || `HTTP ${response.status}`)
      };
    }
    return {
      attempted: true,
      ok: true,
      status: response.status,
      source: payload?.source || null
    };
  } catch (error) {
    return {
      attempted: true,
      ok: false,
      error: String(error?.message || "refresh notify failed")
    };
  }
}

async function fetchDiscordCommandsFromGithub() {
  const apiUrl = `https://api.github.com/repos/${DISCORD_COMMANDS_GITHUB_REPO}/contents/${encodeURIComponent(DISCORD_COMMANDS_GITHUB_PATH).replace(/%2F/g, "/")}?ref=${encodeURIComponent(DISCORD_COMMANDS_GITHUB_BRANCH)}`;
  const response = await fetch(apiUrl, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${DISCORD_COMMANDS_GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "hanno-commands-storage"
    },
    signal: AbortSignal.timeout(10_000)
  });

  if (response.status === 404) {
    discordCommandsGithubSha = null;
    return { commands: [], sha: null };
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(String(payload?.message || `GitHub read failed (${response.status})`));
  }

  const b64 = String(payload?.content || "").replace(/\n/g, "");
  const decoded = b64 ? Buffer.from(b64, "base64").toString("utf8") : "{}";
  const parsed = JSON.parse(decoded || "{}");
  const list = Array.isArray(parsed?.commands) ? parsed.commands : [];
  return {
    commands: list,
    sha: String(payload?.sha || "") || null
  };
}

async function saveDiscordCommandsToGithub(dedupedCommands) {
  const payloadObj = { commands: dedupedCommands, updatedAt: new Date().toISOString() };
  const contentB64 = Buffer.from(JSON.stringify(payloadObj, null, 2), "utf8").toString("base64");
  const apiUrl = `https://api.github.com/repos/${DISCORD_COMMANDS_GITHUB_REPO}/contents/${encodeURIComponent(DISCORD_COMMANDS_GITHUB_PATH).replace(/%2F/g, "/")}`;
  const body = {
    message: `update discord commands (${new Date().toISOString()})`,
    content: contentB64,
    branch: DISCORD_COMMANDS_GITHUB_BRANCH
  };
  if (discordCommandsGithubSha) body.sha = discordCommandsGithubSha;

  const response = await fetch(apiUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${DISCORD_COMMANDS_GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "hanno-commands-storage"
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000)
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(String(payload?.message || `GitHub write failed (${response.status})`));
  }

  discordCommandsGithubSha = String(payload?.content?.sha || payload?.commit?.sha || "") || discordCommandsGithubSha;
}

async function loadDiscordCommands() {
  if (Array.isArray(discordCommandsCache)) return discordCommandsCache.slice();

  if (canUseGithubCommandsStorage()) {
    try {
      const remote = await fetchDiscordCommandsFromGithub();
      const normalizedRemote = normalizeDiscordCommandList(remote.commands || []);
      discordCommandsCache = normalizedRemote.slice();
      discordCommandsGithubSha = remote.sha || null;
      discordCommandsPersistOk = true;
      discordCommandsPersistError = null;
      discordCommandsPersistPath = githubCommandsStorageLabel();
      return discordCommandsCache.slice();
    } catch (error) {
      discordCommandsPersistOk = false;
      discordCommandsPersistError = `GitHub read failed, fallback active: ${String(error?.message || error)}`;
    }
  }

  let raw = scrimsLoadJson(DISCORD_COMMANDS_PATH, null);
  if (!raw || !Array.isArray(raw?.commands)) {
    raw = scrimsLoadJson(DISCORD_COMMANDS_FALLBACK_PATH, { commands: [] });
    if (raw && Array.isArray(raw?.commands)) {
      discordCommandsPersistPath = DISCORD_COMMANDS_FALLBACK_PATH;
    }
  }
  if (!raw || !Array.isArray(raw?.commands)) raw = { commands: [] };
  const list = Array.isArray(raw?.commands) ? raw.commands : [];
  const normalized = [];
  for (let i = 0; i < list.length; i += 1) {
    try {
      normalized.push(normalizeDiscordCommandEntry(list[i], i));
    } catch (error) {
      // skip invalid legacy entries
    }
  }
  discordCommandsCache = normalized.sort((a, b) => a.trigger.localeCompare(b.trigger));
  return discordCommandsCache.slice();
}

async function saveDiscordCommands(commands) {
  const deduped = normalizeDiscordCommandList(commands);
  discordCommandsCache = deduped.slice();

  if (canUseGithubCommandsStorage()) {
    try {
      if (!discordCommandsGithubSha) {
        const current = await fetchDiscordCommandsFromGithub();
        discordCommandsGithubSha = current.sha || null;
      }
      await saveDiscordCommandsToGithub(deduped);
      discordCommandsPersistOk = true;
      discordCommandsPersistError = null;
      discordCommandsPersistPath = githubCommandsStorageLabel();
      return deduped;
    } catch (error) {
      discordCommandsPersistOk = false;
      discordCommandsPersistError = `GitHub write failed, fallback active: ${String(error?.message || error)}`;
    }
  }

  const payload = { commands: deduped, updatedAt: new Date().toISOString() };
  const wrotePrimary = scrimsSaveJson(DISCORD_COMMANDS_PATH, payload);
  if (wrotePrimary) {
    discordCommandsPersistOk = true;
    discordCommandsPersistError = null;
    discordCommandsPersistPath = DISCORD_COMMANDS_PATH;
    return deduped;
  }

  const wroteFallback = scrimsSaveJson(DISCORD_COMMANDS_FALLBACK_PATH, payload);
  if (wroteFallback) {
    discordCommandsPersistOk = true;
    discordCommandsPersistError = `Primary path not writable, using fallback: ${DISCORD_COMMANDS_FALLBACK_PATH}`;
    discordCommandsPersistPath = DISCORD_COMMANDS_FALLBACK_PATH;
    return deduped;
  }

  discordCommandsPersistOk = false;
  discordCommandsPersistError = "Failed to write command file on primary and fallback paths (using in-memory cache).";
  return deduped;
}

async function notifyBotDynamicCommandsRefresh() {
  if (!BOT_DYNAMIC_COMMANDS_REFRESH_URL) {
    return { attempted: false, ok: false, error: "BOT_DYNAMIC_COMMANDS_REFRESH_URL not configured" };
  }
  try {
    const headers = { "Content-Type": "application/json" };
    if (BOT_DYNAMIC_COMMANDS_REFRESH_KEY) headers["x-refresh-key"] = BOT_DYNAMIC_COMMANDS_REFRESH_KEY;
    const response = await fetch(BOT_DYNAMIC_COMMANDS_REFRESH_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ reason: "admin_save" }),
      signal: AbortSignal.timeout(8000)
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        attempted: true,
        ok: false,
        error: String(payload?.error || `HTTP ${response.status}`)
      };
    }
    return {
      attempted: true,
      ok: true,
      status: response.status,
      source: payload?.source || null
    };
  } catch (error) {
    return {
      attempted: true,
      ok: false,
      error: String(error?.message || "refresh notify failed")
    };
  }
}

function scrimsLobbyKey(input) {
  const n = Number(input);
  if (!Number.isFinite(n) || n < 1) return "1";
  return String(Math.floor(n));
}

function scrimsNormalizePercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (n < 0) return 0;
  if (n > 100) return 100;
  return Number(n.toFixed(3));
}

function scrimsSanitizeText(input, max = 80) {
  return String(input || "").trim().slice(0, max);
}

function scrimsState() {
  const obj = scrimsLoadJson(SCRIMS_DROPMAP_PATH, {});
  if (!obj || typeof obj !== "object") return { lobbies: {} };
  if (!obj.lobbies || typeof obj.lobbies !== "object") obj.lobbies = {};
  return obj;
}

async function scrimsDiscordApi(method, apiPath, token, body) {
  const url = `https://discord.com/api/v10${apiPath}`;
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (error) { data = { raw: text }; }
  if (!response.ok) {
    const msg = data && (data.message || data.raw) ? String(data.message || data.raw) : `HTTP ${response.status}`;
    throw new Error(msg);
  }
  return data;
}

function scrimsSessionLabel(template) {
  const mode = String(template || "duo-default").startsWith("trio") ? "Trio" : "Duo";
  return mode;
}

function resolveScrimsGuildId(body) {
  const byBody = String(body && (body.guildId || body.guild || body.serverId) || "").trim();
  const byConfig = String(process.env.SCRIMS_GUILD_ID || process.env.DISCORD_GUILD_ID || process.env.GUILD_ID || "").trim();
  return byBody || byConfig || "";
}

function scrimsMissingConfig(body) {
  const missing = [];
  if (!SCRIMS_DISCORD_TOKEN) missing.push("DISCORD_TOKEN");
  if (!resolveScrimsGuildId(body)) missing.push("SCRIMS_GUILD_ID (oder DISCORD_GUILD_ID / GUILD_ID)");
  if (!SCRIMS_DISCORD_CLIENT_ID) missing.push("DISCORD_CLIENT_ID");
  if (!SCRIMS_DISCORD_CLIENT_SECRET) missing.push("DISCORD_CLIENT_SECRET");
  return missing;
}

async function scrimsCreateLobbyLocal(body) {
  if (!SCRIMS_DISCORD_TOKEN) throw new Error("DISCORD_TOKEN fehlt auf Render.");
  const guildId = resolveScrimsGuildId(body);
  if (!guildId) throw new Error("SCRIMS_GUILD_ID fehlt auf Render.");

  const sessionNo = Number(body && body.session);
  const lobbyNo = Number(body && body.lobby);
  const template = String(body && body.lobbyTemplate || "duo-default").trim().toLowerCase();
  if (!Number.isFinite(sessionNo) || sessionNo < 1) throw new Error("Invalid session number.");
  if (!Number.isFinite(lobbyNo) || lobbyNo < 1) throw new Error("Invalid lobby number.");

  const sessionLabel = scrimsSessionLabel(template);
  const categoryName = `${sessionLabel} Session ${sessionNo} Lobby ${lobbyNo}`;
  const prefix = `lobby-${lobbyNo}`;
  const channelNames = [
    `${prefix}-registration`,
    `${prefix}-dropmap`,
    `${prefix}-code`,
    `${prefix}-chat`,
    `${prefix}-unreg`,
    template.startsWith("trio") ? `${prefix}-trio-fills` : `${prefix}-fills`,
    `${prefix}-staff`
  ];

  const channels = await scrimsDiscordApi("GET", `/guilds/${guildId}/channels`, SCRIMS_DISCORD_TOKEN);
  let category = Array.isArray(channels)
    ? channels.find((ch) => Number(ch.type) === 4 && String(ch.name || "").toLowerCase() === categoryName.toLowerCase())
    : null;

  if (!category) {
    category = await scrimsDiscordApi("POST", `/guilds/${guildId}/channels`, SCRIMS_DISCORD_TOKEN, {
      name: categoryName,
      type: 4
    });
  }

  const refreshed = await scrimsDiscordApi("GET", `/guilds/${guildId}/channels`, SCRIMS_DISCORD_TOKEN);
  const created = [];
  for (const channelName of channelNames) {
    const exists = Array.isArray(refreshed)
      ? refreshed.find((ch) => Number(ch.type) === 0 && String(ch.parent_id || "") === String(category.id) && String(ch.name || "") === channelName)
      : null;
    if (exists) continue;
    await scrimsDiscordApi("POST", `/guilds/${guildId}/channels`, SCRIMS_DISCORD_TOKEN, {
      name: channelName,
      type: 0,
      parent_id: category.id
    });
    created.push(channelName);
  }

  return {
    ok: true,
    categoryName,
    channels: created
  };
}

function getScrimsBaseCandidates() {
  const defaults = [
    "https://cybrancee-bot-eu-central-21.cybrancee.com",
    "http://cybrancee-bot-eu-central-21.cybrancee.com:4173",
    "http://cybrancee-bot-eu-central-21.cybrancee.com"
  ];
  const raw = [SCRIMS_API_BASE, ...SCRIMS_API_BASES, ...defaults].filter(Boolean);
  const out = [];
  const seen = new Set();
  for (const item of raw) {
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

async function fetchScrimsWithFallback(upstreamPath, init = {}, opts = {}) {
  const bases = getScrimsBaseCandidates();
  if (!bases.length) {
    throw new Error("Keine SCRIMS_API_BASE konfiguriert.");
  }

  const path = String(upstreamPath || "");
  const timeoutMs = Number(opts.timeoutMs || 9000);
  const errors = [];

  for (const base of bases) {
    const url = `${base}${path}`;
    try {
      const response = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(timeoutMs)
      });

      const contentType = String(response.headers.get("content-type") || "").toLowerCase();
      if (path.startsWith("/api/") && contentType.includes("text/html")) {
        errors.push(`${base} -> HTML statt API (${response.status})`);
        continue;
      }

      return { response, base };
    } catch (error) {
      errors.push(`${base} -> ${String(error?.message || "fetch failed")}`);
    }
  }

  throw new Error(`Scrims API nicht erreichbar. Gepruefte Ziele: ${errors.join(" | ")}`);
}

async function proxyScrimsAuth(req, res, upstreamPath) {
  try {
    const { response } = await fetchScrimsWithFallback(upstreamPath, {
      method: "GET",
      headers: {
        cookie: String(req.headers.cookie || "")
      },
      redirect: "manual"
    });

    const location = response.headers.get("location");
    const getSetCookie = response.headers.getSetCookie;
    const setCookies = typeof getSetCookie === "function" ? getSetCookie.call(response.headers) : [];
    if (setCookies.length) {
      res.setHeader("Set-Cookie", setCookies);
    }

    if (location) {
      res.redirect(response.status || 302, location);
      return;
    }

    const contentType = response.headers.get("content-type") || "text/plain; charset=utf-8";
    const bodyText = await response.text();
    res.status(response.status || 200).set("Content-Type", contentType).send(bodyText);
  } catch (error) {
    res.status(502).send(`Auth proxy error: ${String(error?.message || "unknown")}`);
  }
}

async function proxyScrimsApi(req, res, upstreamPath) {
  try {
    const headers = {
      cookie: String(req.headers.cookie || "")
    };

    if (SCRIMS_API_KEY) headers["x-api-key"] = SCRIMS_API_KEY;
    if (req.method !== "GET" && req.method !== "HEAD") {
      headers["Content-Type"] = "application/json";
    }

    const { response } = await fetchScrimsWithFallback(upstreamPath, {
      method: req.method,
      headers,
      body: req.method !== "GET" && req.method !== "HEAD" ? JSON.stringify(req.body || {}) : undefined
    });

    const payloadText = await response.text();
    const contentType = response.headers.get("content-type") || "application/json; charset=utf-8";
    res.status(response.status || 200).set("Content-Type", contentType).send(payloadText);
  } catch (error) {
    res.status(502).json({ ok: false, error: `Scrims API proxy error: ${String(error?.message || "unknown")}` });
  }
}

app.get("/api/clips/auth-status", (req, res) => {
  const authenticated = clipsHasValidAccess(req);
  if (authenticated) {
    clipsEnsureOwnerSession(req, res);
  }
  res.json({ ok: true, authenticated });
});

app.post("/api/clips/auth", (req, res) => {
  const submittedCode = String(req.body?.code || "").trim();
  if (!submittedCode) {
    res.status(400).json({ ok: false, error: "Access code is required." });
    return;
  }

  if (!clipsSafeEqualText(submittedCode, CLIPS_ACCESS_CODE)) {
    res.status(401).json({ ok: false, error: "Invalid access code." });
    return;
  }

  clipsGrantAccess(req, res);
  clipsEnsureOwnerSession(req, res);
  res.json({ ok: true, message: "Access granted." });
});

app.post("/api/clips/upload", clipsRequireAccess, (req, res) => {
  if (!clipsIsTrustedMutationRequest(req)) {
    res.status(403).json({ ok: false, error: "Blocked by security policy." });
    return;
  }
  const ownerId = clipsEnsureOwnerSession(req, res);
  if (clipsIsRateLimited(req, ownerId)) {
    res.status(429).json({ ok: false, error: "Too many upload requests. Please try again in a few minutes." });
    return;
  }

  clipsPurgeExpired("pre-upload");
  clipsUpload.single("clip")(req, res, (uploadError) => {
    if (uploadError) {
      const isLimit = uploadError.code === "LIMIT_FILE_SIZE";
      res.status(400).json({
        ok: false,
        error: isLimit
          ? `File too large. Maximum allowed size is ${CLIPS_MAX_SIZE_MB} MB.`
          : String(uploadError.message || "Upload failed")
      });
      return;
    }

    const file = req.file;
    if (!file) {
      res.status(400).json({ ok: false, error: "No video file received." });
      return;
    }

    const clipId = String(req.clipId || path.parse(file.filename).name);
    const title = String((req.body && req.body.title) || "").trim().slice(0, 120);
    const uploadedAt = new Date().toISOString();
    const index = clipsLoadIndex();
    if (!index.items || typeof index.items !== "object") index.items = {};

    index.items[clipId] = {
      id: clipId,
      ownerId,
      fileName: file.filename,
      originalName: String(file.originalname || "").slice(0, 180),
      title,
      mimeType: String(file.mimetype || "video/mp4"),
      size: Number(file.size || 0),
      uploadedAt
    };

    clipsSaveIndex(index);

    const base = clipsBaseUrl(req);
    const sharePath = clipsBuildSharePath(clipId);
    const videoPath = clipsBuildVideoPath(file.filename);
    res.json({
      ok: true,
      id: clipId,
      sharePath,
      videoPath,
      shareUrl: `${base}${sharePath}`,
      videoUrl: `${base}${videoPath}`
    });
  });
});

app.post("/api/modmail/create", (req, res) => {
  if (modmailIsRateLimited(req.ip)) {
    res.status(429).json({ ok: false, error: "Too many requests. Please try again later." });
    return;
  }

  const type = modmailNormalizeType(req.body?.type);
  const title = modmailSanitizeText(req.body?.title, 140);
  const message = modmailSanitizeText(req.body?.message, 3000);
  const contact = modmailSanitizeText(req.body?.contact, 160);
  const pageUrl = modmailSanitizeText(req.body?.pageUrl || req.get("referer"), 300);

  if (!title || !message) {
    res.status(400).json({ ok: false, error: "Title and message are required." });
    return;
  }

  const state = modmailLoadState();
  const item = {
    id: modmailNewId(),
    createdAt: new Date().toISOString(),
    type,
    title,
    message,
    contact,
    pageUrl,
    status: "open",
    adminNote: "",
    updatedAt: new Date().toISOString(),
    sourceIp: String(req.ip || "")
  };

  state.items.unshift(item);
  if (state.items.length > MODMAIL_MAX_ENTRIES) {
    state.items.splice(MODMAIL_MAX_ENTRIES);
  }
  modmailSaveState(state);

  res.json({ ok: true, id: item.id, message: "Your request has been sent to the admin inbox." });
});

app.get("/api/clips/latest", clipsRequireAccess, (req, res) => {
  clipsPurgeExpired("latest-api");
  const ownerId = clipsEnsureOwnerSession(req, res);
  const index = clipsLoadIndex();
  const list = clipsListForOwner(index, ownerId, req.query.limit);
  res.json({
    ok: true,
    privateScope: "owner_only",
    retentionDays: CLIPS_RETENTION_DAYS,
    clips: list.map((item) => ({
      id: item.id,
      title: item.title || "",
      originalName: item.originalName || "",
      uploadedAt: item.uploadedAt || "",
      size: Number(item.size || 0),
      mimeType: item.mimeType || "video/mp4",
      sharePath: clipsBuildSharePath(item.id),
      videoPath: clipsBuildVideoPath(item.fileName)
    }))
  });
});

app.get("/api/clips/:id", clipsRequireAccess, (req, res) => {
  clipsPurgeExpired("clip-detail");
  const ownerId = clipsEnsureOwnerSession(req, res);
  const id = String(req.params.id || "").trim();
  if (!id) {
    res.status(400).json({ ok: false, error: "Missing clip id." });
    return;
  }

  const index = clipsLoadIndex();
  const item = index?.items?.[id];
  if (!item || item.ownerId !== ownerId) {
    res.status(404).json({ ok: false, error: "Clip not found." });
    return;
  }

  res.json({
    ok: true,
    clip: {
      id: item.id,
      title: item.title || "",
      uploadedAt: item.uploadedAt || "",
      size: Number(item.size || 0),
      mimeType: item.mimeType || "video/mp4",
      sharePath: clipsBuildSharePath(item.id),
      videoPath: clipsBuildVideoPath(item.fileName)
    }
  });
});

app.get("/clip/:id", (req, res) => {
  if (!clipsHasValidAccess(req)) {
    res.status(401).send("Access code required.");
    return;
  }

  clipsPurgeExpired("share-view");
  const ownerId = clipsEnsureOwnerSession(req, res);
  const id = String(req.params.id || "").trim();
  const index = clipsLoadIndex();
  const item = index?.items?.[id];

  if (!item || item.ownerId !== ownerId) {
    res.status(404).send("Clip not found.");
    return;
  }

  const filePath = path.join(CLIPS_PUBLIC_DIR, path.basename(String(item.fileName || "")));
  if (!fs.existsSync(filePath)) {
    delete index.items[id];
    clipsSaveIndex(index);
    res.status(404).send("Clip file missing.");
    return;
  }

  const videoPath = clipsBuildVideoPath(item.fileName);
  const title = clipsEscapeHtml(item.title || item.originalName || "Clip");
  const uploaded = clipsEscapeHtml(item.uploadedAt || "");
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <style>
      :root { color-scheme: dark; }
      body {
        margin: 0;
        min-height: 100vh;
        font-family: Segoe UI, Arial, sans-serif;
        color: #f0f4ff;
        background:
          radial-gradient(900px 460px at 15% -10%, rgba(88, 141, 255, 0.25), transparent 48%),
          radial-gradient(760px 420px at 110% 15%, rgba(52, 255, 200, 0.18), transparent 52%),
          #0d1428;
        display: grid;
        place-items: center;
        padding: 16px;
      }
      .shell {
        width: min(100%, 920px);
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 18px;
        background: rgba(7, 14, 30, 0.86);
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
        padding: 14px;
      }
      h1 {
        margin: 0 0 8px;
        font-size: clamp(1.1rem, 2.5vw, 1.6rem);
      }
      p {
        margin: 0 0 12px;
        color: #bfd2ff;
        font-size: 0.9rem;
      }
      video {
        width: 100%;
        border-radius: 12px;
        background: #010307;
        max-height: 78vh;
      }
    </style>
  </head>
  <body>
    <main class="shell">
      <h1>${title}</h1>
      <p>Uploaded: ${uploaded}</p>
      <video controls autoplay preload="metadata" src="${videoPath}"></video>
    </main>
  </body>
</html>`;

  res.set("Content-Type", "text/html; charset=utf-8").send(html);
});

setInterval(() => {
  clipsPurgeExpired("interval");
}, CLIPS_CLEANUP_INTERVAL_MS);
clipsPurgeExpired("startup");

app.get("/auth/discord", async (req, res) => {
  if (!SCRIMS_DISCORD_CLIENT_ID || !SCRIMS_DISCORD_CLIENT_SECRET) {
    res.redirect(302, scrimsAuthFailureRedirect("config"));
    return;
  }
  const state = scrimsRandomToken(18);
  scrimsOAuthStates.set(state, { expiresAt: scrimsNowMs() + SCRIMS_OAUTH_STATE_MAX_AGE_MS });
  const q = new URLSearchParams({
    client_id: SCRIMS_DISCORD_CLIENT_ID,
    response_type: "code",
    redirect_uri: SCRIMS_DISCORD_REDIRECT_URI,
    scope: "identify",
    state,
    prompt: "none"
  });
  const stateCookie = scrimsSerializeCookie("oauth_state", state, {
    maxAge: Math.floor(SCRIMS_OAUTH_STATE_MAX_AGE_MS / 1000),
    sameSite: "Lax",
    secure: true
  });
  res.setHeader("Set-Cookie", stateCookie);
  res.redirect(302, `https://discord.com/oauth2/authorize?${q.toString()}`);
});

app.get("/auth/discord/callback", async (req, res) => {
  const code = String(req.query.code || "").trim();
  const state = String(req.query.state || "").trim();
  const cookies = scrimsParseCookies(req);
  const cookieState = String(cookies.oauth_state || "").trim();
  const stateMeta = state ? scrimsOAuthStates.get(state) : null;

  const clearStateCookie = scrimsSerializeCookie("oauth_state", "", {
    maxAge: 0,
    sameSite: "Lax",
    secure: true
  });

  if (!code || !state || !cookieState || state !== cookieState || !stateMeta || Number(stateMeta.expiresAt || 0) <= scrimsNowMs()) {
    if (state) scrimsOAuthStates.delete(state);
    res.setHeader("Set-Cookie", clearStateCookie);
    res.redirect(302, scrimsAuthFailureRedirect("state"));
    return;
  }

  scrimsOAuthStates.delete(state);
  try {
    const tokenBody = new URLSearchParams({
      client_id: SCRIMS_DISCORD_CLIENT_ID,
      client_secret: SCRIMS_DISCORD_CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: SCRIMS_DISCORD_REDIRECT_URI
    });

    const tokenRes = await fetch("https://discord.com/api/v10/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenBody.toString()
    });
    const tokenJson = await tokenRes.json().catch(() => ({}));
    const accessToken = String(tokenJson && tokenJson.access_token ? tokenJson.access_token : "");
    if (!tokenRes.ok || !accessToken) {
      res.setHeader("Set-Cookie", clearStateCookie);
      res.redirect(302, scrimsAuthFailureRedirect("token"));
      return;
    }

    const meRes = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const me = await meRes.json().catch(() => ({}));
    if (!meRes.ok || !me || !me.id) {
      res.setHeader("Set-Cookie", clearStateCookie);
      res.redirect(302, scrimsAuthFailureRedirect("user"));
      return;
    }

    const sid = scrimsRandomToken(24);
    scrimsWebSessions.set(sid, {
      id: String(me.id),
      username: String(me.global_name || me.username || "User"),
      avatarUrl: scrimsDiscordAvatarUrl(me),
      createdAt: scrimsNowMs(),
      expiresAt: scrimsNowMs() + SCRIMS_SESSION_MAX_AGE_MS
    });

    const cookiesOut = [
      scrimsSerializeCookie("sid", sid, {
        maxAge: Math.floor(SCRIMS_SESSION_MAX_AGE_MS / 1000),
        sameSite: "Lax",
        secure: true
      }),
      clearStateCookie
    ];
    res.setHeader("Set-Cookie", cookiesOut);
    res.redirect(302, "/dropmap.html?auth=ok");
  } catch (error) {
    res.setHeader("Set-Cookie", clearStateCookie);
    res.redirect(302, scrimsAuthFailureRedirect("callback"));
  }
});

app.get("/auth/logout", async (req, res) => {
  const cookies = scrimsParseCookies(req);
  const sid = String(cookies.sid || "");
  if (sid) scrimsWebSessions.delete(sid);
  res.setHeader("Set-Cookie", [
    scrimsSerializeCookie("sid", "", { maxAge: 0, sameSite: "Lax", secure: true }),
    scrimsSerializeCookie("oauth_state", "", { maxAge: 0, sameSite: "Lax", secure: true })
  ]);
  res.redirect(302, "/dropmap.html");
});

app.get("/api/me", async (req, res) => {
  const session = scrimsGetSession(req);
  res.json({ ok: true, user: session ? { id: session.id, username: session.username, avatarUrl: session.avatarUrl } : null });
});

app.get("/api/discord-commands", async (req, res) => {
  const provided = String(req.get("x-bot-key") || req.query.key || "").trim();
  const hasConfiguredKey = !!DISCORD_COMMANDS_BOT_KEY;
  const keyMatches = hasConfiguredKey && !!provided && provided === DISCORD_COMMANDS_BOT_KEY;

  if (!keyMatches) {
    if (!(DISCORD_COMMANDS_ALLOW_PUBLIC_READ || !hasConfiguredKey)) {
      res.status(401).json({ ok: false, error: "Unauthorized bot key." });
      return;
    }
  }

  const commands = await loadDiscordCommands();
  res.json({
    ok: true,
    commands,
    authMode: keyMatches ? "key" : "public",
    persisted: discordCommandsPersistOk,
    persistError: discordCommandsPersistError,
    persistPath: discordCommandsPersistPath
  });
});

app.get("/api/wick-settings", async (req, res) => {
  const provided = String(req.get("x-bot-key") || req.query.key || "").trim();
  const hasConfiguredKey = !!DISCORD_COMMANDS_BOT_KEY;
  const keyMatches = hasConfiguredKey && !!provided && provided === DISCORD_COMMANDS_BOT_KEY;

  if (!keyMatches) {
    if (!(DISCORD_COMMANDS_ALLOW_PUBLIC_READ || !hasConfiguredKey)) {
      res.status(401).json({ ok: false, error: "Unauthorized bot key." });
      return;
    }
  }

  const state = await loadWickSettings();
  res.json({
    ok: true,
    settings: state,
    authMode: keyMatches ? "key" : "public",
    persisted: wickSettingsPersistOk,
    persistError: wickSettingsPersistError,
    persistPath: wickSettingsPersistPath
  });
});

app.get("/api/scrims/health", async (req, res) => {
  const missing = scrimsMissingConfig({});
  res.json({
    ok: missing.length === 0,
    hasDiscordToken: !!SCRIMS_DISCORD_TOKEN,
    guildIdConfigured: !!resolveScrimsGuildId({}),
    oauthConfigured: !!(SCRIMS_DISCORD_CLIENT_ID && SCRIMS_DISCORD_CLIENT_SECRET),
    redirectUri: SCRIMS_DISCORD_REDIRECT_URI,
    missing
  });
});

app.get("/api/health", async (req, res) => {
  const missing = scrimsMissingConfig({});
  res.json({
    ok: missing.length === 0,
    hasDiscordToken: !!SCRIMS_DISCORD_TOKEN,
    guildIdConfigured: !!resolveScrimsGuildId({}),
    oauthConfigured: !!(SCRIMS_DISCORD_CLIENT_ID && SCRIMS_DISCORD_CLIENT_SECRET),
    redirectUri: SCRIMS_DISCORD_REDIRECT_URI,
    missing
  });
});

app.get("/api/dropmap/state", async (req, res) => {
  const lobby = scrimsLobbyKey(req.query.lobby || "1");
  const state = scrimsState();
  if (!state.lobbies[lobby] || !Array.isArray(state.lobbies[lobby].marks)) state.lobbies[lobby] = { marks: [], updatedAt: Date.now() };
  res.json({ ok: true, lobby, marks: state.lobbies[lobby].marks });
});

app.post("/api/dropmap/mark", async (req, res) => {
  const session = scrimsGetSession(req);
  if (!session) {
    res.status(401).json({ ok: false, error: "Please connect Discord first." });
    return;
  }

  const body = req.body || {};
  const lobby = scrimsLobbyKey(body.lobby);
  const label = scrimsSanitizeText(body.label, 80);
  const x = scrimsNormalizePercent(body.x);
  const y = scrimsNormalizePercent(body.y);
  if (!label) {
    res.status(400).json({ ok: false, error: "Spot label is required." });
    return;
  }
  if (x === null || y === null) {
    res.status(400).json({ ok: false, error: "Invalid map coordinates." });
    return;
  }

  const state = scrimsState();
  if (!state.lobbies[lobby] || !Array.isArray(state.lobbies[lobby].marks)) state.lobbies[lobby] = { marks: [], updatedAt: Date.now() };
  const marks = state.lobbies[lobby].marks;
  const existingIndex = marks.findIndex((entry) => String(entry.userId || "") === String(session.id));
  const mark = {
    id: existingIndex >= 0 ? marks[existingIndex].id : `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    userId: String(session.id),
    player: String(session.username),
    avatarUrl: String(session.avatarUrl || ""),
    label,
    x,
    y,
    updatedAt: Date.now()
  };
  if (existingIndex >= 0) marks[existingIndex] = mark;
  else marks.push(mark);
  state.lobbies[lobby].updatedAt = Date.now();
  if (!scrimsSaveJson(SCRIMS_DROPMAP_PATH, state)) {
    res.status(500).json({ ok: false, error: "Failed to persist dropmap state." });
    return;
  }
  res.json({ ok: true, lobby, marks });
});

app.post("/api/dropmap/delete", async (req, res) => {
  const session = scrimsGetSession(req);
  if (!session) {
    res.status(401).json({ ok: false, error: "Please connect Discord first." });
    return;
  }
  const body = req.body || {};
  const lobby = scrimsLobbyKey(body.lobby);
  const id = scrimsSanitizeText(body.id, 120);
  if (!id) {
    res.status(400).json({ ok: false, error: "Mark id is required." });
    return;
  }
  const state = scrimsState();
  if (!state.lobbies[lobby] || !Array.isArray(state.lobbies[lobby].marks)) state.lobbies[lobby] = { marks: [], updatedAt: Date.now() };
  state.lobbies[lobby].marks = state.lobbies[lobby].marks.filter((entry) => !(String(entry.id) === id && String(entry.userId || "") === String(session.id)));
  state.lobbies[lobby].updatedAt = Date.now();
  if (!scrimsSaveJson(SCRIMS_DROPMAP_PATH, state)) {
    res.status(500).json({ ok: false, error: "Failed to persist dropmap state." });
    return;
  }
  res.json({ ok: true, lobby, marks: state.lobbies[lobby].marks });
});

app.post("/api/dropmap/clear", async (req, res) => {
  const lobby = scrimsLobbyKey((req.body || {}).lobby);
  const state = scrimsState();
  state.lobbies[lobby] = { marks: [], updatedAt: Date.now() };
  if (!scrimsSaveJson(SCRIMS_DROPMAP_PATH, state)) {
    res.status(500).json({ ok: false, error: "Failed to persist dropmap state." });
    return;
  }
  res.json({ ok: true, lobby, marks: [] });
});

app.post("/api/scrims/create-lobby", async (req, res) => {
  const session = scrimsGetSession(req);
  if (!session) {
    res.status(401).json({
      ok: false,
      error: "Bitte zuerst mit deinem Discord Account verbinden."
    });
    return;
  }

  try {
    const missing = scrimsMissingConfig(req.body || {});
    if (missing.length) {
      appendScrimsCreateHistory({
        ok: false,
        userId: session.id,
        username: session.username,
        reason: "missing_config",
        missing,
        payload: req.body || {}
      });
      res.status(400).json({
        ok: false,
        error: `Fehlende Konfiguration: ${missing.join(", ")}`,
        missing
      });
      return;
    }
    const out = await scrimsCreateLobbyLocal(req.body || {});
    appendScrimsCreateHistory({
      ok: true,
      userId: session.id,
      username: session.username,
      payload: req.body || {},
      result: out
    });
    res.status(200).json(out);
  } catch (error) {
    appendScrimsCreateHistory({
      ok: false,
      userId: session.id,
      username: session.username,
      reason: String(error?.message || "Lobby creation failed"),
      payload: req.body || {}
    });
    res.status(400).json({
      ok: false,
      error: String(error?.message || "Lobby creation failed")
    });
  }
});

app.post("/api/create-lobby", async (req, res) => {
  const session = scrimsGetSession(req);
  if (!session) {
    res.status(401).json({
      ok: false,
      error: "Please connect Discord first."
    });
    return;
  }

  try {
    const missing = scrimsMissingConfig(req.body || {});
    if (missing.length) {
      res.status(500).json({ ok: false, error: `Render env missing: ${missing.join(", ")}` });
      return;
    }

    const result = SCRIMS_API_BASE || SCRIMS_API_BASES.length
      ? await scrimsCreateLobbyForward(req.body || {})
      : await scrimsCreateLobbyLocal(req.body || {});
    scrimsRememberCreate(req.body || {}, result, session);
    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(500).json({ ok: false, error: String(error && error.message ? error.message : error || "Lobby creation failed.") });
  }
});

const quizAiRateLimitByIp = new Map();
let aiEnabled = AI_ENABLED_BY_DEFAULT;
const aiChatLogs = [];

function sanitizeQuizPromptText(raw, maxLength = 320) {
  return String(raw || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function extractOpenAiText(payload) {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const output = Array.isArray(payload?.output) ? payload.output : [];
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const block of content) {
      if (typeof block?.text === "string" && block.text.trim()) {
        return block.text.trim();
      }
    }
  }
w
  return "";
}

function extractChatCompletionsText(payload) {
  const text = payload?.choices?.[0]?.message?.content;
  if (typeof text === "string" && text.trim()) return text.trim();

  if (Array.isArray(text)) {
    const joined = text
      .map((entry) => {
        if (typeof entry === "string") return entry;
        if (typeof entry?.text === "string") return entry.text;
        return "";
      })
      .join("\n")
      .trim();
    if (joined) return joined;
  }

  return "";
}

function isAiConfigured() {
  if (AI_PROVIDER === "github") {
    return !!GITHUB_TOKEN;
  }
  return !!OPENAI_API_KEY;
}

function expandGitHubModelCandidates(rawModels) {
  const expanded = [];
  for (const raw of rawModels) {
    const model = String(raw || "").trim();
    if (!model) continue;
    expanded.push(model);

    // Some endpoints accept short IDs without provider prefix.
    if (model.includes("/")) {
      const shortId = model.split("/").pop();
      if (shortId) expanded.push(shortId);
    }
  }
  return expanded;
}

async function generateAiText({ systemPrompt, userPrompt, temperature, maxTokens }) {
  if (AI_PROVIDER === "github") {
    const attempts = expandGitHubModelCandidates([GITHUB_MODEL, ...GITHUB_MODEL_FALLBACKS]);
    const seen = new Set();
    const modelsToTry = attempts.filter((model) => {
      const key = model.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    let lastError = "GitHub Models request failed";

    for (const model of modelsToTry) {
      const response = await fetch(GITHUB_MODELS_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          "api-key": GITHUB_TOKEN,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          temperature,
          max_tokens: maxTokens
        })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const apiError = String(payload?.error?.message || payload?.error || "GitHub Models request failed");
        lastError = apiError;
        if (/unknown model/i.test(apiError)) {
          continue;
        }
        throw new Error(apiError);
      }

      const text = sanitizeQuizPromptText(extractChatCompletionsText(payload), 1400);
      if (!text) {
        lastError = "Leere KI-Antwort erhalten.";
        continue;
      }

      return { text, model, provider: "github" };
    }

    throw new Error(lastError);
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature,
      max_output_tokens: maxTokens,
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: systemPrompt }]
        },
        {
          role: "user",
          content: [{ type: "input_text", text: userPrompt }]
        }
      ]
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const apiError = String(payload?.error?.message || payload?.error || "OpenAI request failed");
    throw new Error(apiError);
  }

  const text = sanitizeQuizPromptText(extractOpenAiText(payload), 1400);
  if (!text) {
    throw new Error("Leere KI-Antwort erhalten.");
  }

  return { text, model: OPENAI_MODEL, provider: "openai" };
}

function consumeQuizAiRateLimit(ipAddress) {
  const now = Date.now();
  const key = String(ipAddress || "unknown").trim() || "unknown";
  const windowMs = 60 * 1000;
  const maxRequests = 18;
  const entry = quizAiRateLimitByIp.get(key) || { count: 0, resetAt: now + windowMs };

  if (entry.resetAt <= now) {
    entry.count = 0;
    entry.resetAt = now + windowMs;
  }

  entry.count += 1;
  quizAiRateLimitByIp.set(key, entry);

  if (entry.count > maxRequests) {
    return {
      blocked: true,
      retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - now) / 1000))
    };
  }

  return { blocked: false, retryAfterSec: 0 };
}

function logAiChat(entry = {}) {
  pushLimited(
    aiChatLogs,
    {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      at: nowIso(),
      ...entry
    },
    1200
  );
}

function requireAiEnabled(res) {
  if (aiEnabled) return true;
  res.status(503).json({ error: "KI ist momentan global deaktiviert." });
  return false;
}

app.post("/api/quiz/ai-help", async (req, res) => {
  if (!requireAiEnabled(res)) return;

  const limiter = consumeQuizAiRateLimit(req.ip);
  if (limiter.blocked) {
    logAiChat({
      endpoint: "/api/quiz/ai-help",
      mode: String(req.body?.mode || "hint"),
      ip: req.ip || null,
      ok: false,
      error: "rate_limited"
    });
    res.set("Retry-After", String(limiter.retryAfterSec));
    res.status(429).json({ error: "Zu viele KI-Anfragen. Bitte kurz warten." });
    return;
  }

  if (!isAiConfigured()) {
    const missing = AI_PROVIDER === "github" ? "GITHUB_TOKEN" : "OPENAI_API_KEY";
    logAiChat({
      endpoint: "/api/quiz/ai-help",
      mode: String(req.body?.mode || "hint"),
      ip: req.ip || null,
      ok: false,
      error: `missing_${missing}`
    });
    res.status(503).json({ error: `KI ist noch nicht aktiviert (${missing} fehlt).` });
    return;
  }

  const modeRaw = String(req.body?.mode || "hint").trim().toLowerCase();
  const mode = ["hint", "explain", "chat"].includes(modeRaw) ? modeRaw : "hint";
  const userMessage = sanitizeQuizPromptText(req.body?.userMessage, 280);
  const question = sanitizeQuizPromptText(req.body?.question, 420);
  const answers = Array.isArray(req.body?.answers)
    ? req.body.answers.map((entry) => sanitizeQuizPromptText(entry, 120)).filter(Boolean).slice(0, 6)
    : [];
  const category = sanitizeQuizPromptText(req.body?.category, 40);
  const difficulty = sanitizeQuizPromptText(req.body?.difficulty, 20);
  const correctIndexRaw = Number(req.body?.correctIndex);
  const correctIndex = Number.isInteger(correctIndexRaw) && correctIndexRaw >= 0 && correctIndexRaw < answers.length
    ? correctIndexRaw
    : null;

  if (!question || answers.length < 2) {
    logAiChat({
      endpoint: "/api/quiz/ai-help",
      mode,
      ip: req.ip || null,
      ok: false,
      error: "invalid_question_payload"
    });
    res.status(400).json({ error: "Frage oder Antworten fehlen." });
    return;
  }

  if (mode === "chat" && !userMessage) {
    logAiChat({
      endpoint: "/api/quiz/ai-help",
      mode,
      ip: req.ip || null,
      ok: false,
      error: "missing_user_message"
    });
    res.status(400).json({ error: "Bitte eine Frage an die KI senden." });
    return;
  }

  const numberedAnswers = answers.map((answer, index) => `${index + 1}) ${answer}`).join("\n");
  const promptSections = [
    `Modus: ${mode === "hint" ? "Tipp" : "Erklaerung"}`,
    category ? `Kategorie: ${category}` : "",
    difficulty ? `Schwierigkeit: ${difficulty}` : "",
    `Frage: ${question}`,
    `Antwortoptionen:\n${numberedAnswers}`
  ].filter(Boolean);

  if (mode === "explain" && correctIndex !== null) {
    promptSections.push(`Richtige Antwort: ${correctIndex + 1}) ${answers[correctIndex]}`);
  }

  const userPrompt = mode === "chat"
    ? `${promptSections.join("\n\n")}\n\nNutzerfrage: ${userMessage}`
    : promptSections.join("\n\n");
  const systemPrompt = mode === "hint"
    ? "Du bist ein Lerncoach fuer ein deutsches Schulquiz. Gib einen kurzen Denkanstoss in 2 bis 4 Saetzen. Verrate nicht direkt die richtige Antwort und nenne keinen Antwortindex. Schreibe klar und freundlich auf Deutsch."
    : mode === "explain"
      ? "Du bist ein Lerncoach fuer ein deutsches Schulquiz. Erklaere in 2 bis 5 Saetzen, warum die Loesung richtig ist. Wenn die richtige Antwort bekannt ist, nenne sie klar. Schreibe einfaches Deutsch."
      : "Du bist ein Lerncoach fuer ein deutsches Schulquiz. Beantworte die Nutzerfrage zur aktuellen Frage klar in einfachem Deutsch (maximal 5 kurze Saetze). Gib Hilfe zum Verstehen. Verrate die exakte Loesung nur, wenn der Nutzer explizit danach fragt.";

  try {
    const result = await generateAiText({
      systemPrompt,
      userPrompt,
      temperature: 0.4,
      maxTokens: 220
    });
    logAiChat({
      endpoint: "/api/quiz/ai-help",
      mode,
      ip: req.ip || null,
      category,
      difficulty,
      prompt: mode === "chat" ? userMessage : question,
      ok: true,
      provider: result.provider,
      model: result.model,
      response: result.text
    });
    res.json({ text: result.text, mode, model: result.model, provider: result.provider });
  } catch (error) {
    logAiChat({
      endpoint: "/api/quiz/ai-help",
      mode,
      ip: req.ip || null,
      category,
      difficulty,
      prompt: mode === "chat" ? userMessage : question,
      ok: false,
      error: String(error?.message || "unknown")
    });
    res.status(502).json({ error: `KI-Fehler: ${String(error?.message || "unknown")}` });
  }
});

app.post("/api/ai/chat", async (req, res) => {
  if (!requireAiEnabled(res)) return;

  const limiter = consumeQuizAiRateLimit(req.ip);
  if (limiter.blocked) {
    logAiChat({
      endpoint: "/api/ai/chat",
      mode: "chat",
      ip: req.ip || null,
      ok: false,
      error: "rate_limited"
    });
    res.set("Retry-After", String(limiter.retryAfterSec));
    res.status(429).json({ error: "Zu viele KI-Anfragen. Bitte kurz warten." });
    return;
  }

  if (!isAiConfigured()) {
    const missing = AI_PROVIDER === "github" ? "GITHUB_TOKEN" : "OPENAI_API_KEY";
    logAiChat({
      endpoint: "/api/ai/chat",
      mode: "chat",
      ip: req.ip || null,
      ok: false,
      error: `missing_${missing}`
    });
    res.status(503).json({ error: `KI ist noch nicht aktiviert (${missing} fehlt).` });
    return;
  }

  const message = sanitizeQuizPromptText(req.body?.message, 320);
  if (!message) {
    logAiChat({
      endpoint: "/api/ai/chat",
      mode: "chat",
      ip: req.ip || null,
      ok: false,
      error: "missing_message"
    });
    res.status(400).json({ error: "Bitte eine Frage eingeben." });
    return;
  }

  const systemPrompt = "Du bist ein freundlicher Lern- und Website-Assistent fuer ein Schulquiz-Projekt. Antworte auf Deutsch, kurz, klar und hilfreich in maximal 5 Saetzen.";

  try {
    const result = await generateAiText({
      systemPrompt,
      userPrompt: message,
      temperature: 0.5,
      maxTokens: 240
    });
    logAiChat({
      endpoint: "/api/ai/chat",
      mode: "chat",
      ip: req.ip || null,
      prompt: message,
      ok: true,
      provider: result.provider,
      model: result.model,
      response: result.text
    });
    res.json({ text: result.text, model: result.model, provider: result.provider });
  } catch (error) {
    logAiChat({
      endpoint: "/api/ai/chat",
      mode: "chat",
      ip: req.ip || null,
      prompt: message,
      ok: false,
      error: String(error?.message || "unknown")
    });
    res.status(502).json({ error: `KI-Fehler: ${String(error?.message || "unknown")}` });
  }
});

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
      joinLogCount: amongJoinLogs.length,
      aiLogCount: aiChatLogs.length,
      aiEnabled
    },
    members: adminPublicMemberView(),
    recentMatches: amongMatchHistory.slice(-120).reverse(),
    bans,
    mutes,
    risk,
    reports
  });
});

app.get("/api/admin/ai/logs", (req, res) => {
  const auth = requireAdminRole(req, res, "viewer");
  if (!auth) return;
  res.json({
    ok: true,
    aiEnabled,
    provider: AI_PROVIDER,
    model: AI_PROVIDER === "github" ? GITHUB_MODEL : OPENAI_MODEL,
    logs: [...aiChatLogs].reverse()
  });
});

app.get("/api/admin/modmail", (req, res) => {
  const auth = requireAdminRole(req, res, "viewer");
  if (!auth) return;

  const statusFilter = String(req.query?.status || "all").trim().toLowerCase();
  const allowedStatus = new Set(["all", "open", "in_progress", "resolved", "closed"]);
  const selectedStatus = allowedStatus.has(statusFilter) ? statusFilter : "all";

  const state = modmailLoadState();
  let items = Array.isArray(state.items) ? state.items : [];
  if (selectedStatus !== "all") {
    items = items.filter((entry) => String(entry?.status || "open") === selectedStatus);
  }

  res.json({
    ok: true,
    access: {
      role: auth.role,
      canEdit: hasAdminRole(auth.role, "editor")
    },
    items: items.slice(0, 500)
  });
});

app.get("/api/admin/clips", (req, res) => {
  const auth = requireAdminRole(req, res, "viewer");
  if (!auth) return;

  clipsPurgeExpired("admin-list");
  const index = clipsLoadIndex();
  const list = clipsListLatest(index, req.query.limit || 100);
  res.json({
    ok: true,
    access: {
      role: auth.role,
      canEdit: hasAdminRole(auth.role, "editor")
    },
    clips: list.map((item) => ({
      id: item.id,
      title: item.title || "",
      originalName: item.originalName || "",
      uploadedAt: item.uploadedAt || "",
      size: Number(item.size || 0),
      mimeType: item.mimeType || "video/mp4",
      sharePath: clipsBuildSharePath(item.id),
      videoPath: clipsBuildVideoPath(item.fileName)
    }))
  });
});

app.post("/api/admin/clips/delete", (req, res) => {
  const auth = requireAdminRole(req, res, "editor");
  if (!auth) return;

  const id = String(req.body?.id || "").trim();
  const out = clipsDeleteById(id, "admin", auth.role);
  if (!out.ok) {
    const status = String(out.error || "").toLowerCase().includes("not found") ? 404 : 400;
    res.status(status).json({ ok: false, error: out.error || "Could not delete clip." });
    return;
  }

  res.json({ ok: true, deletedId: id });
});

app.post("/api/clips/delete", clipsRequireAccess, (req, res) => {
  if (!clipsIsTrustedMutationRequest(req)) {
    res.status(403).json({ ok: false, error: "Blocked by security policy." });
    return;
  }

  const ownerId = clipsEnsureOwnerSession(req, res);
  if (clipsIsRateLimited(req, ownerId)) {
    res.status(429).json({ ok: false, error: "Too many delete requests. Please try again later." });
    return;
  }

  const id = String(req.body?.id || "").trim();
  if (!id) {
    res.status(400).json({ ok: false, error: "Missing clip id." });
    return;
  }

  const index = clipsLoadIndex();
  const item = index?.items?.[id];
  if (!item || item.ownerId !== ownerId) {
    res.status(404).json({ ok: false, error: "Clip not found." });
    return;
  }

  const out = clipsDeleteById(id, "owner-self-delete", ownerId);
  if (!out.ok) {
    res.status(400).json({ ok: false, error: out.error || "Could not delete clip." });
    return;
  }

  res.json({ ok: true, deletedId: id });
});

app.post("/api/admin/modmail", (req, res) => {
  const auth = requireAdminRole(req, res, "editor");
  if (!auth) return;

  const id = String(req.body?.id || "").trim();
  const status = String(req.body?.status || "").trim().toLowerCase();
  const adminNote = modmailSanitizeText(req.body?.adminNote, 1000);
  const validStatus = new Set(["open", "in_progress", "resolved", "closed"]);

  if (!id) {
    res.status(400).json({ ok: false, error: "Missing modmail id." });
    return;
  }
  if (status && !validStatus.has(status)) {
    res.status(400).json({ ok: false, error: "Invalid status." });
    return;
  }

  const state = modmailLoadState();
  const idx = state.items.findIndex((entry) => String(entry?.id || "") === id);
  if (idx < 0) {
    res.status(404).json({ ok: false, error: "Modmail entry not found." });
    return;
  }

  const current = state.items[idx] || {};
  state.items[idx] = {
    ...current,
    status: status || current.status || "open",
    adminNote,
    updatedAt: new Date().toISOString(),
    updatedBy: auth.role
  };

  modmailSaveState(state);
  res.json({ ok: true, item: state.items[idx] });
});

app.post("/api/admin/ai/toggle", (req, res) => {
  const auth = requireAdminRole(req, res, "editor");
  if (!auth) return;

  const enabled = req.body?.enabled;
  if (typeof enabled !== "boolean") {
    res.status(400).json({ error: "enabled must be boolean." });
    return;
  }

  aiEnabled = enabled;
  logModerationAction("ai_toggle", {
    enabled,
    by: auth.source || "admin"
  });

  res.json({
    ok: true,
    aiEnabled
  });
});

app.get("/api/admin/discord-commands", async (req, res) => {
  const auth = requireAdminRole(req, res, "viewer");
  if (!auth) return;
  res.json({
    ok: true,
    commands: await loadDiscordCommands(),
    persisted: discordCommandsPersistOk,
    persistError: discordCommandsPersistError,
    persistPath: discordCommandsPersistPath
  });
});

app.post("/api/admin/discord-commands", async (req, res) => {
  const auth = requireAdminRole(req, res, "editor");
  if (!auth) return;

  const session = scrimsGetSession(req);
  const actor = session ? `${auth.source || "admin"} (${session.username}/${session.id})` : (auth.source || "admin");

  const rawCommands = Array.isArray(req.body?.commands) ? req.body.commands : null;
  if (!rawCommands) {
    res.status(400).json({ ok: false, error: "commands must be an array." });
    return;
  }

  if (rawCommands.length > 200) {
    res.status(400).json({ ok: false, error: "Too many commands (max 200)." });
    return;
  }

  try {
    const saved = await saveDiscordCommands(rawCommands);
    const sync = await notifyBotDynamicCommandsRefresh();
    logModerationAction("discord_commands_update", {
      by: actor,
      count: saved.length,
      sync: sync.ok ? "ok" : (sync.attempted ? "failed" : "skipped")
    });
    res.json({
      ok: true,
      commands: saved,
      sync,
      persisted: discordCommandsPersistOk,
      persistError: discordCommandsPersistError,
      persistPath: discordCommandsPersistPath
    });
  } catch (error) {
    res.status(400).json({ ok: false, error: String(error?.message || "Failed to save commands") });
  }
});

app.get("/api/admin/wick-settings", async (req, res) => {
  const auth = requireAdminRole(req, res, "viewer");
  if (!auth) return;
  const settings = await loadWickSettings();
  res.json({
    ok: true,
    settings,
    persisted: wickSettingsPersistOk,
    persistError: wickSettingsPersistError,
    persistPath: wickSettingsPersistPath
  });
});

app.post("/api/admin/wick-settings", async (req, res) => {
  const auth = requireAdminRole(req, res, "editor");
  if (!auth) return;

  const session = scrimsGetSession(req);
  const actor = session ? `${auth.source || "admin"} (${session.username}/${session.id})` : (auth.source || "admin");

  const rawSettings = req.body?.settings;
  if (!rawSettings || typeof rawSettings !== "object") {
    res.status(400).json({ ok: false, error: "settings must be an object." });
    return;
  }

  try {
    const saved = await saveWickSettings(rawSettings);
    const sync = await notifyBotWickSettingsRefresh();
    logModerationAction("wick_settings_update", {
      by: actor,
      guilds: Object.keys(saved.guilds || {}).length,
      sync: sync.ok ? "ok" : (sync.attempted ? "failed" : "skipped")
    });

    res.json({
      ok: true,
      settings: saved,
      sync,
      persisted: wickSettingsPersistOk,
      persistError: wickSettingsPersistError,
      persistPath: wickSettingsPersistPath
    });
  } catch (error) {
    res.status(400).json({ ok: false, error: String(error?.message || "Failed to save Wick settings") });
  }
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

const QUIZ_ANSWER_WINDOW_MS = 3000;
const QUIZ_MIN_PLAYERS = 2;
const QUIZ_MAX_PLAYERS = 8;
const QUIZ_RECONNECT_GRACE_MS = 30000;

function shuffleList(list) {
  const cloned = [...list];
  for (let i = cloned.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
  }
  return cloned;
}

function loadQuizQuestionBank() {
  try {
    const filePath = path.join(__dirname, "public", "quiz_questions.json");
    const raw = fs.readFileSync(filePath, "utf8");
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];

    return data
      .filter((q) => q && typeof q.q === "string" && Array.isArray(q.a) && q.a.length === 4)
      .map((q) => ({
        id: String(q.id || ""),
        category: String(q.category || ""),
        difficulty: String(q.difficulty || "").trim().toLowerCase(),
        q: String(q.q),
        a: q.a.map((x) => String(x)),
        c: Number(q.c)
      }))
      .filter((q) => Number.isInteger(q.c) && q.c >= 0 && q.c <= 3);
  } catch {
    return [];
  }
}

let QUIZ_DUEL_QUESTIONS = loadQuizQuestionBank();

function normalizeQuizDifficulty(raw) {
  const value = String(raw || "").trim().toLowerCase();
  if (["easy", "medium", "hard"].includes(value)) return value;
  return "";
}

function normalizeQuizCategory(raw) {
  return String(raw || "").trim();
}

function normalizeQuizPlayerKey(raw, fallback = null) {
  const value = String(raw || "").trim().slice(0, 80);
  if (value) return value;
  if (fallback) return fallback;
  return `qp_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}

function normalizeQuizMaxPlayers(raw) {
  const value = Math.round(Number(raw));
  if ([4, 6, 8].includes(value)) return value;
  return QUIZ_MAX_PLAYERS;
}

function filterQuizQuestions(bank, { category, difficulty }) {
  const cat = normalizeQuizCategory(category);
  const diff = normalizeQuizDifficulty(difficulty);

  return (Array.isArray(bank) ? bank : []).filter((q) => {
    if (cat && String(q.category || "") !== cat) return false;
    if (diff && String(q.difficulty || "").toLowerCase() !== diff) return false;
    return true;
  });
}

function shuffleQuizAnswers(question) {
  const order = shuffleList([0, 1, 2, 3]);
  const answers = order.map((idx) => String(question.a[idx]));
  const correctIndex = order.indexOf(Number(question.c));
  return {
    id: String(question.id || ""),
    text: String(question.q),
    answers,
    correctIndex
  };
}

function createQuizCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let index = 0; index < 5; index += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  const collision = rooms.has(code) || quizRooms.has(code) || amongRooms.has(code);
  return collision ? createQuizCode() : code;
}

function quizHostIndex(room) {
  if (!room?.hostPlayerKey) return -1;
  return room.players.findIndex((player) => player.playerKey === room.hostPlayerKey);
}

function quizSyncSocketData(room) {
  if (!room || !Array.isArray(room.players)) return;
  room.players.forEach((player, index) => {
    if (!player?.id) return;
    const liveSocket = io.sockets.sockets.get(player.id);
    if (!liveSocket) return;
    liveSocket.data.quizRoomCode = room.code;
    liveSocket.data.quizPlayerIndex = index;
    liveSocket.data.quizPlayerKey = player.playerKey;
  });
}

function quizEnsureHost(room) {
  if (!room || !Array.isArray(room.players)) return;
  if (room.players.length === 0) {
    room.hostPlayerKey = null;
    return;
  }
  const hostExists = room.players.some((player) => player.playerKey === room.hostPlayerKey);
  if (hostExists) return;

  const nextHost = room.players.find((player) => player.connected !== false) || room.players[0];
  room.hostPlayerKey = nextHost.playerKey;
}

function quizClearReconnectTimer(player) {
  if (!player) return;
  if (player.reconnectTimer) {
    clearTimeout(player.reconnectTimer);
    player.reconnectTimer = null;
  }
}

function quizRemovePlayerByKey(room, playerKey, reason = "leave") {
  if (!room || !playerKey) return;
  const playerIndex = room.players.findIndex((player) => player.playerKey === playerKey);
  if (playerIndex < 0) return;

  const [removedPlayer] = room.players.splice(playerIndex, 1);
  quizClearReconnectTimer(removedPlayer);

  if (Array.isArray(room.scores)) room.scores.splice(playerIndex, 1);
  if (Array.isArray(room.ready)) room.ready.splice(playerIndex, 1);
  if (Array.isArray(room.answers)) room.answers.splice(playerIndex, 1);
  if (Array.isArray(room.answerTimes)) room.answerTimes.splice(playerIndex, 1);

  quizEnsureHost(room);
  quizSyncSocketData(room);

  if (room.players.length === 0) {
    quizCleanupRoom(room);
    return;
  }

  if (room.players.length < QUIZ_MIN_PLAYERS) {
    io.to(room.code).emit("quiz_opponent_left", {
      reason,
      reconnectGraceMs: QUIZ_RECONNECT_GRACE_MS
    });
    quizCleanupRoom(room);
    return;
  }

  if (!room.started) {
    room.ready = room.players.map(() => false);
  }

  quizBroadcastRoom(room);
}

function quizScheduleReconnectTimeout(room, playerKey) {
  if (!room || !playerKey) return;
  const player = room.players.find((entry) => entry.playerKey === playerKey);
  if (!player) return;

  quizClearReconnectTimer(player);
  player.reconnectTimer = setTimeout(() => {
    const liveRoom = quizRooms.get(room.code);
    if (!liveRoom) return;
    const livePlayer = liveRoom.players.find((entry) => entry.playerKey === playerKey);
    if (!livePlayer || livePlayer.connected !== false) return;
    quizRemovePlayerByKey(liveRoom, playerKey, "disconnect_timeout");
  }, QUIZ_RECONNECT_GRACE_MS);
}

function quizRoomView(room) {
  return {
    code: room.code,
    players: room.players.map((p) => p.name),
    connected: room.players.map((p) => p.connected !== false),
    scores: room.scores,
    hostIndex: quizHostIndex(room),
    started: room.started,
    ready: Array.isArray(room.ready) ? room.ready : room.players.map(() => false),
    maxPlayers: room.maxPlayers || QUIZ_MAX_PLAYERS,
    settings: {
      questionCount: room.questionCount,
      category: room.category || "",
      difficulty: room.difficulty || "",
      maxPlayers: room.maxPlayers || QUIZ_MAX_PLAYERS
    },
    reconnectGraceMs: QUIZ_RECONNECT_GRACE_MS
  };
}

function quizBroadcastRoom(room) {
  io.to(room.code).emit("quiz_room_update", quizRoomView(room));
}

function quizCanStart(room) {
  if (!room) return false;
  if (room.started) return false;
  if (!Array.isArray(room.players) || room.players.length < QUIZ_MIN_PLAYERS) return false;
  if (!Array.isArray(room.ready) || room.ready.length !== room.players.length) return false;
  return room.ready.every(Boolean);
}

function quizStart(room) {
  if (!room) return;
  if (room.started) return;
  if (!Array.isArray(QUIZ_DUEL_QUESTIONS) || QUIZ_DUEL_QUESTIONS.length < 4) {
    io.to(room.code).emit("quiz_error", "Fragenpool nicht verfügbar.");
    quizCleanupRoom(room);
    return;
  }

  const pool = filterQuizQuestions(QUIZ_DUEL_QUESTIONS, { category: room.category, difficulty: room.difficulty });
  if (room.questionCount > pool.length) {
    io.to(room.code).emit("quiz_error", `Zu wenig Fragen im Pool (${pool.length}).`);
    quizCleanupRoom(room);
    return;
  }

  room.questions = shuffleList(pool).slice(0, room.questionCount).map(shuffleQuizAnswers);
  room.started = true;
  room.currentIndex = 0;
  room.answers = room.players.map(() => null);
  room.answerTimes = room.players.map(() => null);
  room.revealed = false;
  if (room.resolveTimer) {
    clearTimeout(room.resolveTimer);
    room.resolveTimer = null;
  }

  quizBroadcastRoom(room);
  quizSendQuestion(room);
}

function quizSendQuestion(room) {
  const q = room.questions?.[room.currentIndex];
  if (!q) return;
  io.to(room.code).emit("quiz_question", {
    code: room.code,
    questionNumber: room.currentIndex + 1,
    totalQuestions: room.questionCount,
    players: room.players.map((p) => p.name),
    scores: room.scores,
    question: {
      text: q.text,
      answers: q.answers
    }
  });
}

function quizResolveQuestion(room) {
  if (!room || room.revealed) return;

  if (room.resolveTimer) {
    clearTimeout(room.resolveTimer);
    room.resolveTimer = null;
  }

  const q = room.questions?.[room.currentIndex];
  if (!q) return;
  const correctIndex = Number(q.correctIndex);

  const selections = Array.isArray(room.answers) ? [...room.answers] : room.players.map(() => null);
  const times = Array.isArray(room.answerTimes) ? [...room.answerTimes] : room.players.map(() => null);

  let winnerIndex = null;
  let detail = "none";

  const correctPlayers = selections
    .map((selection, index) => ({ index, correct: selection === correctIndex }))
    .filter((entry) => entry.correct)
    .map((entry) => entry.index);

  if (correctPlayers.length > 1) {
    detail = "fastest";
    let bestTime = Number.POSITIVE_INFINITY;
    let bestIndex = correctPlayers[0];

    correctPlayers.forEach((index) => {
      const value = Number(times[index]);
      if (Number.isFinite(value) && value < bestTime) {
        bestTime = value;
        bestIndex = index;
      }
    });

    winnerIndex = bestIndex;
  } else if (correctPlayers.length === 1) {
    detail = "only";
    winnerIndex = correctPlayers[0];
  }

  if (winnerIndex !== null) {
    room.scores[winnerIndex] += 1;
  }

  room.revealed = true;

  io.to(room.code).emit("quiz_result", {
    code: room.code,
    type: winnerIndex === null ? "none" : "correct",
    winnerIndex,
    correctIndex,
    correctAnswer: q.answers[correctIndex],
    selections,
    players: room.players.map((p) => p.name),
    scores: room.scores,
    detail
  });

  quizBroadcastRoom(room);

  const questionIndex = room.currentIndex;
  setTimeout(() => {
    const liveRoom = quizRooms.get(room.code);
    if (!liveRoom) return;
    if (liveRoom.currentIndex !== questionIndex) return;
    quizAdvance(liveRoom);
  }, 2000);
}

function quizAdvance(room) {
  room.currentIndex += 1;
  room.answers = room.players.map(() => null);
  room.answerTimes = room.players.map(() => null);
  room.revealed = false;

  if (room.resolveTimer) {
    clearTimeout(room.resolveTimer);
    room.resolveTimer = null;
  }

  if (room.currentIndex >= room.questionCount) {
    io.to(room.code).emit("quiz_game_over", {
      code: room.code,
      players: room.players.map((p) => p.name),
      scores: room.scores
    });
    quizCleanupRoom(room);
    return;
  }

  quizSendQuestion(room);
}

function quizCleanupRoom(room) {
  if (!room) return;
  if (Array.isArray(room.players)) {
    room.players.forEach((player) => {
      quizClearReconnectTimer(player);
    });
  }
  if (room.cooldownTimer) {
    clearTimeout(room.cooldownTimer);
    room.cooldownTimer = null;
  }
  if (room.resolveTimer) {
    clearTimeout(room.resolveTimer);
    room.resolveTimer = null;
  }
  quizRooms.delete(room.code);
}

function quizLeaveSocket(socket) {
  const code = socket.data.quizRoomCode;
  if (!code) return;
  socket.leave(code);
  socket.data.quizRoomCode = null;
  socket.data.quizPlayerIndex = null;
  socket.data.quizPlayerKey = null;

  const room = quizRooms.get(code);
  if (!room) return;

  const player = room.players.find((entry) => entry.id === socket.id);
  if (!player) return;
  quizRemovePlayerByKey(room, player.playerKey, "leave");
}

function quizHandleDisconnect(socket) {
  const code = socket.data.quizRoomCode;
  if (!code) return;

  const room = quizRooms.get(code);
  socket.data.quizRoomCode = null;
  socket.data.quizPlayerIndex = null;
  socket.data.quizPlayerKey = null;
  if (!room) return;

  const player = room.players.find((entry) => entry.id === socket.id);
  if (!player) return;

  player.id = null;
  player.connected = false;
  player.lastSeenAt = Date.now();

  if (!room.started && Array.isArray(room.ready)) {
    const playerIndex = room.players.findIndex((entry) => entry.playerKey === player.playerKey);
    if (playerIndex >= 0) room.ready[playerIndex] = false;
  }

  quizScheduleReconnectTimeout(room, player.playerKey);
  quizBroadcastRoom(room);
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

  // --- Quiz-Duell (multiplayer, online by room code) ---
  socket.on("quiz_create_room", ({ name, questionCount, category, difficulty, maxPlayers, playerKey }) => {
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

    if (!Array.isArray(QUIZ_DUEL_QUESTIONS) || QUIZ_DUEL_QUESTIONS.length < 4) {
      socket.emit("quiz_error", "Fragenpool nicht verfügbar.");
      return;
    }

    const requested = Math.round(Number(questionCount || 10));
    const count = Math.max(4, Math.min(40, Number.isFinite(requested) ? requested : 10));
    const cat = normalizeQuizCategory(category);
    const diff = normalizeQuizDifficulty(difficulty);
    const roomMaxPlayers = normalizeQuizMaxPlayers(maxPlayers);
    const stablePlayerKey = normalizeQuizPlayerKey(playerKey);
    const filteredPool = filterQuizQuestions(QUIZ_DUEL_QUESTIONS, { category: cat, difficulty: diff });
    if (count > filteredPool.length) {
      socket.emit("quiz_error", `Zu wenig Fragen im Pool (${filteredPool.length}).`);
      return;
    }

    const code = createQuizCode();
    const room = {
      code,
      players: [{ id: socket.id, name: trimmedName, playerKey: stablePlayerKey, connected: true, reconnectTimer: null }],
      hostPlayerKey: stablePlayerKey,
      scores: [0],
      maxPlayers: roomMaxPlayers,
      questionCount: count,
      category: cat,
      difficulty: diff,
      started: false,
      ready: [false],
      questions: null,
      currentIndex: 0,
      answers: [null],
      answerTimes: [null],
      revealed: false,
      cooldownTimer: null,
      resolveTimer: null
    };

    quizRooms.set(code, room);
    socket.join(code);
    socket.data.quizRoomCode = code;
    socket.data.quizPlayerIndex = 0;
    socket.data.quizPlayerKey = stablePlayerKey;

    socket.emit("quiz_room_created", {
      ...quizRoomView(room),
      playerIndex: 0
    });
    quizBroadcastRoom(room);
  });

  socket.on("quiz_join_room", ({ name, code, playerKey }) => {
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
    if (room.players.length >= (room.maxPlayers || QUIZ_MAX_PLAYERS)) {
      socket.emit("quiz_error", "Raum ist voll.");
      return;
    }

    const stablePlayerKey = normalizeQuizPlayerKey(playerKey);
    const duplicateKey = room.players.some((entry) => entry.playerKey === stablePlayerKey);
    if (duplicateKey) {
      socket.emit("quiz_error", "Spieler-Schlüssel bereits vergeben. Bitte neu verbinden.");
      return;
    }

    room.players.push({
      id: socket.id,
      name: trimmedName,
      playerKey: stablePlayerKey,
      connected: true,
      reconnectTimer: null
    });
    room.scores.push(0);
    room.ready = room.players.map(() => false);
    socket.join(room.code);
    socket.data.quizRoomCode = room.code;
    socket.data.quizPlayerIndex = room.players.length - 1;
    socket.data.quizPlayerKey = stablePlayerKey;

    socket.emit("quiz_joined", {
      ...quizRoomView(room),
      playerIndex: room.players.length - 1
    });

    quizBroadcastRoom(room);
  });

  socket.on("quiz_reconnect", ({ code, playerKey, name }) => {
    if (isRateLimited(socket, "quiz_reconnect", 600, "quiz_reconnect")) {
      return;
    }

    const normalizedCode = String(code || "").trim().toUpperCase();
    const stablePlayerKey = normalizeQuizPlayerKey(playerKey, null);
    if (!normalizedCode || !stablePlayerKey) return;

    const room = quizRooms.get(normalizedCode);
    if (!room) return;

    const playerIndex = room.players.findIndex((entry) => entry.playerKey === stablePlayerKey);
    if (playerIndex < 0) return;

    const player = room.players[playerIndex];
    const trimmedName = validName(name);

    if (player.id && player.id !== socket.id) {
      const oldSocket = io.sockets.sockets.get(player.id);
      if (oldSocket) {
        oldSocket.leave(room.code);
        oldSocket.data.quizRoomCode = null;
        oldSocket.data.quizPlayerIndex = null;
        oldSocket.data.quizPlayerKey = null;
      }
    }

    quizClearReconnectTimer(player);
    player.id = socket.id;
    player.connected = true;
    player.lastSeenAt = Date.now();
    if (trimmedName) player.name = trimmedName;

    socket.join(room.code);
    socket.data.quizRoomCode = room.code;
    socket.data.quizPlayerIndex = playerIndex;
    socket.data.quizPlayerKey = stablePlayerKey;

    quizSyncSocketData(room);

    socket.emit("quiz_reconnected", {
      ...quizRoomView(room),
      playerIndex
    });

    if (room.started) {
      const q = room.questions?.[room.currentIndex];
      if (q) {
        io.to(socket.id).emit("quiz_question", {
          code: room.code,
          questionNumber: room.currentIndex + 1,
          totalQuestions: room.questionCount,
          players: room.players.map((p) => p.name),
          scores: room.scores,
          question: {
            text: q.text,
            answers: q.answers
          }
        });
      }
    }

    quizBroadcastRoom(room);
  });

  socket.on("quiz_update_settings", ({ code, questionCount, category, difficulty, maxPlayers }) => {
    if (isRateLimited(socket, "quiz_update_settings", 250, "quiz_update_settings")) {
      return;
    }

    const normalizedCode = String(code || "").trim().toUpperCase();
    const room = quizRooms.get(normalizedCode);
    if (!room) return;
    if (room.started) {
      socket.emit("quiz_error", "Spiel läuft schon.");
      return;
    }
    if (socket.data.quizRoomCode !== room.code) return;

    const playerIndex = Number(socket.data.quizPlayerIndex);
    const hostIndex = quizHostIndex(room);
    if (playerIndex !== hostIndex) return; // host only

    const requested = Math.round(Number(questionCount || room.questionCount || 10));
    const count = Math.max(4, Math.min(40, Number.isFinite(requested) ? requested : 10));
    const cat = normalizeQuizCategory(category);
    const diff = normalizeQuizDifficulty(difficulty);
    const maxPlayersNormalized = normalizeQuizMaxPlayers(maxPlayers || room.maxPlayers || QUIZ_MAX_PLAYERS);
    if (maxPlayersNormalized < room.players.length) {
      socket.emit("quiz_error", `Max-Spieler (${maxPlayersNormalized}) ist kleiner als aktuelle Spielerzahl (${room.players.length}).`);
      return;
    }
    const filteredPool = filterQuizQuestions(QUIZ_DUEL_QUESTIONS, { category: cat, difficulty: diff });
    if (count > filteredPool.length) {
      socket.emit("quiz_error", `Zu wenig Fragen im Pool (${filteredPool.length}).`);
      return;
    }

    room.questionCount = count;
    room.category = cat;
    room.difficulty = diff;
    room.maxPlayers = maxPlayersNormalized;
    room.questions = null;

    // Changing settings resets readiness.
    room.ready = room.players.map(() => false);
    quizBroadcastRoom(room);
  });

  socket.on("quiz_ready", ({ code }) => {
    if (isRateLimited(socket, "quiz_ready", 200, "quiz_ready")) {
      return;
    }

    const normalizedCode = String(code || "").trim().toUpperCase();
    const room = quizRooms.get(normalizedCode);
    if (!room) return;
    if (room.started) return;
    if (socket.data.quizRoomCode !== room.code) return;

    const playerIndex = Number(socket.data.quizPlayerIndex);
    if (!Number.isInteger(playerIndex) || playerIndex < 0 || playerIndex >= room.players.length) return;

    if (!Array.isArray(room.ready) || room.ready.length !== room.players.length) {
      room.ready = room.players.map(() => false);
    }
    room.ready[playerIndex] = true;
    quizBroadcastRoom(room);

    if (quizCanStart(room)) {
      quizStart(room);
    }
  });

  socket.on("quiz_answer", ({ code, selectedIndex }) => {
    if (isRateLimited(socket, "quiz_answer", 250, "quiz_answer")) {
      return;
    }

    const normalizedCode = String(code || "").trim().toUpperCase();
    const room = quizRooms.get(normalizedCode);
    if (!room || !room.started) return;
    if (socket.data.quizRoomCode !== room.code) return;

    const playerIndex = Number(socket.data.quizPlayerIndex);
    if (!Number.isInteger(playerIndex) || playerIndex < 0 || playerIndex >= room.players.length) return;
    if (room.revealed) return;
    if (!Array.isArray(room.answers) || room.answers.length !== room.players.length) {
      room.answers = room.players.map(() => null);
    }
    if (!Array.isArray(room.answerTimes) || room.answerTimes.length !== room.players.length) {
      room.answerTimes = room.players.map(() => null);
    }
    if (room.answers[playerIndex] !== null && room.answers[playerIndex] !== undefined) return;

    const idx = Math.max(0, Math.min(3, Math.round(Number(selectedIndex))));
    room.answers[playerIndex] = idx;
    room.answerTimes[playerIndex] = Date.now();

    const questionIndex = room.currentIndex;

    if (!room.resolveTimer) {
      room.resolveTimer = setTimeout(() => {
        const liveRoom = quizRooms.get(room.code);
        if (!liveRoom) return;
        if (liveRoom.currentIndex !== questionIndex) return;
        quizResolveQuestion(liveRoom);
      }, QUIZ_ANSWER_WINDOW_MS);
    }

    const bothAnswered = room.answers.every((value) => value !== null && value !== undefined);
    if (bothAnswered) {
      quizResolveQuestion(room);
    }
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
    quizHandleDisconnect(socket);
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
