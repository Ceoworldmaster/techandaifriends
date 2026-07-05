// leaderboard.js
import { initNavbar, bindLogout, initHamburger, getUser, getProfile } from './auth.js';
import { supabase } from './config.js';

let allMembers = [];
let activeTerm = '';
let currentUser = null;
let currentProfile = null;

(async () => {
  await initNavbar();
  bindLogout();
  initHamburger();
  currentUser    = await getUser();
  currentProfile = currentUser ? await getProfile(currentUser.id) : null;
  await loadLeaderboard();
  bindControls();
})();

async function loadLeaderboard() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, role, role_rank, term, points, avatar_url')
      .order('points', { ascending: false });
    if (error) throw error;
    allMembers = data || [];
    buildTermTabs();
    renderAll();
    showMyRank();
  } catch (err) {
    document.getElementById('lb-tbody').innerHTML =
      `<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--error);">${escHtml(err.message)}</td></tr>`;
  }
}

function buildTermTabs() {
  const terms = [...new Set(allMembers.map(m => m.term).filter(Boolean))].sort((a,b) => b.localeCompare(a));
  const container = document.getElementById('lb-tabs');
  terms.forEach(t => {
    const btn = document.createElement('button');
    btn.className = 'lb-tab';
    btn.dataset.term = t;
    btn.textContent = t;
    container.appendChild(btn);
  });
  container.querySelectorAll('.lb-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.lb-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeTerm = btn.dataset.term;
      renderAll();
      showMyRank();
    });
  });
}

function bindControls() {
  let debounce;
  document.getElementById('lb-search')?.addEventListener('input', e => {
    clearTimeout(debounce);
    debounce = setTimeout(() => renderAll(e.target.value.trim().toLowerCase()), 200);
  });
}

function getFiltered(search = '') {
  return allMembers.filter(m => {
    const matchTerm = !activeTerm || m.term === activeTerm;
    const matchSearch = !search || (m.full_name||'').toLowerCase().includes(search) || (m.role||'').toLowerCase().includes(search);
    return matchTerm && matchSearch;
  });
}

function renderAll(search = '') {
  const list = getFiltered(search);
  renderPodium(list.slice(0, 3));
  renderTable(list);
}

/* ── Podium ────────────────────────────────────────────── */
function renderPodium(top) {
  const el = document.getElementById('lb-podium');
  if (!top.length) { el.innerHTML = '<p style="color:var(--text-500);font-size:.9rem;">Chưa có dữ liệu</p>'; return; }

  // Reorder: 2nd, 1st, 3rd
  const order = [top[1], top[0], top[2]].filter(Boolean);
  const posClass = ['pos-2', 'pos-1', 'pos-3'];
  const posLabel = top[1] ? ['2', '1', '3'] : ['1'];

  el.innerHTML = order.map((m, i) => {
    const realRank = order[i] === top[0] ? 1 : order[i] === top[1] ? 2 : 3;
    const initials = getInitials(m.full_name);
    const avatarHtml = m.avatar_url
      ? `<img src="${escHtml(m.avatar_url)}" alt="${escHtml(m.full_name)}" />`
      : `<span>${escHtml(initials)}</span>`;
    const crown = realRank === 1 ? '<div class="podium-crown">👑</div>' : '';
    return `
      <div class="podium-slot ${posClass[i]}" data-id="${m.id}">
        ${crown}
        <div class="podium-avatar">${avatarHtml}</div>
        <div class="podium-name">${escHtml(m.full_name)}</div>
        <div class="podium-pts">${(m.points||0).toLocaleString('vi-VN')} điểm</div>
        <div class="podium-stand pos-${realRank}-stand">
          <span class="podium-rank-num">${realRank}</span>
        </div>
      </div>`;
  }).join('');

  el.querySelectorAll('.podium-slot[data-id]').forEach(slot => {
    slot.addEventListener('click', () => openProfile(slot.dataset.id));
  });
}

/* ── Table ────────────────────────────────────────────── */
function renderTable(list) {
  const tbody = document.getElementById('lb-tbody');
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-500);">Không có dữ liệu</td></tr>`;
    return;
  }
  const maxPts = list[0]?.points || 1;
  tbody.innerHTML = list.map((m, i) => {
    const rank = i + 1;
    const badge = getBadge(m.points || 0);
    const pct   = Math.max(4, Math.round(((m.points||0) / maxPts) * 100));
    const initials = getInitials(m.full_name);
    const isMe = currentProfile?.id === m.id;
    const avatarHtml = m.avatar_url
      ? `<img src="${escHtml(m.avatar_url)}" class="lbt-avatar" alt="" />`
      : `<div class="lbt-avatar lbt-avatar-init">${escHtml(initials)}</div>`;
    const rankHtml = rank <= 3
      ? `<span class="rank-medal rank-${rank}">${['🥇','🥈','🥉'][rank-1]}</span>`
      : `<span class="rank-num">${rank}</span>`;
    return `
      <tr class="${isMe ? 'lb-row-me' : ''}" data-id="${m.id}" style="cursor:pointer;">
        <td class="td-rank">${rankHtml}</td>
        <td class="td-member">
          <div class="lbt-member-cell">
            ${avatarHtml}
            <div class="lbt-info">
              <span class="lbt-name">${escHtml(m.full_name)}${isMe ? ' <span class="you-tag">Bạn</span>' : ''}</span>
            </div>
          </div>
        </td>
        <td class="td-term">${escHtml(m.term||'-')}</td>
        <td class="td-role">${escHtml(m.role||'-')}</td>
        <td class="td-badge"><span class="mc-badge ${badge.cls}">${badge.icon} ${badge.label}</span></td>
        <td class="td-pts"><strong>${(m.points||0).toLocaleString('vi-VN')}</strong></td>
        <td class="td-bar">
          <div class="pts-bar-wrap"><div class="pts-bar" style="width:${pct}%"></div></div>
        </td>
      </tr>`;
  }).join('');

  tbody.querySelectorAll('tr[data-id]').forEach(row => {
    row.addEventListener('click', () => openProfile(row.dataset.id));
  });
}

