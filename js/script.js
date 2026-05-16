// دالة فتح/إغلاق الأقسام
function toggleSection(btn) {
    const group = btn.closest('.section-group');
    const isOpen = group.classList.contains('open');

    group.classList.toggle('open', !isOpen);

    // حفظ حالة القسم في localStorage
    const sectionKey = group.dataset.section;
    if (sectionKey) {
        localStorage.setItem('section_' + sectionKey, !isOpen ? 'open' : 'closed');
    }

    // إعادة رسم أيقونات Lucide بعد تغيير الحالة
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// استعادة حالة الأقسام من localStorage عند التحميل
function restoreSections() {
    document.querySelectorAll('.section-group[data-section]').forEach(group => {
        const key = group.dataset.section;
        const saved = localStorage.getItem('section_' + key);
        if (saved === 'closed') {
            group.classList.remove('open');
        }
        // إذا لم تكن محفوظة أو كانت 'open' تبقى مفتوحة (الوضع الافتراضي)
    });
}

document.addEventListener('DOMContentLoaded', () => {

    // استعادة حالة الأقسام
    restoreSections();

    // تعريف العناصر الموجودة في المودال
    const els = {
        modal: document.getElementById('customModal'),
        modalTitle: document.getElementById('modalTitle'),
        modalMsg: document.getElementById('modalMessage'),
        modalIcon: document.getElementById('modalIcon'),
        modalLoader: document.getElementById('modalLoader'),
        modalClose: document.getElementById('modalClose')
    };

    // دالة إظهار الرسائل المنبثقة
    const showModal = (type, title, message) => {
        if (!els.modal) return;

        els.modal.classList.remove('hidden');
        els.modalTitle.innerText = title;
        els.modalMsg.innerText = message;
        els.modalLoader.classList.add('hidden');
        els.modalClose.classList.add('hidden');

        if (type === 'loading') {
            els.modalLoader.classList.remove('hidden');
        } else {
            els.modalClose.classList.remove('hidden');
            const icon = type === 'success' ? 'check-circle' : 'alert-circle';
            els.modalIcon.innerHTML = `<i data-lucide="${icon}" class="${type}-icon"></i>`;
            lucide.createIcons();
        }
    };

    // إغلاق المودال
    if (els.modalClose) {
        els.modalClose.onclick = () => els.modal.classList.add('hidden');
    }

    // تفعيل أيقونات Lucide
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

});