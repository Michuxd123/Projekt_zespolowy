import { updateHeader } from '../ui.js';

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

    if (newRoundBtn) newRoundBtn.addEventListener("click", startNewRound);
    if (hitBtn) hitBtn.addEventListener("click", hit);
    if (stayBtn) stayBtn.addEventListener("click", stay);

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
        if (btn) btn.addEventListener("click", startNewRound);
    }
}

function startNewRound() {
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
    startGame();
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

function getPlayerAndBet() {
    const playerData = JSON.parse(localStorage.getItem('casinoUser') || "null");
    let betInput = document.getElementById("blackjack-bet");
    let bet = betInput ? parseInt(betInput.value) : NaN;
    if (isNaN(bet) || bet <= 0) bet = 10;
    return { playerData, bet };
}

function startGame() {
    const { playerData, bet } = getPlayerAndBet();
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
    playerData.money -= currentBet;
    localStorage.setItem('casinoUser', JSON.stringify(playerData));
    updateHeader(playerData.name, playerData.money);

    const dealerCards = document.getElementById("dealer-cards");
    let hiddenImg = document.createElement("img");
    hiddenImg.id = "hidden";
    hiddenImg.alt = "Hidden";
    hiddenImg.src = "js/games/cards/BACK.png"; 
    if(dealerCards) dealerCards.append(hiddenImg);

    hidden = deck.pop();
    dealerSum += getValue(hidden);
    dealerAceCount += checkAce(hidden);

    let cardImg = document.createElement("img");
    let card = deck.pop();
    cardImg.src = "js/games/cards/" + card + ".png";
    let visibleValue = getValue(card);
    dealerSum += visibleValue;
    dealerAceCount += checkAce(card);
    if(dealerCards) dealerCards.append(cardImg);
    document.getElementById("dealer-sum").innerText = visibleValue;

    const yourCards = document.getElementById("your-cards");
    for (let i = 0; i < 2; i++) {
        let cardImg = document.createElement("img");
        let card = deck.pop();
        cardImg.src = "js/games/cards/" + card + ".png";
        yourSum += getValue(card);
        yourAceCount += checkAce(card);
        if(yourCards) yourCards.append(cardImg);
    }
    
    yourSum = reduceAce(yourSum, yourAceCount);
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
    
    yourSum = reduceAce(yourSum, yourAceCount);
    document.getElementById("your-sum").innerText = yourSum;

    if (yourSum > 21) { 
        canHit = false;
        stay();
    }
}

function settlePayout(result) {
    const playerData = JSON.parse(localStorage.getItem('casinoUser') || "null");
    if (!playerData) return;
    if (result === "win") {
        playerData.money += currentBet * 2;
    } else if (result === "tie") {
        playerData.money += currentBet;
    } 
    localStorage.setItem('casinoUser', JSON.stringify(playerData));
    updateHeader(playerData.name, playerData.money);
    currentBet = 0;
}

function stay() {
    canHit = false;
    document.getElementById("hit").disabled = true;
    document.getElementById("stay").disabled = true;
    document.getElementById("blackjack-new-round").disabled = false;

    dealerSum = reduceAce(dealerSum, dealerAceCount);
    yourSum = reduceAce(yourSum, yourAceCount);

    const hiddenEl = document.getElementById("hidden");
    if (hiddenEl) hiddenEl.src = "js/games/cards/" + hidden + ".png";
    document.getElementById("dealer-sum").innerText = dealerSum;

    while (dealerSum < 17) {
        let cardImg = document.createElement("img");
        let card = deck.pop();
        cardImg.src = "js/games/cards/" + card + ".png";
        dealerSum += getValue(card);
        dealerAceCount += checkAce(card);
        dealerSum = reduceAce(dealerSum, dealerAceCount);
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

    settlePayout(outcome);
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
    while (playerSum > 21 && playerAceCount > 0) {
        playerSum -= 10;
        playerAceCount -= 1;
    }
    return playerSum;
}