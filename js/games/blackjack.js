import { updateHeader } from '../ui.js';
import { getUserMoney, updateUserMoney } from '../firebaseConfig.js';

let dealerSum = 0;
let yourSum = 0;

let dealerAceCount = 0;
let yourAceCount = 0; 

let hidden;
let deck;

let canHit = true; 
let currentBet = 0;
let visibleDealerCardValue = 0;

document.addEventListener('DOMContentLoaded', function() {
    ensureBetControls();

    const newRoundBtn = document.getElementById("blackjack-new-round");
    const hitBtn = document.getElementById("hit");
    const stayBtn = document.getElementById("stay");

    if (newRoundBtn) newRoundBtn.addEventListener("click", () => startNewRound());
    if (hitBtn) hitBtn.addEventListener("click", hit);
    if (stayBtn) stayBtn.addEventListener("click", () => stay());

    if (hitBtn) hitBtn.disabled = true;
    if (stayBtn) stayBtn.disabled = true;
});

function ensureBetControls() {
    const gameView = document.getElementById("blackjack-game-view");
    if (!gameView) return; 

    if (!document.getElementById("blackjack-controls")) {
        const controls = document.createElement("div");
        controls.id = "blackjack-controls";
        controls.style.margin = "10px 0";
        controls.innerHTML = `
            <label for="blackjack-bet" style="font-weight:bold;margin-right:8px;">Zakład:</label>
            <input type="number" id="blackjack-bet" value="10" min="1" style="width:100px;padding:4px;margin-right:8px;">
            <button id="blackjack-new-round">Nowa runda</button>
        `;
        
        const yourCardsDiv = document.getElementById("your-cards");
        if (yourCardsDiv) {
            yourCardsDiv.parentElement.insertBefore(controls, yourCardsDiv.previousElementSibling);
        } else {
            gameView.prepend(controls);
        }
       
        const btn = document.getElementById("blackjack-new-round");
        if (btn) btn.addEventListener("click", () => startNewRound());
    }
}

async function startNewRound() {
    const dealerCards = document.getElementById("dealer-cards");
    const yourCards = document.getElementById("your-cards");
    const dealerSumEl = document.getElementById("dealer-sum");
    const yourSumEl = document.getElementById("your-sum");
    const resultsEl = document.getElementById("results");

    if (dealerCards) dealerCards.innerHTML = ""; 
    if (yourCards) yourCards.innerHTML = "";
    if (dealerSumEl) dealerSumEl.innerText = "";
    if (yourSumEl) yourSumEl.innerText = "";
    if (resultsEl) resultsEl.innerText = "";

    dealerSum = 0; yourSum = 0;
    dealerAceCount = 0; yourAceCount = 0;
    visibleDealerCardValue = 0;
    canHit = true;

    document.getElementById("hit").disabled = true;
    document.getElementById("stay").disabled = true;
    document.getElementById("blackjack-new-round").disabled = true;
    
    buildDeck();
    shuffleDeck();
    await startGame();
}

function buildDeck() {
    const values = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
    const types = ["C", "D", "H", "S"];
    deck = [];

    for (let i = 0; i < types.length; i++) {
        for (let j = 0; j < values.length; j++) {
            deck.push(values[j] + types[i]); 
        }
    }
}

function shuffleDeck() {
    for (let i = 0; i < deck.length; i++) {
        let j = Math.floor(Math.random() * deck.length); 
        let temp = deck[i];
        deck[i] = deck[j];
        deck[j] = temp;
    }
}

