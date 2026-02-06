const path = require('path');
const fs = require('fs');
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const mime = require('mime-types');

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret-change-me';
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PROD = NODE_ENV === 'production';

const ROOT = __dirname;
// Optional persistent storage paths (useful on Render with a mounted disk).
// IMPORTANT: If STORAGE_DIR points to an unwritable path (e.g. disk not mounted),
// we fall back to the project directory so the service still boots.
let STORAGE_ROOT;
let DATA_DIR;
let UPLOADS_DIR;
let COVERS_DIR;
let USERS_PATH;
let TRACKS_PATH;
let PLAYLISTS_PATH;

function computeStoragePaths({ storageDir, dataDir, uploadsDir, rootDir }) {
  const baseRoot = storageDir ? path.resolve(storageDir) : rootDir;
  const data = dataDir ? path.resolve(dataDir) : path.join(baseRoot, 'data');
  const uploads = uploadsDir ? path.resolve(uploadsDir) : path.join(baseRoot, 'uploads');
  const covers = path.join(uploads, 'covers');
  return {
    storageRoot: baseRoot,
    dataDir: data,
    uploadsDir: uploads,
    coversDir: covers,
    usersPath: path.join(data, 'users.json'),
    tracksPath: path.join(data, 'tracks.json'),
    playlistsPath: path.join(data, 'playlists.json')
  };
}

function applyStoragePaths(p) {
  STORAGE_ROOT = p.storageRoot;
  DATA_DIR = p.dataDir;
  UPLOADS_DIR = p.uploadsDir;
  COVERS_DIR = p.coversDir;
  USERS_PATH = p.usersPath;
  TRACKS_PATH = p.tracksPath;
  PLAYLISTS_PATH = p.playlistsPath;
}

applyStoragePaths(computeStoragePaths({
  storageDir: process.env.STORAGE_DIR,
  dataDir: process.env.DATA_DIR,
  uploadsDir: process.env.UPLOADS_DIR,
  rootDir: ROOT
}));

function makeId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  if (!fs.existsSync(COVERS_DIR)) fs.mkdirSync(COVERS_DIR, { recursive: true });
  if (!fs.existsSync(USERS_PATH)) fs.writeFileSync(USERS_PATH, JSON.stringify({ users: [] }, null, 2));
  if (!fs.existsSync(TRACKS_PATH)) fs.writeFileSync(TRACKS_PATH, JSON.stringify({ tracks: [] }, null, 2));
  if (!fs.existsSync(PLAYLISTS_PATH)) fs.writeFileSync(PLAYLISTS_PATH, JSON.stringify({ playlists: [] }, null, 2));
}

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function bootstrapAdminFromEnv() {
  const username = String(process.env.BOOTSTRAP_ADMIN_USERNAME || '').trim();
  const password = String(process.env.BOOTSTRAP_ADMIN_PASSWORD || '');
  if (!username || !password) return;

  try {
    const db = readJson(USERS_PATH);
    const users = Array.isArray(db.users) ? db.users : [];
    const exists = users.find(u => String(u.username || '').trim().toLowerCase() === username.toLowerCase());
    if (exists) return;

    const hash = bcrypt.hashSync(password, 10);
    users.push({
      id: makeId('user'),
      username,
      passwordHash: hash,
      role: 'admin',
      createdAt: new Date().toISOString()
    });
    writeJson(USERS_PATH, { users });
    console.log(`[bootstrap] Admin user created: ${username}`);
  } catch (e) {
    console.log('[bootstrap] Failed to create admin user:', e && e.message ? e.message : e);
  }
}

function getUserById(userId) {
  const db = readJson(USERS_PATH);
  return (db.users || []).find(u => u.id === userId) || null;
}

function getUserByUsername(username) {
  const db = readJson(USERS_PATH);
  const needle = String(username || '').trim().toLowerCase();
  if (!needle) return null;
  return (db.users || []).find(u => String(u.username || '').trim().toLowerCase() === needle) || null;
}

