// Zaimportuj funkcje z innych plików (jeśli używacie modułów ES6)
// import { showView, updateHeader } from './ui.js';
// import { setPlayer, getPlayer } from './state.js';

// Uwaga: Bez modułów ES6, musicie uważać na kolejność ładowania skryptów w HTML!

document.getElementById('login-button').addEventListener('click', () => {
    const username = document.getElementById('username-input').value;
    
    if (username) {
        // Zapisz gracza i daj mu startową kasę (np. z state.js)
        const startMoney = 1000;
        // setPlayer(username, startMoney); // funkcja z state.js
        
        // Zapisz w localStorage (prosta wersja)
        localStorage.setItem('casinoUser', JSON.stringify({ name: username, money: startMoney }));

        // Zaktualizuj UI
        updateHeader(username, startMoney); // funkcja z ui.js
        showView('main-menu-view'); // funkcja z ui.js
    }
});

// Obsługa nawigacji w menu
document.querySelectorAll('#main-nav button, .game-button').forEach(button => {
    button.addEventListener('click', () => {
        const viewName = button.getAttribute('data-view');
        if (viewName) {
            showView(viewName + '-view');
        }
    });
});

// Obsługa przycisku wylogowania
document.getElementById('logout-button').addEventListener('click', () => {
    // Wyczyść dane gracza z localStorage
    localStorage.removeItem('casinoUser');
    
    // Ukryj header i pokaż ekran logowania
    updateHeader(null, 0);
    showView('login-view');
    
    // Wyczyść pole logowania
    document.getElementById('username-input').value = '';
});