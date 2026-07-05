// main.js — Homepage: stats, announcements ticker, events, chatbot
import { initNavbar, bindLogout, initHamburger } from './auth.js';
import { supabase } from './config.js';

(async () => {
  await initNavbar();
  bindLogout();
  initHamburger();
  await Promise.all([loadStats(), loadAnnouncements(), loadUpcomingEvents()]);
  initChatbot();
})();

/* ── Stats ─────────────────────────────────────────────────── */
async function loadStats() {
  try {
    const [membersRes, issuesRes, pointsRes, appsRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('activities').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('points'),
      supabase.from('registrations').select('id', { count: 'exact', head: true }),
    ]);
    const totalPoints = (pointsRes.data || []).reduce((s, r) => s + (r.points || 0), 0);
    animateCount('stat-members', membersRes.count ?? 0);
    animateCount('stat-issues',  issuesRes.count  ?? 0);
    animateCount('stat-points',  totalPoints);
    animateCount('stat-applications', appsRes.count ?? 0);
    animateCount('hfc-points', totalPoints);
    animateCount('hfc-issues', issuesRes.count ?? 0);
    setText('stat-members-hero', (membersRes.count ?? 0) + '+');
  } catch (err) {
    console.error('Stats error:', err);
  }
}

/* ── Announcements ─────────────────────────────────────────── */
async function loadAnnouncements() {
  try {
    const { data } = await supabase
      .from('announcements')
      .select('*')
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(6);
    if (!data?.length) return;

    // Ticker bar (pinned only)
    const pinned = data.filter(a => a.pinned);
    if (pinned.length) {
      const ticker = document.getElementById('announce-ticker');
      const content = document.getElementById('ticker-content');
      if (ticker && content) {
        content.innerHTML = pinned.map(a => `<span class="ticker-item">${escHtml(a.title)}</span>`).join('<span class="ticker-sep">•</span>');
        ticker.style.display = 'flex';
        document.getElementById('ticker-close')?.addEventListener('click', () => ticker.style.display = 'none');
      }
    }

    // Announcement cards section
    const section = document.getElementById('announce-section');
    const grid    = document.getElementById('announce-grid');
    if (!section || !grid) return;
    section.style.display = 'block';
    grid.innerHTML = data.slice(0, 4).map(a => `
      <div class="announce-card ${a.pinned ? 'announce-pinned' : ''}">
        ${a.pinned ? '<div class="announce-pin-tag">📌 Ghim</div>' : ''}
        <div class="announce-card-body">
          <h4 class="announce-title">${escHtml(a.title)}</h4>
          <p class="announce-content">${escHtml(a.content)}</p>
        </div>
        <div class="announce-card-footer">
          <span class="announce-date">${formatRelative(a.created_at)}</span>
        </div>
      </div>`).join('');
  } catch (err) {
    console.error('Announcements error:', err);
  }
}

/* ── Upcoming Events ───────────────────────────────────────── */
async function loadUpcomingEvents() {
  try {
    const { data } = await supabase
      .from('events')
      .select('*')
      .gte('start_at', new Date(Date.now() - 86400000).toISOString())
      .order('start_at', { ascending: true })
      .limit(4);
    if (!data?.length) return;

    const section = document.getElementById('events-section');
    const grid    = document.getElementById('events-grid');
    if (!section || !grid) return;
    section.style.display = 'block';

    grid.innerHTML = data.map(ev => {
      const start  = new Date(ev.start_at);
      const isPast = start < new Date();
      const dateStr = start.toLocaleDateString('vi-VN', { weekday:'short', day:'numeric', month:'numeric', year:'numeric' });
      const timeStr = start.toLocaleTimeString('vi-VN', { hour:'2-digit', minute:'2-digit' });
      return `
        <div class="event-card ${isPast ? 'event-past' : ''}">
          <div class="event-date-col">
            <div class="event-day">${start.getDate()}</div>
            <div class="event-month">${start.toLocaleDateString('vi-VN', { month:'short' })}</div>
          </div>
          <div class="event-body">
            <div class="event-header">
              ${isPast ? '<span class="event-tag event-tag-past">Đã kết thúc</span>' : '<span class="event-tag event-tag-upcoming">Sắp diễn ra</span>'}
            </div>
            <h4 class="event-title">${escHtml(ev.title)}</h4>
            <p class="event-desc">${escHtml((ev.description||'').slice(0, 100))}${ev.description?.length > 100 ? '...' : ''}</p>
            <div class="event-meta">
              <span class="event-meta-item">🕐 ${timeStr} · ${dateStr}</span>
              ${ev.location ? `<span class="event-meta-item">📍 ${escHtml(ev.location)}</span>` : ''}
              ${ev.capacity ? `<span class="event-meta-item">👥 ${ev.capacity} người</span>` : ''}
            </div>
          </div>
        </div>`;
    }).join('');
  } catch (err) {
    console.error('Events error:', err);
  }
}

