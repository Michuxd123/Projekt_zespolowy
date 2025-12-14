import { updateUserMoney } from '../firebaseConfig.js';
import * as UI from '../ui.js';

const GRID_SIZE = 25; // 5x5

const els = {
    view: document.getElementById('mines-game-view'),
    grid: document.getElementById('mines-grid'),
    inputBet: document.getElementById('mines-bet'),
    selectMines: document.getElementById('mines-count-select'),
    btnStart: document.getElementById('mines-start-btn'),
    btnCashout: document.getElementById('mines-cashout-btn'),
    activeControls: document.getElementById('mines-active-controls'),
    msg: document.getElementById('mines-msg'),
    multiplierDisplay: document.getElementById('mines-current-multiplier'),
    profitDisplay: document.getElementById('mines-current-profit')
};

let gameState = {
    active: false,
    minesLocations: [], // Indeksy min (0-24)
    revealedCount: 0,   // Ile diamentów odkryto
    minesCount: 3,      // Wybrana liczba min
    bet: 0,
    currentMultiplier: 1
};

// Nasłuchiwacze
if (els.btnStart) els.btnStart.addEventListener('click', startGame);
if (els.btnCashout) els.btnCashout.addEventListener('click', cashOut);

// Info button handlers
const infoBtn = document.getElementById('mines-info-btn');
const closeRulesBtn = document.getElementById('close-mines-rules-btn');

if (infoBtn) {
    infoBtn.addEventListener('click', toggleMinesRules);
}

if (closeRulesBtn) {
    closeRulesBtn.addEventListener('click', toggleMinesRules);
}

function toggleMinesRules() {
    document.body.classList.toggle('mines-rules-open');
}

// Inicjalizacja planszy (pusta na start)
createGrid();

function createGrid() {
    els.grid.innerHTML = '';
    for (let i = 0; i < GRID_SIZE; i++) {
        const tile = document.createElement('div');
        tile.classList.add('mine-tile');
        tile.dataset.index = i;
        tile.addEventListener('click', () => handleTileClick(i, tile));
        els.grid.appendChild(tile);
    }
}

async function startGame() {
    if (gameState.active) return;

    // Pobierz dane użytkownika
    const userStr = localStorage.getItem("casinoUser");
    if (!userStr) { alert("Zaloguj się!"); return; }
    const user = JSON.parse(userStr);

    // Walidacja stawki
    const bet = parseInt(els.inputBet.value);
    const mines = parseInt(els.selectMines.value);

    if (isNaN(bet) || bet <= 0) {
        els.msg.textContent = "Błędna stawka!";
        return;
    }
    if (bet > user.money) {
        alert("Za mało środków!");
        return;
    }

    // Pobranie pieniędzy z konta (aktualizacja w bazie)
    const newBalance = user.money - bet;
    await updateUserMoney(user.uid, newBalance);
    user.money = newBalance;
    localStorage.setItem("casinoUser", JSON.stringify(user));
    UI.updateHeader(user.name, newBalance);

    // Reset Stanu Gry
    gameState.active = true;
    gameState.bet = bet;
    gameState.minesCount = mines;
    gameState.revealedCount = 0;
    gameState.currentMultiplier = 1;
    gameState.minesLocations = generateMines(mines);

    // Reset UI
    els.inputBet.disabled = true;
    els.selectMines.disabled = true;
    els.btnStart.style.display = 'none';
    els.activeControls.style.display = 'block';
    els.msg.textContent = "Powodzenia! Szukaj diamentów.";
    
    updateInfoPanel();
    
    // Reset kafelków
    const tiles = document.querySelectorAll('.mine-tile');
    tiles.forEach(t => {
        t.className = 'mine-tile active'; // active = klikalny
        t.innerHTML = '';
    });
}

function generateMines(count) {
    const locations = new Set();
    while (locations.size < count) {
        let r = Math.floor(Math.random() * GRID_SIZE);
        locations.add(r);
    }
    return Array.from(locations);
}

