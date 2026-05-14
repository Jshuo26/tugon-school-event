const catColors = {
    Academic: 'cat-academic',
    Cultural:  'cat-cultural',
    Sports:    'cat-sports',
    Social:    'cat-social',
    Tech:      'cat-tech',
    Others:    'cat-others',
};

function buildFeaturedSlide(e) {
    const dateStr = e.date ? new Date(e.date).toLocaleDateString('en-PH', { year:'numeric', month:'long', day:'numeric' }) : '';
    const timeStr = [e.start_time, e.end_time].filter(Boolean).join(' – ');
    const full    = e.capacity && (e.registration_count || 0) >= e.capacity;
    let btnLabel, btnClass = '';
    if (e.registered) {
        btnLabel = 'Unregister';
    } else if (full) {
        btnLabel  = 'Full';
        btnClass  = 'btn-full-disabled';
    } else {
        btnLabel = 'Register Now';
    }
    return `
    <p class="section-label">📌 Featured Event</p>
    <h1>${e.title}</h1>
    <p class="desc">${e.description || ''}</p>
    <div class="event-meta-chips">
        ${dateStr ? `<span class="meta-chip">📅 ${dateStr}</span>` : ''}
        ${timeStr ? `<span class="meta-chip">🕗 ${timeStr}</span>`  : ''}
        ${e.location ? `<span class="meta-chip">📍 ${e.location}</span>` : ''}
        ${e.category ? `<span class="meta-chip">🎓 ${e.category}</span>` : ''}
        ${e.capacity ? `<span class="meta-chip">👥 ${e.registration_count||0}/${e.capacity} Seats</span>` : ''}
        <button class="btn btn-primary btn-sm register-btn ${btnClass}"
        data-id="${e.id}" data-registered="${e.registered ? '1' : '0'}" ${full && !e.registered ? 'disabled' : ''}>
        ${btnLabel}
        </button>
    </div>`;
}

async function loadFeatured(silent = false) {
    const container = document.getElementById('featured-container');
    if (!container) return;
    if (!silent) container.innerHTML = '<p class="loading-text">Loading featured event…</p>';
    try {
        const res    = await apiFetch('/api/events/featured');
        const events = await res.json();
        if (!res.ok || !events.length) {
            container.innerHTML = '<p class="section-label featured-empty">No featured event for your college or year level.</p>';
            return;
        }
        const featured = events[0];
        container.innerHTML = buildFeaturedSlide(featured);
        container.querySelector('.register-btn').addEventListener('click', function() {
            handleRegister(featured.id, this);
        });
    } catch { container.innerHTML = ''; }
}

async function loadAllEvents(silent = false) {
    const grid = document.getElementById('events-grid');
    if (!grid) return;
    if (!silent) grid.innerHTML = '<p class="events-loading">Loading events…</p>';
    try {
        const res    = await apiFetch('/api/events');
        const events = await res.json();
        if (!res.ok) { grid.innerHTML = '<p class="events-error">Failed to load events.</p>'; return; }
        if (!events.length) { grid.innerHTML = '<p class="events-empty">No events available for your college/year level yet.</p>'; return; }

        grid.innerHTML = events.map(e => {
            const catClass = catColors[e.category] || catColors.Others;
            const cardImgClass = e.image_url ? `card-img ${catClass} card-img-cover` : `card-img ${catClass}`;
            const cardImgStyle = e.image_url ? `background-image:url('${e.image_url}');` : '';
            const full = e.capacity && (e.registration_count || 0) >= e.capacity;
            let actionHtml;
            if (full && !e.registered) {
                actionHtml = `
                <button class="btn btn-secondary btn-sm btn-full-disabled" disabled>Full</button>
                <a href="schedule.html" class="btn btn-secondary btn-sm btn-details">Details</a>`;
            } else {
                const btnLabel = e.registered ? 'Unregister' : 'Register';
                actionHtml = `
                <button class="btn btn-secondary btn-sm register-btn"
                data-id="${e.id}" data-registered="${e.registered ? '1' : '0'}">
                ${btnLabel}
                </button>
                <a href="schedule.html" class="btn btn-secondary btn-sm btn-details">Details</a>`;
            }
            return `
            <div class="event-card">
                <div class="${cardImgClass}" ${cardImgStyle ? `style="${cardImgStyle}"` : ''}>
                <span class="card-badge">${e.category || 'Event'}</span>
                </div>
                <div class="card-body">
                <h3>${e.title}</h3>
                <p>${e.description ? e.description.substring(0, 90) + (e.description.length > 90 ? '…' : '') : ''}</p>
                <div class="card-footer">
                    ${actionHtml}
                </div>
                </div>
            </div>`;
        }).join('');

        grid.querySelectorAll('.register-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                handleRegister(this.dataset.id, this);
            });
        });
    } catch {
        grid.innerHTML = '<p class="events-error">Server unreachable.</p>';
    }
}

async function handleRegister(id, btn) {
    if (btn.dataset.registered === '1') {
        btn.textContent = 'Unregistering…';
        btn.disabled    = true;
        try {
            const res = await apiFetch(`/api/events/${id}/register`, { method: 'DELETE' });
            if (res.ok) {
                btn.textContent        = 'Register Now';
                btn.dataset.registered = '0';
                btn.disabled           = false;
                btn.classList.remove('btn-full-disabled');
                showToast('Successfully unregistered from event.', 'unregister');
                loadFeatured(true);
                loadAllEvents(true);
            } else {
                const data = await res.json();
                showToast(data.error || 'Failed to unregister.', 'error');
                btn.textContent = 'Unregister';
                btn.disabled    = false;
            }
        } catch {
            showToast('Server unreachable.', 'error');
            btn.textContent = 'Unregister';
            btn.disabled    = false;
        }
        return;
    }
    btn.textContent = 'Registering…';
    btn.disabled    = true;
    try {
        const res  = await apiFetch(`/api/events/${id}/register`, { method: 'POST' });
        const data = await res.json();
        if (res.ok) {
            btn.textContent        = 'Unregister';
            btn.dataset.registered = '1';
            btn.disabled           = false;
            showToast('Successfully registered for event!');
        } else if (res.status === 409 && data.error && data.error.includes('already registered')) {
            btn.textContent        = 'Unregister';
            btn.dataset.registered = '1';
            btn.disabled           = false;
        } else {
            showToast(data.error || 'Registration failed.', 'error');
            btn.textContent = 'Register Now';
            btn.disabled    = false;
        }
    } catch {
        showToast('Server unreachable.', 'error');
        btn.textContent = 'Register Now';
        btn.disabled    = false;
    }
}

loadFeatured();
loadAllEvents();

setInterval(() => {
    loadFeatured(true);
    loadAllEvents(true);
}, 10000);

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
            document.getElementById('student-name').textContent = data.student.name;
            document.getElementById('dropdown-college').textContent = data.student.college;
            document.getElementById('dropdown-year').textContent   = data.student.year_level;
            document.getElementById('profile-modal-overlay').style.display = 'none';
            loadFeatured(true); loadAllEvents(true);
        } else {
            errEl.textContent = data.error || 'Update failed.';
        }
    } catch { errEl.textContent = 'Server unreachable.'; }
    saveBtn.textContent = 'Save Changes'; saveBtn.disabled = false;
});