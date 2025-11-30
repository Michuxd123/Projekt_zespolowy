// Plik: js/ui.js

// Funkcja, która ukrywa wszystkie widoki i pokazuje jeden wskazany
export function showView(viewId) {
    document.querySelectorAll('.view').forEach(view => {
        view.classList.add('hidden');
        view.classList.remove('active');
    });

    const targetView = document.getElementById(viewId);
    if (targetView) {
        targetView.classList.remove('hidden');
        targetView.classList.add('active');
        
        // Initialize slot if slot view is shown
        if (viewId === 'slot-game-view' && window.initializeSlotGame) {
            setTimeout(() => {
                window.initializeSlotGame();
            }, 100);
        }
    }
}

// 👇 DODAJ 'export'
export function updateHeader(username, money) {
    const header = document.getElementById('main-header');
    if (username) {
        header.classList.remove('hidden');
        document.getElementById('username-display').textContent = username;
        document.getElementById('money-display').textContent = money;
    } else {
        header.classList.add('hidden');
    }
}

// Upewnij się, że funkcje są też dostępne globalnie (jeśli gdzieś wywołano je bez importu)
// To obejście błędu "updateHeader is not defined" przy starych skryptach w cache
// Nie wpływa na działanie modułów ESM.
// eslint-disable-next-line no-undef
window.showView = window.showView || showView;
// eslint-disable-next-line no-undef
window.updateHeader = window.updateHeader || updateHeader;