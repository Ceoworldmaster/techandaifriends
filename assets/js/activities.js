// activities.js — Magazine page v2: featured issue, grid, search, sort, PDF modal with nav
import { initNavbar, bindLogout, initHamburger } from './auth.js';
import { supabase } from './config.js';
import { awardPoints } from './points.js';
import { mountComments } from './comments.js';

let allIssues = [];    // full list from DB
let filtered = [];    // after search/sort
let openIndex = -1;    // currently open in modal

(async () => {
    await initNavbar();
    bindLogout();
    initHamburger();
    initModal();
    bindFilters();
    await loadIssues();
})();

/* ── Data ──────────────────────────────────────────────────── */
async function loadIssues() {
    try {
        const { data, error } = await supabase
            .from('activities')
            .select('*')
            .order('published_at', { ascending: false });

        if (error) throw error;
        allIssues = data || [];
        applyFilters();
        updateHeroStats();
        updateHeroCover();
    } catch (err) {
        console.error('Activities error:', err);
        document.getElementById('magazine-grid').innerHTML = `
      <div class="act-empty">
        <div class="icon">⚠️</div>
        <h3>Không thể tải dữ liệu</h3>
        <p>${escHtml(err.message || 'Vui lòng thử lại sau.')}</p>
      </div>`;
    }
}

/* ── Hero ──────────────────────────────────────────────────── */
function updateHeroStats() {
    setText('ahs-count', allIssues.length || 0);
    if (allIssues.length > 0) {
        const latest = allIssues[0];
        setText('ahs-latest', latest.issue_number ? `Số ${latest.issue_number}` : 'Mới nhất');
    }
}

function updateHeroCover() {
    const cover = document.getElementById('act-hero-cover');
    if (!cover || allIssues.length === 0) return;
    const latest = allIssues[0];
    if (latest.cover_url) {
        cover.innerHTML = `
      <div class="ahc-magazine-wrap">
        <img src="${escHtml(latest.cover_url)}" alt="${escHtml(latest.title)}" loading="lazy" />
      </div>`;
    }
}

/* ── Filters ───────────────────────────────────────────────── */
function bindFilters() {
    let searchDebounce;
    document.getElementById('sort-select')?.addEventListener('change', applyFilters);
    document.getElementById('act-search')?.addEventListener('input', () => {
        clearTimeout(searchDebounce);
        searchDebounce = setTimeout(applyFilters, 200);
    });
}

function applyFilters() {
    const sort = document.getElementById('sort-select')?.value || 'newest';
    const search = (document.getElementById('act-search')?.value || '').trim().toLowerCase();

    let list = [...allIssues];

    if (search) {
        list = list.filter(a =>
            (a.title || '').toLowerCase().includes(search) ||
            (a.description || '').toLowerCase().includes(search)
        );
    }

    switch (sort) {
        case 'oldest': list.sort((a, b) => new Date(a.published_at) - new Date(b.published_at)); break;
        case 'issue_desc': list.sort((a, b) => (b.issue_number || 0) - (a.issue_number || 0)); break;
        default: list.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
    }

    filtered = list;
    updateCount();
    renderAll();
}

function updateCount() {
    const el = document.getElementById('afb-count');
    if (el) el.textContent = filtered.length > 0 ? `${filtered.length} số báo` : '';
}

