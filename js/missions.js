const form = document.getElementById("missionForm");
const list = document.getElementById("missionList");
const resetBtn = document.getElementById("resetMissions");
const deleteCompletedBtn = document.getElementById("deleteCompleted");

function renderMissions() {
  Store.updateMissionProgress();
  const missions = Store.missions();

  if (!missions.length) {
    list.innerHTML = `<div class="empty-state"><h2>No missions</h2><p class="muted">Add a custom mission or reset defaults.</p></div>`;
    return;
  }

  list.innerHTML = missions.map(m => {
    const percent = Math.min(100, Math.round((m.progress / m.target) * 100));
    return `
      <article class="mission-card">
        <div class="badges">
          <span class="badge">${m.type}</span>
          <span class="badge ${m.completed ? "legendary" : ""}">${m.completed ? "Completed" : "In Progress"}</span>
        </div>
        <h3>${m.title}</h3>
        <p class="muted">${m.progress} / ${m.target}</p>
        <div class="progress"><span style="width:${percent}%"></span></div>
        <div class="card-actions">
          <button class="btn ghost" onclick="increaseMission(${m.id})">+ Progress</button>
          <button class="btn danger" onclick="deleteMission(${m.id})">Delete</button>
        </div>
      </article>
    `;
  }).join("");
}

function increaseMission(id) {
  const missions = Store.missions().map(m => {
    if (m.id !== id) return m;
    const progress = Math.min(m.target, m.progress + 1);
    return { ...m, progress, completed: progress >= m.target };
  });
  Store.saveMissions(missions);
  renderMissions();
}

function deleteMission(id) {
  if (!confirm("Delete this mission?")) return;
  Store.saveMissions(Store.missions().filter(m => m.id !== id));
  renderMissions();
}

form.addEventListener("submit", e => {
  e.preventDefault();

  const mission = {
    id: Date.now(),
    title: document.getElementById("missionTitle").value.trim(),
    type: document.getElementById("missionType").value,
    target: Number(document.getElementById("missionTarget").value),
    progress: 0,
    completed: false
  };

  const missions = Store.missions();
  missions.unshift(mission);
  Store.saveMissions(missions);
  form.reset();
  document.getElementById("missionTarget").value = 5;
  renderMissions();
});

resetBtn.addEventListener("click", () => {
  if (confirm("Reset missions to defaults?")) {
    Store.saveMissions(Seed.missions);
    Store.setStats({ comics: 0, gadgets: 0, uses: 0, score: 0 });
    renderMissions();
  }
});

deleteCompletedBtn.addEventListener("click", () => {
  Store.saveMissions(Store.missions().filter(m => !m.completed));
  renderMissions();
});

renderMissions();
