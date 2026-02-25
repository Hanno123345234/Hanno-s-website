const STORAGE_NAMES = "quiz_duel_names_v1";
const STORAGE_COUNT = "quiz_duel_count_v1";
const STORAGE_ROOM = "quiz_duel_room_code_draft_v1";
const STORAGE_ONLINE_NAME = "quiz_duel_online_name_v1";
const STORAGE_CATEGORY = "quiz_duel_category_v1";
const STORAGE_DIFFICULTY = "quiz_duel_difficulty_v1";

const setupCard = document.getElementById("setupCard");
const lobbyCard = document.getElementById("lobbyCard");
const playCard = document.getElementById("playCard");
const resultCard = document.getElementById("resultCard");

const playerAInput = document.getElementById("playerA");
const playerBInput = document.getElementById("playerB");
const questionCountInput = document.getElementById("questionCount");
const categorySelect = document.getElementById("category");
const difficultySelect = document.getElementById("difficulty");
const startQuizBtn = document.getElementById("startQuizBtn");
const setupError = document.getElementById("setupError");

const hostOnlineBtn = document.getElementById("hostOnlineBtn");
const joinOnlineBtn = document.getElementById("joinOnlineBtn");
const roomCodeInput = document.getElementById("roomCode");
const onlineNameInput = document.getElementById("onlineName");
const hostCodeLine = document.getElementById("hostCodeLine");
const hostCodeText = document.getElementById("hostCodeText");
const onlineStatus = document.getElementById("onlineStatus");

const leaveLobbyBtn = document.getElementById("leaveLobbyBtn");
const lobbyStatus = document.getElementById("lobbyStatus");
const lobbyCodeText = document.getElementById("lobbyCodeText");
const lobbyPlayers = document.getElementById("lobbyPlayers");
const lobbyQuestionCountInput = document.getElementById("lobbyQuestionCount");
const lobbyCategorySelect = document.getElementById("lobbyCategory");
const lobbyDifficultySelect = document.getElementById("lobbyDifficulty");
const readyBtn = document.getElementById("readyBtn");

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

let questionBank = [];
let questionBankLoaded = false;

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
  ready: [false, false],
  settings: {
    questionCount: 10,
    category: "",
    difficulty: ""
  }
};

function showCard(card) {
  [setupCard, lobbyCard, playCard, resultCard].forEach((el) => el.classList.remove("active"));
  card.classList.add("active");
}

function setSetupError(text) {
  setupError.textContent = String(text || "");
}

function setOnlineStatus(text) {
  onlineStatus.textContent = String(text || "");
}

