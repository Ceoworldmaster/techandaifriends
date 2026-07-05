// admin.js — Full admin panel v2
import { supabase } from './config.js';
import { requireAdmin, getUser, getProfile } from './auth.js';

(async () => {
  await requireAdmin();
  const user    = await getUser();
  const profile = user ? await getProfile(user.id) : null;
  if (profile) {
    setText('admin-avatar-initial', (profile.full_name || 'A')[0].toUpperCase());
    setText('admin-display-name', profile.full_name || 'Admin');
  }
  document.getElementById('admin-logout')?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = 'login.html';
  });
  initTabs();
  initMobileMenu();
  await loadAdminStats();
  await Promise.all([loadMembersTable(), loadPublishedTable(), loadApplicationsTable(), loadEventsTable(), loadAnnouncementsTable()]);
  bindForms();
})();

/* ── Tabs ─────────────────────────────────────────────────── */
const TAB_META = {
  personnel:     { title: 'Nhân sự & Điểm',        sub: 'Quản lý tài khoản và điểm vinh danh' },
  publish:       { title: 'Xuất bản Báo chí',       sub: 'Upload PDF và xuất bản số báo mới' },
  events:        { title: 'Sự kiện',                sub: 'Tạo và quản lý sự kiện CLB' },
  announcements: { title: 'Thông báo',              sub: 'Đăng thông báo hiển thị trên trang chủ' },
  approvals:     { title: 'Phê duyệt Ứng viên',    sub: 'Xem xét và xử lý đơn đăng ký' },
};
function initTabs() {
  document.querySelectorAll('.sidebar-nav-item[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
}
function switchTab(id) {
  document.querySelectorAll('.sidebar-nav-item[data-tab]').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.admin-tab-pane').forEach(p => p.classList.remove('active'));
  document.querySelector(`.sidebar-nav-item[data-tab="${id}"]`)?.classList.add('active');
  document.getElementById(`tab-${id}`)?.classList.add('active');
  const m = TAB_META[id];
  if (m) { setText('topbar-title', m.title); setText('topbar-sub', m.sub); }
  document.getElementById('admin-sidebar')?.classList.remove('open');
  document.getElementById('sidebar-overlay')?.classList.remove('show');
}

/* ── Mobile ───────────────────────────────────────────────── */
function initMobileMenu() {
  const btn = document.getElementById('admin-menu-btn');
  const sb  = document.getElementById('admin-sidebar');
  const ov  = document.getElementById('sidebar-overlay');
  if (!btn) return;
  btn.addEventListener('click', () => { sb.classList.toggle('open'); ov.classList.toggle('show'); });
  ov.addEventListener('click', () => { sb.classList.remove('open'); ov.classList.remove('show'); });
}

/* ── Stats ────────────────────────────────────────────────── */
async function loadAdminStats() {
  try {
    const [mR, iR, pR, ptR, evR] = await Promise.all([
      supabase.from('profiles').select('id', { count:'exact', head:true }),
      supabase.from('activities').select('id', { count:'exact', head:true }),
      supabase.from('registrations').select('id', { count:'exact', head:true }).eq('status','pending'),
      supabase.from('profiles').select('points'),
      supabase.from('events').select('id', { count:'exact', head:true }),
    ]);
    const totalPts = (ptR.data||[]).reduce((s,r) => s+(r.points||0), 0);
    setText('as-members', mR.count ?? 0);
    setText('as-issues',  iR.count ?? 0);
    setText('as-pending', pR.count ?? 0);
    setText('as-points',  totalPts.toLocaleString('vi-VN'));
    setText('as-events',  evR.count ?? 0);
    const badge = document.getElementById('pending-badge');
    if (badge) { badge.textContent = pR.count ?? 0; badge.style.display = (pR.count ?? 0) > 0 ? 'inline-flex' : 'none'; }
  } catch(e) { console.error(e); }
}

/* ── Members ──────────────────────────────────────────────── */
let membersCache = [];
async function loadMembersTable(filter = '') {
  const tbody = document.getElementById('members-table-body');
  tbody.innerHTML = loadingRow(5);
  try {
    const { data, error } = await supabase.from('profiles')
      .select('id, full_name, role, term, points, avatar_url, role_rank')
      .order('role_rank').order('full_name');
    if (error) throw error;
    membersCache = data || [];
    renderMembersTable(filter);
  } catch(e) { tbody.innerHTML = errorRow(5, e.message); }
}
function renderMembersTable(filter = '') {
  const tbody = document.getElementById('members-table-body');
  let data = membersCache;
  if (filter) data = data.filter(m => (m.full_name||'').toLowerCase().includes(filter.toLowerCase()));
  if (!data.length) { tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:24px;color:rgba(255,255,255,.3);">Không tìm thấy</td></tr>`; return; }
  tbody.innerHTML = data.map(m => {
    const initials = getInitials(m.full_name);
    const av = m.avatar_url
      ? `<img src="${escHtml(m.avatar_url)}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;margin-right:8px;vertical-align:middle;" alt="" />`
      : `<span style="display:inline-flex;width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#00D2FF,#7928CA);color:#fff;font-size:.65rem;font-weight:700;align-items:center;justify-content:center;margin-right:8px;">${escHtml(initials)}</span>`;
    return `<tr>
      <td><div style="display:flex;align-items:center;">${av}<span style="font-weight:600;color:#fff;">${escHtml(m.full_name)}</span></div></td>
      <td style="color:rgba(255,255,255,.7);">${escHtml(m.role)}</td>
      <td style="color:rgba(255,255,255,.5);">${escHtml(m.term)}</td>
      <td><span style="font-weight:700;color:var(--cyan);">${m.points||0}</span></td>
      <td>
        <div class="points-row">
          <input class="admin-input points-input" type="number" min="1" max="9999" value="10" id="pts-${m.id}" />
          <button class="action-btn action-add-pts" data-id="${m.id}" data-op="add" title="Cộng điểm">+</button>
          <button class="action-btn action-sub-pts" data-id="${m.id}" data-op="sub" title="Trừ điểm">−</button>
          <button class="action-btn" style="background:rgba(59,130,246,.2);color:#93c5fd;" data-id="${m.id}" data-op="log" title="Xem lịch sử">📋</button>
        </div>
      </td>
    </tr>`;
  }).join('');
  tbody.querySelectorAll('.action-btn[data-op]').forEach(btn => {
    if (btn.dataset.op === 'log') btn.addEventListener('click', () => openPointLog(btn.dataset.id));
    else btn.addEventListener('click', () => handlePoints(btn.dataset.id, btn.dataset.op));
  });
}
document.getElementById('member-search-admin')?.addEventListener('input', e => renderMembersTable(e.target.value));
document.getElementById('refresh-members-btn')?.addEventListener('click', () => loadMembersTable());

async function handlePoints(memberId, op) {
  const input = document.getElementById(`pts-${memberId}`);
  const delta = parseInt(input?.value) || 10;
  if (delta <= 0) return;
  const m = membersCache.find(x => x.id === memberId);
  if (!m) return;
  const newPts = op === 'add' ? (m.points||0) + delta : Math.max(0, (m.points||0) - delta);
  try {
    const { error } = await supabase.from('profiles').update({ points: newPts }).eq('id', memberId);
    if (error) throw error;
    // log it
    await supabase.from('point_logs').insert({ user_id: memberId, action: op === 'add' ? 'Admin cộng điểm' : 'Admin trừ điểm', amount: op === 'add' ? delta : -delta });
    m.points = newPts;
    renderMembersTable(document.getElementById('member-search-admin')?.value || '');
    await loadAdminStats();
    showToast(`${op === 'add' ? '+' : '-'}${delta} điểm cho ${m.full_name}`, 'success');
  } catch(e) { showToast(e.message || 'Lỗi cập nhật điểm', 'error'); }
}

async function openPointLog(userId) {
  const m = membersCache.find(x => x.id === userId);
  try {
    const { data } = await supabase.from('point_logs').select('*').eq('user_id', userId).order('created_at', { ascending:false }).limit(20);
    const logs = data || [];
    const html = logs.length
      ? logs.map(l => `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.07);font-size:.82rem;">
          <span style="color:rgba(255,255,255,.7);">${escHtml(l.action)}</span>
          <span style="font-weight:700;color:${l.amount>=0?'#34d399':'#f87171'}">${l.amount>=0?'+':''}${l.amount}</span>
        </div>`).join('')
      : '<p style="color:rgba(255,255,255,.4);font-size:.82rem;">Chưa có lịch sử</p>';
    showModal(`Lịch sử điểm: ${m?.full_name || ''}`, html);
  } catch(e) { showToast(e.message, 'error'); }
}

/* ── Publish ──────────────────────────────────────────────── */
async function loadPublishedTable() {
  const tbody = document.getElementById('pub-table-body');
  tbody.innerHTML = loadingRow(4);
  try {
    const { data, error } = await supabase.from('activities').select('*').order('published_at', { ascending:false });
    if (error) throw error;
    if (!data?.length) { tbody.innerHTML = emptyRow(4, 'Chưa có số báo nào'); return; }
    tbody.innerHTML = data.map(a => `<tr>
      <td style="color:var(--cyan);font-weight:700;">Số ${a.issue_number||'?'}</td>
      <td style="color:#fff;font-weight:600;">${escHtml(a.title)}</td>
      <td style="color:rgba(255,255,255,.5);">${a.published_at ? new Date(a.published_at).toLocaleDateString('vi-VN') : '-'}</td>
      <td>
        ${a.pdf_url ? `<a href="${escHtml(a.pdf_url)}" target="_blank" rel="noopener" class="action-btn action-approve">📄 Xem</a>` : '<span style="color:rgba(255,255,255,.3)">Chưa có</span>'}
        <button class="action-btn action-reject" data-id="${a.id}" data-act="del-pub" style="margin-left:4px;">🗑</button>
      </td>
    </tr>`).join('');
    tbody.querySelectorAll('[data-act="del-pub"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Xoá số báo này?')) return;
        await supabase.from('activities').delete().eq('id', btn.dataset.id);
        await loadPublishedTable(); await loadAdminStats();
      });
    });
  } catch(e) { tbody.innerHTML = errorRow(4, e.message); }
}
document.getElementById('refresh-pub-btn')?.addEventListener('click', loadPublishedTable);

