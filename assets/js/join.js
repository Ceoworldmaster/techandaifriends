// join.js — Registration form with validation and toast feedback
import { initNavbar, bindLogout, initHamburger } from './auth.js';
import { supabase } from './config.js';

(async () => {
    await initNavbar();
    bindLogout();
    initHamburger();
    bindForm();
})();

function bindForm() {
    const form = document.getElementById('join-form');
    const submit = document.getElementById('join-submit');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!validate()) return;

        const fullname = document.getElementById('fullname').value.trim();
        const email = document.getElementById('email').value.trim();
        const classname = document.getElementById('classname').value.trim();
        const reason = document.getElementById('reason').value.trim();

        setLoading(submit, true);

        try {
            const { error } = await supabase.from('registrations').insert({
                full_name: fullname,
                email,
                class_name: classname,
                reason,
                status: 'pending',
            });

            if (error) throw error;

            showToast('Đăng ký thành công! Chúng tôi sẽ liên hệ bạn sớm.', 'success');
            form.reset();
            clearErrors();
        } catch (err) {
            console.error('Join error:', err);
            showToast(err.message || 'Có lỗi xảy ra. Vui lòng thử lại.', 'error');
        } finally {
            setLoading(submit, false);
        }
    });
}

function validate() {
    let valid = true;
    clearErrors();

    const fullname = document.getElementById('fullname').value.trim();
    const email = document.getElementById('email').value.trim();
    const classname = document.getElementById('classname').value.trim();
    const reason = document.getElementById('reason').value.trim();

    if (!fullname || fullname.length < 2) {
        showError('err-fullname', 'fullname');
        valid = false;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showError('err-email', 'email');
        valid = false;
    }
    if (!classname) {
        showError('err-classname', 'classname');
        valid = false;
    }
    if (!reason || reason.length < 20) {
        showError('err-reason', 'reason');
        valid = false;
    }
    return valid;
}

function showError(errId, inputId) {
    document.getElementById(errId)?.classList.add('show');
    document.getElementById(inputId)?.classList.add('error');
}

function clearErrors() {
    document.querySelectorAll('.form-error').forEach(el => el.classList.remove('show'));
    document.querySelectorAll('.form-input, .form-textarea').forEach(el => el.classList.remove('error'));
}

function setLoading(btn, loading) {
    if (loading) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> Đang gửi...';
    } else {
        btn.disabled = false;
        btn.innerHTML = '🚀 Gửi đơn đăng ký';
    }
}

function showToast(msg, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const icons = { success: '✅', error: '❌', warning: '⚠' };
    const toast = document.createElement('div');
    toast.className = `toast ${type !== 'success' ? type : ''}`;
    toast.innerHTML = `<span class="toast-icon">${icons[type] || '💬'}</span><span class="toast-msg">${msg}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4200);
}
