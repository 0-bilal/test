/**
 * game-xo.js — إكس–أو السريع (Speed X-O) بين جهازَي iPad
 * ────────────────────────────────────────────────────────────────────────
 * إكس-أو التقليدية لكن بعدّاد ٣ ثوانٍ لكل حركة: إن لم يلعب اللاعب في الوقت
 * يُنقل الدور فوراً للطرف الآخر.
 *
 * التزامن عبر DuoConnect (Firebase). الجهاز الذي يضغط «العب الآن» يصبح
 * «المضيف» ويملك لوحة اللعب الرسمية والعدّاد ويحسم النتائج؛ الطرف الآخر
 * يرسل حركاته للمضيف ويعرض الحالة التي يبثّها.
 *
 * الأدوار: يسار = X ، يمين = O. X يبدأ.
 * الرسائل: { t:'xo', c:'...' , ... }
 */
(function () {
  'use strict';

  const $ = id => document.getElementById(id);

  const MOVE_MS = 3000;   // ٣ ثوانٍ لكل حركة
  const OVER_HOLD = 300;  // مهلة بسيطة قبل بثّ النهاية

  const WIN_LINES = [
    [0,1,2],[3,4,5],[6,7,8],   // صفوف
    [0,3,6],[1,4,7],[2,5,8],   // أعمدة
    [0,4,8],[2,4,6],           // أقطار
  ];

  /* ── الحالة ── */
  let active   = false;
  let isHost   = false;
  let myRole   = 'left';
  let peerRole = 'right';
  let board    = Array(9).fill('');
  let turn     = 'left';           // دور من (left=X تبدأ)
  let status   = 'idle';           // idle | playing | over
  let winner   = null;             // role | 'none' | null
  let winLine  = null;
  let scores   = { left: 0, right: 0 };
  let turnTimer = null;

  const symbolOf = role => (role === 'left' ? 'X' : 'O');

  /* ════════════════════════════════════════════════════
     أدوات
  ════════════════════════════════════════════════════ */
  function myRoleFromPairing() {
    const r = (localStorage.getItem('duo_pair_role') || 'left').trim();
    return (r === 'right') ? 'right' : 'left';
  }
  function send(obj) {
    if (window.DuoConnect) return window.DuoConnect.send(Object.assign({ t: 'xo' }, obj));
    return false;
  }
  const other = r => (r === 'left' ? 'right' : 'left');

  function _hint(msg) {
    const h = $('xo-slide-hint');
    if (h) { h.textContent = msg; h.classList.add('show'); setTimeout(() => h.classList.remove('show'), 4000); }
  }

  /* ════════════════════════════════════════════════════
     بناء اللوحة
  ════════════════════════════════════════════════════ */
  function buildBoard() {
    const b = $('xo-board'); if (!b) return;
    b.innerHTML = '';
    for (let i = 0; i < 9; i++) {
      const cell = document.createElement('button');
      cell.className = 'xo-cell';
      cell.dataset.i = i;
      cell.addEventListener('click', () => xoTap(i));
      b.appendChild(cell);
    }
  }

  /* ════════════════════════════════════════════════════
     فتح / إغلاق
  ════════════════════════════════════════════════════ */
  function openOverlay() {
    const ov = $('xo-overlay'); if (!ov) return;
    if (!$('xo-board').children.length) buildBoard();
    ov.classList.add('active');
    active = true;
    if (typeof pauseAutoScroll === 'function') pauseAutoScroll();
  }
  function closeOverlay() {
    const ov = $('xo-overlay'); if (!ov) return;
    ov.classList.remove('active');
    active = false;
    _clearTurnTimer();
    hideResult();
  }
  function _clearTurnTimer() { clearTimeout(turnTimer); turnTimer = null; }

  /* ════════════════════════════════════════════════════
     بدء اللعبة
  ════════════════════════════════════════════════════ */
  function launchXO() {
    myRole   = myRoleFromPairing();
    peerRole = other(myRole);

    const st = window.DuoConnect && window.DuoConnect.status ? window.DuoConnect.status().state : 'idle';
    if (st !== 'connected') { _hint('الجهاز الآخر غير متصل — تأكّد من الربط أولاً.'); return; }

    isHost = true;
    scores = { left: 0, right: 0 };
    _hostNewGame(true);
    send({ c: 'open' });
  }
  window.launchXO = launchXO;

  function _hostNewGame(first) {
    board  = Array(9).fill('');
    turn   = 'left';               // X يبدأ دائماً
    status = 'playing';
    winner = null; winLine = null;
    openOverlay();
    hideResult();
    _broadcastState(false);
    _startTurnTimer();
  }

  /* ════════════════════════════════════════════════════
     المضيف: عدّاد الدور
  ════════════════════════════════════════════════════ */
  function _startTurnTimer() {
    if (!isHost) return;
    _clearTurnTimer();
    turnTimer = setTimeout(() => {
      // انتهى الوقت → انقل الدور فوراً
      if (status !== 'playing') return;
      turn = other(turn);
      _broadcastState(true);   // skipped = true
      _startTurnTimer();
    }, MOVE_MS);
  }

  /* ════════════════════════════════════════════════════
     المضيف: تطبيق حركة
  ════════════════════════════════════════════════════ */
  function _hostApplyMove(cell, role) {
    if (!isHost || status !== 'playing') return;
    if (role !== turn) return;         // ليس دوره
    if (board[cell]) return;           // خانة مشغولة

    board[cell] = symbolOf(role);
    _clearTurnTimer();

    const line = _checkWin(board);
    if (line) {
      status = 'over'; winner = role; winLine = line;
      scores[role] = (scores[role] || 0) + 1;
      _broadcastState(false);
    } else if (board.every(c => c)) {
      status = 'over'; winner = 'none'; winLine = null;
      _broadcastState(false);
    } else {
      turn = other(turn);
      _broadcastState(false);
      _startTurnTimer();
    }
  }

  function _checkWin(bd) {
    for (const ln of WIN_LINES) {
      const [a,b,c] = ln;
      if (bd[a] && bd[a] === bd[b] && bd[a] === bd[c]) return ln;
    }
    return null;
  }

  /* بثّ الحالة الكاملة للطرفين */
  function _broadcastState(skipped) {
    const state = { c: 'state', board, turn, status, winner, winLine, scores, skipped: !!skipped };
    send(state);
    _applyState(state);
  }

  /* ════════════════════════════════════════════════════
     الضغط على خانة
  ════════════════════════════════════════════════════ */
  function xoTap(cell) {
    if (!active || status !== 'playing') return;
    if (turn !== myRole) { _flashTurn(); return; }   // ليس دورك
    if (board[cell]) return;

    if (isHost) _hostApplyMove(cell, myRole);
    else        send({ c: 'move', cell, role: myRole });
  }
  window.xoTap = xoTap;

  function _flashTurn() {
    const t = $('xo-turn');
    if (t) { t.classList.remove('shake'); void t.offsetWidth; t.classList.add('shake'); }
  }

  /* ════════════════════════════════════════════════════
     عرض الحالة (على الجهازين)
  ════════════════════════════════════════════════════ */
  function _applyState(s) {
    board   = s.board || board;
    turn    = s.turn;
    status  = s.status;
    winner  = s.winner;
    winLine = s.winLine;
    scores  = s.scores || scores;

    // اللوحة
    const cells = document.querySelectorAll('#xo-board .xo-cell');
    cells.forEach((cell, i) => {
      const v = board[i] || '';
      cell.textContent = v;
      cell.classList.toggle('x', v === 'X');
      cell.classList.toggle('o', v === 'O');
      cell.classList.toggle('filled', !!v);
      cell.classList.toggle('win', !!(winLine && winLine.includes(i)));
      const myTurn = (status === 'playing' && turn === myRole);
      cell.classList.toggle('playable', myTurn && !v);
    });

    // النقاط
    const you = $('xo-score-you'), opp = $('xo-score-opp');
    if (you) you.textContent = scores[myRole] || 0;
    if (opp) opp.textContent = scores[peerRole] || 0;

    // مؤشّر الدور + العدّاد
    if (status === 'playing') {
      hideResult();          // أخفِ لوحة نتيجة الجولة السابقة (على الجهازين)
      _renderTurn();
      _restartTimerBar();
    } else if (status === 'over') {
      _clearTurnTimer();
      _showOver();
    }
  }

  function _renderTurn() {
    const t = $('xo-turn'); if (!t) return;
    const mine = (turn === myRole);
    t.textContent = mine ? `دورك (${symbolOf(myRole)})` : `دور المنافس (${symbolOf(peerRole)})`;
    t.classList.toggle('mine', mine);
    t.classList.toggle('theirs', !mine);
  }

  /* شريط العدّاد — يعيد التشغيل مع كل دور (٣ ثوانٍ) */
  function _restartTimerBar() {
    const fill = $('xo-timer-fill'); if (!fill) return;
    const mine = (turn === myRole);
    fill.style.transition = 'none';
    fill.style.width = '100%';
    fill.style.background = mine
      ? 'linear-gradient(90deg,#16a34a,#22c55e)'
      : 'linear-gradient(90deg,#b91c1c,#ef4444)';
    // أعد التدفّق ثم ابدأ التقلّص
    requestAnimationFrame(() => requestAnimationFrame(() => {
      fill.style.transition = `width ${MOVE_MS}ms linear`;
      fill.style.width = '0%';
    }));
  }

  /* ════════════════════════════════════════════════════
     نتيجة اللعبة
  ════════════════════════════════════════════════════ */
  function _showOver() {
    let title, icon, cls;
    if (winner === myRole)        { title = 'فزت — أنت تدفع'; icon = 'fa-trophy';     cls = 'win'; }
    else if (winner === peerRole) { title = 'خسرت — صاحبك يدفع'; icon = 'fa-face-smile'; cls = 'lose'; }
    else                          { title = 'تعادل!';               icon = 'fa-handshake';  cls = 'tie'; }

    const actions = isHost
      ? `<button class="xo-btn xo-btn--again" onclick="xoReplay()"><i class="fa-solid fa-rotate-right"></i> جولة جديدة</button>
         <button class="xo-btn xo-btn--exit"  onclick="exitXO()"><i class="fa-solid fa-xmark"></i> خروج</button>`
      : `<button class="xo-btn xo-btn--exit"  onclick="exitXO()"><i class="fa-solid fa-xmark"></i> خروج</button>
         <div class="xo-wait-host">بانتظار المضيف لبدء جولة جديدة…</div>`;

    const box = $('xo-result'); if (!box) return;
    $('xo-result-icon').innerHTML = `<i class="fa-solid ${icon}"></i>`;
    $('xo-result-title').textContent = title;
    $('xo-result-actions').innerHTML = actions;
    box.className = 'xo-result show ' + cls;
  }
  function hideResult() { const b = $('xo-result'); if (b) b.className = 'xo-result'; }

  /* ════════════════════════════════════════════════════
     إعادة اللعب / الخروج
  ════════════════════════════════════════════════════ */
  function xoReplay() {
    if (!isHost) return;
    hideResult();
    _hostNewGame(false);
  }
  window.xoReplay = xoReplay;

  function exitXO() {
    send({ c: 'close' });
    closeOverlay();
    if (typeof resumeAutoScroll === 'function') resumeAutoScroll();
  }
  window.exitXO = exitXO;

  /* ════════════════════════════════════════════════════
     استقبال الرسائل
  ════════════════════════════════════════════════════ */
  function handle(msg) {
    if (!msg || msg.t !== 'xo') return;

    switch (msg.c) {
      case 'open':
        myRole   = myRoleFromPairing();
        peerRole = other(myRole);
        isHost   = false;
        openOverlay();
        hideResult();
        break;

      case 'state':
        if (!isHost) _applyState(msg);
        break;

      case 'move':
        if (isHost) _hostApplyMove(msg.cell, msg.role);
        break;

      case 'close':
        closeOverlay();
        if (typeof resumeAutoScroll === 'function') resumeAutoScroll();
        break;
    }
  }

  function _bind() {
    if (window.DuoConnect && window.DuoConnect.onData) window.DuoConnect.onData(handle);
    else setTimeout(_bind, 500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _bind);
  else _bind();
})();
