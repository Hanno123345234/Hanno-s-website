const screens = {
  main: document.getElementById("screenMain"),
  players: document.getElementById("screenPlayers"),
  impostors: document.getElementById("screenImpostors"),
  categories: document.getElementById("screenCategories"),
  reveal: document.getElementById("screenReveal"),
  discussion: document.getElementById("screenDiscussion"),
  result: document.getElementById("screenResult")
};

const SPECY_WORDS_KEY = "impostor_specy_words_v1";
const DEFAULT_SPICY_WORDS = ["Schwanz", "Fett", "Anna", "Jonas", "Mo", "Affe"];

const state = {
  players: ["Hanno", "Elle", "Cristtine", "Fin", "Papa"],
  impostorCount: 1,
  hintsEnabled: true,
  timerEnabled: false,
  categories: [
    {
      id: "trends",
      emoji: "🚀",
      name: "Trends",
      desc: "Memes, Internet-Phänomene und moderne Kultur.",
      words: ["Algorithmus-Bubble", "Parasoziale Beziehung", "Creator Economy", "Shadowban", "FOMO", "Doomscrolling", "Microtrend", "Cancel Culture", "Prompt Engineering", "Deepfake"]
    },
    {
      id: "alltag",
      emoji: "⏰",
      name: "Alltag",
      desc: "Komplexere Begriffe aus Schule, Leben und Routinen.",
      words: ["Prokrastination", "Mikromanagement", "Priorisierung", "Zeitmanagement", "Selbstdisziplin", "Kognitive Verzerrung", "Multitasking", "Reizüberflutung", "Routinenbruch", "Kontextwechsel"]
    },
    {
      id: "filme",
      emoji: "🎬",
      name: "Filme & Serien",
      desc: "Begriffe aus Storytelling und Filmwelt.",
      words: ["Plottwist", "Cliffhanger", "Charakterbogen", "Antagonist", "Foreshadowing", "Suspense", "Coming-of-Age", "Cold Open", "Mockumentary", "Retcon"]
    },
    {
      id: "games",
      emoji: "🎮",
      name: "Gaming",
      desc: "Strategie- und E-Sport-nahe Begriffe.",
      words: ["Meta", "Hitbox", "Skill Ceiling", "Map Control", "Cooldown-Management", "Snowball-Effekt", "Nerf", "Buff", "Crosshair Placement", "Mindgame"]
    },
    {
      id: "schwierig",
      emoji: "🧠",
      name: "Schwierige Wörter",
      desc: "Nur schwere Begriffe.",
      words: ["Ambivalenz", "Paradigma", "Kontextualisierung", "Interdependenz", "Resilienz", "Dissonanz", "Metaphysik", "Konsensbildung", "Ambiguität", "Kausalität"]
    },
    {
      id: "welt",
      emoji: "🌍",
      name: "Rund um die Welt",
      desc: "Geografie, Politik und globale Begriffe.",
      words: ["Geopolitik", "Demografie", "Infrastruktur", "Urbanisierung", "Rohstoffabhängigkeit", "Handelsroute", "Klimazone", "Topografie", "Migration", "Wasserknappheit"]
    },
    {
      id: "spicy",
      emoji: "✨",
      name: "spicy",
      desc: "Eigene Wörter von dir.",
      words: []
    }
  ],
  selectedCategoryIds: new Set(["trends", "alltag", "schwierig"]),
  specyWords: [],
  roundCards: [],
  revealIndex: 0,
  revealed: false,
  discussionSeconds: 5 * 60,
  discussionLeft: 5 * 60,
  discussionTimerId: null,
  moderation: {
    banned: false,
    banUntil: null,
    banReason: null,
    banPermanent: false,
    muted: false,
    muteUntil: null,
    muteReason: null
  }
};

const FINGERPRINT_KEY = "among_fingerprint_v1";
const MODERATION_POLL_MS = 15000;
let moderationTimer = null;

const playerCountLabel = document.getElementById("playerCountLabel");
const impostorCountLabel = document.getElementById("impostorCountLabel");
const categoryPreview = document.getElementById("categoryPreview");
const hintToggle = document.getElementById("hintToggle");
const timerToggle = document.getElementById("timerToggle");
const mainError = document.getElementById("mainError");

