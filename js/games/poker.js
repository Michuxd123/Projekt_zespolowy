import { updateUserMoney } from '../firebaseConfig.js';
import * as UI from '../ui.js';

const suits = ['H', 'D', 'C', 'S'];
const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const valueToRank = v => values.indexOf(v) + 2;

let deck = [];
let deckIndex = 0;

let players = [
  { id: 'Player', money: 0, hand: [], contrib: 0, folded: false, allIn: false },
  { id: 'CPU', money: 0, hand: [], contrib: 0, folded: false, allIn: false }
];

let dealerIndex = 0;
let community = [];
let pot = 0;
let minBet = 0;
let currentBet = 0;
let stage = 0;
let gameActive = false;

const els = {
  setup: document.getElementById('setup-screen'),
  table: document.getElementById('game-table'),
  inputStack: document.getElementById('initial-stack'),
  startBtn: document.getElementById('start-game-btn'),
  playerMoney: document.getElementById('player-money'),
  cpuMoney: document.getElementById('cpu-money'),
  pot: document.getElementById('pot'),
  minBet: document.getElementById('min-bet'),
  playerCards: document.getElementById('player-cards'),
  cpuCards: document.getElementById('cpu-cards'),
  commCards: document.getElementById('community-cards'),
  btnFold: document.getElementById('btn-fold'),
  btnCheck: document.getElementById('btn-check'), // To jest przycisk Check/Call
  btnRaise: document.getElementById('btn-raise'),
  inputRaise: document.getElementById('raise-amount'),
  msg: document.getElementById('message-box'),
  nextBtn: document.getElementById('next-hand-btn')
};

if (els.startBtn) els.startBtn.addEventListener('click', initGame);
if (els.btnFold) els.btnFold.addEventListener('click', () => playerAction('fold'));
// Jeden przycisk obsługuje Check i Call zależnie od sytuacji
if (els.btnCheck) els.btnCheck.addEventListener('click', () => playerAction('check_call'));

if (els.btnRaise) els.btnRaise.addEventListener('click', () => {
  let amt = parseInt(els.inputRaise.value);
  if (isNaN(amt) || amt <= 0) {
    els.msg.textContent = 'Wpisz poprawną kwotę podbicia.';
    return;
  }
  playerAction('raise', amt);
});

if (els.nextBtn) els.nextBtn.addEventListener('click', startRound);

function initGame() {
  const userStr = localStorage.getItem("casinoUser");
  if (!userStr) {
    alert("Musisz być zalogowany, aby grać!");
    return;
  }
  const user = JSON.parse(userStr);
  const myMoney = user.money;

  if (myMoney < 10) {
    alert("Masz za mało środków (" + myMoney + "$). Minimum to 10$.");
    return;
  }

  // Ustawienie początkowe pieniędzy
  players[0].money = myMoney;
  players[1].money = myMoney; // CPU ma tyle samo dla balansu
  
  // Dynamiczne ustalanie stawek
  if (myMoney >= 1000) minBet = 50;
  else if (myMoney >= 100) minBet = 20;
  else minBet = 10;
  
  els.setup.style.display = 'none';
  els.table.style.display = 'flex';
  render();
  startRound();
}

