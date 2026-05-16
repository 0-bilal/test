'use strict';

/* =============================================
   CONFIGURATION
   ============================================= */

const OPERATIONS = {
    dough: {
        ar: 'تصنيع عجين ميني بان كيك',
        en: 'Mini Pancake Dough',
        summaryClass: 'si-dough',
        icon: 'cookie',
        resultTpl: (qty) => `تم تسجيل تصنيع ${formatGrams(qty)} من عجين ميني بان كيك`,
    },
    berry: {
        ar: 'تحويل الفراولة الطبيعي ← مجمد',
        en: 'Fresh Strawberry → Frozen',
        summaryClass: 'si-berry',
        icon: 'snowflake',
        resultTpl: (qty) => `تحويل ${formatGrams(qty)} فراولة طبيعي ← فراولة مجمد`,
    },
    red: {
        ar: 'تحويل التوت الأحمر الطبيعي ← مجمد',
        en: 'Fresh Red Raspberry → Frozen',
        summaryClass: 'si-red',
        icon: 'snowflake',
        resultTpl: (qty) => `تحويل ${formatGrams(qty)} توت أحمر طبيعي ← توت أحمر مجمد`,
    },
    black: {
        ar: 'تحويل التوت الأسود الطبيعي ← مجمد',
        en: 'Fresh Blackberry → Frozen',
        summaryClass: 'si-black',
        icon: 'snowflake',
        resultTpl: (qty) => `تحويل ${formatGrams(qty)} توت أسود طبيعي ← توت أسود مجمد`,
    },
};


/** Format grams: show as grams or convert to kg if ≥ 1000 */
function formatGrams(g) {
    const n = parseInt(g) || 0;
    if (n >= 1000) {
        const kg = (n / 1000).toFixed(n % 1000 === 0 ? 0 : 2);
        return `kg ${kg} (${n} g)`;
    }
    return `${n} g`;
}

function setHidden(el, hide) {
    if (!el) return;
    el.classList.toggle('hidden', hide);
}

/* =============================================
   TOGGLE — open/close operation panel
   ============================================= */

