const form = document.getElementById("createLobbyForm");
const registrationInput = document.getElementById("registrationOpens");
const supporterTimeEl = document.getElementById("supporterTime");
const boosterTimeEl = document.getElementById("boosterTime");
const verifiedTimeEl = document.getElementById("verifiedTime");
const resultBox = document.getElementById("result");
const resultText = document.getElementById("resultText");
const resetBtn = document.getElementById("resetBtn");
const submitBtn = form.querySelector('button[type="submit"]');

const API_BASE = String(window.SCRIMS_API_BASE || "").trim().replace(/\/+$/, "");

function apiUrl(path) {
  return API_BASE ? `${API_BASE}${path}` : path;
}

function addMinutes(hhmm, minutes) {
  const [h, m] = String(hhmm || "00:00").split(":").map(Number);
  const base = new Date();
  base.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, 0, 0);
  base.setMinutes(base.getMinutes() + minutes);
  return `${String(base.getHours()).padStart(2, "0")}:${String(base.getMinutes()).padStart(2, "0")}`;
}

function refreshPriorityTimes() {
  const opens = registrationInput.value || "00:00";
  supporterTimeEl.textContent = addMinutes(opens, 1);
  boosterTimeEl.textContent = addMinutes(opens, 2);
  verifiedTimeEl.textContent = addMinutes(opens, 3);
}

registrationInput.addEventListener("input", refreshPriorityTimes);

resetBtn.addEventListener("click", () => {
  form.reset();
  document.getElementById("session").value = "1";
  document.getElementById("lobby").value = "1";
  registrationInput.value = "00:48";
  document.getElementById("lobbyTemplate").value = "duo-default";
  resultBox.hidden = true;
  refreshPriorityTimes();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = {
    session: Number(document.getElementById("session").value),
    lobby: Number(document.getElementById("lobby").value),
    registrationOpens: registrationInput.value,
    lobbyTemplate: document.getElementById("lobbyTemplate").value,
  };

  submitBtn.disabled = true;
  submitBtn.textContent = "Creating...";

  try {
    const response = await fetch(apiUrl("/api/scrims/create-lobby"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Lobby creation failed.");
    }

    resultText.textContent = `Erfolgreich: ${data.categoryName || "Lobby erstellt"}`;
    resultBox.hidden = false;
  } catch (error) {
    resultText.textContent = `Fehler: ${error.message || "Unknown error"}`;
    resultBox.hidden = false;
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Create Lobby";
  }
});

refreshPriorityTimes();
