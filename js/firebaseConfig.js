// Plik: js/firebaseConfig.js
// Używamy pełnych linków URL (CDN) dla modułów Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
// POPRAWKA 1: Dodano import doc, getDoc, setDoc, które są używane w funkcjach na dole
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyB8FBAEZhuySlc2-kl59x6A_AXpXBVyZGw",
    authDomain: "kasyno-pz.firebaseapp.com",
    projectId: "kasyno-pz",
    storageBucket: "kasyno-pz.firebasestorage.app",
    messagingSenderId: "807989334521",
    appId: "1:807989334521:web:dbab97a4955bf7cb5ced28"
};

// ----------------------------------------------------

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);
const auth = getAuth(app);

async function getUserMoney(uid) {
    if (!uid) return null;
    try {
        const docRef = doc(db, "users", uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data().money;
        } else {
            return null;
        }
    } catch (error) {
        console.error("Błąd pobierania pieniędzy:", error);
        return null;
    }
}

async function updateUserMoney(uid, amount) {
    if (!uid) return;
    try {
        const docRef = doc(db, "users", uid);
        await setDoc(docRef, { money: amount }, { merge: true });
    } catch (error) {
        console.error("Błąd aktualizacji pieniędzy:", error);
    }
}

export { 
    auth, 
    db, 
    signInAnonymously, 
    onAuthStateChanged, 
    signOut, 
    getUserMoney, 
    updateUserMoney 
};