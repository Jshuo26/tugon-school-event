const token = localStorage.getItem('tugon_token');
const student = JSON.parse(localStorage.getItem('tugon_student') || 'null');
if (!token || !student) {
    window.location.href = 'login.html';
} else {
    const el = document.getElementById('student-name');
    if (el) el.textContent = student.name || 'Student Account';
    const colEl = document.getElementById('dropdown-college');
    if (colEl) colEl.textContent = student.college || '';
    const yrEl = document.getElementById('dropdown-year');
    if (yrEl) yrEl.textContent = student.year_level || '';

    // ── Check if profile was just updated ──────────────────────────────
    if (localStorage.getItem('tugon_profile_updated') === 'true') {
        localStorage.removeItem('tugon_profile_updated');
        // We'll show the toast after a short delay so the page looks settled
        setTimeout(() => {
            showToast('Profile updated successfully!', 'success');
        }, 300);
    }
}

document.getElementById('logout-link').addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('tugon_token');
    localStorage.removeItem('tugon_student');
    window.location.href = 'login.html';
});

async function apiFetch(url, opts = {}) {
    return fetch(url, {
        ...opts,
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json', ...(opts.headers || {}) },
    });
}

const PM_COURSES = {
    'Computer Studies': ['BS in Computer Science', 'BS in Information Technology'],
    'Education':        ['Bachelor in Elementary Education (BEEd)', 'Bachelor in Secondary Education (BSEd)'],
};

function formatTime(t) {
    if (!t) return '';
    const [h, m] = t.split(':');
    let hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12;
    return `${hour}:${m} ${ampm}`;
}

function pmUpdateCourse(college, courseVal) {
    const courseWrap = document.getElementById('pm-course-wrap');
    const majorWrap  = document.getElementById('pm-major-wrap');
    const courseEl   = document.getElementById('pm-course');
    const opts = PM_COURSES[college];
    courseEl.innerHTML = '<option value="">-- Select Course --</option>';
    majorWrap.style.display  = 'none';
    document.getElementById('pm-major').value = '';
    if (opts) {
        opts.forEach(c => {
            const o = document.createElement('option');
            o.value = o.textContent = c;
            courseEl.appendChild(o);
        });
        courseEl.value = courseVal || '';
        courseWrap.style.display = 'block';
        pmUpdateMajor(courseEl.value, '');
    } else {
        courseEl.value = '';
        courseWrap.style.display = 'none';
    }
}

function pmUpdateMajor(courseVal, majorVal) {
    const majorWrap = document.getElementById('pm-major-wrap');
    if (courseVal === 'Bachelor in Secondary Education (BSEd)') {
        majorWrap.style.display = 'block';
        document.getElementById('pm-major').value = majorVal || '';
    } else {
        majorWrap.style.display = 'none';
        document.getElementById('pm-major').value = '';
    }
}

document.getElementById('pm-college').addEventListener('change', function() {
    pmUpdateCourse(this.value, '');
});
document.getElementById('pm-course').addEventListener('change', function() {
    pmUpdateMajor(this.value, '');
});

document.getElementById('edit-profile-link').addEventListener('click', async (e) => {
    e.preventDefault();
    let profileData = null;
    try {
        const res = await apiFetch('/api/auth/profile');
        profileData = await res.json();
    } catch { profileData = student; }
    openProfileModal(profileData);
});

function openProfileModal(s) {
    document.getElementById('profile-modal-overlay').style.display = 'flex';
    document.getElementById('pm-first-name').value  = s.first_name || (s.name || '').split(' ')[0] || '';
    document.getElementById('pm-last-name').value   = s.last_name  || (s.name || '').split(' ').slice(1).join(' ') || '';
    document.getElementById('pm-email').value       = s.email      || '';
    document.getElementById('pm-college').value     = s.college    || '';
    document.getElementById('pm-year-level').value  = s.year_level || '';
    document.getElementById('pm-error').textContent = '';
    pmUpdateCourse(s.college || '', s.course || '');
    pmUpdateMajor(s.course || '', s.major || '');
}

document.getElementById('pm-cancel').addEventListener('click', () => {
    document.getElementById('profile-modal-overlay').style.display = 'none';
});
document.getElementById('profile-modal-overlay').addEventListener('click', function(e) {
    if (e.target === this) this.style.display = 'none';
});

// Toast Notification System
const toastStyles = `
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
    background: var(--dark-card, #1a1a1a);
    color: var(--white, #fff);
    padding: 1rem 1.5rem;
    border-radius: var(--radius-md, 12px);
    border-left: 4px solid var(--teal-main, #007a7a);
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    gap: 12px;
    font-family: var(--font-body, sans-serif);
    font-size: 0.9rem;
    font-weight: 600;
    animation: toast-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
    min-width: 280px;
}
.toast.success { border-left-color: #10b981; }
.toast.error { border-left-color: #ef4444; }
.toast.unregister { border-left-color: #f59e0b; }

@keyframes toast-in {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}
.toast.fade-out {
    animation: toast-out 0.4s ease forwards;
}
@keyframes toast-out {
    to { transform: translateX(20px); opacity: 0; }
}
`;

const styleSheet = document.createElement("style");
styleSheet.innerText = toastStyles;
document.head.appendChild(styleSheet);

function showToast(message, type = 'success') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = '✅';
    if (type === 'error') icon = '❌';
    if (type === 'unregister') icon = '⚠️';

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

// ── Profile Save Logic ───────────────────────────────────────────────────────
const pmSaveBtn = document.getElementById('pm-save');
if (pmSaveBtn) {
    pmSaveBtn.addEventListener('click', async () => {
        const errEl = document.getElementById('pm-error');
        errEl.textContent = '';
        const body = {
            first_name: document.getElementById('pm-first-name').value.trim(),
            last_name:  document.getElementById('pm-last-name').value.trim(),
            email:      document.getElementById('pm-email').value.trim(),
            college:    document.getElementById('pm-college').value,
            course:     document.getElementById('pm-course').value || null,
            major:      document.getElementById('pm-major').value || null,
            year_level: document.getElementById('pm-year-level').value,
        };
        if (!body.first_name || !body.last_name || !body.email || !body.college || !body.year_level) {
            errEl.textContent = 'Please fill all required fields.'; return;
        }
        pmSaveBtn.textContent = 'Saving…'; pmSaveBtn.disabled = true;
        try {
            const res  = await apiFetch('/api/auth/profile', { method: 'PUT', body: JSON.stringify(body) });
            const data = await res.json();
            if (res.ok) {
                localStorage.setItem('tugon_token', data.token);
                localStorage.setItem('tugon_student', JSON.stringify(data.student));
                localStorage.setItem('tugon_profile_updated', 'true');
                document.getElementById('profile-modal-overlay').style.display = 'none';
                // Auto refresh to reflect changes everywhere
                location.reload();
            } else {
                errEl.textContent = data.error || 'Update failed.';
            }
        } catch { errEl.textContent = 'Server unreachable.'; }
        pmSaveBtn.textContent = 'Save Changes'; pmSaveBtn.disabled = false;
    });
}