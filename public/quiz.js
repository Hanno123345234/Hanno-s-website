const STORAGE_NAMES = "quiz_duel_names_v1";
const STORAGE_COUNT = "quiz_duel_count_v1";

const setupCard = document.getElementById("setupCard");
const playCard = document.getElementById("playCard");
const resultCard = document.getElementById("resultCard");

const playerAInput = document.getElementById("playerA");
const playerBInput = document.getElementById("playerB");
const questionCountInput = document.getElementById("questionCount");
const startQuizBtn = document.getElementById("startQuizBtn");
const setupError = document.getElementById("setupError");

const progressTitle = document.getElementById("progressTitle");
const turnSubtitle = document.getElementById("turnSubtitle");
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

const QUESTIONS = [
  { q: "Wie viele Tage hat eine Woche?", a: ["5", "6", "7", "8"], c: 2 },
  { q: "Welche Farbe entsteht aus Blau + Gelb?", a: ["Grün", "Lila", "Orange", "Rot"], c: 0 },
  { q: "Was ist 9 + 7?", a: ["14", "15", "16", "17"], c: 2 },
  { q: "Welcher Monat kommt nach April?", a: ["März", "Mai", "Juni", "Juli"], c: 1 },
  { q: "Wie heißt die Hauptstadt von Deutschland?", a: ["Hamburg", "München", "Berlin", "Köln"], c: 2 },
  { q: "Wie viele Minuten hat eine Stunde?", a: ["30", "45", "60", "90"], c: 2 },
  { q: "Welche Zahl ist gerade?", a: ["7", "11", "13", "14"], c: 3 },
  { q: "Welches Tier bellt?", a: ["Katze", "Hund", "Kuh", "Pferd"], c: 1 },
  { q: "Wofür steht " + "\"" + "kg" + "\"" + "?", a: ["Kilogramm", "Kilometer", "Kelvin", "Kugel"], c: 0 },
  { q: "Wie viele Sekunden hat eine Minute?", a: ["30", "45", "60", "90"], c: 2 },
  { q: "Was ist die erste Zahl nach 99?", a: ["100", "101", "98", "110"], c: 0 },
  { q: "Welche Jahreszeit kommt nach Sommer?", a: ["Winter", "Frühling", "Herbst", "Sommer"], c: 2 },
  { q: "Wie nennt man ein Viereck mit 4 gleich langen Seiten?", a: ["Rechteck", "Quadrat", "Dreieck", "Kreis"], c: 1 },
  { q: "Wie viele Kontinente gibt es?", a: ["5", "6", "7", "8"], c: 2 },
  { q: "Welches ist kein Obst?", a: ["Apfel", "Banane", "Karotte", "Orange"], c: 2 },
  { q: "Was ist 12 ÷ 3?", a: ["2", "3", "4", "6"], c: 2 },
  { q: "Welche Form hat ein Fußball meistens?", a: ["Würfel", "Kugel", "Pyramide", "Zylinder"], c: 1 },
  { q: "Welche Sprache spricht man in Spanien hauptsächlich?", a: ["Spanisch", "Deutsch", "Englisch", "Französisch"], c: 0 },
  { q: "Was ist die Farbe der Sonne auf einfachen Zeichnungen oft?", a: ["Blau", "Gelb", "Grün", "Schwarz"], c: 1 },
  { q: "Wie heißt unser Planet?", a: ["Mars", "Venus", "Erde", "Jupiter"], c: 2 },
  { q: "Wieviele Buchstaben hat das deutsche Alphabet (ohne ÄÖÜ)?", a: ["24", "25", "26", "27"], c: 2 },
  { q: "Was ist ein Synonym für schnell?", a: ["langsam", "fix", "leer", "laut"], c: 1 },
  { q: "Welche Zahl ist größer?", a: ["19", "91", "29", "12"], c: 1 },
  { q: "Welches Gerät nutzt man zum Telefonieren?", a: ["Fernseher", "Handy", "Toaster", "Lampe"], c: 1 },
  { q: "Welche Richtung zeigt ein Kompass nach oben meistens?", a: ["Süden", "Westen", "Norden", "Osten"], c: 2 },
  { q: "Was braucht Feuer zum Brennen?", a: ["Wasser", "Sauerstoff", "Eis", "Sand"], c: 1 },
  { q: "Welche Zahl kommt nach 5?", a: ["4", "6", "7", "8"], c: 1 },
  { q: "Wie viele Ecken hat ein Dreieck?", a: ["2", "3", "4", "5"], c: 1 },
  { q: "Welche ist eine Primzahl?", a: ["9", "12", "13", "15"], c: 2 },
  { q: "Wie heißt die größte Zahl hier?", a: ["100", "1000", "10", "1"], c: 1 },
  { q: "Was ist 5 × 6?", a: ["11", "20", "30", "60"], c: 2 },
  { q: "Welche ist ein Wochentag?", a: ["Morgen", "Dienstag", "Sommer", "Jahr"], c: 1 },
  { q: "Was trinkt eine Kuh (als Tier)?", a: ["Milch", "Wasser", "Saft", "Cola"], c: 1 },
  { q: "Welche ist eine Himmelsrichtung?", a: ["Nord", "Links", "Geradeaus", "Hoch"], c: 0 },
  { q: "Wie viele Monate hat ein Jahr?", a: ["10", "11", "12", "13"], c: 2 },
  { q: "Welche ist ein Werkzeug?", a: ["Hammer", "Kissen", "Löffel", "Buch"], c: 0 },
  { q: "Was ist die Mehrzahl von " + "\"" + "Kind" + "\"" + "?", a: ["Kinder", "Kinds", "Kindes", "Kinde"], c: 0 },
  { q: "Welche Farbe hat Gras meistens?", a: ["Rot", "Grün", "Blau", "Lila"], c: 1 }
];