const playerList = document.getElementById("playerList");
const impostorOptionList = document.getElementById("impostorOptionList");
const selectedCategories = document.getElementById("selectedCategories");
const categoryList = document.getElementById("categoryList");
const specyWordInput = document.getElementById("specyWordInput");
const addSpecyWordBtn = document.getElementById("addSpecyWordBtn");
const specyWordList = document.getElementById("specyWordList");

const revealPlayerName = document.getElementById("revealPlayerName");
const revealRoleLabel = document.getElementById("revealRoleLabel");
const revealWord = document.getElementById("revealWord");
const revealBtn = document.getElementById("revealBtn");
const nextPlayerBtn = document.getElementById("nextPlayerBtn");
const moderationBanner = document.getElementById("impostorBanBanner");
const discussionTitle = document.getElementById("discussionTitle");
const discussionTimerText = document.getElementById("discussionTimerText");
const resultTitle = document.getElementById("resultTitle");

function getFingerprint() {
  let value = window.localStorage.getItem(FINGERPRINT_KEY);
  if (value) return value;
  value = `fp_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
  window.localStorage.setItem(FINGERPRINT_KEY, value);
  return value;
}

function formatUntil(until) {
  if (!until) return "-";
  const numeric = Number(until);
  const date = Number.isFinite(numeric) ? new Date(numeric) : new Date(until);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("de-DE");
}

function isBanned() {
  return !!state.moderation?.banned;
}

function applyInteractionLock() {
  const banned = isBanned();
  const controls = document.querySelectorAll("button, input, select, textarea");

  controls.forEach((element) => {
    if (banned) {
      if (!element.dataset.banSnapshotDisabled) {
        element.dataset.banSnapshotDisabled = element.disabled ? "1" : "0";
      }
      element.disabled = true;
      return;
    }

    if (element.dataset.banSnapshotDisabled) {
      element.disabled = element.dataset.banSnapshotDisabled === "1";
      delete element.dataset.banSnapshotDisabled;
    }
  });
}

function renderModerationBanner() {
  const status = state.moderation || {};
  moderationBanner.classList.remove("muted");

  if (status.banned) {
    const untilText = status.banPermanent ? "permanent" : formatUntil(status.banUntil);
    moderationBanner.textContent = `⛔ Du bist gebannt bis ${untilText}. Grund: ${status.banReason || "admin_ban"}`;
    moderationBanner.classList.remove("hidden");
    applyInteractionLock();
    return;
  }

  if (status.muted) {
    moderationBanner.classList.add("muted");
    moderationBanner.textContent = `🔇 Du bist gemutet bis ${formatUntil(status.muteUntil)}. Grund: ${status.muteReason || "admin_mute"}`;
    moderationBanner.classList.remove("hidden");
    applyInteractionLock();
    return;
  }

  moderationBanner.classList.add("hidden");
  moderationBanner.textContent = "";
  applyInteractionLock();
}

function applyModerationStatus(payload = {}) {
  state.moderation = {
    ...state.moderation,
    banned: !!payload.banned,
    banUntil: payload.banUntil || null,
    banReason: payload.banReason || null,
    banPermanent: !!payload.banPermanent,
    muted: !!payload.muted,
    muteUntil: payload.muteUntil || null,
    muteReason: payload.muteReason || null
  };
  renderModerationBanner();
}

async function fetchModerationStatus() {
  const fingerprint = getFingerprint();
  const response = await fetch(`/api/moderation/status?fingerprint=${encodeURIComponent(fingerprint)}`, {
    cache: "no-store"
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Moderation status failed");
  }
  applyModerationStatus(data);
}

async function pingModerationOpen() {
  const fingerprint = getFingerprint();
  const response = await fetch("/api/moderation/ping", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      fingerprint,
      name: state.players[0] || "Player",
      mode: "impostor"
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Moderation ping failed");
  }
  if (data.status) {
    applyModerationStatus(data.status);
  }
}

async function startModerationWatcher() {
  try {
    await pingModerationOpen();
  } catch (error) {
    console.warn(error.message || "Moderation ping failed");
  }

  try {
    await fetchModerationStatus();
  } catch (error) {
    console.warn(error.message || "Moderation status failed");
  }

  if (moderationTimer) {
    window.clearInterval(moderationTimer);
  }
  moderationTimer = window.setInterval(() => {
    fetchModerationStatus().catch(() => {});
  }, MODERATION_POLL_MS);
}

function showScreen(key) {
  Object.values(screens).forEach((screen) => screen.classList.remove("active"));
  screens[key].classList.add("active");
}

function allowedImpostorMax() {
  return Math.max(1, Math.min(6, state.players.length - 1));
}

function shuffle(list) {
  const cloned = [...list];
  for (let index = cloned.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [cloned[index], cloned[swap]] = [cloned[swap], cloned[index]];
  }
  return cloned;
}

function loadSpecyWords() {
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(SPECY_WORDS_KEY)
      || window.localStorage.getItem("impostor_spicy_words_v1")
      || "[]"
    );
    if (!Array.isArray(parsed)) return [];
    const cleaned = parsed
      .map((entry) => String(entry || "").trim().slice(0, 36))
      .filter(Boolean)
      .slice(0, 80);
    return cleaned.length ? cleaned : [...DEFAULT_SPICY_WORDS];
  } catch {
    return [...DEFAULT_SPICY_WORDS];
  }
}

function saveSpecyWords() {
  window.localStorage.setItem(SPECY_WORDS_KEY, JSON.stringify(state.specyWords.slice(0, 80)));
}

function normalizeWord(value) {
  return String(value || "").trim().slice(0, 36);
}

function formatSeconds(totalSeconds) {
  const minutes = Math.floor(Math.max(0, totalSeconds) / 60);
  const seconds = Math.max(0, totalSeconds) % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function stopDiscussionTimer() {
  if (state.discussionTimerId) {
    window.clearInterval(state.discussionTimerId);
    state.discussionTimerId = null;
  }
}

function getWordPool() {
  return state.categories
    .filter((category) => state.selectedCategoryIds.has(category.id))
    .flatMap((category) => (category.id === "spicy" ? state.specyWords : category.words));
}

function renderDiscussion() {
  if (!discussionTitle || !discussionTimerText) return;
  const starter = state.roundCards[0]?.name || "Spieler";
  discussionTitle.textContent = `${starter} beginnt!`;
  if (!state.timerEnabled) {
    discussionTimerText.textContent = "Für dieses Spiel gibt es keinen Timer. Deckt den Impostor auf, sobald ihr euch einig seid.";
    return;
  }
  discussionTimerText.textContent = `Diskussionszeit läuft: ${formatSeconds(state.discussionLeft)}`;
}

function startDiscussionPhase() {
  stopDiscussionTimer();
  state.discussionLeft = state.discussionSeconds;
  showScreen("discussion");
  renderDiscussion();

  if (!state.timerEnabled) {
    applyInteractionLock();
    return;
  }

  state.discussionTimerId = window.setInterval(() => {
    if (state.discussionLeft <= 0) {
      stopDiscussionTimer();
      return;
    }
    state.discussionLeft -= 1;
    renderDiscussion();
  }, 1000);

  applyInteractionLock();
}

function showResultPhase() {
  stopDiscussionTimer();
  if (!resultTitle) return;
  const impostorNames = state.roundCards.filter((entry) => entry.isImpostor).map((entry) => entry.name);
  if (impostorNames.length <= 1) {
    resultTitle.textContent = `Der Impostor ist ${impostorNames[0] || "Unbekannt"}`;
  } else {
    resultTitle.textContent = `Die Impostor sind ${impostorNames.join(", ")}`;
  }
  showScreen("result");
  applyInteractionLock();
}

function renderSpecyWords() {
  if (!specyWordList) return;
  specyWordList.innerHTML = "";

  if (!state.specyWords.length) {
    const empty = document.createElement("p");
    empty.className = "impostor-note";
    empty.textContent = "Noch keine specy Wörter eingetragen.";
    specyWordList.appendChild(empty);
    return;
  }

  state.specyWords.forEach((word, index) => {
    const chip = document.createElement("button");
    chip.className = "impostor-chip";
    chip.type = "button";
    chip.textContent = `${word} ✕`;
    chip.addEventListener("click", () => {
      state.specyWords.splice(index, 1);
      saveSpecyWords();
      renderSpecyWords();
      renderCategories();
      renderMain();
    });
    specyWordList.appendChild(chip);
  });
}

function addSpecyWord() {
  if (!specyWordInput) return;
  const word = normalizeWord(specyWordInput.value);
  if (!word) return;

  const duplicate = state.specyWords.some((entry) => entry.toLowerCase() === word.toLowerCase());
  if (!duplicate) {
    state.specyWords.push(word);
    saveSpecyWords();
  }

  specyWordInput.value = "";
  renderSpecyWords();
  renderCategories();
  renderMain();
}

function renderMain() {
  playerCountLabel.textContent = String(state.players.length);
  if (state.impostorCount > allowedImpostorMax()) {
    state.impostorCount = allowedImpostorMax();
  }
  impostorCountLabel.textContent = String(state.impostorCount);
  hintToggle.checked = state.hintsEnabled;
  timerToggle.checked = state.timerEnabled;

  const selectedNames = state.categories
    .filter((category) => state.selectedCategoryIds.has(category.id))
    .map((category) => category.name);
  categoryPreview.textContent = selectedNames.slice(0, 2).join(", ") + (selectedNames.length > 2 ? "…" : "");
  applyInteractionLock();
}

function renderPlayers() {
  playerList.innerHTML = "";
  state.players.forEach((name, index) => {
    const li = document.createElement("li");
    li.className = "impostor-item";

    const title = document.createElement("span");
    title.textContent = name;

    const actions = document.createElement("div");
    actions.className = "impostor-item-actions";

    const editBtn = document.createElement("button");
    editBtn.className = "impostor-mini";
    editBtn.textContent = "✎";
    editBtn.addEventListener("click", () => {
      const next = window.prompt("Name ändern", name);
      if (!next) return;
      const normalized = next.trim().slice(0, 24);
      if (!normalized) return;
      state.players[index] = normalized;
      renderPlayers();
      renderMain();
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "impostor-mini danger";
    deleteBtn.textContent = "🗑";
    deleteBtn.disabled = state.players.length <= 3;
    deleteBtn.addEventListener("click", () => {
      if (state.players.length <= 3) return;
      state.players.splice(index, 1);
      renderPlayers();
      renderMain();
    });

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    li.appendChild(title);
    li.appendChild(actions);
    playerList.appendChild(li);
  });
  applyInteractionLock();
}

function renderImpostorOptions() {
  impostorOptionList.innerHTML = "";
  const max = allowedImpostorMax();
  for (let count = 1; count <= 6; count += 1) {
    const btn = document.createElement("button");
    btn.className = "impostor-row";
    btn.disabled = count > max;
    btn.innerHTML = `<span>${count} Impostor</span><strong>${state.impostorCount === count ? "✓" : ""}</strong>`;
    btn.addEventListener("click", () => {
      if (count > max) return;
      state.impostorCount = count;
      renderImpostorOptions();
      renderMain();
    });
    impostorOptionList.appendChild(btn);
  }
  applyInteractionLock();
}

function renderCategories() {
  selectedCategories.innerHTML = "";
  categoryList.innerHTML = "";

  state.categories.forEach((category) => {
    if (state.selectedCategoryIds.has(category.id)) {
      const chip = document.createElement("button");
      chip.className = "impostor-chip";
      chip.textContent = `${category.emoji} ${category.name} ✕`;
      chip.addEventListener("click", () => {
        if (state.selectedCategoryIds.size <= 1) return;
        state.selectedCategoryIds.delete(category.id);
        renderCategories();
        renderMain();
      });
      selectedCategories.appendChild(chip);
    }

    const card = document.createElement("button");
    card.className = "impostor-category";
    const active = state.selectedCategoryIds.has(category.id);
    const description = category.id === "spicy"
      ? `${category.desc} (${state.specyWords.length} Wörter)`
      : category.desc;
    card.innerHTML = `
      <div class="impostor-category-icon">${category.emoji}</div>
      <div class="impostor-category-copy">
        <h4>${category.name}</h4>
        <p>${description}</p>
      </div>
      <strong>${active ? "✓" : "+"}</strong>
    `;
    card.addEventListener("click", () => {
      if (active && state.selectedCategoryIds.size <= 1) return;
      if (active) {
        state.selectedCategoryIds.delete(category.id);
      } else {
        state.selectedCategoryIds.add(category.id);
      }
      renderCategories();
      renderMain();
    });

    categoryList.appendChild(card);
  });
  renderSpecyWords();
  applyInteractionLock();
}

function buildRound() {
  const pool = getWordPool();
  if (pool.length < 1) {
    return { ok: false, error: "Keine Wörter verfügbar. Für spicy bitte eigene Wörter eintragen." };
  }
  if (state.players.length < 3) {
    return { ok: false, error: "Mindestens 3 Spieler sind nötig." };
  }
  if (state.impostorCount >= state.players.length) {
    return { ok: false, error: "Zu viele Impostor für die Spieleranzahl." };
  }

  const secretWord = pool[Math.floor(Math.random() * pool.length)];
  const shuffledPlayers = shuffle(state.players);
  const impostorSet = new Set(shuffledPlayers.slice(0, state.impostorCount));

  state.roundCards = state.players.map((name) => {
    const isImpostor = impostorSet.has(name);
    const hint = state.hintsEnabled && isImpostor ? "Tipp: Frag nach Details, ohne zu viel zu reden." : "";
    return {
      name,
      isImpostor,
      word: isImpostor ? "Du bist der Impostor" : secretWord,
      hint
    };
  });

  state.revealIndex = 0;
  state.revealed = false;
  return { ok: true };
}

function renderReveal() {
  const card = state.roundCards[state.revealIndex];
  if (!card) {
    startDiscussionPhase();
    return;
  }

  revealPlayerName.textContent = card.name;
  revealRoleLabel.textContent = state.revealed ? (card.isImpostor ? "👻 Impostor" : "✅ Normal") : "Bereit?";
  revealWord.textContent = state.revealed ? `${card.word}${card.hint ? ` • ${card.hint}` : ""}` : "";
  revealWord.classList.toggle("hidden", !state.revealed);
  revealBtn.disabled = state.revealed;
  nextPlayerBtn.disabled = !state.revealed;
  nextPlayerBtn.textContent = state.revealIndex >= state.roundCards.length - 1 ? "Runde fertig" : "Weitergeben";
  applyInteractionLock();
}

function bootstrap() {
  state.specyWords = loadSpecyWords();
  if (!window.localStorage.getItem(SPECY_WORDS_KEY) && !window.localStorage.getItem("impostor_spicy_words_v1")) {
    saveSpecyWords();
  }
  startModerationWatcher();

  showScreen("main");
  renderMain();
  renderPlayers();
  renderImpostorOptions();
  renderCategories();

  document.getElementById("openPlayersBtn").addEventListener("click", () => showScreen("players"));
  document.getElementById("openImpostorsBtn").addEventListener("click", () => showScreen("impostors"));
  document.getElementById("openCategoriesBtn").addEventListener("click", () => showScreen("categories"));

  document.querySelectorAll(".impostor-back-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const to = button.getAttribute("data-back");
      showScreen(to || "main");
      renderMain();
    });
  });

  hintToggle.addEventListener("change", () => {
    state.hintsEnabled = hintToggle.checked;
  });

  timerToggle.addEventListener("change", () => {
    state.timerEnabled = timerToggle.checked;
  });

  if (addSpecyWordBtn) {
    addSpecyWordBtn.addEventListener("click", addSpecyWord);
  }
  if (specyWordInput) {
    specyWordInput.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      addSpecyWord();
    });
  }

  document.getElementById("addPlayerBtn").addEventListener("click", () => {
    const next = window.prompt("Spielername hinzufügen", "Neuer Spieler");
    if (!next) return;
    const normalized = next.trim().slice(0, 24);
    if (!normalized) return;
    state.players.push(normalized);
    renderPlayers();
    renderMain();
    renderImpostorOptions();
  });

  document.getElementById("startGameBtn").addEventListener("click", () => {
    mainError.textContent = "";
    const result = buildRound();
    if (!result.ok) {
      mainError.textContent = result.error;
      return;
    }
    showScreen("reveal");
    renderReveal();
  });

  revealBtn.addEventListener("click", () => {
    state.revealed = true;
    renderReveal();
  });

  nextPlayerBtn.addEventListener("click", () => {
    state.revealed = false;
    state.revealIndex += 1;
    if (state.revealIndex >= state.roundCards.length) {
      startDiscussionPhase();
      return;
    }
    renderReveal();
  });

  const revealImpostorBtn = document.getElementById("revealImpostorBtn");
  if (revealImpostorBtn) {
    revealImpostorBtn.addEventListener("click", () => {
      showResultPhase();
    });
  }

  document.getElementById("newRoundBtn").addEventListener("click", () => {
    stopDiscussionTimer();
    showScreen("main");
    state.roundCards = [];
    state.revealIndex = 0;
    state.revealed = false;
    state.discussionLeft = state.discussionSeconds;
    renderMain();
  });
}

bootstrap();