function createDeck() {
  deck = [];
  for (let s of suits) {
    for (let v of values) {
      deck.push({ suit: s, value: v, rank: valueToRank(v) });
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  deckIndex = 0;
}

function dealCard() {
  return deck[deckIndex++];
}

function startRound() {
  dealerIndex = (dealerIndex + 1) % 2;

  // Sprawdzenie bankructwa
  if (players[0].money < minBet) {
    alert('Brak środków na grę!');
    gameActive = false;
    saveGameResult(); // Zapisujemy stan (nawet jak jest 0)
    els.table.style.display = 'none';
    els.setup.style.display = 'block';
    return;
  }

  createDeck();
  community = [];
  pot = 0;
  currentBet = 0;
  stage = 0;
  gameActive = true;

  players.forEach(p => {
    p.hand = [dealCard(), dealCard()];
    p.contrib = 0;
    p.folded = false;
    p.allIn = false;
  });

  // Blindy
  const sbIndex = dealerIndex;
  const bbIndex = (dealerIndex + 1) % 2;
  const sb = Math.min(players[sbIndex].money, Math.floor(minBet / 2));
  const bb = Math.min(players[bbIndex].money, minBet);

  postToPot(sbIndex, sb);
  postToPot(bbIndex, bb);
  currentBet = bb;

  els.nextBtn.style.display = 'none';
  els.msg.textContent = `Dealer: ${players[dealerIndex].id}. SB: ${sb}, BB: ${bb}`;
  
  // Aktualizacja UI od razu po blindach
  render();
  
  // Rozpoczęcie licytacji
  bettingRound(dealerIndex); // Dealer zaczyna (Small Blind) preflop w heads-up
}

function postToPot(index, amount) {
  if (isNaN(amount) || amount <= 0) return;
  const actual = Math.min(amount, players[index].money);
  players[index].money -= actual;
  players[index].contrib += actual;
  pot += actual;
  if (players[index].money <= 0) {
    players[index].money = 0;
    players[index].allIn = true;
  }
}

function getPostflopFirst() {
  return (dealerIndex + 1) % 2; // Po flopie pierwszy gra ten, kto nie jest dealerem (Big Blind)
}

async function bettingRound(startIndex) {
  // Szybki check na koniec gry przed startem rundy
  if (players.some(p => p.folded)) { resolveFold(); return; }
  
  // Auto-run dla All-in
  const everyoneAllIn = players[0].allIn || players[1].allIn;
  const contribsEqual = players[0].contrib === players[1].contrib;
  if (everyoneAllIn && contribsEqual) {
    await sleep(1000);
    nextStage();
    return;
  }

  let toAct = startIndex;
  let acted = [false, false]; // Flagi: czy gracz podjął decyzję w tej turze licytacji

  while (true) {
    // 1. WARUNKI WYJŚCIA Z PĘTLI
    const isEqual = players[0].contrib === players[1].contrib;
    const bothHaveActed = acted[0] && acted[1];
    const anyAllIn = players.some(p => p.allIn);

    // Jeśli stawki równe i (obaj zagrali LUB jeden jest all-in) -> koniec rundy
    if (isEqual && (bothHaveActed || anyAllIn)) {
      break;
    }
    
    // Specjalny przypadek All-in: jeśli jeden all-in, a drugi wyrównał -> koniec
    if (players[0].allIn && players[1].contrib >= players[0].contrib) break;
    if (players[1].allIn && players[0].contrib >= players[1].contrib) break;


    // 2. POMIJANIE GRACZY (Fold/All-in)
    if (players[toAct].folded || players[toAct].allIn) {
      acted[toAct] = true;
      toAct = 1 - toAct;
      continue;
    }

    // 3. RUCH GRACZA
    if (players[toAct].id === 'Player') {
      // Aktualizacja tekstu przycisku Check/Call
      const diff = currentBet - players[toAct].contrib;
      if (els.btnCheck) els.btnCheck.textContent = diff > 0 ? `Call (${diff})` : "Check";

      const action = await waitForPlayerAction();
      
      if (action.type === 'fold') {
        players[toAct].folded = true;
        resolveFold();
        return;
      } 
      else if (action.type === 'call_check') {
        const need = currentBet - players[toAct].contrib;
        if (need > 0) {
            doCall(toAct, need);
            els.msg.textContent = 'Sprawdzasz (Call)';
        } else {
            els.msg.textContent = 'Czekasz (Check)';
        }
        acted[toAct] = true;
      } 
      else if (action.type === 'raise') {
        const raiseAmt = action.amount; // To jest kwota CAŁKOWITA (np. podbijam DO 100)
        const need = raiseAmt - players[toAct].contrib;
        
        // Obsługa braku środków na pełny raise (All-in)
        if (need >= players[toAct].money) {
           const allInAmt = players[toAct].money; 
           doCall(toAct, allInAmt);
           // Ustawiamy currentBet na najwyższą wartość na stole
           if (players[toAct].contrib > currentBet) currentBet = players[toAct].contrib;
           players[toAct].allIn = true;
           els.msg.textContent = `All-in! (${players[toAct].contrib}$)`;
        } else {
           doCall(toAct, need);
           currentBet = players[toAct].contrib;
           els.msg.textContent = `Podbiłeś do ${currentBet}$`;
        }
        
        // WAŻNE: Po podbiciu (Raise), resetujemy flagi, bo drugi gracz musi odpowiedzieć!
        acted = [false, false]; 
        acted[toAct] = true; 
      }
    } 
    // 4. RUCH KOMPUTERA
    else {
      await sleep(1000);
      cpuDecision(toAct);
      
      if (players[toAct].folded) {
        resolveFold();
        return;
      }
      
      // Jeśli komputer przebił (Raise)
      if (players[toAct].contrib > currentBet) {
        currentBet = players[toAct].contrib;
        // Reset flag, gracz musi odpowiedzieć
        acted = [false, false];
      }
      acted[toAct] = true;
    }

    render();
    toAct = 1 - toAct; // Zmiana tury
  }

  nextStage();
}

function resolveFold() {
  const winner = players.find(p => !p.folded);
  if (winner) {
    winner.money += pot;
    els.msg.textContent = `${winner.id} wygrywa pulę (rywal spasował).`;
    
    // ZAPISZ WYNIK PO WYGRANEJ
    saveGameResult();
    
    els.nextBtn.style.display = 'inline-block';
    gameActive = false;
    render();
  }
}

function doCall(index, amount) {
  if (isNaN(amount) || amount <= 0) return;
  const actual = Math.min(amount, players[index].money);
  players[index].money -= actual;
  players[index].contrib += actual;
  pot += actual;
  if (players[index].money <= 0) {
    players[index].money = 0;
    players[index].allIn = true;
  }
}

let playerActionResolve = null;

function waitForPlayerAction() {
  enablePlayerControls(true);
  
  // Blokada Raise jeśli przeciwnik jest All-in
  if (players[1].allIn) {
      if(els.btnRaise) els.btnRaise.disabled = true;
      if(els.inputRaise) els.inputRaise.disabled = true;
  }

  return new Promise(resolve => {
    playerActionResolve = res => {
      enablePlayerControls(false);
      resolve(res);
      playerActionResolve = null;
    };
  });
}

function playerAction(type, amount = 0) {
  if (!playerActionResolve) return;
  
  if (type === 'fold') return playerActionResolve({ type: 'fold' });
  
  // Obsługa jednego przycisku Check/Call
  if (type === 'check_call') {
     return playerActionResolve({ type: 'call_check' });
  }

  // Obsługa Raise
  if (type === 'raise') {
    const minRaise = currentBet + minBet;
    // Pozwalamy na raise mniejszy niż min, jeśli to All-in (kwota z inputa vs money)
    if (amount < minRaise && amount < (players[0].money + players[0].contrib)) {
       els.msg.textContent = `Minimum do: ${minRaise}$`;
       return;
    }
    return playerActionResolve({ type: 'raise', amount });
  }
}

function cpuDecision(idx) {
  const cpu = players[idx];
  const hole = cpu.hand;
  const strength = quickHandEval([...hole, ...community]);
  const need = currentBet - cpu.contrib;

  // Jeśli musi dorzucić do puli (Call/All-in/Fold)
  if (need > 0) {
    // Jeśli nie ma tyle kasy -> All-in
    if (cpu.money <= need) {
      doCall(idx, cpu.money);
      els.msg.textContent = 'Komputer idzie All-in (Call).';
      return;
    }
    
    // Jeśli słaba karta i duży bet -> Fold (chyba że bet mały)
    if (strength < 0.25 && need > (minBet * 2)) {
      if (Math.random() < 0.8) {
        cpu.folded = true;
        els.msg.textContent = 'Komputer pasuje.';
        return;
      }
    }
    
    // Jeśli silna karta -> Raise
    if (strength > 0.7 && cpu.money >= (need + minBet)) {
        // Raise o minBet
        const raiseTarget = currentBet + minBet;
        const raiseAmt = raiseTarget - cpu.contrib;
        doCall(idx, raiseAmt);
        els.msg.textContent = 'Komputer podbija!';
    } else {
        // Standardowy Call
        doCall(idx, need);
        els.msg.textContent = 'Komputer sprawdza.';
    }
  } 
  // Jeśli nikt nie podbił (Check/Bet)
  else {
    if (strength > 0.6) {
        // Bet
        doCall(idx, minBet);
        currentBet = cpu.contrib;
        els.msg.textContent = `Komputer zagrywa ${minBet}$.`;
    } else {
        // Check
        els.msg.textContent = 'Komputer czeka.';
    }
  }
}

function quickHandEval(cards) {
  const ranks = cards.map(c => c.rank);
  const suitsCount = {};
  ranks.forEach(r => {}); // dummy iter
  cards.forEach(c => suitsCount[c.suit] = (suitsCount[c.suit] || 0) + 1);
  
  const counts = {};
  ranks.forEach(r => counts[r] = (counts[r] || 0) + 1);
  const maxCount = Math.max(...Object.values(counts));
  
  const flushVal = Math.max(...Object.values(suitsCount)) >= 3 ? 0.2 : 0;
  const pairVal = (maxCount === 2 ? 0.2 : maxCount === 3 ? 0.5 : maxCount === 4 ? 0.9 : 0);
  const highVal = (Math.max(...ranks) - 2) / 12 * 0.3;
  
  return Math.min(1, flushVal + pairVal + highVal);
}

function nextStage() {
  stage++;
  currentBet = 0;
  players.forEach(p => p.contrib = 0);
  
  if (stage === 1) { // Flop
    community.push(dealCard(), dealCard(), dealCard());
    render();
    bettingRound(getPostflopFirst());
  } else if (stage === 2) { // Turn
    community.push(dealCard());
    render();
    bettingRound(getPostflopFirst());
  } else if (stage === 3) { // River
    community.push(dealCard());
    render();
    bettingRound(getPostflopFirst());
  } else {
    showdown();
  }
}

function showdown() {
  gameActive = false;
  const p0 = evaluateHand([...players[0].hand, ...community]);
  const p1 = evaluateHand([...players[1].hand, ...community]);
  
  let cmp = 0;
  if (p0.category > p1.category) cmp = 1;
  else if (p0.category < p1.category) cmp = -1;
  else cmp = compareRankArrays(p0.rankArr, p1.rankArr);
  
  if (cmp > 0) {
    players[0].money += pot;
    els.msg.textContent = 'Wygrałeś rozdanie!';
  } else if (cmp < 0) {
    players[1].money += pot;
    els.msg.textContent = 'Komputer wygrywa rozdanie!';
  } else {
    const half = Math.floor(pot / 2);
    players[0].money += half;
    players[1].money += (pot - half);
    els.msg.textContent = 'Remis — podział puli.';
  }
  
  // ZAPISZ WYNIK PO SHOWDOWN
  saveGameResult();

  els.nextBtn.style.display = 'inline-block';
  render();
}

function compareRankArrays(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const ai = a[i] || 0, bi = b[i] || 0;
    if (ai > bi) return 1;
    if (ai < bi) return -1;
  }
  return 0;
}

// Uproszczona ewaluacja dla czytelności (nie zmieniana logika samej oceny)
function evaluateHand(cards) {
  const n = cards.length;
  if (n < 5) return { category: 0, rankArr: [] }; 
  // Brute force combinatorics (5 z 7)
  let best = { category: -1, rankArr: [] };
  
  const getCombos = (pool, k) => {
      if (k === 0) return [[]];
      if (pool.length === 0) return [];
      const first = pool[0];
      const rest = pool.slice(1);
      const withFirst = getCombos(rest, k-1).map(c => [first, ...c]);
      const withoutFirst = getCombos(rest, k);
      return [...withFirst, ...withoutFirst];
  };

  const combos = getCombos(cards, 5);
  combos.forEach(hand => {
      const ev = evaluateFive(hand);
      if (ev.category > best.category || (ev.category === best.category && compareRankArrays(ev.rankArr, best.rankArr) > 0)) {
          best = ev;
      }
  });
  return best;
}

function evaluateFive(cards) {
  const ranks = cards.map(c => c.rank).sort((a, b) => b - a);
  const suits = cards.map(c => c.suit);
  
  const isFlush = suits.every(s => s === suits[0]);
  
  let isStraight = true;
  for(let i=0; i<4; i++) {
      if (ranks[i] - ranks[i+1] !== 1) isStraight = false;
  }
  // Wheel A-5
  if (!isStraight && ranks[0]===14 && ranks[1]===5 && ranks[2]===4 && ranks[3]===3 && ranks[4]===2) {
      isStraight = true;
      // move Ace to end for ranking? In this logic simple ranking is mostly fine, but let's treat top card as 5
      // For simplified comparing, we just need to know it's a straight.
  }

  const counts = {};
  ranks.forEach(r => counts[r] = (counts[r]||0)+1);
  const vals = Object.values(counts);
  
  const is4 = vals.includes(4);
  const is3 = vals.includes(3);
  const pairs = vals.filter(v => v===2).length;

  if (isFlush && isStraight) return { category: 8, rankArr: ranks };
  if (is4) {
      const fourRank = parseInt(Object.keys(counts).find(r => counts[r]===4));
      const kicker = ranks.find(r => r !== fourRank);
      return { category: 7, rankArr: [fourRank, kicker] };
  }
  if (is3 && pairs >= 1) {
      const threeRank = parseInt(Object.keys(counts).find(r => counts[r]===3));
      const pairRank = parseInt(Object.keys(counts).find(r => counts[r]===2));
      return { category: 6, rankArr: [threeRank, pairRank] };
  }
  if (isFlush) return { category: 5, rankArr: ranks };
  if (isStraight) return { category: 4, rankArr: ranks };
  if (is3) {
      const threeRank = parseInt(Object.keys(counts).find(r => counts[r]===3));
      const kickers = ranks.filter(r => r !== threeRank);
      return { category: 3, rankArr: [threeRank, ...kickers] };
  }
  if (pairs === 2) {
      const pairRanks = Object.keys(counts).filter(r => counts[r]===2).map(Number).sort((a,b)=>b-a);
      const kicker = ranks.find(r => !pairRanks.includes(r));
      return { category: 2, rankArr: [...pairRanks, kicker] };
  }
  if (pairs === 1) {
      const pairRank = parseInt(Object.keys(counts).find(r => counts[r]===2));
      const kickers = ranks.filter(r => r !== pairRank);
      return { category: 1, rankArr: [pairRank, ...kickers] };
  }
  return { category: 0, rankArr: ranks };
}

function render() {
  els.playerMoney.textContent = isNaN(players[0].money) ? 0 : players[0].money;
  els.cpuMoney.textContent = isNaN(players[1].money) ? 0 : players[1].money;
  els.pot.textContent = pot;
  els.minBet.textContent = minBet;

  els.playerCards.innerHTML = '';
  players[0].hand.forEach(c => els.playerCards.appendChild(createCardEl(c)));

  els.cpuCards.innerHTML = '';
  players[1].hand.forEach(c => {
    if (gameActive) {
      const d = document.createElement('div');
      d.className = 'card back';
      els.cpuCards.appendChild(d);
    } else {
      els.cpuCards.appendChild(createCardEl(c));
    }
  });

  els.commCards.innerHTML = '';
  community.forEach(c => els.commCards.appendChild(createCardEl(c)));
}

function createCardEl(card) {
  const div = document.createElement('div');
  div.className = 'card';
  const img = document.createElement('img');
  img.src = `js/games/cards/${card.value}${card.suit}.png`;
  img.onerror = () => { img.src = 'js/games/cards/back.png'; };
  div.appendChild(img);
  return div;
}

function enablePlayerControls(enable) {
  if (els.btnFold) els.btnFold.disabled = !enable;
  if (els.btnCheck) els.btnCheck.disabled = !enable;
  if (els.btnRaise) els.btnRaise.disabled = !enable;
  if (els.inputRaise) els.inputRaise.disabled = !enable;
  if (!enable && els.inputRaise) els.inputRaise.value = '';
}

function sleep(ms) { 
  return new Promise(r => setTimeout(r, ms)); 
}

// Funkcja zapisu
async function saveGameResult() {
  const userStr = localStorage.getItem("casinoUser");
  if (!userStr) return;
  const user = JSON.parse(userStr);
  
  // Zapisujemy aktualny stan gracza
  const moneyToSave = players[0].money;
  
  await updateUserMoney(user.uid, moneyToSave);
  user.money = moneyToSave;
  localStorage.setItem("casinoUser", JSON.stringify(user));
  UI.updateHeader(user.name, moneyToSave);
}