// admin.js — Full admin panel logic
import { supabase, createIsolatedClient } from './config.js';
import { requireAdmin, getUser, getProfile } from './auth.js';

/* ── Guard & Init ──────────────────────────────────────────── */
let currentUserId = null;

(async () => {
    await requireAdmin();

    const user = await getUser();
    currentUserId = user?.id || null;
    const profile = user ? await getProfile(user.id) : null;

    if (profile) {
        const initial = (profile.full_name || 'A')[0].toUpperCase();
        const el = document.getElementById('admin-avatar-initial');
        const nm = document.getElementById('admin-display-name');
        if (el) el.textContent = initial;
        if (nm) nm.textContent = profile.full_name || 'Admin';
    }

    document.getElementById('admin-logout')?.addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.href = 'login.html';
    });

    initTabs();
    initMobileMenu();
    initRippleEffect();
    initEditModal();
    await loadAdminStats();
    await loadMembersTable();
    await loadPublishedTable();
    await loadApplicationsTable();
    await loadAnnouncementsTable();
    await loadEventsTable();
    bindForms();
})();

/* ── Tabs ──────────────────────────────────────────────────── */
const TAB_META = {
    personnel: { title: 'Quản lý Nhân sự', sub: 'Tạo tài khoản và quản lý điểm thành viên' },
    publish: { title: 'Xuất bản Báo chí', sub: 'Upload PDF và xuất bản số báo mới' },
    approvals: { title: 'Phê duyệt Ứng viên', sub: 'Xem xét và xử lý đơn đăng ký' },
    announcements: { title: 'Thông báo', sub: 'Đăng và quản lý thông báo công khai' },
    events: { title: 'Sự kiện', sub: 'Tạo sự kiện và theo dõi đăng ký tham gia' },
};

function initTabs() {
    document.querySelectorAll('.sidebar-nav-item[data-tab]').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
}

function switchTab(tabId) {
    document.querySelectorAll('.sidebar-nav-item[data-tab]').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.admin-tab-pane').forEach(p => p.classList.remove('active'));

    document.querySelector(`.sidebar-nav-item[data-tab="${tabId}"]`)?.classList.add('active');
    document.getElementById(`tab-${tabId}`)?.classList.add('active');

    const meta = TAB_META[tabId];
    if (meta) {
        document.getElementById('topbar-title').textContent = meta.title;
        document.getElementById('topbar-sub').textContent = meta.sub;
    }

    document.getElementById('admin-sidebar')?.classList.remove('open');
    document.getElementById('sidebar-overlay')?.classList.remove('show');
}

/* ── Ripple Effect (micro-interaction: gợn sóng khi click) ────
   Delegate 1 listener duy nhất ở document để áp dụng cho MỌI nút
   có class .action-btn, .btn hoặc .mi-ripple — kể cả các nút được
   render động sau này (bảng dữ liệu, modal...). */
function initRippleEffect() {
    document.addEventListener('click', (e) => {
        const target = e.target.closest('.action-btn, .btn, .mi-ripple');
        if (!target) return;
        const rect = target.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const dot = document.createElement('span');
        dot.className = 'ripple-dot';
        dot.style.width = dot.style.height = size + 'px';
        dot.style.left = (e.clientX - rect.left - size / 2) + 'px';
        dot.style.top = (e.clientY - rect.top - size / 2) + 'px';
        target.appendChild(dot);
        dot.addEventListener('animationend', () => dot.remove());
    });
}

/* ── Skeleton loading (thay "Đang tải..." tĩnh bằng shimmer mượt) ─ */
function skeletonRows(colCount, rowCount = 3) {
    const cells = Array.from({ length: colCount }, () => `<td><div class="skeleton-bar"></div></td>`).join('');
    return Array.from({ length: rowCount }, () => `<tr class="skeleton-row">${cells}</tr>`).join('');
}

/* ── Mobile Menu ───────────────────────────────────────────── */
function initMobileMenu() {
    const btn = document.getElementById('admin-menu-btn');
    const sidebar = document.getElementById('admin-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (!btn) return;
    btn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('show');
    });
    overlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('show');
    });
}