/* ── Events ───────────────────────────────────────────────── */
async function loadEventsTable() {
  const tbody = document.getElementById('events-table-body');
  tbody.innerHTML = loadingRow(5);
  try {
    const { data, error } = await supabase.from('events').select('*').order('start_at', { ascending:false });
    if (error) throw error;
    if (!data?.length) { tbody.innerHTML = emptyRow(5, 'Chưa có sự kiện nào'); return; }
    tbody.innerHTML = data.map(ev => {
      const start = ev.start_at ? new Date(ev.start_at).toLocaleString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '-';
      const isPast = ev.start_at && new Date(ev.start_at) < new Date();
      return `<tr>
        <td style="font-weight:600;color:#fff;">${escHtml(ev.title)}${isPast?'<span style="font-size:.68rem;background:rgba(255,255,255,.1);color:rgba(255,255,255,.4);padding:2px 7px;border-radius:99px;margin-left:6px;">Đã qua</span>':''}</td>
        <td style="color:rgba(255,255,255,.6);font-size:.82rem;">${start}</td>
        <td style="color:rgba(255,255,255,.5);font-size:.82rem;">${escHtml(ev.location||'-')}</td>
        <td style="color:var(--cyan);">${ev.capacity||'-'}</td>
        <td><button class="action-btn action-reject" data-id="${ev.id}" data-act="del-ev">🗑 Xoá</button></td>
      </tr>`;
    }).join('');
    tbody.querySelectorAll('[data-act="del-ev"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Xoá sự kiện này?')) return;
        await supabase.from('events').delete().eq('id', btn.dataset.id);
        await loadEventsTable(); await loadAdminStats();
      });
    });
  } catch(e) { tbody.innerHTML = errorRow(5, e.message); }
}
document.getElementById('refresh-events-btn')?.addEventListener('click', loadEventsTable);

