
export function showView(viewId) {
    document.querySelectorAll('.view').forEach(view => {
        view.classList.add('hidden');
        view.classList.remove('active');
    });

    const targetView = document.getElementById(viewId);
    if (targetView) {
        targetView.classList.remove('hidden');
        targetView.classList.add('active');
    }
}


export function updateHeader(username, money) {
    const header = document.getElementById('main-header');
    const resetBtn = document.getElementById('reset-money-button');

    if (username) {
        header.classList.remove('hidden');
        document.getElementById('username-display').textContent = username;
        document.getElementById('money-display').textContent = money;

        if (money <= 0) {
            resetBtn.classList.remove('hidden');
        } else {
            resetBtn.classList.add('hidden');
        }

    } else {
        header.classList.add('hidden');
        resetBtn.classList.add('hidden');
    }
}

window.showView = window.showView || showView;
window.updateHeader = window.updateHeader || updateHeader;