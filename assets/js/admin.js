// admin.js — Full admin panel logic
import { supabase } from './config.js';
import { requireAdmin, getUser, getProfile } from './auth.js';

/* ── Guard & Init ──────────────────────────────────────────── */
(async () => {
  await requireAdmin();

  const user    = await getUser();
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
  await loadAdminStats();
  await loadMembersTable();
  await loadPublishedTable();
  await loadApplicationsTable();
  bindForms();
})();

/* ── Tabs ──────────────────────────────────────────────────── */
const TAB_META = {
  personnel: { title: 'Quản lý Nhân sự', sub: 'Tạo tài khoản và quản lý điểm thành viên' },
  publish:   { title: 'Xuất bản Báo chí', sub: 'Upload PDF và xuất bản số báo mới' },
  approvals: { title: 'Phê duyệt Ứng viên', sub: 'Xem xét và xử lý đơn đăng ký' },
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
    document.getElementById('topbar-sub').textContent   = meta.sub;
  }

  document.getElementById('admin-sidebar')?.classList.remove('open');
  document.getElementById('sidebar-overlay')?.classList.remove('show');
}

/* ── Mobile Menu ───────────────────────────────────────────── */
function initMobileMenu() {
  const btn     = document.getElementById('admin-menu-btn');
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
    setText('as-issues',  iRes.count ?? 0);
    setText('as-pending', pRes.count ?? 0);
    setText('as-points',  totalPts.toLocaleString('vi-VN'));

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
  tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:24px;color:rgba(255,255,255,.3);">Đang tải...</td></tr>`;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, role, term, points, avatar_url, role_rank')
      .order('role_rank')
      .order('full_name');
    if (error) throw error;

    if (!data || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:24px;color:rgba(255,255,255,.3);">Chưa có thành viên nào.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.map(m => {
      const initials = (m.full_name || '?').trim().split(' ').map(p => p[0]).filter(Boolean).slice(-2).join('').toUpperCase();
      const avatarHtml = m.avatar_url
        ? `<img src="${escHtml(m.avatar_url)}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;vertical-align:middle;margin-right:8px;" alt="" onerror="this.style.display='none'" />`
        : `<span style="display:inline-flex;width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#00D2FF,#7928CA);color:#fff;font-size:.65rem;font-weight:700;align-items:center;justify-content:center;vertical-align:middle;margin-right:8px;">${escHtml(initials)}</span>`;
      return `
      <tr>
        <td><div style="display:flex;align-items:center;">${avatarHtml}<span style="font-weight:600;color:#fff;">${escHtml(m.full_name)}</span></div></td>
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
      </tr>`;}).join('');

    tbody.querySelectorAll('.action-btn[data-op]').forEach(btn => {
      btn.addEventListener('click', () => handlePoints(btn.dataset.id, btn.dataset.op, data));
    });
  } catch (err) {
    console.error('Members table error:', err);
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#f87171;padding:16px;">${escHtml(err.message)}</td></tr>`;
  }
}

