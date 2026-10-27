"use strict";

const DBKEY = "crownQuestMultiPage_v1";

const defaultState = {
  coins: 500,
  unlocked: 1,
  currentLevel: 1,
  xp: 0,
  wins: 0,
  claimed: [],
  pets: [{
    id: "starter-fox",
    name: "Forest Fox",
    emoji: "🦊",
    rarity: "common",
    desc: "Your loyal first adventurer."
  }],
  listings: [],
  completed: [],
  playerName: "Player"
};

let gameState;

try {
  const saved = JSON.parse(localStorage.getItem(DBKEY) || "{}");
  gameState = { ...defaultState, ...saved };
} catch {
  gameState = { ...defaultState };
}

if (!Array.isArray(gameState.pets) || !gameState.pets.length) {
  gameState.pets = [{ ...defaultState.pets[0] }];
}

["claimed", "listings", "completed", "pets"].forEach(key => {
  if (!Array.isArray(gameState[key])) gameState[key] = [];
});

const LEVELS_PER_WORLD = 21;

const worldData = [
  { name: "Emerald Jungle", icon: "🌿" },
  { name: "Crystal Forest", icon: "💎" },
  { name: "Lava Kingdom", icon: "🌋" },
  { name: "Cloud Kingdom", icon: "☁️" },
  { name: "Moon Valley", icon: "🌙" },
  { name: "Frozen Peaks", icon: "❄️" },
  { name: "Mushroom Wilds", icon: "🍄" },
  { name: "Thunder Mountains", icon: "⚡" },
  { name: "Starfall Realm", icon: "🌌" },
  { name: "Crown Palace", icon: "👑" }
];

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

function getWorldNumber(level) {
  return Math.floor((level - 1) / LEVELS_PER_WORLD) + 1;
}

function getLevelInWorld(level) {
  return ((level - 1) % LEVELS_PER_WORLD) + 1;
}

function getWorldInfo(level) {
  return worldData[(getWorldNumber(level) - 1) % worldData.length];
}

function isBossLevel(level) {
  return getLevelInWorld(level) === 21;
}

