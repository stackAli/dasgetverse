const grid = document.getElementById("pocketGrid");
const search = document.getElementById("pocketSearch");
const filter = document.getElementById("rarityFilter");
const clearBtn = document.getElementById("clearPocket");

function renderPocket() {
  const q = (search.value || "").toLowerCase();
  const rarity = filter.value;
  const pocket = Store.pocket().filter(g => {
    const matchesSearch = g.name.toLowerCase().includes(q) || g.description.toLowerCase().includes(q);
    const matchesRarity = rarity === "all" || g.rarity === rarity;
    return matchesSearch && matchesRarity;
  });

  if (pocket.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <h2>Your pocket is empty</h2>
        <p class="muted">Go to the Gadget Lab or play the Adventure Game to collect gadgets.</p>
        <a class="btn primary" href="lab.html">Create Gadget</a>
      </div>
    `;
    return;
  }

  grid.innerHTML = pocket.map(g => gadgetCardHTML(g)).join("");
}

function upgradeGadget(id) {
  const gadget = Store.pocket().find(g => g.id === id);
  if (!gadget) return;
  GadgetDB.update(id, {
    level: gadget.level + 1,
    uses: gadget.uses + 1
  });
  renderPocket();
}

function addUse(id) {
  const gadget = Store.pocket().find(g => g.id === id);
  if (!gadget) return;
  GadgetDB.update(id, { uses: gadget.uses + 1 });
  renderPocket();
}

function deleteGadget(id) {
  if (!confirm("Delete this gadget from the pocket?")) return;
  GadgetDB.remove(id);
  renderPocket();
}

search.addEventListener("input", renderPocket);
filter.addEventListener("change", renderPocket);
clearBtn.addEventListener("click", () => {
  if (confirm("Clear all gadgets from pocket?")) {
    Store.savePocket([]);
    renderPocket();
  }
});

renderPocket();