/* ── My Rank Banner ───────────────────────────────────── */
function showMyRank() {
  if (!currentProfile) return;
  const list = getFiltered();
  const idx  = list.findIndex(m => m.id === currentProfile.id);
  if (idx < 0) return;
  const m = list[idx];
  const banner = document.getElementById('my-rank-banner');
  if (!banner) return;
  banner.style.display = 'flex';
  const initials = getInitials(m.full_name);
  const avatarEl = document.getElementById('mrb-avatar');
  if (avatarEl) {
    if (m.avatar_url) avatarEl.innerHTML = `<img src="${escHtml(m.avatar_url)}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" />`;
    else avatarEl.textContent = initials;
  }
  setText('mrb-name', m.full_name);
  setText('mrb-rank', `#${idx + 1}`);
  setText('mrb-pts',  `${(m.points||0).toLocaleString('vi-VN')} điểm`);
}

/* ── Profile Drawer ───────────────────────────────────── */
async function openProfile(id) {
  const overlay = document.getElementById('pd-overlay');
  const body    = document.getElementById('pd-body');
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  body.innerHTML = `<div class="pd-loading"><div class="spinner spinner-dark spinner-lg"></div></div>`;

  try {
    const [profileRes, logsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
      supabase.from('point_logs').select('*').eq('user_id', id).order('created_at', { ascending: false }).limit(10),
    ]);
    if (profileRes.error) throw profileRes.error;
    const m    = profileRes.data;
    const logs = logsRes.data || [];
    if (!m) throw new Error('Không tìm thấy thành viên');

    const badge    = getBadge(m.points || 0);
    const initials = getInitials(m.full_name);
    const avatarHtml = m.avatar_url
      ? `<img src="${escHtml(m.avatar_url)}" class="pdp-avatar" alt="${escHtml(m.full_name)}" />`
      : `<div class="pdp-avatar pdp-avatar-init">${escHtml(initials)}</div>`;

    const logsHtml = logs.length
      ? logs.map(l => `
          <div class="pdp-log-item">
            <div class="pdp-log-action">${escHtml(l.action)}</div>
            <div class="pdp-log-meta">
              <span class="pdp-log-pts ${l.amount >= 0 ? 'pos' : 'neg'}">
                ${l.amount >= 0 ? '+' : ''}${l.amount} điểm
              </span>
              <span class="pdp-log-date">${formatDate(l.created_at)}</span>
            </div>
          </div>`).join('')
      : '<p style="color:var(--text-400);font-size:.85rem;text-align:center;padding:16px 0;">Chưa có lịch sử điểm</p>';

    body.innerHTML = `
      <div class="pdp-header">
        ${avatarHtml}
        <div class="pdp-info">
          <h2 class="pdp-name">${escHtml(m.full_name)}</h2>
          <div class="pdp-role">${escHtml(m.role)}</div>
          <div class="pdp-term">${escHtml(m.term)}</div>
          <span class="mc-badge ${badge.cls}">${badge.icon} ${badge.label}</span>
        </div>
      </div>
      <div class="pdp-stats">
        <div class="pdp-stat">
          <div class="pdp-stat-val">${(m.points||0).toLocaleString('vi-VN')}</div>
          <div class="pdp-stat-label">Điểm tích lũy</div>
        </div>
        <div class="pdp-stat">
          <div class="pdp-stat-val">${logs.length}</div>
          <div class="pdp-stat-label">Hoạt động gần đây</div>
        </div>
        <div class="pdp-stat">
          <div class="pdp-stat-val">${m.role_rank === 1 ? '👑' : m.role_rank === 2 ? '⭐' : '🔹'}</div>
          <div class="pdp-stat-label">Cấp bậc</div>
        </div>
      </div>
      <div class="pdp-logs">
        <h4>Lịch sử điểm gần đây</h4>
        ${logsHtml}
      </div>`;
  } catch (err) {
    body.innerHTML = `<div class="pd-loading" style="color:var(--error);">${escHtml(err.message)}</div>`;
  }
}

document.getElementById('pd-close')?.addEventListener('click', closeProfile);
document.getElementById('pd-overlay')?.addEventListener('click', e => { if (e.target.id === 'pd-overlay') closeProfile(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeProfile(); });

function closeProfile() {
  document.getElementById('pd-overlay')?.classList.remove('open');
  document.body.style.overflow = '';
}

/* ── Helpers ──────────────────────────────────────────── */
function getBadge(pts) {
  if (pts > 300) return { icon: '✨', label: 'AI Specialist', cls: 'mc-badge-gold' };
  if (pts > 100) return { icon: '🥈', label: 'Code Master',   cls: 'mc-badge-silver' };
  return               { icon: '🥉', label: 'Tân binh AI',   cls: 'mc-badge-bronze' };
}
function getInitials(name) {
  if (!name) return '?';
  const p = name.trim().split(' ');
  return (p.length > 1 ? p[0][0] + p[p.length-1][0] : p[0][0]).toUpperCase();
}
function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric' });
}
function setText(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }
function escHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
