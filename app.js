"use strict";

/* =========================================================
   CROWN QUEST — APP.JS
   Shop, crates, collectie, markt, battlepass en levels.
   Voortgang wordt opgeslagen in localStorage.
   ========================================================= */

const DBKEY = "crownQuestMultiPage_v1";
const SHOWCASE_KEY = "crownQuestShowcase";
const LEADERBOARD_KEY = "crownQuestLeaderboard";

const LEVELS_PER_WORLD = 21;
const BATTLEPASS_TIERS = 10;
const XP_PER_TIER = 100;

/* =========================================================
   1. STANDAARD SPELGEGEVENS
   ========================================================= */

const defaultState = {
  coins: 500,
  unlocked: 1,
  currentLevel: 1,
  xp: 0,
  wins: 0,
  claimed: [],
  pets: [
    {
      id: "starter-fox",
      name: "Forest Fox",
      emoji: "🦊",
      rarity: "common",
      desc: "Your loyal first adventurer."
    }
  ],
  listings: [],
  completed: [],
  playerName: "Player"
};

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(DBKEY) || "{}");

    if (!saved || typeof saved !== "object" || Array.isArray(saved)) {
      return structuredClone(defaultState);
    }

    const state = {
      ...structuredClone(defaultState),
      ...saved
    };

    if (!Array.isArray(state.pets) || state.pets.length === 0) {
      state.pets = [structuredClone(defaultState.pets[0])];
    }

    ["claimed", "listings", "completed", "pets"].forEach(key => {
      if (!Array.isArray(state[key])) {
        state[key] = [];
      }
    });

    state.coins = Math.max(0, Math.floor(Number(state.coins) || 0));
    state.xp = Math.max(0, Math.floor(Number(state.xp) || 0));
    state.wins = Math.max(0, Math.floor(Number(state.wins) || 0));
    state.unlocked = Math.max(1, Math.floor(Number(state.unlocked) || 1));
    state.currentLevel = Math.max(
      1,
      Math.floor(Number(state.currentLevel) || 1)
    );

    if (typeof state.playerName !== "string") {
      state.playerName = "Player";
    }

    return state;
  } catch (error) {
    console.error("Could not load Crown Quest:", error);
    return structuredClone(defaultState);
  }
}

let gameState = loadState();

/* =========================================================
   2. WERELDEN
   Elke wereld heeft 20 gewone levels en 1 eindbaas.
   ========================================================= */

const worldData = [
  {
    name: "Emerald Jungle",
    icon: "🌿",
    boss: "Forest Guardian",
    bossEmoji: "🌳"
  },
  {
    name: "Crystal Forest",
    icon: "💎",
    boss: "Crystal Golem",
    bossEmoji: "🗿"
  },
  {
    name: "Lava Kingdom",
    icon: "🌋",
    boss: "Inferno Dragon",
    bossEmoji: "🐉"
  },
  {
    name: "Cloud Kingdom",
    icon: "☁️",
    boss: "Sky Titan",
    bossEmoji: "⚡"
  },
  {
    name: "Moon Valley",
    icon: "🌙",
    boss: "Moon Phantom",
    bossEmoji: "👻"
  },
  {
    name: "Frozen Peaks",
    icon: "❄️",
    boss: "Frost King",
    bossEmoji: "🥶"
  },
  {
    name: "Mushroom Wilds",
    icon: "🍄",
    boss: "Mushroom Beast",
    bossEmoji: "🍄"
  },
  {
    name: "Thunder Mountains",
    icon: "⚡",
    boss: "Thunder Lord",
    bossEmoji: "🌩️"
  },
  {
    name: "Starfall Realm",
    icon: "🌌",
    boss: "Star Destroyer",
    bossEmoji: "☄️"
  },
  {
    name: "Crown Palace",
    icon: "👑",
    boss: "The Crown Emperor",
    bossEmoji: "👑"
  }
];

function getWorldNumber(level) {
  return Math.floor((Math.max(1, level) - 1) / LEVELS_PER_WORLD) + 1;
}

function getLevelInWorld(level) {
  return ((Math.max(1, level) - 1) % LEVELS_PER_WORLD) + 1;
}

