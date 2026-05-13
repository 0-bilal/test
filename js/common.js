/**
 * QB-Sentinel - Common Functions
 * هذا الملف يحتوي على الوظائف المشتركة لجميع صفحات النظام
 */

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. تفعيل أيقونات Lucide في جميع الصفحات
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // 2. إعدادات المودال العام (Modal)
    const els = {
        modal: document.getElementById('customModal'),
        modalTitle: document.getElementById('modalTitle'),
        modalMsg: document.getElementById('modalMessage'),
        modalIcon: document.getElementById('modalIcon'),
        modalLoader: document.getElementById('modalLoader'),
        modalClose: document.getElementById('modalClose')
    };

    // دالة إظهار المودال (قابلة للاستخدام من أي ملف آخر)
    window.showModal = (type, title, message) => {
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
            const icon = type === 'success' ? 'check-circle' : (type === 'error' ? 'alert-circle' : 'refresh-cw');
            els.modalIcon.innerHTML = `<i data-lucide="${icon}" class="${type}-icon"></i>`;
            lucide.createIcons();
        }
    };

    // إغلاق المودال عند الضغط على زر الإغلاق
    if (els.modalClose) {
        els.modalClose.onclick = () => els.modal.classList.add('hidden');
    }

    // 3. وظيفة زر تحديث النظام (Refresh App)
    const refreshBtn = document.getElementById('refreshApp');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            // إظهار تنبيه للمستخدم
            window.showModal('loading', 'تحديث النظام', 'جاري جلب أحدث نسخة من التقارير والملفات...');

            // إلغاء تسجيل الـ Service Worker لمسح الكاش البرمجي
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                    for(let registration of registrations) {
                        registration.unregister();
                    }
                });
            }

            // مسح الكاش وإعادة التحميل القسري من السيرفر
            setTimeout(() => {
                window.location.reload(true);
            }, 1200);
        });
    }
});