async function getPlayerAndBet() {
    let playerData = null;
    try {
        playerData = JSON.parse(localStorage.getItem('casinoUser') || "null");
    } catch (storageError) {
        console.warn('Nie można odczytać localStorage:', storageError);
    }
    
    if (!playerData || !playerData.uid) {
        return { playerData: null, bet: 0 };
    }
    
    // Pobierz prawdziwe saldo z Firebase
    const realMoney = await getUserMoney(playerData.uid);
    if (realMoney !== null && realMoney !== undefined) {
        playerData.money = realMoney;
        try {
            localStorage.setItem('casinoUser', JSON.stringify(playerData));
        } catch (storageError) {
            console.warn('Nie można zapisać do localStorage:', storageError);
        }
    }
    
    let betInput = document.getElementById("blackjack-bet");
    let bet = betInput ? parseInt(betInput.value) : NaN;
    if (isNaN(bet) || bet <= 0) bet = 10;
    return { playerData, bet };
}

async function startGame() {
    const { playerData, bet } = await getPlayerAndBet();
    const resultsEl = document.getElementById("results");
    
    if (!playerData) {
        if (resultsEl) resultsEl.innerText = "Zaloguj się najpierw.";
        canHit = false;
        document.getElementById("blackjack-new-round").disabled = false;
        return;
    }
    if (playerData.money < bet) {
        if (resultsEl) resultsEl.innerText = "Za mało środków na ten zakład.";
        canHit = false;
        document.getElementById("blackjack-new-round").disabled = false;
        return;
    }
   
    currentBet = bet;
    const newMoney = playerData.money - currentBet;
    
    // Zaktualizuj Firebase (źródło prawdy)
    await updateUserMoney(playerData.uid, newMoney);
    
    // Zaktualizuj localStorage i UI
    playerData.money = newMoney;
    try {
        localStorage.setItem('casinoUser', JSON.stringify(playerData));
    } catch (storageError) {
        console.warn('Nie można zapisać do localStorage:', storageError);
    }
    updateHeader(playerData.name, playerData.money);

    const dealerCards = document.getElementById("dealer-cards");
    if(dealerCards) dealerCards.innerHTML = ""; // Wyczyść wszystkie karty
    
    // Pierwsza karta krupiera - zakryta
    hidden = deck.pop();
    dealerSum += getValue(hidden);
    dealerAceCount += checkAce(hidden);
    
    let hiddenImg = document.createElement("img");
    hiddenImg.id = "hidden";
    hiddenImg.alt = "Hidden";
    hiddenImg.src = "js/games/cards/BACK.png"; 
    if(dealerCards) dealerCards.append(hiddenImg);

    // Druga karta krupiera - odkryta
    let cardImg = document.createElement("img");
    let card = deck.pop();
    cardImg.src = "js/games/cards/" + card + ".png";
    let visibleValue = getValue(card);
    dealerSum += visibleValue;
    dealerAceCount += checkAce(card);
    if(dealerCards) dealerCards.append(cardImg);
    document.getElementById("dealer-sum").innerText = visibleValue;

    const yourCards = document.getElementById("your-cards");
    if(yourCards) yourCards.innerHTML = ""; // Upewnij się, że karty gracza są wyczyszczone
    
    // Resetuj sumę gracza przed rozdaniem
    yourSum = 0;
    yourAceCount = 0;
    
    for (let i = 0; i < 2; i++) {
        let cardImg = document.createElement("img");
        let card = deck.pop();
        cardImg.src = "js/games/cards/" + card + ".png";
        yourSum += getValue(card);
        yourAceCount += checkAce(card);
        if(yourCards) yourCards.append(cardImg);
    }
    
    const result = reduceAce(yourSum, yourAceCount);
    yourSum = result.sum;
    yourAceCount = result.aceCount;
    document.getElementById("your-sum").innerText = yourSum;
    
    document.getElementById("hit").disabled = false;
    document.getElementById("stay").disabled = false;

    if (yourSum == 21) {
        canHit = false;
        stay();
    }
}

function hit() {
    if (!canHit) return;

    let cardImg = document.createElement("img");
    let card = deck.pop();
    cardImg.src = "js/games/cards/" + card + ".png";
    yourSum += getValue(card);
    yourAceCount += checkAce(card);
    document.getElementById("your-cards")?.append(cardImg);
    
    const result = reduceAce(yourSum, yourAceCount);
    yourSum = result.sum;
    yourAceCount = result.aceCount;
    document.getElementById("your-sum").innerText = yourSum;

    if (yourSum > 21) { 
        canHit = false;
        stay();
    }
}

