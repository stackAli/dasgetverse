const GadgetDB = {
  meta: {
    teleport: { icon: "🚪", label: "Teleport", effect: "Teleports Nobita away from danger." },
    fly: { icon: "🚁", label: "Fly", effect: "Allows Nobita to fly for a few seconds." },
    shrink: { icon: "🔦", label: "Shrink", effect: "Shrinks Nobita to avoid enemies." },
    grow: { icon: "💡", label: "Grow", effect: "Makes Nobita strong enough to break obstacles." },
    slow: { icon: "⏳", label: "Slow Motion", effect: "Slows enemies and traps." },
    blast: { icon: "💨", label: "Air Cannon", effect: "Blasts away the nearest obstacle." },
    invisible: { icon: "🧥", label: "Invisible", effect: "Makes Nobita untouchable temporarily." },
    magnet: { icon: "🧲", label: "Magnet", effect: "Pulls comic books toward Nobita." },
    heal: { icon: "💙", label: "Heal", effect: "Restores one life." },
    freeze: { icon: "🧊", label: "Freeze", effect: "Freezes obstacles for a few seconds." },
    bonus: { icon: "🍞", label: "Bonus", effect: "Gives bonus score instantly." }
  },

  samples: [
    { name: "Anywhere Door", type: "teleport", rarity: "Legendary", uses: 2, description: "A magical door that jumps Nobita to a safer position." },
    { name: "Bamboo Copter", type: "fly", rarity: "Rare", uses: 3, description: "Lets Nobita fly above enemies and traps." },
    { name: "Small Light", type: "shrink", rarity: "Rare", uses: 3, description: "Shrinks Nobita so he can pass through narrow danger zones." },
    { name: "Big Light", type: "grow", rarity: "Epic", uses: 2, description: "Makes Nobita powerful enough to break obstacles." },
    { name: "Time Machine", type: "slow", rarity: "Legendary", uses: 2, description: "Slows down trouble around Nobita." },
    { name: "Air Cannon", type: "blast", rarity: "Epic", uses: 3, description: "Shoots a strong air blast at obstacles." },
    { name: "Invisible Cape", type: "invisible", rarity: "Epic", uses: 2, description: "Makes Nobita untouchable for a short time." },
    { name: "Comic Magnet", type: "magnet", rarity: "Rare", uses: 3, description: "Attracts nearby comic books toward Nobita." },
    { name: "Healing Bell", type: "heal", rarity: "Rare", uses: 2, description: "Restores one lost life during the mission." },
    { name: "Freeze Light", type: "freeze", rarity: "Epic", uses: 2, description: "Freezes obstacles in place for a short time." },
    { name: "Memory Bread", type: "bonus", rarity: "Common", uses: 4, description: "Gives extra score, like studying instantly." }
  ],

  create(data) {
    const meta = this.meta[data.type] || this.meta.bonus;
    return {
      id: Date.now() + Math.floor(Math.random() * 9999),
      name: String(data.name || "Custom Gadget").trim(),
      type: data.type,
      rarity: data.rarity || "Common",
      uses: Number(data.uses || 1),
      level: Number(data.level || 1),
      description: data.description || meta.effect,
      customEffect: data.customEffect || meta.effect
    };
  },

  add(gadget) {
    const pocket = Store.pocket();
    const same = pocket.find(g => g.name.toLowerCase() === gadget.name.toLowerCase());
    if (same) {
      same.uses += Number(gadget.uses || 1);
      same.level = Math.max(same.level, gadget.level || 1);
      same.description = gadget.description || same.description;
      same.customEffect = gadget.customEffect || same.customEffect;
      same.type = gadget.type || same.type;
    } else {
      pocket.push(gadget);
    }
    Store.savePocket(pocket);
    Store.addStats({ gadgets: 1 });
  },

  update(id, patch) {
    const pocket = Store.pocket().map(g => g.id === id ? { ...g, ...patch } : g);
    Store.savePocket(pocket);
  },

  remove(id) { Store.savePocket(Store.pocket().filter(g => g.id !== id)); },

  use(id) {
    const pocket = Store.pocket();
    const gadget = pocket.find(g => g.id === id);
    if (!gadget) return null;
    gadget.uses -= 1;
    const updated = pocket.filter(g => g.uses > 0);
    Store.savePocket(updated);
    Store.addStats({ uses: 1 });
    return gadget;
  },

  icon(type) { return (this.meta[type] || this.meta.bonus).icon; },
  typeLabel(type) { return (this.meta[type] || this.meta.bonus).label; }
};

function rarityClass(rarity) {
  const r = String(rarity || "").toLowerCase();
  if (r === "rare") return "rare";
  if (r === "epic") return "epic";
  if (r === "legendary") return "legendary";
  return "";
}

function gadgetCardHTML(gadget, mode = "manage") {
  const useButton = mode === "game"
    ? `<button class="btn primary" onclick="window.gameUseGadget(${gadget.id})">Use</button>`
    : `<button class="btn primary" onclick="alert('Use gadgets from the Adventure Game page.')">Use</button>`;
  return `<article class="gadget-card"><div class="gadget-icon">${GadgetDB.icon(gadget.type)}</div><div class="badges"><span class="badge">${GadgetDB.typeLabel(gadget.type)}</span><span class="badge ${rarityClass(gadget.rarity)}">${gadget.rarity}</span><span class="badge">Level ${gadget.level}</span></div><h3>${gadget.name}</h3><p class="muted">${gadget.description}</p><p><strong>Game Effect:</strong> ${gadget.customEffect || GadgetDB.meta[gadget.type]?.effect || "Bonus score"}</p><p><strong>Uses:</strong> ${gadget.uses}</p><div class="card-actions">${useButton}${mode !== "game" ? `<button class="btn ghost" onclick="upgradeGadget(${gadget.id})">Upgrade</button>` : ""}${mode !== "game" ? `<button class="btn ghost" onclick="addUse(${gadget.id})">+ Use</button>` : ""}${mode !== "game" ? `<button class="btn danger" onclick="deleteGadget(${gadget.id})">Delete</button>` : ""}</div></article>`;
}
