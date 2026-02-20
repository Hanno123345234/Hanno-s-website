async function loadAdmin() {
  const info = document.getElementById("adminInfo");
  const riskList = document.getElementById("riskList");
  const banList = document.getElementById("banList");
  const reportList = document.getElementById("reportList");

  info.textContent = "Lade Daten…";
  riskList.innerHTML = "";
  banList.innerHTML = "";
  reportList.innerHTML = "";

  try {
    const response = await fetch("/api/admin", { cache: "no-store" });
    if (!response.ok) throw new Error("Fehler beim Laden");
    const data = await response.json();

    (data.risk || []).forEach((entry) => {
      const li = document.createElement("li");
      li.textContent = `${entry.name} • Risk ${entry.risk}`;
      riskList.appendChild(li);
    });

    (data.bans || []).forEach((entry) => {
      const li = document.createElement("li");
      li.textContent = `${entry.fingerprint} • bis ${new Date(entry.until).toLocaleString("de-DE")}`;
      banList.appendChild(li);
    });

    (data.reports || []).forEach((entry) => {
      const li = document.createElement("li");
      li.textContent = `${entry.name} • Reports ${entry.reports}`;
      reportList.appendChild(li);
    });

    info.textContent = "Aktualisiert";
  } catch (error) {
    info.textContent = "Konnte Admin-Daten nicht laden";
  }
}

document.getElementById("refreshAdminBtn").addEventListener("click", loadAdmin);
loadAdmin();
