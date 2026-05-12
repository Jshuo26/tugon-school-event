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