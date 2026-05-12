const tbody = document.getElementById('schedule-tbody');
let allRows = [];
let activeFilter = 'all';

function fmtDate(d) {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-PH', { year:'numeric', month:'long', day:'numeric' });
}
function fmtTime(t) { return t ? t.slice(0, 5) : ''; }

function isFull(e) {
    return e.capacity && e.registration_count >= e.capacity;
}

function seatsLabel(e) {
    if (!e.capacity) return '—';
    return `${e.registration_count}/${e.capacity}`;
}

async function loadSchedule(silent = false) {
    try {
        const res    = await apiFetch('/api/events');
        const events = await res.json();
        if (!res.ok) {
            if (!silent) tbody.innerHTML = '<tr><td colspan="8" style="color:#fca5a5;">Failed to load.</td></tr>';
            return;
        }
        if (!events.length && !silent) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:rgba(255,255,255,0.45);padding:2rem;">No events for your college/year yet.</td></tr>';
            return;
        }

        allRows = events;
        const filtered = activeFilter === 'all' ? allRows : allRows.filter(e => (e.category || '').toLowerCase() === activeFilter);
        renderRows(filtered);
    } catch {
        if (!silent) tbody.innerHTML = '<tr><td colspan="8" style="color:#fca5a5;">Server unreachable.</td></tr>';
    }
}

function renderRows(events) {
    if (!events.length) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:rgba(255,255,255,0.45);padding:1.5rem;">No events match this filter.</td></tr>';
        return;
    }
    tbody.innerHTML = events.map(e => {
        const cat      = (e.category || 'others').toLowerCase();
        const timeStr  = [fmtTime(e.start_time), fmtTime(e.end_time)].filter(Boolean).join(' – ');
        const full     = isFull(e);
        const seats    = seatsLabel(e);

        let statusCell, actionCell;
        if (full && !e.registered) {
            statusCell = `<span class="status-dot" style="background:#ef4444;"></span> Full`;
            actionCell = `<button class="btn-register" disabled style="opacity:.55;cursor:not-allowed;background:rgba(239,68,68,0.2);color:#fca5a5;border-color:rgba(239,68,68,0.4);">Full</button>
                        <div style="font-size:0.72rem;color:#fca5a5;margin-top:0.3rem;line-height:1.3;">This event is already at full capacity.</div>`;
        } else if (e.registered) {
            statusCell = `<span class="status-dot" style="${full ? 'background:#ef4444;' : ''}"></span> ${full ? 'Full' : 'Open'}`;
            actionCell = `<button class="btn-register register-btn" data-id="${e.id}" data-registered="1" style="opacity:.7;">Registered — Click to Unregister</button>`;
        } else {
            statusCell = `<span class="status-dot"></span> Open`;
            actionCell = `<button class="btn-register register-btn" data-id="${e.id}" data-registered="0">Register</button>`;
        }

        return `<tr data-category="${cat}" data-id="${e.id}">
            <td>${fmtDate(e.date)}</td>
            <td class="time-cell">${timeStr}</td>
            <td class="event-name">${e.title}</td>
            <td>${e.location || '—'}</td>
            <td><span class="category-badge ${cat}">${e.category || 'Others'}</span></td>
            <td style="white-space:nowrap;font-size:0.85rem;">${seats}</td>
            <td class="status-cell">${statusCell}</td>
            <td>${actionCell}</td>
        </tr>`;
    }).join('');

    tbody.querySelectorAll('.register-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            if (this.dataset.registered === '1') {
                if (!confirm('Unregister from this event?')) return;
                this.textContent = '…';
                this.disabled    = true;
                try {
                    const res  = await apiFetch(`/api/events/${this.dataset.id}/register`, { method: 'DELETE' });
                    const data = await res.json();
                    if (res.ok) {
                        loadSchedule(true);
                    } else {
                        alert(data.error || 'Failed to unregister.');
                        this.textContent = 'Registered — Click to Unregister';
                        this.disabled    = false;
                    }
                } catch {
                    alert('Server unreachable.');
                    this.textContent = 'Registered — Click to Unregister';
                    this.disabled    = false;
                }
                return;
            }
            this.textContent = '…';
            this.disabled    = true;
            try {
                const res  = await apiFetch(`/api/events/${this.dataset.id}/register`, { method: 'POST' });
                const data = await res.json();
                if (res.ok) {
                    this.textContent = 'Registered — Click to Unregister';
                    this.dataset.registered = '1';
                    this.style.opacity = '0.7';
                    this.classList.remove('register-btn');
                    loadSchedule(true);
                } else if (res.status === 409 && data.error && data.error.includes('full capacity')) {
                    const td = this.closest('td');
                    if (td) td.innerHTML = `<button class="btn-register" disabled style="opacity:.55;cursor:not-allowed;background:rgba(239,68,68,0.2);color:#fca5a5;border-color:rgba(239,68,68,0.4);">Full</button>
                    <div style="font-size:0.72rem;color:#fca5a5;margin-top:0.3rem;line-height:1.3;">This event is already at full capacity.</div>`;
                    loadSchedule(true);
                } else {
                    alert(data.error || 'Registration failed.');
                    this.textContent = 'Register';
                    this.disabled    = false;
                }
            } catch {
                alert('Server unreachable.');
                this.textContent = 'Register';
                this.disabled    = false;
            }
        });
    });
}

document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeFilter = btn.getAttribute('data-category');
        const filtered = activeFilter === 'all' ? allRows : allRows.filter(e => (e.category || '').toLowerCase() === activeFilter);
        renderRows(filtered);
    });
});

loadSchedule();

setInterval(() => loadSchedule(true), 10000);

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
            loadSchedule(true);
        } else {
            errEl.textContent = data.error || 'Update failed.';
        }
    } catch { errEl.textContent = 'Server unreachable.'; }
    saveBtn.textContent = 'Save Changes'; saveBtn.disabled = false;
});