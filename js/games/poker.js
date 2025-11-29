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
  btnCheck: document.getElementById('btn-check'),
  btnRaise: document.getElementById('btn-raise'),
  inputRaise: document.getElementById('raise-amount'),
  msg: document.getElementById('message-box'),
  nextBtn: document.getElementById('next-hand-btn')
};

if (els.startBtn) els.startBtn.addEventListener('click', initGame);
if (els.btnFold) els.btnFold.addEventListener('click', () => playerAction('fold'));
if (els.btnCheck) els.btnCheck.addEventListener('click', () => playerAction('check'));

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
  const stack = parseInt(els.inputStack.value);
  if (!stack || stack <= 0) return;
  players[0].money = stack;
  players[1].money = stack;
  minBet = Math.max(1, Math.floor(stack * 0.05));
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

  if (players[0].money < minBet || players[1].money < minBet) {
    if (players[0].money <= 0) alert('Przegrałeś grę!');
    else if (players[1].money <= 0) alert('Wygrałeś grę!');
    else alert('Koniec gry — brak środków na minimalny blind');
    
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

  const sbIndex = dealerIndex;
  const bbIndex = (dealerIndex + 1) % 2;
  const sb = Math.min(players[sbIndex].money, Math.floor(minBet / 2));
  const bb = Math.min(players[bbIndex].money, minBet);

  postToPot(sbIndex, sb);
  postToPot(bbIndex, bb);
  currentBet = bb;

  els.nextBtn.style.display = 'none';
  els.msg.textContent = `Nowe rozdanie. Dealer: ${players[dealerIndex].id}. SB: ${sb}, BB: ${bb}`;
  render();
  bettingRound(dealerIndex);
}

function postToPot(index, amount) {
  if (isNaN(amount)) amount = 0;
  players[index].money -= amount;
  players[index].contrib += amount;
  pot += amount;
  if (players[index].money === 0) players[index].allIn = true;
}

function getPostflopFirst() {
  return (dealerIndex + 1) % 2;
}

async function bettingRound(startIndex) {
  let toAct = startIndex;
  let lastAggressor = null;
  let acted = [false, false];

  if (players.every(p => p.allIn || p.folded)) {
    nextStage();
    return;
  }

  while (true) {
    if (players[toAct].folded || players[toAct].allIn) {
      acted[toAct] = true;
      if (bettingComplete(acted, lastAggressor)) break;
      toAct = 1 - toAct;
      continue;
    }

    if (players[toAct].id === 'Player') {
      const action = await waitForPlayerAction();
      
      if (action.type === 'fold') {
        players[toAct].folded = true;
        els.msg.textContent = 'Spasowałeś.';
        break;
      } else if (action.type === 'check') {
        if (players[toAct].contrib < currentBet) {
          const need = currentBet - players[toAct].contrib;
          doCall(toAct, need);
          els.msg.textContent = `Sprawdzasz ${need}`;
        } else {
          els.msg.textContent = 'Czekasz';
        }
        acted[toAct] = true;
      } else if (action.type === 'call') {
        const need = currentBet - players[toAct].contrib;
        doCall(toAct, need);
        els.msg.textContent = `Sprawdzasz ${Math.min(need, players[toAct].money + players[toAct].contrib)}`;
        acted[toAct] = true;
      } else if (action.type === 'raise') {
        const raiseAmt = action.amount;
        const minRaise = Math.max(minBet, currentBet);
        
        if (raiseAmt < minRaise) {
          els.msg.textContent = `Minimalna kwota to ${minRaise}`;
          continue;
        }
        
        const need = raiseAmt - players[toAct].contrib;
        if (need >= players[toAct].money) {
          pot += players[toAct].money;
          players[toAct].contrib += players[toAct].money;
          players[toAct].money = 0;
          players[toAct].allIn = true;
          currentBet = players[toAct].contrib;
          lastAggressor = toAct;
          acted[toAct] = true;
          els.msg.textContent = `All-in ${players[toAct].contrib}`;
        } else {
          doCall(toAct, need);
          currentBet = players[toAct].contrib;
          lastAggressor = toAct;
          acted = [false, false];
          acted[toAct] = true;
          els.msg.textContent = `Podbiłeś do ${currentBet}`;
        }
      }
    } else {
      await sleep(600);
      cpuDecision(toAct);
      if (players[toAct].folded) break;
      if (players[toAct].contrib > currentBet) {
        currentBet = players[toAct].contrib;
        lastAggressor = toAct;
        acted = [false, false];
        acted[toAct] = true;
      } else {
        acted[toAct] = true;
      }
    }

    render();
    if (bettingComplete(acted, lastAggressor)) break;
    toAct = 1 - toAct;
  }

  if (players.some(p => p.folded)) {
    const winner = players.find(p => !p.folded);
    winner.money += pot;
    els.msg.textContent = `${winner.id} wygrywa pulę ${pot} (spadek rywala).`;
    els.nextBtn.style.display = 'inline-block';
    gameActive = false;
    render();
    return;
  }

  nextStage();
}

