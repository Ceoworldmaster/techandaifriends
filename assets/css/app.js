/* ============================================================
   APP.CSS — Thông báo / Sự kiện / Hồ sơ / Xếp hạng / Bình luận
   Dùng chung với global.css + pages.css (kế thừa design tokens)
   ============================================================ */

/* ── Generic simple page header (reused across new pages) ─────── */
.simple-hero {
    padding: clamp(90px, 14vh, 130px) 0 var(--sp-5);
    text-align: center;
    background: var(--grad-hero);
    position: relative;
    overflow: hidden;
}

.simple-hero h1 {
    font-size: clamp(1.8rem, 5vw, 2.6rem);
    margin-bottom: 10px;
}

.simple-hero p {
    color: var(--text-500);
    max-width: 560px;
    margin: 0 auto;
}

.page-body {
    padding: var(--sp-5) 0 var(--sp-10);
    max-width: 880px;
    margin: 0 auto;
}

/* ── Announcements ──────────────────────────────────────────── */
.announcement-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    padding: var(--sp-3);
    margin-bottom: var(--sp-2);
    box-shadow: var(--shadow-sm);
    position: relative;
}

.announcement-card.pinned {
    border-color: rgba(245, 158, 11, .35);
    background: linear-gradient(135deg, rgba(245, 158, 11, .05) 0%, rgba(255, 255, 255, 1) 60%);
}

.announcement-pin-tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: .7rem;
    font-weight: 700;
    color: #d97706;
    background: rgba(245, 158, 11, .12);
    padding: 2px 10px;
    border-radius: var(--r-full);
    margin-bottom: 8px;
}

.announcement-card h3 {
    font-size: 1.1rem;
    margin-bottom: 6px;
}

.announcement-card .ann-date {
    color: var(--text-400);
    font-size: .78rem;
    margin-bottom: 10px;
    display: block;
}

.announcement-card .ann-content {
    color: var(--text-700);
    line-height: 1.65;
    white-space: pre-wrap;
}

/* ── Events ─────────────────────────────────────────────────── */
.events-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: var(--sp-3);
}

.event-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    overflow: hidden;
    box-shadow: var(--shadow-sm);
    display: flex;
    flex-direction: column;
    transition: transform var(--tr), box-shadow var(--tr);
}

.event-card:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-lg);
}

.event-cover {
    height: 140px;
    background: var(--grad-brand-soft);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2.2rem;
    overflow: hidden;
}

.event-cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.event-body {
    padding: var(--sp-2) var(--sp-3) var(--sp-3);
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
}

.event-date-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: .78rem;
    font-weight: 700;
    color: var(--cyan-dark);
}

.event-body h3 {
    font-size: 1.05rem;
}

.event-meta-row {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    font-size: .8rem;
    color: var(--text-500);
}

.event-desc {
    color: var(--text-700);
    font-size: .88rem;
    line-height: 1.55;
    flex: 1;
}

.event-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-top: 8px;
}

.event-capacity {
    font-size: .78rem;
    color: var(--text-400);
}

.event-past {
    opacity: .6;
}

/* ── Leaderboard ────────────────────────────────────────────── */
.lb-controls {
    display: flex;
    justify-content: center;
    gap: 10px;
    margin-bottom: var(--sp-4);
}

.lb-podium {
    display: flex;
    align-items: flex-end;
    justify-content: center;
    gap: var(--sp-2);
    margin-bottom: var(--sp-5);
    flex-wrap: wrap;
}

.lb-podium-item {
    text-align: center;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    padding: var(--sp-2) var(--sp-2) var(--sp-3);
    width: 150px;
    box-shadow: var(--shadow-sm);
}

.lb-podium-item.p1 {
    order: 2;
    transform: translateY(-14px);
    border-color: rgba(251, 191, 36, .4);
}

.lb-podium-item.p2 {
    order: 1;
}

.lb-podium-item.p3 {
    order: 3;
}

.lb-podium-avatar {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    margin: 0 auto 8px;
    background: var(--grad-brand);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    overflow: hidden;
}

.lb-podium-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.lb-podium-medal {
    font-size: 1.4rem;
}

.lb-podium-name {
    font-weight: 700;
    font-size: .88rem;
    margin: 4px 0 2px;
}

.lb-podium-points {
    color: var(--cyan-dark);
    font-weight: 700;
}

.lb-table-wrap {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    overflow: hidden;
}

