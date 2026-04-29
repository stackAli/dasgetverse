/* ============================================================
   DORAEMON GADGETVERSE — IMPROVED GAME ENGINE
   ============================================================ */

const canvas  = document.getElementById("gameCanvas");
const ctx     = canvas.getContext("2d");

const scoreEl      = document.getElementById("score");
const comicsEl     = document.getElementById("comics");
const livesEl      = document.getElementById("lives");
const powerEl      = document.getElementById("power");
const gameStateLabel = document.getElementById("gameStateLabel");
const startBtn     = document.getElementById("startGame");
const modal        = document.getElementById("pocketModal");
const openPocket   = document.getElementById("openPocket");
const closePocket  = document.getElementById("closePocket");
const pocketGrid   = document.getElementById("gamePocketGrid");

// ── State ──────────────────────────────────────────────────
let running = false, isPaused = false;
let gameState = "menu";
let frame = 0, score = 0, comics = 0, lives = 3;
let speed = 4.5, activePower = "None";
let invisible = false, keys = {};
let obstacles = [], comicItems = [], gadgetItems = [];
let particles = [], floatingTexts = [];
let combo = 0, comboTimer = 0;
let freezeTimer = 0, magnetTimer = 0;
let powerTimer = 0, powerMaxTimer = 0;
let difficultyLevel = 1;
let highScore = 0;
let newRecord = false;
let bgOffset = 0, bgOffset2 = 0;
let doubleJumped = false;
let shieldHits = 0;

// ── Player ─────────────────────────────────────────────────
const player = {
  x: 110, y: 365, w: 52, h: 72,
  vy: 0, vx: 0, ground: false,
  fly: false, shrink: false, grow: false
};

const GROUND = 460;

// ── Sprite ────────────────────────────────────────────────
const nobitaSprite = new Image();
nobitaSprite.crossOrigin = "anonymous";
nobitaSprite.src = window.NOBITA_SPRITE || "https://www.pngitem.com/pimgs/m/204-2047786_doraemon-png-nobita-transparent-png.png";

const doraSprite = new Image();
doraSprite.crossOrigin = "anonymous";
doraSprite.src = "https://www.transparentpng.com/thumb/doraemon/hhdcY4-png-cartoon-characters-doraemon-.png";

// ── Helpers ────────────────────────────────────────────────
function toast(message) {
  let el = document.querySelector(".toast");
  if (!el) { el = document.createElement("div"); el.className = "toast"; document.body.appendChild(el); }
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
}

function setGameState(state) {
  gameState = state;
  if (!gameStateLabel) return;
  const map = { menu:"Menu", playing:"Playing", paused:"Paused", gameover:"Game Over" };
  gameStateLabel.textContent = map[state] || state;
  // Update status dot
  const dot = document.querySelector(".status-dot");
  if (dot) {
    dot.className = "status-dot " + state;
  }
}

function updatePowerBar() {
  const fill = document.getElementById("powerTimerFill");
  if (!fill) return;
  fill.style.width = powerMaxTimer > 0 ? (powerTimer / powerMaxTimer * 100) + "%" : "0%";
}

function resetGame() {
  running = true; isPaused = false;
  setGameState("playing");
  frame = 0; score = 0; comics = 0; lives = 3; speed = 4.5;
  activePower = "None"; invisible = false; keys = {};
  obstacles = []; comicItems = []; gadgetItems = [];
  particles = []; floatingTexts = [];
  combo = 0; comboTimer = 0; freezeTimer = 0; magnetTimer = 0;
  powerTimer = 0; powerMaxTimer = 0;
  difficultyLevel = 1; newRecord = false; bgOffset = 0; bgOffset2 = 0;
  doubleJumped = false; shieldHits = 0;

  const saved = Store.scores();
  highScore = saved[0]?.score || 0;

  Object.assign(player, { x:110, y:365, w:52, h:72, vy:0, vx:0, ground:false, fly:false, shrink:false, grow:false });
  updateHud();
  requestAnimationFrame(loop);
}

function updateHud() {
  scoreEl.textContent = Math.floor(score);
  comicsEl.textContent = comics;
  livesEl.textContent = lives;
  powerEl.textContent = activePower;
  updatePowerBar();
}

// ── Pocket ─────────────────────────────────────────────────
function renderGamePocket() {
  const pocket = Store.pocket();
  if (!pocket.length) {
    pocketGrid.innerHTML = `<div class="empty-state"><h2>Pocket empty</h2><p class="muted">Collect gadgets in the game or create them in the Gadget Lab.</p></div>`;
    return;
  }
  pocketGrid.innerHTML = pocket.map(g => gadgetCardHTML(g, "game")).join("");
}