/* ── Chatbot ───────────────────────────────────────────────── */
const KB = [
  { keys:['thành viên','member','bao nhiêu người'],  ans:'CLB hiện có nhiều thành viên năng động! Xem danh sách tại <a href="members.html" style="color:var(--cyan)">Thành viên</a>.' },
  { keys:['gia nhập','tham gia','đăng ký','tuyển'],  ans:'Muốn gia nhập? Điền form tại <a href="join.html" style="color:var(--cyan)">Gia nhập</a> nhé!' },
  { keys:['báo','tạp chí','pdf','số báo'],            ans:'CLB xuất bản tạp chí định kỳ. Đọc tại <a href="activities.html" style="color:var(--cyan)">Hoạt động</a>!' },
  { keys:['sự kiện','event','workshop','hackathon'],  ans:'CLB tổ chức workshop, seminar, hackathon thường xuyên. Xem tại <a href="activities.html" style="color:var(--cyan)">Hoạt động</a>!' },
  { keys:['điểm','point','xếp hạng','leaderboard'],  ans:'Tích lũy điểm qua hoạt động CLB! Xem bảng xếp hạng tại <a href="leaderboard.html" style="color:var(--cyan)">Bảng xếp hạng</a>.' },
  { keys:['ai','trí tuệ nhân tạo','machine learning'],ans:'Tech & AI Friends tập trung vào AI, ML, Deep Learning và công nghệ hiện đại. Cùng khám phá nhé! 🚀' },
  { keys:['đăng nhập','login','tài khoản'],           ans:'Đăng nhập tại <a href="login.html" style="color:var(--cyan)">trang đăng nhập</a>. Chưa có tài khoản? Liên hệ Admin!' },
  { keys:['hello','xin chào','hi','chào'],            ans:'Xin chào! 👋 Tôi là AI Companion. Hỏi tôi về CLB nhé!' },
];
const FALLBACK = 'Hmm, tôi chưa có thông tin về điều này. Thử hỏi về thành viên, sự kiện, hoặc cách gia nhập CLB! 😊';

function initChatbot() {
  const btn   = document.getElementById('chatbot-btn');
  const panel = document.getElementById('chatbot-panel');
  const input = document.getElementById('chat-input');
  const send  = document.getElementById('chat-send');
  const msgs  = document.getElementById('chat-messages');
  if (!btn) return;

  btn.addEventListener('click', () => {
    panel.classList.toggle('open');
    if (panel.classList.contains('open') && !msgs.children.length)
      addBot('Xin chào! 🤖 Tôi là AI Companion của Tech &amp; AI Friends. Tôi có thể giúp gì cho bạn?');
  });
  document.getElementById('chat-close')?.addEventListener('click', () => panel.classList.remove('open'));

  const submit = () => {
    const text = input.value.trim(); if (!text) return;
    addUser(text); input.value = '';
    const lower = text.toLowerCase();
    const found = KB.find(k => k.keys.some(kw => lower.includes(kw)));
    const typing = document.createElement('div');
    typing.className = 'chat-msg bot';
    typing.innerHTML = `<div class="chat-bubble"><div class="typing-indicator"><span></span><span></span><span></span></div></div>`;
    msgs.appendChild(typing); msgs.scrollTop = msgs.scrollHeight;
    setTimeout(() => { typing.remove(); addBot(found ? found.ans : FALLBACK); }, 700 + Math.random() * 400);
  };
  send.addEventListener('click', submit);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
}
function addUser(t) { addMsg('user', escHtml(t)); }
function addBot(html) { addMsg('bot', html); }
function addMsg(type, html) {
  const msgs = document.getElementById('chat-messages');
  const d = document.createElement('div');
  d.className = `chat-msg ${type}`;
  d.innerHTML = `<div class="chat-bubble">${html}</div>`;
  msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight;
}

/* ── Helpers ────────────────────────────────────────────────── */
function animateCount(id, target) {
  const el = document.getElementById(id); if (!el) return;
  const dur = 1400, step = 16, total = Math.ceil(dur / step);
  let frame = 0;
  const t = setInterval(() => {
    frame++;
    el.textContent = Math.round(target * frame / total).toLocaleString('vi-VN');
    if (frame >= total) { clearInterval(t); el.textContent = target.toLocaleString('vi-VN'); }
  }, step);
}
function setText(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }
function formatRelative(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  const d = Math.floor(h / 24);
  if (d < 7)  return `${d} ngày trước`;
  return new Date(iso).toLocaleDateString('vi-VN');
}
function escHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
