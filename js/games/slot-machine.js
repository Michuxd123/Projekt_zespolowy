// slot-machine.js - 3x3 Slot Machine Game
// Pure JavaScript implementation with ES6+ class structure

class SlotMachine {
    constructor() {
        // Game state
        this.balance = 100; // Starting balance
        this.betPerLine = 1; // Default bet per line
        this.isSpinning = false;
        this.grid = []; // 3x3 grid: [reel][row]
        
        // Symbol definitions with weights and payouts - using emoji instead of images
        // Ordered from highest payout to lowest: 7, BAR, bell, dollar, watermelon, grapes, lemon, orange
        this.symbols = [
            { id: '7', weight: 1, payout: 100, emoji: '7️⃣' },
            { id: 'BAR', weight: 2, payout: 50, emoji: '📊' },
            { id: 'bell', weight: 3, payout: 30, emoji: '🔔' },
            { id: 'dollar', weight: 4, payout: 20, emoji: '💵' },
            { id: 'watermelon', weight: 5, payout: 15, emoji: '🍉' },
            { id: 'grapes', weight: 6, payout: 10, emoji: '🍇' },
            { id: 'lemon', weight: 7, payout: 8, emoji: '🍋' },
            { id: 'orange', weight: 8, payout: 5, emoji: '🍊' }
        ];
        
        // Define exactly 5 paylines using [reel, row] coordinates
        this.paylines = [
            // 1 - middle horizontal
            [[0, 1], [1, 1], [2, 1]],
            // 2 - top horizontal
            [[0, 0], [1, 0], [2, 0]],
            // 3 - bottom horizontal
            [[0, 2], [1, 2], [2, 2]],
            // 4 - "V" shape: top-left -> middle -> bottom-right
            [[0, 0], [1, 1], [2, 2]],
            // 5 - inverted "V": bottom-left -> middle -> top-right
            [[0, 2], [1, 1], [2, 0]]
        ];
        
        // DOM element references (will be set in init)
        this.elements = {};
        this.animationIntervals = [];
        
        // Track winning lines for highlighting
        this.winningLines = [];
    }
    
