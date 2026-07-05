// main.js — Homepage logic: dashboard stats + AI Chatbot
import { initNavbar, bindLogout, initHamburger } from './auth.js';
import { supabase } from './config.js';

/* ── Init ──────────────────────────────────────────────────── */
(async () => {
  await initNavbar();
  bindLogout();
  initHamburger();
  await loadStats();
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

    animateCount('stat-members',      membersRes.count  ?? 0);
    animateCount('stat-issues',       issuesRes.count   ?? 0);
    animateCount('stat-points',       totalPoints);
    animateCount('stat-applications', appsRes.count     ?? 0);
    // Hero floating cards
    animateCount('hfc-points', totalPoints);
    animateCount('hfc-issues', issuesRes.count ?? 0);
    setText('stat-members-hero', (membersRes.count ?? 0) + '+');
  } catch (err) {
    console.error('Stats load error:', err);
    ['stat-members','stat-issues','stat-points','stat-applications']
      .forEach(id => { const el = document.getElementById(id); if (el) el.textContent = '0'; });
  }
}

function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }

function animateCount(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const duration = 1400;
  const step = 16;
  const total = Math.ceil(duration / step);
  let current = 0;
  let frame = 0;
  const timer = setInterval(() => {
    frame++;
    current = Math.round(target * (frame / total));
    el.textContent = current.toLocaleString('vi-VN');
    if (frame >= total) { clearInterval(timer); el.textContent = target.toLocaleString('vi-VN'); }
  }, step);
}

/* ── AI Chatbot ────────────────────────────────────────────── */
const KB = [
  { keys: ['thành viên','member','bao nhiêu người'], answer: 'CLB hiện có nhiều thành viên đang hoạt động tích cực! Bạn có thể xem danh sách đầy đủ tại trang <a href="members.html" style="color:var(--cyan)">Thành viên</a>.' },
  { keys: ['gia nhập','tham gia','đăng ký','tuyển'],  answer: 'Bạn muốn gia nhập Tech & AI Friends? Tuyệt vời! Điền form đăng ký tại trang <a href="join.html" style="color:var(--cyan)">Gia nhập</a> nhé!' },
  { keys: ['báo','tạp chí','pdf','issue','số báo'],   answer: 'CLB xuất bản tạp chí công nghệ định kỳ. Bạn có thể đọc trực tiếp trong trang tại <a href="activities.html" style="color:var(--cyan)">Hoạt động & Báo chí</a>.' },
  { keys: ['hoạt động','sự kiện','event','workshop'],  answer: 'CLB tổ chức workshop, seminar, hackathon thường xuyên. Xem chi tiết tại <a href="activities.html" style="color:var(--cyan)">Hoạt động</a>!' },
  { keys: ['điểm','point','gamification','huy hiệu','badge'], answer: 'Hệ thống Gamification của CLB: 0-100 điểm → Tân binh AI 🥉, 101-300 điểm → Code Master 🥈, trên 300 điểm → AI Specialist ✨. Tích lũy điểm qua các hoạt động tham gia!' },
  { keys: ['ban chủ nhiệm','chủ nhiệm','lãnh đạo','ban lãnh đạo'], answer: 'Ban chủ nhiệm CLB là nhóm lãnh đạo điều hành mọi hoạt động. Xem thông tin tại trang <a href="members.html" style="color:var(--cyan)">Thành viên</a>.' },
  { keys: ['đăng nhập','login','tài khoản','account'], answer: 'Thành viên CLB có thể đăng nhập tại <a href="login.html" style="color:var(--cyan)">trang đăng nhập</a>. Nếu chưa có tài khoản, liên hệ Admin để được cấp!' },
  { keys: ['ai','trí tuệ nhân tạo','machine learning','deep learning'], answer: 'Tech & AI Friends là CLB tập trung vào AI, Machine Learning, Deep Learning và các công nghệ hiện đại. Cùng nhau khám phá tương lai nào! 🚀' },
  { keys: ['liên hệ','contact','email','hỏi'], answer: 'Để biết thêm thông tin, bạn có thể đăng ký tại <a href="join.html" style="color:var(--cyan)">form gia nhập</a> và Admin sẽ liên hệ lại với bạn.' },
  { keys: ['hello','xin chào','hi','chào','hey'],     answer: 'Xin chào! 👋 Tôi là AI Companion của Tech & AI Friends Club. Hỏi tôi bất cứ điều gì về CLB nhé!' },
];
const FALLBACK = 'Hmm, tôi chưa có thông tin về điều này. Bạn có thể liên hệ trực tiếp với Ban chủ nhiệm hoặc đặt câu hỏi khác nhé! 😊';

function initChatbot() {
  const btn      = document.getElementById('chatbot-btn');
  const panel    = document.getElementById('chatbot-panel');
  const closeBtn = document.getElementById('chat-close');
  const input    = document.getElementById('chat-input');
  const sendBtn  = document.getElementById('chat-send');
  const msgs     = document.getElementById('chat-messages');
  if (!btn || !panel) return;

  btn.addEventListener('click', () => {
    panel.classList.toggle('open');
    if (panel.classList.contains('open') && msgs.children.length === 0) {
      addBotMsg('Xin chào! Tôi là AI Companion 🤖 của Tech & AI Friends Club. Bạn muốn biết gì về CLB của chúng ta?');
    }
  });
  closeBtn.addEventListener('click', () => panel.classList.remove('open'));

  const submit = () => {
    const text = input.value.trim();
    if (!text) return;
    addUserMsg(text);
    input.value = '';
    showTyping(msgs).then(() => {
      const answer = resolve(text);
      addBotMsg(answer);
    });
  };

  sendBtn.addEventListener('click', submit);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
}

function resolve(text) {
  const lower = text.toLowerCase();
  for (const item of KB) {
    if (item.keys.some(k => lower.includes(k))) return item.answer;
  }
  return FALLBACK;
}

function addUserMsg(text) {
  const msgs = document.getElementById('chat-messages');
  const div  = document.createElement('div');
  div.className = 'chat-msg user';
  div.innerHTML = `<div class="chat-bubble">${escHtml(text)}</div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function addBotMsg(html) {
  const msgs = document.getElementById('chat-messages');
  const div  = document.createElement('div');
  div.className = 'chat-msg bot';
  div.innerHTML = `<div class="chat-bubble">${html}</div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function showTyping(msgs) {
  return new Promise(resolve => {
    const div = document.createElement('div');
    div.className = 'chat-msg bot';
    div.innerHTML = `<div class="chat-bubble"><div class="typing-indicator"><span></span><span></span><span></span></div></div>`;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    setTimeout(() => { div.remove(); resolve(); }, 900 + Math.random() * 500);
  });
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
