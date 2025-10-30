// Plik: js/games/slot.js

import { saveScore } from '../leaderboard.js';
import { updateHeader } from '../ui.js';

// Definicja symboli (zgodnie z poprzednią sugestią, aby diament był rzadki)
const symbols = [
    '🍒','🍒','🍒','🍒','🍒', // 5x
    '🍋','🍋', '🍋', '🍋',   // 4x
    '🔔','🔔', '🔔',         // 3x
    '🍉','🍉',             // 2x
    '7️⃣',                  // 1x
    '💎'                   // 1x
];

// Stary obiekt 'payouts' nie jest już potrzebny, 
// nowa logika wygranych jest poniżej w 'checkWinnings'

// Referencje do elementów HTML
const reel1 = document.getElementById('reel1');
const reel2 = document.getElementById('reel2');
const reel3 = document.getElementById('reel3');
const spinButton = document.getElementById('spin-button');
const betInput = document.getElementById('bet-amount');
const messageEl = document.getElementById('slot-result-message');

// Nasłuchiwanie na kliknięcie przycisku "Zakręć"
spinButton.addEventListener('click', spin);

function spin() {
    // 1. Pobierz dane gracza (z localStorage)
    let playerData = JSON.parse(localStorage.getItem('casinoUser'));
    const bet = parseInt(betInput.value);

    // 2. Sprawdź, czy gracza stać na zakład
    if (bet <= 0) {
        messageEl.textContent = "Musisz postawić zakład!";
        return;
    }
    if (playerData.money < bet) {
        messageEl.textContent = "Nie masz wystarczająco pieniędzy!";
        return;
    }

    // 3. Odejmij zakład i zablokuj przycisk
    playerData.money -= bet;
    spinButton.disabled = true;
    messageEl.textContent = "Kręcę...";

    // 4. Rozpocznij animację kręcenia
    startSpinningAnimation();

    // 5. Losowanie wyników
    // Używamy losowania opartego na tablicy 'symbols'
    const result1 = symbols[Math.floor(Math.random() * symbols.length)];
    const result2 = symbols[Math.floor(Math.random() * symbols.length)];
    const result3 = symbols[Math.floor(Math.random() * symbols.length)];
    
    const results = [result1, result2, result3];

    // 6. Zatrzymaj animację po 2 sekundach i pokaż wyniki
    setTimeout(() => {
        stopSpinningAnimation();
        
        // Wyświetl wyniki
        reel1.textContent = result1;
        reel2.textContent = result2;
        reel3.textContent = result3;

        // Sprawdź wygraną
        const winnings = checkWinnings(results, bet);

        if (winnings > 0) {
            messageEl.textContent = `Wygrałeś ${winnings}!`;
            playerData.money += winnings;
            showWinAnimation();
        
            // Aktualizuj maksymalny wynik (maxScore) w Firestore
            if (playerData.uid && playerData.name) {
                saveScore(playerData.uid, playerData.name, playerData.money);
            }
        
        } else {
            messageEl.textContent = "Próbuj dalej!";
        }

        // Zapisz nowy stan kasy i zaktualizuj UI
        localStorage.setItem('casinoUser', JSON.stringify(playerData));
        updateHeader(playerData.name, playerData.money);
        spinButton.disabled = false;

    }, 2000); // Kręcenie przez 2 sekundy
}

function startSpinningAnimation() {
    // Dodaj klasę spinning do wszystkich bębnów
    reel1.classList.add('spinning');
    reel2.classList.add('spinning');
    reel3.classList.add('spinning');

    // Animacja szybkiej zmiany symboli
    const animationInterval = setInterval(() => {
        reel1.textContent = symbols[Math.floor(Math.random() * symbols.length)];
        reel2.textContent = symbols[Math.floor(Math.random() * symbols.length)];
        reel3.textContent = symbols[Math.floor(Math.random() * symbols.length)];
    }, 100);
    
    // Zapisz interval ID do późniejszego wyczyszczenia
    window.slotAnimationInterval = animationInterval;
}

function stopSpinningAnimation() {
    // Usuń klasę spinning
    reel1.classList.remove('spinning');
    reel2.classList.remove('spinning');
    reel3.classList.remove('spinning');
    
    // Wyczyść interval
    if (window.slotAnimationInterval) {
        clearInterval(window.slotAnimationInterval);
        window.slotAnimationInterval = null;
    }
}

function showWinAnimation() {
    // Dodaj klasę win do bębnów na krótko
    reel1.classList.add('win');
    reel2.classList.add('win');
    reel3.classList.add('win');
    
    setTimeout(() => {
        reel1.classList.remove('win');
        reel2.classList.remove('win');
        reel3.classList.remove('win');
    }, 600);
}

// --- NOWA FUNKCJA checkWinnings ---
// Zawiera logikę, o którą prosiłeś
function checkWinnings(results, bet) {
    const [r1, r2, r3] = results;

    // 1. Trzy takie same
    if (r1 === r2 && r2 === r3) {
        switch (r1) {
            case '🍒': return bet * 4;   // 3 wiśnie
            case '🍋': return bet * 4;   // 3 cytryny
            case '🍉': return bet * 16;  // 3 arbuzy
            case '🔔': return bet * 20;  // 3 dzwonki
            case '7️⃣': return bet * 50; // 3 siódemki
            case '💎': return bet * 4;   // 3 diamenty
            default: return 0;
        }
    }

    // 2. Dokładnie dwa diamenty, trzeci inny
    const diamondCount = results.filter(s => s === '💎').length;
    if (diamondCount === 2) {
        return bet * 2;
    }

    // 3. Brak wygranej
    return 0;
}