/* ── Announcements ────────────────────────────────────────── */
async function loadAnnouncementsTable() {
  const tbody = document.getElementById('ann-table-body');
  tbody.innerHTML = loadingRow(4);
  try {
    const { data, error } = await supabase.from('announcements').select('*').order('created_at', { ascending:false });
    if (error) throw error;
    if (!data?.length) { tbody.innerHTML = emptyRow(4, 'Chưa có thông báo nào'); return; }
    tbody.innerHTML = data.map(a => `<tr>
      <td style="font-weight:600;color:#fff;">${escHtml(a.title)}</td>
      <td>${a.pinned ? '<span style="color:var(--cyan);font-size:.8rem;">📌 Ghim</span>' : '<span style="color:rgba(255,255,255,.3);font-size:.8rem;">-</span>'}</td>
      <td style="color:rgba(255,255,255,.5);font-size:.82rem;">${a.created_at ? new Date(a.created_at).toLocaleDateString('vi-VN') : '-'}</td>
      <td>
        <button class="action-btn" style="background:rgba(251,191,36,.15);color:#fbbf24;" data-id="${a.id}" data-act="pin-ann">${a.pinned ? '📌 Bỏ ghim' : '📌 Ghim'}</button>
        <button class="action-btn action-reject" data-id="${a.id}" data-act="del-ann" style="margin-left:4px;">🗑</button>
      </td>
    </tr>`).join('');
    tbody.querySelectorAll('[data-act]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const ann = data.find(x => x.id === btn.dataset.id);
        if (btn.dataset.act === 'del-ann') {
          if (!confirm('Xoá thông báo này?')) return;
          await supabase.from('announcements').delete().eq('id', btn.dataset.id);
        } else {
          await supabase.from('announcements').update({ pinned: !ann.pinned }).eq('id', btn.dataset.id);
        }
        await loadAnnouncementsTable();
      });
    });
  } catch(e) { tbody.innerHTML = errorRow(4, e.message); }
}
document.getElementById('refresh-ann-btn')?.addEventListener('click', loadAnnouncementsTable);