/* ── Admin Stats ───────────────────────────────────────────── */
async function loadAdminStats() {
    try {
        const [mRes, iRes, pRes, ptRes] = await Promise.all([
            supabase.from('profiles').select('id', { count: 'exact', head: true }),
            supabase.from('activities').select('id', { count: 'exact', head: true }),
            supabase.from('registrations').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
            supabase.from('profiles').select('points'),
        ]);
        const totalPts = (ptRes.data || []).reduce((s, r) => s + (r.points || 0), 0);

        setText('as-members', mRes.count ?? 0);
        setText('as-issues', iRes.count ?? 0);
        setText('as-pending', pRes.count ?? 0);
        setText('as-points', totalPts.toLocaleString('vi-VN'));

        const badge = document.getElementById('pending-badge');
        if (badge) {
            const count = pRes.count ?? 0;
            badge.textContent = count;
            badge.style.display = count > 0 ? 'inline-flex' : 'none';
        }
    } catch (err) {
        console.error('Stats error:', err);
    }
}

/* ── Members Table ─────────────────────────────────────────── */
async function loadMembersTable() {
    const tbody = document.getElementById('members-table-body');
    tbody.innerHTML = skeletonRows(6);
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, email, full_name, role, term, points, avatar_url, role_rank')
            .order('role_rank')
            .order('full_name');
        if (error) throw error;

        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-400);">Chưa có thành viên nào.</td></tr>`;
            return;
        }

        tbody.innerHTML = data.map(m => {
            const initials = (m.full_name || '?').trim().split(' ').map(p => p[0]).filter(Boolean).slice(-2).join('').toUpperCase();
            const avatarHtml = m.avatar_url
                ? `<img src="${escHtml(m.avatar_url)}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;vertical-align:middle;margin-right:8px;" alt="" onerror="this.style.display='none'" />`
                : `<span style="display:inline-flex;width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#00D2FF,#7928CA);color:#fff;font-size:.65rem;font-weight:700;align-items:center;justify-content:center;vertical-align:middle;margin-right:8px;">${escHtml(initials)}</span>`;
            return `
      <tr>
        <td><div style="display:flex;align-items:center;">${avatarHtml}<span style="font-weight:600;color:var(--text-900);">${escHtml(m.full_name)}</span></div></td>
        <td style="font-size:.82rem;color:var(--text-500);">${escHtml(m.email || '-')}</td>
        <td>${escHtml(m.role)}</td>
        <td>${escHtml(m.term)}</td>
        <td style="font-weight:700;color:var(--cyan);">${m.points || 0}</td>
        <td>
          <div class="points-row">
            <input class="admin-input points-input" type="number" min="1" max="999" value="10" id="pts-${m.id}" />
            <button class="action-btn action-add-pts" data-id="${m.id}" data-op="add">+</button>
            <button class="action-btn action-sub-pts" data-id="${m.id}" data-op="sub">−</button>
          </div>
        </td>
      </tr>`;
        }).join('');

        tbody.querySelectorAll('.action-btn[data-op]').forEach(btn => {
            btn.addEventListener('click', () => handlePoints(btn.dataset.id, btn.dataset.op, data));
        });
    } catch (err) {
        console.error('Members table error:', err);
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#f87171;padding:16px;">${escHtml(err.message)}</td></tr>`;
    }
}

async function handlePoints(memberId, op, members) {
    const input = document.getElementById(`pts-${memberId}`);
    const delta = parseInt(input?.value) || 10;
    if (delta <= 0) return;

    const member = members.find(m => m.id === memberId);
    if (!member) return;

    const signedDelta = op === 'add' ? delta : -Math.min(delta, member.points || 0);
    if (signedDelta === 0) return;

    try {
        // Goes through the RPC (not a direct .update()) so the change is
        // also written to point_logs — otherwise it wouldn't show up in
        // the yearly leaderboard, only in the lifetime profiles.points total.
        const { error } = await supabase.rpc('admin_adjust_points', {
            p_target: memberId,
            p_delta: signedDelta,
            p_reason: 'admin_adjust',
        });
        if (error) throw error;

        member.points = (member.points || 0) + signedDelta;
        showToast(`${signedDelta > 0 ? '+' : ''}${signedDelta} điểm cho ${member.full_name}`, 'success');
        await loadMembersTable();
        await loadAdminStats();
    } catch (err) {
        showToast(err.message || 'Lỗi khi cập nhật điểm', 'error');
    }
}

