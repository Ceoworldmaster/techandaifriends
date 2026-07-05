// comments.js — shared comment box, reusable for any entity_type.
import { supabase } from './config.js';
import { getUser } from './auth.js';
import { awardPoints } from './points.js';

function escHtml(str) {
    return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function timeAgo(iso) {
    const d = new Date(iso);
    const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diffSec < 60) return 'vừa xong';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} giờ trước`;
    if (diffSec < 2592000) return `${Math.floor(diffSec / 86400)} ngày trước`;
    return d.toLocaleDateString('vi-VN');
}

/**
 * Mounts a comment section into `containerEl`.
 * @param {HTMLElement} containerEl
 * @param {'activity'|'event'|'announcement'} entityType
 * @param {string} entityId
 */
export async function mountComments(containerEl, entityType, entityId) {
    containerEl.classList.add('comments-block');
    containerEl.innerHTML = `
    <h4 class="comments-title">💬 Bình luận</h4>
    <div class="comments-list" id="clist-${entityId}">
      <div class="comments-loading">Đang tải bình luận...</div>
    </div>
    <div class="comment-compose" id="ccompose-${entityId}"></div>
  `;

    const listEl = containerEl.querySelector(`#clist-${entityId}`);
    const composeEl = containerEl.querySelector(`#ccompose-${entityId}`);

    const user = await getUser();
    if (user) {
        composeEl.innerHTML = `
      <textarea class="comment-input" id="cinput-${entityId}" rows="2" maxlength="2000" placeholder="Viết bình luận của bạn..."></textarea>
      <button class="btn btn-sm btn-primary comment-submit-btn" id="csubmit-${entityId}">Gửi</button>
    `;
        composeEl.querySelector(`#csubmit-${entityId}`).addEventListener('click', async () => {
            const input = composeEl.querySelector(`#cinput-${entityId}`);
            const content = input.value.trim();
            if (!content) return;
            const btn = composeEl.querySelector(`#csubmit-${entityId}`);
            btn.disabled = true;
            try {
                const { data, error } = await supabase
                    .from('comments')
                    .insert({ entity_type: entityType, entity_id: entityId, user_id: user.id, content })
                    .select('id')
                    .single();
                if (error) throw error;
                input.value = '';
                await renderList();
                if (data?.id) awardPoints('comment', data.id);
            } catch (err) {
                console.error('Comment insert error:', err);
                alert('Không gửi được bình luận: ' + err.message);
            } finally {
                btn.disabled = false;
            }
        });
    } else {
        composeEl.innerHTML = `<p class="comment-login-hint">Vui lòng <a href="login.html">đăng nhập</a> để bình luận.</p>`;
    }

    async function renderList() {
        const { data, error } = await supabase
            .from('comments')
            .select('id, content, created_at, user_id, profiles:user_id(full_name, avatar_url)')
            .eq('entity_type', entityType)
            .eq('entity_id', entityId)
            .order('created_at', { ascending: false });

        if (error) {
            listEl.innerHTML = `<div class="comments-empty">Không tải được bình luận.</div>`;
            console.error('Comments load error:', error);
            return;
        }
        if (!data || data.length === 0) {
            listEl.innerHTML = `<div class="comments-empty">Chưa có bình luận nào. Hãy là người đầu tiên!</div>`;
            return;
        }

        listEl.innerHTML = data.map(c => {
            const name = c.profiles?.full_name || 'Thành viên';
            const initials = name.trim().split(' ').map(p => p[0]).filter(Boolean).slice(-2).join('').toUpperCase();
            const avatar = c.profiles?.avatar_url
                ? `<img src="${escHtml(c.profiles.avatar_url)}" alt="" onerror="this.style.display='none'" />`
                : `<span class="comment-avatar-fallback">${escHtml(initials)}</span>`;
            const canDelete = user && (user.id === c.user_id);
            return `
        <div class="comment-item" data-id="${c.id}">
          <div class="comment-avatar">${avatar}</div>
          <div class="comment-body">
            <div class="comment-meta"><span class="comment-author">${escHtml(name)}</span><span class="comment-time">${timeAgo(c.created_at)}</span></div>
            <div class="comment-text">${escHtml(c.content)}</div>
          </div>
          ${canDelete ? `<button class="comment-delete-btn" data-id="${c.id}" title="Xóa">✕</button>` : ''}
        </div>`;
        }).join('');

        listEl.querySelectorAll('.comment-delete-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (!confirm('Xóa bình luận này?')) return;
                const { error } = await supabase.from('comments').delete().eq('id', btn.dataset.id);
                if (error) { alert('Không xóa được: ' + error.message); return; }
                renderList();
            });
        });
    }

    await renderList();
}