function getWorldInfo(level) {
  const worldNumber = getWorldNumber(level);

  return worldData[(worldNumber - 1) % worldData.length];
}

function isBossLevel(level) {
  return getLevelInWorld(level) === LEVELS_PER_WORLD;
}

function getBossInfo(level) {
  const world = getWorldInfo(level);

  return {
    name: world.boss,
    emoji: world.bossEmoji
  };
}

/* =========================================================
   3. OPSLAAN EN MELDINGEN
   ========================================================= */

function saveState() {
  try {
    localStorage.setItem(DBKEY, JSON.stringify(gameState));
  } catch (error) {
    console.error("Could not save Crown Quest:", error);
    notify("Je voortgang kon niet worden opgeslagen.");
  }

  updateSharedUI();
}

function notify(message) {
  let element = document.getElementById("toast");

  if (!element) {
    element = document.createElement("div");
    element.id = "toast";
    element.className = "toast";
    document.body.appendChild(element);
  }

  element.textContent = message;
  element.classList.add("show");

  clearTimeout(window.toastTimer);

  window.toastTimer = setTimeout(() => {
    element.classList.remove("show");
  }, 2600);
}

function escapeText(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

/* =========================================================
   4. ALGEMENE SPELFUNCTIES
   ========================================================= */

function updateSharedUI() {
  document.querySelectorAll("[data-coins]").forEach(element => {
    element.textContent = gameState.coins;
  });

  document.querySelectorAll("[data-pet-count]").forEach(element => {
    element.textContent = gameState.pets.length;
  });

  document.querySelectorAll("[data-unlocked]").forEach(element => {
    element.textContent = gameState.unlocked;
  });

  document.querySelectorAll("[data-player-name]").forEach(element => {
    element.textContent = gameState.playerName;
  });

  const showcaseEmoji = getShowcasePet()?.emoji || "🦊";

  document.querySelectorAll("[data-showcase]").forEach(element => {
    element.textContent = showcaseEmoji;
  });

  const winsElement = document.getElementById("wins");

  if (winsElement) {
    winsElement.textContent = gameState.wins;
  }

  const nameInput = document.getElementById("playerName");

  if (nameInput && document.activeElement !== nameInput) {
    nameInput.value = gameState.playerName;
  }
}

function getShowcasePet() {
  const savedEmoji = localStorage.getItem(SHOWCASE_KEY);

  if (savedEmoji) {
    const found = gameState.pets.find(pet => pet.emoji === savedEmoji);

    if (found) return found;
  }

  return gameState.pets[0] || null;
}

function setPlayerName() {
  const input = document.getElementById("playerName");

  if (!input) return;

  const name = input.value.trim().slice(0, 18);

  if (!name) {
    notify("Vul eerst een spelersnaam in.");
    return;
  }

  gameState.playerName = name;

  saveState();
  updateLeaderboard();

  notify("Spelersnaam opgeslagen!");
}

function addCrowns(amount) {
  amount = Math.floor(Number(amount));

  if (!Number.isFinite(amount) || amount <= 0) return;

  gameState.coins += amount;

  saveState();
}

function spendCrowns(amount) {
  amount = Math.floor(Number(amount));

  if (!Number.isFinite(amount) || amount <= 0) {
    notify("Ongeldig bedrag.");
    return false;
  }

  if (gameState.coins < amount) {
    notify("Je hebt niet genoeg Crowns!");
    return false;
  }

  gameState.coins -= amount;

  saveState();

  return true;
}

function addXP(amount) {
  amount = Math.floor(Number(amount));

  if (!Number.isFinite(amount) || amount <= 0) return;

  gameState.xp += amount;

  saveState();

  notify("+" + amount + " XP verdiend!");
}

function pickWeighted(pool) {
  const totalWeight = pool.reduce((sum, item) => {
    return sum + item.weight;
  }, 0);

  let number = Math.random() * totalWeight;

  for (const item of pool) {
    number -= item.weight;

    if (number < 0) {
      return item;
    }
  }

  return pool[pool.length - 1];
}

function addPet(petData) {
  const pet = {
    ...petData,
    id:
      String(petData.name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
      + "-" + Date.now()
      + "-" + Math.floor(Math.random() * 999999)
  };

  delete pet.weight;

  gameState.pets.push(pet);

  return pet;
}

/* =========================================================
   5. CRATES EN PETS
   ========================================================= */

const turtlePool = [
  {
    name: "Crimson Shellguard",
    emoji: "🥷",
    rarity: "legendary",
    weight: 4,
    desc: "A fearless guardian with a crimson bandana."
  },
  {
    name: "Azure Wave Ninja",
    emoji: "🐢",
    rarity: "epic",
    weight: 10,
    desc: "A swift defender trained by the ocean."
  },
  {
    name: "Violet Tech Ranger",
    emoji: "🤖",
    rarity: "epic",
    weight: 16,
    desc: "A clever hero powered by crystal tech."
  },
  {
    name: "Amber Street Scout",
    emoji: "🦊",
    rarity: "rare",
    weight: 25,
    desc: "A fast scout with clever moves."
  },
  {
    name: "Mossy Shell Rookie",
    emoji: "🐸",
    rarity: "common",
    weight: 45,
    desc: "A cheerful new adventurer."
  }
];

const miniPool = [
  {
    name: "Star Kitten",
    emoji: "🐱",
    rarity: "common",
    weight: 55,
    desc: "A tiny cat with a huge dream."
  },
  {
    name: "Slime Spirit",
    emoji: "👻",
    rarity: "rare",
    weight: 30,
    desc: "A bouncy little ghost friend."
  },
  {
    name: "Crystal Owl",
    emoji: "🦉",
    rarity: "epic",
    weight: 15,
    desc: "A wise owl with shining feathers."
  }
];

function buyCrate(type) {
  const crateType = type === "turtle" ? "turtle" : "mini";
  const cost = crateType === "turtle" ? 150 : 75;
  const pool = crateType === "turtle" ? turtlePool : miniPool;

  const button = document.getElementById("spinCrateButton");
  const wheel = document.getElementById("crateWheel");
  const resultElement = document.getElementById("crateResult");

  if (button?.disabled) return;

  if (gameState.coins < cost) {
    notify("Je hebt niet genoeg Crowns!");
    return;
  }

  if (!spendCrowns(cost)) return;

  const reward = pickWeighted(pool);

  if (button) {
    button.disabled = true;
  }

  if (resultElement) {
    resultElement.innerHTML = "<p>Je crate wordt geopend...</p>";
  }

  if (wheel) {
    wheel.style.transform = "rotate(0deg)";
    void wheel.offsetWidth;

    const index = pool.indexOf(reward);
    const segment = 360 / pool.length;
    const rotation =
      360 * 6 + (360 - (index * segment + segment / 2));

    wheel.style.transform = `rotate(${rotation}deg)`;
  }

  const delay = wheel ? 4300 : 100;

  setTimeout(() => {
    const pet = addPet(reward);

    saveState();

    if (resultElement) {
      resultElement.innerHTML = `
        <div class="art">${escapeText(pet.emoji)}</div>
        <h3>Je hebt ${escapeText(pet.name)} gekregen!</h3>
        <span class="badge ${escapeText(pet.rarity)}">
          ${escapeText(pet.rarity)}
        </span>
        <p>${escapeText(pet.desc)}</p>
      `;
    }

    notify("Nieuw poppetje: " + pet.name + "!");

    document.dispatchEvent(
      new CustomEvent("crownquest:crate-opened", {
        detail: { pet }
      })
    );

    if (button) {
      button.disabled = false;
    }

    renderPage();
  }, delay);
}

/* =========================================================
   6. COLLECTIE EN SHOWCASE
   ========================================================= */

function selectShowcase(id) {
  const pet = gameState.pets.find(item => item.id === id);

  if (!pet) {
    notify("Dit poppetje staat niet in je collectie.");
    return;
  }

  localStorage.setItem(SHOWCASE_KEY, pet.emoji);

  updateSharedUI();

  notify(pet.name + " is nu je showcase!");
}

function renderCollection() {
  const grid = document.getElementById("collectionGrid");

  const count = document.getElementById("petCount");

  if (count) {
    count.textContent =
      gameState.pets.length
      + (gameState.pets.length === 1 ? " poppetje" : " poppetjes");
  }

  if (!grid) return;

  if (gameState.pets.length === 0) {
    grid.innerHTML = `
      <div class="panel item">
        <h3>Je collectie is leeg</h3>
        <p>Ga naar de Shop om je eerste poppetjes te verzamelen.</p>
        <a class="button" href="shop.html">Open de Shop</a>
      </div>
    `;

    return;
  }

  const showcase = getShowcasePet();

  grid.innerHTML = gameState.pets.map(pet => {
    const isShowcase = showcase && showcase.id === pet.id;

    return `
      <article class="panel item">
        <div class="art">${escapeText(pet.emoji)}</div>

        <span class="badge ${escapeText(pet.rarity)}">
          ${escapeText(pet.rarity)}
        </span>

        <h3>${escapeText(pet.name)}</h3>

        <p>${escapeText(pet.desc || "A collectible adventurer.")}</p>

        <div class="item-foot">
          <span class="small">
            ${isShowcase ? "⭐ Showcase" : "In collectie"}
          </span>

          <button
            type="button"
            class="secondary"
            onclick="selectShowcase('${escapeText(pet.id)}')">
            ${isShowcase ? "Geselecteerd" : "Showcase"}
          </button>
        </div>
      </article>
    `;
  }).join("");
}

/* =========================================================
   7. MARKT EN HANDEL
   ========================================================= */

function listPet() {
  const select = document.getElementById("sellPet");
  const priceInput = document.getElementById("sellPrice");

  if (!select || !priceInput) {
    notify("Het verkoopformulier kon niet worden gevonden.");
    return;
  }

  const id = select.value;
  const price = Math.floor(Number(priceInput.value));

  const pet = gameState.pets.find(item => item.id === id);

  if (!pet) {
    notify("Kies eerst een poppetje.");
    return;
  }

  if (pet.id === "starter-fox") {
    notify("Je startpoppetje kan niet worden verkocht.");
    return;
  }

  if (!Number.isFinite(price) || price < 1 || price > 10000) {
    notify("Kies een prijs tussen 1 en 10.000 Crowns.");
    return;
  }

  gameState.pets = gameState.pets.filter(item => item.id !== id);

  gameState.listings.push({
    id: "listing-" + Date.now() + "-" + Math.floor(Math.random() * 99999),
    pet,
    price,
    seller: gameState.playerName
  });

  saveState();

  renderPage();

  notify(pet.name + " staat nu te koop!");
}

function buyListing(id) {
  const listing = gameState.listings.find(item => item.id === id);

  if (!listing) {
    notify("Deze aanbieding bestaat niet meer.");
    return;
  }

  if (gameState.pets.some(pet => pet.id === listing.pet.id)) {
    notify("Je bezit dit poppetje al.");
    return;
  }

  if (!spendCrowns(listing.price)) {
    return;
  }

  const purchasedPet = {
    ...listing.pet,
    id: listing.pet.id + "-buy-" + Date.now()
  };

  gameState.pets.push(purchasedPet);

  gameState.listings = gameState.listings.filter(
    item => item.id !== id
  );

  saveState();

  renderPage();

  notify("Je hebt " + purchasedPet.name + " gekocht!");
}

function renderMarket() {
  const rows = document.getElementById("marketRows");

  if (rows) {
    if (!gameState.listings.length) {
      rows.innerHTML = `
        <div class="empty">
          De markt is nog leeg. Bied hieronder een poppetje aan!
        </div>
      `;
    } else {
      rows.innerHTML = gameState.listings.map(listing => `
        <div class="row">
          <div class="rowicon">
            ${escapeText(listing.pet.emoji)}
          </div>

          <div class="rowinfo">
            <b>${escapeText(listing.pet.name)}</b>
            <p>
              <span class="badge ${escapeText(listing.pet.rarity)}">
                ${escapeText(listing.pet.rarity)}
              </span>
              · Verkoper: ${escapeText(listing.seller || "Player")}
            </p>
          </div>

          <b class="gold">👑 ${listing.price}</b>

          <button
            type="button"
            onclick="buyListing('${escapeText(listing.id)}')">
            Kopen
          </button>
        </div>
      `).join("");
    }
  }

  // BELANGRIJK:
  // Vul het verkoopmenu ook wanneer de markt nog leeg is.
  const select = document.getElementById("sellPet");

  if (!select) return;

  const previousValue = select.value;

  const sellablePets = gameState.pets.filter(
    pet => pet.id !== "starter-fox"
  );

  select.innerHTML = "";

  if (sellablePets.length === 0) {
    select.innerHTML = `
      <option value="">Geen verkoopbare poppetjes</option>
    `;
    return;
  }

  sellablePets.forEach(pet => {
    const option = document.createElement("option");

    option.value = pet.id;
    option.textContent = `${pet.emoji} ${pet.name}`;

    select.appendChild(option);
  });

  if (sellablePets.some(pet => pet.id === previousValue)) {
    select.value = previousValue;
  }
}

/* =========================================================
   8. BATTLEPASS
   10 tiers; iedere tier kost 100 XP.
   ========================================================= */

const battlepassRewards = {
  1: {
    icon: "🪙",
    name: "25 Crowns",
    coins: 25
  },
  2: {
    icon: "🐸",
    name: "Frog Buddy",
    pet: {
      name: "Frog Buddy",
      emoji: "🐸",
      rarity: "common"
    }
  },
  3: {
    icon: "🪙",
    name: "50 Crowns",
    coins: 50
  },
  4: {
    icon: "🦉",
    name: "Crystal Owl",
    pet: {
      name: "Crystal Owl",
      emoji: "🦉",
      rarity: "epic"
    }
  },
  5: {
    icon: "📦",
    name: "Mini Crate",
    crate: "mini"
  },
  6: {
    icon: "🐲",
    name: "Tiny Dragon",
    pet: {
      name: "Tiny Dragon",
      emoji: "🐲",
      rarity: "rare"
    }
  },
  7: {
    icon: "🪙",
    name: "100 Crowns",
    coins: 100
  },
  8: {
    icon: "🦄",
    name: "Star Unicorn",
    pet: {
      name: "Star Unicorn",
      emoji: "🦄",
      rarity: "epic"
    }
  },
  9: {
    icon: "📦",
    name: "Turtle Crate",
    crate: "turtle"
  },
  10: {
    icon: "👑",
    name: "Crown Keeper",
    pet: {
      name: "Crown Keeper",
      emoji: "👑",
      rarity: "legendary"
    }
  }
};

function getBattlepassLevel() {
  return Math.min(
    BATTLEPASS_TIERS,
    Math.floor(gameState.xp / XP_PER_TIER) + 1
  );
}

function claimReward(tier) {
  tier = Math.floor(Number(tier));

  if (!Number.isInteger(tier) || tier < 1 || tier > BATTLEPASS_TIERS) {
    notify("Ongeldige Battlepass-tier.");
    return;
  }

  if (gameState.claimed.includes(tier)) {
    notify("Je hebt deze beloning al geclaimd.");
    return;
  }

  // Tier 1 vraagt 100 XP, tier 2 vraagt 200 XP enzovoort.
  const requiredXP = tier * XP_PER_TIER;

  if (gameState.xp < requiredXP) {
    notify("Je hebt meer XP nodig voor deze beloning.");
    return;
  }

  const reward = battlepassRewards[tier];

  if (!reward) return;

  if (reward.coins) {
    gameState.coins += reward.coins;
  }

  if (reward.pet) {
    addPet({
      ...reward.pet,
      desc: "A reward from the Crown Quest Battlepass."
    });
  }

  if (reward.crate) {
    const pool = reward.crate === "turtle" ? turtlePool : miniPool;
    const pet = pickWeighted(pool);

    addPet({
      ...pet,
      desc: pet.desc + " Obtained from the Battlepass."
    });
  }

  gameState.claimed.push(tier);

  saveState();

  renderPage();

  notify("Battlepass-beloning geclaimd: " + reward.name + "!");
}

function renderBattlepass() {
  const grid = document.getElementById("passGrid");

  if (!grid) return;

  const levelElement = document.getElementById("bpLevel");
  const xpElement = document.getElementById("bpXp");
  const bar = document.getElementById("bpBar");

  const currentLevel = getBattlepassLevel();

  // XP binnen de huidige tier.
  // Op het maximale level is de Battlepass voltooid.
  const xpInTier = gameState.xp >= BATTLEPASS_TIERS * XP_PER_TIER
    ? XP_PER_TIER
    : gameState.xp % XP_PER_TIER;

  if (levelElement) {
    levelElement.textContent = currentLevel;
  }

  if (xpElement) {
    xpElement.textContent =
      gameState.xp >= BATTLEPASS_TIERS * XP_PER_TIER
        ? "Battlepass voltooid!"
        : xpInTier + " / " + XP_PER_TIER;
  }

  if (bar) {
    const percentage = gameState.xp >= BATTLEPASS_TIERS * XP_PER_TIER
      ? 100
      : xpInTier;

    bar.style.width = percentage + "%";
  }

  const tiers = [];

  for (let tier = 1; tier <= BATTLEPASS_TIERS; tier++) {
    const reward = battlepassRewards[tier];
    const ready = gameState.xp >= tier * XP_PER_TIER;
    const claimed = gameState.claimed.includes(tier);

    tiers.push(`
      <article class="panel item">
        <div class="art">${reward.icon}</div>

        <span class="badge ${tier >= 8 ? "epic" : "common"}">
          Tier ${tier}
        </span>

        <h3>${escapeText(reward.name)}</h3>

        <p>
          ${
            claimed
              ? "Beloning opgehaald!"
              : ready
                ? "Je kunt deze beloning ophalen."
                : "Vereist: " + (tier * XP_PER_TIER) + " XP"
          }
        </p>

        <button
          type="button"
          ${!ready || claimed ? "disabled" : ""}
          onclick="claimReward(${tier})">
          ${
            claimed
              ? "Geclaimd ✓"
              : ready
                ? "Claim beloning"
                : "Vergrendeld 🔒"
          }
        </button>
      </article>
    `);
  }

  grid.innerHTML = tiers.join("");
}

/* =========================================================
   9. LEVELKAART EN EINDBAZEN
   ========================================================= */

function renderLevels() {
  const map = document.getElementById("levelMap");

  if (!map) return;

  const worldNumber = getWorldNumber(gameState.currentLevel);
  const world = getWorldInfo(gameState.currentLevel);

  const firstLevel = (worldNumber - 1) * LEVELS_PER_WORLD + 1;

  let html = `
    <div class="world-heading">
      <h3>${world.icon} ${escapeText(world.name)}</h3>
      <p>Wereld ${worldNumber} · 20 levels en 1 eindbaas</p>
    </div>
  `;

  for (let index = 0; index < LEVELS_PER_WORLD; index++) {
    const number = firstLevel + index;
    const localLevel = index + 1;

    const locked = number > gameState.unlocked;
    const completed = gameState.completed.includes(number);
    const boss = localLevel === LEVELS_PER_WORLD;

    let label = "LEVEL " + localLevel;

    if (boss) label = "EINDBAAS";
    if (completed) label = boss ? "BAAS VERSLAGEN" : "VOLTOOID";

    html += `
      <button
        type="button"
        class="leveltile
          ${number === gameState.currentLevel ? "current" : ""}
          ${locked ? "locked" : ""}
          ${completed ? "completed" : ""}
          ${boss ? "boss" : ""}"
        ${locked ? "disabled" : `onclick="selectLevel(${number})"`}>

        <b>
          ${locked ? "🔒" : boss ? "👑" : completed ? "★" : localLevel}
        </b>

        <span>${label}</span>
      </button>
    `;
  }

  if (isBossLevel(gameState.currentLevel)) {
    const boss = getBossInfo(gameState.currentLevel);

    html += `
      <div class="panel item">
        <h3>${boss.emoji} Eindbaas: ${escapeText(boss.name)}</h3>
        <p>Versla deze eindbaas om de volgende wereld vrij te spelen.</p>
      </div>
    `;
  }

  map.innerHTML = html;

  const label = document.getElementById("levelLabel");

  if (label) {
    label.textContent =
      `Wereld ${worldNumber} · Level ${getLevelInWorld(gameState.currentLevel)}`;
  }

  const worldName = document.getElementById("worldName");

  if (worldName) {
    worldName.textContent =
      `${world.icon} ${world.name}` +
      (isBossLevel(gameState.currentLevel) ? " — EINDBAAS" : "");
  }
}

function selectLevel(number) {
  number = Math.floor(Number(number));

  if (!Number.isInteger(number) || number < 1) return;

  if (number > gameState.unlocked) {
    notify("Voltooi eerst het vorige level!");
    return;
  }

  gameState.currentLevel = number;

  saveState();

  renderLevels();

  // De game.js moet deze functie beschikbaar maken.
  if (typeof window.startLevel === "function") {
    window.startLevel();
  }
}

/* =========================================================
   10. LEVEL VOLTOOIEN EN BELOONNINGEN
   ========================================================= */

function completeLevel(levelNumber, collectedCoins = 0) {
  const level = Math.floor(Number(levelNumber || gameState.currentLevel));
  const coinsCollected = Math.max(0, Math.floor(Number(collectedCoins) || 0));

  if (!Number.isInteger(level) || level < 1) return;

  // Voorkom dat je zomaar niet-vrijgespeelde levels voltooit.
  if (level > gameState.unlocked) {
    notify("Dit level is nog niet vrijgespeeld.");
    return;
  }

  const alreadyCompleted = gameState.completed.includes(level);

  if (alreadyCompleted) {
    gameState.coins += coinsCollected;

    saveState();

    notify("Level opnieuw gespeeld!");

    renderPage();

    return;
  }

  gameState.completed.push(level);
  gameState.wins += 1;
  gameState.xp += 100;
  gameState.coins += 50 + coinsCollected;

  // Vrijspelen gaat door tot het volgende level.
  // Level 22 wordt dus pas vrijgespeeld na voltooiing van level 21.
  gameState.unlocked = Math.max(gameState.unlocked, level + 1);

  // Zet het volgende level klaar als dat beschikbaar is.
  gameState.currentLevel = Math.min(
    gameState.unlocked,
    level + 1
  );

  saveState();

  updateLeaderboard();

  const bossMessage = isBossLevel(level)
    ? " Eindbaas verslagen! De volgende wereld is vrijgespeeld."
    : "";

  notify("Level voltooid! +50 Crowns en +100 XP!" + bossMessage);

  renderPage();
}

/* =========================================================
   11. LOKALE LEADERBOARD
   ========================================================= */

function updateLeaderboard() {
  let board = [];

  try {
    board = JSON.parse(localStorage.getItem(LEADERBOARD_KEY) || "[]");

    if (!Array.isArray(board)) {
      board = [];
    }
  } catch {
    board = [];
  }

  board = board.filter(entry => {
    return entry && entry.name !== gameState.playerName;
  });

  board.push({
    name: gameState.playerName,
    coins: gameState.coins,
    level: gameState.unlocked,
    wins: gameState.wins
  });

  board.sort((a, b) => {
    return (b.coins || 0) - (a.coins || 0);
  });

  board = board.slice(0, 20);

  try {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(board));
  } catch (error) {
    console.error("Could not save leaderboard:", error);
  }

  const list = document.getElementById("leaderboardCoins");

  if (list) {
    if (!board.length) {
      list.innerHTML = "<p>Nog geen spelers op het leaderboard.</p>";
      return;
    }

    list.innerHTML = board.slice(0, 10).map((entry, index) => `
      <div class="row">
        <div class="rowicon">#${index + 1}</div>

        <div class="rowinfo">
          <b>${escapeText(entry.name)}</b>
          <p>Vrijgespeeld level: ${entry.level} · Wins: ${entry.wins}</p>
        </div>

        <b class="gold">👑 ${entry.coins}</b>
      </div>
    `).join("");
  }
}

/* =========================================================
   12. ALLE PAGINA'S BIJWERKEN
   ========================================================= */

function renderPage() {
  updateSharedUI();
  renderCollection();
  renderMarket();
  renderBattlepass();
  renderLevels();
  updateLeaderboard();
}

/* =========================================================
   13. INITIALISEREN
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  renderPage();

  // Initialiseer het spel alleen als game.js aanwezig is.
  if (
    document.getElementById("game") &&
    typeof window.initGame === "function"
  ) {
    window.initGame();
  }
});