document.getElementById('refresh-members-btn')?.addEventListener('click', loadMembersTable);

/* ── Create Member ─────────────────────────────────────────── */
function bindForms() {
    bindCreateMemberForm();
    bindPublishForm();
    bindAnnounceForm();
    bindEventForm();
    document.getElementById('refresh-apps-btn')?.addEventListener('click', loadApplicationsTable);
    document.getElementById('refresh-pub-btn')?.addEventListener('click', loadPublishedTable);
    document.getElementById('refresh-ann-btn')?.addEventListener('click', loadAnnouncementsTable);
    document.getElementById('refresh-ev-btn')?.addEventListener('click', loadEventsTable);
}

function bindCreateMemberForm() {
    const form = document.getElementById('create-member-form');
    const btn = document.getElementById('create-member-btn');
    const msg = document.getElementById('create-member-msg');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fullname = document.getElementById('m-fullname').value.trim();
        const email = document.getElementById('m-email').value.trim();
        const password = document.getElementById('m-password').value;
        const role = document.getElementById('m-role').value;
        const rank = parseInt(document.getElementById('m-rank').value);
        const term = document.getElementById('m-term').value;
        const isAdmin = document.getElementById('m-is-admin').checked;
        const avatarUrl = document.getElementById('m-avatar')?.value.trim() || null;

        if (!fullname || !email || !password) {
            showMsg(msg, 'Vui lòng điền đầy đủ Họ tên, Email và Mật khẩu.', 'error');
            return;
        }
        if (password.length < 6) {
            showMsg(msg, 'Mật khẩu tối thiểu 6 ký tự.', 'error');
            return;
        }

        setLoading(btn, '⏳ Đang tạo...');

        try {
            // 1. Create auth account using an ISOLATED client (does not persist
            // its session). Using the shared `supabase` client here would swap
            // the admin's active session for the new member's session the
            // instant signUp() resolves, silently kicking the admin out.
            const tempClient = createIsolatedClient();
            const { data: authData, error: authErr } = await tempClient.auth.signUp({ email, password });
            if (authErr) throw authErr;

            const uid = authData.user?.id;
            if (!uid) throw new Error('Không lấy được UID từ auth. (Có thể dự án đang yêu cầu xác nhận email — hãy tắt "Confirm email" trong Supabase Auth settings để tạo tài khoản trực tiếp.)');

            // 2. Fill in the profile row. A DB trigger (on_auth_user_created)
            // already auto-inserts a bare-bones profiles row the instant the
            // auth account is created, so we UPDATE it with the real details
            // here rather than INSERT (an INSERT would collide with that row
            // and would also be rejected by RLS, since the admin isn't the
            // owner of the new member's row — only the
            // "profiles_admin_update_any" policy lets an admin write it).
            // A short retry loop guards against the rare case where this
            // runs before the trigger's row has committed.
            let profileErr = null;
            for (let attempt = 0; attempt < 3; attempt++) {
                const { data: updated, error } = await supabase
                    .from('profiles')
                    .update({
                        full_name: fullname,
                        role,
                        role_rank: rank,
                        term,
                        points: 0,
                        avatar_url: avatarUrl,
                        is_admin: isAdmin,
                    })
                    .eq('id', uid)
                    .select('id');
                profileErr = error;
                if (!error && updated && updated.length > 0) { profileErr = null; break; }
                await new Promise(r => setTimeout(r, 400));
            }
            if (profileErr) throw profileErr;

            showMsg(msg, `Tạo thành công tài khoản cho ${fullname}!`, 'success');
            form.reset();
            await loadMembersTable();
            await loadAdminStats();
            showToast(`Đã tạo tài khoản ${fullname}`, 'success');
        } catch (err) {
            const friendly = err.message?.includes('already registered')
                ? 'Email này đã được đăng ký rồi.'
                : err.message || 'Có lỗi xảy ra.';
            showMsg(msg, friendly, 'error');
        } finally {
            setLoading(btn, '✅ Tạo tài khoản');
        }
    });
}

