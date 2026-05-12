document.addEventListener('DOMContentLoaded', () => {
    
    // تعريف العناصر الموجودة في المودال (لأغراض التنبيهات العامة إن وجدت)
    const els = {
        modal: document.getElementById('customModal'),
        modalTitle: document.getElementById('modalTitle'),
        modalMsg: document.getElementById('modalMessage'),
        modalIcon: document.getElementById('modalIcon'),
        modalLoader: document.getElementById('modalLoader'),
        modalClose: document.getElementById('modalClose')
    };

    // دالة إظهار الرسائل المنبثقة (Modal) - مفيدة لإظهار تنبيهات "الاطلاق قريبا" أو أخطاء التحميل
    const showModal = (type, title, message) => {
        if (!els.modal) return; // التأكد من وجود المودال في الصفحة
        
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

    // تفعيل أيقونات Lucide الموجودة في الصفحة
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

});