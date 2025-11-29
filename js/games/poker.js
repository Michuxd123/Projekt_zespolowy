// Zmiana: używamy skrótów H, D, C, S (Hearts, Diamonds, Clubs, Spades)
const suits = ['H', 'D', 'C', 'S'];
// Zmiana: używamy skrótów J, Q, K, A dla figur
const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

let deck = [];
let playerHand = [];
let cpuHand = [];
let communityCards = [];
let stage = 0; 
let pot = 0;
let playerMoney = 0;
let cpuMoney = 0;
let minBet = 0;
let currentBet = 0;
let gameActive = false;
let deckIndex = 0;

const els = {
    setup: document.getElementById('setup-screen'),
    table: document.getElementById('game-table'),
    inputStack: document.getElementById('initial-stack'),
    startBtn: document.getElementById('start-game-btn'),
    playerMoney: document.getElementById('player-money'),
    cpuMoney: document.getElementById('cpu-money'),
    pot: document.getElementById('pot'),
    minBet: document.getElementById('min-bet'),
    playerCards: document.getElementById('player-cards'),
    cpuCards: document.getElementById('cpu-cards'),
    commCards: document.getElementById('community-cards'),
    btnFold: document.getElementById('btn-fold'),
    btnCheck: document.getElementById('btn-check'),
    btnRaise: document.getElementById('btn-raise'),
    inputRaise: document.getElementById('raise-amount'),
    msg: document.getElementById('message-box'),
    nextBtn: document.getElementById('next-hand-btn')
};

els.startBtn.addEventListener('click', () => {
    const stack = parseInt(els.inputStack.value);
    if (stack > 0) {
        playerMoney = stack;
        cpuMoney = stack;
        minBet = Math.floor(stack * 0.1);
        els.setup.style.display = 'none';
        els.table.style.display = 'flex';
        startRound();
    }
});

els.btnFold.addEventListener('click', () => fold("Player"));
els.btnCheck.addEventListener('click', () => handleAction('call'));
els.btnRaise.addEventListener('click', () => handleAction('raise'));
els.nextBtn.addEventListener('click', startRound);

function createDeck() {
    deck = [];
    for (let s of suits) {
        for (let v of values) {
            deck.push({ suit: s, value: v, rank: values.indexOf(v) + 2 });
        }
    }
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    deckIndex = 0;
}

function dealCard() {
    return deck[deckIndex++];
}

function startRound() {
    if (playerMoney < minBet || cpuMoney < minBet) {
        alert("Koniec gry! Brak środków.");
        location.reload();
        return;
    }

    createDeck();
    playerHand = [dealCard(), dealCard()];
    cpuHand = [dealCard(), dealCard()];
    communityCards = [];
    stage = 0;
    pot = 0;
    currentBet = 0;
    gameActive = true;
    
    playerMoney -= minBet / 2;
    cpuMoney -= minBet / 2;
    pot += minBet;

    els.nextBtn.style.display = 'none';
    els.msg.textContent = "";
    render();
}

function render() {
    els.playerMoney.textContent = playerMoney;
    els.cpuMoney.textContent = cpuMoney;
    els.pot.textContent = pot;
    els.minBet.textContent = minBet;

    els.playerCards.innerHTML = '';
    playerHand.forEach(c => els.playerCards.appendChild(createCardEl(c)));

    els.cpuCards.innerHTML = '';
    cpuHand.forEach(c => {
        if (gameActive) {
            const div = document.createElement('div');
            div.className = 'card back';
            els.cpuCards.appendChild(div);
        } else {
            els.cpuCards.appendChild(createCardEl(c));
        }
    });

    els.commCards.innerHTML = '';
    communityCards.forEach(c => els.commCards.appendChild(createCardEl(c)));
}

function createCardEl(card) {
    const div = document.createElement('div');
    div.className = 'card';
    const img = document.createElement('img');
    // Zmiana: format nazwy pliku to WartośćKolor.png (np. 2C.png, KH.png)
    img.src = `js/games/cards/${card.value}${card.suit}.png`; 
    div.appendChild(img);
    return div;
}

