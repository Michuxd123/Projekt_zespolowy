// Plik: js/leaderboard.js

// Importuj bazę danych (db) z pliku konfiguracyjnego
import { db } from './firebaseConfig.js';
// Importy Firestore (CDN ESM)
// POPRAWKA: Usunięto zduplikowaną i błędną linię "mport..."
import { doc, getDoc, setDoc, collection, query, orderBy, limit, getDocs, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const USERS_COLLECTION = 'users'; // Dane użytkowników z maxScore

/**
 * Ustaw/aktualizuj maksymalny wynik użytkownika. Dokument po uid.
 * @param {string} uid - UID użytkownika z Firebase Auth
 * @param {string} nickname - Nick gracza
 * @param {number} newScore - Aktualny stan kasy (kandydat na max)
 */
export async function saveScore(uid, nickname, newScore) {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    const snap = await getDoc(userRef);
    let currentMax = 0;
    if (snap.exists()) {
      const data = snap.data();
      currentMax = typeof data.maxScore === 'number' ? data.maxScore : 0;
    }

    const updated = {
      uid,
      nickname,
      maxScore: Math.max(currentMax, newScore),
      updatedAt: new Date()
    };
    await setDoc(userRef, updated, { merge: true });
  } catch (e) {
    console.error('Błąd podczas zapisu maxScore:', e);
  }
}

/**
 * Pobiera 10 najlepszych użytkowników wg maxScore.
 * @returns {Promise<Array<{nickname:string, maxScore:number}>>}
 */
export async function getLeaderboard() {
  const q = query(
    collection(db, USERS_COLLECTION),
    where('maxScore', '>', 1000),
    orderBy('maxScore', 'desc'),
    limit(10)
  );
  const qs = await getDocs(q);
  const items = [];
  qs.forEach(docSnap => {
    const d = docSnap.data();
    items.push({ nickname: d.nickname, maxScore: d.maxScore ?? 0 });
  });
  return items;
}

/**
 * Renderuje listę rankingową do elementu o id 'leaderboard-list'.
 */
export async function renderLeaderboard() {
  const container = document.getElementById('leaderboard-list');
  if (!container) return;
  container.innerHTML = 'Ładowanie...';
  try {
    const rows = await getLeaderboard();
    if (!rows.length) {
      container.innerHTML = 'Brak wyników.';
      return;
    }
    const html = rows.map((r, i) => `<li>${i + 1}. ${r.nickname || 'Anonim'} — ${r.maxScore}</li>`).join('');
    container.innerHTML = `<ol>${html}</ol>`;
  } catch (e) {
    console.error(e);
    container.innerHTML = 'Błąd ładowania rankingu.';
  }
}