/* ── Render ────────────────────────────────────────────────── */
function renderAll() {
    const featuredSection = document.getElementById('act-featured-section');
    const featuredCard = document.getElementById('featured-card');
    const gridTitle = document.getElementById('grid-section-title');
    const grid = document.getElementById('magazine-grid');

    if (filtered.length === 0) {
        if (featuredSection) featuredSection.style.display = 'none';
        if (gridTitle) gridTitle.style.display = 'none';
        grid.innerHTML = `
      <div class="act-empty">
        <div class="icon">🔍</div>
        <h3>Không tìm thấy số báo nào</h3>
        <p>Thử tìm kiếm với từ khóa khác.</p>
      </div>`;
        return;
    }

    // If showing full list (no search/sort override) show featured separately
    const search = (document.getElementById('act-search')?.value || '').trim();
    const showFeatured = !search && filtered.length > 0;

    if (showFeatured && featuredSection && featuredCard) {
        featuredSection.style.display = 'block';
        featuredCard.innerHTML = renderFeaturedCard(filtered[0]);
        featuredCard.querySelector('.fc-read-btn')?.addEventListener('click', () => openModal(0));

        if (gridTitle) gridTitle.style.display = filtered.length > 1 ? 'flex' : 'none';
        const rest = filtered.slice(1);
        if (rest.length === 0) { grid.innerHTML = ''; return; }
        grid.innerHTML = rest.map((a, i) => renderMagCard(a, i + 1)).join('');
    } else {
        if (featuredSection) featuredSection.style.display = 'none';
        if (gridTitle) gridTitle.style.display = 'flex';
        grid.innerHTML = filtered.map((a, i) => renderMagCard(a, i)).join('');
    }

    // Bind read buttons
    grid.querySelectorAll('[data-index]').forEach(btn => {
        btn.addEventListener('click', () => openModal(parseInt(btn.dataset.index)));
    });
    grid.querySelectorAll('.mag-read-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            const btn = overlay.querySelector('[data-index]');
            if (btn) openModal(parseInt(btn.dataset.index));
        });
    });
}

/* ── Featured card ─────────────────────────────────────────── */
function renderFeaturedCard(a) {
    const date = formatDate(a.published_at);
    const coverHtml = a.cover_url
        ? `<img src="${escHtml(a.cover_url)}" alt="${escHtml(a.title)}" loading="eager" />`
        : `<div class="fc-cover-placeholder">
        <div class="big-icon">📰</div>
        <span>Tạp chí Tech &amp; AI</span>
       </div>`;

    return `
    <div class="fc-cover">
      ${coverHtml}
      <div class="fc-issue-tag">Số ${a.issue_number || '?'}</div>
      <div class="fc-new-tag">MỚI</div>
    </div>
    <div class="fc-body">
      <div class="fc-meta">
        <span class="fc-tag">📰 Tạp chí CLB</span>
        <span class="fc-date">${date}</span>
      </div>
      <h2 class="fc-title">${escHtml(a.title)}</h2>
      <p class="fc-desc">${escHtml(a.description || 'Tạp chí nội bộ mới nhất của Tech & AI Friends Club, tổng hợp kiến thức và xu hướng công nghệ.')}</p>
      <div class="fc-actions">
        ${a.pdf_url
            ? `<button class="btn btn-primary btn-lg fc-read-btn" data-index="0">📖 Đọc ngay</button>
             <a href="${escHtml(a.pdf_url)}" target="_blank" rel="noopener" class="btn btn-outline btn-lg">⬇ Tải về</a>`
            : `<span class="btn btn-outline btn-lg" style="opacity:.5;cursor:default;">Sắp có</span>`
        }
      </div>
    </div>`;
}

/* ── Magazine Card ─────────────────────────────────────────── */
function renderMagCard(a, index) {
    const date = formatDate(a.published_at);
    const coverHtml = a.cover_url
        ? `<img class="mag-cover-img" src="${escHtml(a.cover_url)}" alt="${escHtml(a.title)}" loading="lazy" />`
        : `<div class="mag-cover-placeholder">
        <div class="mag-placeholder-icon">📰</div>
        <div class="mag-placeholder-text">Tech &amp; AI Magazine</div>
       </div>`;

    const readOverlay = a.pdf_url
        ? `<div class="mag-read-overlay">
        <button class="mag-overlay-btn" data-index="${index}">📖 Đọc báo</button>
       </div>`
        : '';

    const footerBtn = a.pdf_url
        ? `<button class="mag-btn mag-btn-read" data-index="${index}">📖 Đọc</button>`
        : `<span class="mag-btn mag-btn-soon">Sắp có</span>`;

    const noPdfBadge = !a.pdf_url
        ? `<div class="mag-no-pdf-badge">Chưa có PDF</div>`
        : '';

    return `
    <article class="mag-card">
      <div class="mag-cover">
        ${coverHtml}
        ${readOverlay}
        <div class="mag-issue-badge">Số ${a.issue_number || '?'}</div>
        ${noPdfBadge}
      </div>
      <div class="mag-body">
        <div class="mag-title">${escHtml(a.title)}</div>
        <div class="mag-desc">${escHtml(a.description || 'Tạp chí nội bộ của Tech & AI Friends Club.')}</div>
      </div>
      <div class="mag-footer">
        <span class="mag-date">${date}</span>
        ${footerBtn}
      </div>
    </article>`;
}