function setLobbyStatus(text) {
  if (!lobbyStatus) return;
  lobbyStatus.textContent = String(text || "");
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

// Timer UI removed.

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

function normalizeCategory(raw) {
  const value = String(raw || "").trim();
  return value;
}

function normalizeDifficulty(raw) {
  const value = String(raw || "").trim().toLowerCase();
  if (["easy", "medium", "hard"].includes(value)) return value;
  return "";
}

function getFilters() {
  const category = normalizeCategory(categorySelect?.value);
  const difficulty = normalizeDifficulty(difficultySelect?.value);
  return { category, difficulty };
}

function getLobbyFilters() {
  const category = normalizeCategory(lobbyCategorySelect?.value);
  const difficulty = normalizeDifficulty(lobbyDifficultySelect?.value);
  return { category, difficulty };
}

function filterQuestionBank(bank, filters) {
  const category = filters?.category ? String(filters.category) : "";
  const difficulty = filters?.difficulty ? String(filters.difficulty) : "";

  return (Array.isArray(bank) ? bank : []).filter((q) => {
    if (!q || typeof q.q !== "string") return false;
    if (!Array.isArray(q.a) || q.a.length !== 4) return false;
    if (!Number.isInteger(q.c) || q.c < 0 || q.c > 3) return false;

    if (category && String(q.category || "") !== category) return false;
    if (difficulty && String(q.difficulty || "").toLowerCase() !== difficulty) return false;
    return true;
  });
}

function shuffleQuestionAnswers(q) {
  const order = shuffle([0, 1, 2, 3]);
  const answers = order.map((idx) => String(q.a[idx]));
  const correctIndex = order.indexOf(Number(q.c));
  return {
    id: String(q.id || ""),
    text: String(q.q),
    answers,
    correctIndex
  };
}

function setSelectOptions(selectEl, options, selectedValue) {
  if (!selectEl) return;
  selectEl.innerHTML = "";
  options.forEach(({ value, label }) => {
    const opt = document.createElement("option");
    opt.value = String(value);
    opt.textContent = String(label);
    selectEl.appendChild(opt);
  });

  if (selectedValue !== undefined && selectedValue !== null) {
    const value = String(selectedValue);
    const exists = [...selectEl.options].some((o) => o.value === value);
    selectEl.value = exists ? value : String(options?.[0]?.value ?? "");
  }
}

function updateQuestionCountLimits() {
  const filtered = filterQuestionBank(questionBank, getFilters());
  const max = Math.max(4, Math.min(40, filtered.length || 4));
  questionCountInput.max = String(max);
  const current = Math.round(Number(questionCountInput.value || 10));
  const clamped = Math.max(4, Math.min(max, Number.isFinite(current) ? current : 10));
  questionCountInput.value = String(clamped);
}

function updateLobbyQuestionCountLimits() {
  if (!lobbyQuestionCountInput) return;
  const filtered = filterQuestionBank(questionBank, getLobbyFilters());
  const max = Math.max(4, Math.min(40, filtered.length || 4));
  lobbyQuestionCountInput.max = String(max);
  const current = Math.round(Number(lobbyQuestionCountInput.value || 10));
  const clamped = Math.max(4, Math.min(max, Number.isFinite(current) ? current : 10));
  lobbyQuestionCountInput.value = String(clamped);
}

async function loadQuestionBank() {
  try {
    const resp = await fetch("./quiz_questions.json", { cache: "no-store" });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    if (!Array.isArray(data)) throw new Error("Invalid questions JSON");
    questionBank = data;
    questionBankLoaded = true;
    return true;
  } catch {
    questionBank = [];
    questionBankLoaded = false;
    return false;
  }
}

function populateFiltersFromBank() {
  const categories = [...new Set((questionBank || []).map((q) => String(q?.category || "").trim()).filter(Boolean))].sort();
  const difficulties = [...new Set((questionBank || []).map((q) => String(q?.difficulty || "").trim().toLowerCase()).filter(Boolean))]
    .filter((d) => ["easy", "medium", "hard"].includes(d))
    .sort((a, b) => {
      const rank = { easy: 1, medium: 2, hard: 3 };
      return (rank[a] || 99) - (rank[b] || 99);
    });

  const savedCategory = String(window.localStorage.getItem(STORAGE_CATEGORY) || "");
  const savedDifficulty = normalizeDifficulty(window.localStorage.getItem(STORAGE_DIFFICULTY) || "");

  setSelectOptions(
    categorySelect,
    [{ value: "", label: "Alle Kategorien" }, ...categories.map((c) => ({ value: c, label: c }))],
    savedCategory
  );

  setSelectOptions(
    difficultySelect,
    [{ value: "", label: "Gemischt" }, ...difficulties.map((d) => ({ value: d, label: d === "easy" ? "Leicht" : d === "medium" ? "Mittel" : "Schwer" }))],
    savedDifficulty
  );

  setSelectOptions(
    lobbyCategorySelect,
    [{ value: "", label: "Alle Kategorien" }, ...categories.map((c) => ({ value: c, label: c }))],
    savedCategory
  );

  setSelectOptions(
    lobbyDifficultySelect,
    [{ value: "", label: "Gemischt" }, ...difficulties.map((d) => ({ value: d, label: d === "easy" ? "Leicht" : d === "medium" ? "Mittel" : "Schwer" }))],
    savedDifficulty
  );

  updateQuestionCountLimits();
  updateLobbyQuestionCountLimits();
}

function isHost() {
  return Number(online.playerIndex) === 0;
}

function canReady() {
  return mode === "online" && online.roomCode && Array.isArray(online.players) && online.players.length === 2;
}

function renderLobby() {
  if (mode !== "online") return;
  if (!lobbyCard) return;

  showCard(lobbyCard);

  if (lobbyCodeText) {
    lobbyCodeText.textContent = String(online.roomCode || "");
  }

  const players = Array.isArray(online.players) ? online.players : [];
  const ready = Array.isArray(online.ready) ? online.ready : [false, false];

  if (lobbyPlayers) {
    lobbyPlayers.innerHTML = "";
    const list = [0, 1].map((idx) => {
      const name = players[idx] || (idx === 0 ? "Spieler 1" : "Spieler 2");
      const isReady = !!ready[idx];
      const li = document.createElement("li");
      li.textContent = `${name}${isReady ? " (bereit)" : ""}`;
      return li;
    });
    list.forEach((li) => lobbyPlayers.appendChild(li));
  }

  const host = isHost();
  if (lobbyQuestionCountInput) lobbyQuestionCountInput.disabled = !host;
  if (lobbyCategorySelect) lobbyCategorySelect.disabled = !host;
  if (lobbyDifficultySelect) lobbyDifficultySelect.disabled = !host;

  // Fill controls from server settings if present.
  const serverSettings = online.settings || {};
  if (lobbyQuestionCountInput && Number.isFinite(Number(serverSettings.questionCount))) {
    lobbyQuestionCountInput.value = String(serverSettings.questionCount);
  }
  if (lobbyCategorySelect) {
    const cat = String(serverSettings.category || "");
    if ([...lobbyCategorySelect.options].some((o) => o.value === cat)) lobbyCategorySelect.value = cat;
  }
  if (lobbyDifficultySelect) {
    const diff = normalizeDifficulty(serverSettings.difficulty || "");
    if ([...lobbyDifficultySelect.options].some((o) => o.value === diff)) lobbyDifficultySelect.value = diff;
  }

  updateLobbyQuestionCountLimits();

  const me = Number(online.playerIndex);
  const myReady = !!ready[me];
  if (readyBtn) {
    readyBtn.disabled = !canReady() || myReady;
    readyBtn.textContent = myReady ? "Bereit ✓" : "Bereit";
  }

  if (players.length < 2) {
    setLobbyStatus("Warte auf Spieler 2…");
  } else {
    setLobbyStatus("Beide da. Bitte beide auf „Bereit“ drücken.");
  }
}

function emitOnlineSettingsUpdate() {
  if (mode !== "online") return;
  if (!online.socket) return;
  if (!isHost()) return;
  if (!online.roomCode) return;
  const { category, difficulty } = getLobbyFilters();
  const requested = Math.round(Number(lobbyQuestionCountInput?.value || questionCountInput.value || 10));

  online.socket.emit("quiz_update_settings", {
    code: online.roomCode,
    questionCount: requested,
    category,
    difficulty
  });
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
  window.localStorage.setItem(STORAGE_CATEGORY, String(categorySelect?.value || ""));
  window.localStorage.setItem(STORAGE_DIFFICULTY, String(difficultySelect?.value || ""));
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

  const storedCategory = String(window.localStorage.getItem(STORAGE_CATEGORY) || "");
  if (categorySelect && storedCategory) {
    categorySelect.value = storedCategory;
  }

  const storedDifficulty = String(window.localStorage.getItem(STORAGE_DIFFICULTY) || "");
  if (difficultySelect && storedDifficulty) {
    difficultySelect.value = storedDifficulty;
  }
}

function buildGame() {
  if (!questionBankLoaded) {
    return { ok: false, error: "Fragen konnten nicht geladen werden." };
  }

  const nameA = normalizeName(playerAInput.value, "Spieler 1");
  const nameB = normalizeName(playerBInput.value, "Spieler 2");

  const filters = getFilters();
  const filtered = filterQuestionBank(questionBank, filters);
  const max = Math.max(4, Math.min(40, filtered.length || 4));
  const count = Math.max(4, Math.min(max, Math.round(Number(questionCountInput.value || 10))));
  if (count > filtered.length) {
    return { ok: false, error: `Zu wenig Fragen im Pool (${filtered.length}).` };
  }

  const picked = shuffle(filtered).slice(0, count).map(shuffleQuestionAnswers);

  return {
    ok: true,
    game: {
      players: [nameA, nameB],
      scores: [0, 0],
      turn: 0,
      questions: picked,
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
  const total = game.questions.length;
  const playerIndex = currentIndex % 2;
  const playerName = game.players[playerIndex];

  progressTitle.textContent = `Frage ${currentIndex + 1}/${total}`;
  turnSubtitle.textContent = `Am Zug: ${playerName}`;
  roomSubtitle.textContent = "";

  const q = game.questions[currentIndex];
  questionText.textContent = q.text;

  feedbackEl.textContent = "";
  nextBtn.disabled = true;
  game.answered = false;

  answersEl.innerHTML = "";
  q.answers.forEach((label, idx) => {
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
  const q = game.questions[currentIndex];

  const correct = selectedIndex === q.correctIndex;
  if (correct) {
    game.scores[playerIndex] += 1;
  }

  [...answersEl.querySelectorAll("button")].forEach((btn, idx) => {
    btn.disabled = true;
    if (idx === q.correctIndex) {
      btn.classList.add("success");
    }
  });

  feedbackEl.textContent = correct ? "Richtig! +1 Punkt" : `Falsch. Richtig ist: ${q.answers[q.correctIndex]}`;
  nextBtn.disabled = true;
  renderScore();

  startCooldown(() => advanceLocal());
}

function advanceLocal() {
  if (!game) return;
  game.turn += 1;
  if (game.turn >= game.questions.length) {
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
  online.questionNumber = 0;
  online.totalQuestions = 0;
  online.question = null;
  online.reveal = null;
  online.answeredThisQuestion = false;
  online.ready = [false, false];
  online.settings = { questionCount: 10, category: "", difficulty: "" };

  hostCodeLine.style.display = "none";
  hostCodeText.textContent = "";
  setOnlineStatus("");
  setLobbyStatus("");
  showCard(setupCard);
}

async function loadSocketIoClient() {
  if (typeof window.io === "function") return;

  const onlineOrigin = String(window.QUIZ_ONLINE_ORIGIN || "").trim() || window.location.origin;

  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `${onlineOrigin}/socket.io/socket.io.js`;
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

  const onlineOrigin = String(window.QUIZ_ONLINE_ORIGIN || "").trim();
  const socket = onlineOrigin
    ? window.io(onlineOrigin, { transports: ["websocket", "polling"] })
    : window.io({ transports: ["websocket", "polling"] });
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
    online.ready = Array.isArray(payload?.ready) ? payload.ready : [false, false];
    online.settings = payload?.settings || online.settings;

    if (online.roomCode) {
      hostCodeText.textContent = online.roomCode;
      hostCodeLine.style.display = "block";
      roomCodeInput.value = online.roomCode;
      saveSetupDraft();
    }

    setOnlineStatus("Lobby geöffnet.");
    renderScore();
    renderLobby();
  });

  socket.on("quiz_joined", (payload) => {
    mode = "online";
    online.roomCode = String(payload?.code || online.roomCode || "");
    online.playerIndex = Number(payload?.playerIndex);
    online.players = Array.isArray(payload?.players) ? payload.players : online.players;
    online.scores = Array.isArray(payload?.scores) ? payload.scores : online.scores;
    online.ready = Array.isArray(payload?.ready) ? payload.ready : online.ready;
    online.settings = payload?.settings || online.settings;
    setOnlineStatus("Beigetreten.");
    renderScore();
    renderLobby();
  });

  socket.on("quiz_room_update", (payload) => {
    if (mode !== "online") return;
    online.players = Array.isArray(payload?.players) ? payload.players : online.players;
    online.scores = Array.isArray(payload?.scores) ? payload.scores : online.scores;
    online.ready = Array.isArray(payload?.ready) ? payload.ready : online.ready;
    online.settings = payload?.settings || online.settings;
    renderScore();

    if (!payload?.started) {
      renderLobby();
    }

    if ((online.players || []).length < 2) {
      setOnlineStatus("Warte auf Spieler 2…");
    } else {
      setOnlineStatus("Beide Spieler da.");
    }
  });

  socket.on("quiz_question", (payload) => {
    mode = "online";
    clearCooldown();

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

  socket.on("quiz_result", (payload) => {
    if (mode !== "online") return;

    online.scores = Array.isArray(payload?.scores) ? payload.scores : online.scores;
    online.players = Array.isArray(payload?.players) ? payload.players : online.players;
    renderScore();

    const correctIndex = Number(payload?.correctIndex);
    const correctAnswer = String(payload?.correctAnswer || "");
    const type = String(payload?.type || "");
    const detail = String(payload?.detail || "");
    const winnerIndex = payload?.winnerIndex === null || payload?.winnerIndex === undefined
      ? null
      : Number(payload?.winnerIndex);

    [...answersEl.querySelectorAll("button")].forEach((btn, idx) => {
      btn.disabled = true;
      if (idx === correctIndex) {
        btn.classList.add("success");
      }
    });

    if (type === "correct" && winnerIndex !== null) {
      const winnerName = online.players[winnerIndex] || "Jemand";
      const me = Number(online.playerIndex);
      const winnerLabel = winnerIndex === me ? "Du" : winnerName;

      if (detail === "fastest") {
        feedbackEl.textContent = `Beide richtig — ${winnerLabel} war schneller! +1 Punkt`;
      } else {
        feedbackEl.textContent = winnerIndex === me ? "Richtig! +1 Punkt" : `${winnerName} war richtig! +1 Punkt`;
      }
    } else {
      feedbackEl.textContent = `Niemand richtig. Richtig ist: ${correctAnswer}`;
    }

    // Next question comes from server after ~2s.
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

  turnSubtitle.textContent = "Beide beantworten. Wenn beide richtig: schneller bekommt den Punkt.";
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
      && !online.answeredThisQuestion;
    btn.disabled = !canAnswer;
    btn.addEventListener("click", () => onOnlineAnswer(idx));
    answersEl.appendChild(btn);
  });

  renderScore();
}

function onOnlineAnswer(selectedIndex) {
  if (mode !== "online") return;
  if (!online.socket) return;
  if (![0, 1].includes(Number(online.playerIndex))) return;
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
  const { category, difficulty } = getFilters();

  try {
    const socket = await ensureOnlineSocket();
    mode = "online";
    socket.emit("quiz_create_room", { name, questionCount: count, category, difficulty });
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

if (leaveLobbyBtn) {
  leaveLobbyBtn.addEventListener("click", resetToSetup);
}

if (readyBtn) {
  readyBtn.addEventListener("click", () => {
    if (mode !== "online") return;
    if (!online.socket) return;
    if (!online.roomCode) return;
    const me = Number(online.playerIndex);
    if (![0, 1].includes(me)) return;
    online.socket.emit("quiz_ready", { code: online.roomCode });
  });
}

hostOnlineBtn.addEventListener("click", hostOnline);
joinOnlineBtn.addEventListener("click", joinOnline);

[
  playerAInput,
  playerBInput,
  questionCountInput,
  categorySelect,
  difficultySelect
]
  .filter(Boolean)
  .forEach((el) => {
    el.addEventListener("input", saveSetupDraft);
  });

if (categorySelect) {
  categorySelect.addEventListener("change", () => {
    updateQuestionCountLimits();
    saveSetupDraft();
  });
}

if (difficultySelect) {
  difficultySelect.addEventListener("change", () => {
    updateQuestionCountLimits();
    saveSetupDraft();
  });
}

roomCodeInput.addEventListener("input", saveSetupDraft);
onlineNameInput.addEventListener("input", saveSetupDraft);

if (lobbyQuestionCountInput) {
  lobbyQuestionCountInput.addEventListener("input", () => {
    // keep setup field in sync
    questionCountInput.value = String(lobbyQuestionCountInput.value || questionCountInput.value || "10");
    saveSetupDraft();
    updateLobbyQuestionCountLimits();
    emitOnlineSettingsUpdate();
  });
}

if (lobbyCategorySelect) {
  lobbyCategorySelect.addEventListener("change", () => {
    // keep setup field in sync
    if (categorySelect) categorySelect.value = String(lobbyCategorySelect.value || "");
    saveSetupDraft();
    updateLobbyQuestionCountLimits();
    emitOnlineSettingsUpdate();
  });
}

if (lobbyDifficultySelect) {
  lobbyDifficultySelect.addEventListener("change", () => {
    if (difficultySelect) difficultySelect.value = String(lobbyDifficultySelect.value || "");
    saveSetupDraft();
    updateLobbyQuestionCountLimits();
    emitOnlineSettingsUpdate();
  });
}

loadSetupDraft();

(async () => {
  const ok = await loadQuestionBank();
  if (!ok) {
    setSetupError("Fragen konnten nicht geladen werden (quiz_questions.json fehlt). Online kann trotzdem gehen.");
    setSelectOptions(categorySelect, [{ value: "", label: "Alle Kategorien" }], "");
    setSelectOptions(difficultySelect, [{ value: "", label: "Gemischt" }], "");
    return;
  }

  populateFiltersFromBank();

  // Apply any stored draft selection after options exist.
  const storedCategory = String(window.localStorage.getItem(STORAGE_CATEGORY) || "");
  if (storedCategory) categorySelect.value = storedCategory;
  const storedDifficulty = normalizeDifficulty(window.localStorage.getItem(STORAGE_DIFFICULTY) || "");
  if (storedDifficulty) difficultySelect.value = storedDifficulty;

  updateQuestionCountLimits();
  updateLobbyQuestionCountLimits();
})();