document.querySelectorAll('.mfg-toggle input[type="checkbox"]').forEach(chk => {
    chk.addEventListener('change', function () {
        const opKey = this.dataset.op;
        const opEl  = document.getElementById(`op-${opKey}`);
        const body  = document.getElementById(`det-${opKey}`);
        const input = document.getElementById(`qty-${opKey}`);
        const res   = document.getElementById(`res-${opKey}`);

        if (this.checked) {
            opEl.classList.add('is-active');
            body.classList.add('is-open');
            // After accordion animation, scroll the first input into view above keyboard
            setTimeout(() => {
                const firstInput = body.querySelector('input');
                if (firstInput) {
                    firstInput.focus({ preventScroll: true });
                    // Scroll the op block into view so it's visible above the keyboard
                    opEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 430);
        } else {
            opEl.classList.remove('is-active');
            body.classList.remove('is-open');
            // Clear qty and result when closed
            if (input) input.value = '';
            if (res)   res.classList.add('hidden');
        }

        refreshSummary();
        lucide.createIcons();
    });
});

/* =============================================
   DOUGH INGREDIENTS — ingredient inputs config
   ============================================= */

const DOUGH_INGREDIENTS = [
    { id: 'ing-egg',       ar: 'بيض',           unit: 'حبة', isCount: true  },
    { id: 'ing-sugar',     ar: 'سكر',           unit: 'g',   isCount: false },
    { id: 'ing-vanilla',   ar: 'فانيليا باودر', unit: 'g',   isCount: false },
    { id: 'ing-baking',    ar: 'بيكنج باودر',   unit: 'g',   isCount: false },
    { id: 'ing-sweetener', ar: 'محلي',          unit: 'g',   isCount: false },
    { id: 'ing-butter',    ar: 'زبدة',          unit: 'g',   isCount: false },
    { id: 'ing-flour',     ar: 'طحين',          unit: 'g',   isCount: false },
    { id: 'ing-milk',      ar: 'حليب',          unit: 'g',   isCount: false },
];

function getDoughIngredientsFilled() {
    return DOUGH_INGREDIENTS.map(ing => {
        const el  = document.getElementById(ing.id);
        const val = parseFloat(el?.value) || 0;
        return { ...ing, val };
    }).filter(i => i.val > 0);
}

function formatIngVal(ing) {
    if (ing.isCount) return `${ing.val} ${ing.unit}`;
    const n = ing.val;
    if (n >= 1000) {
        const kg = (n / 1000).toFixed(n % 1000 === 0 ? 0 : 2);
        return `kg ${kg} (${n}g)`;
    }
    return `${n} ${ing.unit}`;
}

function refreshDoughResult() {
    const totalInput = document.getElementById('qty-dough');
    const res        = document.getElementById('res-dough');
    const txt        = document.getElementById('res-dough-text');
    const totalVal   = parseInt(totalInput?.value) || 0;
    const filledIngs = getDoughIngredientsFilled();

    if (totalVal > 0 && res && txt) {
        txt.textContent = `تم تسجيل تصنيع ${formatGrams(totalVal)} من عجين ميني بان كيك`;
        res.classList.remove('hidden');
    } else if (res) {
        res.classList.add('hidden');
    }
}

// Ingredient inputs — registered at parse time (no DOMContentLoaded needed, script is at bottom)
function bindIngredientInputs() {
    document.querySelectorAll('.ing-input').forEach(input => {
        input.addEventListener('input', () => {
            refreshDoughResult();
            refreshSummary();
        });
        // Scroll focused row into view above keyboard on mobile
        input.addEventListener('focus', function () {
            setTimeout(() => {
                this.closest('.ing-row')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 350);
        });
    });
}

/* =============================================
   QUANTITY INPUT — live result feedback
   (handles ONLY the main total qty-dough input and the berry/red/black inputs)
   ============================================= */

document.querySelectorAll('.qty-input').forEach(input => {
    // Skip ingredient inputs — they have their own handler via bindIngredientInputs()
    if (input.classList.contains('ing-input')) return;

    input.addEventListener('input', function () {
        const opKey = this.dataset.op;

        if (opKey === 'dough') {
            refreshDoughResult();
            refreshSummary();
            return;
        }

        const val = parseInt(this.value);
        const res = document.getElementById(`res-${opKey}`);
        const txt = document.getElementById(`res-${opKey}-text`);

        if (val > 0 && txt && res) {
            txt.textContent = OPERATIONS[opKey].resultTpl(val);
            res.classList.remove('hidden');
        } else if (res) {
            res.classList.add('hidden');
        }

        refreshSummary();
    });
});

/* =============================================
   SUMMARY BANNER — active operations overview
   ============================================= */

function refreshSummary() {
    const banner = document.getElementById('mfgSummaryBanner');
    const list   = document.getElementById('summaryList');
    const count  = document.getElementById('summaryCount');

    const activeOps = [];

    Object.keys(OPERATIONS).forEach(opKey => {
        const chk = document.getElementById(`toggle-${opKey}`);
        const qty = parseInt(document.getElementById(`qty-${opKey}`)?.value) || 0;
        if (chk && chk.checked) {
            activeOps.push({ opKey, qty });
        }
    });

    if (activeOps.length === 0) {
        setHidden(banner, true);
        return;
    }

    setHidden(banner, false);
    count.textContent = `${activeOps.length} ${activeOps.length === 1 ? 'عملية' : 'عمليات'}`;

    list.innerHTML = activeOps.map(({ opKey, qty }) => {
        const op      = OPERATIONS[opKey];
        const qtyText = qty > 0 ? formatGrams(qty) : 'لم تُدخل كمية';
        return `
            <div class="summary-item ${op.summaryClass}">
                <i data-lucide="${op.icon}"></i>
                <span>${op.ar}</span>
                <span class="summary-item-qty">${qtyText}</span>
            </div>
        `;
    }).join('');

    lucide.createIcons();
}

/* =============================================
   MODAL
   ============================================= */

function showModal(type, title, message) {
    const overlay  = document.getElementById('customModal');
    const iconWrap = document.getElementById('modalIcon');
    const loader   = document.getElementById('modalLoader');
    const closeBtn = document.getElementById('modalClose');

    document.getElementById('modalTitle').textContent   = title;
    document.getElementById('modalMessage').textContent = message;

    setHidden(overlay, false);
    setHidden(loader, true);
    setHidden(closeBtn, true);
    iconWrap.innerHTML = '';

    if (type === 'loading') {
        setHidden(loader, false);
    } else if (type === 'success') {
        iconWrap.innerHTML = '<i data-lucide="check-circle" class="success-icon"></i>';
        setHidden(closeBtn, false);
        lucide.createIcons();
    } else {
        iconWrap.innerHTML = '<i data-lucide="alert-circle" class="error-icon"></i>';
        setHidden(closeBtn, false);
        lucide.createIcons();
    }
}

document.getElementById('modalClose').addEventListener('click', () => {
    setHidden(document.getElementById('customModal'), true);
});

/* =============================================
   FORM SUBMIT — validate & send
   ============================================= */

document.getElementById('mfgForm').addEventListener('submit', function (e) {
    e.preventDefault();

    // Validate branch
    const branch = document.querySelector('input[name="branch"]:checked');
    if (!branch) {
        showModal('error', 'خطأ في الإدخال', 'يرجى اختيار الفرع أولاً');
        return;
    }

    // Validate employee ID
    const empId = document.getElementById('employeeId').value.trim();
    if (!empId) {
        showModal('error', 'خطأ في الإدخال', 'يرجى إدخال رقم الموظف للتحقق');
        return;
    }

    // Collect active operations
    const activeOps = [];
    Object.keys(OPERATIONS).forEach(opKey => {
        const chk = document.getElementById(`toggle-${opKey}`);
        if (chk && chk.checked) {
            const qty = parseInt(document.getElementById(`qty-${opKey}`)?.value) || 0;
            activeOps.push({ opKey, qty });
        }
    });

    if (activeOps.length === 0) {
        showModal('error', 'خطأ في الإدخال', 'يرجى تفعيل عملية تصنيع واحدة على الأقل');
        return;
    }

    // Validate quantities + collect ingredients for dough
    const missingQty = activeOps.find(o => o.qty < 1);
    if (missingQty) {
        const opName = OPERATIONS[missingQty.opKey].ar;
        showModal('error', 'كمية مفقودة', `يرجى إدخال الكمية الإجمالية لعملية:\n${opName}`);
        return;
    }

    // Build submit lines
    const lines = activeOps.map(({ opKey, qty }) => {
        let line = `• ${OPERATIONS[opKey].ar}: ${formatGrams(qty)}`;
        if (opKey === 'dough') {
            const ings = getDoughIngredientsFilled();
            if (ings.length > 0) {
                line += '\n  المكونات: ' + ings.map(i => `${i.ar} ${formatIngVal(i)}`).join('، ');
            }
        }
        return line;
    }).join('\n');

    const nowStr = new Date().toLocaleString('ar-SA', { dateStyle: 'short', timeStyle: 'short' });

    showModal('loading', 'جارٍ الإرسال...', 'يتم رفع بيانات التصنيع إلى السجل');

    setTimeout(() => {
        showModal(
            'success',
            'تم الإرسال بنجاح',
            `فرع ${branch.value} `
        );
    }, 1800);
});

/* =============================================
   HEADER BUTTONS
   ============================================= */

const refreshBtn = document.getElementById('refreshApp');
if (refreshBtn) {
    refreshBtn.addEventListener('click', () => location.reload());
}

/* =============================================
   INIT
   ============================================= */

document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    bindIngredientInputs();
});