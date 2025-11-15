import { saveScore } from '../leaderboard.js';
import { updateHeader } from '../ui.js';

const ROULETTE_NUMBERS = {
    0: 'green',
    1: 'red', 2: 'black', 3: 'red', 4: 'black', 5: 'red', 6: 'black', 7: 'red', 8: 'black', 9: 'red', 10: 'black',
    11: 'black', 12: 'red', 13: 'black', 14: 'red', 15: 'black', 16: 'red', 17: 'black', 18: 'red',
    19: 'red', 20: 'black', 21: 'red', 22: 'black', 23: 'red', 24: 'black', 25: 'red', 26: 'black', 27: 'red',
    28: 'black', 29: 'black', 30: 'red', 31: 'black', 32: 'red', 33: 'black', 34: 'red', 35: 'black', 36: 'red'
};


const PAYOUTS = {
    number: 36, 
    column: 3,  
    dozen: 3,   
    color: 2,   
    half: 2,    
    evenOdd: 2  
};

const numberGrid = document.getElementById('roulette-number-grid');
const bettingTable = document.getElementById('roulette-betting-table');
const messageEl = document.getElementById('roulette-message');
const spinButton = document.getElementById('roulette-spin-button');
const clearButton = document.getElementById('roulette-clear-bets');
const betAmountInput = document.getElementById('roulette-bet-amount');
const resultNumberEl = document.getElementById('roulette-result-number');

let selectedBetElement = null; 
let selectedBetDetails = null; 
let isSpinning = false; 

function buildNumberGrid() {
    numberGrid.innerHTML = '';
    for (let i = 1; i <= 36; i++) {
        const numberBox = document.createElement('div');
        const color = ROULETTE_NUMBERS[i];
        numberBox.textContent = i;
        numberBox.classList.add('bet-option', 'number-box', color);
        numberBox.dataset.betType = 'number';
        numberBox.dataset.betValue = i;
        numberGrid.appendChild(numberBox);
    }
}

function handleBetClick(event) {
    if (isSpinning) return; 

    const clickedElement = event.target.closest('.bet-option');
    if (!clickedElement) return;

    if (selectedBetElement) {
        selectedBetElement.classList.remove('bet-active');
    }

    selectedBetElement = clickedElement;
    selectedBetElement.classList.add('bet-active');

    const { betType, betValue } = clickedElement.dataset;
    selectedBetDetails = { type: betType, value: betValue };
    
    messageEl.textContent = `Obstawiono: ${clickedElement.textContent.trim() || betValue}`;
    spinButton.disabled = false; 
}


function clearBets() {
    if (selectedBetElement) {
        selectedBetElement.classList.remove('bet-active');
    }
    selectedBetElement = null;
    selectedBetDetails = null;
    messageEl.textContent = 'Wybierz zakład.';
    resultNumberEl.textContent = '...';
    spinButton.disabled = true;
    isSpinning = false;
}


function spinWheel() {
    return Math.floor(Math.random() * 37); 
}


function checkWin(winningNumber) {
    if (!selectedBetDetails) return 0; 

    const { type, value } = selectedBetDetails;
    const numberData = {
        number: winningNumber,
        color: ROULETTE_NUMBERS[winningNumber],
        isEven: winningNumber !== 0 && winningNumber % 2 === 0,
        isOdd: winningNumber % 2 !== 0,
    };

    switch (type) {
        case 'number':
            return Number(value) === numberData.number ? PAYOUTS.number : 0;
            
        case 'color':
            return value === numberData.color ? PAYOUTS.color : 0;

        case 'dozen': 
            if (value === '1' && numberData.number >= 1 && numberData.number <= 12) return PAYOUTS.dozen;
            if (value === '2' && numberData.number >= 13 && numberData.number <= 24) return PAYOUTS.dozen;
            if (value === '3' && numberData.number >= 25 && numberData.number <= 36) return PAYOUTS.dozen;
            return 0;

        case 'column': 
            if (numberData.number === 0) return 0;
            const col = numberData.number % 3; 
            if (value === '1' && col === 1) return PAYOUTS.column;
            if (value === '2' && col === 2) return PAYOUTS.column;
            if (value === '3' && col === 0) return PAYOUTS.column;
            return 0;

        case 'half': 
            if (value === '1-18' && numberData.number >= 1 && numberData.number <= 18) return PAYOUTS.half;
            if (value === '19-36' && numberData.number >= 19 && numberData.number <= 36) return PAYOUTS.half;
            if (value === 'even' && numberData.isEven) return PAYOUTS.evenOdd;
            if (value === 'odd' && numberData.isOdd) return PAYOUTS.evenOdd;
            return 0;
            
        default:
            return 0;
    }
}


function handleSpin() {
    if (isSpinning || !selectedBetDetails) return;

    isSpinning = true;
    spinButton.disabled = true;
    clearButton.disabled = true;
    messageEl.textContent = 'Kręcę...';

    
    const betAmount = parseInt(betAmountInput.value, 10);
    let playerData = JSON.parse(localStorage.getItem('casinoUser'));

    if (!playerData) {
        messageEl.textContent = 'Błąd: Nie można pobrać danych użytkownika z localStorage.';
        isSpinning = false;
        return;
    }

    
    if (playerData.money < betAmount) {
        messageEl.textContent = `Nie masz wystarczająco kasy! (Masz: ${playerData.money})`;
        isSpinning = false;
        spinButton.disabled = false;
        clearButton.disabled = false;
        return;
    }

    
    playerData.money -= betAmount;
    
    
    localStorage.setItem('casinoUser', JSON.stringify(playerData));
    updateHeader(playerData.name, playerData.money);
    
    const winningNumber = spinWheel();
    const winningColor = ROULETTE_NUMBERS[winningNumber];
    
    resultNumberEl.textContent = '?';
    resultNumberEl.style.color = 'white';
    
    setTimeout(() => {
        resultNumberEl.textContent = winningNumber;
        resultNumberEl.style.color = winningColor === 'green' ? 'lime' : winningColor;
    }, 500); 

    const payoutMultiplier = checkWin(winningNumber);
    
    if (payoutMultiplier > 0) {
        const winnings = betAmount * payoutMultiplier;
        messageEl.textContent = `Wygrywasz! Trafiono ${winningNumber}. Wygrywasz ${winnings}.`;
        playerData.money += winnings; 
    } else {
        messageEl.textContent = `Przegrana. Wylosowano ${winningNumber}.`;
        
    }

    setTimeout(() => {
        localStorage.setItem('casinoUser', JSON.stringify(playerData));
        updateHeader(playerData.name, playerData.money);

        if (playerData.uid && playerData.name) {
            saveScore(playerData.uid, playerData.name, playerData.money);
        }

        isSpinning = false;
        clearButton.disabled = false;
        spinButton.disabled = false; 
    }, 1500); 
}


function initializeRoulette() {
    console.log('Inicjalizuję ruletkę... (z logiką localStorage)');
    buildNumberGrid();
    
    bettingTable.addEventListener('click', handleBetClick);
    clearButton.addEventListener('click', clearBets);
    spinButton.addEventListener('click', handleSpin);
    
    clearBets(); 
}

initializeRoulette();