/* ── Publish Form ──────────────────────────────────────────── */
function bindPublishForm() {
    const form = document.getElementById('publish-form');
    const btn = document.getElementById('publish-btn');
    const msg = document.getElementById('publish-msg');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('pub-title').value.trim();
        const issue = parseInt(document.getElementById('pub-issue').value) || 1;
        const desc = document.getElementById('pub-desc').value.trim();
        const file = document.getElementById('pub-file').files[0];
        const cover = document.getElementById('pub-cover').value.trim();

        if (!title) { showMsg(msg, 'Vui lòng nhập tiêu đề.', 'error'); return; }
        if (!file) { showMsg(msg, 'Vui lòng chọn file PDF.', 'error'); return; }
        if (file.type !== 'application/pdf') { showMsg(msg, 'Chỉ chấp nhận file PDF.', 'error'); return; }

        setLoading(btn, '⏳ Đang upload...');
        showUploadProgress(true);
        setProgress(30, 'Đang upload PDF...');

        try {
            // Generate unique filename
            const ext = file.name.split('.').pop();
            const slug = title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 40);
            const filename = `${Date.now()}-${slug}.${ext}`;

            const { data: uploadData, error: uploadErr } = await supabase.storage
                .from('news-pdfs')
                .upload(filename, file, { contentType: 'application/pdf', upsert: false });

            if (uploadErr) throw uploadErr;
            setProgress(70, 'Upload xong, đang lưu vào database...');

            const { data: { publicUrl } } = supabase.storage
                .from('news-pdfs')
                .getPublicUrl(filename);

            const { error: insertErr } = await supabase.from('activities').insert({
                title,
                description: desc,
                pdf_url: publicUrl,
                cover_url: cover || null,
                issue_number: issue,
                published_at: new Date().toISOString(),
                created_by: currentUserId,
            });
            if (insertErr) throw insertErr;

            setProgress(100, 'Hoàn tất!');
            setTimeout(() => showUploadProgress(false), 1000);

            showMsg(msg, `Xuất bản thành công: "${title}"`, 'success');
            form.reset();
            await loadPublishedTable();
            await loadAdminStats();
            showToast(`Đã xuất bản "${title}"`, 'success');
        } catch (err) {
            showUploadProgress(false);
            const friendly = err.message?.includes('The resource already exists')
                ? 'File đã tồn tại. Thử lại (timestamp tự thay đổi).'
                : err.message?.includes('Bucket not found')
                    ? 'Storage bucket "news-pdfs" chưa được tạo. Vui lòng tạo bucket public trong Supabase Dashboard.'
                    : err.message || 'Có lỗi xảy ra khi upload.';
            showMsg(msg, friendly, 'error');
        } finally {
            setLoading(btn, '📤 Xuất bản');
        }
    });
}

/* ── Announcements ─────────────────────────────────────────── */
function bindAnnounceForm() {
    const form = document.getElementById('announce-form');
    const btn = document.getElementById('announce-btn');
    const msg = document.getElementById('announce-msg');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('ann-title').value.trim();
        const content = document.getElementById('ann-content').value.trim();
        const pinned = document.getElementById('ann-pinned').checked;
        if (!title || !content) { showMsg(msg, 'Vui lòng nhập tiêu đề và nội dung.', 'error'); return; }

        setLoading(btn, '⏳ Đang đăng...');
        try {
            const { error } = await supabase.from('announcements').insert({
                title, content, pinned, created_by: currentUserId,
            });
            if (error) throw error;
            showMsg(msg, 'Đăng thông báo thành công!', 'success');
            form.reset();
            await loadAnnouncementsTable();
            showToast('Đã đăng thông báo', 'success');
        } catch (err) {
            showMsg(msg, err.message || 'Có lỗi xảy ra.', 'error');
        } finally {
            setLoading(btn, '📢 Đăng thông báo');
        }
    });
}

