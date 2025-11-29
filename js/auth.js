import { auth, signInAnonymously, onAuthStateChanged, signOut } from './firebaseConfig.js';
import { getUserMoney, updateUserMoney } from './firebaseConfig.js';
import * as UI from './ui.js';
import { saveScore, renderLeaderboard } from './leaderboard.js';

document.addEventListener('DOMContentLoaded', () => {

    const loginBtn = document.getElementById('login-button');
    const logoutBtn = document.getElementById('logout-button');
    const resetBtn = document.getElementById('reset-money-button');

    // --------------------------
    //  LOGIN
    // --------------------------
    if (loginBtn) {
        loginBtn.addEventListener('click', async () => {
            const nickname = document.getElementById('username-input').value?.trim();
            if (!nickname) return;

            try {
                // Sprawdź dostępność localStorage przed logowaniem
                try {
                    localStorage.setItem('__test__', 'test');
                    localStorage.removeItem('__test__');
                } catch (storageError) {
                    const err = document.getElementById('login-error');
                    if (err) {
                        err.textContent = 'Błąd: localStorage jest zablokowany. Sprawdź ustawienia prywatności przeglądarki lub wyłącz tryb incognito.';
                    }
                    return;
                }
  
                const cred = await signInAnonymously(auth);
                const uid = cred.user.uid;

                const startMoney = 1000;
                await updateUserMoney(uid, startMoney);

                try {
                    localStorage.setItem("casinoUser", JSON.stringify({
                        uid,
                        name: nickname,
                        money: startMoney
                    }));
                } catch (storageError) {
                    console.warn('Nie można zapisać do localStorage, ale logowanie się powiodło:', storageError);
                    // Kontynuuj mimo błędu localStorage - Firebase ma dane
                }

                await saveScore(uid, nickname, startMoney);

                UI.updateHeader(nickname, startMoney);
                UI.showView('post-login-menu-view');

            } catch (e) {
                console.error('Błąd logowania:', e);

                const err = document.getElementById('login-error');
                let msg = 'Logowanie nie powiodło się.';

                if (e?.code === 'auth/operation-not-allowed') {
                    msg = 'Anonimowe logowanie jest wyłączone w Firebase.';
                } else if (e?.code === 'auth/network-request-failed') {
                    msg = 'Błąd sieci. Uruchom stronę przez lokalny serwer.';
                } else if (e?.message?.includes('localStorage') || e?.name === 'SecurityError') {
                    msg = 'Błąd: localStorage jest zablokowany. Sprawdź ustawienia prywatności przeglądarki.';
                } else {
                    msg = `Logowanie nie powiodło się: ${e?.message || e?.code || 'Nieznany błąd'}`;
                }

                if (err) err.textContent = msg;
            }
        });
    }

    // ---------------------------------------
    // NAWIGACJA (przyciski do widoków)
    // ---------------------------------------
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

    // --------------------------
    //  LOGOUT
    // --------------------------
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try { await signOut(auth); } catch (_) {}

            try {
                localStorage.removeItem('casinoUser');
            } catch (storageError) {
                console.warn('Nie można usunąć z localStorage:', storageError);
            }
            
            UI.updateHeader(null, 0);
            UI.showView('login-view');

            const input = document.getElementById('username-input');
            if (input) input.value = '';
        });
    }

    // ---------------------------------------
    //  RESET SALDA
    // ---------------------------------------
    if (resetBtn) {
        resetBtn.addEventListener('click', async () => {
            let stored = null;
            try {
                stored = JSON.parse(localStorage.getItem('casinoUser'));
            } catch (storageError) {
                console.warn('Nie można odczytać localStorage:', storageError);
                alert("Błąd: Nie można odczytać danych użytkownika.");
                return;
            }
            
            if (!stored || !stored.uid) return;

            await updateUserMoney(stored.uid, 1000);

            stored.money = 1000;
            
            try {
                localStorage.setItem("casinoUser", JSON.stringify(stored));
            } catch (storageError) {
                console.warn('Nie można zapisać do localStorage:', storageError);
            }

            UI.updateHeader(stored.name, stored.money);

            await saveScore(stored.uid, stored.name, stored.money);

            alert("Konto zostało zresetowane do 1000.");

            resetBtn.classList.add('hidden');
        });
    }

    // -----------------------------------------------------
    //  AUTOMATYCZNE LOGOWANIE I SYNCHRONIZACJA PORTFELA
    // -----------------------------------------------------

    onAuthStateChanged(auth, async (user) => {

        if (!user) {
            UI.updateHeader(null, 0);
            UI.showView('login-view');
            return;
        }

        const uid = user.uid;
        let stored = null;
        
        // Bezpieczne odczytanie z localStorage
        try {
            stored = JSON.parse(localStorage.getItem('casinoUser') || 'null');
        } catch (storageError) {
            console.warn('Nie można odczytać localStorage:', storageError);
        }

        // Pobierz prawdziwe saldo z Firebase (niesfałszowane)
        let realMoney = await getUserMoney(uid);

        // Jeśli użytkownik nowy → ustaw startowe saldo
        if (realMoney === null || realMoney === undefined) {
            realMoney = 1000;
            await updateUserMoney(uid, realMoney);
        }

        let nickname = stored?.name || "Player";

        // Bezpieczne zapisanie do localStorage
        try {
            localStorage.setItem("casinoUser", JSON.stringify({
                uid,
                name: nickname,
                money: realMoney
            }));
        } catch (storageError) {
            console.warn('Nie można zapisać do localStorage:', storageError);
            // Kontynuuj mimo błędu - Firebase ma dane
        }

        UI.updateHeader(nickname, realMoney);
        UI.showView('post-login-menu-view');
    });
});