/* ── Applications ─────────────────────────────────────────── */
async function loadApplicationsTable() {
  const tbody = document.getElementById('apps-table-body');
  tbody.innerHTML = loadingRow(7);
  try {
    const { data, error } = await supabase.from('registrations').select('*').order('created_at', { ascending:false });
    if (error) throw error;
    if (!data?.length) { tbody.innerHTML = emptyRow(7, 'Chưa có đơn đăng ký nào'); return; }
    tbody.innerHTML = data.map(r => {
      const s = r.status || 'pending';
      const statusHtml = `<span class="status-badge status-${s}">${s==='pending'?'Chờ duyệt':s==='approved'?'Đã duyệt':'Từ chối'}</span>`;
      const acts = s === 'pending'
        ? `<button class="action-btn action-approve" data-id="${r.id}" data-a="approve">✔ Duyệt</button>
           <button class="action-btn action-reject" data-id="${r.id}" data-a="reject">✕ Từ chối</button>`
        : `<button class="action-btn action-reject" data-id="${r.id}" data-a="delete" style="opacity:.5;">🗑</button>`;
      return `<tr>
        <td style="font-weight:600;color:#fff;">${escHtml(r.full_name)}</td>
        <td style="font-size:.82rem;">${escHtml(r.email)}</td>
        <td>${escHtml(r.class_name)}</td>
        <td style="max-width:160px;font-size:.8rem;color:rgba(255,255,255,.5);">${escHtml((r.reason||'').slice(0,80))}${(r.reason||'').length>80?'...':''}</td>
        <td style="font-size:.8rem;color:rgba(255,255,255,.4);">${r.created_at?new Date(r.created_at).toLocaleDateString('vi-VN'):'-'}</td>
        <td>${statusHtml}</td>
        <td><div style="display:flex;gap:6px;flex-wrap:wrap;">${acts}</div></td>
      </tr>`;
    }).join('');
    tbody.querySelectorAll('[data-a]').forEach(btn => {
      btn.addEventListener('click', () => handleApplication(btn.dataset.id, btn.dataset.a));
    });
  } catch(e) { tbody.innerHTML = errorRow(7, e.message); }
}
document.getElementById('refresh-apps-btn')?.addEventListener('click', loadApplicationsTable);

async function handleApplication(id, action) {
  try {
    if (action === 'delete') {
      if (!confirm('Xoá đơn này?')) return;
      await supabase.from('registrations').delete().eq('id', id);
    } else {
      const { error } = await supabase.from('registrations').update({ status: action === 'approve' ? 'approved' : 'rejected' }).eq('id', id);
      if (error) throw error;
    }
    showToast(action === 'approve' ? 'Đã duyệt đơn!' : action === 'reject' ? 'Đã từ chối đơn.' : 'Đã xoá đơn.', 'success');
    await loadApplicationsTable(); await loadAdminStats();
  } catch(e) { showToast(e.message, 'error'); }
}

/* ── Forms ────────────────────────────────────────────────── */
function bindForms() {
  bindCreateMemberForm();
  bindPublishForm();
  bindEventForm();
  bindAnnounceForm();
}

