const STORAGE_NAMES = "quiz_duel_names_v1";
const STORAGE_COUNT = "quiz_duel_count_v1";
const STORAGE_ROOM = "quiz_duel_room_code_draft_v1";
const STORAGE_ONLINE_NAME = "quiz_duel_online_name_v1";

const setupCard = document.getElementById("setupCard");
const playCard = document.getElementById("playCard");
const resultCard = document.getElementById("resultCard");

const playerAInput = document.getElementById("playerA");
const playerBInput = document.getElementById("playerB");
const questionCountInput = document.getElementById("questionCount");
const startQuizBtn = document.getElementById("startQuizBtn");
const setupError = document.getElementById("setupError");

const hostOnlineBtn = document.getElementById("hostOnlineBtn");
const joinOnlineBtn = document.getElementById("joinOnlineBtn");
const roomCodeInput = document.getElementById("roomCode");
const onlineNameInput = document.getElementById("onlineName");
const hostCodeLine = document.getElementById("hostCodeLine");
const hostCodeText = document.getElementById("hostCodeText");
const onlineStatus = document.getElementById("onlineStatus");

const progressTitle = document.getElementById("progressTitle");
const turnSubtitle = document.getElementById("turnSubtitle");
const roomSubtitle = document.getElementById("roomSubtitle");
const questionText = document.getElementById("questionText");
const answersEl = document.getElementById("answers");
const feedbackEl = document.getElementById("feedback");
const nextBtn = document.getElementById("nextBtn");
const quitBtn = document.getElementById("quitBtn");

const scoreAName = document.getElementById("scoreAName");
const scoreBName = document.getElementById("scoreBName");
const scoreA = document.getElementById("scoreA");
const scoreB = document.getElementById("scoreB");

const resultText = document.getElementById("resultText");
const finalAName = document.getElementById("finalAName");
const finalBName = document.getElementById("finalBName");
const finalA = document.getElementById("finalA");
const finalB = document.getElementById("finalB");
const restartBtn = document.getElementById("restartBtn");

const countdownOverlay = document.getElementById("countdownOverlay");
const countdownBig = document.getElementById("countdownBig");

const QUESTIONS = [
  { q: "Wie viele Minuten sind 2,5 Stunden?", a: ["120", "150", "180", "210"], c: 1 },
  { q: "Was ist die Lösung von 3(x − 2) = 15?", a: ["x = 3", "x = 5", "x = 7", "x = 9"], c: 2 },
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
  { q: "Welche Reihenfolge ist richtig (von der Sonne aus)?", a: ["Merkur, Venus, Erde, Mars", "Venus, Merkur, Erde, Mars", "Merkur, Erde, Venus, Mars", "Mars, Erde, Venus, Merkur"], c: 0 },
  { q: "Welche Aussage zur EU ist richtig?", a: ["Alle Länder Europas sind automatisch in der EU.", "Die EU hat gemeinsame Regeln und Zusammenarbeit.", "Die EU ist ein einzelnes Land.", "Die EU hat keine eigenen Institutionen."], c: 1 }
];

let game = null;
let mode = "local";

let cooldownTimeout = null;
let cooldownInterval = null;

const online = {
  socket: null,
  connected: false,
  roomCode: null,
  playerIndex: null,
  players: [],
  scores: [0, 0],
  questionNumber: 0,
  totalQuestions: 0,
  question: null,
  reveal: null,
  answeredThisQuestion: false,
  countdownEndsAt: null
};

function showCard(card) {
  [setupCard, playCard, resultCard].forEach((el) => el.classList.remove("active"));
  card.classList.add("active");
}

function setSetupError(text) {
  setupError.textContent = String(text || "");
}

function setOnlineStatus(text) {
  onlineStatus.textContent = String(text || "");
}

function clearCooldown() {
  if (cooldownTimeout) {
    clearTimeout(cooldownTimeout);
    cooldownTimeout = null;
  }
  if (cooldownInterval) {
    clearInterval(cooldownInterval);
    cooldownInterval = null;
  }
}

let onlineCountdownInterval = null;

function hideCountdownOverlay() {
  countdownOverlay.classList.remove("active");
  countdownOverlay.setAttribute("aria-hidden", "true");
  online.countdownEndsAt = null;
  if (onlineCountdownInterval) {
    clearInterval(onlineCountdownInterval);
    onlineCountdownInterval = null;
  }
}