function openPocketModal() {
  if (!running || gameState === "gameover") { renderGamePocket(); modal.classList.remove("hidden"); return; }
  isPaused = true;
  setGameState("paused");
  renderGamePocket();
  modal.classList.remove("hidden");
}

function closePocketModal() {
  modal.classList.add("hidden");
  if (running && gameState !== "gameover") { isPaused = false; setGameState("playing"); }
}

// ── Collision ──────────────────────────────────────────────
function rects(a, b) {
  return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
}
function circleRect(c, r) {
  const cx = Math.max(r.x, Math.min(c.x, r.x+r.w));
  const cy = Math.max(r.y, Math.min(c.y, r.y+r.h));
  return (c.x-cx)**2 + (c.y-cy)**2 <= c.r**2;
}

// ── Spawning ───────────────────────────────────────────────
const OBSTACLE_TYPES = [
  { name:"Gian",    emoji:"👊", color:"#7c3aed", shadow:"rgba(124,58,237,0.5)",  w:58, h:78, pts:10 },
  { name:"Exam",    emoji:"📝", color:"#E60012", shadow:"rgba(230,0,18,0.5)",    w:54, h:60, pts:5  },
  { name:"Teacher", emoji:"👨‍🏫",color:"#f97316", shadow:"rgba(249,115,22,0.5)", w:58, h:72, pts:8  },
  { name:"Suneo",   emoji:"😏", color:"#0080c8", shadow:"rgba(0,128,200,0.5)",   w:52, h:68, pts:6  },
  { name:"Trap",    emoji:"⛔", color:"#334155", shadow:"rgba(51,65,85,0.5)",    w:76, h:40, pts:4  }
];

function spawnObstacle() {
  const o = OBSTACLE_TYPES[Math.floor(Math.random() * OBSTACLE_TYPES.length)];
  const y = (o.name === "Trap") ? GROUND - o.h : GROUND - o.h;
  obstacles.push({ ...o, x: canvas.width + 60, y });
}

function spawnComic() {
  comicItems.push({ x: canvas.width+40, y: 180+Math.random()*170, r:20, spin:0, bob:Math.random()*Math.PI*2 });
}

function spawnGadgetItem() {
  const sample = GadgetDB.samples[Math.floor(Math.random()*GadgetDB.samples.length)];
  gadgetItems.push({ x:canvas.width+40, y:160+Math.random()*180, r:24, pulse:0, gadget:sample });
}

// ── Particles ──────────────────────────────────────────────
function addParticles(x, y, color, count=14) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x, y,
      vx: (Math.random()-.5)*7,
      vy: (Math.random()-.9)*7,
      life: 35+Math.random()*22,
      maxLife: 57,
      size: 2.5+Math.random()*4,
      color
    });
  }
}

function addStarParticles(x, y, color, count=10) {
  for (let i = 0; i < count; i++) {
    const angle = (i/count)*Math.PI*2;
    particles.push({
      x, y,
      vx: Math.cos(angle)*5,
      vy: Math.sin(angle)*5,
      life: 40,
      maxLife: 40,
      size: 3+Math.random()*3,
      color,
      star: true
    });
  }
}

function addFloatingText(x, y, text, color="#fff") {
  floatingTexts.push({ x, y, text, color, life:62 });
}

function updateParticles() {
  particles.forEach(p => { p.x+=p.vx; p.y+=p.vy; p.vy+=0.13; p.life--; });
  particles = particles.filter(p => p.life > 0);
  floatingTexts.forEach(t => { t.y-=0.8; t.life--; });
  floatingTexts = floatingTexts.filter(t => t.life > 0);
}

// ── Movement ───────────────────────────────────────────────
function handleMovement() {
  player.vx = 0;
  if (keys.ArrowLeft  || keys.a) player.vx = -5.5;
  if (keys.ArrowRight || keys.d) player.vx =  5.5;

  player.x += player.vx;
  player.x = Math.max(30, Math.min(player.x, canvas.width - player.w - 30));

  if (player.fly) {
    if (keys.ArrowUp || keys.w || keys[" "]) player.vy -= 0.55;
    player.vy += 0.14;
  } else {
    player.vy += 0.8;
  }

  player.y += player.vy;

  if (player.y + player.h >= GROUND) {
    player.y = GROUND - player.h;
    player.vy = 0;
    player.ground = true;
    doubleJumped = false; // reset double jump when on ground
  } else {
    player.ground = false;
  }
}