.lb-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px var(--sp-2);
    border-bottom: 1px solid var(--border);
}

.lb-row:last-child {
    border-bottom: none;
}

.lb-row.me {
    background: var(--grad-brand-soft);
}

.lb-rank {
    width: 28px;
    text-align: center;
    font-weight: 700;
    color: var(--text-400);
}

.lb-row-avatar {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: var(--grad-brand);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: .72rem;
    font-weight: 700;
    overflow: hidden;
    flex-shrink: 0;
}

.lb-row-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.lb-row-name {
    flex: 1;
    font-weight: 600;
}

.lb-row-role {
    color: var(--text-400);
    font-size: .78rem;
}

.lb-row-points {
    font-weight: 700;
    color: var(--cyan-dark);
}

/* ── Profile page ───────────────────────────────────────────── */
.profile-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    padding: var(--sp-4);
    box-shadow: var(--shadow-sm);
}

.profile-avatar-preview {
    width: 84px;
    height: 84px;
    border-radius: 50%;
    background: var(--grad-brand);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.6rem;
    font-weight: 700;
    margin: 0 auto var(--sp-2);
    overflow: hidden;
}

.profile-avatar-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.profile-stats-row {
    display: flex;
    justify-content: center;
    gap: var(--sp-4);
    margin: var(--sp-2) 0 var(--sp-4);
    text-align: center;
}

.profile-stats-row .psr-val {
    font-size: 1.3rem;
    font-weight: 800;
    color: var(--cyan-dark);
}

.profile-stats-row .psr-label {
    font-size: .76rem;
    color: var(--text-400);
}

/* ── Comments (shared widget) ──────────────────────────────── */
.comments-block {
    margin-top: var(--sp-3);
    padding-top: var(--sp-3);
    border-top: 1px solid var(--border);
}

.comments-title {
    margin-bottom: var(--sp-2);
}

.comments-loading,
.comments-empty {
    color: var(--text-400);
    font-size: .85rem;
    padding: var(--sp-2) 0;
}

.comment-item {
    display: flex;
    gap: 10px;
    padding: 10px 0;
    border-bottom: 1px solid var(--border);
}

.comment-item:last-child {
    border-bottom: none;
}

.comment-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    flex-shrink: 0;
    overflow: hidden;
}

.comment-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.comment-avatar-fallback {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--grad-brand);
    color: #fff;
    font-size: .68rem;
    font-weight: 700;
    border-radius: 50%;
}

.comment-body {
    flex: 1;
}

.comment-meta {
    display: flex;
    gap: 8px;
    align-items: baseline;
    margin-bottom: 2px;
}

.comment-author {
    font-weight: 700;
    font-size: .85rem;
}

.comment-time {
    font-size: .72rem;
    color: var(--text-400);
}

.comment-text {
    font-size: .88rem;
    color: var(--text-700);
    line-height: 1.5;
    white-space: pre-wrap;
}

.comment-delete-btn {
    background: none;
    border: none;
    color: var(--text-400);
    cursor: pointer;
    font-size: .8rem;
    align-self: flex-start;
}

.comment-delete-btn:hover {
    color: var(--error);
}

.comment-compose {
    margin-top: var(--sp-2);
}

.comment-input {
    width: 100%;
    border: 1px solid var(--border-strong);
    border-radius: var(--r-md);
    padding: 10px 12px;
    font-family: inherit;
    font-size: .88rem;
    resize: vertical;
    margin-bottom: 8px;
}

.comment-input:focus {
    outline: none;
    border-color: var(--cyan);
}

.comment-login-hint {
    color: var(--text-400);
    font-size: .85rem;
}

/* ── Points toast ───────────────────────────────────────────── */
.points-toast {
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 9999;
    background: var(--grad-brand);
    color: #fff;
    font-weight: 700;
    padding: 12px 20px;
    border-radius: var(--r-full);
    box-shadow: var(--shadow-lg);
    opacity: 0;
    transform: translateY(20px);
    transition: opacity .3s ease, transform .3s ease;
    pointer-events: none;
}

.points-toast.show {
    opacity: 1;
    transform: translateY(0);
}

@media (max-width: 640px) {
    .lb-podium-item.p1 {
        transform: translateY(-6px);
        width: 120px;
    }

    .lb-podium-item {
        width: 100px;
        padding: var(--sp-1) var(--sp-1) var(--sp-2);
    }
}