function showCountdownOverlay(endsAt) {
  online.countdownEndsAt = endsAt;
  countdownOverlay.classList.add("active");
  countdownOverlay.setAttribute("aria-hidden", "false");

  const update = () => {
    const leftMs = Math.max(0, Number(endsAt || 0) - Date.now());
    const sec = Math.ceil(leftMs / 1000);
    countdownBig.textContent = String(Math.max(0, sec));
    if (sec <= 0) {
      // Next question will arrive from server.
    }
  };

  update();
  if (onlineCountdownInterval) clearInterval(onlineCountdownInterval);
  onlineCountdownInterval = setInterval(update, 120);
}

function normalizeName(raw, fallback) {
  const name = String(raw || "").trim().slice(0, 24);
  return name || fallback;
}

function shuffle(list) {
  const cloned = [...list];
  for (let i = cloned.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
  }
  return cloned;
}

function saveSetupDraft() {
  const payload = {
    a: String(playerAInput.value || ""),
    b: String(playerBInput.value || "")
  };
  window.localStorage.setItem(STORAGE_NAMES, JSON.stringify(payload));
  window.localStorage.setItem(STORAGE_COUNT, String(questionCountInput.value || "10"));
  window.localStorage.setItem(STORAGE_ROOM, String(roomCodeInput.value || ""));
  window.localStorage.setItem(STORAGE_ONLINE_NAME, String(onlineNameInput.value || ""));
}

function loadSetupDraft() {
  try {
    const names = JSON.parse(window.localStorage.getItem(STORAGE_NAMES) || "{}") || {};
    if (typeof names.a === "string") playerAInput.value = names.a;
    if (typeof names.b === "string") playerBInput.value = names.b;
  } catch {
    // ignore
  }

  const count = Number(window.localStorage.getItem(STORAGE_COUNT) || "10");
  if (Number.isFinite(count)) {
    questionCountInput.value = String(Math.max(4, Math.min(40, Math.round(count))));
  }

  const roomCode = String(window.localStorage.getItem(STORAGE_ROOM) || "");
  if (roomCode) {
    roomCodeInput.value = roomCode;
  }

  const onlineName = String(window.localStorage.getItem(STORAGE_ONLINE_NAME) || "");
  if (onlineName) {
    onlineNameInput.value = onlineName;
  }
}

function buildGame() {
  const nameA = normalizeName(playerAInput.value, "Spieler 1");
  const nameB = normalizeName(playerBInput.value, "Spieler 2");

  const count = Math.max(4, Math.min(40, Math.round(Number(questionCountInput.value || 10))));
  if (count > QUESTIONS.length) {
    return { ok: false, error: `Zu wenig Fragen im Pool (${QUESTIONS.length}).` };
  }

  const order = shuffle([...Array(QUESTIONS.length).keys()]).slice(0, count);

  return {
    ok: true,
    game: {
      players: [nameA, nameB],
      scores: [0, 0],
      turn: 0,
      order,
      answered: false
    }
  };
}

function renderScore() {
  if (mode === "online") {
    scoreAName.textContent = online.players[0] || "Spieler 1";
    scoreBName.textContent = online.players[1] || "Spieler 2";
    scoreA.textContent = String(online.scores[0] || 0);
    scoreB.textContent = String(online.scores[1] || 0);
    return;
  }

  scoreAName.textContent = game.players[0];
  scoreBName.textContent = game.players[1];
  scoreA.textContent = String(game.scores[0]);
  scoreB.textContent = String(game.scores[1]);
}

function renderLocalQuestion() {
  clearCooldown();
  const currentIndex = game.turn;
  const total = game.order.length;
  const playerIndex = currentIndex % 2;
  const playerName = game.players[playerIndex];

  progressTitle.textContent = `Frage ${currentIndex + 1}/${total}`;
  turnSubtitle.textContent = `Am Zug: ${playerName}`;
  roomSubtitle.textContent = "";

  const q = QUESTIONS[game.order[currentIndex]];
  questionText.textContent = q.q;

  feedbackEl.textContent = "";
  nextBtn.disabled = true;
  game.answered = false;

  answersEl.innerHTML = "";
  q.a.forEach((label, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = label;
    btn.addEventListener("click", () => onLocalAnswer(idx));
    answersEl.appendChild(btn);
  });

  renderScore();
}