function jump() {
  if (isPaused || !running) return;

  if (player.fly) {
    player.vy = -6.5;
    addParticles(player.x+player.w/2, player.y+player.h, "#FFD700", 8);
    return;
  }

  if (player.ground) {
    // First jump
    player.vy = -15.5;
    player.ground = false;
    doubleJumped = false;
    addParticles(player.x+player.w/2, player.y+player.h, "#00AEEF", 10);
  } else if (!doubleJumped) {
    // Double jump
    player.vy = -13;
    doubleJumped = true;
    addStarParticles(player.x+player.w/2, player.y+player.h/2, "#FFD700", 12);
    addFloatingText(player.x, player.y-20, "✨ Double!", "#FFD700");
    toast("Double jump!");
  }
}

// ── Update ─────────────────────────────────────────────────
function update() {
  frame++;
  bgOffset  = (bgOffset  + speed*0.5) % (canvas.width+200);
  bgOffset2 = (bgOffset2 + speed*0.2) % (canvas.width+200);

  // Difficulty ramp
  const newLevel = 1 + Math.floor(score / 800);
  if (newLevel > difficultyLevel) {
    difficultyLevel = newLevel;
    speed = Math.min(10, 4.5 + difficultyLevel*0.55);
    addFloatingText(canvas.width/2, 120, `Level ${difficultyLevel}!`, "#FFD700");
    toast(`🔥 Level ${difficultyLevel}!`);
  }

  score += speed * 0.14;

  if (comboTimer > 0) comboTimer--;
  if (freezeTimer > 0) freezeTimer--;
  if (magnetTimer > 0) magnetTimer--;
  if (comboTimer <= 0) combo = 0;
  if (powerTimer > 0) { powerTimer--; updatePowerBar(); }

  // Spawn rates tighten with difficulty
  const spawnRate = Math.max(55, 100 - difficultyLevel*5);
  if (frame % spawnRate === 0) spawnObstacle();
  if (frame % 72 === 0) spawnComic();
  if (frame % 200 === 0) spawnGadgetItem();

  handleMovement();

  // Move objects
  obstacles.forEach(o => { if (freezeTimer <= 0) o.x -= speed; });
  comicItems.forEach(c => {
    if (magnetTimer > 0) {
      c.x += ((player.x+player.w/2) - c.x)*0.06;
      c.y += ((player.y+player.h/2) - c.y)*0.06;
    } else {
      c.x -= speed;
    }
    c.spin += 0.09;
    c.bob  += 0.06;
  });
  gadgetItems.forEach(g => { g.x -= speed; g.pulse += 0.09; });

  // Cull off-screen
  obstacles  = obstacles.filter(o => o.x+o.w > -30);
  comicItems = comicItems.filter(c => c.x+c.r > -30);
  gadgetItems= gadgetItems.filter(g => g.x+g.r > -30);

  // Obstacle collisions
  for (let i = obstacles.length-1; i >= 0; i--) {
    const o = obstacles[i];
    if (!rects(player, o)) continue;

    if (player.grow) {
      addStarParticles(o.x+o.w/2, o.y+o.h/2, "#f97316", 16);
      addFloatingText(o.x, o.y-12, "+80 Break!", "#f97316");
      obstacles.splice(i,1);
      score += 80;
      continue;
    }
    if (invisible) {
      addParticles(o.x+o.w/2, o.y+o.h/2, "#8b5cf6", 10);
      obstacles.splice(i,1);
      continue;
    }

    lives--;
    addParticles(player.x+player.w/2, player.y+player.h/2, "#E60012", 20);
    addFloatingText(player.x+player.w/2, player.y-20, "-1 Life!", "#E60012");
    obstacles.splice(i,1);
    if (lives <= 0) { endGame(); return; }
  }

  // Comic collisions
  for (let i = comicItems.length-1; i >= 0; i--) {
    const c = comicItems[i];
    if (!circleRect(c, player)) continue;
    comics++;
    combo++;
    comboTimer = 140;
    const gained = 50 + combo*8;
    score += gained;
    comicItems.splice(i,1);
    Store.addStats({ comics:1 });
    addParticles(c.x, c.y, "#f97316", 18);
    addFloatingText(c.x-16, c.y-18, `+${gained}${combo>1?' x'+combo:''}`, "#f97316");
    if (combo >= 3) addStarParticles(c.x, c.y, "#FFD700", 8);
    toast(`📘 Comic ×${combo}!`);
  }

  // Gadget collisions
  for (let i = gadgetItems.length-1; i >= 0; i--) {
    const g = gadgetItems[i];
    if (!circleRect(g, player)) continue;
    const ng = GadgetDB.create(g.gadget);
    GadgetDB.add(ng);
    score += 80;
    gadgetItems.splice(i,1);
    addStarParticles(g.x, g.y, "#00AEEF", 20);
    addFloatingText(g.x-28, g.y-22, `+ ${ng.name}`, "#00AEEF");
    toast(`🎒 ${ng.name} added!`);
  }

  updateParticles();

  // High score check
  const stats = Store.stats();
  if (score > stats.score) {
    if (!newRecord && score > highScore && highScore > 0) {
      newRecord = true;
      addFloatingText(canvas.width/2, 80, "🏆 NEW RECORD!", "#FFD700");
      toast("🏆 New high score!");
    }
    Store.setStats({ ...stats, score: Math.floor(score) });
    Store.updateMissionProgress();
  }

  updateHud();
}

