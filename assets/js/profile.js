// profile.js
import { initNavbar, bindLogout, initHamburger, requireLogin, getProfile } from './auth.js';
import { supabase } from './config.js';

let user = null;

(async () => {
    await initNavbar();
    bindLogout();
    initHamburger();

    user = await requireLogin();
    if (!user) return; // requireLogin already redirected

    await loadProfile();
    bindProfileForm();
    bindPasswordForm();
    await loadHistory();
})();

async function loadProfile() {
    const profile = await getProfile(user.id);
    document.getElementById('profile-loading').style.display = 'none';
    document.getElementById('profile-content').style.display = 'block';
    document.getElementById('password-card').style.display = 'block';
    document.getElementById('history-card').style.display = 'block';

    if (!profile) return;

    const initials = (profile.full_name || '?').trim().split(' ').map(p => p[0]).filter(Boolean).slice(-2).join('').toUpperCase();
    const avatarEl = document.getElementById('pf-avatar-preview');
    avatarEl.innerHTML = profile.avatar_url
        ? `<img src="${escHtml(profile.avatar_url)}" alt="" onerror="this.parentElement.textContent='${initials}'" />`
        : initials;

    setText('pf-points', profile.points ?? 0);
    setText('pf-role', profile.role || '-');
    setText('pf-term', profile.term || '-');
    setVal('pf-fullname', profile.full_name || '');
    setVal('pf-avatar-url', profile.avatar_url || '');
    setVal('pf-email', profile.email || user.email || '');
}

function bindProfileForm() {
    const form = document.getElementById('profile-form');
    const btn = document.getElementById('pf-save-btn');
    const msg = document.getElementById('pf-msg');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fullName = document.getElementById('pf-fullname').value.trim();
        const avatarUrl = document.getElementById('pf-avatar-url').value.trim();

        if (!fullName) { showMsg(msg, 'Vui lòng nhập họ tên.', 'error'); return; }

        btn.disabled = true;
        btn.textContent = '⏳ Đang lưu...';
        try {
            // Only full_name / avatar_url can actually change here — the DB
            // trigger silently keeps points/role/role_rank/term/is_admin at
            // their current value for non-admin self-updates.
            const { error } = await supabase
                .from('profiles')
                .update({ full_name: fullName, avatar_url: avatarUrl || null })
                .eq('id', user.id);
            if (error) throw error;
            showMsg(msg, 'Đã lưu thay đổi!', 'success');
            await loadProfile();
        } catch (err) {
            showMsg(msg, err.message || 'Có lỗi xảy ra.', 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = '💾 Lưu thay đổi';
        }
    });
}

function bindPasswordForm() {
    const form = document.getElementById('password-form');
    const btn = document.getElementById('pf-pw-btn');
    const msg = document.getElementById('pf-pw-msg');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const pw = document.getElementById('pf-new-password').value;
        if (!pw || pw.length < 6) { showMsg(msg, 'Mật khẩu tối thiểu 6 ký tự.', 'error'); return; }

        btn.disabled = true;
        btn.textContent = '⏳ Đang đổi...';
        try {
            const { error } = await supabase.auth.updateUser({ password: pw });
            if (error) throw error;
            showMsg(msg, 'Đổi mật khẩu thành công!', 'success');
            document.getElementById('pf-new-password').value = '';
        } catch (err) {
            showMsg(msg, err.message || 'Có lỗi xảy ra.', 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Đổi mật khẩu';
        }
    });
}

const ACTION_LABELS = {
    daily_login: '🗓 Đăng nhập hằng ngày',
    read_activity: '📰 Đọc tạp chí',
    join_event: '📅 Tham gia sự kiện',
    comment: '💬 Bình luận',
    admin_adjust: '🛠 Admin điều chỉnh',
    legacy_backfill: '📦 Điểm tích lũy trước đó',
};

async function loadHistory() {
    const box = document.getElementById('pf-history-list');
    try {
        const { data, error } = await supabase
            .from('point_logs')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(20);
        if (error) throw error;

        if (!data || data.length === 0) {
            box.innerHTML = `<p style="color:var(--text-400);font-size:.85rem;">Chưa có hoạt động nào được ghi nhận.</p>`;
            return;
        }

        box.innerHTML = data.map(l => `
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:.85rem;">
        <span>${escHtml(ACTION_LABELS[l.action] || l.action)}</span>
        <span style="font-weight:700;color:${l.amount >= 0 ? 'var(--cyan-dark)' : 'var(--error)'};">${l.amount >= 0 ? '+' : ''}${l.amount}</span>
      </div>`).join('');
    } catch (err) {
        console.error('History load error:', err);
        box.innerHTML = `<p style="color:var(--error);font-size:.85rem;">Không tải được lịch sử.</p>`;
    }
}

function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
function setVal(id, val) { const el = document.getElementById(id); if (el) el.value = val; }
function showMsg(el, text, type) {
    el.textContent = text;
    el.style.display = 'block';
    el.style.color = type === 'error' ? 'var(--error)' : 'var(--success)';
}
function escHtml(str) {
    return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
