document.addEventListener("DOMContentLoaded", () => {
  // ── Nav toggle ─────────────────────────────────────────
  const menu = document.getElementById("menuBtn");
  const nav  = document.getElementById("navLinks");
  if (menu && nav) {
    menu.addEventListener("click", () => nav.classList.toggle("open"));
    document.addEventListener("click", e => {
      if (!menu.contains(e.target) && !nav.contains(e.target)) {
        nav.classList.remove("open");
      }
    });
  }

  // ── Active link ────────────────────────────────────────
  const current = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll("#navLinks a").forEach(a => {
    if (a.getAttribute("href") === current) a.classList.add("active");
  });

  // ── Home page stats ────────────────────────────────────
  const statBest = document.getElementById("statBest");
  if (statBest) {
    const scores = Store.scores();
    statBest.textContent = (scores[0]?.score || 0).toLocaleString();
  }

  const statPocket = document.getElementById("statPocket");
  if (statPocket) statPocket.textContent = Store.pocket().length;

  const statMissions = document.getElementById("statMissions");
  if (statMissions) {
    Store.updateMissionProgress();
    statMissions.textContent = Store.missions().filter(m => m.completed).length;
  }

  const statEpisodes = document.getElementById("statEpisodes");
  if (statEpisodes) statEpisodes.textContent = Store.episodes().length;
});

// ── Gadget card HTML helper (used in game and pocket pages) ──────────────
function gadgetCardHTML(g, mode) {
  const meta = GadgetDB.meta[g.type] || GadgetDB.meta.bonus;
  const rarityClass = (g.rarity||"").toLowerCase();
  const actionBtn = mode === "game"
    ? `<button class="btn primary mini" onclick="gameUseGadget(${g.id})">✨ Use</button>`
    : `<button class="btn ghost   mini" onclick="equipGadget && equipGadget(${g.id})">Equip</button>`;

  return `<div class="gadget-card">
    <div class="badges">
      <span class="badge ${rarityClass}">${g.rarity||'Common'}</span>
      <span class="badge">${meta.label||g.type}</span>
    </div>
    <h3>${meta.icon||'🎒'} ${g.name}</h3>
    <p class="muted">${g.description||meta.effect}</p>
    <p class="muted" style="margin-top:6px;">Uses left: <strong style="color:#00AEEF">${g.uses}</strong></p>
    <div class="card-actions">
      ${actionBtn}
    </div>
  </div>`;
}
