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
            // Focus qty field after animation
            setTimeout(() => input && input.focus(), 420);
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
   QUANTITY INPUT — live result feedback
   ============================================= */

document.querySelectorAll('.qty-input').forEach(input => {
    input.addEventListener('input', function () {
        const opKey = this.dataset.op;
        const val   = parseInt(this.value);
        const res   = document.getElementById(`res-${opKey}`);
        const txt   = document.getElementById(`res-${opKey}-text`);

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

    // Validate quantities
    const missingQty = activeOps.find(o => o.qty < 1);
    if (missingQty) {
        const opName = OPERATIONS[missingQty.opKey].ar;
        showModal('error', 'كمية مفقودة', `يرجى إدخال الكمية (بالجرام) لعملية:\n${opName}`);
        return;
    }

    showModal('loading', 'جارٍ الإرسال...', 'يتم رفع بيانات التصنيع إلى السجل');

    // Build summary for success message
    const lines = activeOps.map(({ opKey, qty }) =>
        `• ${OPERATIONS[opKey].ar}: ${formatGrams(qty)}`
    ).join('\n');

    const nowStr = new Date().toLocaleString('ar-SA', { dateStyle: 'short', timeStyle: 'short' });

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
});