async function loadAnnouncementsTable() {
    const tbody = document.getElementById('ann-table-body');
    if (!tbody) return;
    tbody.innerHTML = skeletonRows(4);
    try {
        const { data, error } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:24px;color:var(--text-400);">Chưa có thông báo nào.</td></tr>`;
            return;
        }
        tbody.innerHTML = data.map(a => `
      <tr>
        <td style="font-weight:600;color:var(--text-900);">${escHtml(a.title)}</td>
        <td>${new Date(a.created_at).toLocaleDateString('vi-VN')}</td>
        <td>${a.pinned ? '📌' : '-'}</td>
        <td>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button class="action-btn action-edit" data-id="${a.id}" data-edit="announcements">✏️ Sửa</button>
            <button class="action-btn action-reject" data-id="${a.id}" data-del="announcements">🗑 Xóa</button>
          </div>
        </td>
      </tr>`).join('');
        tbody.querySelectorAll('[data-del="announcements"]').forEach(btn => {
            btn.addEventListener('click', () => deleteRow('announcements', btn.dataset.id, loadAnnouncementsTable));
        });
        tbody.querySelectorAll('[data-edit="announcements"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const item = data.find(a => a.id === btn.dataset.id);
                if (item) openEditModal('announcement', item);
            });
        });
    } catch (err) {
        console.error('Announcements table error:', err);
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#f87171;padding:16px;">${escHtml(err.message)}</td></tr>`;
    }
}

/* ── Events ────────────────────────────────────────────────── */
function bindEventForm() {
    const form = document.getElementById('event-form');
    const btn = document.getElementById('event-btn');
    const msg = document.getElementById('event-msg');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('ev-title').value.trim();
        const capacity = document.getElementById('ev-capacity').value ? parseInt(document.getElementById('ev-capacity').value) : null;
        const startAt = document.getElementById('ev-start').value;
        const endAt = document.getElementById('ev-end').value;
        const location = document.getElementById('ev-location').value.trim();
        const desc = document.getElementById('ev-desc').value.trim();
        const cover = document.getElementById('ev-cover').value.trim();

        if (!title || !startAt) { showMsg(msg, 'Vui lòng nhập tên sự kiện và thời gian bắt đầu.', 'error'); return; }

        setLoading(btn, '⏳ Đang tạo...');
        try {
            const { error } = await supabase.from('events').insert({
                title,
                description: desc,
                location,
                cover_url: cover || null,
                capacity,
                start_at: new Date(startAt).toISOString(),
                end_at: endAt ? new Date(endAt).toISOString() : null,
                created_by: currentUserId,
            });
            if (error) throw error;
            showMsg(msg, 'Tạo sự kiện thành công!', 'success');
            form.reset();
            await loadEventsTable();
            showToast('Đã tạo sự kiện', 'success');
        } catch (err) {
            showMsg(msg, err.message || 'Có lỗi xảy ra.', 'error');
        } finally {
            setLoading(btn, '📅 Tạo sự kiện');
        }
    });
}

async function loadEventsTable() {
    const tbody = document.getElementById('ev-table-body');
    if (!tbody) return;
    tbody.innerHTML = skeletonRows(4);
    try {
        const { data, error } = await supabase
            .from('events')
            .select('*, event_registrations(count)')
            .order('start_at', { ascending: false });
        if (error) throw error;
        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:24px;color:var(--text-400);">Chưa có sự kiện nào.</td></tr>`;
            return;
        }
        tbody.innerHTML = data.map(e => {
            const count = e.event_registrations?.[0]?.count ?? 0;
            const cap = e.capacity ? ` / ${e.capacity}` : '';
            return `
      <tr>
        <td style="font-weight:600;color:var(--text-900);">${escHtml(e.title)}</td>
        <td>${new Date(e.start_at).toLocaleString('vi-VN')}</td>
        <td style="color:var(--cyan);font-weight:700;">${count}${cap}</td>
        <td><button class="action-btn action-reject" data-id="${e.id}" data-del="events">🗑 Xóa</button></td>
      </tr>`;
        }).join('');
        tbody.querySelectorAll('[data-del="events"]').forEach(btn => {
            btn.addEventListener('click', () => deleteRow('events', btn.dataset.id, loadEventsTable));
        });
    } catch (err) {
        console.error('Events table error:', err);
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#f87171;padding:16px;">${escHtml(err.message)}</td></tr>`;
    }
}