function handleAction(action) {
    if (!gameActive) return;

    if (action === 'raise') {
        const amount = parseInt(els.inputRaise.value);
        if (!amount || amount < minBet || amount > playerMoney) {
            els.msg.textContent = "Nieprawidłowa kwota podbicia";
            return;
        }
        playerMoney -= amount;
        pot += amount;
        currentBet = amount;
        els.msg.textContent = `Podbiłeś o ${amount}`;
    } else if (action === 'call') {
        if (currentBet > 0) {
            const callAmt = Math.min(playerMoney, currentBet);
            playerMoney -= callAmt;
            pot += callAmt;
        }
        els.msg.textContent = "Sprawdzasz";
    }

    cpuTurn();
}

function cpuTurn() {
    setTimeout(() => {
        const cpuAction = Math.random(); 
        
        if (cpuAction > 0.8 && currentBet > 0) {
            fold("CPU");
            return;
        } else if (cpuAction > 0.6) {
            const raiseAmt = minBet;
            if (cpuMoney >= raiseAmt) {
                cpuMoney -= raiseAmt;
                pot += raiseAmt;
                currentBet = raiseAmt;
                els.msg.textContent = "Komputer Podbija!";
            } else {
                els.msg.textContent = "Komputer Czeka/Sprawdza";
            }
        } else {
            if (currentBet > 0) {
                const callAmt = Math.min(cpuMoney, currentBet);
                cpuMoney -= callAmt;
                pot += callAmt;
            }
            els.msg.textContent = "Komputer Czeka/Sprawdza";
        }

        currentBet = 0; 
        nextStage();
    }, 800);
}

function nextStage() {
    stage++;
    if (stage === 1) { 
        communityCards.push(dealCard(), dealCard(), dealCard());
    } else if (stage === 2 || stage === 3) {
        communityCards.push(dealCard());
    } else if (stage === 4) {
        endRound();
        return;
    }
    render();
}

function fold(who) {
    gameActive = false;
    if (who === "CPU") {
        els.msg.textContent = "Komputer spasował! Wygrywasz!";
        playerMoney += pot;
    } else {
        els.msg.textContent = "Spasowałeś. Komputer wygrywa.";
        cpuMoney += pot;
    }
    els.nextBtn.style.display = 'inline-block';
    render();
}

function endRound() {
    gameActive = false;
    render();
    
    const pScore = evaluateHand([...playerHand, ...communityCards]);
    const cScore = evaluateHand([...cpuHand, ...communityCards]);

    if (pScore > cScore) {
        els.msg.textContent = "Wygrałeś rozdanie!";
        playerMoney += pot;
    } else if (cScore > pScore) {
        els.msg.textContent = "Komputer wygrywa rozdanie!";
        cpuMoney += pot;
    } else {
        els.msg.textContent = "Remis! Podział puli.";
        playerMoney += pot / 2;
        cpuMoney += pot / 2;
    }
    els.nextBtn.style.display = 'inline-block';
}

function evaluateHand(cards) {
    cards.sort((a, b) => b.rank - a.rank);
    
    const counts = {};
    const suitsCount = {};
    
    cards.forEach(c => {
        counts[c.rank] = (counts[c.rank] || 0) + 1;
        suitsCount[c.suit] = (suitsCount[c.suit] || 0) + 1;
    });

    const isFlush = Object.values(suitsCount).some(c => c >= 5);
    
    let isStraight = false;
    let uniqueRanks = [...new Set(cards.map(c => c.rank))];
    let streak = 0;
    for (let i = 0; i < uniqueRanks.length - 1; i++) {
        if (uniqueRanks[i] - uniqueRanks[i+1] === 1) streak++;
        else streak = 0;
        if (streak >= 4) isStraight = true;
    }

    const countsArr = Object.values(counts).sort((a, b) => b - a);

    if (isFlush && isStraight) return 8; 
    if (countsArr[0] === 4) return 7; 
    if (countsArr[0] === 3 && countsArr[1] === 2) return 6; 
    if (isFlush) return 5;
    if (isStraight) return 4;
    if (countsArr[0] === 3) return 3; 
    if (countsArr[0] === 2 && countsArr[1] === 2) return 2; 
    if (countsArr[0] === 2) return 1; 
    
    return 0 + (cards[0].rank / 100); 
}