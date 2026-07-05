// auth.js — auth state helpers shared across all pages
import { supabase } from './config.js';

// Returns current session user or null
export async function getUser() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        return user;
    } catch {
        return null;
    }
}

// Returns profile row for the current user or null
export async function getProfile(userId) {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();
        if (error) throw error;
        return data;
    } catch {
        return null;
    }
}

// Redirect to login if not authenticated; redirect to home if not admin
export async function requireAdmin() {
    const user = await getUser();
    if (!user) { window.location.href = 'login.html'; return; }
    const profile = await getProfile(user.id);
    if (!profile || !profile.is_admin) { window.location.href = 'index.html'; }
}

// Redirect to login if not authenticated. Returns the user (or never
// resolves further, since it redirects away).
export async function requireLogin() {
    const user = await getUser();
    if (!user) { window.location.href = 'login.html'; return null; }
    return user;
}

// Initializes navbar auth state: shows/hides login, logout, admin & profile
// links. Also silently credits the once-per-day login point bonus.
export async function initNavbar() {
    const user = await getUser();
    const loginBtn = document.getElementById('nav-login-btn');
    const logoutBtn = document.getElementById('nav-logout-btn');
    const adminLink = document.getElementById('nav-admin-link');
    const profileLink = document.getElementById('nav-profile-link');

    if (user) {
        loginBtn && (loginBtn.style.display = 'none');
        logoutBtn && (logoutBtn.style.display = 'inline-flex');
        profileLink && (profileLink.style.display = 'inline-flex');

        const profile = await getProfile(user.id);
        if (profile?.is_admin && adminLink) {
            adminLink.style.display = 'inline-flex';
        }

        // Fire-and-forget: server-side dedupes to once per calendar day.
        import('./points.js').then(m => m.creditDailyLogin()).catch(() => {});
    } else {
        loginBtn && (loginBtn.style.display = 'inline-flex');
        logoutBtn && (logoutBtn.style.display = 'none');
        adminLink && (adminLink.style.display = 'none');
        profileLink && (profileLink.style.display = 'none');
    }
}

// Attach logout handler (call once after DOM ready)
export function bindLogout() {
    const btn = document.getElementById('nav-logout-btn');
    if (!btn) return;
    btn.addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.href = 'index.html';
    });
}

// Navbar hamburger toggle
export function initHamburger() {
    const nav = document.getElementById('navbar');
    const btn = document.getElementById('nav-hamburger');
    if (!nav || !btn) return;
    btn.addEventListener('click', () => nav.classList.toggle('menu-open'));
    document.addEventListener('click', (e) => {
        if (!nav.contains(e.target)) nav.classList.remove('menu-open');
    });
}