/* ── Edit Modal (Sửa báo đã đăng / Sửa thông báo) ─────────────
   Modal dùng chung, nội dung form được render động theo `type`:
   - 'activity'     → sửa số báo đã xuất bản (title, số thứ tự, mô tả,
                       ảnh bìa, và có thể thay file PDF mới nếu cần)
   - 'announcement' → sửa thông báo (title, nội dung, ghim) */
let editState = { type: null, id: null };

function initEditModal() {
    const overlay = document.getElementById('edit-modal-overlay');
    const form = document.getElementById('edit-form');
    if (!overlay || !form) return;

    document.getElementById('edit-modal-close')?.addEventListener('click', closeEditModal);
    document.getElementById('edit-cancel-btn')?.addEventListener('click', closeEditModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeEditModal(); });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay.classList.contains('open')) closeEditModal();
    });

    form.addEventListener('submit', handleEditSubmit);
}

function openEditModal(type, item) {
    editState = { type, id: item.id };
    const overlay = document.getElementById('edit-modal-overlay');
    const title = document.getElementById('edit-modal-title');
    const body = document.getElementById('edit-modal-body');
    if (!overlay || !body) return;

    if (type === 'announcement') {
        title.textContent = '✏️ Sửa thông báo';
        body.innerHTML = `
      <div class="admin-form-group">
        <label class="admin-form-label">Tiêu đề<span class="req">*</span></label>
        <input id="edit-ann-title" class="admin-input" type="text" value="${escHtml(item.title)}" />
      </div>
      <div class="admin-form-group">
        <label class="admin-form-label">Nội dung<span class="req">*</span></label>
        <textarea id="edit-ann-content" class="admin-textarea" rows="5">${escHtml(item.content)}</textarea>
      </div>
      <div class="admin-form-group" style="display:flex;align-items:center;gap:8px;">
        <input id="edit-ann-pinned" type="checkbox" style="width:auto;" ${item.pinned ? 'checked' : ''} />
        <label for="edit-ann-pinned" class="admin-form-label" style="margin:0;">📌 Ghim thông báo lên đầu</label>
      </div>`;
    } else if (type === 'activity') {
        title.textContent = '✏️ Sửa số báo';
        body.innerHTML = `
      <div class="admin-form-grid">
        <div class="admin-form-group">
          <label class="admin-form-label">Tiêu đề số báo<span class="req">*</span></label>
          <input id="edit-pub-title" class="admin-input" type="text" value="${escHtml(item.title)}" />
        </div>
        <div class="admin-form-group">
          <label class="admin-form-label">Số thứ tự</label>
          <input id="edit-pub-issue" class="admin-input" type="number" min="1" value="${item.issue_number || 1}" />
        </div>
      </div>
      <div class="admin-form-group">
        <label class="admin-form-label">Mô tả</label>
        <textarea id="edit-pub-desc" class="admin-textarea" rows="3">${escHtml(item.description || '')}</textarea>
      </div>
      <div class="admin-form-group">
        <label class="admin-form-label">URL ảnh bìa (tuỳ chọn)</label>
        <input id="edit-pub-cover" class="admin-input" type="url" value="${escHtml(item.cover_url || '')}" />
      </div>
      <div class="admin-form-group">
        <label class="admin-form-label">Thay file PDF mới (tuỳ chọn — để trống nếu giữ nguyên)</label>
        <input id="edit-pub-file" class="admin-input admin-file-input" type="file" accept=".pdf" />
        ${item.pdf_url ? `<div style="margin-top:6px;font-size:.78rem;"><a href="${escHtml(item.pdf_url)}" target="_blank" rel="noopener" style="color:var(--cyan-dark);">📄 Xem PDF hiện tại</a></div>` : ''}
      </div>`;
    }

    overlay.classList.add('open');
}

function closeEditModal() {
    document.getElementById('edit-modal-overlay')?.classList.remove('open');
    editState = { type: null, id: null };
}