// ── DRAWING ────────────────────────────────────────────────

/* --- Background --- */
function drawBackground() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Sky gradient
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0,    "#87CEEB");
  sky.addColorStop(0.45, "#C5E8FF");
  sky.addColorStop(0.55, "#4CAF50");
  sky.addColorStop(1,    "#2E7D32");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Sun
  ctx.save();
  const sunX = 80, sunY = 60;
  const sunGrd = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 55);
  sunGrd.addColorStop(0, "rgba(255,235,100,0.95)");
  sunGrd.addColorStop(0.5, "rgba(255,200,60,0.5)");
  sunGrd.addColorStop(1, "rgba(255,200,60,0)");
  ctx.fillStyle = sunGrd;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 55, 0, Math.PI*2);
  ctx.fill();
  ctx.fillStyle = "#FFF176";
  ctx.beginPath();
  ctx.arc(sunX, sunY, 26, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();

  // Far clouds (slow parallax)
  ctx.fillStyle = "rgba(255,255,255,0.78)";
  for (let i = 0; i < 5; i++) {
    const x = ((i*240 - bgOffset2*0.35 + canvas.width*3) % (canvas.width+220)) - 110;
    const y = 42 + (i%3)*28;
    ctx.beginPath();
    ctx.arc(x+30, y, 22, 0, Math.PI*2);
    ctx.arc(x+65, y-8, 32, 0, Math.PI*2);
    ctx.arc(x+105, y, 22, 0, Math.PI*2);
    ctx.fill();
  }

  // Near clouds
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  for (let i = 0; i < 4; i++) {
    const x = ((i*320 - bgOffset*0.55 + canvas.width*3) % (canvas.width+320)) - 160;
    const y = 68 + (i%2)*20;
    ctx.beginPath();
    ctx.arc(x+25, y, 18, 0, Math.PI*2);
    ctx.arc(x+55, y-6, 28, 0, Math.PI*2);
    ctx.arc(x+90, y, 18, 0, Math.PI*2);
    ctx.fill();
  }

  // Distant buildings (parallax)
  ctx.fillStyle = "rgba(30,80,140,0.18)";
  for (let i = 0; i < 12; i++) {
    const x = ((i*110 - bgOffset*0.22 + canvas.width*3) % (canvas.width+110)) - 55;
    const h = 50 + (i%5)*20;
    ctx.fillRect(x, GROUND-h-5, 55, h);
    // windows
    ctx.fillStyle = "rgba(255,235,100,0.15)";
    for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) {
      ctx.fillRect(x+8+c*22, GROUND-h+8+r*14, 10, 8);
    }
    ctx.fillStyle = "rgba(30,80,140,0.18)";
  }

  // Mid buildings
  ctx.fillStyle = "rgba(20,60,120,0.25)";
  for (let i = 0; i < 9; i++) {
    const x = ((i*145 - bgOffset*0.45 + canvas.width*3) % (canvas.width+145)) - 72;
    const h = 38 + (i%4)*18;
    ctx.fillRect(x, GROUND-h-4, 70, h);
  }

  // Ground
  ctx.fillStyle = "#3d8b40";
  ctx.fillRect(0, GROUND, canvas.width, canvas.height-GROUND);
  ctx.fillStyle = "#4CAF50";
  ctx.fillRect(0, GROUND, canvas.width, 8);

  // Ground path
  ctx.fillStyle = "rgba(255,255,255,0.14)";
  for (let x = 0; x < canvas.width; x += 80) {
    const px = ((x - bgOffset*0.8 + canvas.width*10) % canvas.width);
    ctx.fillRect(px, GROUND+14, 45, 6);
  }
}

