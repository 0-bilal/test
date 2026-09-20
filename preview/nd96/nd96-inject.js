/* حقن عناصر اليوم الوطني الـ96 فوق منيو الآيباد (معاينة) */
(() => {
  document.body.classList.add('nd96');

  const palm = (c1, c2) => `
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <g stroke="${c1}" stroke-width="3.4" stroke-linecap="round">
        <path d="M14 46 L50 22"/><path d="M50 46 L14 22"/>
      </g>
      <path d="M32 14c4 4 6 9 6 14s-2 10-6 14c-4-4-6-9-6-14s2-10 6-14z" fill="${c2}"/>
      <path d="M32 44v10" stroke="${c2}" stroke-width="3.2" stroke-linecap="round"/>
    </svg>`;

  /* 1) شريط السدو أعلى لوحة المنيو */
  const panel = document.querySelector('.menu-panel');
  const sadu = document.createElement('div');
  sadu.className = 'nd-sadu';
  panel.insertBefore(sadu, panel.firstChild);

  /* 2) وسم الشعار تحت اسم المطعم */
  const tagline = document.getElementById('rest-tagline');
  const pill = document.createElement('div');
  pill.className = 'nd-slogan-pill';
  pill.innerHTML = `${palm('#F0D67A', '#12924E')}
    <span class="nd-sl-txt">عزّنا بطبعنا</span>
    <span class="nd-sl-num">اليوم الوطني ٩٦</span>`;
  tagline.after(pill);

  /* 3) شريط اليوم الوطني قبل التصنيفات */
  const tabs = document.getElementById('category-tabs');
  const bar = document.createElement('div');
  bar.className = 'nd-bar';
  bar.innerHTML = `
    <span class="nd-bar-date">٢٣ سبتمبر ٢٠٢٦</span>
    <span class="nd-bar-title">نحتفل معكم بـ<em> اليوم الوطني السعودي الـ٩٦ </em></span>
    <span class="nd-bar-sep"></span>
    <span class="nd-bar-traits">شجاعة · همّة · أصالة · جود · كرم · رؤية</span>
    <span class="nd-bar-offer">عرض الوطن <b>٩٦ ريال</b> وجبة العائلة</span>`;
  tabs.parentNode.insertBefore(bar, tabs);

  /* 4) بطاقتا عرض وطني داخل القائمة */
  const items = [...document.querySelectorAll('.menu-item')];
  const picks = [items[0], items[4]].filter(Boolean);
  picks.forEach((el, i) => {
    el.classList.add('nd-pick');
    const rib = document.createElement('span');
    rib.className = 'nd-ribbon';
    rib.textContent = i === 0 ? 'اختيار اليوم الوطني' : 'عرض الوطن ٩٦';
    el.appendChild(rib);
    const badge = el.querySelector('.item-price-badge');
    if (badge) {
      const num = badge.querySelector('.item-price-num');
      const old = num ? num.textContent.trim() : '';
      if (num) num.textContent = String(Math.max(1, Math.round(parseFloat(old) * 0.9)));
      const oldEl = document.createElement('span');
      oldEl.className = 'nd-old-price';
      oldEl.textContent = old;
      badge.appendChild(oldEl);
    }
  });

  /* 5) ملاحظة الفوتر */
  const foot = document.querySelector('.menu-footer .tax-note');
  const note = document.createElement('span');
  note.className = 'nd-foot-note';
  note.innerHTML = `${palm('#F0D67A', '#12924E')} كل عام والوطن بخير`;
  note.querySelector('svg').style.cssText = 'width:18px;height:18px';
  foot.parentNode.insertBefore(note, foot.nextSibling);

  /* 6) شريحة اليوم الوطني المخصّصة داخل لوحة العرض */
  const slides = document.getElementById('slides-wrapper');
  const nd = document.createElement('div');
  nd.className = 'nd-slide';
  nd.innerHTML = `
    <span class="nd-band nd-band-top"></span>
    <span class="nd-band nd-band-bot"></span>
    <span class="nd-watermark"></span>
    <div class="nd-96-corner">${palm('#F0D67A', '#EAF6EE')}
      <div><div class="nd-96">96</div><div class="nd-96-lbl">اليوم الوطني السعودي</div></div>
    </div>
    <div class="nd-date-corner">٢٣ سبتمبر ٢٠٢٦</div>
    <div class="nd-hero">
      <div class="nd-h-kicker">${palm('#F0D67A', '#12924E')} المملكة العربية السعودية</div>
      <div class="nd-h-main">عزّنا <em>بطبعنا</em></div>
      <div class="nd-h-line"></div>
      <div class="nd-h-sub">شجاعة · همّة · أصالة · جود · كرم · رؤية</div>
      <div class="nd-h-duo">
        <img src="images/products/duo-burger.jpg" alt="">
        <div style="text-align:right">
          <div class="nd-h-offer-t">عرض الوطن من ديو برجر</div>
          <div class="nd-h-offer-p">وجبة العائلة بـ ٩٦ ريال · خصم ١٠٪ على المنيو</div>
        </div>
      </div>
    </div>`;
  slides.appendChild(nd);
})();