/* ── PDF Modal ─────────────────────────────────────────────── */
function initModal() {
    document.getElementById('pdfm-close')?.addEventListener('click', closeModal);
    document.getElementById('pdf-overlay')?.addEventListener('click', (e) => {
        if (e.target.id === 'pdf-overlay') closeModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
        if (e.key === 'ArrowLeft') navigateModal(-1);
        if (e.key === 'ArrowRight') navigateModal(1);
    });

    document.getElementById('pdfm-fullscreen')?.addEventListener('click', () => {
        const viewer = document.getElementById('pdfm-viewer');
        if (!document.fullscreenElement) viewer.requestFullscreen?.();
        else document.exitFullscreen?.();
    });

    document.getElementById('pdfm-prev')?.addEventListener('click', () => navigateModal(-1));
    document.getElementById('pdfm-next')?.addEventListener('click', () => navigateModal(1));
}

function openModal(index) {
    if (index < 0 || index >= filtered.length) return;
    openIndex = index;
    const a = filtered[index];

    setText('pdfm-title', a.title || 'Xem báo');
    setText('pdfm-issue', `Số ${a.issue_number || '?'}`);
    setText('pdfm-date', formatDate(a.published_at));
    setText('pdfm-desc', a.description || '');

    const dl = document.getElementById('pdfm-download');
    if (dl) dl.href = a.pdf_url || '#';

    const loading = document.getElementById('pdfm-loading');
    const iframe = document.getElementById('pdfm-iframe');
    if (a.pdf_url) {
        if (loading) loading.style.display = 'flex';
        if (iframe) { iframe.style.display = 'none'; iframe.src = a.pdf_url; }
        iframe?.addEventListener('load', () => {
            if (loading) loading.style.display = 'none';
            if (iframe) iframe.style.display = 'block';
        }, { once: true });
    } else {
        if (loading) loading.innerHTML = `<p style="color:rgba(255,255,255,.6);font-size:.95rem;">📄 File PDF chưa có sẵn cho số báo này.</p>`;
    }

    updateNavButtons();
    document.getElementById('pdf-overlay')?.classList.add('open');
    document.body.style.overflow = 'hidden';

    if (a.pdf_url) awardPoints('read_activity', a.id);
    const commentsBox = document.getElementById('pdfm-comments');
    if (commentsBox) mountComments(commentsBox, 'activity', a.id);
}

function closeModal() {
    document.getElementById('pdf-overlay')?.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(() => {
        const iframe = document.getElementById('pdfm-iframe');
        if (iframe) { iframe.src = ''; iframe.style.display = 'none'; }
        const loading = document.getElementById('pdfm-loading');
        if (loading) { loading.style.display = 'flex'; loading.innerHTML = `<div class="spinner spinner-dark spinner-lg"></div><p>Đang tải tài liệu...</p>`; }
    }, 350);
    openIndex = -1;
}

function navigateModal(dir) {
    const next = openIndex + dir;
    if (next >= 0 && next < filtered.length) openModal(next);
}

function updateNavButtons() {
    const prev = document.getElementById('pdfm-prev');
    const next = document.getElementById('pdfm-next');
    if (prev) prev.disabled = openIndex <= 0;
    if (next) next.disabled = openIndex >= filtered.length - 1;
}

/* ── Helpers ───────────────────────────────────────────────── */
function formatDate(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' });
}

function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

function escHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