function handleTileClick(index, tileElement) {
    if (!gameState.active) return;
    if (tileElement.classList.contains('revealed')) return; // Już kliknięte

    // 1. TRAFIENIE NA MINĘ
    if (gameState.minesLocations.includes(index)) {
        gameOver(false, index);
        return;
    }

    // 2. TRAFIENIE NA DIAMENT (Bezpieczne)
    tileElement.classList.remove('active');
    tileElement.classList.add('revealed', 'gem');
    tileElement.innerHTML = '💎';
    
    gameState.revealedCount++;
    calculateMultiplier();
    updateInfoPanel();
    
    // Sprawdzenie czy wygrał (odkrył wszystkie bezpieczne)
    const totalSafeTiles = GRID_SIZE - gameState.minesCount;
    if (gameState.revealedCount === totalSafeTiles) {
        cashOut(); // Automatyczna wypłata przy wyczyszczeniu planszy
    }
}

function calculateMultiplier() {
    // Matematyka kasynowa:
    // Szansa = (Pozostałe Bezpieczne) / (Pozostałe Wszystkie)
    // Mnożnik Rundy = 1 / Szansa
    // Kumulacja mnożników.
    
    // Prostszy wzór dla logiki gry:
    /*
      Przykład: 3 miny. 25 pól.
      1 ruch: 22/25 bezpiecznych. Mnożnik ~1.13x
      2 ruch: 21/24 bezpiecznych.
    */
    
    // Obliczamy nowy mnożnik na podstawie tego ruchu
    const remainingTiles = GRID_SIZE - (gameState.revealedCount - 1); // Przed tym ruchem
    const remainingSafe = (GRID_SIZE - gameState.minesCount) - (gameState.revealedCount - 1);
    
    // Wzór: Mnożnik * (Pola ogółem / Pola bezpieczne)
    // Dodajemy 0.99 jako "House Edge" (kasyno musi zarabiać), ale w projekcie studenckim można dać 1.0
    const houseEdge = 1.0; 
    const stepMultiplier = (remainingTiles / remainingSafe) * houseEdge;
    
    gameState.currentMultiplier *= stepMultiplier;
}

function updateInfoPanel() {
    const profit = Math.floor(gameState.bet * gameState.currentMultiplier);
    els.multiplierDisplay.textContent = gameState.currentMultiplier.toFixed(2) + 'x';
    els.profitDisplay.textContent = profit + '$';
}

async function cashOut() {
    if (!gameState.active) return;
    gameState.active = false;

    const winAmount = Math.floor(gameState.bet * gameState.currentMultiplier);
    
    // Aktualizacja w bazie i localStorage
    const userStr = localStorage.getItem("casinoUser");
    const user = JSON.parse(userStr);
    const newBalance = user.money + winAmount;
    
    await updateUserMoney(user.uid, newBalance);
    user.money = newBalance;
    localStorage.setItem("casinoUser", JSON.stringify(user));
    UI.updateHeader(user.name, newBalance);

    els.msg.textContent = `Wypłacono! Wygrałeś ${winAmount}$`;
    els.msg.style.color = '#2ecc71';
    
    revealAll(true); // Pokaż resztę planszy
    endGameUI();
}

function gameOver(win, explodedIndex = -1) {
    gameState.active = false;
    
    if (!win) {
        // Eksplozja
        const tiles = document.querySelectorAll('.mine-tile');
        const bombTile = tiles[explodedIndex];
        bombTile.classList.add('bomb');
        bombTile.innerHTML = '💥';
        els.msg.textContent = "BUM! Przegrałeś zakład.";
        els.msg.style.color = '#e74c3c';
    }

    revealAll(false);
    endGameUI();
}

function revealAll(won) {
    const tiles = document.querySelectorAll('.mine-tile');
    tiles.forEach((tile, index) => {
        tile.classList.remove('active'); // Wyłącz klikanie
        
        if (gameState.minesLocations.includes(index)) {
            if (!tile.classList.contains('bomb')) {
                tile.innerHTML = '💣';
                tile.classList.add('revealed');
                if (won) tile.classList.add('dimmed'); // Jeśli wygraliśmy, miny są wyszarzone
            }
        } else if (!tile.classList.contains('revealed')) {
            tile.classList.add('revealed', 'dimmed');
            tile.innerHTML = '💎';
        }
    });
}

function endGameUI() {
    els.inputBet.disabled = false;
    els.selectMines.disabled = false;
    els.btnStart.style.display = 'block';
    els.activeControls.style.display = 'none';
    
    // Reset koloru wiadomości po chwili
    setTimeout(() => {
        els.msg.style.color = '#ecf0f1';
    }, 3000);
}