async function handlePoints(memberId, op, members) {
  const input = document.getElementById(`pts-${memberId}`);
  const delta = parseInt(input?.value) || 10;
  if (delta <= 0) return;

  const member = members.find(m => m.id === memberId);
  if (!member) return;

  const newPoints = op === 'add'
    ? (member.points || 0) + delta
    : Math.max(0, (member.points || 0) - delta);

  try {
    const { error } = await supabase
      .from('profiles')
      .update({ points: newPoints })
      .eq('id', memberId);
    if (error) throw error;

    member.points = newPoints;
    showToast(`${op === 'add' ? '+' : '-'}${delta} điểm cho ${member.full_name}`, 'success');
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
  document.getElementById('refresh-apps-btn')?.addEventListener('click', loadApplicationsTable);
  document.getElementById('refresh-pub-btn')?.addEventListener('click', loadPublishedTable);
}

function bindCreateMemberForm() {
  const form = document.getElementById('create-member-form');
  const btn  = document.getElementById('create-member-btn');
  const msg  = document.getElementById('create-member-msg');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullname  = document.getElementById('m-fullname').value.trim();
    const email     = document.getElementById('m-email').value.trim();
    const password  = document.getElementById('m-password').value;
    const role      = document.getElementById('m-role').value;
    const rank      = parseInt(document.getElementById('m-rank').value);
    const term      = document.getElementById('m-term').value;
    const isAdmin   = document.getElementById('m-is-admin').checked;
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
      // 1. Create auth account
      const { data: authData, error: authErr } = await supabase.auth.signUp({ email, password });
      if (authErr) throw authErr;

      const uid = authData.user?.id;
      if (!uid) throw new Error('Không lấy được UID từ auth.');

      // 2. Insert profile row
      const { error: profileErr } = await supabase.from('profiles').insert({
        id: uid,
        full_name: fullname,
        role,
        role_rank: rank,
        term,
        points: 0,
        avatar_url: avatarUrl,
        is_admin: isAdmin,
      });
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
  const btn  = document.getElementById('publish-btn');
  const msg  = document.getElementById('publish-msg');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title  = document.getElementById('pub-title').value.trim();
    const issue  = parseInt(document.getElementById('pub-issue').value) || 1;
    const desc   = document.getElementById('pub-desc').value.trim();
    const file   = document.getElementById('pub-file').files[0];
    const cover  = document.getElementById('pub-cover').value.trim();

    if (!title) { showMsg(msg, 'Vui lòng nhập tiêu đề.', 'error'); return; }
    if (!file)  { showMsg(msg, 'Vui lòng chọn file PDF.', 'error'); return; }
    if (file.type !== 'application/pdf') { showMsg(msg, 'Chỉ chấp nhận file PDF.', 'error'); return; }

    setLoading(btn, '⏳ Đang upload...');
    showUploadProgress(true);
    setProgress(30, 'Đang upload PDF...');

    try {
      // Generate unique filename
      const ext  = file.name.split('.').pop();
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

async function loadPublishedTable() {
  const tbody = document.getElementById('pub-table-body');
  tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:24px;color:rgba(255,255,255,.3);">Đang tải...</td></tr>`;
  try {
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .order('published_at', { ascending: false });
    if (error) throw error;

    if (!data || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:24px;color:rgba(255,255,255,.3);">Chưa có số báo nào.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.map(a => {
      const date = a.published_at
        ? new Date(a.published_at).toLocaleDateString('vi-VN')
        : '-';
      const pdfLink = a.pdf_url
        ? `<a href="${escHtml(a.pdf_url)}" target="_blank" rel="noopener" class="action-btn action-approve">📄 Xem PDF</a>`
        : '<span style="color:rgba(255,255,255,.3)">Chưa có</span>';
      return `
        <tr>
          <td style="color:var(--cyan);font-weight:700;">Số ${a.issue_number || '?'}</td>
          <td style="font-weight:600;color:#fff;">${escHtml(a.title)}</td>
          <td>${date}</td>
          <td>${pdfLink}</td>
        </tr>`;
    }).join('');
  } catch (err) {
    console.error('Published table error:', err);
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#f87171;padding:16px;">${escHtml(err.message)}</td></tr>`;
  }
}

/* ── Applications Table ────────────────────────────────────── */
async function loadApplicationsTable() {
  const tbody = document.getElementById('apps-table-body');
  tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:24px;color:rgba(255,255,255,.3);">Đang tải...</td></tr>`;
  try {
    const { data, error } = await supabase
      .from('registrations')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;

    if (!data || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:24px;color:rgba(255,255,255,.3);">Chưa có đơn đăng ký nào.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.map(r => {
      const date   = r.created_at ? new Date(r.created_at).toLocaleDateString('vi-VN') : '-';
      const status = r.status || 'pending';
      const statusHtml = `<span class="status-badge status-${status}">${
        status === 'pending' ? 'Chờ duyệt' : status === 'approved' ? 'Đã duyệt' : 'Từ chối'
      }</span>`;
      const actions = status === 'pending'
        ? `<button class="action-btn action-approve" data-id="${r.id}" data-action="approve">✔ Duyệt</button>
           <button class="action-btn action-reject" data-id="${r.id}" data-action="reject">✕ Từ chối</button>`
        : '<span style="color:rgba(255,255,255,.2);font-size:.78rem;">-</span>';
      return `
        <tr>
          <td style="font-weight:600;color:#fff;">${escHtml(r.full_name)}</td>
          <td style="font-size:.82rem;">${escHtml(r.email)}</td>
          <td>${escHtml(r.class_name)}</td>
          <td style="max-width:180px;font-size:.8rem;color:rgba(255,255,255,.6);">${escHtml((r.reason || '').slice(0, 80))}${(r.reason || '').length > 80 ? '...' : ''}</td>
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
      .update({ status })
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
  const bar   = document.getElementById('progress-bar');
  const lbl   = document.getElementById('progress-label');
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
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