async function settlePayout(result) {
    let playerData = null;
    try {
        playerData = JSON.parse(localStorage.getItem('casinoUser') || "null");
    } catch (storageError) {
        console.warn('Nie można odczytać localStorage:', storageError);
    }
    
    if (!playerData || !playerData.uid) return;
    
    let newMoney = playerData.money;
    if (result === "win") {
        newMoney += currentBet * 2;
    } else if (result === "tie") {
        newMoney += currentBet;
    }
    
    // Zaktualizuj Firebase (źródło prawdy)
    await updateUserMoney(playerData.uid, newMoney);
    
    // Zaktualizuj localStorage i UI
    playerData.money = newMoney;
    try {
        localStorage.setItem('casinoUser', JSON.stringify(playerData));
    } catch (storageError) {
        console.warn('Nie można zapisać do localStorage:', storageError);
    }
    updateHeader(playerData.name, playerData.money);
    currentBet = 0;
}

async function stay() {
    canHit = false;
    document.getElementById("hit").disabled = true;
    document.getElementById("stay").disabled = true;
    document.getElementById("blackjack-new-round").disabled = false;

    let dealerResult = reduceAce(dealerSum, dealerAceCount);
    dealerSum = dealerResult.sum;
    dealerAceCount = dealerResult.aceCount;
    
    let yourResult = reduceAce(yourSum, yourAceCount);
    yourSum = yourResult.sum;
    yourAceCount = yourResult.aceCount;

    const hiddenEl = document.getElementById("hidden");
    if (hiddenEl) hiddenEl.src = "js/games/cards/" + hidden + ".png";
    document.getElementById("dealer-sum").innerText = dealerSum;

    while (dealerSum < 17) {
        let cardImg = document.createElement("img");
        let card = deck.pop();
        cardImg.src = "js/games/cards/" + card + ".png";
        dealerSum += getValue(card);
        dealerAceCount += checkAce(card);
        dealerResult = reduceAce(dealerSum, dealerAceCount);
        dealerSum = dealerResult.sum;
        dealerAceCount = dealerResult.aceCount;
        document.getElementById("dealer-cards")?.append(cardImg);
        document.getElementById("dealer-sum").innerText = dealerSum;
    }

    let message = "";
    let outcome = "lose";

    if (yourSum > 21) {
        message = "Przegrana! (Fura)";
        outcome = "lose";
    }
    else if (dealerSum > 21) {
        message = "Wygrana! (Krupier ma furę)";
        outcome = "win";
    }
    else if (yourSum == dealerSum) {
        message = "Remis!";
        outcome = "tie";
    }
    else if (yourSum > dealerSum) {
        message = "Wygrana!";
        outcome = "win";
    }
    else if (yourSum < dealerSum) {
        message = "Przegrana!";
        outcome = "lose";
    }

    document.getElementById("dealer-sum").innerText = dealerSum;
    document.getElementById("your-sum").innerText = yourSum;
    document.getElementById("results").innerText = message;

    await settlePayout(outcome);
}

function getValue(card) {
    const valueStr = card.slice(0, -1); 

    if (isNaN(valueStr)) { 
        if (valueStr == "A") {
            return 11;
        }
        return 10; 
    }
    return parseInt(valueStr); 
}

function checkAce(card) {
    const valueStr = card.slice(0, -1);
    return valueStr === "A" ? 1 : 0;
}

function reduceAce(playerSum, playerAceCount) {
    let sum = playerSum;
    let aceCount = playerAceCount;
    while (sum > 21 && aceCount > 0) {
        sum -= 10;
        aceCount -= 1;
    }
    return { sum, aceCount };
}