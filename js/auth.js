// Plik: js/auth.js
// Minimalny, stabilny login oparty o moduły UI + Firebase

import { auth, signInAnonymously, onAuthStateChanged, signOut } from './firebaseConfig.js';
import * as UI from './ui.js';
import { saveScore, renderLeaderboard } from './leaderboard.js';

document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('login-button');
    const logoutBtn = document.getElementById('logout-button');

    if (loginBtn) {
        loginBtn.addEventListener('click', async () => {
            const nickname = document.getElementById('username-input').value?.trim();
            if (!nickname) return;
            try {
                const cred = await signInAnonymously(auth);
                const uid = cred.user.uid;
                const startMoney = 1000;
                localStorage.setItem('casinoUser', JSON.stringify({ uid, name: nickname, money: startMoney }));
                await saveScore(uid, nickname, startMoney);
                UI.updateHeader(nickname, startMoney);
                UI.showView('post-login-menu-view');
            } catch (e) {
                console.error(e);
                const err = document.getElementById('login-error');
                let msg = 'Logowanie nie powiodło się.';
                if (e && e.code === 'auth/operation-not-allowed') {
                    msg = 'Anonimowe logowanie jest wyłączone w Firebase.';
                } else if (e && e.code === 'auth/network-request-failed') {
                    msg = 'Błąd sieci. Uruchom stronę przez lokalny serwer.';
                }
                if (err) err.textContent = msg;
            }
        });
    }

    document.querySelectorAll('#main-nav button, .game-button, .nav-button').forEach(button => {
        button.addEventListener('click', () => {
            const viewName = button.getAttribute('data-view');
            if (viewName) {
                UI.showView(viewName + '-view');
                if (viewName === 'leaderboard') {
                    renderLeaderboard();
                }
            }
        });
    });

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try { await signOut(auth); } catch (_) {}
            localStorage.removeItem('casinoUser');
            UI.updateHeader(null, 0);
            UI.showView('login-view');
            const input = document.getElementById('username-input');
            if (input) input.value = '';
        });
    }

    onAuthStateChanged(auth, (user) => {
        const stored = JSON.parse(localStorage.getItem('casinoUser') || 'null');
        if (user && stored && stored.uid === user.uid) {
            UI.updateHeader(stored.name, stored.money);
            UI.showView('post-login-menu-view');
        } else {
            UI.updateHeader(null, 0);
            UI.showView('login-view');
        }
    });
});