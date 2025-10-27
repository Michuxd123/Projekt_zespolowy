// Funkcja, która ukrywa wszystkie widoki i pokazuje jeden wskazany
function showView(viewId) {
    // Ukryj wszystkie sekcje .view
    document.querySelectorAll('.view').forEach(view => {
        view.classList.add('hidden');
        view.classList.remove('active');
    });

    // Pokaż tylko wybrany widok
    const targetView = document.getElementById(viewId);
    if (targetView) {
        targetView.classList.remove('hidden');
        targetView.classList.add('active');
    }
}

// Funkcja do aktualizowania paska z kasą
function updateHeader(username, money) {
    const header = document.getElementById('main-header');
    if (username) {
        header.classList.remove('hidden');
        document.getElementById('username-display').textContent = username;
        document.getElementById('money-display').textContent = money;
    } else {
        header.classList.add('hidden');
    }
}