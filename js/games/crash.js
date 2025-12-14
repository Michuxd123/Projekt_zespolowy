// Aviator Game
import { updateUserMoney } from '../firebaseConfig.js';
import * as UI from '../ui.js';

// Game state
let gameState = {
    roundNumber: 1,
    phase: 'waiting', // 'waiting', 'countdown', 'flying', 'crashed', 'finished'
    currentMultiplier: 1.00,
    crashMultiplier: null,
    countdown: 0,
    betAmount: 0,
    hasBet: false,
    hasCashedOut: false,
    cashoutMultiplier: null,
    roundSeed: null,
    animationFrame: null,
    lastUpdate: null,
    pathPoints: [],
    airplanePosition: { x: 0, y: 0 },
    rateLimitLastBet: 0,
    rateLimitDelay: 1000, // 1 second between bets
    flyingStartTime: null // Track when flying started for acceleration
};

// DOM elements
const els = {
    multiplier: document.getElementById('crash-multiplier'),
    countdown: document.getElementById('crash-countdown'),
    graph: document.getElementById('crash-graph'),
    path: document.getElementById('crash-path'),
    airplane: document.getElementById('crash-airplane'),
    historyList: document.getElementById('crash-history-list'),
    roundId: document.getElementById('crash-round-id'),
    betAmount: document.getElementById('crash-bet-amount'),
    betDisplay: document.getElementById('crash-bet-display'),
    betConfirm: document.getElementById('crash-bet-confirm-btn'),
    betDecrease: document.getElementById('crash-bet-decrease'),
    betIncrease: document.getElementById('crash-bet-increase'),
    quickBets: document.querySelectorAll('.crash-quick-bet'),
    activeBet: document.getElementById('crash-active-bet'),
    yourBet: document.getElementById('crash-your-bet'),
    potentialWin: document.getElementById('crash-potential-win'),
    cashoutBtn: document.getElementById('crash-cashout-btn'),
    stopWatchingBtn: document.getElementById('crash-stop-watching-btn'),
    playAgainBtn: document.getElementById('crash-play-again-btn'),
    message: document.getElementById('crash-message'),
    infoBtn: document.getElementById('crash-info-btn'),
    closeRulesBtn: document.getElementById('close-crash-rules-btn')
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (!els.multiplier) return; // Game view not loaded yet
    
    setupEventListeners();
    initializeRound();
});

function setupEventListeners() {
    // Bet controls
    if (els.betDecrease) els.betDecrease.addEventListener('click', () => adjustBet(-1));
    if (els.betIncrease) els.betIncrease.addEventListener('click', () => adjustBet(1));
    if (els.betAmount) {
        els.betAmount.addEventListener('input', updateBetDisplay);
        els.betAmount.addEventListener('change', validateBetAmount);
    }
    
    // Quick bets
    els.quickBets.forEach(btn => {
        btn.addEventListener('click', () => {
            const amount = parseInt(btn.dataset.amount);
            if (els.betAmount) {
                els.betAmount.value = amount;
                updateBetDisplay();
            }
        });
    });
    
    // Bet confirm
    if (els.betConfirm) els.betConfirm.addEventListener('click', placeBet);
    
    // Cashout
    if (els.cashoutBtn) els.cashoutBtn.addEventListener('click', cashOut);
    
    // Stop Watching
    if (els.stopWatchingBtn) els.stopWatchingBtn.addEventListener('click', stopWatching);
    
    // Play Again
    if (els.playAgainBtn) els.playAgainBtn.addEventListener('click', playAgain);
    
    // Info button
    if (els.infoBtn) els.infoBtn.addEventListener('click', toggleRules);
    if (els.closeRulesBtn) els.closeRulesBtn.addEventListener('click', toggleRules);
}

function toggleRules() {
    document.body.classList.toggle('crash-rules-open');
}

function adjustBet(delta) {
    if (!els.betAmount) return;
    const current = parseInt(els.betAmount.value) || 0;
    const newValue = Math.max(1, current + delta);
    els.betAmount.value = newValue;
    updateBetDisplay();
}

function updateBetDisplay() {
    if (!els.betAmount || !els.betDisplay) return;
    const amount = parseInt(els.betAmount.value) || 0;
    els.betDisplay.textContent = amount;
}

