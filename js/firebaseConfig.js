// Plik: js/firebaseConfig.js
// Używamy pełnych linków URL (CDN) dla modułów Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyB8FBAEZhuySlc2-kl59x6A_AXpXBVyZGw",
    authDomain: "kasyno-pz.firebaseapp.com",
    projectId: "kasyno-pz",
    storageBucket: "kasyno-pz.firebasestorage.app",
    messagingSenderId: "807989334521",
    appId: "1:807989334521:web:dbab97a4955bf7cb5ced28"
  };
// ----------------------------------------------------

// Inicjalizuj Firebase
const app = initializeApp(firebaseConfig);

// Eksportuj usługi, których potrzebujesz w innych plikach
export const db = getFirestore(app);
export const auth = getAuth(app);

// Eksportuj konkretne funkcje logowania, aby ułatwić ich użycie
export { signInAnonymously, onAuthStateChanged, signOut };