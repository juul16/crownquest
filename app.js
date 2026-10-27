```javascript
const CROWN_QUEST_KEY = "crownQuestSave";

const DEFAULT_GAME_DATA = {
    coins: 500,
    unlocked: 1,
    wins: 0,
    passXP: 0,
    world: 1,
    heroes: ["shell"],
    completed: [],
    market: [],
    history: [],
    name: "Player"
};

const HEROES = [
    { id: "shell", name: "Shell Scout", art: "🐢", rarity: "Common" },
    { id: "swift", name: "Swift Striker", art: "🥷", rarity: "Common" },
    { id: "ember", name: "Ember Guardian", art: "🔥", rarity: "Rare" },
    { id: "moss", name: "Moss Defender", art: "🌿", rarity: "Rare" },
    { id: "storm", name: "Storm Ninja", art: "🌩️", rarity: "Epic" },
    { id: "shadow", name: "Shadow Turtle", art: "🌑", rarity: "Epic" },
    { id: "crown", name: "Crown Champion", art: "👑", rarity: "Legendary" },
    { id: "cosmic", name: "Cosmic Hero", art: "🌌", rarity: "Legendary" }
];

const WORLDS = [
    "Emerald Forest",
    "Crystal Caves",
    "Sunset Desert",
    "Frozen Peaks",
    "Shadow Kingdom",
    "Cosmic Realm"
];

function loadGameData() {
    try {
        const saved = localStorage.getItem(CROWN_QUEST_KEY);
        if (!saved) return structuredClone(DEFAULT_GAME_DATA);

        const parsed = JSON.parse(saved);

        return {
            ...structuredClone(DEFAULT_GAME_DATA),
            ...parsed,
            heroes: Array.isArray(parsed.heroes) ? parsed.heroes : ["shell"],
            completed: Array.isArray(parsed.completed) ? parsed.completed : [],
            market: Array.isArray(parsed.market) ? parsed.market : [],
            history: Array.isArray(parsed.history) ? parsed.history : []
        };
    } catch (error) {
        console.error("Could not load Crown Quest save:", error);
        return structuredClone(DEFAULT_GAME_DATA);
    }
}

let gameData = loadGameData();

function saveGameData() {
    try {
        localStorage.setItem(CROWN_QUEST_KEY, JSON.stringify(gameData));
        updateGameDisplay();
    } catch (error) {
        console.error("Could not save Crown Quest:", error);
        showMessage("Could not save progress in this browser.");
    }
}

function getHero(heroId) {
    return HEROES.find(hero => hero.id === heroId) || HEROES[0];
}

function updateGameDisplay() {
    document.querySelectorAll("[data-coins]").forEach(element => {
        element.textContent = gameData.coins;
    });

    document.querySelectorAll("[data-hero-count]").forEach(element => {
        element.textContent = gameData.heroes.length;
    });

    document.querySelectorAll("[data-highest-level]").forEach(element => {
        element.textContent = gameData.unlocked;
    });

    document.querySelectorAll("[data-wins]").forEach(element => {
        element.textContent = gameData.wins;
    });
}

function showMessage(message) {
    let toast = document.getElementById("toast");

    if (!toast) {
        toast = document.createElement("div");
        toast.id = "toast";
        toast.style.cssText =
            "position:fixed;bottom:20px;left:50%;transform:translateX(-50%);" +
            "background:#fff;color:#172540;padding:12px 18px;" +
            "border-radius:10px;font-weight:bold;z-index:9999;";
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.style.display = "block";

    clearTimeout(showMessage.timer);

    showMessage.timer = setTimeout(() => {
        toast.style.display = "none";
    }, 2500);
}

function addCrowns(amount) {
    if (!Number.isFinite(amount) || amount <= 0) return;

    gameData.coins += Math.floor(amount);
    saveGameData();
}

function spendCrowns(amount) {
    if (!Number.isFinite(amount) || amount <= 0) return false;

    if (gameData.coins < amount) {
        showMessage("Not enough Crowns!");
        return false;
    }

    gameData.coins -= Math.floor(amount);
    saveGameData();
    return true;
}

function unlockHero(heroId) {
    const hero = getHero(heroId);

    if (gameData.heroes.includes(hero.id)) {
        addCrowns(75);
        showMessage("Duplicate hero! You received 75 bonus Crowns.");
        return false;
    }

    gameData.heroes.push(hero.id);
    saveGameData();
    showMessage("Unlocked " + hero.name + "!");
    return true;
}

function openHeroCrate(crateType = "starter") {
    const crates = {
        starter: { price: 100, weights: [60, 27, 10, 3] },
        rare: { price: 250, weights: [25, 40, 25, 10] },
        legendary: { price: 500, weights: [10, 20, 30, 40] }
    };

    const crate = crates[crateType];

    if (!crate) {
        showMessage("Unknown crate!");
        return;
    }

    if (!spendCrowns(crate.price)) return;

    const roll = Math.random() * 100;
    const [common, rare, epic] = crate.weights;

    let rarity;

    if (roll < common) rarity = "Common";
    else if (roll < common + rare) rarity = "Rare";
    else if (roll < common + rare + epic) rarity = "Epic";
    else rarity = "Legendary";

    const possibleHeroes = HEROES.filter(hero => hero.rarity === rarity);
    const reward = possibleHeroes[Math.floor(Math.random() * possibleHeroes.length)];

    unlockHero(reward.id);

    document.dispatchEvent(new CustomEvent("crownquest:crate-opened", {
        detail: { hero: reward, crateType }
    }));
}

function completeLevel(levelNumber) {
    if (!Number.isInteger(levelNumber) || levelNumber < 1) return;

    const firstCompletion = !gameData.completed.includes(levelNumber);

    if (firstCompletion) {
        gameData.completed.push(levelNumber);
        gameData.wins += 1;
        gameData.passXP += 50;
        gameData.unlocked = Math.max(gameData.unlocked, levelNumber + 1);

        addCrowns(50);
    }

    saveGameData();
}

function setPlayerName(name) {
    const cleanName = String(name).trim().slice(0, 18);

    if (!cleanName) {
        showMessage("Please enter a name.");
        return;
    }

    gameData.name = cleanName;
    saveGameData();
}

function updateLeaderboard() {
    const key = "crownQuestLeaderboard";

    let leaderboard = [];

    try {
        leaderboard = JSON.parse(localStorage.getItem(key) || "[]");
        if (!Array.isArray(leaderboard)) leaderboard = [];
    } catch {
        leaderboard = [];
    }

    const existing = leaderboard.find(player => player.name === gameData.name);

    if (existing) {
        existing.coins = gameData.coins;
        existing.level = gameData.unlocked;
    } else {
        leaderboard.push({
            name: gameData.name,
            coins: gameData.coins,
            level: gameData.unlocked
        });
    }

    localStorage.setItem(key, JSON.stringify(leaderboard));
}

document.addEventListener("DOMContentLoaded", updateGameDisplay);
```
