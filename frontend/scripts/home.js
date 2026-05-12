document.getElementById('pm-save').addEventListener('click', async () => {
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
    const saveBtn = document.getElementById('pm-save');
    saveBtn.textContent = 'Saving…'; saveBtn.disabled = true;
    try {
        const res  = await apiFetch('/api/auth/profile', { method: 'PUT', body: JSON.stringify(body) });
        const data = await res.json();
        if (res.ok) {
            localStorage.setItem('tugon_token', data.token);
            localStorage.setItem('tugon_student', JSON.stringify(data.student));
            document.getElementById('student-name').textContent     = data.student.name;
            document.getElementById('dropdown-college').textContent = data.student.college;
            document.getElementById('dropdown-year').textContent    = data.student.year_level;
            document.getElementById('profile-modal-overlay').style.display = 'none';
        } else {
            errEl.textContent = data.error || 'Update failed.';
        }
    } catch { errEl.textContent = 'Server unreachable.'; }
    saveBtn.textContent = 'Save Changes'; saveBtn.disabled = false;
});