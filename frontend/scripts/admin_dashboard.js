const adminToken = localStorage.getItem('tugon_admin_token');
if (!adminToken) window.location.href = 'login.html';

const grid = document.getElementById('events-grid');

async function apiFetch(url, opts = {}) {
    return fetch(url, {
        ...opts,
        headers: { 'Authorization': 'Bearer ' + adminToken, 'Content-Type': 'application/json', ...(opts.headers || {}) },
    });
}

async function loadEvents(silent = false) {
    try {
        const res    = await apiFetch('/api/admin/events');
        const events = await res.json();
        if (!res.ok) {
            if (!silent) grid.innerHTML = '<p class="text-error">Failed to load events.</p>';
            return;
        }
        renderEvents(events);
    } catch {
        if (!silent) grid.innerHTML = '<p class="text-error">Server unreachable.</p>';
    }
}

function seatsLabel(e) {
    if (!e.capacity) return `${e.registration_count || 0} registered`;
    return `${e.registration_count || 0}/${e.capacity} seats`;
}

function featuredBadgeLabel(targetColleges, targetYears) {
    const isAllColleges = targetColleges.includes('All');
    const isAllYears    = targetYears.includes('All');
    if (isAllColleges && isAllYears) return 'Featured (All Colleges · All Years)';
    const colLabel  = isAllColleges ? 'All Colleges' : targetColleges.join(', ');
    const yearLabel = isAllYears    ? 'All Years'    : targetYears.join(', ');
    return `Featured (${colLabel} · ${yearLabel})`;
}

function renderEvents(events) {
    if (!events.length) {
        grid.innerHTML = '<p class="text-muted" style="padding:2rem;">No events yet. <a href="add_event.html">Add one →</a></p>';
        return;
    }
    grid.innerHTML = events.map(e => {
        const dateStr    = e.date ? new Date(e.date).toLocaleDateString('en-PH', { year:'numeric', month:'short', day:'numeric' }) : '';
        const featured   = e.is_featured;
        const seats      = seatsLabel(e);
        const full       = e.capacity && (e.registration_count || 0) >= e.capacity;
        const badgeLabel = featured ? featuredBadgeLabel(e.target_colleges, e.target_years) : '';
        return `
        <div class="event-card ${featured ? 'featured' : ''}" data-id="${e.id}">
            <div class="event-info">
                <h3>${e.title}${featured ? ` <span class="badge-featured">${badgeLabel}</span>` : ''}</h3>
                <div class="event-meta">
                    <span>📅 ${dateStr}</span>
                    ${e.location ? `<span>📍 ${e.location}</span>` : ''}
                    ${e.category ? `<span> ${e.category}</span>` : ''}
                    <span> ${seats}${full ? ' <span class="seats-full">(Full)</span>' : ''}</span>
                </div>
            </div>
            <div class="event-actions">
                ${featured
                    ? `<button class="btn-dash btn-pin active" onclick="unpin(${e.id})">📌 Unpin</button>`
                    : `<button class="btn-dash btn-pin" onclick="pinEvent(${e.id})">📍 Pin as Featured</button>`}
                <button class="btn-dash btn-edit" onclick="editEvent(${e.id})"> Edit</button>
                <button class="btn-dash btn-delete" onclick="deleteEvent(${e.id}, this)"> Delete</button>
            </div>
        </div>`;
    }).join('');
}

function editEvent(id) {
    window.location.href = `edit_event.html?id=${id}`;
}

async function unpin(id) {
    const res = await apiFetch(`/api/admin/events/${id}/unpin`, { method: 'PUT' });
    if (res.ok) {
        showAdminToast('Event unpinned.');
        loadEvents(true);
    } else {
        showAdminToast('Failed to unpin.', 'error');
    }
}

async function pinEvent(id) {
    const res  = await apiFetch(`/api/admin/events/${id}/pin`, { method: 'PUT' });
    const data = await res.json();
    if (res.ok) {
        showAdminToast('Event pinned as Featured!');
        loadEvents(true);
    } else {
        showAdminToast(data.error || 'Failed to pin.', 'error');
    }
}

async function deleteEvent(id, btn) {
    if (!confirm('Delete this event? This cannot be undone.')) return;
    const card = btn.closest('.event-card');
    card.style.opacity    = '0';
    card.style.transform  = 'translateX(20px)';
    card.style.transition = 'all 0.3s ease';
    const res = await apiFetch(`/api/admin/events/${id}`, { method: 'DELETE' });
    if (res.ok) {
        showAdminToast('Event deleted.');
        setTimeout(() => card.remove(), 300);
    }
    else {
        card.style.opacity = '1';
        card.style.transform = '';
        showAdminToast('Failed to delete.', 'error');
    }
}

loadEvents();
setInterval(() => loadEvents(true), 10000);