function bettingComplete(acted, lastAggressor) {
  const contributionsEqual = players[0].contrib === players[1].contrib;
  if (players.some(p => p.allIn) && contributionsEqual) return true;
  if (acted[0] && acted[1] && contributionsEqual) return true;
  return false;
}

function doCall(index, amount) {
  if (isNaN(amount)) amount = 0;
  const actual = Math.min(amount, players[index].money);
  players[index].money -= actual;
  players[index].contrib += actual;
  pot += actual;
  if (players[index].money === 0) players[index].allIn = true;
}

let playerActionResolve = null;

function waitForPlayerAction() {
  enablePlayerControls(true);
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
  if (type === 'check') return playerActionResolve({ type: 'check' });
  if (type === 'call') return playerActionResolve({ type: 'call' });
  if (type === 'raise') return playerActionResolve({ type: 'raise', amount });
}

function cpuDecision(idx) {
  const cpu = players[idx];
  const hole = cpu.hand;
  const strength = quickHandEval([...hole, ...community]);
  const need = currentBet - cpu.contrib;

  if (need > 0) {
    if (cpu.money <= need) {
      doCall(idx, need);
      els.msg.textContent = 'Komputer idzie all-in (call).';
      return;
    }
    if (strength < 0.25 && need > minBet) {
      if (Math.random() < 0.7) {
        cpu.folded = true;
        els.msg.textContent = 'Komputer spasował.';
        return;
      } else {
        doCall(idx, need);
        els.msg.textContent = 'Komputer sprawdza (niepewnie).';
        return;
      }
    } else {
      if (strength > 0.75 && cpu.money > need + minBet) {
        const raiseTo = currentBet + minBet;
        const needRaise = raiseTo - cpu.contrib;
        doCall(idx, needRaise);
        els.msg.textContent = 'Komputer podbija!';
        return;
      } else {
        doCall(idx, need);
        els.msg.textContent = 'Komputer sprawdza.';
        return;
      }
    }
  } else {
    if (strength > 0.7 && cpu.money >= minBet) {
      const raiseTo = currentBet + minBet;
      const needRaise = raiseTo - cpu.contrib;
      doCall(idx, needRaise);
      currentBet = cpu.contrib;
      els.msg.textContent = 'Komputer zagrywa (bet).';
      return;
    } else {
      els.msg.textContent = 'Komputer czeka.';
      return;
    }
  }
}

function quickHandEval(cards) {
  const ranks = cards.map(c => c.rank);
  const suitsCount = {};
  const counts = {};
  ranks.forEach(r => counts[r] = (counts[r] || 0) + 1);
  cards.forEach(c => suitsCount[c.suit] = (suitsCount[c.suit] || 0) + 1);
  const maxCount = Math.max(...Object.values(counts));
  const flushPotential = Math.max(...Object.values(suitsCount)) >= 3 ? 0.2 : 0;
  const pairScore = (maxCount === 2 ? 0.2 : maxCount === 3 ? 0.5 : maxCount === 4 ? 0.9 : 0);
  const uniq = [...new Set(ranks)].sort((a, b) => a - b);
  let longest = 1, cur = 1;
  for (let i = 1; i < uniq.length; i++) {
    if (uniq[i] === uniq[i - 1] + 1) { cur++; longest = Math.max(longest, cur); }
    else cur = 1;
  }
  const straightScore = longest >= 3 ? 0.2 : 0;
  const highCard = Math.max(...ranks);
  const highScore = (highCard - 2) / 12 * 0.3;
  return Math.min(1, flushPotential + pairScore + straightScore + highScore);
}

