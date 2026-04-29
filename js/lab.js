const form = document.getElementById("gadgetForm");
const suggestionList = document.getElementById("suggestionList");
const descInput = document.getElementById("gadgetDesc");
const typeInput = document.getElementById("gadgetType");
const preview = document.getElementById("effectPreview");

const effectLabels = {
  teleport: "Teleports Nobita forward and pushes danger away.",
  fly: "Lets Nobita fly for a few seconds.",
  shrink: "Shrinks Nobita so obstacles are easier to avoid.",
  grow: "Makes Nobita bigger and able to smash obstacles.",
  slow: "Slows the whole game temporarily.",
  blast: "Destroys the nearest obstacle.",
  invisible: "Makes Nobita untouchable for a short time.",
  magnet: "Pulls comic books toward Nobita.",
  heal: "Restores one life, up to the maximum.",
  freeze: "Freezes enemies and traps for a short time.",
  bonus: "Adds instant bonus score."
};

function detectGadgetType(text, selected = "auto") {
  if (selected && selected !== "auto") return selected;
  const value = String(text || "").toLowerCase();
  if (/magnet|attract|pull|collect.*comic|bring.*comic/.test(value)) return "magnet";
  if (/heal|life|heart|recover|restore/.test(value)) return "heal";
  if (/freeze|stop|ice|stun/.test(value)) return "freeze";
  if (/teleport|door|jump|forward|portal|move away/.test(value)) return "teleport";
  if (/fly|flying|air|copter|hover/.test(value)) return "fly";
  if (/shrink|small|tiny|mini/.test(value)) return "shrink";
  if (/grow|big|large|giant|strong|smash|break/.test(value)) return "grow";
  if (/slow|time|delay|slower/.test(value)) return "slow";
  if (/blast|cannon|shoot|destroy|remove obstacle|attack/.test(value)) return "blast";
  if (/invisible|hide|shield|untouchable|protect|safe/.test(value)) return "invisible";
  return "bonus";
}

function updatePreview() {
  const detected = detectGadgetType(descInput.value, typeInput.value);
  preview.textContent = `Detected game effect: ${GadgetDB.typeLabel(detected)} — ${effectLabels[detected] || effectLabels.bonus}`;
}

function renderSuggestions() {
  suggestionList.innerHTML = GadgetDB.samples.map(sample => `
    <div class="suggestion" onclick='addSample(${JSON.stringify(sample)})'>
      <span class="emoji">${GadgetDB.icon(sample.type)}</span>
      <div><strong>${sample.name}</strong><p class="muted" style="margin: 4px 0 0;">${sample.rarity} · ${GadgetDB.typeLabel(sample.type)}</p></div>
    </div>
  `).join("");
}

function addSample(sample) {
  GadgetDB.add(GadgetDB.create(sample));
  alert(`${sample.name} added to pocket.`);
}

form.addEventListener("submit", e => {
  e.preventDefault();
  const description = descInput.value.trim();
  const selectedType = typeInput.value;
  const detectedType = detectGadgetType(description, selectedType);
  const gadget = GadgetDB.create({
    name: document.getElementById("gadgetName").value,
    type: detectedType,
    rarity: document.getElementById("gadgetRarity").value,
    uses: document.getElementById("gadgetUses").value,
    description,
    customEffect: effectLabels[detectedType]
  });
  GadgetDB.add(gadget);
  form.reset();
  document.getElementById("gadgetUses").value = 3;
  updatePreview();
  alert(`${gadget.name} added to pocket with effect: ${GadgetDB.typeLabel(gadget.type)}.`);
});

descInput.addEventListener("input", updatePreview);
typeInput.addEventListener("change", updatePreview);
renderSuggestions();
updatePreview();
