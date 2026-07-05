// auth.js — auth state helpers shared across all pages
import { supabase } from './config.js';

export async function getUser() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch { return null; }
}

export async function getProfile(userId) {
  try {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (error) throw error;
    return data;
  } catch { return null; }
}

export async function requireAdmin() {
  const user = await getUser();
  if (!user) { window.location.href = 'login.html'; return; }
  const profile = await getProfile(user.id);
  if (!profile || !profile.is_admin) window.location.href = 'index.html';
}

export async function initNavbar() {
  const user = await getUser();
  const loginBtn  = document.getElementById('nav-login-btn');
  const logoutBtn = document.getElementById('nav-logout-btn');
  const adminLink = document.getElementById('nav-admin-link');
  if (user) {
    loginBtn  && (loginBtn.style.display  = 'none');
    logoutBtn && (logoutBtn.style.display = 'inline-flex');
    const profile = await getProfile(user.id);
    if (profile?.is_admin && adminLink) adminLink.style.display = 'inline-flex';
  } else {
    loginBtn  && (loginBtn.style.display  = 'inline-flex');
    logoutBtn && (logoutBtn.style.display = 'none');
    adminLink && (adminLink.style.display = 'none');
  }
}

export function bindLogout() {
  document.getElementById('nav-logout-btn')?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = 'index.html';
  });
}

export function initHamburger() {
  const nav = document.getElementById('navbar');
  const btn = document.getElementById('nav-hamburger');
  if (!nav || !btn) return;
  btn.addEventListener('click', () => {
    nav.classList.toggle('menu-open');
    const links = nav.querySelector('.nav-links');
    if (nav.classList.contains('menu-open') && links) {
      requestAnimationFrame(() => {
        nav.style.setProperty('--_nav-links-h', (links.offsetHeight + 24) + 'px');
      });
    }
  });
  document.addEventListener('click', e => {
    if (!nav.contains(e.target)) nav.classList.remove('menu-open');
  });
}