/* --- Draw styled obstacle --- */
function drawObstacle(o) {
  ctx.save();

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(o.x+o.w/2, GROUND+8, o.w*0.65, 9, 0, 0, Math.PI*2);
  ctx.fill();

  // Frozen overlay
  if (freezeTimer > 0) {
    ctx.fillStyle = "rgba(150,230,255,0.7)";
    roundRect(ctx, o.x-2, o.y-2, o.w+4, o.h+4, 13);
    ctx.fill();
  }

  // Body
  const bodyGrd = ctx.createLinearGradient(o.x, o.y, o.x, o.y+o.h);
  bodyGrd.addColorStop(0, lightenColor(o.color, 25));
  bodyGrd.addColorStop(1, o.color);
  ctx.fillStyle = bodyGrd;
  roundRect(ctx, o.x, o.y, o.w, o.h, 12);
  ctx.fill();

  // Inner shine
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  roundRect(ctx, o.x+4, o.y+4, o.w-8, o.h*0.4, 8);
  ctx.fill();

  // Emoji face
  ctx.font = `${Math.min(o.w-8, 32)}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(o.emoji, o.x+o.w/2, o.y+o.h/2);

  // Label above
  ctx.fillStyle = "#fff";
  ctx.shadowColor = o.color;
  ctx.shadowBlur = 6;
  ctx.font = "bold 12px 'Nunito', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText(o.name, o.x+o.w/2, o.y-4);
  ctx.shadowBlur = 0;

  ctx.restore();
}

/* --- Draw comic item --- */
function drawComic(c) {
  ctx.save();
  ctx.translate(c.x, c.y + Math.sin(c.bob)*5);
  ctx.rotate(Math.sin(c.spin)*0.15);

  // Glow
  const grd = ctx.createRadialGradient(0,0,0,0,0,c.r+10);
  grd.addColorStop(0, "rgba(255,165,0,0.3)");
  grd.addColorStop(1, "transparent");
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(0, 0, c.r+10, 0, Math.PI*2);
  ctx.fill();

  // Book body
  ctx.fillStyle = "#fff3e0";
  roundRect(ctx, -c.r+3, -c.r-5, c.r*2-6, c.r*2+8, 6);
  ctx.fill();
  ctx.strokeStyle = "#FF9800";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Book spine
  ctx.fillStyle = "#FF9800";
  ctx.fillRect(-c.r+3, -c.r-5, 5, c.r*2+8);

  // Lines
  ctx.strokeStyle = "rgba(0,0,0,0.15)";
  ctx.lineWidth = 1.5;
  for (let i = 1; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(-c.r+12, -c.r+i*8);
    ctx.lineTo(c.r-4, -c.r+i*8);
    ctx.stroke();
  }

  // Star
  ctx.fillStyle = "#E60012";
  ctx.font = "14px serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("📘", 3, 4);

  ctx.restore();
}

/* --- Draw gadget item --- */
function drawGadgetItem(g) {
  const pulse = Math.sin(g.pulse)*4;
  ctx.save();
  ctx.translate(g.x, g.y + Math.sin(g.pulse*0.7)*4);

  // Outer glow
  const grd = ctx.createRadialGradient(0,0,0,0,0,g.r+pulse+14);
  grd.addColorStop(0, "rgba(0,174,239,0.35)");
  grd.addColorStop(1, "transparent");
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(0, 0, g.r+pulse+14, 0, Math.PI*2);
  ctx.fill();

  // Body
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(0, 0, g.r+pulse, 0, Math.PI*2);
  ctx.fill();
  ctx.strokeStyle = "#00AEEF";
  ctx.lineWidth = 3;
  ctx.stroke();

  // Emoji
  ctx.font = `${(g.r+pulse)*0.95}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(GadgetDB.icon(g.gadget.type), 0, 1);

  // Label
  ctx.fillStyle = "#00AEEF";
  ctx.font = "bold 9px 'Nunito', sans-serif";
  ctx.fillText(g.gadget.name, 0, g.r+pulse+16);

  ctx.restore();
}

