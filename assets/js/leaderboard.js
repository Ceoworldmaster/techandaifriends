// leaderboard.js
import { initNavbar, bindLogout, initHamburger, getUser } from './auth.js';
import { supabase } from './config.js';

let currentUserId = null;

(async () => {
    await initNavbar();
    bindLogout();
    initHamburger();
    const user = await getUser();
    currentUserId = user?.id || null;

    initYearSelect();
    document.getElementById('lb-year-select')?.addEventListener('change', loadLeaderboard);
    await loadLeaderboard();
})();

function initYearSelect() {
    const sel = document.getElementById('lb-year-select');
    if (!sel) return;
    const currentYear = new Date().getFullYear();
    const years = [currentYear, currentYear - 1, currentYear - 2];
    sel.innerHTML = `<option value="all">🏅 Tổng điểm (mọi thời điểm)</option>` +
        years.map(y => `<option value="${y}">Năm ${y}</option>`).join('');
}

async function loadLeaderboard() {
    const podium = document.getElementById('lb-podium');
    const table = document.getElementById('lb-table');
    const yearVal = document.getElementById('lb-year-select')?.value || 'all';
    const p_year = yearVal === 'all' ? null : parseInt(yearVal);

    table.innerHTML = `<p style="text-align:center;padding:var(--sp-4);color:var(--text-400);">Đang tải...</p>`;
    podium.innerHTML = '';

    try {
        const { data, error } = await supabase.rpc('get_leaderboard', { p_year });
        if (error) throw error;

        const ranked = (data || []).filter(r => r.total_points > 0);

        if (ranked.length === 0) {
            table.innerHTML = `<p style="text-align:center;padding:var(--sp-4);color:var(--text-400);">Chưa có dữ liệu điểm cho mốc thời gian này.</p>`;
            return;
        }

        renderPodium(ranked.slice(0, 3));
        renderTable(ranked);
    } catch (err) {
        console.error('Leaderboard error:', err);
        table.innerHTML = `<p style="text-align:center;padding:var(--sp-4);color:var(--error);">Không tải được bảng xếp hạng.</p>`;
    }
}

function renderPodium(top3) {
    const podium = document.getElementById('lb-podium');
    const medals = ['🥇', '🥈', '🥉'];
    const posClass = ['p1', 'p2', 'p3'];
    podium.innerHTML = top3.map((r, i) => {
        const initials = initialsOf(r.full_name);
        const avatar = r.avatar_url
            ? `<img src="${escHtml(r.avatar_url)}" alt="" onerror="this.parentElement.textContent='${initials}'" />`
            : initials;
        return `
      <div class="lb-podium-item ${posClass[i]}">
        <div class="lb-podium-medal">${medals[i]}</div>
        <div class="lb-podium-avatar">${avatar}</div>
        <div class="lb-podium-name">${escHtml(r.full_name)}</div>
        <div class="lb-podium-points">${r.total_points} điểm</div>
      </div>`;
    }).join('');
}

function renderTable(ranked) {
    const table = document.getElementById('lb-table');
    table.innerHTML = ranked.map(r => {
        const initials = initialsOf(r.full_name);
        const avatar = r.avatar_url
            ? `<img src="${escHtml(r.avatar_url)}" alt="" onerror="this.parentElement.textContent='${initials}'" />`
            : initials;
        const isMe = r.user_id === currentUserId;
        return `
      <div class="lb-row ${isMe ? 'me' : ''}">
        <div class="lb-rank">${medalOrRank(r.rank)}</div>
        <div class="lb-row-avatar">${avatar}</div>
        <div class="lb-row-name">${escHtml(r.full_name)} ${isMe ? '<span style="color:var(--cyan-dark);font-size:.75rem;">(bạn)</span>' : ''}
          <div class="lb-row-role">${escHtml(r.role || '')}</div>
        </div>
        <div class="lb-row-points">${r.total_points}</div>
      </div>`;
    }).join('');
}

function medalOrRank(rank) {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
}

function initialsOf(name) {
    return (name || '?').trim().split(' ').map(p => p[0]).filter(Boolean).slice(-2).join('').toUpperCase();
}

function escHtml(str) {
    return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
