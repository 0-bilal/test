/**
 * duo-auth.js — بوابة رقم سري لصفحات الإدارة (لوحة التحكم / الكاشير)
 * ────────────────────────────────────────────────────────────────
 * حتى الآن كان بالإمكان فتح dashboard.html أو cashier.html مباشرة عبر
 * الرابط دون أي رقم سري — نظام "٥ ضغطات على الشعار" في شاشة المنيو كان
 * يحمي فقط طريق الوصول من داخل المنيو، وليس الصفحتين نفسيهما.
 *
 * هذا الملف يعرض بوابة رقم سري كاملة الشاشة تحجب الصفحة فوراً (قبل أي
 * محتوى) ما لم يكن المستخدم قد أثبت هويته في هذه الجلسة (sessionStorage)
 * — يُمسَح هذا الإثبات تلقائياً عند القفل التلقائي بالخمول في لوحة
 * التحكم، أو عند إغلاق التبويب/المتصفح.
 *
 * يجب تحميل هذا السكربت أولاً — قبل أي محتوى آخر في <head>.
 */
(function () {
  'use strict';

  const PASSWORD = '812100';   // نفس الرقم السري المستخدم في شاشة المنيو
  const SS_KEY   = 'duo_admin_ok';

  if (sessionStorage.getItem(SS_KEY) === '1') return;   // مصادَق عليه بالفعل لهذه الجلسة

  let pin = '';

  function build() {
    const wrap = document.createElement('div');
    wrap.id = 'duo-auth-gate';
    wrap.innerHTML = `
      <style>
        #duo-auth-gate {
          position: fixed; inset: 0; z-index: 2147483647;
          background: #0a0a0b; direction: rtl;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Tajawal', system-ui, sans-serif;
        }
        #duo-auth-gate .da-box { text-align: center; color: #fff; padding: 24px; }
        #duo-auth-gate .da-icon {
          width: 62px; height: 62px; border-radius: 18px; margin: 0 auto 18px;
          background: linear-gradient(135deg, #8f1521, #be1e2d);
          display: flex; align-items: center; justify-content: center;
          font-size: 24px; box-shadow: 0 6px 24px rgba(190,30,45,.4);
        }
        #duo-auth-gate .da-title { font-size: 19px; font-weight: 900; margin-bottom: 5px; }
        #duo-auth-gate .da-sub   { font-size: 12.5px; color: rgba(255,255,255,.4); margin-bottom: 24px; }
        #duo-auth-gate .da-dots  { display: flex; gap: 11px; justify-content: center; margin-bottom: 22px; }
        #duo-auth-gate .da-dot   { width: 13px; height: 13px; border-radius: 50%; border: 2px solid rgba(255,255,255,.22); transition: .15s; }
        #duo-auth-gate .da-dot.on { background: #be1e2d; border-color: #be1e2d; }
        #duo-auth-gate .da-err   { color: #f87171; font-size: 12.5px; font-weight: 700; min-height: 17px; margin-bottom: 8px; }
        #duo-auth-gate .da-pad   { display: grid; grid-template-columns: repeat(3, 58px); gap: 11px; justify-content: center; }
        #duo-auth-gate .da-key   {
          width: 58px; height: 58px; border-radius: 15px;
          background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1);
          color: #fff; font-size: 20px; font-weight: 700; font-family: inherit;
          display: flex; align-items: center; justify-content: center;
        }
        #duo-auth-gate .da-key:active { background: rgba(190,30,45,.35); }
        #duo-auth-gate .da-key--ghost { visibility: hidden; }
        #duo-auth-gate .da-shake { animation: da-shake .4s; }
        @keyframes da-shake { 20%,60%{transform:translateX(-7px)} 40%,80%{transform:translateX(7px)} }
      </style>
      <div class="da-box">
        <div class="da-icon"><i class="fa-solid fa-lock"></i></div>
        <div class="da-title">دخول مقيّد</div>
        <div class="da-sub">أدخل الرقم السري للمتابعة</div>
        <div class="da-dots" id="da-dots"></div>
        <div class="da-err" id="da-err"></div>
        <div class="da-pad" id="da-pad"></div>
      </div>`;
    document.documentElement.appendChild(wrap);

    const dotsWrap = wrap.querySelector('#da-dots');
    for (let i = 0; i < PASSWORD.length; i++) {
      const d = document.createElement('div');
      d.className = 'da-dot';
      dotsWrap.appendChild(d);
    }

    const pad = wrap.querySelector('#da-pad');
    ['1','2','3','4','5','6','7','8','9','','0','del'].forEach(k => {
      const b = document.createElement('button');
      b.type = 'button';
      if (k === '') {
        b.className = 'da-key da-key--ghost';
      } else if (k === 'del') {
        b.className = 'da-key';
        b.innerHTML = '<i class="fa-solid fa-delete-left"></i>';
        b.addEventListener('click', onDelete);
      } else {
        b.className = 'da-key';
        b.textContent = k;
        b.addEventListener('click', () => onDigit(k));
      }
      pad.appendChild(b);
    });
  }

  function updateDots() {
    document.querySelectorAll('#duo-auth-gate .da-dot')
      .forEach((d, i) => d.classList.toggle('on', i < pin.length));
  }

  function onDigit(d) {
    if (pin.length >= PASSWORD.length) return;
    const err = document.getElementById('da-err');
    if (err) err.textContent = '';
    pin += d;
    updateDots();
    if (pin.length === PASSWORD.length) setTimeout(check, 150);
  }

  function onDelete() {
    pin = pin.slice(0, -1);
    updateDots();
  }

  function check() {
    if (pin === PASSWORD) {
      sessionStorage.setItem(SS_KEY, '1');
      const gate = document.getElementById('duo-auth-gate');
      if (gate) gate.remove();
      return;
    }
    const err = document.getElementById('da-err');
    if (err) err.textContent = 'رقم سري غير صحيح';
    const box = document.querySelector('#duo-auth-gate .da-box');
    if (box) { box.classList.remove('da-shake'); void box.offsetWidth; box.classList.add('da-shake'); }
    pin = '';
    setTimeout(updateDots, 200);
  }

  build();
})();