function startCooldown(callback) {
  clearCooldown();
  const endsAt = Date.now() + 2000;
  const tick = () => {
    const leftMs = Math.max(0, endsAt - Date.now());
    const leftSec = Math.ceil(leftMs / 1000);
    if (leftSec <= 0) {
      feedbackEl.textContent = "";
    } else {
      feedbackEl.textContent = `${feedbackEl.textContent.replace(/\s*\(.*\)$/, "")} (Nächste Frage in ${leftSec}s)`;
    }
  };
  tick();
  cooldownInterval = setInterval(tick, 150);
  cooldownTimeout = setTimeout(() => {
    clearCooldown();
    callback();
  }, 2000);
}

function onLocalAnswer(selectedIndex) {
  if (!game || game.answered) return;
  game.answered = true;

  const currentIndex = game.turn;
  const playerIndex = currentIndex % 2;
  const q = QUESTIONS[game.order[currentIndex]];

  const correct = selectedIndex === q.c;
  if (correct) {
    game.scores[playerIndex] += 1;
  }

  [...answersEl.querySelectorAll("button")].forEach((btn, idx) => {
    btn.disabled = true;
    if (idx === q.c) {
      btn.classList.add("primary");
    }
  });

  feedbackEl.textContent = correct ? "Richtig!" : `Falsch. Richtig ist: ${q.a[q.c]}`;
  nextBtn.disabled = true;
  renderScore();

  startCooldown(() => advanceLocal());
}

function advanceLocal() {
  if (!game) return;
  game.turn += 1;
  if (game.turn >= game.order.length) {
    finishGame();
    return;
  }
  renderLocalQuestion();
}

function finishGame() {
  const players = mode === "online" ? online.players : game.players;
  const scores = mode === "online" ? online.scores : game.scores;

  finalAName.textContent = players[0] || "Spieler 1";
  finalBName.textContent = players[1] || "Spieler 2";
  finalA.textContent = String(scores[0] || 0);
  finalB.textContent = String(scores[1] || 0);

  const a = scores[0] || 0;
  const b = scores[1] || 0;
  if (a === b) {
    resultText.textContent = "Unentschieden!";
  } else {
    const winner = a > b ? players[0] : players[1];
    resultText.textContent = `${winner} gewinnt!`;
  }

  showCard(resultCard);
}

function startLocal() {
  mode = "local";
  setSetupError("");
  setOnlineStatus("");
  hostCodeLine.style.display = "none";
  const built = buildGame();
  if (!built.ok) {
    setSetupError(built.error);
    return;
  }
  game = built.game;
  showCard(playCard);
  renderLocalQuestion();
}

function resetToSetup() {
  clearCooldown();
  game = null;
  mode = "local";
  roomSubtitle.textContent = "";

  if (online.socket) {
    try {
      online.socket.emit("quiz_leave_room");
      online.socket.disconnect();
    } catch {
      // ignore
    }
  }
  online.socket = null;
  online.connected = false;
  online.roomCode = null;
  online.playerIndex = null;
  online.players = [];
  online.scores = [0, 0];
  online.turnPlayerIndex = 0;
  online.questionNumber = 0;
  online.totalQuestions = 0;
  online.question = null;
  online.reveal = null;

  hostCodeLine.style.display = "none";
  hostCodeText.textContent = "";
  setOnlineStatus("");
  showCard(setupCard);
}

