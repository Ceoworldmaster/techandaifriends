// events.js
import { initNavbar, bindLogout, initHamburger, getUser } from './auth.js';
import { supabase } from './config.js';
import { awardPoints } from './points.js';
import { mountComments } from './comments.js';

let currentUser = null;
let myRegistrations = new Set(); // event ids I'm registered for

(async () => {
    await initNavbar();
    bindLogout();
    initHamburger();
    currentUser = await getUser();
    await loadEvents();
})();

async function loadEvents() {
    const list = document.getElementById('events-list');
    try {
        const { data: events, error } = await supabase
            .from('events')
            .select('*, event_registrations(count)')
            .order('start_at', { ascending: true });
        if (error) throw error;

        if (currentUser) {
            const { data: myRegs } = await supabase
                .from('event_registrations')
                .select('event_id')
                .eq('user_id', currentUser.id)
                .eq('status', 'registered');
            myRegistrations = new Set((myRegs || []).map(r => r.event_id));
        }

        if (!events || events.length === 0) {
            list.innerHTML = `<div class="comments-empty" style="text-align:center;padding:var(--sp-6) 0;">Chưa có sự kiện nào.</div>`;
            return;
        }

        list.innerHTML = events.map(e => renderEventCard(e)).join('');

        list.querySelectorAll('.event-register-btn').forEach(btn => {
            btn.addEventListener('click', () => handleRegister(btn.dataset.id, btn));
        });
        list.querySelectorAll('.event-cancel-btn').forEach(btn => {
            btn.addEventListener('click', () => handleCancel(btn.dataset.id, btn));
        });
        list.querySelectorAll('.event-comments-toggle').forEach(btn => {
            btn.addEventListener('click', () => toggleComments(btn.dataset.id));
        });
    } catch (err) {
        console.error('Events load error:', err);
        list.innerHTML = `<div class="comments-empty" style="text-align:center;color:var(--error);">Không tải được sự kiện.</div>`;
    }
}

function renderEventCard(e) {
    const start = new Date(e.start_at);
    const isPast = e.end_at ? new Date(e.end_at) < new Date() : start < new Date();
    const count = e.event_registrations?.[0]?.count ?? 0;
    const full = e.capacity ? count >= e.capacity : false;
    const registered = myRegistrations.has(e.id);

    let actionBtn;
    if (isPast) {
        actionBtn = `<span class="event-capacity">Đã diễn ra</span>`;
    } else if (!currentUser) {
        actionBtn = `<a href="login.html" class="btn btn-sm btn-outline">Đăng nhập để tham gia</a>`;
    } else if (registered) {
        actionBtn = `<button class="btn btn-sm btn-outline event-cancel-btn" data-id="${e.id}">Hủy đăng ký</button>`;
    } else if (full) {
        actionBtn = `<span class="event-capacity">Đã đủ số lượng</span>`;
    } else {
        actionBtn = `<button class="btn btn-sm btn-primary event-register-btn" data-id="${e.id}">Đăng ký tham gia</button>`;
    }

    const cover = e.cover_url
        ? `<img src="${escHtml(e.cover_url)}" alt="" onerror="this.parentElement.innerHTML='📅'" />`
        : '📅';

    return `
    <div class="event-card ${isPast ? 'event-past' : ''}" id="event-${e.id}">
      <div class="event-cover">${cover}</div>
      <div class="event-body">
        <span class="event-date-badge">🗓 ${start.toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
        <h3>${escHtml(e.title)}</h3>
        <div class="event-meta-row">
          ${e.location ? `<span>📍 ${escHtml(e.location)}</span>` : ''}
          <span>👥 ${count}${e.capacity ? ` / ${e.capacity}` : ''} đăng ký</span>
        </div>
        ${e.description ? `<p class="event-desc">${escHtml(e.description)}</p>` : ''}
        <div class="event-actions">
          ${actionBtn}
          <button class="btn btn-sm btn-ghost event-comments-toggle" data-id="${e.id}">💬 Bình luận</button>
        </div>
        <div class="event-comments-container" id="ecc-${e.id}" style="display:none;"></div>
      </div>
    </div>
  `;
}

async function handleRegister(eventId, btn) {
    if (!currentUser) { window.location.href = 'login.html'; return; }
    btn.disabled = true;
    btn.textContent = 'Đang xử lý...';
    try {
        const { error } = await supabase.from('event_registrations').insert({
            event_id: eventId, user_id: currentUser.id, status: 'registered',
        });
        if (error) throw error;
        myRegistrations.add(eventId);
        await awardPoints('join_event', eventId);
        await loadEvents();
    } catch (err) {
        console.error('Register error:', err);
        alert('Không đăng ký được: ' + (err.message || 'Lỗi không xác định.'));
        btn.disabled = false;
        btn.textContent = 'Đăng ký tham gia';
    }
}

async function handleCancel(eventId, btn) {
    if (!confirm('Hủy đăng ký sự kiện này?')) return;
    btn.disabled = true;
    try {
        const { error } = await supabase
            .from('event_registrations')
            .delete()
            .eq('event_id', eventId)
            .eq('user_id', currentUser.id);
        if (error) throw error;
        myRegistrations.delete(eventId);
        await loadEvents();
    } catch (err) {
        alert('Không hủy được: ' + (err.message || 'Lỗi không xác định.'));
        btn.disabled = false;
    }
}

const mountedComments = new Set();
function toggleComments(eventId) {
    const box = document.getElementById(`ecc-${eventId}`);
    if (!box) return;
    const willShow = box.style.display === 'none';
    box.style.display = willShow ? 'block' : 'none';
    if (willShow && !mountedComments.has(eventId)) {
        mountedComments.add(eventId);
        mountComments(box, 'event', eventId);
    }
}

function escHtml(str) {
    return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
