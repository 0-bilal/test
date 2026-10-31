/**
 * menu.js — منيو ديو برجر للجوال
 * يعتمد على restaurantInfo و menuCategories من products.js
 */

(function () {
  'use strict';

  /* أيقونة افتراضية للبطاقات بلا صورة */
  let modalPhase = 'closed';
  let modalBackPending = false;
  let navigationTarget = null;
  let modalOpener = null;
  let savedScrollY = 0;
  let savedBodyStyle = null;
  let closeTimer = null;
  const backgroundState = new Map();
  const modalHistoryKey = 'duoProductModal';

  const PH_ICON = {
    'fa-burger':         'fa-burger',
    'fa-bowl-food':      'fa-bowl-food',
    'fa-glass-water':    'fa-glass-water',
    'fa-bottle-droplet': 'fa-bottle-droplet',
  };

  /* أيقونات الوجبة — بطاطس ومشروب (SVG داخلي لضمان ظهورها دائماً) */
  const MEAL_FRIES_SVG = `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="7.1" y="3.2" width="2.2" height="8" rx="1.1" fill="#F7C948" transform="rotate(-13 8.2 7.2)"/>
      <rect x="10.9" y="1.9" width="2.2" height="9.3" rx="1.1" fill="#FFD966"/>
      <rect x="14.7" y="3.2" width="2.2" height="8" rx="1.1" fill="#F7C948" transform="rotate(13 15.8 7.2)"/>
      <path d="M4.6 10h14.8l-1.5 9.3a2.4 2.4 0 0 1-2.4 2h-7a2.4 2.4 0 0 1-2.4-2L4.6 10Z" fill="#fff"/>
      <path d="M6.2 13.4h11.6" stroke="#be1e2d" stroke-width="1.7" stroke-linecap="round"/>
    </svg>`;

  const MEAL_DRINK_SVG = `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M13.6 2.8 11.6 8.2" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>
      <rect x="4.7" y="6.6" width="14.6" height="3.1" rx="1.4" fill="#fff"/>
      <path d="M6.1 10.6h11.8l-1.2 9a2.3 2.3 0 0 1-2.3 2h-4.8a2.3 2.3 0 0 1-2.3-2l-1.2-9Z" fill="#fff"/>
      <path d="M7.4 14.2h9.2" stroke="#be1e2d" stroke-width="1.6" stroke-linecap="round"/>
    </svg>`;

  /* ══════════════════════════════════════════
     بناء الصفحة
  ══════════════════════════════════════════ */
  function buildPage() {
    const info = restaurantInfo || {};
    const cats = menuCategories  || [];
    _buildHeader(info);
    _buildTabs(cats);
    _buildContent(cats);
    _buildFooter(info);
    _setupScrollTop();
    _setupModalClose();
  }

  /* ── الهيدر ── */
  function _buildHeader(info) {
    const logoImg  = document.getElementById('m-logo-img');
    const logoPh   = document.getElementById('m-logo-ph');
    const nameEl   = document.getElementById('m-name');
    const tagEl    = document.getElementById('m-tag');
    const hoursEl  = document.getElementById('m-hours-text');

    if (info.logo && logoImg) {
      logoImg.src = info.logo;
      logoImg.style.display = 'block';
      if (logoPh) logoPh.style.display = 'none';
      logoImg.onerror = () => {
        logoImg.style.display = 'none';
        if (logoPh) logoPh.style.display = 'flex';
      };
    }

    if (nameEl) nameEl.textContent = info.nameAr || '';
    if (tagEl)  tagEl.textContent  = info.taglineAr || '';
    /* أوقات العمل — السطر الأول: الساعات · السطر الثاني: الأيام */
    if (hoursEl) {
      hoursEl.textContent = info.workingHours || '';
    }
    const daysEl = document.getElementById('m-hours-days');
    if (daysEl) daysEl.textContent = info.workingDays || '';
    document.title = (info.nameAr || 'منيو') + ' | المنيو';
  }

  /* ── تبويبات الأقسام ── */
  function _buildTabs(cats) {
    const bar = document.getElementById('m-tabs');
    if (!bar) return;
    bar.innerHTML = '';
    cats.forEach((cat, i) => {
      const btn = document.createElement('button');
      btn.className   = 'm-tab' + (i === 0 ? ' active' : '');
      btn.dataset.cat = cat.id;
      btn.setAttribute('role', 'tab');
      btn.innerHTML   = `<i class="fa-solid ${cat.icon || 'fa-utensils'}"></i><span>${cat.nameAr}</span>`;
      btn.addEventListener('click', () => { _activateTab(cat.id); _scrollToSection(cat.id); });
      bar.appendChild(btn);
    });
  }

  function _activateTab(catId) {
    document.querySelectorAll('.m-tab').forEach(b =>
      b.classList.toggle('active', b.dataset.cat === catId));
  }

  function _scrollToSection(catId) {
    const sec = document.getElementById('sec-' + catId);
    if (!sec) return;
    const headerH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 68;
    const tabsH   = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tabs-h'))   || 54;
    const top = sec.getBoundingClientRect().top + window.scrollY - headerH - tabsH - 10;
    navigationTarget = { id: catId, top: Math.max(0, Math.min(top, document.documentElement.scrollHeight - innerHeight)) };
    window.scrollTo({ top: navigationTarget.top, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }

  /* ── المحتوى ── */
  function _buildContent(cats) {
    const main = document.getElementById('m-main');
    if (!main) return;
    main.innerHTML = '';
    cats.forEach((cat, ci) => {
      if (ci > 0) {
        const sep = document.createElement('div');
        sep.className = 'm-separator';
        main.appendChild(sep);
      }
      const sec = document.createElement('section');
      sec.className = 'm-section';
      sec.id = 'sec-' + cat.id;

      const header = document.createElement('div');
      header.className = 'm-section-header';
      header.innerHTML = `
        <div class="m-section-icon"><i class="fa-solid ${cat.icon || 'fa-utensils'}"></i></div>
        <div class="m-section-titles">
          <div class="m-section-name">${cat.nameAr}</div>
          ${cat.nameEn ? `<div class="m-section-name-en">${cat.nameEn}</div>` : ''}
        </div>
        <span class="m-section-count">${cat.items.length}</span>
      `;
      sec.appendChild(header);

      const cards = document.createElement('div');
      cards.className = 'm-cards';
      cat.items.forEach(item => cards.appendChild(_buildCard(cat, item)));
      sec.appendChild(cards);

      main.appendChild(sec);
    });
    _setupScrollSpy(cats);
  }

  /* ── بطاقة منتج ── */
  function _buildCard(cat, item) {
    const card = document.createElement('div');
    card.className = 'm-card';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', item.nameAr);

    const hasImage = item.image && item.image.trim();
    const phIcon   = PH_ICON[cat.icon] || 'fa-utensils';

    const calBadge = item.calories
      ? `<span class="m-card-cal"><i class="fa-solid fa-fire-flame-curved"></i>${item.calories} سعرة</span>` : '';
    const mealBadge = item.isMeal
      ? `<span class="m-card-meal-badge"><i class="fa-solid fa-utensils"></i>وجبة متكاملة</span>` : '';

    const variantsHtml = (item.variants && item.variants.length)
      ? `<div class="m-card-variants">${item.variants.map(v => `<span class="m-card-variant">${v}</span>`).join('')}</div>` : '';

    card.innerHTML = `
      <div class="m-card-inner">
        <div class="m-card-img-wrap">
          ${hasImage
            ? `<img src="${item.image}" alt="${item.nameAr}" loading="lazy">`
            : `<div class="m-card-img-ph"><i class="fa-solid ${phIcon}"></i></div>`}
        </div>
        <div class="m-card-body">
          <div>
            <div class="m-card-name-ar">${item.nameAr}</div>
            ${item.nameEn        ? `<div class="m-card-name-en">${item.nameEn}</div>` : ''}
            ${item.descriptionAr ? `<div class="m-card-desc">${item.descriptionAr}</div>` : ''}
            ${variantsHtml}
          </div>
          <div class="m-card-footer">
            ${item.price != null ? `
              <div class="m-card-price">
                <span class="m-price-num">${item.price}</span>
                <span class="m-price-cur">ر.س</span>
              </div>` : ''}
            ${calBadge}${mealBadge}
          </div>
        </div>
      </div>`;

    const open = () => _openModal(cat, item, card);
    card.addEventListener('click',   open);
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    return card;
  }

  /* ══════════════════════════════════════════
     MODAL
  ══════════════════════════════════════════ */
  function _openModal(cat, item, opener) {
    const overlay  = document.getElementById('m-modal-overlay');
    const modal    = document.getElementById('m-modal');
    const imgArea  = modal && modal.querySelector('.m-modal-img-area');
    const body     = modal && modal.querySelector('.m-modal-body');
    if (!overlay || !modal || !imgArea || !body) return;

    if (modalPhase !== 'closed') return;
    modalOpener = opener || document.activeElement;
    modal.style.transform = '';
    modal.style.transition = '';
    body.scrollTop = 0;
    const hasImage = item.image && item.image.trim();
    const phIcon   = PH_ICON[cat.icon] || 'fa-utensils';

    imgArea.innerHTML = hasImage
      ? `<img class="m-modal-img" src="${item.image}" alt="${item.nameAr}">`
      : `<div class="m-modal-img-ph"><i class="fa-solid ${phIcon}"></i></div>`;

    const productImage = imgArea.querySelector('img');
    if (productImage) productImage.onerror = () => {
      imgArea.innerHTML = '<div class="m-modal-img-ph" role="img" aria-label="الصورة غير متاحة">الصورة غير متاحة</div>';
    };

    /* السعرات */
    const calEl = item.calories
      ? `<span class="m-modal-cal"><i class="fa-solid fa-fire-flame-curved"></i>${item.calories} سعرة حرارية</span>` : '';
    const mealEl = item.isMeal
      ? `<span class="m-modal-meal"><i class="fa-solid fa-utensils"></i>وجبة متكاملة</span>` : '';

    /* سعر الوجبة — نفس تصميم سعر البرجر مع أيقونتي البطاطس والمشروب */
    const mealPriceEl = item.mealPrice != null ? `
      <div class="m-modal-price m-modal-meal-price" aria-label="سعر الوجبة ${item.mealPrice} ريال، تشمل بطاطس ومشروب">
        <span class="m-meal-tag">وجبة</span>
        <span class="m-meal-amount">
          <span class="m-modal-price-num">${item.mealPrice}</span>
          <span class="m-modal-price-cur">ر.س</span>
        </span>
        <span class="m-meal-divider" aria-hidden="true"></span>
        <span class="m-meal-ico" title="مع بطاطس مبهّرة">${MEAL_FRIES_SVG}</span>
        <span class="m-meal-ico" title="مع مشروب">${MEAL_DRINK_SVG}</span>
      </div>` : '';

    /* المكونات */
    let ingredientsHtml = '';
    if (item.ingredients && item.ingredients.length) {
      ingredientsHtml = `
        <div>
          <div class="m-modal-section-title">
            <i class="fa-solid fa-list-ul"></i>المكونات
          </div>
          <div class="m-modal-ingredients">
            ${item.ingredients.map(ing =>
              ing.removable
                ? `<span class="m-ingredient removable"><i class="fa-solid fa-circle-minus"></i>${ing.nameAr}</span>`
                : `<span class="m-ingredient">${ing.nameAr}</span>`
            ).join('')}
          </div>
        </div>`;
    }

    /* اختيار الصوص */
    let sauceHtml = '';
    if (item.sauceOptions && item.sauceOptions.length) {
      sauceHtml = `
        <div>
          <div class="m-modal-section-title">
            <i class="fa-solid fa-bottle-droplet"></i>اختر الصوص
          </div>
          <div class="m-sauce-btns">
            ${item.sauceOptions.map((s, i) =>
              `<button class="m-sauce-btn${i === 0 ? ' active' : ''}"
                       onclick="this.parentElement.querySelectorAll('.m-sauce-btn').forEach(b=>b.classList.remove('active'));this.classList.add('active')">${s}</button>`
            ).join('')}
          </div>
        </div>`;
    }

    /* المتغيرات */
    let variantsHtml = '';
    if (item.variants && item.variants.length) {
      variantsHtml = `
        <div>
          <div class="m-modal-section-title">
            <i class="fa-solid fa-layer-group"></i>الأصناف المتاحة
          </div>
          <div class="m-modal-variants">
            ${item.variants.map(v => `<span class="m-modal-variant">${v}</span>`).join('')}
          </div>
        </div>`;
    }

    body.innerHTML = `
      <div>
        <div class="m-modal-name-ar" id="m-modal-title">${item.nameAr}</div>
        ${item.nameEn ? `<div class="m-modal-name-en">${item.nameEn}</div>` : ''}
      </div>
      <div class="m-modal-price-row">
        <div class="m-modal-prices">
          ${item.price != null ? `
            <div class="m-modal-price">
              <span class="m-modal-price-num">${item.price}</span>
              <span class="m-modal-price-cur">ر.س</span>
            </div>` : ''}
          ${mealPriceEl}
        </div>
        ${calEl}${mealEl}
      </div>
      ${item.descriptionAr ? `<p class="m-modal-desc">${item.descriptionAr}</p>` : ''}
      ${ingredientsHtml}${sauceHtml}${variantsHtml}`;

    savedScrollY = window.scrollY;
    savedBodyStyle = document.body.getAttribute('style');
    Object.assign(document.body.style, {
      position: 'fixed', top: `-${savedScrollY}px`, width: '100%', overflow: 'hidden',
    });
    for (const child of document.body.children) {
      if (child === overlay || child.tagName === 'SCRIPT') continue;
      backgroundState.set(child, child.inert);
      child.inert = true;
    }
    modalPhase = 'open';
    overlay.inert = false;
    overlay.setAttribute('aria-hidden', 'false');
    overlay.classList.add('open');
    document.getElementById('m-modal-close').focus({ preventScroll: true });
    history.pushState({ ...history.state, [modalHistoryKey]: true }, '');
    _enableSwipeClose(overlay, modal);
  }

  function _closeModal() {
    if (modalPhase !== 'open' || modalBackPending) return;
    if (history.state && history.state[modalHistoryKey]) {
      modalBackPending = true;
      history.back();
    }
    else _beginClose();
  }

  function _beginClose() {
    if (modalPhase !== 'open') return;
    modalBackPending = false;
    modalPhase = 'closing';
    const overlay = document.getElementById('m-modal-overlay');
    const modal = document.getElementById('m-modal');
    modal.style.transition = '';
    // Remove the drag override so the CSS exit transition can reach the bottom.
    modal.style.transform = '';
    overlay.classList.remove('open');
    const finish = () => {
      clearTimeout(closeTimer);
      modalPhase = 'closed';
      overlay.inert = true;
      overlay.setAttribute('aria-hidden', 'true');
      if (savedBodyStyle === null) document.body.removeAttribute('style');
      else document.body.setAttribute('style', savedBodyStyle);
      window.scrollTo({ top: savedScrollY, behavior: 'instant' });
      for (const [child, inert] of backgroundState) child.inert = inert;
      backgroundState.clear();
      if (modalOpener && modalOpener.isConnected) modalOpener.focus({ preventScroll: true });
    };
    closeTimer = setTimeout(finish, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 350);
  }

  function _setupModalClose() {
    const overlay = document.getElementById('m-modal-overlay');
    const closeBtn = document.getElementById('m-modal-close');
    if (overlay) overlay.addEventListener('click', e => { if (e.target === overlay) _closeModal(); });
    if (closeBtn) closeBtn.addEventListener('click', _closeModal);
    window.addEventListener('popstate', () => {
      if (modalPhase === 'open') _beginClose();
      // A forward navigation must not leave an invisible modal entry active.
      else if (modalPhase === 'closed' && history.state && history.state[modalHistoryKey]) history.back();
    });
    document.addEventListener('keydown', e => {
      if (modalPhase !== 'open') return;
      if (e.key === 'Escape') { e.preventDefault(); _closeModal(); }
      if (e.key !== 'Tab') return;
      const controls = [...overlay.querySelectorAll('button, a[href], [tabindex="0"]')]
        .filter(el => !el.disabled && el.getClientRects().length);
      const first = controls[0], last = controls[controls.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus({ preventScroll: true }); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus({ preventScroll: true }); }
    });
  }

  /* السحب من المقبض فقط، حتى لا يتعارض مع تمرير التفاصيل. */
  function _enableSwipeClose(overlay, modal) {
    const handle = modal.querySelector('.m-modal-handle');
    if (handle.dataset.swipeReady) return;
    handle.dataset.swipeReady = 'true';
    let startY = null, distance = 0;
    const reset = () => {
      startY = null;
      distance = 0;
      modal.style.transition = '';
      modal.style.transform = '';
    };
    handle.addEventListener('touchstart', e => {
      if (modalPhase !== 'open' || e.touches.length !== 1) return;
      startY = e.touches[0].clientY;
      distance = 0;
      modal.style.transition = 'none';
    }, { passive: true });
    handle.addEventListener('touchmove', e => {
      if (startY === null) return;
      distance = Math.max(0, e.touches[0].clientY - startY);
      modal.style.transform = `translateY(${distance}px)`;
      e.preventDefault();
    }, { passive: false });
    handle.addEventListener('touchend', () => {
      const shouldClose = distance > 100;
      reset();
      if (shouldClose) _closeModal();
    });
    handle.addEventListener('touchcancel', reset);
  }

  /* ══════════════════════════════════════════
     Scroll Spy
  ══════════════════════════════════════════ */
  function _setupScrollSpy(cats) {
    const offset = 68 + 54 + 24;
    let ticking  = false;
    for (const event of ['wheel', 'touchstart', 'pointerdown', 'keydown', 'resize']) {
      window.addEventListener(event, () => { navigationTarget = null; }, { passive: true });
    }
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        if (modalPhase !== 'closed') return;
        if (navigationTarget) {
          _activateTab(navigationTarget.id);
          _scrollTabIntoView(navigationTarget.id);
          // Keep the clicked section selected at the scroll limit, until the next user gesture.
          return;
        }
        let activeCat = cats[0].id;
        cats.forEach(cat => {
          const sec = document.getElementById('sec-' + cat.id);
          if (sec && sec.getBoundingClientRect().top <= offset) activeCat = cat.id;
        });
        _activateTab(activeCat);
        _scrollTabIntoView(activeCat);
      });
    }, { passive: true });
  }

  function _scrollTabIntoView(catId) {
    const bar = document.getElementById('m-tabs');
    const btn = bar && bar.querySelector(`[data-cat="${catId}"]`);
    if (!btn || !bar) return;
    const buttonRect = btn.getBoundingClientRect();
    const barRect = bar.getBoundingClientRect();
    const delta = buttonRect.left < barRect.left ? buttonRect.left - barRect.left - 12
      : buttonRect.right > barRect.right ? buttonRect.right - barRect.right + 12 : 0;
    if (delta) bar.scrollBy({ left: delta, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }

  /* ══════════════════════════════════════════
     الفوتر
  ══════════════════════════════════════════ */
  function _buildFooter(info) {
    const taxEl     = document.getElementById('m-footer-tax-text');
    const mapBtn    = document.getElementById('m-map-btn');
    const instaBtn  = document.getElementById('m-insta-btn');
    const tiktokBtn = document.getElementById('m-tiktok-btn');

    if (taxEl)  taxEl.textContent = info.taxNote || '';
    if (mapBtn)    { if (info.googleMapsUrl) mapBtn.href = info.googleMapsUrl; else mapBtn.style.display = 'none'; }
    if (instaBtn)  { if (info.instagram)  instaBtn.href  = 'https://www.instagram.com/' + info.instagram;  else instaBtn.style.display  = 'none'; }
    if (tiktokBtn) { if (info.tiktok)     tiktokBtn.href = 'https://www.tiktok.com/@'    + info.tiktok;    else tiktokBtn.style.display = 'none'; }
  }

  /* ══════════════════════════════════════════
     زر الرجوع للأعلى
  ══════════════════════════════════════════ */
  function _setupScrollTop() {
    const btn = document.getElementById('m-scroll-top');
    if (!btn) return;
    window.addEventListener('scroll', () => btn.classList.toggle('visible', window.scrollY > 320), { passive: true });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }));
  }

  /* ══════════════════════════════════════════
     البدء
  ══════════════════════════════════════════ */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildPage);
  else buildPage();

})();
