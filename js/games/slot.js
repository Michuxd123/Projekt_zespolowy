// Plik: js/games/slot.js
// 3x3 Slot Machine - Simple direct approach

import { saveScore } from '../leaderboard.js';
import { updateHeader } from '../ui.js';

// Symbol definitions
const SYMBOLS = ['🍒', '🍒', '🍒', '🍒', '🍒', '🍋', '🍋', '🍋', '🍋', '🔔', '🔔', '🔔', '🍉', '🍉', '7️⃣', '💎'];

// Payout multipliers for 3-of-a-kind
const PAYOUTS = {
    '🍒': 2, '🍋': 3, '🔔': 5, '🍉': 8, '7️⃣': 10, '💎': 15
};

// Winning lines: [0,1,2], [3,4,5], [6,7,8], [0,4,8], [2,4,6]
const WINNING_LINES = [[0,1,2], [3,4,5], [6,7,8], [0,4,8], [2,4,6]];

let gridCells = [];
let currentSymbols = [];
let isSpinning = false;
let animationInterval = null;

// Create the 3x3 grid
function createGrid() {
    const container = document.getElementById('slot-grid-3x3');
    if (!container) {
        console.error('slot-grid-3x3 container not found!');
        return false;
    }
    
    console.log('Creating 3x3 grid...');
    container.innerHTML = '';
    gridCells = [];
    currentSymbols = [];
    
    // Force grid display
    container.style.display = 'grid';
    container.style.gridTemplateColumns = 'repeat(3, 1fr)';
    container.style.gridTemplateRows = 'repeat(3, 1fr)';
    container.style.gap = '10px';
    
    for (let i = 0; i < 9; i++) {
        const cell = document.createElement('div');
        cell.className = 'slot-cell';
        cell.dataset.index = i;
        cell.style.display = 'flex';
        cell.style.position = 'relative';
        
        const indexLabel = document.createElement('span');
        indexLabel.className = 'slot-cell-index';
        indexLabel.textContent = i;
        
        const symbol = document.createElement('span');
        symbol.className = 'slot-symbol';
        symbol.textContent = '🎰';
        symbol.style.fontSize = '3rem';
        
        cell.appendChild(indexLabel);
        cell.appendChild(symbol);
        container.appendChild(cell);
        
        gridCells.push(cell);
        currentSymbols.push('🎰');
    }
    
    console.log('Grid created with', gridCells.length, 'cells');
    console.log('Container children:', container.children.length);
    return true;
}

// Update balance display
function updateBalance() {
    const playerData = JSON.parse(localStorage.getItem('casinoUser') || 'null');
    const balanceEl = document.getElementById('slot-balance');
    if (balanceEl && playerData) {
        balanceEl.textContent = playerData.money || 0;
    }
}