function nextStage() {
  stage++;
  currentBet = 0;
  players.forEach(p => p.contrib = 0); 
  
  if (stage === 1) {
    community.push(dealCard(), dealCard(), dealCard());
    render();
    bettingRound(getPostflopFirst());
  } else if (stage === 2) {
    community.push(dealCard());
    render();
    bettingRound(getPostflopFirst());
  } else if (stage === 3) {
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
  const cmp = compareRankArrays(p0.rankArr, p1.rankArr);
  
  if (cmp > 0) {
    players[0].money += pot;
    els.msg.textContent = 'Wygrałeś rozdanie!';
  } else if (cmp < 0) {
    players[1].money += pot;
    els.msg.textContent = 'Komputer wygrywa rozdanie!';
  } else {
    players[0].money += Math.floor(pot / 2);
    players[1].money += Math.ceil(pot / 2);
    els.msg.textContent = 'Remis — podział puli.';
  }
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

function evaluateHand(cards) {
  const n = cards.length;
  let best = { category: -1, rankArr: [] };
  const comb = (start, chosen) => {
    if (chosen.length === 5) {
      const hand = chosen.map(i => cards[i]);
      const eva = evaluateFive(hand);
      if (eva.category > best.category || (eva.category === best.category && compareRankArrays(eva.rankArr, best.rankArr) > 0)) {
        best = eva;
      }
      return;
    }
    for (let i = start; i < n; i++) {
      chosen.push(i);
      comb(i + 1, chosen);
      chosen.pop();
    }
  };
  
  if (n <= 5) return evaluateFive(cards);
  comb(0, []);
  return best;
}

function evaluateFive(cards) {
  const ranks = cards.map(c => c.rank).sort((a, b) => b - a);
  const suitsCount = {};
  const counts = {};
  cards.forEach(c => {
    suitsCount[c.suit] = (suitsCount[c.suit] || 0) + 1;
    counts[c.rank] = (counts[c.rank] || 0) + 1;
  });
  const isFlush = Object.values(suitsCount).some(v => v === 5);
  let isStraight = false;
  let topStraight = 0;
  const uniq = [...new Set(ranks)].sort((a, b) => b - a);
  
  for (let i = 0; i <= uniq.length - 5; i++) {
    if (uniq[i] - uniq[i + 4] === 4) {
      isStraight = true;
      topStraight = uniq[i];
      break;
    }
  }

  if (!isStraight) {
    const setRanks = new Set(uniq);
    if (setRanks.has(14) && setRanks.has(5) && setRanks.has(4) && setRanks.has(3) && setRanks.has(2)) {
      isStraight = true;
      topStraight = 5;
    }
  }

  const pairs = [];
  let three = null;
  let four = null;
  for (const r in counts) {
    const c = counts[r];
    const rr = parseInt(r);
    if (c === 4) four = rr;
    if (c === 3) three = rr;
    if (c === 2) pairs.push(rr);
  }
  pairs.sort((a, b) => b - a);

  if (isFlush) {
    const flushSuit = Object.keys(suitsCount).find(s => suitsCount[s] === 5);
    if (flushSuit) {
      const flushRanks = cards.filter(c => c.suit === flushSuit).map(c => c.rank).sort((a, b) => b - a);
      const uniqF = [...new Set(flushRanks)];
      let sfFound = false;
      for (let i = 0; i <= uniqF.length - 5; i++) {
        if (uniqF[i] - uniqF[i + 4] === 4) {
          sfFound = true;
          topStraight = uniqF[i];
          break;
        }
      }
      if (!sfFound) {
        const setF = new Set(uniqF);
        if (setF.has(14) && setF.has(5) && setF.has(4) && setF.has(3) && setF.has(2)) {
          sfFound = true; topStraight = 5;
        }
      }
      if (sfFound) return { category: 8, rankArr: [topStraight] };
    }
  }

  if (four) {
    const kicker = ranks.filter(r => r !== four)[0];
    return { category: 7, rankArr: [four, kicker] };
  }

  if (three && pairs.length >= 1) {
    return { category: 6, rankArr: [three, pairs[0]] };
  }

  if (isFlush) {
    return { category: 5, rankArr: ranks.slice() };
  }

  if (isStraight) {
    return { category: 4, rankArr: [topStraight] };
  }

  if (three) {
    const kickers = ranks.filter(r => r !== three).slice(0, 2);
    return { category: 3, rankArr: [three, ...kickers] };
  }

  if (pairs.length >= 2) {
    const kicker = ranks.filter(r => r !== pairs[0] && r !== pairs[1])[0];
    return { category: 2, rankArr: [pairs[0], pairs[1], kicker] };
  }

  if (pairs.length === 1) {
    const kickers = ranks.filter(r => r !== pairs[0]).slice(0, 3);
    return { category: 1, rankArr: [pairs[0], ...kickers] };
  }

  return { category: 0, rankArr: ranks.slice(0, 5) };
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

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }