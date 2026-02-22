const screens = {
  main: document.getElementById("screenMain"),
  players: document.getElementById("screenPlayers"),
  impostors: document.getElementById("screenImpostors"),
  categories: document.getElementById("screenCategories"),
  reveal: document.getElementById("screenReveal"),
  done: document.getElementById("screenDone")
};

const state = {
  players: ["Hanno", "Elle", "Cristtine", "Fin", "Papa"],
  impostorCount: 1,
  hintsEnabled: true,
  timerEnabled: false,
  categories: [
    { id: "trends", emoji: "🚀", name: "Trends", desc: "Hypes, Styles und Themen von heute.", words: ["Chill Guy", "AI", "Fortnite", "TikTok", "Rizz"] },
    { id: "alltag", emoji: "⏰", name: "Alltag", desc: "Dinge aus Schule, Zuhause und Alltag.", words: ["Rucksack", "Zahnbürste", "Mathe", "Kopfhörer", "Bäckerei"] },
    { id: "filme", emoji: "🎬", name: "Filme & Serien", desc: "Blockbuster und Kulttitel.", words: ["Avatar", "Batman", "Wednesday", "Naruto", "Netflix"] },
    { id: "games", emoji: "🎮", name: "Gaming", desc: "Games, Maps und bekannte Begriffe.", words: ["Minecraft", "Roblox", "Valorant", "FIFA", "Controller"] },
    { id: "welt", emoji: "🌍", name: "Rund um die Welt", desc: "Länder, Orte, Reisen.", words: ["Paris", "Sahara", "Tokyo", "Alpen", "Nil"] }
  ],
  selectedCategoryIds: new Set(["trends", "alltag", "welt"]),
  roundCards: [],
  revealIndex: 0,
  revealed: false
};

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

const revealPlayerName = document.getElementById("revealPlayerName");
const revealRoleLabel = document.getElementById("revealRoleLabel");
const revealWord = document.getElementById("revealWord");
const revealBtn = document.getElementById("revealBtn");
const nextPlayerBtn = document.getElementById("nextPlayerBtn");

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

function getWordPool() {
  return state.categories
    .filter((category) => state.selectedCategoryIds.has(category.id))
    .flatMap((category) => category.words);
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
    card.innerHTML = `
      <div class="impostor-category-icon">${category.emoji}</div>
      <div class="impostor-category-copy">
        <h4>${category.name}</h4>
        <p>${category.desc}</p>
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
}

function buildRound() {
  const pool = getWordPool();
  if (pool.length < 1) {
    return { ok: false, error: "Bitte mindestens eine Kategorie aktivieren." };
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
    showScreen("done");
    return;
  }

  revealPlayerName.textContent = card.name;
  revealRoleLabel.textContent = state.revealed ? (card.isImpostor ? "👻 Impostor" : "✅ Normal") : "Bereit?";
  revealWord.textContent = state.revealed ? `${card.word}${card.hint ? ` • ${card.hint}` : ""}` : "";
  revealWord.classList.toggle("hidden", !state.revealed);
  revealBtn.disabled = state.revealed;
  nextPlayerBtn.disabled = !state.revealed;
  nextPlayerBtn.textContent = state.revealIndex >= state.roundCards.length - 1 ? "Runde fertig" : "Weitergeben";
}

function bootstrap() {
  renderMain();
  renderPlayers();
  renderImpostorOptions();
  renderCategories();
  renderReveal();

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
      showScreen("done");
      return;
    }
    renderReveal();
  });

  document.getElementById("newRoundBtn").addEventListener("click", () => {
    showScreen("main");
    state.roundCards = [];
    state.revealIndex = 0;
    state.revealed = false;
    renderMain();
  });
}

bootstrap();
