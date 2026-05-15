/**
 * FIL Notifications System — v3.1
 * إصلاح مشكلة عكس ص/م في عرض الأوقات
 *
 * جذر المشكلة:
 * - الشيت يرسل الوقت بصيغة "HH:mm:ss" (يحتوي على ثوانٍ أيضاً)
 * - الكود القديم كان يقرأ الرقم لكن يمرره عبر new Date() فيحدث
 *   خلل في المنطقة الزمنية ويعكس ص/م
 *
 * الإصلاح: دالة parseTime24 تقرأ HH:mm أو HH:mm:ss بالـ regex مباشرة
 * بدون أي Date object — الساعة من 0 إلى 23 بشكل صريح.
 */

const FILNotifications = (() => {

    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyXUyG0W0EO_H836k4W8aeDJ_Grfmc25gj_3Qi36VBuKzmAg6vGOYtfntO_kBRFB3yoJg/exec';

    let notifications = [];
    let panelOpen     = false;
    let isLoading     = false;

    const btn = document.getElementById('notificationsBtn');
    const dot = btn?.querySelector('.notification-dot');

    // ── بناء اللوحة ──────────────────────────────────────────────────────────
    function buildPanel() {
        if (document.getElementById('notifPanel')) return;

        const panel = document.createElement('div');
        panel.id        = 'notifPanel';
        panel.className = 'notif-panel hidden';
        panel.innerHTML = `
            <div class="notif-header">
                <div class="notif-header-title">
                    <i data-lucide="bell" class="notif-header-icon"></i>
                    <span>الإشعارات</span>
                    <small>Notifications</small>
                </div>
                <button class="notif-close-btn" id="notifCloseBtn" title="إغلاق">
                    <i data-lucide="x"></i>
                </button>
            </div>
            <div class="notif-sync-bar" id="notifSyncBar">
                <div class="notif-sync-spinner"></div>
                <span>جاري مزامنة جداول الفحص...</span>
            </div>
            <div class="notif-body" id="notifBody">
                <div class="notif-empty">
                    <i data-lucide="check-circle-2" class="notif-empty-icon"></i>
                    <p>لا توجد إشعارات حالياً</p>
                    <small>No pending inspections</small>
                </div>
            </div>
            <div class="notif-footer">
                <button class="notif-refresh-btn" id="notifRefreshBtn">
                    <i data-lucide="refresh-cw"></i>
                    <span>تحديث</span>
                </button>
                <span class="notif-last-update" id="notifLastUpdate"></span>
            </div>
        `;

        document.body.appendChild(panel);
        document.getElementById('notifCloseBtn').addEventListener('click', closePanel);
        document.getElementById('notifRefreshBtn').addEventListener('click', () => fetchNotifications(true));
        lucide.createIcons();
    }

    // ── موضع اللوحة ──────────────────────────────────────────────────────────
    function positionPanel() {
        if (!btn) return;
        const panel = document.getElementById('notifPanel');
        if (!panel) return;

        const rect    = btn.getBoundingClientRect();
        const vpWidth = window.innerWidth;
        const panelW  = 310;

        panel.style.top = (rect.bottom + 10) + 'px';

        let leftPos = rect.left;
        if (leftPos + panelW > vpWidth - 12) leftPos = vpWidth - panelW - 12;
        if (leftPos < 12) leftPos = 12;

        panel.style.left  = leftPos + 'px';
        panel.style.right = 'auto';
    }

    // ── فتح / إغلاق ──────────────────────────────────────────────────────────
    function togglePanel() { panelOpen ? closePanel() : openPanel(); }

    function openPanel() {
        const panel = document.getElementById('notifPanel');
        if (!panel) return;
        positionPanel();
        panel.classList.remove('hidden');
        panel.classList.add('notif-panel-visible');
        panelOpen = true;
        btn?.classList.add('btn-active');
        renderNotifications();
    }

    function closePanel() {
        const panel = document.getElementById('notifPanel');
        if (!panel) return;
        panel.classList.add('notif-panel-hiding');
        btn?.classList.remove('btn-active');
        setTimeout(() => {
            panel.classList.remove('notif-panel-visible', 'notif-panel-hiding');
            panel.classList.add('hidden');
            panelOpen = false;
        }, 250);
    }

    // ── جلب البيانات ──────────────────────────────────────────────────────────
    async function fetchNotifications(showSync = false) {
        if (isLoading) return;
        isLoading = true;

        const syncBar = document.getElementById('notifSyncBar');
        if (showSync && syncBar) syncBar.classList.add('notif-sync-visible');
        dot?.classList.remove('dot-active');
        btn?.classList.add('btn-loading');

        try {
            const res  = await fetch(`${SCRIPT_URL}?action=getSchedule`);
            const data = await res.json();

            if (data.result === 'success' && Array.isArray(data.schedule)) {
                notifications = data.schedule.map(row => ({
                    branch:   row[0] || '—',
                    lastDate: row[1] || '—',   // yyyy-MM-dd
                    lastTime: row[2] || '—',   // HH:mm أو HH:mm:ss
                    nextTime: row[3] || '—'    // HH:mm أو HH:mm:ss
                }));

                // debug — احذفه بعد التأكد
                console.log('[FIL-Notif] بيانات مستلمة:', JSON.stringify(notifications));

                updateDot();
                if (panelOpen) renderNotifications();
            }
        } catch (err) {
            console.warn('[FIL-Notif] خطأ في الجلب:', err);
        } finally {
            isLoading = false;
            if (syncBar) syncBar.classList.remove('notif-sync-visible');
            btn?.classList.remove('btn-loading');

            const el = document.getElementById('notifLastUpdate');
            if (el) {
                const t = new Date();
                el.textContent = `آخر تحديث: ${t.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}`;
            }
        }
    }

    function updateDot() {
        if (!dot) return;
        dot.classList.toggle('dot-active', notifications.length > 0);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // تحليل الوقت — القلب الأساسي للإصلاح
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * parseTime24(str) → { h24: 0..23, min: 0..59 } | null
     *
     * يقبل:
     *   "10:53"       صح
     *   "10:53:45"    صح (يتجاهل الثواني)
     *   "2:00:00"     صح
     *   "14:00"       صح
     *
     * لا يلمس new Date() إطلاقاً.
     */
    function parseTime24(str) {
        if (!str || str === '—') return null;
        const s = str.toString().trim();

        // يطابق: H:mm أو HH:mm أو H:mm:ss أو HH:mm:ss
        const m = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
        if (!m) return null;

        const h24 = parseInt(m[1], 10);
        const min = parseInt(m[2], 10);

        if (h24 < 0 || h24 > 23 || min < 0 || min > 59) return null;
        return { h24, min };
    }

    /** دقائق من منتصف الليل للمقارنة */
    function timeToMinutes(str) {
        const t = parseTime24(str);
        return t ? t.h24 * 60 + t.min : null;
    }

    /**
     * formatTime — تحويل "HH:mm" أو "HH:mm:ss" → "H:mm ص/م"
     *
     * أمثلة:
     *   "10:53:45" → "10:53 ص"
     *   "14:00"    → "2:00 م"
     *   "00:30:00" → "12:30 ص"
     *   "12:05"    → "12:05 م"
     */
    function formatTime(val) {
        if (!val || val === '—') return '—';

        const t = parseTime24(val);
        if (!t) return val.toString();

        const { h24, min } = t;
        const suffix = h24 >= 12 ? 'م' : 'ص';   // 12→م ، 0..11→ص
        const h12    = h24 % 12 || 12;            // 0→12 ، 12→12 ، 13→1
        const mm     = String(min).padStart(2, '0');

        return `${h12}:${mm} ${suffix}`;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // تصنيف الإشعار
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * classifyTime — يقارن وقت الفحص القادم بالوقت الحالي
     *
     * diffMin = nextMin - nowMin  (موجب = لم يحن، سالب = تجاوزنا)
     *
     *   diffMin < -240       → overdue  (تأخر أكثر من 4 ساعات)
     *   -240 ≤ diffMin ≤ 30  → urgent   (قريب جداً أو تأخر ≤ 4h)
     *   30 < diffMin ≤ 120   → soon     (قريب)
     *   diffMin > 120        → ok       (مجدول)
     */
    function classifyTime(lastDate, lastTimeRaw, nextTimeRaw) {
        const nextMin = timeToMinutes(nextTimeRaw);
        if (nextMin === null) return 'unknown';

        const now    = new Date();
        const nowMin = now.getHours() * 60 + now.getMinutes();

        // هل آخر فحص كان اليوم؟
        let lastWasToday = false;
        if (lastDate && lastDate !== '—') {
            const m = lastDate.toString().match(/(\d{4})-(\d{2})-(\d{2})/);
            if (m) {
                const d = new Date(+m[1], +m[2] - 1, +m[3]);
                lastWasToday = d.toDateString() === now.toDateString();
            }
        }

        const lastMin   = timeToMinutes(lastTimeRaw);
        // الفحص القادم في اليوم التالي إذا كان وقته أصغر من وقت آخر فحص في نفس اليوم
        const isNextDay = lastWasToday && lastMin !== null && nextMin < lastMin;

        const diffMin = isNextDay
            ? (1440 - nowMin) + nextMin
            : nextMin - nowMin;

        if (diffMin < -240) return 'overdue';
        if (diffMin <= 30)  return 'urgent';
        if (diffMin <= 120) return 'soon';
        return 'ok';
    }

    // ── رسم الإشعارات ────────────────────────────────────────────────────────
    function renderNotifications() {
        const body = document.getElementById('notifBody');
        if (!body) return;

        if (notifications.length === 0) {
            body.innerHTML = `
                <div class="notif-empty">
                    <i data-lucide="check-circle-2" class="notif-empty-icon"></i>
                    <p>لا توجد إشعارات حالياً</p>
                    <small>No pending inspections</small>
                </div>`;
            lucide.createIcons();
            return;
        }

        body.innerHTML = notifications.map((n, i) => {
            const status = classifyTime(n.lastDate, n.lastTime, n.nextTime);
            const meta   = statusMeta(status);
            return `
            <div class="notif-item notif-${status}" style="animation-delay:${i * 55}ms">
                <div class="notif-item-icon ${meta.iconClass}">
                    <i data-lucide="${meta.icon}"></i>
                </div>
                <div class="notif-item-body">
                    <div class="notif-item-branch">
                        <i data-lucide="map-pin" class="notif-branch-pin"></i>
                        ${n.branch}
                    </div>
                    <div class="notif-item-detail">
                        <i data-lucide="calendar" class="notif-row-icon"></i>
                        <span class="notif-label">تاريخ آخر فحص:</span>
                        <span class="notif-val">${formatDate(n.lastDate)}</span>
                    </div>
                    <div class="notif-item-detail">
                        <i data-lucide="clock" class="notif-row-icon"></i>
                        <span class="notif-label">وقت آخر فحص:</span>
                        <span class="notif-val">${formatTime(n.lastTime)}</span>
                    </div>
                    <div class="notif-item-next">
                        <i data-lucide="alarm-clock" class="notif-row-icon"></i>
                        <span class="notif-label">الفحص القادم:</span>
                        <span class="notif-time notif-time-${status}">${formatTime(n.nextTime)}</span>
                    </div>
                </div>
                <div class="notif-badge notif-badge-${status}">${meta.label}</div>
            </div>`;
        }).join('');

        lucide.createIcons();
    }

    function statusMeta(status) {
        return ({
            overdue: { icon: 'alert-circle',  iconClass: 'icon-overdue', label: 'متأخر'     },
            urgent:  { icon: 'clock',          iconClass: 'icon-urgent',  label: 'قريب جداً' },
            soon:    { icon: 'clock-3',         iconClass: 'icon-soon',    label: 'قريب'      },
            ok:      { icon: 'check-circle',   iconClass: 'icon-ok',      label: 'مجدول'     },
            unknown: { icon: 'calendar-clock', iconClass: 'icon-unknown', label: 'غير محدد'  }
        })[status] || { icon: 'calendar-clock', iconClass: 'icon-unknown', label: 'غير محدد' };
    }

    function formatDate(val) {
        if (!val || val === '—') return '—';
        const match = val.toString().match(/(\d{4})-(\d{2})-(\d{2})/);
        if (match) return `${match[1]}/${match[2]}/${match[3]}`;
        const d = new Date(val);
        if (!isNaN(d)) {
            return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
        }
        return val.toString();
    }

    // ── التهيئة ──────────────────────────────────────────────────────────────
    function init() {
        buildPanel();

        btn?.addEventListener('click', (e) => {
            e.stopPropagation();
            togglePanel();
        });

        document.addEventListener('click', (e) => {
            if (!panelOpen) return;
            const panel = document.getElementById('notifPanel');
            if (panel && !panel.contains(e.target) && !btn?.contains(e.target)) {
                closePanel();
            }
        });

        window.addEventListener('resize', () => {
            if (panelOpen) positionPanel();
        });

        fetchNotifications(false);
    }

    return { init, refresh: () => fetchNotifications(true) };

})();

document.addEventListener('DOMContentLoaded', () => {
    FILNotifications.init();
});