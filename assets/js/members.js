// members.js — Members page: per-term sections, rank hierarchy, photo cards
import { initNavbar, bindLogout, initHamburger } from './auth.js';
import { supabase } from './config.js';

const RANK_META = {
  1: { icon: '👑', label: 'Ban Chủ nhiệm',  cls: 'rank-1' },
  2: { icon: '⭐', label: 'Trưởng ban',      cls: 'rank-2' },
  3: { icon: '🔹', label: 'Thành viên',      cls: 'rank-3' },
};

let allMembers = [];
let activeTerm = '';
let searchQuery = '';

(async () => {
  await initNavbar();
  bindLogout();
  initHamburger();
  await loadAllMembers();
  bindSearch();
})();

/* ── Data ──────────────────────────────────────────────────── */
async function loadAllMembers() {
  const container = document.getElementById('members-container');
  showLoading(container);

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, role, role_rank, term, points, avatar_url')
      .order('term', { ascending: false })
      .order('role_rank', { ascending: true })
      .order('points', { ascending: false });

    if (error) throw error;

    allMembers = data || [];
    updateStats(allMembers);
    buildTermTabs(allMembers);
    renderView();
  } catch (err) {
    console.error('Members load error:', err);
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">⚠️</div>
        <h3>Không thể tải dữ liệu</h3>
        <p>${escHtml(err.message || 'Vui lòng thử lại sau.')}</p>
      </div>`;
  }
}

/* ── Stats bar ─────────────────────────────────────────────── */
function updateStats(members) {
  const terms = [...new Set(members.map(m => m.term))];
  const totalPts = members.reduce((s, m) => s + (m.points || 0), 0);
  setText('msb-total', members.length);
  setText('msb-terms', terms.length);
  setText('msb-points', totalPts.toLocaleString('vi-VN'));
}

/* ── Term Tabs ─────────────────────────────────────────────── */
function buildTermTabs(members) {
  const terms = [...new Set(members.map(m => m.term))]
    .filter(Boolean)
    .sort((a, b) => b.localeCompare(a));

  const container = document.getElementById('term-tabs');
  if (!container) return;

  // Keep the "All" button, add term buttons
  const existingAll = container.querySelector('[data-term=""]');
  container.innerHTML = '';
  if (existingAll) container.appendChild(existingAll);
  else {
    const btn = document.createElement('button');
    btn.className = 'mfb-tab active';
    btn.dataset.term = '';
    btn.textContent = 'Tất cả';
    container.appendChild(btn);
  }

  terms.forEach(term => {
    const btn = document.createElement('button');
    btn.className = 'mfb-tab';
    btn.dataset.term = term;
    btn.textContent = `Nhiệm kỳ ${term}`;
    container.appendChild(btn);
  });

  container.querySelectorAll('.mfb-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.mfb-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeTerm = btn.dataset.term;
      renderView();
    });
  });
}

/* ── Search ────────────────────────────────────────────────── */
function bindSearch() {
  const input = document.getElementById('member-search');
  if (!input) return;
  let debounce;
  input.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      searchQuery = input.value.trim().toLowerCase();
      renderView();
    }, 200);
  });
}

/* ── Render ────────────────────────────────────────────────── */
function renderView() {
  const container = document.getElementById('members-container');

  // Filter
  let filtered = allMembers.filter(m => {
    const matchTerm   = !activeTerm || m.term === activeTerm;
    const matchSearch = !searchQuery ||
      (m.full_name || '').toLowerCase().includes(searchQuery) ||
      (m.role      || '').toLowerCase().includes(searchQuery);
    return matchTerm && matchSearch;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="members-no-results">
        <div class="icon">🔍</div>
        <h3>Không tìm thấy thành viên</h3>
        <p>Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.</p>
      </div>`;
    return;
  }

  // Group by term (desc), then by rank
  const byTerm = {};
  filtered.forEach(m => {
    const t = m.term || 'Không xác định';
    if (!byTerm[t]) byTerm[t] = {};
    const r = m.role_rank || 3;
    if (!byTerm[t][r]) byTerm[t][r] = [];
    byTerm[t][r].push(m);
  });

  const termsSorted = Object.keys(byTerm).sort((a, b) => b.localeCompare(a));

  let html = '';
  termsSorted.forEach(term => {
    const rankMap = byTerm[term];
    const memberCount = Object.values(rankMap).flat().length;
    const ranksSorted = Object.keys(rankMap).map(Number).sort();

    html += `<div class="term-section" id="term-${term.replace(/[^a-z0-9]/gi,'_')}">`;
    html += `
      <div class="term-section-header">
        <div class="term-section-title">
          <div class="term-badge-pill">📅 ${escHtml(term)}</div>
          <h2>Nhiệm kỳ ${escHtml(term)}</h2>
        </div>
        <span class="term-member-count">${memberCount} thành viên</span>
      </div>`;

    ranksSorted.forEach(rank => {
      const meta    = RANK_META[rank] || RANK_META[3];
      const members = rankMap[rank];
      html += `
        <div class="rank-block ${meta.cls}">
          <div class="rank-block-header">
            <div class="rank-block-icon">${meta.icon}</div>
            <span class="rank-block-label">${meta.label} (${members.length})</span>
          </div>
          <div class="rank-grid">
            ${members.map(m => renderMemberCard(m, rank)).join('')}
          </div>
        </div>`;
    });

    html += `</div>`;
  });

  container.innerHTML = html;
}

/* ── Card ──────────────────────────────────────────────────── */
function renderMemberCard(m, rank) {
  const badge    = getBadge(m.points || 0);
  const initials = getInitials(m.full_name);
  const pts      = (m.points || 0).toLocaleString('vi-VN');

  const avatarContent = m.avatar_url
    ? `<img src="${escHtml(m.avatar_url)}" alt="${escHtml(m.full_name)}" loading="lazy" onerror="this.style.display='none';this.nextSibling.style.display='flex'" /><span style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-size:1.4rem;font-weight:700;color:#fff">${escHtml(initials)}</span>`
    : `<span style="font-size:${rank === 1 ? '1.7rem' : '1.4rem'};font-weight:700;">${escHtml(initials)}</span>`;

  return `
    <article class="mc">
      <div class="mc-cover">
        <div class="mc-cover-bg"></div>
        <div class="mc-role-chip" title="${escHtml(m.role)}">${escHtml(m.role)}</div>
        <div class="mc-avatar-wrap">
          <div class="mc-avatar">${avatarContent}</div>
        </div>
      </div>
      <div class="mc-body">
        <div class="mc-name">${escHtml(m.full_name)}</div>
        <div class="mc-sub">${escHtml(m.term)}</div>
        <span class="mc-badge ${badge.cls}">${badge.icon} ${badge.label}</span>
      </div>
      <div class="mc-footer">
        <div class="mc-points">
          <span>🏆</span>
          <strong>${pts}</strong>
          <span>điểm</span>
        </div>
      </div>
    </article>`;
}

/* ── Helpers ───────────────────────────────────────────────── */
function getBadge(points) {
  if (points > 300) return { icon: '✨', label: 'AI Specialist', cls: 'mc-badge-gold' };
  if (points > 100) return { icon: '🥈', label: 'Code Master',   cls: 'mc-badge-silver' };
  return               { icon: '🥉', label: 'Tân binh AI',    cls: 'mc-badge-bronze' };
}

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function showLoading(container) {
  container.innerHTML = `
    <div class="empty-state">
      <div style="margin:0 auto 16px;width:40px;height:40px;" class="spinner spinner-dark"></div>
      <h3>Đang tải dữ liệu...</h3>
    </div>`;
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