function validateBetAmount() {
    if (!els.betAmount) return;
    const amount = parseInt(els.betAmount.value);
    if (isNaN(amount) || amount < 1) {
        els.betAmount.value = 1;
    }
    updateBetDisplay();
}

// Provably Fair: Generate crash multiplier using hash
function generateCrashMultiplier(seed, roundNumber) {
    // Create a deterministic hash from seed + round number
    const hashInput = `${seed}-${roundNumber}`;
    let hash = 0;
    for (let i = 0; i < hashInput.length; i++) {
        const char = hashInput.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    
    // Use multiple hash values for more randomness
    const hash1 = Math.abs(hash) % 10000;
    const hash2 = Math.abs((hash * 31) % 10000);
    const hash3 = Math.abs((hash * 17) % 10000);
    
    // Combine hashes for more randomness
    const combinedHash = (hash1 + hash2 + hash3) % 10000;
    
    // Create non-uniform distribution:
    // - 15% chance: Very low multiplier (1.00x - 1.50x) - "scam" rounds
    // - 25% chance: Low multiplier (1.50x - 2.00x)
    // - 30% chance: Medium multiplier (2.00x - 5.00x)
    // - 20% chance: High multiplier (5.00x - 10.00x)
    // - 10% chance: Very high multiplier (10.00x - 100.00x)
    
    const randomValue = combinedHash / 10000;
    let multiplier;
    
    if (randomValue < 0.15) {
        // Very low: 1.00x - 1.50x (scam rounds)
        multiplier = 1.00 + (hash1 % 50) / 100;
    } else if (randomValue < 0.40) {
        // Low: 1.50x - 2.00x
        multiplier = 1.50 + (hash1 % 50) / 100;
    } else if (randomValue < 0.70) {
        // Medium: 2.00x - 5.00x
        multiplier = 2.00 + (hash2 % 300) / 100;
    } else if (randomValue < 0.90) {
        // High: 5.00x - 10.00x
        multiplier = 5.00 + (hash2 % 500) / 100;
    } else {
        // Very high: 10.00x - 100.00x (exponential distribution)
        const highRange = hash3 % 9000;
        // Use exponential distribution for very high values
        multiplier = 10.00 + Math.pow(highRange / 9000, 2) * 90.00;
    }
    
    // Add small random variation for unpredictability
    const variation = (hash1 % 10 - 5) / 1000; // ±0.005 variation
    multiplier += variation;
    
    // Ensure minimum multiplier of 1.00 and maximum of 100.00
    return Math.max(1.00, Math.min(100.00, multiplier));
}

// Generate seed for provably fair
function generateSeed() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function initializeRound() {
    gameState.phase = 'waiting';
    gameState.currentMultiplier = 1.00;
    gameState.crashMultiplier = null;
    gameState.hasBet = false;
    gameState.hasCashedOut = false;
    gameState.cashoutMultiplier = null;
    gameState.pathPoints = [];
    gameState.airplanePosition = { x: 0, y: 0 };
    gameState.flyingStartTime = null;
    
    // Generate new seed and crash multiplier
    gameState.roundSeed = generateSeed();
    gameState.crashMultiplier = generateCrashMultiplier(gameState.roundSeed, gameState.roundNumber);
    
    // Update UI
    if (els.multiplier) {
        els.multiplier.textContent = '1.00x';
        els.multiplier.classList.remove('crashed');
    }
    if (els.countdown) els.countdown.classList.remove('active');
    if (els.airplane) {
        els.airplane.classList.remove('flying', 'crashed');
        els.airplane.style.left = '0%';
        els.airplane.style.bottom = '0%';
    }
    if (els.path) els.path.setAttribute('d', 'M 0 400');
    if (els.activeBet) els.activeBet.style.display = 'none';
    if (els.betConfirm) els.betConfirm.disabled = false;
    if (els.stopWatchingBtn) els.stopWatchingBtn.style.display = 'none';
    if (els.playAgainBtn) els.playAgainBtn.style.display = 'none';
    if (els.message) {
        els.message.textContent = 'Postaw zakład przed startem rundy';
        els.message.style.color = 'rgba(255, 255, 255, 0.7)';
    }
    
    // Start countdown (8-10 seconds)
    const countdownTime = 8000 + Math.random() * 2000; // 8-10 seconds
    startCountdown(countdownTime);
}

function startCountdown(duration) {
    gameState.phase = 'countdown';
    gameState.countdown = Math.ceil(duration / 1000);
    
    if (els.countdown) {
        els.countdown.classList.add('active');
        els.countdown.textContent = gameState.countdown;
    }
    
    const countdownInterval = setInterval(() => {
        gameState.countdown--;
        if (els.countdown) {
            els.countdown.textContent = gameState.countdown;
        }
        
        if (gameState.countdown <= 0) {
            clearInterval(countdownInterval);
            if (els.countdown) els.countdown.classList.remove('active');
            
            // Start flying phase
            if (gameState.hasBet) {
                startFlying();
            } else {
                // No bet placed, end round
                endRound();
            }
        }
    }, 1000);
}

async function placeBet() {
    // Rate limiting
    const now = Date.now();
    if (now - gameState.rateLimitLastBet < gameState.rateLimitDelay) {
        if (els.message) els.message.textContent = 'Poczekaj chwilę przed kolejnym zakładem';
        return;
    }
    gameState.rateLimitLastBet = now;
    
    // Check if bet can be placed
    if (gameState.phase !== 'waiting' && gameState.phase !== 'countdown') {
        if (els.message) els.message.textContent = 'Nie można postawić zakładu w tej fazie';
        return;
    }
    
    if (gameState.hasBet) {
        if (els.message) els.message.textContent = 'Masz już aktywny zakład w tej rundzie';
        return;
    }
    
    // Get user data
    const userStr = localStorage.getItem('casinoUser');
    if (!userStr) {
        alert('Zaloguj się!');
        return;
    }
    const user = JSON.parse(userStr);
    
    // Validate bet amount
    const betAmount = parseInt(els.betAmount?.value) || 0;
    if (betAmount < 1) {
        if (els.message) els.message.textContent = 'Minimalny zakład to 1$';
        return;
    }
    
    if (betAmount > user.money) {
        if (els.message) els.message.textContent = `Nie masz wystarczająco środków! Masz: ${user.money}$`;
        return;
    }
    
    // Deduct bet from user
    const newBalance = user.money - betAmount;
    await updateUserMoney(user.uid, newBalance);
    user.money = newBalance;
    localStorage.setItem('casinoUser', JSON.stringify(user));
    UI.updateHeader(user.name, newBalance);
    
    // Set bet
    gameState.betAmount = betAmount;
    gameState.hasBet = true;
    
    // Update UI
    if (els.betConfirm) els.betConfirm.disabled = true;
    if (els.activeBet) els.activeBet.style.display = 'block';
    if (els.yourBet) els.yourBet.textContent = betAmount;
    if (els.potentialWin) els.potentialWin.textContent = betAmount;
    if (els.message) els.message.textContent = 'Zakład postawiony! Czekaj na start...';
    
    // If countdown is active, wait for it to finish
    // If not, start flying immediately
    if (gameState.phase === 'waiting') {
        // Start countdown if not already started
        const countdownTime = 8000 + Math.random() * 2000;
        startCountdown(countdownTime);
    }
}

function startFlying() {
    gameState.phase = 'flying';
    gameState.currentMultiplier = 1.00;
    gameState.lastUpdate = Date.now();
    gameState.pathPoints = [{ x: 0, y: 400 }];
    gameState.flyingStartTime = Date.now(); // Track flying start time for acceleration
    
    if (els.airplane) {
        els.airplane.classList.add('flying');
        els.airplane.style.left = '0%';
        els.airplane.style.bottom = '0%';
    }
    
    if (els.cashoutBtn) els.cashoutBtn.disabled = false;
    if (els.message) els.message.textContent = 'Samolot leci! Możesz wypłacić w każdej chwili';
    
    // Start animation loop
    animate();
}

function animate() {
    if (gameState.phase !== 'flying') return;
    
    const now = Date.now();
    const deltaTime = (now - gameState.lastUpdate) / 1000; // seconds
    gameState.lastUpdate = now;
    
    // Calculate time since flying started
    const flyingTime = (now - gameState.flyingStartTime) / 1000; // seconds
    
    // Dynamic growth rate: faster at start, accelerates over time
    // Base rate: 0.05 (faster than before)
    // Acceleration: increases by 0.01 every second, max 0.15
    const baseRate = 0.05;
    const acceleration = Math.min(0.01 * flyingTime, 0.10); // Max additional 0.10
    const growthRate = baseRate + acceleration;
    
    // Increase multiplier (exponential growth with acceleration)
    gameState.currentMultiplier += growthRate * deltaTime * gameState.currentMultiplier;
    
    // Check if crashed
    if (gameState.currentMultiplier >= gameState.crashMultiplier) {
        crash();
        return;
    }
    
    // Update multiplier display
    if (els.multiplier) {
        els.multiplier.textContent = gameState.currentMultiplier.toFixed(2) + 'x';
    }
    
    // Update graph
    updateGraph();
    
    // Update airplane position
    updateAirplanePosition();
    
    // Update potential win
    if (els.potentialWin && gameState.hasBet && !gameState.hasCashedOut) {
        const potential = Math.floor(gameState.betAmount * gameState.currentMultiplier);
        els.potentialWin.textContent = potential;
    }
    
    // Continue animation
    gameState.animationFrame = requestAnimationFrame(animate);
}

function updateGraph() {
    if (!els.path || !els.graph) return;
    
    const svgWidth = 800;
    const svgHeight = 400;
    const maxMultiplier = Math.max(gameState.currentMultiplier * 1.2, 10); // Show up to 10x or current * 1.2
    
    // Calculate position
    const progress = Math.min(gameState.currentMultiplier / maxMultiplier, 1);
    const x = progress * svgWidth;
    const y = svgHeight - (progress * svgHeight);
    
    // Add point to path
    gameState.pathPoints.push({ x, y });
    
    // Build path string
    let pathString = `M 0 ${svgHeight}`;
    gameState.pathPoints.forEach(point => {
        pathString += ` L ${point.x} ${point.y}`;
    });
    pathString += ` L ${x} ${svgHeight} Z`;
    
    els.path.setAttribute('d', pathString);
}

function updateAirplanePosition() {
    if (!els.airplane || !els.graph) return;
    
    const svgWidth = 800;
    const svgHeight = 400;
    const maxMultiplier = Math.max(gameState.currentMultiplier * 1.2, 10);
    const progress = Math.min(gameState.currentMultiplier / maxMultiplier, 1);
    
    const x = progress * svgWidth;
    const y = svgHeight - (progress * svgHeight);
    
    // Convert SVG coordinates to percentage
    const xPercent = (x / svgWidth) * 100;
    const yPercent = ((svgHeight - y) / svgHeight) * 100;
    
    els.airplane.style.left = xPercent + '%';
    els.airplane.style.bottom = yPercent + '%';
}

function cashOut() {
    // Anti double-cashout
    if (gameState.hasCashedOut) {
        if (els.message) els.message.textContent = 'Już wypłaciłeś w tej rundzie!';
        return;
    }
    
    if (gameState.phase !== 'flying') {
        if (els.message) els.message.textContent = 'Nie można wypłacić w tej fazie';
        return;
    }
    
    if (!gameState.hasBet) {
        if (els.message) els.message.textContent = 'Nie masz aktywnego zakładu';
        return;
    }
    
    // Cashout successful
    gameState.hasCashedOut = true;
    gameState.cashoutMultiplier = gameState.currentMultiplier;
    
    if (els.cashoutBtn) els.cashoutBtn.disabled = true;
    
    // Calculate winnings
    const winnings = Math.floor(gameState.betAmount * gameState.currentMultiplier);
    
    // Update user money
    const userStr = localStorage.getItem('casinoUser');
    if (userStr) {
        const user = JSON.parse(userStr);
        const newBalance = user.money + winnings;
        updateUserMoney(user.uid, newBalance).then(() => {
            user.money = newBalance;
            localStorage.setItem('casinoUser', JSON.stringify(user));
            UI.updateHeader(user.name, newBalance);
        });
    }
    
    if (els.message) {
        els.message.textContent = `Wypłacono przy ${gameState.currentMultiplier.toFixed(2)}x! Wygrana: ${winnings}$`;
        els.message.style.color = '#22c55e';
    }
    
    // Show Stop Watching and Play Again buttons
    if (els.stopWatchingBtn) els.stopWatchingBtn.style.display = 'block';
    if (els.playAgainBtn) els.playAgainBtn.style.display = 'block';
    
    // Remove airplane flying animation
    if (els.airplane) els.airplane.classList.remove('flying');
}

function playAgain() {
    // Reset and start new round immediately
    if (gameState.animationFrame) {
        cancelAnimationFrame(gameState.animationFrame);
        gameState.animationFrame = null;
    }
    
    // Add to history if crashed
    if (gameState.phase === 'crashed' && gameState.crashMultiplier) {
        addToHistory(gameState.crashMultiplier);
    }
    
    // Start new round
    gameState.roundNumber++;
    // if (els.roundId) els.roundId.textContent = `#${gameState.roundNumber}`;
    
    initializeRound();
}

function stopWatching() {
    // End current round and start new one
    if (gameState.phase === 'flying' || gameState.phase === 'crashed') {
        // Stop animation if still running
        if (gameState.animationFrame) {
            cancelAnimationFrame(gameState.animationFrame);
            gameState.animationFrame = null;
        }
        
        // Add to history if crashed
        if (gameState.phase === 'crashed' && gameState.crashMultiplier) {
            addToHistory(gameState.crashMultiplier);
        }
        
        // Start new round
        gameState.roundNumber++;
        // if (els.roundId) els.roundId.textContent = `#${gameState.roundNumber}`;
        
        initializeRound();
    }
}

function crash() {
    gameState.phase = 'crashed';
    
    // Stop animation
    if (gameState.animationFrame) {
        cancelAnimationFrame(gameState.animationFrame);
        gameState.animationFrame = null;
    }
    
    // Update UI
    if (els.multiplier) {
        els.multiplier.textContent = gameState.crashMultiplier.toFixed(2) + 'x';
        els.multiplier.classList.add('crashed');
    }
    
    if (els.airplane) {
        els.airplane.classList.remove('flying');
        els.airplane.classList.add('crashed');
    }
    
    if (els.cashoutBtn) els.cashoutBtn.disabled = true;
    
    // Show Stop Watching and Play Again buttons if user cashed out
    if (gameState.hasCashedOut) {
        if (els.stopWatchingBtn) els.stopWatchingBtn.style.display = 'block';
        if (els.playAgainBtn) els.playAgainBtn.style.display = 'block';
    }
    
    // Handle bet outcome
    if (gameState.hasBet && !gameState.hasCashedOut) {
        // Lost bet
        if (els.message) {
            els.message.textContent = `Samolot spadł przy ${gameState.crashMultiplier.toFixed(2)}x! Przegrałeś zakład.`;
            els.message.style.color = '#ef4444';
        }
    } else if (gameState.hasCashedOut) {
        // Already cashed out, just show crash
        if (els.message) {
            els.message.textContent = `Samolot spadł przy ${gameState.crashMultiplier.toFixed(2)}x! Dobrze, że wypłaciłeś wcześniej!`;
            els.message.style.color = '#22c55e';
        }
    } else {
        // No bet
        if (els.message) {
            els.message.textContent = `Samolot spadł przy ${gameState.crashMultiplier.toFixed(2)}x!`;
        }
    }
    
    // Add to history
    addToHistory(gameState.crashMultiplier);
    
    // End round after delay (only if user hasn't cashed out - they can use Stop Watching)
    if (!gameState.hasCashedOut) {
        setTimeout(() => {
            endRound();
        }, 3000);
    }
    // If user cashed out, they can use Stop Watching button to skip waiting
}

function addToHistory(multiplier) {
    if (!els.historyList) return;
    
    const historyItem = document.createElement('div');
    historyItem.className = 'crash-history-item';
    
    if (multiplier < 2.0) {
        historyItem.classList.add('low');
    } else if (multiplier < 10.0) {
        historyItem.classList.add('medium');
    } else {
        historyItem.classList.add('high');
    }
    
    historyItem.textContent = multiplier.toFixed(2) + 'x';
    els.historyList.insertBefore(historyItem, els.historyList.firstChild);
    
    // Keep only last 20 items
    while (els.historyList.children.length > 20) {
        els.historyList.removeChild(els.historyList.lastChild);
    }
}

function endRound() {
    gameState.phase = 'finished';
    gameState.roundNumber++;
    
    // if (els.roundId) els.roundId.textContent = `#${gameState.roundNumber}`;
    
    // Reset for next round
    setTimeout(() => {
        initializeRound();
    }, 2000);
}

// Handle page visibility (reconnect)
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && gameState.phase === 'flying') {
        // Page became visible, restart animation if needed
        if (!gameState.animationFrame) {
            gameState.lastUpdate = Date.now();
            animate();
        }
    }
});

