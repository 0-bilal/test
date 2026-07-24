/**
 * game.js — تحدّي الرد السريع (Reaction Duel) بين جهازَي iPad
 * ────────────────────────────────────────────────────────────────────────
 * الفكرة: الشاشتان حمراء ("استعد…")، وفي لحظة عشوائية تتحوّل للأخضر،
 * وأسرع لاعب يضغط يكسب الجولة. الأفضل من ٣ جولات (أول من يبلغ جولتين).
 *
 * التزامن: عبر DuoConnect (Firebase). الجهاز الذي يضغط «العب الآن» يصبح
 * «المضيف» ويتحكّم بتوقيت الجولات ويحسم النتائج. العدل يعتمد على قياس
 * «زمن الرد» محلياً على كل جهاز (لحظة الضغط − لحظة ظهور الأخضر عنده)،
 * فلا يتأثر بزمن تأخير الشبكة.
 *
 * الرسائل (عبر DuoConnect.send) كلها بالشكل: { t:'game', c:'...' , ... }
 */
(function () {
  'use strict';

  const $ = id => document.getElementById(id);

  /* ── إعداد ── */
  const ROUNDS_TO_WIN = 2;      // الأفضل من ٣ = أول من يبلغ جولتين
  const TOTAL_ROUNDS  = 3;
  const MIN_WAIT      = 1600;   // أقل مدة انتظار قبل الأخضر
  const MAX_WAIT      = 5000;   // أقصى مدة انتظار
  const TAP_TIMEOUT   = 4000;   // مهلة الضغط بعد الأخضر
  const NEXT_DELAY    = 2600;   // مهلة بين الجولات

  /* ── الحالة ── */
  let active     = false;
  let isHost     = false;
  let myRole     = 'left';      // دور هذا الجهاز (من إعداد الربط)
  let peerRole   = 'right';
  let round      = 0;
  let score      = { left: 0, right: 0 };
  let phase      = 'idle';      // idle | ready | green | tapped | result | over
  let greenAt    = 0;
  let greenTimer = null;
  let timeoutTimer = null;
  let nextTimer  = null;
  let rt         = { left: null, right: null };  // أزمنة الرد (host فقط يجمعها)

  /* ════════════════════════════════════════════════════
     أدوات مساعدة
  ════════════════════════════════════════════════════ */
  function myRoleFromPairing() {
    const r = (localStorage.getItem('duo_pair_role') || 'left').trim();
    return (r === 'right') ? 'right' : 'left';
  }
  function send(obj) {
    if (window.DuoConnect) return window.DuoConnect.send(Object.assign({ t: 'game' }, obj));
    return false;
  }
  function setBig(txt)  { const e = $('game-big'); if (e) e.textContent = txt; }
  function setSub(txt)  { const e = $('game-sub'); if (e) e.textContent = txt; }
  function setStateClass(cls) {
    const ov = $('game-overlay'); if (!ov) return;
    ov.classList.remove('state-ready', 'state-green', 'state-tapped', 'state-result');
    if (cls) ov.classList.add(cls);
  }
  function updateScoreUI() {
    const you = $('game-score-you'), opp = $('game-score-opp');
    if (you) you.textContent = score[myRole];
    if (opp) opp.textContent = score[peerRole];
    const rEl = $('game-round');
    if (rEl) rEl.textContent = `الجولة ${Math.min(round, TOTAL_ROUNDS)} / ${TOTAL_ROUNDS}`;
  }

  /* ════════════════════════════════════════════════════
     فتح / إغلاق شاشة اللعبة
  ════════════════════════════════════════════════════ */
  function openOverlay() {
    const ov = $('game-overlay'); if (!ov) return;
    ov.classList.add('active');
    active = true;
    // أوقف التمرير التلقائي للمنيو إن وُجد
    if (typeof pauseAutoScroll === 'function') pauseAutoScroll();
  }
  function closeOverlay() {
    const ov = $('game-overlay'); if (!ov) return;
    ov.classList.remove('active');
    active = false;
    _clearTimers();
    setStateClass('');
    hideResult();
  }

  function _clearTimers() {
    clearTimeout(greenTimer);   greenTimer = null;
    clearTimeout(timeoutTimer); timeoutTimer = null;
    clearTimeout(nextTimer);    nextTimer = null;
  }

  /* ════════════════════════════════════════════════════
     بدء اللعبة (من زر «العب الآن»)
  ════════════════════════════════════════════════════ */
  function launchDuoGame() {
    myRole   = myRoleFromPairing();
    peerRole = (myRole === 'left') ? 'right' : 'left';

    const st = window.DuoConnect && window.DuoConnect.status ? window.DuoConnect.status().state : 'idle';
    if (st !== 'connected') {
      _hint('الجهاز الآخر غير متصل — تأكّد من الربط أولاً.');
      return;
    }

    isHost = true;
    _startMatch(true);
    // أبلغ الجهاز الآخر ليفتح اللعبة (المرسل هو المضيف)
    send({ c: 'open', host: myRole });
  }
  window.launchDuoGame = launchDuoGame;

  function _hint(msg) {
    const h = $('game-slide-hint');
    if (h) { h.textContent = msg; h.classList.add('show'); setTimeout(() => h.classList.remove('show'), 4000); }
  }

  function _startMatch(asHost) {
    isHost = asHost;
    round  = 0;
    score  = { left: 0, right: 0 };
    phase  = 'idle';
    updateScoreUI();
    hideResult();
    openOverlay();

    if (isHost) {
      // المضيف يبدأ الجولة الأولى بعد عدّ تنازلي قصير
      _countdownThenRound();
    } else {
      setStateClass('state-ready');
      setBig('استعد…');
      setSub('بانتظار بدء المضيف…');
    }
  }

  /* ════════════════════════════════════════════════════
     المضيف: العدّ التنازلي ثم الجولة
  ════════════════════════════════════════════════════ */
  function _countdownThenRound() {
    let n = 3;
    setStateClass('state-ready');
    updateScoreUI();
    send({ c: 'count', n });
    setBig(String(n)); setSub('استعدّ للتحدّي!');

    const tick = () => {
      n--;
      if (n > 0) {
        send({ c: 'count', n });
        setBig(String(n)); setSub('استعدّ للتحدّي!');
        nextTimer = setTimeout(tick, 1000);
      } else {
        _hostStartRound();
      }
    };
    nextTimer = setTimeout(tick, 1000);
  }

  function _hostStartRound() {
    round++;
    rt = { left: null, right: null };
    phase = 'ready';
    _clearTimers();

    updateScoreUI();
    send({ c: 'round', round, score });
    _enterReady();

    const wait = MIN_WAIT + Math.random() * (MAX_WAIT - MIN_WAIT);
    greenTimer = setTimeout(() => {
      // اللحظة الحاسمة: أخضر الآن — أظهرها محلياً وأبلغ الشريك في نفس اللحظة
      send({ c: 'green', round });
      _enterGreen();
    }, wait);
  }

  /* ── دخول حالة "استعد" (أحمر) ── */
  function _enterReady() {
    phase = 'ready';
    hideResult();               // أخفِ لوحة نتيجة الجولة السابقة
    setStateClass('state-ready');
    setBig('استعد…');
    setSub('لا تضغط قبل الأخضر!');
  }

  /* ── دخول حالة "أخضر" ── */
  function _enterGreen() {
    phase   = 'green';
    greenAt = performance.now();
    setStateClass('state-green');
    setBig('اضغط الآن!');
    setSub('');
    if (isHost) {
      // مهلة أمان: إن لم يضغط أحد
      timeoutTimer = setTimeout(() => _hostResolve(), TAP_TIMEOUT);
    }
  }

  /* ════════════════════════════════════════════════════
     الضغط على الشاشة
  ════════════════════════════════════════════════════ */
  function gameTap() {
    if (!active) return;

    if (phase === 'ready') {
      // ضغط مبكّر → خطأ (خسارة الجولة)
      phase = 'tapped';
      setStateClass('state-tapped');
      setBig('تبكير!');
      setSub('ضغطت قبل الأخضر');
      _reportTap(-1);
      return;
    }

    if (phase === 'green') {
      const reaction = Math.round(performance.now() - greenAt);
      phase = 'tapped';
      setStateClass('state-tapped');
      setBig(reaction + ' مِلّي');
      setSub('تم! بانتظار المنافس…');
      _reportTap(reaction);
      return;
    }
    // غير ذلك: تجاهل
  }
  window.gameTap = gameTap;

  function _reportTap(reaction) {
    if (isHost) {
      rt[myRole] = reaction;
      _checkResolve(reaction < 0);
    } else {
      send({ c: 'tap', role: myRole, rt: reaction });
    }
  }

  /* ════════════════════════════════════════════════════
     المضيف: حسم الجولة
  ════════════════════════════════════════════════════ */
  function _checkResolve(falseStart) {
    if (!isHost) return;
    if (falseStart) { _hostResolve(); return; }          // تبكير يُنهي الجولة فوراً
    if (rt[myRole] != null && rt[peerRole] != null) _hostResolve();
  }

  function _hostResolve() {
    if (!isHost || phase === 'result') return;
    phase = 'result';
    _clearTimers();

    const a = rt.left, b = rt.right;   // -1 = تبكير، null = لم يضغط، >0 = زمن الرد
    const falseL = (a === -1), falseR = (b === -1);

    let winner;
    if (falseL && falseR)      winner = 'none';    // كلاهما بكّر
    else if (falseL)           winner = 'right';   // اليسار بكّر → اليمين يفوز
    else if (falseR)           winner = 'left';    // اليمين بكّر → اليسار يفوز
    else {
      // لا تبكير: الأسرع يفوز، وعدم الضغط (null) = خسارة
      const L = (a == null) ? Infinity : a;
      const R = (b == null) ? Infinity : b;
      if (L === Infinity && R === Infinity) winner = 'none';
      else if (L < R) winner = 'left';
      else if (R < L) winner = 'right';
      else winner = 'none';
    }

    if (winner === 'left' || winner === 'right') score[winner]++;

    const over = (score.left >= ROUNDS_TO_WIN || score.right >= ROUNDS_TO_WIN || round >= TOTAL_ROUNDS);

    const payload = { c: 'result', round, winner, rt: { left: a, right: b }, score, over };
    send(payload);
    _applyResult(payload);

    if (over) {
      const champ = score.left === score.right ? 'none'
                  : (score.left > score.right ? 'left' : 'right');
      nextTimer = setTimeout(() => {
        const gp = { c: 'over', champ, score };
        send(gp); _applyGameOver(gp);
      }, NEXT_DELAY);
    } else {
      nextTimer = setTimeout(() => _hostStartRound(), NEXT_DELAY);
    }
  }

  /* ── عرض نتيجة الجولة (على الجهازين) ── */
  function _applyResult(p) {
    round = p.round;
    score = p.score;
    updateScoreUI();
    setStateClass('state-result');

    const mine = p.rt[myRole], theirs = p.rt[peerRole];
    let title, sub, icon, cls;
    if (p.winner === myRole)      { title = 'فزت بالجولة!'; icon = 'fa-bolt'; cls = 'win'; }
    else if (p.winner === peerRole){ title = 'خسرت الجولة'; icon = 'fa-face-frown'; cls = 'lose'; }
    else                          { title = 'تعادل';        icon = 'fa-scale-balanced'; cls = 'tie'; }

    const fmt = v => (v == null) ? 'لم يضغط' : (v < 0 ? 'تبكير' : v + ' مِلّي');
    sub = `أنت: ${fmt(mine)} — المنافس: ${fmt(theirs)}`;

    showResult({ title, sub, icon, cls, actions: '' });
  }

  /* ── نهاية اللعبة ── */
  function _applyGameOver(p) {
    phase = 'over';
    score = p.score;
    updateScoreUI();
    setStateClass('state-result');

    let title, icon, cls, payNote;
    if (p.champ === myRole)       { title = 'أنت الفائز!';  icon = 'fa-trophy';    cls = 'win';  payNote = 'تكرّم وادفع الحساب'; }
    else if (p.champ === peerRole){ title = 'فاز المنافس';   icon = 'fa-medal';     cls = 'lose'; payNote = 'صاحبك يدفع الحساب'; }
    else                          { title = 'تعادل!';        icon = 'fa-handshake'; cls = 'tie';  payNote = 'أعيدوا الجولة لتحسموها!'; }

    const actions = isHost
      ? `<button class="game-btn game-btn--again" onclick="gameReplay()"><i class="fa-solid fa-rotate-right"></i> العب مجدداً</button>
         <button class="game-btn game-btn--exit"  onclick="exitDuoGame()"><i class="fa-solid fa-xmark"></i> خروج</button>`
      : `<button class="game-btn game-btn--exit"  onclick="exitDuoGame()"><i class="fa-solid fa-xmark"></i> خروج</button>
         <div class="game-wait-host">بانتظار المضيف لإعادة اللعب…</div>`;

    showResult({ title, sub: `${payNote} — النتيجة ${score[myRole]} – ${score[peerRole]}`, icon, cls, actions });
  }

  /* ════════════════════════════════════════════════════
     لوحة النتيجة
  ════════════════════════════════════════════════════ */
  function showResult({ title, sub, icon, cls, actions }) {
    const box = $('game-result'); if (!box) return;
    const iconEl = $('game-result-icon');
    if (iconEl) iconEl.innerHTML = `<i class="fa-solid ${icon || 'fa-trophy'}"></i>`;
    $('game-result-title').textContent = title || '';
    $('game-result-sub').textContent   = sub || '';
    $('game-result-actions').innerHTML = actions || '';
    box.className = 'game-result show ' + (cls || '');
  }
  function hideResult() {
    const box = $('game-result'); if (box) box.className = 'game-result';
  }

  /* ════════════════════════════════════════════════════
     إعادة اللعب / الخروج
  ════════════════════════════════════════════════════ */
  function gameReplay() {
    if (!isHost) return;
    hideResult();
    _startMatch(true);
    send({ c: 'open', host: myRole });
  }
  window.gameReplay = gameReplay;

  function exitDuoGame() {
    send({ c: 'close' });
    closeOverlay();
    if (typeof resumeAutoScroll === 'function') resumeAutoScroll();
  }
  window.exitDuoGame = exitDuoGame;

  /* ════════════════════════════════════════════════════
     استقبال رسائل اللعبة من الجهاز الآخر
  ════════════════════════════════════════════════════ */
  function handle(msg) {
    if (!msg || msg.t !== 'game') return;

    switch (msg.c) {
      case 'open':
        // الطرف الآخر بدأ اللعبة — نحن الضيف
        myRole   = myRoleFromPairing();
        peerRole = (myRole === 'left') ? 'right' : 'left';
        isHost   = false;
        _startMatch(false);
        break;

      case 'count':
        if (isHost) break;
        setStateClass('state-ready');
        setBig(String(msg.n)); setSub('استعدّ للتحدّي!');
        break;

      case 'round':
        if (isHost) break;
        round = msg.round; score = msg.score || score;
        updateScoreUI();
        _enterReady();
        break;

      case 'green':
        if (isHost) break;
        _enterGreen();
        break;

      case 'tap':
        // المضيف يستقبل ضغطة الضيف
        if (isHost) {
          rt[msg.role] = msg.rt;
          _checkResolve(msg.rt < 0);
        }
        break;

      case 'result':
        if (!isHost) _applyResult(msg);
        break;

      case 'over':
        if (!isHost) _applyGameOver(msg);
        break;

      case 'close':
        closeOverlay();
        if (typeof resumeAutoScroll === 'function') resumeAutoScroll();
        break;
    }
  }

  /* ── تسجيل مستقبِل الرسائل عند جاهزية DuoConnect ── */
  function _bind() {
    if (window.DuoConnect && window.DuoConnect.onData) {
      window.DuoConnect.onData(handle);
    } else {
      setTimeout(_bind, 500);
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _bind);
  } else {
    _bind();
  }
})();
