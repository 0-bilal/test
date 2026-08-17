/**
 * menu.js — منيو ديو برجر للجوال
 * يعتمد على restaurantInfo و menuCategories من products.js
 */

(function () {
  'use strict';

  /* أيقونة افتراضية للبطاقات بلا صورة */
  const PH_ICON = {
    'fa-burger':         'fa-burger',
    'fa-bowl-food':      'fa-bowl-food',
    'fa-glass-water':    'fa-glass-water',
    'fa-bottle-droplet': 'fa-bottle-droplet',
  };

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
    window.scrollTo({ top, behavior: 'smooth' });
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

    const open = () => _openModal(cat, item);
    card.addEventListener('click',   open);
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') open(); });
    return card;
  }

  /* ══════════════════════════════════════════
     MODAL
  ══════════════════════════════════════════ */
  function _openModal(cat, item) {
    const overlay  = document.getElementById('m-modal-overlay');
    const modal    = document.getElementById('m-modal');
    const imgArea  = modal && modal.querySelector('.m-modal-img-area');
    const body     = modal && modal.querySelector('.m-modal-body');
    if (!overlay || !modal || !imgArea || !body) return;

    const hasImage = item.image && item.image.trim();
    const phIcon   = PH_ICON[cat.icon] || 'fa-utensils';

    imgArea.innerHTML = hasImage
      ? `<img class="m-modal-img" src="${item.image}" alt="${item.nameAr}">`
      : `<div class="m-modal-img-ph"><i class="fa-solid ${phIcon}"></i></div>`;

    /* السعرات */
    const calEl = item.calories
      ? `<span class="m-modal-cal"><i class="fa-solid fa-fire-flame-curved"></i>${item.calories} سعرة حرارية</span>` : '';
    const mealEl = item.isMeal
      ? `<span class="m-modal-meal"><i class="fa-solid fa-utensils"></i>وجبة متكاملة</span>` : '';

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
        <div class="m-modal-name-ar">${item.nameAr}</div>
        ${item.nameEn ? `<div class="m-modal-name-en">${item.nameEn}</div>` : ''}
      </div>
      <div class="m-modal-price-row">
        ${item.price != null ? `
          <div class="m-modal-price">
            <span class="m-modal-price-num">${item.price}</span>
            <span class="m-modal-price-cur">ر.س</span>
          </div>` : ''}
        ${calEl}${mealEl}
      </div>
      ${item.descriptionAr ? `<p class="m-modal-desc">${item.descriptionAr}</p>` : ''}
      ${ingredientsHtml}${sauceHtml}${variantsHtml}`;

    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    _enableSwipeClose(overlay, modal);
  }

  function _closeModal() {
    const overlay = document.getElementById('m-modal-overlay');
    if (!overlay) return;
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  function _setupModalClose() {
    const overlay  = document.getElementById('m-modal-overlay');
    const closeBtn = document.getElementById('m-modal-close');
    if (overlay)  overlay.addEventListener('click', e => { if (e.target === overlay) _closeModal(); });
    if (closeBtn) closeBtn.addEventListener('click', _closeModal);
  }

  /* سحب للإغلاق */
  function _enableSwipeClose(overlay, modal) {
    let startY = 0, dragging = false;
    const onStart = e => { startY = e.touches[0].clientY; dragging = true; modal.style.transition = 'none'; };
    const onMove  = e => { if (!dragging) return; const dy = e.touches[0].clientY - startY; if (dy > 0) modal.style.transform = `translateY(${dy}px)`; };
    const onEnd   = e => {
      if (!dragging) return; dragging = false; modal.style.transition = '';
      if (e.changedTouches[0].clientY - startY > 100) { _closeModal(); }
      else { modal.style.transform = ''; }
    };
    if (modal._swipeStart) {
      modal.removeEventListener('touchstart', modal._swipeStart);
      modal.removeEventListener('touchmove',  modal._swipeMove);
      modal.removeEventListener('touchend',   modal._swipeEnd);
    }
    modal._swipeStart = onStart; modal._swipeMove = onMove; modal._swipeEnd = onEnd;
    modal.addEventListener('touchstart', onStart, { passive: true });
    modal.addEventListener('touchmove',  onMove,  { passive: true });
    modal.addEventListener('touchend',   onEnd);
  }

  /* ══════════════════════════════════════════
     Scroll Spy
  ══════════════════════════════════════════ */
  function _setupScrollSpy(cats) {
    const offset = 68 + 54 + 24;
    let ticking  = false;
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
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
    const btnL = btn.offsetLeft, btnR = btnL + btn.offsetWidth, barW = bar.clientWidth, scrollL = bar.scrollLeft;
    if (btnL < scrollL)            bar.scrollTo({ left: btnL - 12,         behavior: 'smooth' });
    else if (btnR > scrollL + barW) bar.scrollTo({ left: btnR - barW + 12, behavior: 'smooth' });
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
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  /* ══════════════════════════════════════════
     البدء
  ══════════════════════════════════════════ */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildPage);
  else buildPage();

})();
