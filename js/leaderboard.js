import { db } from './firebaseConfig.js';
import { collection, query, orderBy, limit, getDocs, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
export async function saveScore(uid, nickname, money) {
    try {
        const userRef = doc(db, "users", uid);
        await setDoc(userRef, {
            username: nickname,  
            money: Number(money) 
        }, { merge: true });

        console.log(`[Leaderboard] Zapisano wynik: ${nickname} - ${money}$`);
    } catch (error) {
        console.error("Błąd zapisu do Firebase (sprawdź AdBlocka/Antywirusa):", error);
    }
}

export function renderLeaderboard() {
    loadLeaderboard();
}

export async function loadLeaderboard() {
    const listContainer = document.getElementById('leaderboard-list');
    
    if (!listContainer) return;

    listContainer.innerHTML = '<p style="text-align:center; color:#888;">Ładowanie rankingu...</p>';

    try {
        const q = query(collection(db, "users"), orderBy("money", "desc"), limit(50));
        const querySnapshot = await getDocs(q);
        
        let leaderboardData = [];
        let uzyteNazwy = []; 
        
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            let rawMoney = data.money !== undefined ? data.money : data.cash;
            let safeMoney = Number(rawMoney);
            if (isNaN(safeMoney)) safeMoney = 0;
            let safeName = data.username || data.nickname || "Anonim";
            if (safeName.length > 15) {
                return; 
            }
            if (uzyteNazwy.includes(safeName)) {
                return; 
            }
            if (safeMoney <= 0) {
                return; 
            }
            uzyteNazwy.push(safeName);
            
            leaderboardData.push({
                username: safeName,
                money: safeMoney
            });
        });
        leaderboardData.sort((a, b) => b.money - a.money);

        
        const top10 = leaderboardData.slice(0, 10);

        renderLeaderboardTable(top10);

    } catch (error) {
        console.error("Błąd pobierania rankingu:", error);
        listContainer.innerHTML = '<p style="color:red; text-align:center;">Błąd ładowania.</p>';
    }
}

function renderLeaderboardTable(data) {
    const listContainer = document.getElementById('leaderboard-list');
    
    if (!data || data.length === 0) {
        listContainer.innerHTML = '<p style="text-align:center; color:#888;">Brak wyników w rankingu.</p>';
        return;
    }

    let html = `
        <table class="leaderboard-table">
            <thead>
                <tr>
                    <th width="10%">#</th>
                    <th width="60%">Gracz</th>
                    <th width="30%" class="text-right">Kasa ($)</th>
                </tr>
            </thead>
            <tbody>
    `;

    data.forEach((entry, index) => {
        const rank = index + 1;
        let rankClass = '';
        
        if (rank === 1) rankClass = 'rank-1';
        else if (rank === 2) rankClass = 'rank-2';
        else if (rank === 3) rankClass = 'rank-3';

        html += `
            <tr>
                <td class="${rankClass}">${rank}</td>
                <td class="${rankClass}">${entry.username}</td>
                <td class="text-right ${rankClass}">${entry.money} $</td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    listContainer.innerHTML = html;
}


document.addEventListener('DOMContentLoaded', () => {
    const rankBtn = document.querySelector('[data-view="leaderboard"]');
    if(rankBtn) {
        rankBtn.addEventListener('click', () => {
            loadLeaderboard();
        });
    }
});