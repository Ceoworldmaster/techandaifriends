// announcements.js
import { initNavbar, bindLogout, initHamburger } from './auth.js';
import { supabase } from './config.js';

(async () => {
    await initNavbar();
    bindLogout();
    initHamburger();
    await loadAnnouncements();
})();

async function loadAnnouncements() {
    const list = document.getElementById('ann-list');
    try {
        const { data, error } = await supabase
            .from('announcements')
            .select('*')
            .order('pinned', { ascending: false })
            .order('created_at', { ascending: false });
        if (error) throw error;

        if (!data || data.length === 0) {
            list.innerHTML = `<div class="comments-empty" style="text-align:center;padding:var(--sp-6) 0;">Chưa có thông báo nào.</div>`;
            return;
        }

        list.innerHTML = data.map(a => `
      <div class="announcement-card ${a.pinned ? 'pinned' : ''}">
        ${a.pinned ? '<span class="announcement-pin-tag">📌 Đã ghim</span>' : ''}
        <h3>${escHtml(a.title)}</h3>
        <span class="ann-date">${new Date(a.created_at).toLocaleString('vi-VN')}</span>
        <div class="ann-content">${escHtml(a.content)}</div>
      </div>
    `).join('');
    } catch (err) {
        console.error('Announcements load error:', err);
        list.innerHTML = `<div class="comments-empty" style="text-align:center;color:var(--error);">Không tải được thông báo.</div>`;
    }
}

function escHtml(str) {
    return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
