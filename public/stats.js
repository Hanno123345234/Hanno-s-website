async function loadStats() {
  const info = document.getElementById("statsInfo");
  const roleStatsList = document.getElementById("roleStatsList");
  const killHeatmapList = document.getElementById("killHeatmapList");
  const eloTopList = document.getElementById("eloTopList");
  const highlightsList = document.getElementById("highlightsList");

  info.textContent = "Lade Daten…";
  roleStatsList.innerHTML = "";
  killHeatmapList.innerHTML = "";
  eloTopList.innerHTML = "";
  highlightsList.innerHTML = "";

  try {
    const response = await fetch("/api/stats", { cache: "no-store" });
    if (!response.ok) throw new Error("Fehler beim Laden");
    const data = await response.json();

    roleStatsList.innerHTML = `
      <li>Crew Winrate: ${data.roleStats?.crewWinRate ?? 0}%</li>
      <li>Imposter Winrate: ${data.roleStats?.imposterWinRate ?? 0}%</li>
    `;

    Object.entries(data.killHeatmap || {}).forEach(([room, count]) => {
      const li = document.createElement("li");
      li.textContent = `${room}: ${count}`;
      killHeatmapList.appendChild(li);
    });

    (data.eloTop || []).forEach((entry) => {
      const li = document.createElement("li");
      li.textContent = `${entry.name} • ELO ${entry.elo} • Lvl ${entry.level}`;
      eloTopList.appendChild(li);
    });

    (data.highlights || []).slice().reverse().forEach((entry) => {
      const li = document.createElement("li");
      li.textContent = entry.text || "-";
      highlightsList.appendChild(li);
    });

    info.textContent = "Aktualisiert";
  } catch (error) {
    info.textContent = "Konnte Stats nicht laden";
  }
}

document.getElementById("refreshStatsBtn").addEventListener("click", loadStats);
loadStats();