async function handleEditSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('edit-save-btn');
    const { type, id } = editState;
    if (!type || !id) return;

    setLoading(btn, '⏳ Đang lưu...');
    try {
        if (type === 'announcement') {
            const title = document.getElementById('edit-ann-title').value.trim();
            const content = document.getElementById('edit-ann-content').value.trim();
            const pinned = document.getElementById('edit-ann-pinned').checked;
            if (!title || !content) throw new Error('Vui lòng nhập tiêu đề và nội dung.');

            const { error } = await supabase.from('announcements')
                .update({ title, content, pinned })
                .eq('id', id);
            if (error) throw error;

            closeEditModal();
            await loadAnnouncementsTable();
            showToast('Đã cập nhật thông báo', 'success');
        } else if (type === 'activity') {
            const title = document.getElementById('edit-pub-title').value.trim();
            const issue = parseInt(document.getElementById('edit-pub-issue').value) || 1;
            const desc = document.getElementById('edit-pub-desc').value.trim();
            const cover = document.getElementById('edit-pub-cover').value.trim();
            const file = document.getElementById('edit-pub-file')?.files[0];
            if (!title) throw new Error('Vui lòng nhập tiêu đề.');

            const patch = { title, issue_number: issue, description: desc, cover_url: cover || null };

            // Nếu admin chọn file PDF mới, upload thay thế trước khi update bản ghi
            if (file) {
                if (file.type !== 'application/pdf') throw new Error('Chỉ chấp nhận file PDF.');
                const ext = file.name.split('.').pop();
                const slug = title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 40);
                const filename = `${Date.now()}-${slug}.${ext}`;
                const { error: uploadErr } = await supabase.storage
                    .from('news-pdfs')
                    .upload(filename, file, { contentType: 'application/pdf', upsert: false });
                if (uploadErr) throw uploadErr;
                const { data: { publicUrl } } = supabase.storage.from('news-pdfs').getPublicUrl(filename);
                patch.pdf_url = publicUrl;
            }

            const { error } = await supabase.from('activities').update(patch).eq('id', id);
            if (error) throw error;

            closeEditModal();
            await loadPublishedTable();
            showToast('Đã cập nhật số báo', 'success');
        }
    } catch (err) {
        showToast(err.message || 'Không lưu được thay đổi.', 'error');
    } finally {
        setLoading(btn, '💾 Lưu thay đổi');
    }
}

async function deleteRow(table, id, reload) {
    if (!confirm('Bạn có chắc muốn xóa?')) return;
    try {
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) throw error;
        await reload();
        showToast('Đã xóa', 'success');
    } catch (err) {
        showToast(err.message || 'Không xóa được.', 'error');
    }
}

async function loadPublishedTable() {
    const tbody = document.getElementById('pub-table-body');
    tbody.innerHTML = skeletonRows(5);
    try {
        const { data, error } = await supabase
            .from('activities')
            .select('*')
            .order('published_at', { ascending: false });
        if (error) throw error;

        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--text-400);">Chưa có số báo nào.</td></tr>`;
            return;
        }

        tbody.innerHTML = data.map(a => {
            const date = a.published_at
                ? new Date(a.published_at).toLocaleDateString('vi-VN')
                : '-';
            const pdfLink = a.pdf_url
                ? `<a href="${escHtml(a.pdf_url)}" target="_blank" rel="noopener" class="action-btn action-approve">📄 Xem PDF</a>`
                : '<span style="color:var(--text-400)">Chưa có</span>';
            return `
        <tr>
          <td style="color:var(--cyan-dark);font-weight:700;">Số ${a.issue_number || '?'}</td>
          <td style="font-weight:600;color:var(--text-900);">${escHtml(a.title)}</td>
          <td>${date}</td>
          <td>${pdfLink}</td>
          <td>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
              <button class="action-btn action-edit" data-id="${a.id}" data-edit="activities">✏️ Sửa</button>
              <button class="action-btn action-reject" data-id="${a.id}" data-del="activities">🗑 Xóa</button>
            </div>
          </td>
        </tr>`;
        }).join('');

        tbody.querySelectorAll('[data-del="activities"]').forEach(btn => {
            btn.addEventListener('click', () => deleteRow('activities', btn.dataset.id, loadPublishedTable));
        });
        tbody.querySelectorAll('[data-edit="activities"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const item = data.find(a => a.id === btn.dataset.id);
                if (item) openEditModal('activity', item);
            });
        });
    } catch (err) {
        console.error('Published table error:', err);
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#f87171;padding:16px;">${escHtml(err.message)}</td></tr>`;
    }
}