function bindCreateMemberForm() {
  document.getElementById('create-member-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('create-member-btn');
    const msg = document.getElementById('create-member-msg');
    const fullname  = v('m-fullname'); const email = v('m-email'); const password = v('m-password');
    const role = v('m-role'); const rank = parseInt(v('m-rank')); const term = v('m-term');
    const isAdmin = document.getElementById('m-is-admin').checked;
    const avatarUrl = v('m-avatar') || null;
    if (!fullname||!email||!password) { showMsg(msg,'Điền đủ Họ tên, Email, Mật khẩu.','error'); return; }
    if (password.length < 6) { showMsg(msg,'Mật khẩu tối thiểu 6 ký tự.','error'); return; }
    setLoading(btn, true);
    try {
      const { data: au, error: ae } = await supabase.auth.signUp({ email, password });
      if (ae) throw ae;
      const uid = au.user?.id; if (!uid) throw new Error('Không lấy được UID');
      const { error: pe } = await supabase.from('profiles').insert({ id:uid, full_name:fullname, role, role_rank:rank, term, points:0, avatar_url:avatarUrl, is_admin:isAdmin });
      if (pe) throw pe;
      showMsg(msg, `Tạo thành công: ${fullname}!`, 'success');
      e.target.reset(); await loadMembersTable(); await loadAdminStats();
      showToast(`Đã tạo tài khoản ${fullname}`, 'success');
    } catch(err) {
      showMsg(msg, err.message?.includes('already registered') ? 'Email đã được đăng ký.' : err.message || 'Lỗi xảy ra.', 'error');
    } finally { setLoading(btn, false); }
  });
}

function bindPublishForm() {
  document.getElementById('publish-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('publish-btn');
    const msg = document.getElementById('publish-msg');
    const title = v('pub-title'); const issue = parseInt(v('pub-issue'))||1;
    const desc = v('pub-desc'); const file = document.getElementById('pub-file').files[0];
    const cover = v('pub-cover') || null;
    if (!title) { showMsg(msg,'Nhập tiêu đề.','error'); return; }
    if (!file)  { showMsg(msg,'Chọn file PDF.','error'); return; }
    if (file.type !== 'application/pdf') { showMsg(msg,'Chỉ nhận file PDF.','error'); return; }
    setLoading(btn, true); showUploadProgress(true); setProgress(30,'Đang upload PDF...');
    try {
      const slug = title.toLowerCase().replace(/[^a-z0-9]/g,'-').replace(/-+/g,'-').slice(0,40);
      const filename = `${Date.now()}-${slug}.pdf`;
      const { error: ue } = await supabase.storage.from('news-pdfs').upload(filename, file, { contentType:'application/pdf' });
      if (ue) throw ue;
      setProgress(70,'Lưu vào database...');
      const { data: { publicUrl } } = supabase.storage.from('news-pdfs').getPublicUrl(filename);
      const { error: ie } = await supabase.from('activities').insert({ title, description:desc, pdf_url:publicUrl, cover_url:cover, issue_number:issue, published_at:new Date().toISOString() });
      if (ie) throw ie;
      setProgress(100,'Hoàn tất!'); setTimeout(() => showUploadProgress(false), 1000);
      showMsg(msg, `Xuất bản thành công: "${title}"`, 'success');
      e.target.reset(); await loadPublishedTable(); await loadAdminStats();
      showToast(`Đã xuất bản "${title}"`, 'success');
    } catch(err) {
      showUploadProgress(false);
      showMsg(msg, err.message?.includes('Bucket not found') ? 'Bucket "news-pdfs" chưa tạo. Vào Supabase Dashboard > Storage để tạo.' : err.message || 'Lỗi upload.', 'error');
    } finally { setLoading(btn, false); }
  });
}

function bindEventForm() {
  document.getElementById('event-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('event-btn');
    const msg = document.getElementById('event-msg');
    const title = v('ev-title'); const desc = v('ev-desc');
    const start = v('ev-start'); const end = v('ev-end');
    const location = v('ev-location'); const capacity = parseInt(v('ev-capacity'))||null;
    if (!title||!start) { showMsg(msg,'Nhập tên sự kiện và thời gian bắt đầu.','error'); return; }
    setLoading(btn, true);
    try {
      const { error } = await supabase.from('events').insert({
        title, description:desc||'', location:location||'', start_at:new Date(start).toISOString(),
        end_at: end ? new Date(end).toISOString() : null, capacity
      });
      if (error) throw error;
      showMsg(msg,'Tạo sự kiện thành công!','success');
      e.target.reset(); await loadEventsTable(); await loadAdminStats();
      showToast(`Đã tạo sự kiện: ${title}`, 'success');
    } catch(err) { showMsg(msg, err.message||'Lỗi.', 'error'); }
    finally { setLoading(btn, false); }
  });
}

