(function () {
    const styles = `
    .toast-container {
        position: fixed;
        bottom: 30px;
        right: 30px;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 10px;
    }
    .toast {
        background: #1a1f1f;
        color: #ffffff;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        border-left: 4px solid #007a7a;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        font-family: 'DM Sans', sans-serif;
        font-size: 0.9rem;
        font-weight: 500;
        min-width: 280px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        animation: toastIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }
    .toast.success { border-left-color: #2dd4bf; }
    .toast.error { border-left-color: #ff4444; }
    .toast.info { border-left-color: #007a7a; }
    @keyframes toastIn {
        from { opacity: 0; transform: translateX(50px); }
        to { opacity: 1; transform: translateX(0); }
    }
    @keyframes toastOut {
        from { opacity: 1; transform: translateX(0); }
        to { opacity: 0; transform: translateX(50px); }
    }
    `;
    const sheet = document.createElement('style');
    sheet.innerText = styles;
    document.head.appendChild(sheet);

    const container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);

    window.showToast = function (message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const icon = type === 'error' ? '❌' : type === 'info' ? 'ℹ️' : '✅';
        toast.innerHTML = `<span>${icon} &nbsp; ${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'toastOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    };
})();

const loginForm = document.getElementById('login-form');
if (loginForm) {
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        submitBtn.textContent = 'Logging in…';
        submitBtn.disabled = true;
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();
            if (!res.ok) {
                showToast(data.error || 'Wrong email or password.', 'error');
                submitBtn.textContent = 'Log In →';
                submitBtn.disabled = false;
                return;
            }
            localStorage.setItem('tugon_token',   data.token);
            localStorage.setItem('tugon_student',  JSON.stringify(data.student));
            window.location.href = 'home.html';
        } catch {
            showToast('Could not reach the server. Please make sure it is running.', 'error');
            submitBtn.textContent = 'Log In →';
            submitBtn.disabled = false;
        }
    });
}

(function () {
    let clickCount = 0, clickTimer = null;
    const trigger = document.getElementById('admin-trigger');
    const modal = document.getElementById('admin-modal');
    const closeBtn = document.getElementById('close-admin-modal');

    if (trigger) {
        trigger.addEventListener('click', () => {
            clickCount++;
            clearTimeout(clickTimer);
            clickTimer = setTimeout(() => { clickCount = 0; }, 2000);
            if (clickCount === 5) {
                clickCount = 0;
                modal.classList.add('show');
                document.body.style.overflow = 'hidden';
            }
        });
    }
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.classList.remove('show');
            document.body.style.overflow = '';
        });
    }

    const adminForm = document.getElementById('admin-login-form');
    if (adminForm) {
        const adminBtn = adminForm.querySelector('button[type="submit"]');
        adminForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('admin-username').value.trim();
            const password = document.getElementById('admin-password').value;
            adminBtn.textContent = 'Signing in…';
            adminBtn.disabled = true;
            try {
                const res = await fetch('/api/admin/login', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password }),
                });
                const data = await res.json();
                if (!res.ok) {
                    showToast(data.error || 'Invalid administrator credentials.', 'error');
                    adminBtn.textContent = 'Sign In as Admin →';
                    adminBtn.disabled = false;
                    return;
                }
                localStorage.setItem('tugon_admin_token', data.token);
                localStorage.setItem('tugon_admin', JSON.stringify(data.admin));
                window.location.href = 'admin_dashboard.html';
            } catch {
                showToast('Could not reach the server.', 'error');
                adminBtn.textContent = 'Sign In as Admin →';
                adminBtn.disabled = false;
            }
        });
    }
})();