/* ── Applications Table ────────────────────────────────────── */
async function loadApplicationsTable() {
    const tbody = document.getElementById('apps-table-body');
    tbody.innerHTML = skeletonRows(7);
    try {
        const { data, error } = await supabase
            .from('registrations')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;

        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--text-400);">Chưa có đơn đăng ký nào.</td></tr>`;
            return;
        }

        tbody.innerHTML = data.map(r => {
            const date = r.created_at ? new Date(r.created_at).toLocaleDateString('vi-VN') : '-';
            const status = r.status || 'pending';
            const statusHtml = `<span class="status-badge status-${status}">${status === 'pending' ? 'Chờ duyệt' : status === 'approved' ? 'Đã duyệt' : 'Từ chối'
                }</span>`;
            const actions = status === 'pending'
                ? `<button class="action-btn action-approve" data-id="${r.id}" data-action="approve">✔ Duyệt</button>
           <button class="action-btn action-reject" data-id="${r.id}" data-action="reject">✕ Từ chối</button>`
                : '<span style="color:var(--text-300);font-size:.78rem;">-</span>';
            return `
        <tr>
          <td style="font-weight:600;color:var(--text-900);">${escHtml(r.full_name)}</td>
          <td style="font-size:.82rem;">${escHtml(r.email)}</td>
          <td>${escHtml(r.class_name)}</td>
          <td style="max-width:180px;font-size:.8rem;color:var(--text-500);">${escHtml((r.reason || '').slice(0, 80))}${(r.reason || '').length > 80 ? '...' : ''}</td>
          <td style="font-size:.8rem;">${date}</td>
          <td>${statusHtml}</td>
          <td><div style="display:flex;gap:6px;flex-wrap:wrap;">${actions}</div></td>
        </tr>`;
        }).join('');

        tbody.querySelectorAll('.action-btn[data-action]').forEach(btn => {
            btn.addEventListener('click', () => handleApplication(btn.dataset.id, btn.dataset.action));
        });
    } catch (err) {
        console.error('Applications error:', err);
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#f87171;padding:16px;">${escHtml(err.message)}</td></tr>`;
    }
}

async function handleApplication(id, action) {
    const status = action === 'approve' ? 'approved' : 'rejected';
    try {
        const { error } = await supabase
            .from('registrations')
            .update({ status, reviewed_by: currentUserId, reviewed_at: new Date().toISOString() })
            .eq('id', id);
        if (error) throw error;

        showToast(action === 'approve' ? 'Đã duyệt đơn thành công!' : 'Đã từ chối đơn.', 'success');
        await loadApplicationsTable();
        await loadAdminStats();
    } catch (err) {
        showToast(err.message || 'Lỗi khi cập nhật trạng thái', 'error');
    }
}

/* ── Helpers ───────────────────────────────────────────────── */
function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

function setLoading(btn, label) {
    if (!btn) return;
    btn.disabled = label.startsWith('⏳');
    btn.textContent = label;
}

function showMsg(el, text, type) {
    if (!el) return;
    el.textContent = text;
    el.style.display = 'block';
    el.style.color = type === 'error' ? '#f87171' : '#34d399';
    setTimeout(() => { el.style.display = 'none'; }, 5000);
}

function showUploadProgress(show) {
    const el = document.getElementById('upload-progress');
    if (el) el.classList.toggle('show', show);
}

function setProgress(pct, label) {
    const bar = document.getElementById('progress-bar');
    const lbl = document.getElementById('progress-label');
    if (bar) bar.style.width = pct + '%';
    if (lbl) lbl.textContent = label;
}

function showToast(msg, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const icons = { success: '✅', error: '❌' };
    const toast = document.createElement('div');
    toast.className = `toast ${type !== 'success' ? type : ''}`;
    toast.innerHTML = `<span class="toast-icon">${icons[type] || '💬'}</span><span class="toast-msg">${msg}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4200);
}

function escHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
