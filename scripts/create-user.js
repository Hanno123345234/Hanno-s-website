const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const dataDir = path.join(__dirname, '..', 'data');
const usersPath = path.join(dataDir, 'users.json');

function usage() {
  console.log('Usage: npm run create-user -- <username> <password> [role]');
  console.log('Example (admin): npm run create-user -- admin SuperSicheresPasswort admin');
  process.exit(1);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) usage();

  const username = String(args[0]).trim();
  const password = String(args[1]);
  const roleArg = args[2] ? String(args[2]).trim().toLowerCase() : 'user';
  const role = roleArg === 'admin' ? 'admin' : 'user';

  if (!username || username.length < 3) {
    console.error('Username must be at least 3 characters.');
    process.exit(1);
  }
  if (!password || password.length < 8) {
    console.error('Password must be at least 8 characters.');
    process.exit(1);
  }

  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(usersPath)) fs.writeFileSync(usersPath, JSON.stringify({ users: [] }, null, 2));

  const raw = fs.readFileSync(usersPath, 'utf8');
  const db = JSON.parse(raw);
  db.users = Array.isArray(db.users) ? db.users : [];

  const exists = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  if (exists) {
    console.error('User already exists:', username);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = {
    id: 'u_' + Date.now().toString(36),
    username,
    passwordHash,
    role,
    createdAt: new Date().toISOString()
  };

  db.users.push(user);
  fs.writeFileSync(usersPath, JSON.stringify(db, null, 2));

  console.log('Created user:', username);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
