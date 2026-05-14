// ─── Toast System ────────────────────────────────────────────────────────────
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
    .toast.error   { border-left-color: #ff4444; }
    .toast.info    { border-left-color: #007a7a; }
    @keyframes toastIn {
        from { opacity: 0; transform: translateX(50px); }
        to   { opacity: 1; transform: translateX(0); }
    }
    @keyframes toastOut {
        from { opacity: 1; transform: translateX(0); }
        to   { opacity: 0; transform: translateX(50px); }
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

// ─── College → Course → Major Cascade ────────────────────────────────────────
const COURSES = {
    'Computer Studies': ['BS in Computer Science', 'BS in Information Technology'],
    'Education':        ['Bachelor in Elementary Education (BEEd)', 'Bachelor in Secondary Education (BSEd)'],
};

const collegeEl = document.getElementById('signup-college');
const courseEl  = document.getElementById('signup-course');
const majorEl   = document.getElementById('signup-major');
const courseRow = document.getElementById('course-row');
const majorRow  = document.getElementById('major-row');

collegeEl.addEventListener('change', function () {
    const opts = COURSES[this.value];
    courseEl.innerHTML = '<option value="">-- Select Course --</option>';
    courseEl.required  = false;
    majorEl.required   = false;
    courseRow.classList.remove('visible');
    majorRow.classList.remove('visible');
    if (opts) {
        opts.forEach(c => {
            const o = document.createElement('option');
            o.value = o.textContent = c;
            courseEl.appendChild(o);
        });
        courseEl.required = true;
        courseRow.classList.add('visible');
    }
});

courseEl.addEventListener('change', function () {
    majorEl.required = false;
    majorRow.classList.remove('visible');
    if (this.value === 'Bachelor in Secondary Education (BSEd)') {
        majorEl.required = true;
        majorRow.classList.add('visible');
    }
});

// Allow only digits and dashes in Student ID
document.getElementById('signup-studentid').addEventListener('input', function () {
    this.value = this.value.replace(/[^0-9-]/g, '');
});

// ─── Validation ───────────────────────────────────────────────────────────────
function getValidationErrors(payload) {
    const errors = [];

    // Name — treat both-empty as a single combined error
    const fnameEmpty = !payload.first_name;
    const lnameEmpty = !payload.last_name;
    if (fnameEmpty && lnameEmpty) {
        errors.push('Please fill in your first name and last name.');
    } else if (fnameEmpty) {
        errors.push('Please fill in your first name.');
    } else if (lnameEmpty) {
        errors.push('Please fill in your last name.');
    }

    // Email — empty vs wrong domain are separate cases
    if (!payload.email) {
        errors.push('Please fill in your email.');
    } else if (!payload.email.toLowerCase().endsWith('@plpasig.edu.ph')) {
        errors.push('Email must end with @plpasig.edu.ph');
    }

    if (!payload.password) {
        errors.push('Please fill in your password.');
    }

    if (!payload.student_id) {
        errors.push('Please fill in your student ID.');
    }

    if (!payload.college) {
        errors.push('Please select a college.');
    }

    if (!payload.year_level) {
        errors.push('Please select a year level.');
    }

    // Course is only required when the selected college has courses
    if (courseEl.required && !payload.course) {
        errors.push('Please select a course.');
    }

    // Major is only required for BSEd
    if (majorEl.required && !payload.major) {
        errors.push('Please select a major.');
    }

    return errors;
}

// ─── Sign-Up Form Submit ──────────────────────────────────────────────────────
const signupForm = document.getElementById('signup-form');
if (signupForm) {
    const submitBtn = signupForm.querySelector('button[type="submit"]');

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const payload = {
            first_name: document.getElementById('signup-fname').value.trim(),
            last_name:  document.getElementById('signup-lname').value.trim(),
            email:      document.getElementById('signup-email').value.trim(),
            password:   document.getElementById('signup-password').value,
            student_id: document.getElementById('signup-studentid').value.trim(),
            college:    document.getElementById('signup-college').value,
            course:     document.getElementById('signup-course').value  || null,
            major:      document.getElementById('signup-major').value   || null,
            year_level: document.getElementById('signup-year').value,
        };

        // ── Validate ──────────────────────────────────────────────────────────
        const errors = getValidationErrors(payload);

        if (errors.length === 1) {
            // Single issue → show its specific message
            showToast(errors[0], 'error');
            return;
        } else if (errors.length > 1) {
            // Multiple issues → show the generic catch-all
            showToast('All required fields must be filled in.', 'error');
            return;
        }

        // ── Submit ────────────────────────────────────────────────────────────
        submitBtn.textContent = 'Creating account…';
        submitBtn.disabled    = true;

        try {
            const res  = await fetch('/api/auth/signup', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) {
                showToast(data.error || 'Sign-up failed. Please try again.', 'error');
                submitBtn.textContent = 'Sign Up →';
                submitBtn.disabled    = false;
                return;
            }
            showToast('Account created! Redirecting to login…', 'success');
            setTimeout(() => { window.location.href = 'login.html'; }, 1800);
        } catch {
            showToast('Could not reach the server. Please make sure it is running.', 'error');
            submitBtn.textContent = 'Sign Up →';
            submitBtn.disabled    = false;
        }
    });
}