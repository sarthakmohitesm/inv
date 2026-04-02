// =============================================
// Auth Page JavaScript (Login & Register)
// =============================================

// Check if already logged in
(async function checkAuth() {
    try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.success && data.user) {
            switch (data.user.role) {
                case 'retailer': window.location.href = '/retailer-dashboard.html'; break;
                case 'inventory': window.location.href = '/inventory-dashboard.html'; break;
                case 'warehouse': window.location.href = '/warehouse-dashboard.html'; break;
            }
        }
    } catch (e) { /* Not logged in */ }
})();

// Switch between login/register tabs
function switchAuthTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));

    if (tab === 'login') {
        document.getElementById('login-tab').classList.add('active');
        document.getElementById('login-form').classList.add('active');
    } else {
        document.getElementById('register-tab').classList.add('active');
        document.getElementById('register-form').classList.add('active');
    }
}

// Handle Login
async function handleLogin(e) {
    e.preventDefault();
    const btn = document.getElementById('login-btn');
    btn.disabled = true;
    btn.textContent = 'Signing in...';

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: document.getElementById('login-email').value,
                password: document.getElementById('login-password').value
            })
        });

        const data = await res.json();

        if (data.success) {
            showToast('success', data.message);
            setTimeout(() => {
                window.location.href = data.redirect;
            }, 500);
        } else {
            showToast('error', data.message);
            btn.disabled = false;
            btn.textContent = 'Sign In →';
        }
    } catch (error) {
        showToast('error', 'Network error. Please try again.');
        btn.disabled = false;
        btn.textContent = 'Sign In →';
    }
}

// Handle Register
async function handleRegister(e) {
    e.preventDefault();
    const btn = document.getElementById('register-btn');
    btn.disabled = true;
    btn.textContent = 'Creating account...';

    const role = document.querySelector('input[name="role"]:checked');
    if (!role) {
        showToast('error', 'Please select a role');
        btn.disabled = false;
        btn.textContent = 'Create Account →';
        return;
    }

    try {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                full_name: document.getElementById('reg-name').value,
                email: document.getElementById('reg-email').value,
                password: document.getElementById('reg-password').value,
                phone: document.getElementById('reg-phone').value,
                role: role.value
            })
        });

        const data = await res.json();

        if (data.success) {
            showToast('success', data.message);
            setTimeout(() => switchAuthTab('login'), 1000);
            document.getElementById('register-form').reset();
        } else {
            showToast('error', data.message);
        }
    } catch (error) {
        showToast('error', 'Network error. Please try again.');
    }

    btn.disabled = false;
    btn.textContent = 'Create Account →';
}

// Toast notification
function showToast(type, message) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
    toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span> ${message}`;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}
