const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
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
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function writeWavPcm16({ filePath, durationSec, sampleRate, frequencyHz }) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;

  const totalSamples = Math.floor(durationSec * sampleRate);
  const dataSize = totalSamples * numChannels * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // PCM
  buffer.writeUInt16LE(1, 20); // audio format PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * numChannels * bytesPerSample, 28); // byte rate
  buffer.writeUInt16LE(numChannels * bytesPerSample, 32); // block align
  buffer.writeUInt16LE(bitsPerSample, 34);

  // data chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  const amplitude = 0.25; // avoid clipping
  const fadeSamples = Math.floor(sampleRate * 0.02); // 20ms fade

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    let env = 1;
    if (i < fadeSamples) env = i / fadeSamples;
    if (i > totalSamples - fadeSamples) env = (totalSamples - i) / fadeSamples;

    const s = Math.sin(2 * Math.PI * frequencyHz * t) * amplitude * env;
    const v = Math.max(-1, Math.min(1, s));
    const int16 = Math.round(v * 32767);
    buffer.writeInt16LE(int16, 44 + i * 2);
  }

  fs.writeFileSync(filePath, buffer);
}

function main() {
  ensureDirs();

  const usersDb = readJson(USERS_PATH);
  const users = Array.isArray(usersDb.users) ? usersDb.users : [];
  if (users.length === 0) {
    console.error('No users found. Create a user first: npm run create-user -- admin SuperSicheresPasswort admin');
    process.exit(1);
  }

  // Prefer admin user, else first user
  const admin = users.find(u => String(u.role || '').toLowerCase() === 'admin');
  const owner = admin || users[0];

  const tracksDb = readJson(TRACKS_PATH);
  tracksDb.tracks = Array.isArray(tracksDb.tracks) ? tracksDb.tracks : [];

  const demos = [
    { title: 'Demo Tone A (440Hz)', frequencyHz: 440, durationSec: 2.2 },
    { title: 'Demo Tone B (554Hz)', frequencyHz: 554.37, durationSec: 2.2 },
    { title: 'Demo Tone C (659Hz)', frequencyHz: 659.25, durationSec: 2.2 }
  ];

  let created = 0;
  for (const d of demos) {
    const stamp = Date.now() + created;
    const storedName = `${stamp}_demo_${Math.round(d.frequencyHz)}hz.wav`;
    const outPath = path.join(UPLOADS_DIR, storedName);

    if (!fs.existsSync(outPath)) {
      writeWavPcm16({
        filePath: outPath,
        durationSec: d.durationSec,
        sampleRate: 44100,
        frequencyHz: d.frequencyHz
      });
    }

    const stat = fs.statSync(outPath);
    const track = {
      id: 't_' + stamp.toString(36),
      title: d.title,
      description: 'Automatisch generierte Demo-Musik (WAV).',
      originalName: storedName,
      storedName,
      mimeType: 'audio/wav',
      size: stat.size,
      uploadedAt: new Date().toISOString(),
      uploadedBy: owner.id
    };

    tracksDb.tracks.unshift(track);
    created++;
  }

  writeJson(TRACKS_PATH, tracksDb);
  console.log(`Seeded ${created} demo tracks for user: ${owner.username}`);
}

main();