    /**
     * Initialize the slot machine and bind to DOM elements
     */
    init() {
        // Get DOM elements
        this.elements.grid = document.getElementById('slot-grid');
        this.elements.balanceDisplay = document.getElementById('slot-balance');
        this.elements.betDisplay = document.getElementById('slot-bet-per-line');
        this.elements.paylinesDisplay = document.getElementById('slot-paylines');
        this.elements.message = document.getElementById('slot-result-message');
        this.elements.spinButton = document.getElementById('slot-spin-button');
        this.elements.betButtons = document.querySelectorAll('.bet-button');
        
        // Create grid cells if they don't exist
        if (!this.elements.grid) {
            console.error('Slot grid element not found');
            return;
        }
        
        // Initialize grid display
        this.createGridCells();
        
        // Bind event listeners
        if (this.elements.spinButton) {
            this.elements.spinButton.addEventListener('click', () => this.spin());
        }
        
        // Bind bet buttons
        this.elements.betButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                if (this.isSpinning) return;
                const bet = parseInt(e.target.dataset.bet);
                if (bet > 0) {
                    this.betPerLine = bet;
                    this.updateBetButtons();
                    this.render();
                }
            });
        });
        
        // Initial render
        this.render();
    }
    
    /**
     * Create the 3x3 grid cells in the DOM
     */
    createGridCells() {
        if (!this.elements.grid) {
            console.error('Grid element not found when creating cells');
            return;
        }
        
        this.elements.grid.innerHTML = '';
        for (let row = 0; row < 3; row++) {
            for (let reel = 0; reel < 3; reel++) {
                const cell = document.createElement('div');
                cell.className = 'slot-cell';
                cell.dataset.reel = reel;
                cell.dataset.row = row;
                
                // Display emoji symbol (no image needed)
                cell.textContent = this.symbols[0].emoji;
                cell.className = 'slot-cell';
                
                this.elements.grid.appendChild(cell);
            }
        }
    }
    
    /**
     * Weighted random symbol selection
     * Returns a symbol object based on weights
     */
    getWeightedRandomSymbol() {
        // Calculate total weight
        const totalWeight = this.symbols.reduce((sum, sym) => sum + sym.weight, 0);
        
        // Generate random number between 0 and totalWeight
        let random = Math.random() * totalWeight;
        
        // Find which symbol this random number corresponds to
        for (const symbol of this.symbols) {
            random -= symbol.weight;
            if (random <= 0) {
                return symbol;
            }
        }
        
        // Fallback (should never reach here)
        return this.symbols[0];
    }
    
    /**
     * Generate a random 3x3 grid using weighted RNG
     */
    generateRandomGrid() {
        const grid = [];
        for (let reel = 0; reel < 3; reel++) {
            grid[reel] = [];
            for (let row = 0; row < 3; row++) {
                grid[reel][row] = this.getWeightedRandomSymbol();
            }
        }
        return grid;
    }
    
    /**
     * Evaluate wins for all paylines
     * Returns object with totalWin, winningLines, and winningCells
     */
    evaluateWin(grid) {
        let totalWin = 0;
        const winningLines = [];
        const winningCells = new Set(); // Track winning cell positions
        const winningLineData = []; // Store line info for highlighting
        
        // Check each payline
        for (let lineIndex = 0; lineIndex < this.paylines.length; lineIndex++) {
            const payline = this.paylines[lineIndex];
            const [pos1, pos2, pos3] = payline;
            
            // Get symbols at each position
            const symbol1 = grid[pos1[0]][pos1[1]];
            const symbol2 = grid[pos2[0]][pos2[1]];
            const symbol3 = grid[pos3[0]][pos3[1]];
            
            // Check if all three symbols match
            if (symbol1.id === symbol2.id && symbol2.id === symbol3.id) {
                // Calculate win for this line
                const lineWin = symbol1.payout * this.betPerLine;
                totalWin += lineWin;
                winningLines.push({
                    lineIndex: lineIndex + 1,
                    symbol: symbol1.id,
                    win: lineWin,
                    positions: payline
                });
                
                // Store line data for highlighting
                winningLineData.push({
                    lineIndex: lineIndex,
                    positions: payline,
                    win: lineWin,
                    symbol: symbol1.id
                });
                
                // Mark winning cells
                payline.forEach(([reel, row]) => {
                    winningCells.add(`${reel}-${row}`);
                });
            }
        }
        
        this.winningLines = winningLineData; // Store for line highlighting
        
        return { totalWin, winningLines, winningCells };
    }
    
    /**
     * Update balance after a spin
     */
    updateBalance(winAmount) {
        this.balance += winAmount;
    }
    
    /**
     * Main spin handler
     */
    async spin() {
        // Check if already spinning
        if (this.isSpinning) return;
        
        // Calculate total bet (bet per line × number of paylines)
        const totalBet = this.betPerLine * this.paylines.length;
        
        // Check balance
        if (this.balance < totalBet) {
            this.showMessage('Not enough balance!', 'error');
            return;
        }
        
        // Deduct bet
        this.balance -= totalBet;
        this.isSpinning = true;
        this.updateBetButtons();
        
        // Disable spin button
        if (this.elements.spinButton) {
            this.elements.spinButton.disabled = true;
        }
        
        // Clear previous winning highlights
        this.clearWinningHighlights();
        
        // Show spinning message
        this.showMessage('Spinning...', 'info');
        
        // Start spin animation
        await this.animateSpin();
        
        // Generate final result
        this.grid = this.generateRandomGrid();
        
        // Evaluate wins
        const { totalWin, winningLines, winningCells } = this.evaluateWin(this.grid);
        
        // Update balance with winnings
        this.updateBalance(totalWin);
        
        // Render final result
        this.render();
        
        // Highlight winning cells and lines
        if (winningCells.size > 0) {
            this.highlightWinningCells(winningCells);
            this.highlightWinningLines();
            
            // Show big win animation for large wins
            if (totalWin >= 50) {
                this.showBigWinAnimation(totalWin);
            }
        }
        
        // Show result message
        if (totalWin > 0) {
            const lineCount = winningLines.length;
            const lineText = lineCount === 1 ? 'payline' : 'paylines';
            this.showMessage(`🎉 You won ${totalWin} credits on ${lineCount} ${lineText}! 🎉`, 'win');
        } else {
            this.showMessage('No win, try again!', 'info');
        }
        
        // Re-enable controls
        this.isSpinning = false;
        if (this.elements.spinButton) {
            this.elements.spinButton.disabled = false;
        }
        this.updateBetButtons();
    }
    
    /**
     * Animate the spinning reels - each column stops one after another
     */
    animateSpin() {
        return new Promise((resolve) => {
            const baseSpinDuration = 800; // Base spin duration per column
            const columnDelay = 500; // 0.5 seconds between columns
            const updateInterval = 50; // Update every 50ms
            const finalGrid = this.generateRandomGrid(); // Generate final result once
            
            // Function to animate a single column
            const animateColumn = (reelIndex, stopDelay = 0) => {
                return new Promise((colResolve) => {
                    const startTime = Date.now();
                    const cells = this.elements.grid.querySelectorAll(`.slot-cell[data-reel="${reelIndex}"]`);
                    const stopTime = baseSpinDuration + stopDelay;
                    
                    const interval = setInterval(() => {
                        const elapsed = Date.now() - startTime;
                        
                        if (elapsed >= stopTime) {
                            // Stop this column - show final symbols for entire column
                            cells.forEach((cell, rowIndex) => {
                                const finalSymbol = finalGrid[reelIndex][rowIndex];
                                cell.textContent = finalSymbol.emoji;
                            });
                            
                            clearInterval(interval);
                            colResolve();
                        } else {
                            // Update entire column with random symbols (all 3 cells together)
                            cells.forEach((cell) => {
                                const randomSymbol = this.getWeightedRandomSymbol();
                                cell.textContent = randomSymbol.emoji;
                            });
                        }
                    }, updateInterval);
                    
                    this.animationIntervals.push(interval);
                });
            };
            
            // Start all columns spinning immediately, but stop them one after another
            // Column 0 stops after baseSpinDuration (800ms)
            // Column 1 stops after baseSpinDuration + columnDelay (1300ms)
            // Column 2 stops after baseSpinDuration + columnDelay * 2 (1800ms)
            Promise.all([
                animateColumn(0, 0),                    // Stops at 800ms
                animateColumn(1, columnDelay),         // Stops at 1300ms
                animateColumn(2, columnDelay * 2)      // Stops at 1800ms
            ]).then(() => {
                // All columns stopped, resolve main promise
                resolve();
            });
        });
    }
    
    /**
     * Render the grid to the DOM
     */
    renderGrid(grid) {
        if (!this.elements.grid) {
            console.error('Grid element not found when rendering');
            return;
        }
        
        const cells = this.elements.grid.querySelectorAll('.slot-cell');
        if (cells.length === 0) {
            console.error('No grid cells found, recreating...');
            this.createGridCells();
            // Try again after creating cells
            const newCells = this.elements.grid.querySelectorAll('.slot-cell');
            newCells.forEach(cell => {
                const reel = parseInt(cell.dataset.reel);
                const row = parseInt(cell.dataset.row);
                if (grid[reel] && grid[reel][row]) {
                    const symbol = grid[reel][row];
                    cell.textContent = symbol.emoji;
                }
            });
            return;
        }
        
        cells.forEach(cell => {
            const reel = parseInt(cell.dataset.reel);
            const row = parseInt(cell.dataset.row);
            if (grid[reel] && grid[reel][row]) {
                const symbol = grid[reel][row];
                // Display emoji symbol
                cell.textContent = symbol.emoji;
            }
        });
    }
    
    /**
     * Highlight winning cells
     */
    highlightWinningCells(winningCells) {
        const cells = this.elements.grid.querySelectorAll('.slot-cell');
        cells.forEach(cell => {
            const key = `${cell.dataset.reel}-${cell.dataset.row}`;
            if (winningCells.has(key)) {
                cell.classList.add('winning');
            }
        });
    }
    
    /**
     * Clear winning highlights
     */
    clearWinningHighlights() {
        const cells = this.elements.grid.querySelectorAll('.slot-cell');
        cells.forEach(cell => {
            cell.classList.remove('winning');
        });
        // Remove line paths
        this.elements.grid.querySelectorAll('.payline-path').forEach(el => el.remove());
    }
    
    /**
     * Highlight winning lines with visual path
     */
    highlightWinningLines() {
        // Remove any existing line highlights
        this.elements.grid.querySelectorAll('.payline-path').forEach(el => el.remove());
        
        if (!this.elements.grid || this.winningLines.length === 0) {
            return;
        }
        
        this.winningLines.forEach(lineData => {
            const linePath = document.createElement('div');
            linePath.className = 'payline-path';
            linePath.dataset.lineIndex = lineData.lineIndex;
            
            // Create SVG path for the line
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('class', 'payline-svg');
            svg.setAttribute('viewBox', '0 0 100 100');
            svg.setAttribute('preserveAspectRatio', 'none');
            
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const positions = lineData.positions;
            
            // Calculate path coordinates (normalized to 0-100)
            // Each cell is ~33.33% of the grid, center is at 16.67% of each cell
            const startX = (positions[0][0] * 33.33) + 16.67;
            const startY = (positions[0][1] * 33.33) + 16.67;
            const midX = (positions[1][0] * 33.33) + 16.67;
            const midY = (positions[1][1] * 33.33) + 16.67;
            const endX = (positions[2][0] * 33.33) + 16.67;
            const endY = (positions[2][1] * 33.33) + 16.67;
            
            path.setAttribute('d', `M ${startX} ${startY} L ${midX} ${midY} L ${endX} ${endY}`);
            path.setAttribute('stroke', '#ffd700');
            path.setAttribute('stroke-width', '4');
            path.setAttribute('fill', 'none');
            path.setAttribute('stroke-dasharray', '5,5');
            path.style.animation = 'drawLine 0.8s ease-in-out';
            path.style.filter = 'drop-shadow(0 0 5px #ffd700)';
            
            svg.appendChild(path);
            linePath.appendChild(svg);
            
            this.elements.grid.appendChild(linePath);
        });
    }
    
    /**
     * Show big win animation
     */
    showBigWinAnimation(winAmount) {
        // Remove any existing big win overlay
        const existing = document.querySelector('.big-win-overlay');
        if (existing) {
            existing.remove();
        }
        
        const bigWinOverlay = document.createElement('div');
        bigWinOverlay.className = 'big-win-overlay';
        bigWinOverlay.innerHTML = `
            <div class="big-win-content">
                <div class="big-win-text">BIG WIN!</div>
                <div class="big-win-amount">${winAmount} CREDITS!</div>
                <div class="big-win-particles"></div>
            </div>
        `;
        
        document.body.appendChild(bigWinOverlay);
        
        // Remove after animation
        setTimeout(() => {
            bigWinOverlay.classList.add('fade-out');
            setTimeout(() => {
                bigWinOverlay.remove();
            }, 1000);
        }, 3000);
    }
    
    /**
     * Update bet button states
     */
    updateBetButtons() {
        this.elements.betButtons.forEach(button => {
            const bet = parseInt(button.dataset.bet);
            const totalBet = bet * this.paylines.length;
            
            if (this.isSpinning) {
                button.disabled = true;
            } else {
                button.disabled = this.balance < totalBet;
            }
            
            // Highlight active bet
            if (bet === this.betPerLine) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
    }
    
    /**
     * Show message to user
     */
    showMessage(text, type = 'info') {
        if (this.elements.message) {
            this.elements.message.textContent = text;
            this.elements.message.className = `slot-message ${type}`;
        }
    }
    
    /**
     * Main render function - updates all UI elements
     */
    render() {
        // Update balance display
        if (this.elements.balanceDisplay) {
            this.elements.balanceDisplay.textContent = this.balance;
        }
        
        // Update bet display
        if (this.elements.betDisplay) {
            this.elements.betDisplay.textContent = this.betPerLine;
        }
        
        // Update paylines display
        if (this.elements.paylinesDisplay) {
            this.elements.paylinesDisplay.textContent = this.paylines.length;
        }
        
        // Render grid (use current grid or show initial placeholder)
        if (this.grid.length > 0) {
            this.renderGrid(this.grid);
        } else {
            // Initial placeholder grid - show first symbol as placeholder
            const placeholderGrid = Array(3).fill(null).map(() => 
                Array(3).fill(null).map(() => this.symbols[0])
            );
            this.renderGrid(placeholderGrid);
        }
        
        // Ensure cells exist even if renderGrid didn't create them
        const cells = this.elements.grid.querySelectorAll('.slot-cell');
        if (cells.length === 0) {
            this.createGridCells();
            // Render placeholder again after creating cells
            const placeholderGrid = Array(3).fill(null).map(() => 
                Array(3).fill(null).map(() => this.symbols[0])
            );
            this.renderGrid(placeholderGrid);
        }
        
        // Ensure all cells have emoji symbols
        const allCells = this.elements.grid.querySelectorAll('.slot-cell');
        allCells.forEach(cell => {
            if (!cell.textContent || cell.textContent.trim() === '') {
                cell.textContent = this.symbols[0].emoji;
            }
        });
        
        // Update bet buttons
        this.updateBetButtons();
    }
}

// Initialize slot machine
let slotMachineInstance = null;

function initializeSlotMachine() {
    const slotView = document.getElementById('slot-game-view');
    const slotGrid = document.getElementById('slot-grid');
    
    // Check if view is visible and grid exists
    if (!slotView || slotView.classList.contains('hidden')) {
        return;
    }
    
    if (!slotGrid) {
        console.error('Slot grid element not found in DOM');
        return;
    }
    
    if (!slotMachineInstance) {
        slotMachineInstance = new SlotMachine();
        slotMachineInstance.init();
        // Store instance globally for debugging if needed
        window.slotMachine = slotMachineInstance;
    } else {
        // Re-render if already initialized (in case view was hidden and shown again)
        slotMachineInstance.render();
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Watch for view changes using MutationObserver
    const slotView = document.getElementById('slot-game-view');
    if (slotView) {
        // Initial check
        if (!slotView.classList.contains('hidden')) {
            setTimeout(initializeSlotMachine, 100);
        }
        
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const isVisible = !slotView.classList.contains('hidden');
                    if (isVisible) {
                        // Delay to ensure DOM is ready
                        setTimeout(() => {
                            initializeSlotMachine();
                        }, 150);
                    }
                }
            });
        });
        
        observer.observe(slotView, {
            attributes: true,
            attributeFilter: ['class']
        });
    }
    
    // Also hook into showView function if available
    if (window.showView) {
        const originalShowView = window.showView;
        window.showView = function(viewId) {
            originalShowView(viewId);
            if (viewId === 'slot-game-view') {
                setTimeout(initializeSlotMachine, 150);
            }
        };
    }
    
    // Direct button click listener as backup
    document.addEventListener('click', (e) => {
        const button = e.target.closest('.game-button');
        if (button && button.getAttribute('data-view') === 'slot-game') {
            setTimeout(initializeSlotMachine, 200);
        }
    });
    
    // Listen for custom event when slot view is shown
    document.addEventListener('slotViewShown', () => {
        initializeSlotMachine();
    });
});

