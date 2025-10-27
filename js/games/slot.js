// Definicja symboli i ich wartości (im rzadszy, tym wyższa wygrana)
const symbols = ['🍒', '🍋', '🔔', '🍉', '7️⃣'];
const payouts = {
    '🍒': 2,
    '🍋': 3,
    '🔔': 5,
    '🍉': 10,
    '7️⃣': 50 
};

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

function checkWinnings(results, bet) {
    const [r1, r2, r3] = results;

    // Najlepsza wygrana: trzy takie same symbole
    if (r1 === r2 && r2 === r3) {
        return bet * payouts[r1];
    }
    
    // Wygraj za dwa takie same symbole (mniejsza wygrana)
    if (r1 === r2 || r2 === r3 || r1 === r3) {
        // Znajdź który symbol się powtarza
        const matchingSymbol = r1 === r2 ? r1 : (r2 === r3 ? r2 : r1);
        return Math.floor(bet * payouts[matchingSymbol] * 0.3); // 30% wartości symbolu
    }
    
    // Specjalna wygrana za sekwencję (np. 7️⃣-🔔-🍉)
    const specialSequences = [
        ['7️⃣', '🔔', '🍉'],
        ['🍉', '🔔', '7️⃣']
    ];
    
    for (const sequence of specialSequences) {
        if (r1 === sequence[0] && r2 === sequence[1] && r3 === sequence[2]) {
            return bet * 5; // Stała wygrana za sekwencję
        }
    }
    
    // Brak wygranej
    return 0;
}