async function loadSocketIoClient() {
  if (typeof window.io === "function") return;

  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `${window.location.origin}/socket.io/socket.io.js`;
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function ensureOnlineSocket() {
  if (online.socket) return online.socket;

  await loadSocketIoClient();
  if (typeof window.io !== "function") {
    throw new Error("Socket.IO client not available");
  }

  const socket = window.io({ transports: ["websocket", "polling"] });
  online.socket = socket;
  setOnlineStatus("Verbinden…");

  socket.on("connect", () => {
    online.connected = true;
    setOnlineStatus("Verbunden.");
  });

  socket.on("disconnect", () => {
    online.connected = false;
    if (mode === "online") {
      setOnlineStatus("Verbindung getrennt.");
    }
  });

  socket.on("quiz_error", (message) => {
    if (mode === "online") {
      setSetupError(String(message || "Fehler."));
    }
  });

  socket.on("quiz_room_created", (payload) => {
    mode = "online";
    online.roomCode = String(payload?.code || "");
    online.playerIndex = Number(payload?.playerIndex || 0);
    online.players = Array.isArray(payload?.players) ? payload.players : [];
    online.scores = Array.isArray(payload?.scores) ? payload.scores : [0, 0];

    if (online.roomCode) {
      hostCodeText.textContent = online.roomCode;
      hostCodeLine.style.display = "block";
      roomCodeInput.value = online.roomCode;
      saveSetupDraft();
    }

    setOnlineStatus("Warte auf Spieler 2…");
  });

  socket.on("quiz_joined", (payload) => {
    mode = "online";
    online.roomCode = String(payload?.code || online.roomCode || "");
    online.playerIndex = Number(payload?.playerIndex);
    online.players = Array.isArray(payload?.players) ? payload.players : online.players;
    online.scores = Array.isArray(payload?.scores) ? payload.scores : online.scores;
    setOnlineStatus("Beigetreten. Startet…");
    renderScore();
  });

  socket.on("quiz_room_update", (payload) => {
    if (mode !== "online") return;
    online.players = Array.isArray(payload?.players) ? payload.players : online.players;
    online.scores = Array.isArray(payload?.scores) ? payload.scores : online.scores;
    renderScore();

    if ((online.players || []).length < 2) {
      setOnlineStatus("Warte auf Spieler 2…");
    } else {
      setOnlineStatus("Spiel gefunden. Startet…");
    }
  });

  socket.on("quiz_question", (payload) => {
    mode = "online";
    clearCooldown();
    hideCountdownOverlay();

    online.roomCode = String(payload?.code || online.roomCode || "");
    online.players = Array.isArray(payload?.players) ? payload.players : online.players;
    online.scores = Array.isArray(payload?.scores) ? payload.scores : online.scores;
    online.questionNumber = Number(payload?.questionNumber || 1);
    online.totalQuestions = Number(payload?.totalQuestions || online.totalQuestions || 0);
    online.question = payload?.question || null;
    online.reveal = null;
    online.answeredThisQuestion = false;

    showCard(playCard);
    renderOnlineQuestion();
  });

  socket.on("quiz_reveal", (payload) => {
    if (mode !== "online") return;
    online.scores = Array.isArray(payload?.scores) ? payload.scores : online.scores;
    online.reveal = {
      correctIndex: Number(payload?.correctIndex),
      selections: Array.isArray(payload?.selections) ? payload.selections : null,
      correctAnswer: String(payload?.correctAnswer || "")
    };
    renderScore();
    renderOnlineReveal();

    startCooldown(() => {
      // next question is pushed by server
    });
  });

  socket.on("quiz_countdown", (payload) => {
    if (mode !== "online") return;
    const endsAt = Number(payload?.endsAt || 0);
    if (!Number.isFinite(endsAt) || endsAt <= Date.now()) return;
    showCountdownOverlay(endsAt);
  });

  socket.on("quiz_correct", (payload) => {
    if (mode !== "online") return;
    hideCountdownOverlay();

    online.scores = Array.isArray(payload?.scores) ? payload.scores : online.scores;
    online.players = Array.isArray(payload?.players) ? payload.players : online.players;
    renderScore();

    const winnerIndex = Number(payload?.winnerIndex);
    const winnerName = online.players[winnerIndex] || "Jemand";
    const me = Number(online.playerIndex);
    feedbackEl.textContent = winnerIndex === me ? "Richtig! +1 Punkt" : `${winnerName} war richtig!`;
  });

  socket.on("quiz_game_over", (payload) => {
    if (mode !== "online") return;
    online.players = Array.isArray(payload?.players) ? payload.players : online.players;
    online.scores = Array.isArray(payload?.scores) ? payload.scores : online.scores;
    finishGame();
  });

  socket.on("quiz_opponent_left", () => {
    if (mode !== "online") return;
    setSetupError("Gegner hat verlassen.");
    resetToSetup();
  });

  return socket;
}

function getOnlineName() {
  const explicit = normalizeName(onlineNameInput.value, "");
  if (explicit) return explicit;

  // fallback: keep older behavior if field is empty
  const fallback = normalizeName(playerAInput.value, "Spieler");
  return fallback;
}

function normalizeRoomCode(raw) {
  return String(raw || "").trim().toUpperCase().replace(/\s+/g, "").slice(0, 8);
}

function renderOnlineQuestion() {
  const total = online.totalQuestions || 0;
  progressTitle.textContent = `Frage ${online.questionNumber}/${total || "?"}`;

  turnSubtitle.textContent = "Klick eine Antwort. Dann läuft der 5s Timer.";
  roomSubtitle.textContent = online.roomCode ? `Online-Raum: ${online.roomCode}` : "Online";

  const q = online.question;
  questionText.textContent = String(q?.text || "");
  feedbackEl.textContent = "";
  nextBtn.disabled = true;

  answersEl.innerHTML = "";
  const answers = Array.isArray(q?.answers) ? q.answers : [];
  answers.forEach((label, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = String(label);
    const canAnswer = [0, 1].includes(Number(online.playerIndex))
      && !online.reveal
      && !online.answeredThisQuestion;
    btn.disabled = !canAnswer;
    btn.addEventListener("click", () => onOnlineAnswer(idx));
    answersEl.appendChild(btn);
  });

  renderScore();
}

function renderOnlineReveal() {
  const reveal = online.reveal;
  if (!reveal) return;

  [...answersEl.querySelectorAll("button")].forEach((btn, idx) => {
    btn.disabled = true;
    if (idx === reveal.correctIndex) {
      btn.classList.add("primary");
    }
  });

  const myIdx = Number(online.playerIndex);
  const selections = Array.isArray(reveal.selections) ? reveal.selections : [];
  const mySelection = selections[myIdx];
  const isCorrect = mySelection === reveal.correctIndex;

  feedbackEl.textContent = isCorrect
    ? "Richtig!"
    : `Falsch. Richtig ist: ${reveal.correctAnswer}`;
}

function onOnlineAnswer(selectedIndex) {
  if (mode !== "online") return;
  if (!online.socket) return;
  if (![0, 1].includes(Number(online.playerIndex))) return;
  if (online.reveal) return;
  if (!online.roomCode) return;

  if (online.answeredThisQuestion) return;
  online.answeredThisQuestion = true;

  [...answersEl.querySelectorAll("button")].forEach((btn) => {
    btn.disabled = true;
  });
  feedbackEl.textContent = "Antwort gesendet…";
  online.socket.emit("quiz_answer", { code: online.roomCode, selectedIndex });
}

async function hostOnline() {
  setSetupError("");
  setOnlineStatus("");
  hostCodeLine.style.display = "none";
  hostCodeText.textContent = "";

  const name = getOnlineName();
  const count = Math.max(4, Math.min(40, Math.round(Number(questionCountInput.value || 10))));

  try {
    const socket = await ensureOnlineSocket();
    mode = "online";
    socket.emit("quiz_create_room", { name, questionCount: count });
    setOnlineStatus("Raum wird erstellt…");
  } catch {
    setSetupError("Online geht hier nicht (Server/Socket.IO fehlt). Nutze Render oder localhost.");
  }
}

async function joinOnline() {
  setSetupError("");
  setOnlineStatus("");
  hostCodeLine.style.display = "none";
  hostCodeText.textContent = "";

  const name = getOnlineName();
  const code = normalizeRoomCode(roomCodeInput.value);
  roomCodeInput.value = code;
  saveSetupDraft();

  if (!code) {
    setSetupError("Bitte einen Code eingeben.");
    return;
  }

  try {
    const socket = await ensureOnlineSocket();
    mode = "online";
    online.roomCode = code;
    socket.emit("quiz_join_room", { name, code });
    setOnlineStatus("Beitreten…");
  } catch {
    setSetupError("Online geht hier nicht (Server/Socket.IO fehlt). Nutze Render oder localhost.");
  }
}

startQuizBtn.addEventListener("click", startLocal);
nextBtn.addEventListener("click", () => {
  // Cooldown ist automatisch – Button bleibt deaktiviert.
});

quitBtn.addEventListener("click", resetToSetup);
restartBtn.addEventListener("click", () => {
  showCard(setupCard);
});

hostOnlineBtn.addEventListener("click", hostOnline);
joinOnlineBtn.addEventListener("click", joinOnline);

[playerAInput, playerBInput, questionCountInput].forEach((el) => {
  el.addEventListener("input", saveSetupDraft);
});

roomCodeInput.addEventListener("input", saveSetupDraft);
onlineNameInput.addEventListener("input", saveSetupDraft);

loadSetupDraft();
