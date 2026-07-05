// points.js — thin wrapper around the award_points() RPC.
// All point amounts are decided server-side (see migration
// 20260705100000_...sql) — the client can never choose how many points
// an action is worth, it can only report WHICH action happened.
import { supabase } from './config.js';

/**
 * Ask the server to award points for an action. Silently does nothing if
 * not logged in, already credited, or rate-limited — callers don't need
 * to check anything.
 * @param {'daily_login'|'read_activity'|'join_event'|'comment'} action
 * @param {string|null} refId
 */
export async function awardPoints(action, refId = null) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return 0;
        const { data, error } = await supabase.rpc('award_points', {
            p_action: action,
            p_ref_id: refId,
        });
        if (error) { console.warn('award_points error:', error.message); return 0; }
        if (data > 0) showPointsToast(data);
        return data || 0;
    } catch (err) {
        console.warn('awardPoints failed:', err);
        return 0;
    }
}

// Call once per page load (after initNavbar) to credit the daily
// check-in. Deduped server-side so it's safe to call on every page.
export async function creditDailyLogin() {
    return awardPoints('daily_login');
}

function showPointsToast(amount) {
    let el = document.getElementById('points-toast');
    if (!el) {
        el = document.createElement('div');
        el.id = 'points-toast';
        el.className = 'points-toast';
        document.body.appendChild(el);
    }
    el.textContent = `+${amount} điểm 🎉`;
    el.classList.remove('show');
    // restart animation
    void el.offsetWidth;
    el.classList.add('show');
    clearTimeout(el._hideTimer);
    el._hideTimer = setTimeout(() => el.classList.remove('show'), 2600);
}