function saveState() {
  try {
    localStorage.setItem(DBKEY, JSON.stringify(gameState));
  } catch (error) {
    console.error("Could not save game:", error);
    notify("Your browser could not save the game.");
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
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function pickWeighted(pool) {
  let number = Math.random() * pool.reduce((sum, item) => sum + item.weight, 0);

  for (const item of pool) {
    number -= item.weight;
    if (number < 0) return item;
  }

  return pool[pool.length - 1];
}

function addPet(petData) {
  const pet = {
    ...petData,
    id: petData.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")
      + "-" + Date.now() + "-" + Math.floor(Math.random() * 9999)
  };

  delete pet.weight;
  gameState.pets.push(pet);
  return pet;
}

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

  document.querySelectorAll("[data-showcase]").forEach(element => {
    element.textContent =
      localStorage.getItem("crownQuestShowcase") ||
      gameState.pets[0]?.emoji ||
      "🦊";
  });

  const winsElement = document.getElementById("wins");
  if (winsElement) winsElement.textContent = gameState.wins;

  const nameInput = document.getElementById("playerName");
  if (nameInput && nameInput.value === "") {
    nameInput.value = gameState.playerName;
  }
}

function setPlayerName() {
  const input = document.getElementById("playerName");
  if (!input) return;

  const name = input.value.trim().slice(0, 18);

  if (!name) {
    notify("Enter a player name first.");
    return;
  }

  gameState.playerName = name;
  saveState();
  notify("Player name saved!");
}

function addCrowns(amount) {
  gameState.coins += Math.max(0, Math.floor(amount));
  saveState();
}

function spendCrowns(amount) {
  amount = Math.floor(amount);

  if (amount < 0 || gameState.coins < amount) {
    notify("Not enough Crowns!");
    return false;
  }

  gameState.coins -= amount;
  saveState();
  return true;
}

function selectShowcase(id) {
  const pet = gameState.pets.find(item => item.id === id);
  if (!pet) return;

  localStorage.setItem("crownQuestShowcase", pet.emoji);
  notify(pet.name + " selected!");
  updateSharedUI();
}

function buyCrate(type) {
  const cost = type === "turtle" ? 150 : 75;
  const pool = type === "turtle" ? turtlePool : miniPool;

  const button = document.getElementById("spinCrateButton");
  const wheel = document.getElementById("crateWheel");

  if (button?.disabled) return;

  if (gameState.coins < cost) {
    notify("Not enough Crowns!");
    return;
  }

  if (!spendCrowns(cost)) return;

  const reward = pickWeighted(pool);

  if (button) button.disabled = true;

  if (wheel) {
    wheel.style.transform = "rotate(0deg)";
    void wheel.offsetWidth;

    const index = pool.indexOf(reward);
    const segment = 360 / pool.length;
    const rotation = 360 * 6 + (360 - (index * segment + segment / 2));

    wheel.style.transform = `rotate(${rotation}deg)`;
  }

  const resultElement = document.getElementById("crateResult");

  if (resultElement) {
    resultElement.innerHTML = "<p>Opening crate...</p>";
  }

  setTimeout(() => {
    const pet = addPet(reward);
    saveState();

    if (resultElement) {
      resultElement.innerHTML = `
        <div class="art">${escapeText(pet.emoji)}</div>
        <h3>You got ${escapeText(pet.name)}!</h3>
        <span class="badge ${escapeText(pet.rarity)}">
          ${escapeText(pet.rarity)}
        </span>
        <p>${escapeText(pet.desc)}</p>
      `;
    }

    notify("Unlocked: " + pet.name + "!");
    document.dispatchEvent(new CustomEvent("crownquest:crate-opened", {
      detail: { pet }
    }));

    if (button) button.disabled = false;
    renderPage();
  }, wheel ? 4300 : 100);
}

function listPet() {
  const select = document.getElementById("sellPet");
  const priceInput = document.getElementById("sellPrice");

  const id = select?.value;
  const price = Math.floor(Number(priceInput?.value));
  const pet = gameState.pets.find(item => item.id === id);

  if (!pet) {
    notify("Choose a character first.");
    return;
  }

  if (pet.id === "starter-fox") {
    notify("Your starter character cannot be sold.");
    return;
  }

  if (!Number.isFinite(price) || price < 1 || price > 10000) {
    notify("Choose a price from 1 to 10,000.");
    return;
  }

  gameState.pets = gameState.pets.filter(item => item.id !== id);
  gameState.listings.push({
    id: "listing-" + Date.now(),
    pet,
    price
  });

  saveState();
  renderPage();
  notify(pet.name + " listed in your local demo market.");
}

function buyListing(id) {
  const listing = gameState.listings.find(item => item.id === id);
  if (!listing) return;

  if (!spendCrowns(listing.price)) return;

  gameState.pets.push({
    ...listing.pet,
    id: listing.pet.id + "-buy-" + Date.now()
  });

  gameState.listings = gameState.listings.filter(item => item.id !== id);

  saveState();
  renderPage();
  notify("You bought " + listing.pet.name + "!");
}

function claimReward(tier) {
  if (gameState.claimed.includes(tier)) {
    notify("You already claimed this reward.");
    return;
  }

  if (Math.floor(gameState.xp / 100) < tier) {
    notify("Earn more XP to unlock this reward.");
    return;
  }

  const rewards = {
    1: { coins: 25 },
    2: { pet: { name: "Frog Buddy", emoji: "🐸", rarity: "common" } },
    3: { coins: 50 },
    4: { pet: { name: "Crystal Owl", emoji: "🦉", rarity: "epic" } },
    5: { crate: "mini" },
    6: { pet: { name: "Tiny Dragon", emoji: "🐲", rarity: "rare" } },
    7: { coins: 100 },
    8: { pet: { name: "Star Unicorn", emoji: "🦄", rarity: "epic" } },
    9: { crate: "turtle" },
    10: { pet: { name: "Crown Keeper", emoji: "👑", rarity: "legendary" } }
  };

  const reward = rewards[tier];
  if (!reward) return;

  gameState.claimed.push(tier);

  if (reward.coins) {
    gameState.coins += reward.coins;
  }

  if (reward.pet) {
    addPet({
      ...reward.pet,
      desc: "A reward from the Crown Quest battle pass."
    });
  }

  if (reward.crate) {
    addPet(pickWeighted(reward.crate === "mini" ? miniPool : turtlePool));
  }

  saveState();
  renderPage();
  notify("Battle Pass reward claimed!");
}

function renderCollection() {
  const grid = document.getElementById("collectionGrid");
  if (!grid) return;

  const count = document.getElementById("petCount");
  if (count) count.textContent = gameState.pets.length;

  grid.innerHTML = gameState.pets.map(pet => `
    <article class="panel item">
      <div class="art">${escapeText(pet.emoji)}</div>
      <span class="badge ${escapeText(pet.rarity)}">
        ${escapeText(pet.rarity)}
      </span>
      <h3>${escapeText(pet.name)}</h3>
      <p>${escapeText(pet.desc || "A collectible adventurer.")}</p>
      <div class="item-foot">
        <span class="small">Owned</span>
        <button class="secondary"
          onclick="selectShowcase('${escapeText(pet.id)}')">
          Showcase
        </button>
      </div>
    </article>
  `).join("");

  const select = document.getElementById("sellPet");

  if (select) {
    const previous = select.value;

    select.innerHTML = gameState.pets.map(pet => `
      <option value="${escapeText(pet.id)}">
        ${escapeText(pet.name)}
      </option>
    `).join("");

    if (gameState.pets.some(pet => pet.id === previous)) {
      select.value = previous;
    }
  }
}

function renderMarket() {
  const rows = document.getElementById("marketRows");
  if (!rows) return;

  if (!gameState.listings.length) {
    rows.innerHTML = `
      <div class="empty">
        The market is empty. List a character to test the demo.
      </div>
    `;
    return;
  }

  rows.innerHTML = gameState.listings.map(listing => `
    <div class="row">
      <div class="rowicon">${escapeText(listing.pet.emoji)}</div>
      <div class="rowinfo">
        <b>${escapeText(listing.pet.name)}</b>
        <p>
          <span class="badge ${escapeText(listing.pet.rarity)}">
            ${escapeText(listing.pet.rarity)}
          </span>
          · Local demo offer
        </p>
      </div>
      <b class="gold">👑 ${listing.price}</b>
      <button onclick="buyListing('${escapeText(listing.id)}')">Buy</button>
    </div>
  `).join("");
}

function renderBattlepass() {
  const grid = document.getElementById("passGrid");
  if (!grid) return;

  const level = Math.min(10, Math.floor(gameState.xp / 100) + 1);
  const xp = gameState.xp % 100;

  const levelElement = document.getElementById("bpLevel");
  const xpElement = document.getElementById("bpXp");
  const bar = document.getElementById("bpBar");

  if (levelElement) levelElement.textContent = level;
  if (xpElement) xpElement.textContent = xp + " / 100";
  if (bar) bar.style.width = xp + "%";

  const rewards = [
    ["🪙", "25 Crowns"],
    ["🐸", "Frog Buddy"],
    ["🪙", "50 Crowns"],
    ["🦉", "Crystal Owl"],
    ["📦", "Mini Crate"],
    ["🐲", "Tiny Dragon"],
    ["🪙", "100 Crowns"],
    ["🦄", "Star Unicorn"],
    ["📦", "Turtle Crate"],
    ["👑", "Crown Keeper"]
  ];

  grid.innerHTML = rewards.map((reward, index) => {
    const tier = index + 1;
    const ready = Math.floor(gameState.xp / 100) >= tier;
    const claimed = gameState.claimed.includes(tier);

    return `
      <article class="panel item">
        <div class="art">${reward[0]}</div>
        <span class="badge ${tier > 7 ? "epic" : "common"}">
          Tier ${tier}
        </span>
        <h3>${reward[1]}</h3>
        <p>${ready ? "Reward available." : "Earn XP by completing levels."}</p>
        <button ${!ready || claimed ? "disabled" : ""}
          onclick="claimReward(${tier})">
          ${claimed ? "Claimed" : ready ? "Claim reward" : "Locked"}
        </button>
      </article>
    `;
  }).join("");
}

function renderLevels() {
  const map = document.getElementById("levelMap");
  if (!map) return;

  const worldNumber = getWorldNumber(gameState.currentLevel);
  const world = getWorldInfo(gameState.currentLevel);
  const firstLevel = (worldNumber - 1) * LEVELS_PER_WORLD + 1;

  let html = `
    <div class="world-heading">
      <h3>${world.icon} ${escapeText(world.name)}</h3>
      <p>World ${worldNumber} · 20 stages + the boss</p>
    </div>
  `;

  for (let index = 0; index < LEVELS_PER_WORLD; index++) {
    const number = firstLevel + index;
    const localLevel = index + 1;
    const locked = number > gameState.unlocked;
    const completed = gameState.completed.includes(number);
    const boss = localLevel === 21;

    html += `
      <button
        class="leveltile ${number === gameState.currentLevel ? "current" : ""}
          ${locked ? "locked" : ""} ${completed ? "completed" : ""}
          ${boss ? "boss" : ""}"
        ${locked ? "disabled" : `onclick="selectLevel(${number})"`}>
        <b>${locked ? "🔒" : boss ? "👑" : completed ? "★" : localLevel}</b>
        <span>${boss ? "BOSS" : completed ? "CLEARED" : "LEVEL " + localLevel}</span>
      </button>
    `;
  }

  map.innerHTML = html;

  const label = document.getElementById("levelLabel");
  if (label) {
    label.textContent =
      `World ${worldNumber} · Level ${getLevelInWorld(gameState.currentLevel)}`;
  }

  const worldName = document.getElementById("worldName");
  if (worldName) {
    worldName.textContent =
      `${world.icon} ${world.name}` +
      (isBossLevel(gameState.currentLevel) ? " — BOSS FIGHT" : "");
  }
}

function selectLevel(number) {
  if (number > gameState.unlocked) {
    notify("Complete the previous level first!");
    return;
  }

  gameState.currentLevel = number;
  saveState();
  renderLevels();

  if (typeof window.startLevel === "function") {
    window.startLevel();
  }
}

function completeLevel(levelNumber, collectedCoins = 0) {
  const level = levelNumber || gameState.currentLevel;

  if (!gameState.completed.includes(level)) {
    gameState.completed.push(level);
    gameState.wins += 1;
    gameState.xp += 100;
    gameState.coins += 50 + Math.max(0, Math.floor(collectedCoins));

    if (level >= gameState.unlocked) {
      gameState.unlocked = level + 1;
    }

    gameState.currentLevel = Math.max(gameState.currentLevel, level);
    saveState();
    updateLeaderboard();
    notify("Level cleared! +50 Crowns and +100 XP!");
  } else {
    gameState.coins += Math.max(0, Math.floor(collectedCoins));
    saveState();
    notify("Level replayed! Bonus Crowns earned.");
  }

  renderPage();
}

function updateLeaderboard() {
  const key = "crownQuestLeaderboard";

  let board = [];

  try {
    board = JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    board = [];
  }

  board = board.filter(entry => entry.name !== gameState.playerName);

  board.push({
    name: gameState.playerName,
    coins: gameState.coins,
    level: gameState.unlocked,
    wins: gameState.wins
  });

  board.sort((a, b) => b.coins - a.coins);
  localStorage.setItem(key, JSON.stringify(board.slice(0, 20)));

  const list = document.getElementById("leaderboardCoins");
  if (list) {
    list.innerHTML = board.slice(0, 10).map((entry, index) => `
      <div class="row">
        <div class="rowicon">#${index + 1}</div>
        <div class="rowinfo">
          <b>${escapeText(entry.name)}</b>
          <p>Highest level: ${entry.level} · Wins: ${entry.wins}</p>
        </div>
        <b class="gold">👑 ${entry.coins}</b>
      </div>
    `).join("");
  }
}

function renderPage() {
  updateSharedUI();
  renderCollection();
  renderMarket();
  renderBattlepass();
  renderLevels();
  updateLeaderboard();
}

document.addEventListener("DOMContentLoaded", () => {
  renderPage();

  if (document.getElementById("game") &&
      typeof window.initGame === "function") {
    window.initGame();
  }
});