/* --- Draw player (Nobita) --- */
function drawPlayer() {
  ctx.save();
  ctx.globalAlpha = invisible ? 0.4 : 1;

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(player.x+player.w/2, GROUND+9, player.w*0.75, 10, 0, 0, Math.PI*2);
  ctx.fill();

  const bob = Math.sin(frame*0.18)*2;

  if (nobitaSprite.complete && nobitaSprite.naturalWidth > 0) {
    ctx.drawImage(nobitaSprite, player.x-18, player.y-42+bob, player.w+38, player.h+54);
  } else {
    // Fallback Nobita drawing
    ctx.fillStyle = "#fee2b7";
    ctx.beginPath();
    ctx.arc(player.x+player.w/2, player.y-12+bob, 22, 0, Math.PI*2);
    ctx.fill();
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#1d4ed8";
    roundRect(ctx, player.x, player.y+bob, player.w, player.h*0.5, 6);
    ctx.fill();
    ctx.fillStyle = "#facc15";
    ctx.fillRect(player.x+4, player.y+player.h*0.5+bob, player.w-8, player.h*0.42);
  }

  // Bamboo copter
  if (player.fly) {
    ctx.fillStyle = "#FFD700";
    roundRect(ctx, player.x, player.y-58+bob, player.w+10, 8, 4);
    ctx.fill();
    ctx.fillRect(player.x+player.w/2+2, player.y-52+bob, 5, 30);
    ctx.fillStyle = "rgba(255,215,0,0.25)";
    ctx.beginPath();
    ctx.arc(player.x+player.w/2+4, player.y+player.h/2+bob, 60, 0, Math.PI*2);
    ctx.fill();
  }

  // Power auras
  if (player.grow || player.shrink || invisible) {
    ctx.strokeStyle = player.grow ? "#f97316" : player.shrink ? "#38bdf8" : "#8b5cf6";
    ctx.lineWidth = 4;
    ctx.setLineDash([6,4]);
    ctx.beginPath();
    ctx.arc(player.x+player.w/2, player.y+player.h/2+bob, 54, 0, Math.PI*2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.restore();
}

/* --- Draw particles --- */
function drawParticles() {
  particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life/p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  });

  floatingTexts.forEach(t => {
    ctx.save();
    ctx.globalAlpha = Math.max(0, t.life/62);
    ctx.fillStyle = t.color;
    ctx.shadowColor = t.color;
    ctx.shadowBlur = 6;
    ctx.font = "bold 18px 'Fredoka One', 'Nunito', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(t.text, t.x, t.y);
    ctx.restore();
  });
}

/* --- HUD overlays on canvas --- */
function drawCanvasHUD() {
  if (!running) return;

  // Combo bar
  if (combo >= 2) {
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    roundRect(ctx, canvas.width-180, 14, 165, 36, 10);
    ctx.fill();
    ctx.fillStyle = "#FFD700";
    ctx.font = "bold 18px 'Fredoka One', 'Nunito', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`🔥 Combo ×${combo}`, canvas.width-97, 32);
    ctx.restore();
  }

  // Speed level
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  roundRect(ctx, 14, 14, 110, 30, 8);
  ctx.fill();
  ctx.fillStyle = "#00AEEF";
  ctx.font = "bold 13px 'Nunito', sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(`⚡ Lvl ${difficultyLevel}`, 22, 29);
  ctx.restore();

  // Freeze indicator
  if (freezeTimer > 0) {
    ctx.save();
    ctx.fillStyle = "rgba(56,189,248,0.2)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "rgba(56,189,248,0.8)";
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, canvas.width-4, canvas.height-4);
    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 16px 'Nunito', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("❄️ Enemies Frozen!", canvas.width/2, 8);
    ctx.restore();
  }

  // Magnet indicator
  if (magnetTimer > 0) {
    ctx.save();
    ctx.fillStyle = "#00AEEF";
    ctx.font = "bold 14px 'Nunito', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText("🧲 Magnet Active", canvas.width/2, GROUND-12);
    ctx.restore();
  }
}

/* --- Overlay screens --- */
function drawOverlay(title, subtitle, hint="") {
  ctx.fillStyle = "rgba(0,10,40,0.78)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Panel
  ctx.fillStyle = "rgba(0,60,140,0.55)";
  roundRect(ctx, canvas.width/2-270, 120, 540, 230, 24);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,174,239,0.5)";
  ctx.lineWidth = 2;
  roundRect(ctx, canvas.width/2-270, 120, 540, 230, 24);
  ctx.stroke();

  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.font = "bold 52px 'Fredoka One', 'Nunito', sans-serif";
  ctx.fillText(title, canvas.width/2, 210);
  ctx.fillStyle = "#9DCEF5";
  ctx.font = "22px 'Nunito', sans-serif";
  ctx.fillText(subtitle, canvas.width/2, 258);
  if (hint) {
    ctx.fillStyle = "#FFD700";
    ctx.font = "bold 16px 'Nunito', sans-serif";
    ctx.fillText(hint, canvas.width/2, 296);
  }
}

