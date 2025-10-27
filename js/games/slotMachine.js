import React, { useState, useEffect } from 'react';
import './SlotMachine.css'; // Zaimportujemy style CSS

// Definicja symboli poza komponentem
const SYMBOLS = ['🍒', '🍋', '🔔', '🍉', '7️⃣'];
const getRandomSymbol = () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];

function SlotMachine() {
    const [reels, setReels] = useState(['🍒', '🍋', '🔔']);
    const [isSpinning, setIsSpinning] = useState(false);
    // Tutaj powinieneś też pobrać stan pieniędzy gracza (np. z globalnego kontekstu)

    // Ten hook (useEffect) uruchomi się za każdym razem, gdy `isSpinning` zmieni się na `true`
    useEffect(() => {
        if (isSpinning) {
            // 1. Uruchom "szybką animację" w JS
            // To jest interwał, który bardzo szybko zmienia symbole, symulując kręcenie
            const animationInterval = setInterval(() => {
                setReels([getRandomSymbol(), getRandomSymbol(), getRandomSymbol()]);
            }, 70); // Zmieniaj symbole co 70ms

            // 2. Ustaw "główny timer" kręcenia
            // Po 2 sekundach zatrzymujemy animację i ustalamy wynik
            const spinTimer = setTimeout(() => {
                clearInterval(animationInterval); // Zatrzymaj szybką zmianę symboli
                setIsSpinning(false); // Zakończ stan kręcenia

                // Ustal finalne, "prawdziwe" wyniki
                const finalReels = [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()];
                setReels(finalReels);

                // TODO: Tutaj sprawdzasz wygraną na podstawie `finalReels`
                // checkWinnings(finalReels);

            }, 2000); // Kręć przez 2 sekundy

            // Funkcja czyszcząca: jeśli komponent zniknie, wyczyść timery
            return () => {
                clearInterval(animationInterval);
                clearTimeout(spinTimer);
            };
        }
    }, [isSpinning]); // Tablica zależności: uruchom ten efekt tylko gdy `isSpinning` się zmieni

    // Funkcja wywoływana przez przycisk
    const handleSpin = () => {
        // TODO: Najpierw sprawdź, czy gracz ma dość kasy i odejmij zakład
        // if (playerMoney >= bet) { ... }
        
        setIsSpinning(true); // Uruchomienie efektu kręcenia
    };

    return (
        <section id="slot-game-view"> {/* Możesz zachować stare ID dla spójności */}
            <h2>Gra - Automat 🎰</h2>
            
            <div id="slot-machine">
                {/* Warunkowo dodajemy klasę 'spinning' do każdego bębna.
                  React automatycznie doda/usunie tę klasę, gdy stan `isSpinning` się zmieni.
                */}
                <div className={`reel ${isSpinning ? 'spinning' : ''}`}>{reels[0]}</div>
                <div className={`reel ${isSpinning ? 'spinning' : ''}`}>{reels[1]}</div>
                <div className={`reel ${isSpinning ? 'spinning' : ''}`}>{reels[2]}</div>
            </div>
            
            <div id="slot-controls">
                <label htmlFor="bet-amount">Zakład:</label>
                <input type="number" id="bet-amount" defaultValue="10" min="1" disabled={isSpinning} />
                
                {/* Przycisk jest wyłączony podczas kręcenia */}
                <button id="spin-button" onClick={handleSpin} disabled={isSpinning}>
                    {isSpinning ? 'Kręcę...' : 'Zakręć!'}
                </button>
            </div>
            
            <p id="slot-result-message">
                {/* Tutaj możesz wyświetlać wiadomość o wygranej */}
            </p>
        </section>
    );
}

export default SlotMachine;