export function showView(viewId) {
    document.querySelectorAll('.view').forEach(view => {
        view.classList.add('hidden');
        view.classList.remove('active');
    });
    let targetId = viewId;
    if (!viewId.endsWith('-view') && !document.getElementById(viewId)) {
         targetId = viewId + '-view';
    }

    const targetView = document.getElementById(targetId);
    
    if (targetView) {
        targetView.classList.remove('hidden');
        targetView.classList.add('active'); 
    } else {
        console.error("Błąd: Nie znaleziono widoku o ID:", targetId);
    }
    
}

export function updateHeader(username, money) {
    const header = document.getElementById('main-header');
    const resetBtn = document.getElementById('reset-money-button');

    if (username) {
        header.classList.remove('hidden');
        const userDisplay = document.getElementById('username-display');
        const moneyDisplay = document.getElementById('money-display');
        
        if(userDisplay) userDisplay.textContent = username;
        if(moneyDisplay) moneyDisplay.textContent = money;

        if (resetBtn) {
            money <= 0 ? resetBtn.classList.remove('hidden') : resetBtn.classList.add('hidden');
        }
    } else {
        header.classList.add('hidden');
    }
}

window.showView = window.showView || showView;
window.updateHeader = window.updateHeader || updateHeader;