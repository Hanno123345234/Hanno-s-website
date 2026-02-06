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
const DATA_DIR = path.join(ROOT, 'data');
const UPLOADS_DIR = path.join(ROOT, 'uploads');
const USERS_PATH = path.join(DATA_DIR, 'users.json');
const TRACKS_PATH = path.join(DATA_DIR, 'tracks.json');

function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  if (!fs.existsSync(USERS_PATH)) fs.writeFileSync(USERS_PATH, JSON.stringify({ users: [] }, null, 2));
  if (!fs.existsSync(TRACKS_PATH)) fs.writeFileSync(TRACKS_PATH, JSON.stringify({ tracks: [] }, null, 2));
}

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function getUserById(userId) {
  const db = readJson(USERS_PATH);
  return (db.users || []).find(u => u.id === userId) || null;
}

function getUserByUsername(username) {
  const db = readJson(USERS_PATH);
  return (db.users || []).find(u => u.username.toLowerCase() === String(username).toLowerCase()) || null;
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

function safeFilename(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

ensureDirs();

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

// Serve your existing static site files
app.use(express.static(ROOT));

app.get('/', (_req, res) => {
  res.sendFile(path.join(ROOT, 'index.html'));
});

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (_req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const base = safeFilename(path.basename(file.originalname || 'track', ext));
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
      'audio/x-m4a'
    ]);

    const mimetype = (file.mimetype || '').toLowerCase();
    const ext = path.extname(file.originalname || '').toLowerCase();
    const byExt = mime.lookup(ext) || '';

    if (allowed.has(mimetype) || allowed.has(String(byExt).toLowerCase())) {
      return cb(null, true);
    }

    cb(new Error('Only audio files are allowed.'));
  }
});

app.get('/api/me', (req, res) => {
  if (!req.session.userId) return res.json({ loggedIn: false });

  const user = getUserById(req.session.userId);
  if (!user) return res.json({ loggedIn: false });

  res.json({ loggedIn: true, username: user.username, role: getUserRole(user) });
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const user = getUserByUsername(username);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const ok = await bcrypt.compare(String(password), user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  req.session.userId = user.id;
  res.json({ ok: true, username: user.username, role: getUserRole(user) });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

app.post('/api/upload', requireAuth, upload.single('file'), (req, res) => {
  const file = req.file;
  const title = String((req.body && req.body.title) || '').trim();
  const description = String((req.body && req.body.description) || '').trim();

  if (!file) return res.status(400).json({ error: 'No file uploaded' });

  const db = readJson(TRACKS_PATH);
  db.tracks = Array.isArray(db.tracks) ? db.tracks : [];

  const track = {
    id: 't_' + Date.now().toString(36),
    title: title || path.basename(file.originalname),
    description,
    originalName: file.originalname,
    storedName: file.filename,
    mimeType: file.mimetype,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    uploadedBy: req.session.userId
  };

  db.tracks.unshift(track);
  writeJson(TRACKS_PATH, db);

  res.json({ ok: true, track });
});

app.get('/api/tracks', requireAuth, (req, res) => {
  const db = readJson(TRACKS_PATH);
  const tracks = Array.isArray(db.tracks) ? db.tracks : [];

  const user = getUserById(req.session.userId);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  if (isAdminUser(user)) {
    return res.json({ tracks });
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

  const safe = path.basename(String(track.storedName || ''));
  const fullPath = path.join(UPLOADS_DIR, safe);
  try {
    if (safe && fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  } catch {
    // ignore file delete errors
  }

  res.json({ ok: true });
});

// Protect uploaded files: only accessible when logged in
app.get('/uploads/:file', requireAuth, (req, res) => {
  const requested = String(req.params.file || '');
  const safe = path.basename(requested);
  const fullPath = path.join(UPLOADS_DIR, safe);

  if (!fs.existsSync(fullPath)) return res.status(404).send('Not found');
  res.sendFile(fullPath);
});

app.use((err, _req, res, _next) => {
  const message = err && err.message ? err.message : 'Server error';
  res.status(400).json({ error: message });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Tip: Create a user with: npm install; npm run create-user -- hanno SuperSicheresPasswort');
});
