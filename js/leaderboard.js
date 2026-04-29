const tableBody = document.getElementById("scoreTable");
const best       = document.getElementById("bestScore");
const clearBtn   = document.getElementById("clearScores");
const savedRuns  = document.getElementById("savedRuns");
const totalComics= document.getElementById("totalComics");
const podiumRow  = document.getElementById("podiumRow");

const TROPHIES = ["🥇","🥈","🥉"];
const RANK_CLASS = ["rank-1","rank-2","rank-3"];

function buildPodium(scores) {
  if (!podiumRow || scores.length === 0) return;
  const top = scores.slice(0, 3);
  podiumRow.style.display = "flex";
  podiumRow.innerHTML = top.map((s, i) => `
    <div class="podium-card ${i===0?'first':i===1?'second':'third'}">
      <span class="podium-trophy">${TROPHIES[i]}</span>
      <div class="podium-rank">Rank #${i+1}</div>
      <div class="podium-score">${s.score.toLocaleString()}</div>
      <div class="podium-comics">📘 ${s.comics} comics</div>
      <div style="font-size:11px;color:#5a8ab8;margin-top:6px;">${s.date}</div>
    </div>
  `).join("");
}

function renderScores() {
  const scores = Store.scores();
  const b = scores[0]?.score || 0;

  best.textContent      = b.toLocaleString();
  savedRuns.textContent = scores.length;
  totalComics.textContent = scores.reduce((sum,s) => sum + Number(s.comics||0), 0);

  buildPodium(scores);

  if (!scores.length) {
    tableBody.innerHTML = `
      <tr><td colspan="4">
        <div class="lb-empty">
          <span class="big-emoji">🎮</span>
          <h3>No scores yet</h3>
          <p>Play the Adventure Game to record your first run!</p>
          <a href="game.html" class="btn primary" style="margin-top:16px; display:inline-flex;">▶ Play Now</a>
        </div>
      </td></tr>`;
    return;
  }

  tableBody.innerHTML = scores.map((s, i) => {
    const rankClass = i < 3 ? RANK_CLASS[i] : "rank-n";
    const rankLabel = i < 3 ? TROPHIES[i] : `#${i+1}`;
    const isTop = i === 0 ? 'style="background:rgba(255,215,0,0.04)"' : '';
    return `<tr ${isTop}>
      <td><span class="rank-badge ${rankClass}">${rankLabel}</span></td>
      <td><span class="score-val">${s.score.toLocaleString()}</span></td>
      <td><span class="comics-val">📘 ${s.comics}</span></td>
      <td><span class="date-val">${s.date}</span></td>
    </tr>`;
  }).join("");
}

clearBtn.addEventListener("click", () => {
  if (!confirm("Reset all scores? This cannot be undone.")) return;
  Store.write(Store.keys.scores, []);
  if (podiumRow) { podiumRow.style.display = "none"; podiumRow.innerHTML = ""; }
  renderScores();
});

renderScores();