function drawPauseOverlay() {
  ctx.fillStyle = "rgba(0,10,40,0.6)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.font = "bold 50px 'Fredoka One', sans-serif";
  ctx.fillText("⏸ Paused", canvas.width/2, 230);
  ctx.fillStyle = "#9DCEF5";
  ctx.font = "20px 'Nunito', sans-serif";
  ctx.fillText("Select a gadget from Doraemon's pocket to continue.", canvas.width/2, 270);
}

/* --- Main draw --- */
function draw() {
  drawBackground();
  drawObjects();
  drawPlayer();
  drawParticles();
  drawCanvasHUD();
  if (isPaused) drawPauseOverlay();
}

function drawObjects() {
  obstacles.forEach(o  => drawObstacle(o));
  comicItems.forEach(c => drawComic(c));
  gadgetItems.forEach(g => drawGadgetItem(g));
}

/* --- Loop --- */
function loop() {
  if (!running) return;
  if (!isPaused) update();
  else updateParticles();
  draw();
  requestAnimationFrame(loop);
}

/* --- End game --- */
function endGame() {
  running = false; isPaused = false;
  setGameState("gameover");
  Store.saveScore(Math.floor(score), comics);
  draw();
  const rank = Store.scores().findIndex(s => s.score === Math.floor(score)) + 1;
  drawOverlay("Mission Failed", `Score: ${Math.floor(score)}  ·  Comics: ${comics}`, `Rank #${rank} saved to leaderboard`);
}

/* --- Helpers --- */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.moveTo(x+r, y);
    ctx.lineTo(x+w-r, y);
    ctx.quadraticCurveTo(x+w, y, x+w, y+r);
    ctx.lineTo(x+w, y+h-r);
    ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
    ctx.lineTo(x+r, y+h);
    ctx.quadraticCurveTo(x, y+h, x, y+h-r);
    ctx.lineTo(x, y+r);
    ctx.quadraticCurveTo(x, y, x+r, y);
    ctx.closePath();
  }
}

function lightenColor(hex, amount) {
  const n = parseInt(hex.replace('#',''), 16);
  const r = Math.min(255, (n>>16) + amount);
  const g = Math.min(255, ((n>>8)&0xFF) + amount);
  const b = Math.min(255, (n&0xFF) + amount);
  return `rgb(${r},${g},${b})`;
}