let game = null;

function showCard(card) {
  [setupCard, playCard, resultCard].forEach((el) => el.classList.remove("active"));
  card.classList.add("active");
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
  scoreAName.textContent = game.players[0];
  scoreBName.textContent = game.players[1];
  scoreA.textContent = String(game.scores[0]);
  scoreB.textContent = String(game.scores[1]);
}

function renderTurn() {
  const currentIndex = game.turn;
  const total = game.order.length;
  const playerIndex = currentIndex % 2;
  const playerName = game.players[playerIndex];

  progressTitle.textContent = `Frage ${currentIndex + 1}/${total}`;
  turnSubtitle.textContent = `Am Zug: ${playerName}`;

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
    btn.addEventListener("click", () => onAnswer(idx));
    answersEl.appendChild(btn);
  });

  renderScore();
}

function onAnswer(selectedIndex) {
  if (game.answered) return;
  game.answered = true;

  const currentIndex = game.turn;
  const playerIndex = currentIndex % 2;
  const q = QUESTIONS[game.order[currentIndex]];

  const correct = selectedIndex === q.c;
  if (correct) {
    game.scores[playerIndex] += 1;
  }

  // lock buttons
  [...answersEl.querySelectorAll("button")].forEach((btn, idx) => {
    btn.disabled = true;
    if (idx === q.c) {
      btn.classList.add("primary");
    }
  });

  feedbackEl.textContent = correct
    ? "Richtig!"
    : `Falsch. Richtig ist: ${q.a[q.c]}`;

  nextBtn.disabled = false;
  renderScore();
}

function finishGame() {
  finalAName.textContent = game.players[0];
  finalBName.textContent = game.players[1];
  finalA.textContent = String(game.scores[0]);
  finalB.textContent = String(game.scores[1]);

  const a = game.scores[0];
  const b = game.scores[1];
  if (a === b) {
    resultText.textContent = "Unentschieden!";
  } else {
    const winner = a > b ? game.players[0] : game.players[1];
    resultText.textContent = `${winner} gewinnt!`;
  }

  showCard(resultCard);
}

function start() {
  setupError.textContent = "";
  const built = buildGame();
  if (!built.ok) {
    setupError.textContent = built.error;
    return;
  }
  game = built.game;
  showCard(playCard);
  renderTurn();
}

function resetToSetup() {
  game = null;
  showCard(setupCard);
}

startQuizBtn.addEventListener("click", start);
nextBtn.addEventListener("click", () => {
  if (!game) return;
  if (!game.answered) return;
  game.turn += 1;
  if (game.turn >= game.order.length) {
    finishGame();
    return;
  }
  renderTurn();
});

quitBtn.addEventListener("click", resetToSetup);
restartBtn.addEventListener("click", () => {
  showCard(setupCard);
});

[playerAInput, playerBInput, questionCountInput].forEach((el) => {
  el.addEventListener("input", saveSetupDraft);
});

loadSetupDraft();