function bindAnnounceForm() {
  document.getElementById('announce-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('announce-btn');
    const msg = document.getElementById('announce-msg');
    const title = v('ann-title'); const content = v('ann-content');
    const pinned = document.getElementById('ann-pinned').checked;
    if (!title||!content) { showMsg(msg,'Nhập tiêu đề và nội dung.','error'); return; }
    setLoading(btn, true);
    try {
      const { error } = await supabase.from('announcements').insert({ title, content, pinned });
      if (error) throw error;
      showMsg(msg,'Đăng thông báo thành công!','success');
      e.target.reset(); await loadAnnouncementsTable();
      showToast(`Đã đăng thông báo: ${title}`, 'success');
    } catch(err) { showMsg(msg, err.message||'Lỗi.', 'error'); }
    finally { setLoading(btn, false); }
  });
}

/* ── Modal for logs ───────────────────────────────────────── */
function showModal(title, bodyHtml) {
  const existing = document.getElementById('admin-modal');
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.id = 'admin-modal';
  el.style.cssText = 'position:fixed;inset:0;z-index:5000;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;padding:16px;';
  el.innerHTML = `
    <div style="background:#1a2030;border:1px solid rgba(255,255,255,.1);border-radius:16px;width:100%;max-width:500px;max-height:80vh;display:flex;flex-direction:column;overflow:hidden;">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid rgba(255,255,255,.08);">
        <h3 style="color:#fff;font-size:.95rem;">${escHtml(title)}</h3>
        <button onclick="document.getElementById('admin-modal').remove()" style="color:rgba(255,255,255,.4);background:none;border:none;font-size:1.1rem;cursor:pointer;">✕</button>
      </div>
      <div style="padding:16px 20px;overflow-y:auto;">${bodyHtml}</div>
    </div>`;
  el.addEventListener('click', e => { if (e.target === el) el.remove(); });
  document.body.appendChild(el);
}

/* ── Helpers ──────────────────────────────────────────────── */
function v(id) { return (document.getElementById(id)?.value||'').trim(); }
function setText(id, val) { const el = document.getElementById(id); if(el) el.textContent = val; }
function setLoading(btn, on) { if(!btn) return; btn.disabled = on; if (!on) btn.textContent = btn.textContent.replace('⏳ ',''); }
function showMsg(el, text, type) {
  if (!el) return; el.textContent = text; el.style.display = 'block';
  el.style.color = type==='error' ? '#f87171' : '#34d399';
  setTimeout(() => el.style.display = 'none', 5000);
}
function showUploadProgress(show) { document.getElementById('upload-progress')?.classList.toggle('show', show); }
function setProgress(pct, label) {
  const bar = document.getElementById('progress-bar'); if (bar) bar.style.width = pct + '%';
  const lbl = document.getElementById('progress-label'); if (lbl) lbl.textContent = label;
}
function loadingRow(cols) { return `<tr><td colspan="${cols}" style="text-align:center;padding:24px;color:rgba(255,255,255,.3);"><div style="display:inline-block;width:20px;height:20px;border:2px solid rgba(255,255,255,.1);border-top-color:var(--cyan);border-radius:50%;animation:spin .65s linear infinite;"></div></td></tr>`; }
function emptyRow(cols, msg) { return `<tr><td colspan="${cols}" style="text-align:center;padding:24px;color:rgba(255,255,255,.3);">${msg}</td></tr>`; }
function errorRow(cols, msg) { return `<tr><td colspan="${cols}" style="text-align:center;padding:16px;color:#f87171;">${escHtml(msg)}</td></tr>`; }
function getInitials(name) { if (!name) return '?'; const p = name.trim().split(' '); return (p.length>1?p[0][0]+p[p.length-1][0]:p[0][0]).toUpperCase(); }
function showToast(msg, type='success') {
  const c = document.getElementById('toast-container'); if (!c) return;
  const t = document.createElement('div');
  t.className = `toast ${type!=='success'?type:''}`;
  t.innerHTML = `<span class="toast-icon">${type==='success'?'✅':'❌'}</span><span class="toast-msg">${escHtml(msg)}</span>`;
  c.appendChild(t); setTimeout(() => t.remove(), 4200);
}
function escHtml(s) { if(!s) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