/* ── Gadget activation ──────────────────────────────────── */
window.gameUseGadget = function(id) {
  const gadget = GadgetDB.use(id);
  if (!gadget) return;
  closePocketModal();
  activePower = gadget.name;
  toast(`✨ ${gadget.name} activated!`);

  const DUR = 5500;

  if (gadget.type === "teleport") {
    player.x = Math.min(canvas.width - player.w - 60, player.x + 240);
    obstacles.forEach(o => o.x -= 130);
    score += 60;
    addStarParticles(player.x, player.y+player.h/2, "#00AEEF", 24);
    addFloatingText(player.x, player.y-24, "🚪 Teleport!", "#00AEEF");
    setTimeout(() => activePower="None", 1200);
  }
  if (gadget.type === "fly") {
    player.fly = true;
    addStarParticles(player.x+player.w/2, player.y, "#FFD700", 22);
    powerTimer = powerMaxTimer = Math.round(DUR/16.7);
    setTimeout(() => { player.fly = false; activePower="None"; powerTimer=0; updatePowerBar(); }, DUR);
  }
  if (gadget.type === "shrink") {
    player.shrink = true; player.w = 34; player.h = 46;
    addParticles(player.x+player.w/2, player.y+player.h/2, "#38bdf8", 20);
    powerTimer = powerMaxTimer = Math.round(DUR/16.7);
    setTimeout(() => { player.shrink=false; player.w=52; player.h=72; activePower="None"; powerTimer=0; }, DUR);
  }
  if (gadget.type === "grow") {
    player.grow = true; player.w = 74; player.h = 98;
    addStarParticles(player.x+player.w/2, player.y+player.h/2, "#f97316", 22);
    powerTimer = powerMaxTimer = Math.round(DUR/16.7);
    setTimeout(() => { player.grow=false; player.w=52; player.h=72; activePower="None"; powerTimer=0; }, DUR);
  }
  if (gadget.type === "slow") {
    const old = speed; speed = Math.max(2, speed-2.8);
    addParticles(canvas.width/2, canvas.height/2, "#8b5cf6", 30);
    addFloatingText(canvas.width/2, 140, "⏳ Time Slowed!", "#8b5cf6");
    powerTimer = powerMaxTimer = Math.round(DUR/16.7);
    setTimeout(() => { speed=old; activePower="None"; powerTimer=0; }, DUR);
  }
  if (gadget.type === "blast") {
    const target = obstacles.shift();
    if (target) addStarParticles(target.x+target.w/2, target.y+target.h/2, "#E60012", 26);
    score += 90;
    addFloatingText(player.x, player.y-22, "+90 Blast!", "#E60012");
    setTimeout(() => activePower="None", 1000);
  }
  if (gadget.type === "invisible") {
    invisible = true;
    addParticles(player.x+player.w/2, player.y+player.h/2, "#8b5cf6", 22);
    addFloatingText(player.x, player.y-20, "👻 Invisible!", "#8b5cf6");
    powerTimer = powerMaxTimer = Math.round(5000/16.7);
    setTimeout(() => { invisible=false; activePower="None"; powerTimer=0; }, 5000);
  }
  if (gadget.type === "magnet") {
    magnetTimer = 540;
    addStarParticles(player.x+player.w/2, player.y+player.h/2, "#00AEEF", 22);
    addFloatingText(player.x, player.y-20, "🧲 Magnet!", "#00AEEF");
    setTimeout(() => activePower="None", 6800);
  }
  if (gadget.type === "heal") {
    lives = Math.min(6, lives+1);
    score += 50;
    addStarParticles(player.x+player.w/2, player.y+player.h/2, "#22c55e", 22);
    addFloatingText(player.x+player.w/2, player.y-22, "+1 Life ❤️", "#22c55e");
    setTimeout(() => activePower="None", 1200);
  }
  if (gadget.type === "freeze") {
    freezeTimer = 400;
    addStarParticles(canvas.width/2, canvas.height/2, "#38bdf8", 32);
    addFloatingText(canvas.width/2, 140, "❄️ Freeze!", "#38bdf8");
    powerTimer = powerMaxTimer = Math.round(5500/16.7);
    setTimeout(() => { activePower="None"; powerTimer=0; }, 5500);
  }
  if (gadget.type === "bonus") {
    score += 200;
    addStarParticles(player.x+player.w/2, player.y, "#FFD700", 26);
    addFloatingText(player.x+player.w/2, player.y-22, "+200 Bonus! 🍞", "#FFD700");
    setTimeout(() => activePower="None", 900);
  }

  updateHud();
};

/* ── Input ─────────────────────────────────────────────── */
document.addEventListener("keydown", e => {
  if (e.key.toLowerCase() === "p") { openPocketModal(); return; }
  if (isPaused) return;
  keys[e.key] = true;
  if (e.code === "Space" || e.key === "ArrowUp" || e.key === "w") {
    e.preventDefault();
    jump();
  }
});
document.addEventListener("keyup", e => { keys[e.key] = false; });

// Touch controls
document.addEventListener("DOMContentLoaded", () => {
  const leftBtn  = document.getElementById("touchLeft");
  const rightBtn = document.getElementById("touchRight");
  const jumpBtn  = document.getElementById("touchJump");
  const pocketBtn= document.getElementById("touchPocket");

  if (leftBtn)  { leftBtn.addEventListener("touchstart",  e=>{ e.preventDefault(); keys.a=true;  },{passive:false}); leftBtn.addEventListener("touchend",   ()=>keys.a=false); }
  if (rightBtn) { rightBtn.addEventListener("touchstart", e=>{ e.preventDefault(); keys.d=true;  },{passive:false}); rightBtn.addEventListener("touchend",  ()=>keys.d=false); }
  if (jumpBtn)  { jumpBtn.addEventListener("touchstart",  e=>{ e.preventDefault(); jump();       },{passive:false}); }
  if (pocketBtn){ pocketBtn.addEventListener("click", openPocketModal); }
});

startBtn.addEventListener("click", resetGame);
openPocket.addEventListener("click", openPocketModal);
closePocket.addEventListener("click", closePocketModal);

// Initial screen
setGameState("menu");
draw();
drawOverlay("Nobita's Rescue Mission", "Collect comics · Dodge enemies · Use gadgets", "Click 'Start' or press any key");
