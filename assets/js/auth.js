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

// Initializes navbar auth state: shows/hides login, logout, admin link
export async function initNavbar() {
  const user = await getUser();
  const loginBtn  = document.getElementById('nav-login-btn');
  const logoutBtn = document.getElementById('nav-logout-btn');
  const adminLink = document.getElementById('nav-admin-link');

  if (user) {
    loginBtn  && (loginBtn.style.display  = 'none');
    logoutBtn && (logoutBtn.style.display = 'inline-flex');

    const profile = await getProfile(user.id);
    if (profile?.is_admin && adminLink) {
      adminLink.style.display = 'inline-flex';
    }
  } else {
    loginBtn  && (loginBtn.style.display  = 'inline-flex');
    logoutBtn && (logoutBtn.style.display = 'none');
    adminLink && (adminLink.style.display = 'none');
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