function getUserRole(user) {
  const role = user && user.role ? String(user.role).toLowerCase() : 'user';
  return role === 'admin' ? 'admin' : 'user';
}

function isAdminUser(user) {
  return getUserRole(user) === 'admin';
}

function canDeleteTrack(user, track) {
  if (!user || !track) return false;
  if (isAdminUser(user)) return true;
  return track.uploadedBy === user.id;
}

function requireAuth(req, res, next) {
  if (req.session && req.session.userId) return next();
  res.status(401).json({ error: 'Not authenticated' });
}

function requireAdmin(req, res, next) {
  const user = req.session && req.session.userId ? getUserById(req.session.userId) : null;
  if (!user) return res.status(401).json({ error: 'Not authenticated' });
  if (!isAdminUser(user)) return res.status(403).json({ error: 'Forbidden' });
  next();
}

function toPublicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    role: getUserRole(user),
    createdAt: user.createdAt
  };
}

function safeFilename(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function safeTagList(input) {
  if (Array.isArray(input)) {
    return input
      .map(t => String(t || '').trim())
      .filter(Boolean)
      .slice(0, 20);
  }
  const raw = String(input || '').trim();
  return raw
    ? raw.split(',').map(t => String(t).trim()).filter(Boolean).slice(0, 20)
    : [];
}

function extFromMime(mimeType) {
  const mt = String(mimeType || '').toLowerCase();
  if (mt === 'image/jpeg' || mt === 'image/jpg') return '.jpg';
  if (mt === 'image/png') return '.png';
  if (mt === 'image/webp') return '.webp';
  if (mt === 'image/gif') return '.gif';
  return '';
}

let musicMetadataModule = null;
async function getMusicMetadata() {
  if (musicMetadataModule) return musicMetadataModule;
  // music-metadata is ESM in newer versions; dynamic import works in CommonJS.
  musicMetadataModule = await import('music-metadata');
  return musicMetadataModule;
}

try {
  ensureDirs();
} catch (e) {
  const msg = e && e.message ? e.message : String(e);
  console.log(`[storage] Failed to init storage at "${STORAGE_ROOT}": ${msg}`);
  console.log('[storage] Falling back to project directory storage.');
  applyStoragePaths(computeStoragePaths({ rootDir: ROOT }));
  ensureDirs();
}

bootstrapAdminFromEnv();

const app = express();

// When hosting behind a reverse proxy (Render/Fly/Nginx), this is required for secure cookies.
app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'same-site' }
}));
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));

app.use(session({
  name: 'hanno.sid',
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: IS_PROD,
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
}));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

// If you want the whole site private: redirect all non-API requests to /login until authenticated.
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  if (req.path.startsWith('/uploads/')) return next();

  // Public login page
  if (req.method === 'GET' && (req.path === '/login' || req.path === '/login.html')) return next();

  const loggedIn = !!(req.session && req.session.userId);
  if (!loggedIn && req.method === 'GET') {
    return res.redirect('/login');
  }
  return next();
});

// Protect uploaded files: only accessible when logged in.
// IMPORTANT: This must be registered BEFORE express.static(ROOT), otherwise uploads would be public.
app.use('/uploads', requireAuth, express.static(UPLOADS_DIR));

// Serve your existing static site files
app.use(express.static(ROOT, {
  maxAge: IS_PROD ? '1h' : 0,
  etag: true,
  lastModified: true
}));

app.get('/', (_req, res) => {
  res.sendFile(path.join(ROOT, 'index.html'));
});

app.get('/login', (_req, res) => {
  res.sendFile(path.join(ROOT, 'login.html'));
});