// Handle spin
function handleSpin() {
    if (isSpinning) return;
    
    const playerData = JSON.parse(localStorage.getItem('casinoUser') || 'null');
    if (!playerData) {
        alert('Please log in first');
        return;
    }
    
    const betInput = document.getElementById('slot-bet-amount');
    const bet = parseInt(betInput?.value || 0);
    
    if (bet <= 0 || playerData.money < bet) {
        const msg = document.getElementById('slot-result-message');
        if (msg) msg.textContent = bet <= 0 ? 'Please enter a valid bet!' : 'Insufficient balance!';
        return;
    }
    
    // Ensure grid exists
    if (gridCells.length !== 9) {
        if (!createGrid()) return;
    }
    
    // Deduct bet
    playerData.money -= bet;
    localStorage.setItem('casinoUser', JSON.stringify(playerData));
    updateHeader(playerData.name, playerData.money);
    updateBalance();
    
    // Start spin
    isSpinning = true;
    const spinBtn = document.getElementById('slot-spin-button');
    if (spinBtn) spinBtn.disabled = true;
    
    const msg = document.getElementById('slot-result-message');
    if (msg) msg.textContent = 'Spinning...';
    
    // Animation
    animationInterval = setInterval(() => {
        gridCells.forEach(cell => {
            cell.classList.add('spinning');
            const symbol = cell.querySelector('.slot-symbol');
            if (symbol) symbol.textContent = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
        });
    }, 100);
    
    // Stop after 2 seconds
    setTimeout(() => {
        if (animationInterval) {
            clearInterval(animationInterval);
            animationInterval = null;
        }
        
        gridCells.forEach(cell => cell.classList.remove('spinning'));
        
        // Generate results
        for (let i = 0; i < 9; i++) {
            currentSymbols[i] = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
            const symbol = gridCells[i].querySelector('.slot-symbol');
            if (symbol) symbol.textContent = currentSymbols[i];
        }
        
        // Check wins
        const wins = [];
        let totalWin = 0;
        
        WINNING_LINES.forEach((line, idx) => {
            const [a, b, c] = line.map(i => currentSymbols[i]);
            if (a === b && b === c) {
                const mult = PAYOUTS[a] || 0;
                const win = bet * mult;
                wins.push({ line: idx + 1, indices: line, symbol: a, win });
                totalWin += win;
            }
        });
        
        // Apply winnings
        if (totalWin > 0) {
            playerData.money += totalWin;
            localStorage.setItem('casinoUser', JSON.stringify(playerData));
            updateHeader(playerData.name, playerData.money);
            updateBalance();
            
            if (playerData.uid && playerData.name) {
                saveScore(playerData.uid, playerData.name, playerData.money);
            }
            
            // Highlight winners
            const winningIndices = new Set();
            wins.forEach(w => w.indices.forEach(i => winningIndices.add(i)));
            winningIndices.forEach(i => {
                if (gridCells[i]) gridCells[i].classList.add('winning');
            });
            
            setTimeout(() => {
                gridCells.forEach(c => c.classList.remove('winning'));
            }, 2000);
            
            // Show results
            const lastWin = document.getElementById('slot-last-win');
            if (lastWin) lastWin.textContent = totalWin;
            
            const winLines = document.getElementById('slot-winning-lines');
            if (winLines) {
                winLines.innerHTML = '<div style="font-weight:bold;margin-bottom:5px;">Winning Lines:</div>' +
                    wins.map(w => `<div class="winning-line-item">Line ${w.line} (${w.indices.join('-')}): +${w.win}</div>`).join('');
            }
            
            if (msg) msg.textContent = `You won ${totalWin}!`;
        } else {
            const lastWin = document.getElementById('slot-last-win');
            if (lastWin) lastWin.textContent = '0';
            const winLines = document.getElementById('slot-winning-lines');
            if (winLines) winLines.innerHTML = '';
            if (msg) msg.textContent = 'No win this time. Try again!';
        }
        
        isSpinning = false;
        if (spinBtn) spinBtn.disabled = false;
    }, 2000);
}

// Initialize when view is shown
function initSlot() {
    const view = document.getElementById('slot-game-view');
    if (!view) {
        console.log('slot-game-view not found');
        return;
    }
    
    if (view.classList.contains('hidden')) {
        console.log('slot-game-view is hidden');
        return;
    }
    
    console.log('Initializing slot - view is visible');
    
    const container = document.getElementById('slot-grid-3x3');
    if (!container) {
        console.error('slot-grid-3x3 container not found in initSlot!');
        return;
    }
    
    if (gridCells.length !== 9 || container.children.length !== 9) {
        console.log('Creating grid - current cells:', gridCells.length, 'container children:', container.children.length);
        createGrid();
    } else {
        console.log('Grid already exists');
    }
    
    updateBalance();
    
    const spinBtn = document.getElementById('slot-spin-button');
    if (spinBtn && !spinBtn.hasAttribute('data-slot-init')) {
        spinBtn.addEventListener('click', handleSpin);
        spinBtn.setAttribute('data-slot-init', 'true');
        console.log('Spin button listener attached');
    }
}

// Watch for view changes - simple approach
function watchView() {
    // Check immediately
    setTimeout(initSlot, 100);
    
    // Watch for class changes
    const view = document.getElementById('slot-game-view');
    if (view) {
        const observer = new MutationObserver(() => {
            setTimeout(initSlot, 100);
        });
        observer.observe(view, { attributes: true, attributeFilter: ['class'] });
    }
    
    // Periodic check
    setInterval(initSlot, 1000);
    
    // Hook showView
    const original = window.showView;
    if (typeof original === 'function') {
        window.showView = function(viewId) {
            original.apply(this, arguments);
            if (viewId === 'slot-game-view') {
                setTimeout(initSlot, 200);
            }
        };
    }
}

// Start watching
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', watchView);
} else {
    watchView();
}
