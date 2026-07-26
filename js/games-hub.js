/**
 * games-hub.js — شاشة الألعاب "مَن يدفع الحساب؟"
 * ────────────────────────────────────────────────────────────
 * تُفتح من زر الهيدر، وتعرض اللعبتين المتاحتين وفكرتيهما وطريقة اللعب
 * وأزرار البدء. تتحقّق من اتصال الجهازين قبل بدء أي لعبة.
 */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);

  let _statusTimer = null;

  function showGamesHub() {
    const ov = $('games-hub'); if (!ov) return;
    ov.classList.add('active');
    _updateStatus();
    _statusTimer = setInterval(_updateStatus, 1500);
    if (typeof pauseAutoScroll === 'function') pauseAutoScroll();
  }
  window.showGamesHub = showGamesHub;

  function hideGamesHub() {
    const ov = $('games-hub'); if (!ov) return;
    ov.classList.remove('active');
    clearInterval(_statusTimer); _statusTimer = null;
  }
  window.hideGamesHub = hideGamesHub;

  /* حالة الاتصال داخل الشاشة */
  function _connState() {
    return (window.DuoConnect && window.DuoConnect.status)
      ? window.DuoConnect.status().state : 'idle';
  }
  function _updateStatus() {
    const el = $('gh-status'); if (!el) return;
    const st = _connState();
    if (st === 'connected') {
      el.className = 'gh-status gh-status--ok';
      el.innerHTML = '<i class="fa-solid fa-link"></i> الجهازان متصلان — جاهزون للّعب!';
    } else if (st === 'waiting' || st === 'connecting') {
      el.className = 'gh-status gh-status--wait';
      el.innerHTML = '<i class="fa-solid fa-hourglass-half"></i> بانتظار اتصال الجهاز الآخر…';
    } else {
      el.className = 'gh-status gh-status--off';
      el.innerHTML = '<i class="fa-solid fa-plug-circle-xmark"></i> الجهاز الآخر غير متصل — تأكّد أن جهاز صديقك على نفس المنيو.';
    }
    // فعّل/عطّل أزرار البدء
    document.querySelectorAll('#games-hub .gh-play').forEach(b => {
      b.classList.toggle('disabled', st !== 'connected');
    });
  }

  /* بدء لعبة من الشاشة */
  function hubPlay(type) {
    if (_connState() !== 'connected') {
      const el = $('gh-status');
      if (el) {
        el.className = 'gh-status gh-status--off shake';
        el.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> لا يمكن البدء — الجهاز الآخر غير متصل بعد.';
        setTimeout(() => el.classList.remove('shake'), 500);
      }
      return;
    }
    hideGamesHub();
    if (type === 'xo') { if (typeof launchXO === 'function') launchXO(); }
    else               { if (typeof launchDuoGame === 'function') launchDuoGame(); }
  }
  window.hubPlay = hubPlay;
})();