const storage = multer.diskStorage({
  destination: function (_req, file, cb) {
    if (file && file.fieldname === 'cover') return cb(null, COVERS_DIR);
    cb(null, UPLOADS_DIR);
  },
  filename: function (_req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const base = safeFilename(path.basename(file.originalname || (file.fieldname === 'cover' ? 'cover' : 'track'), ext));
    const stamp = Date.now();
    cb(null, `${stamp}_${base}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  },
  fileFilter: function (_req, file, cb) {
    const isCover = file && file.fieldname === 'cover';
    if (isCover) {
      const allowedImages = new Set([
        'image/png',
        'image/jpeg',
        'image/webp',
        'image/gif'
      ]);

      const mimetype = (file.mimetype || '').toLowerCase();
      const ext = path.extname(file.originalname || '').toLowerCase();
      const byExt = mime.lookup(ext) || '';

      if (allowedImages.has(mimetype) || allowedImages.has(String(byExt).toLowerCase())) {
        return cb(null, true);
      }
      return cb(new Error('Nur Cover-Bilder sind erlaubt (PNG/JPG/WEBP/GIF).'));
    }

    const allowed = new Set([
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/x-wav',
      'audio/ogg',
      'audio/flac',
      'audio/x-flac',
      'audio/mp4',
      'audio/aac',
      'audio/x-m4a',
      // Some OS/browsers label M4A/MP4 audio as video/mp4
      'video/mp4',
      // WebM audio/video containers
      'audio/webm',
      'video/webm',
      // Some uploads come through as generic binary
      'application/octet-stream'
    ]);

    const allowedExts = new Set([
      '.mp3',
      '.wav',
      '.ogg',
      '.flac',
      '.m4a',
      '.aac',
      '.mp4',
      '.webm',
      '.opus'
    ]);

    const mimetype = (file.mimetype || '').toLowerCase();
    const ext = path.extname(file.originalname || '').toLowerCase();
    const byExt = mime.lookup(ext) || '';

    if (ext === '.url') {
      return cb(new Error('Das ist eine .url Link-Datei (keine Audio-Datei). Bitte wähle eine echte Audio-Datei (z.B. MP3).'));
    }

    if (allowedExts.has(ext)) {
      return cb(null, true);
    }

    if (allowed.has(mimetype) || allowed.has(String(byExt).toLowerCase())) {
      return cb(null, true);
    }

    cb(new Error('Nur Audio-Dateien sind erlaubt (MP3, WAV, OGG, FLAC, M4A, MP4, WEBM, OPUS).'));
  }
});

app.get('/api/me', (req, res) => {
  if (!req.session.userId) return res.json({ loggedIn: false });

  const user = getUserById(req.session.userId);
  if (!user) return res.json({ loggedIn: false });

  res.json({ loggedIn: true, username: user.username, role: getUserRole(user) });
});

// Basic in-memory login throttling (simple + effective for small private sites)
const loginAttempts = new Map();
const LOGIN_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const LOGIN_MAX_FAILS = 10;
const LOGIN_LOCK_MS = 15 * 60 * 1000; // 15 minutes

function loginKey(req, username) {
  const u = String(username || '').toLowerCase();
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  return `${ip}|${u}`;
}

function getAttemptState(key) {
  const now = Date.now();
  const state = loginAttempts.get(key);
  if (!state) return null;
  if (state.lockedUntil && state.lockedUntil > now) return state;
  if (state.firstAt && now - state.firstAt > LOGIN_WINDOW_MS) {
    loginAttempts.delete(key);
    return null;
  }
  return state;
}

function registerLoginFail(key) {
  const now = Date.now();
  const current = getAttemptState(key);
  const next = current || { fails: 0, firstAt: now, lockedUntil: 0 };
  if (!next.firstAt) next.firstAt = now;
  next.fails = (next.fails || 0) + 1;
  if (next.fails >= LOGIN_MAX_FAILS) {
    next.lockedUntil = now + LOGIN_LOCK_MS;
  }
  loginAttempts.set(key, next);
  return next;
}

function clearLoginAttempts(key) {
  loginAttempts.delete(key);
}

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body || {};
  const usernameNorm = String(username || '').trim();

  if (!usernameNorm || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const key = loginKey(req, usernameNorm);
  const state = getAttemptState(key);
  if (state && state.lockedUntil && state.lockedUntil > Date.now()) {
    const seconds = Math.ceil((state.lockedUntil - Date.now()) / 1000);
    return res.status(429).json({ error: `Too many failed logins. Try again in ${seconds}s.` });
  }

  const user = getUserByUsername(usernameNorm);
  if (!user) {
    registerLoginFail(key);
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const ok = await bcrypt.compare(String(password), user.passwordHash);
  if (!ok) {
    registerLoginFail(key);
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  req.session.userId = user.id;
  clearLoginAttempts(key);
  res.json({ ok: true, username: user.username, role: getUserRole(user) });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

app.post('/api/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'currentPassword and newPassword required' });
  }
  const nextPw = String(newPassword);
  if (nextPw.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters.' });
  }

  const db = readJson(USERS_PATH);
  db.users = Array.isArray(db.users) ? db.users : [];
  const idx = db.users.findIndex(u => u.id === req.session.userId);
  if (idx === -1) return res.status(401).json({ error: 'Not authenticated' });

  const user = db.users[idx];
  const ok = await bcrypt.compare(String(currentPassword), user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid current password' });

  const passwordHash = await bcrypt.hash(nextPw, 10);
  db.users[idx] = {
    ...user,
    passwordHash,
    passwordChangedAt: new Date().toISOString()
  };
  writeJson(USERS_PATH, db);
  res.json({ ok: true });
});

// Admin user management (minimal)
app.get('/api/users', requireAuth, requireAdmin, (_req, res) => {
  const db = readJson(USERS_PATH);
  const users = Array.isArray(db.users) ? db.users : [];
  res.json({ users: users.map(toPublicUser) });
});

app.post('/api/users', requireAuth, requireAdmin, async (req, res) => {
  const { username, password, role } = req.body || {};
  const u = String(username || '').trim();
  const p = String(password || '');
  const r = String(role || 'user').toLowerCase() === 'admin' ? 'admin' : 'user';

  if (!u || u.length < 3) return res.status(400).json({ error: 'Username must be at least 3 characters.' });
  if (!p || p.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });

  const db = readJson(USERS_PATH);
  db.users = Array.isArray(db.users) ? db.users : [];

  const exists = db.users.find(x => x.username.toLowerCase() === u.toLowerCase());
  if (exists) return res.status(409).json({ error: 'User already exists.' });

  const passwordHash = await bcrypt.hash(p, 10);
  const user = {
    id: 'u_' + Date.now().toString(36),
    username: u,
    passwordHash,
    role: r,
    createdAt: new Date().toISOString()
  };
  db.users.push(user);
  writeJson(USERS_PATH, db);
  res.json({ ok: true, user: toPublicUser(user) });
});

app.delete('/api/users/:id', requireAuth, requireAdmin, (req, res) => {
  const id = String(req.params.id || '').trim();
  if (!id) return res.status(400).json({ error: 'Missing id' });
  if (req.session.userId === id) return res.status(400).json({ error: 'Cannot delete yourself' });

  const db = readJson(USERS_PATH);
  db.users = Array.isArray(db.users) ? db.users : [];
  const idx = db.users.findIndex(u => u.id === id);
  if (idx === -1) return res.status(404).json({ error: 'User not found' });

  db.users.splice(idx, 1);
  writeJson(USERS_PATH, db);
  res.json({ ok: true });
});

app.get('/api/playlists', requireAuth, (req, res) => {
  const user = getUserById(req.session.userId);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const db = readJson(PLAYLISTS_PATH);
  const playlists = Array.isArray(db.playlists) ? db.playlists : [];
  const visible = isAdminUser(user)
    ? playlists
    : playlists.filter(p => p.ownerId === user.id);

  res.json({ playlists: visible });
});

app.post('/api/playlists', requireAuth, (req, res) => {
  const user = getUserById(req.session.userId);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const name = String((req.body && req.body.name) || '').trim();
  if (!name || name.length < 2) return res.status(400).json({ error: 'Playlist name must be at least 2 characters.' });

  const db = readJson(PLAYLISTS_PATH);
  db.playlists = Array.isArray(db.playlists) ? db.playlists : [];

  const playlist = {
    id: makeId('p'),
    name: name.slice(0, 60),
    ownerId: user.id,
    trackIds: [],
    createdAt: new Date().toISOString()
  };

  db.playlists.unshift(playlist);
  writeJson(PLAYLISTS_PATH, db);
  res.json({ ok: true, playlist });
});

app.delete('/api/playlists/:id', requireAuth, (req, res) => {
  const user = getUserById(req.session.userId);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const id = String(req.params.id || '').trim();
  if (!id) return res.status(400).json({ error: 'Missing id' });

  const db = readJson(PLAYLISTS_PATH);
  db.playlists = Array.isArray(db.playlists) ? db.playlists : [];
  const idx = db.playlists.findIndex(p => p.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Playlist not found' });

  const playlist = db.playlists[idx];
  if (!isAdminUser(user) && playlist.ownerId !== user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  db.playlists.splice(idx, 1);
  writeJson(PLAYLISTS_PATH, db);
  res.json({ ok: true });
});

app.post('/api/playlists/:id/tracks', requireAuth, (req, res) => {
  const user = getUserById(req.session.userId);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const playlistId = String(req.params.id || '').trim();
  const trackId = String((req.body && req.body.trackId) || '').trim();
  if (!playlistId) return res.status(400).json({ error: 'Missing playlist id' });
  if (!trackId) return res.status(400).json({ error: 'Missing trackId' });

  const playlistsDb = readJson(PLAYLISTS_PATH);
  playlistsDb.playlists = Array.isArray(playlistsDb.playlists) ? playlistsDb.playlists : [];
  const idx = playlistsDb.playlists.findIndex(p => p.id === playlistId);
  if (idx === -1) return res.status(404).json({ error: 'Playlist not found' });
  const playlist = playlistsDb.playlists[idx];
  if (!isAdminUser(user) && playlist.ownerId !== user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const tracksDb = readJson(TRACKS_PATH);
  const tracks = Array.isArray(tracksDb.tracks) ? tracksDb.tracks : [];
  const track = tracks.find(t => t.id === trackId);
  if (!track) return res.status(404).json({ error: 'Track not found' });
  if (!isAdminUser(user) && track.uploadedBy !== user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  playlist.trackIds = Array.isArray(playlist.trackIds) ? playlist.trackIds : [];
  if (!playlist.trackIds.includes(trackId)) playlist.trackIds.push(trackId);
  playlistsDb.playlists[idx] = playlist;
  writeJson(PLAYLISTS_PATH, playlistsDb);

  res.json({ ok: true, playlist });
});

app.delete('/api/playlists/:id/tracks/:trackId', requireAuth, (req, res) => {
  const user = getUserById(req.session.userId);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const playlistId = String(req.params.id || '').trim();
  const trackId = String(req.params.trackId || '').trim();
  if (!playlistId) return res.status(400).json({ error: 'Missing playlist id' });
  if (!trackId) return res.status(400).json({ error: 'Missing trackId' });

  const db = readJson(PLAYLISTS_PATH);
  db.playlists = Array.isArray(db.playlists) ? db.playlists : [];
  const idx = db.playlists.findIndex(p => p.id === playlistId);
  if (idx === -1) return res.status(404).json({ error: 'Playlist not found' });
  const playlist = db.playlists[idx];
  if (!isAdminUser(user) && playlist.ownerId !== user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  playlist.trackIds = Array.isArray(playlist.trackIds) ? playlist.trackIds : [];
  playlist.trackIds = playlist.trackIds.filter(id => id !== trackId);
  db.playlists[idx] = playlist;
  writeJson(PLAYLISTS_PATH, db);
  res.json({ ok: true, playlist });
});

app.post(
  '/api/upload',
  requireAuth,
  upload.fields([{ name: 'file', maxCount: 10 }, { name: 'cover', maxCount: 1 }]),
  async (req, res) => {
    const files = req.files && req.files.file ? req.files.file : [];
    const cover = req.files && req.files.cover && req.files.cover[0] ? req.files.cover[0] : null;
    const titleInput = String((req.body && req.body.title) || '').trim();
    const descriptionInput = String((req.body && req.body.description) || '').trim();
    const tagsInput = safeTagList(req.body && req.body.tags);

    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // If multi-upload, discard the single cover (otherwise it becomes an orphan file).
    if (files.length > 1 && cover && cover.filename) {
      try {
        const coverSafe = path.basename(String(cover.filename));
        const coverPath = path.join(COVERS_DIR, coverSafe);
        if (coverSafe && fs.existsSync(coverPath)) fs.unlinkSync(coverPath);
      } catch {
        // ignore
      }
    }

    const db = readJson(TRACKS_PATH);
    db.tracks = Array.isArray(db.tracks) ? db.tracks : [];

    const created = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      let id3 = null;
      try {
        const mm = await getMusicMetadata();
        id3 = await mm.parseFile(file.path, { duration: true });
      } catch {
        id3 = null;
      }

      const common = id3 && id3.common ? id3.common : {};
      const format = id3 && id3.format ? id3.format : {};

      const id3Title = common.title ? String(common.title).trim() : '';
      const id3Artist = common.artist ? String(common.artist).trim() : '';
      const id3Album = common.album ? String(common.album).trim() : '';
      const id3Year = common.year ? Number(common.year) : null;
      const id3Bpm = common.bpm ? Number(common.bpm) : null;
      const id3Genres = Array.isArray(common.genre) ? common.genre : (common.genre ? [common.genre] : []);
      const id3Duration = Number.isFinite(format.duration) ? Math.round(Number(format.duration)) : null;

      const mergedTags = [...tagsInput];
      for (const g of id3Genres) {
        const gt = String(g || '').trim();
        if (gt && !mergedTags.includes(gt)) mergedTags.push(gt);
      }
      if (Number.isFinite(id3Bpm) && id3Bpm > 0) {
        const bpmTag = `${Math.round(id3Bpm)}BPM`;
        if (!mergedTags.includes(bpmTag)) mergedTags.push(bpmTag);
      }

      const trackTitle = (files.length === 1 ? titleInput : '') || id3Title || path.basename(file.originalname);
      const trackDescription = (files.length === 1 ? descriptionInput : '') || '';

      let coverStoredName = files.length === 1 && cover ? cover.filename : null;
      let coverOriginalName = files.length === 1 && cover ? cover.originalname : null;

      // Embedded cover extraction (only when no explicit cover was uploaded)
      if (files.length === 1 && !coverStoredName && common.picture && common.picture[0] && common.picture[0].data) {
        try {
          const pic = common.picture[0];
          const ext = extFromMime(pic.format || '') || '.jpg';
          const stored = `${Date.now()}_${safeFilename(path.basename(file.originalname || 'track', path.extname(file.originalname || '')))}_embedded${ext}`;
          const outPath = path.join(COVERS_DIR, stored);
          fs.writeFileSync(outPath, pic.data);
          coverStoredName = stored;
          coverOriginalName = 'embedded-cover';
        } catch {
          // ignore embedded cover failures
        }
      }

      const track = {
        id: makeId('t'),
        title: trackTitle,
        description: trackDescription,
        tags: mergedTags.slice(0, 20),
        originalName: file.originalname,
        storedName: file.filename,
        coverOriginalName,
        coverStoredName,
        mimeType: file.mimetype,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        uploadedBy: req.session.userId,
        durationSec: id3Duration,
        artist: id3Artist || null,
        album: id3Album || null,
        year: Number.isFinite(id3Year) ? id3Year : null,
        bpm: Number.isFinite(id3Bpm) ? id3Bpm : null
      };

      db.tracks.unshift(track);
      created.push(track);
    }

    writeJson(TRACKS_PATH, db);

    res.json({ ok: true, track: created[0], tracks: created });
  }
);

app.patch('/api/tracks/:id', requireAuth, (req, res) => {
  const user = getUserById(req.session.userId);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const id = String(req.params.id || '').trim();
  if (!id) return res.status(400).json({ error: 'Missing id' });

  const db = readJson(TRACKS_PATH);
  db.tracks = Array.isArray(db.tracks) ? db.tracks : [];
  const idx = db.tracks.findIndex(t => t.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Track not found' });

  const track = db.tracks[idx];
  if (!canDeleteTrack(user, track)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const next = { ...track };
  if ('title' in (req.body || {})) {
    const t = String(req.body.title || '').trim();
    if (t) next.title = t.slice(0, 120);
  }
  if ('description' in (req.body || {})) {
    next.description = String(req.body.description || '').trim().slice(0, 240);
  }
  if ('tags' in (req.body || {})) {
    next.tags = safeTagList(req.body.tags);
  }
  next.updatedAt = new Date().toISOString();

  db.tracks[idx] = next;
  writeJson(TRACKS_PATH, db);
  res.json({ ok: true, track: next });
});

app.get('/api/tracks', requireAuth, (req, res) => {
  const db = readJson(TRACKS_PATH);
  const tracks = Array.isArray(db.tracks) ? db.tracks : [];

  const user = getUserById(req.session.userId);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  if (isAdminUser(user)) {
    const usersDb = readJson(USERS_PATH);
    const users = Array.isArray(usersDb.users) ? usersDb.users : [];
    const byId = new Map(users.map(u => [u.id, u.username]));

    const enriched = tracks.map(t => ({
      ...t,
      uploadedByUsername: byId.get(t.uploadedBy) || null
    }));

    return res.json({ tracks: enriched });
  }

  const mine = tracks.filter(t => t.uploadedBy === req.session.userId);
  res.json({ tracks: mine });
});

app.delete('/api/tracks/:id', requireAuth, (req, res) => {
  const user = getUserById(req.session.userId);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const id = String(req.params.id || '').trim();
  if (!id) return res.status(400).json({ error: 'Missing id' });

  const db = readJson(TRACKS_PATH);
  db.tracks = Array.isArray(db.tracks) ? db.tracks : [];

  const idx = db.tracks.findIndex(t => t.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Track not found' });

  const track = db.tracks[idx];
  if (!canDeleteTrack(user, track)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  db.tracks.splice(idx, 1);
  writeJson(TRACKS_PATH, db);

  // Remove track from any playlists
  try {
    const pdb = readJson(PLAYLISTS_PATH);
    pdb.playlists = Array.isArray(pdb.playlists) ? pdb.playlists : [];
    let changed = false;
    for (const p of pdb.playlists) {
      if (!Array.isArray(p.trackIds)) continue;
      const before = p.trackIds.length;
      p.trackIds = p.trackIds.filter(tid => tid !== id);
      if (p.trackIds.length !== before) changed = true;
    }
    if (changed) writeJson(PLAYLISTS_PATH, pdb);
  } catch {
    // ignore
  }

  const safe = path.basename(String(track.storedName || ''));
  const fullPath = path.join(UPLOADS_DIR, safe);
  try {
    if (safe && fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  } catch {
    // ignore file delete errors
  }

  const coverSafe = path.basename(String(track.coverStoredName || ''));
  const coverPath = path.join(COVERS_DIR, coverSafe);
  try {
    if (coverSafe && fs.existsSync(coverPath)) fs.unlinkSync(coverPath);
  } catch {
    // ignore file delete errors
  }

  res.json({ ok: true });
});

app.use((err, _req, res, _next) => {
  const message = err && err.message ? err.message : 'Server error';
  res.status(400).json({ error: message });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Tip: Create a user with: npm install; npm run create-user -- hanno SuperSicheresPasswort');
});
