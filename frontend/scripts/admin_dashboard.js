const adminToken = localStorage.getItem('tugon_admin_token');
if (!adminToken) window.location.href = 'login.html';

const grid = document.getElementById('events-grid');
let currentTab = 'All';
let currentYear = 'All';

const yearFilters = document.getElementById('year-filters');

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTab = btn.dataset.college;
        currentYear = 'All';
        document.querySelectorAll('.year-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('.year-btn[data-year="All"]').classList.add('active');
        yearFilters.style.display = 'flex';
        loadEvents();
    });
});

document.querySelectorAll('.year-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.year-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentYear = btn.dataset.year;
        loadEvents();
    });
});

function getActiveScope() {
    if (currentTab === 'All' && currentYear === 'All') return 'All';
    if (currentYear === 'All') return currentTab;
    return `${currentTab}:${currentYear}`;
}

async function apiFetch(url, opts = {}) {
    return fetch(url, {
        ...opts,
        headers: {
             'Authorization': 'Bearer ' + adminToken, 'Content-Type': 'application/json', 
             ...(opts.headers || {}) 
            },
    });
}

async function loadEvents(silent = false) {
    try {
        const res = await apiFetch('/api/admin/events');
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
    return `Featured (${audienceLabel(targetColleges, targetYears)})`;
}

function audienceLabel(targetColleges, targetYears) {
    const isAllColleges = targetColleges.includes('All');
    const isAllYears = targetYears.includes('All');
    const colLabel = isAllColleges ? 'All Colleges' : targetColleges.join(', ');
    const yearLabel = isAllYears ? 'All Years' : targetYears.join(', ');
    return `${colLabel} • ${yearLabel}`;
}

function renderEvents(events) {
    const filtered = events.filter(e => {
        const colMatch = (currentTab === 'All')
            ? e.target_colleges.includes('All')
            : e.target_colleges.includes(currentTab);
        
        if (!colMatch) return false;

        if (currentYear === 'All') {
            return e.target_years.includes('All');
        } else {
            return e.target_years.includes(currentYear);
        }
    });

    const activeScope = getActiveScope();

    if (!filtered.length) {
        grid.innerHTML = `<p class="text-muted" style="padding:2rem;">No events for <strong>${activeScope.replace(':', ' - ')}</strong> yet. <a href="add_event.html">Add one</a></p>`;
        return;
    }

    grid.innerHTML = filtered.map(e => {
        const dateStr    = e.date ? new Date(e.date).toLocaleDateString('en-PH', { year:'numeric', month:'short', day:'numeric' }) : '';
        const isPinnedHere = e.is_featured && e.featured_scope === activeScope;
        const seats      = seatsLabel(e);
        const full       = e.capacity && (e.registration_count || 0) >= e.capacity;
        const badgeLabel = e.is_featured ? featuredBadgeLabel(e.target_colleges, e.target_years) : '';
        const audience   = audienceLabel(e.target_colleges, e.target_years);
        return `

        <div class="event-card ${isPinnedHere ? 'featured' : ''}" data-id="${e.id}">
            <div class="event-info">
                <h3>
                    ${e.title}
                    ${e.is_featured ? ` <span class="badge-featured" title="Pinned for: ${e.featured_scope}">${badgeLabel}</span>` : ''}
                </h3>
                <div class="event-meta">
                    <span>${dateStr}</span>
                    ${e.location ? `<span>${e.location}</span>` : ''}
                    ${e.category ? `<span>${e.category}</span>` : ''}
                    <span> ${seats}${full ? ' <span class="seats-full">(Full)</span>' : ''}</span>
                    <span class="audience-info" style="display:block; width:100%; margin-top:0.4rem; color:rgba(255,255,255,0.45); font-size:0.75rem;">
                        Targets: ${audience}
                    </span>
                </div>
            </div>
            <div class="event-actions">
                ${isPinnedHere
                    ? `<button class="btn-dash btn-pin active" onclick="unpin(${e.id}, '${e.title.replace(/'/g, "\\'")}')">Unpin</button>`
                    : `<button class="btn-dash btn-pin" onclick="pinEvent(${e.id})">Pin Event</button>`}
                <button class="btn-dash btn-edit" onclick="editEvent(${e.id})"> Edit</button>
                <button class="btn-dash btn-delete" onclick="deleteEvent(${e.id}, '${e.title.replace(/'/g, "\\'")}', this)"> Delete</button>
            </div>
        </div>`;
    }).join('');
}

function editEvent(id) {
    window.location.href = `edit_event.html?id=${id}`;
}

function showAdminConfirm({ title, message, confirmLabel = 'Confirm', confirmClass = '', onConfirm }) {
    const existing = document.getElementById('admin-confirm-modal');
    if (existing) existing.remove();
    const overlay = document.createElement('div');
    overlay.id = 'admin-confirm-modal';
    overlay.className = 'admin-confirm-overlay';
    overlay.innerHTML = `
        <div class="admin-confirm-box">
            <div class="admin-confirm-icon">${confirmClass === 'danger' ? '!!!' : ''}</div>
            <h3 class="admin-confirm-title">${title}</h3>
            <p class="admin-confirm-message">${message}</p>
            <div class="admin-confirm-actions">
                <button class="admin-confirm-btn cancel" id="admin-confirm-cancel">Cancel</button>
                <button class="admin-confirm-btn confirm ${confirmClass}" id="admin-confirm-ok">${confirmLabel}</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    requestAnimationFrame(() => overlay.classList.add('visible'));

    function close() {
        overlay.classList.remove('visible');
        setTimeout(() => overlay.remove(), 250);
    }

    document.getElementById('admin-confirm-cancel').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.getElementById('admin-confirm-ok').addEventListener('click', () => {
        close();
        onConfirm();
    });
}

async function unpin(id, title) {
    const scope = getActiveScope();
    const res = await apiFetch(`/api/admin/events/${id}/unpin?scope=${encodeURIComponent(scope)}`, { method: 'PUT' });
    const data = await res.json();
    if (res.ok) {
        showAdminToast(`Event unpinned from ${scope.replace(':', ' - ')}.`, 'info');
        loadEvents();
    } else {
        showAdminToast(data.error || 'Failed to unpin.', 'error');
    }
}

async function pinEvent(id) {
    const scope = getActiveScope();
    const res = await apiFetch(`/api/admin/events/${id}/pin?scope=${encodeURIComponent(scope)}`, { method: 'PUT' });
    const data = await res.json();
    if (res.ok) {
        showAdminToast(`Pinned as Featured for ${scope.replace(':', ' - ')}!`, 'success');
        loadEvents();
    } else {
        showAdminToast(data.error || 'Failed to pin.', 'error');
    }
}

async function deleteEvent(id, title, btn) {
    showAdminConfirm({
        title: 'Delete Event?',
        message: `This will permanently delete <strong>${title}</strong> and all its registrations.`,
        confirmLabel: 'Continue',
        confirmClass: 'danger',
        onConfirm: () => {
            showAdminConfirm({
                title: 'Are you sure?',
                message: `You are about to permanently delete:<br><span class="confirm-event-name">"${title}"</span><br><br>This cannot be undone.`,
                confirmLabel: 'Yes, Delete',
                confirmClass: 'danger',
                onConfirm: async () => {
                    const card = btn.closest('.event-card');
                    card.style.opacity = '0';
                    card.style.transform  = 'translateX(20px)';
                    card.style.transition = 'all 0.3s ease';
                    const res = await apiFetch(`/api/admin/events/${id}`, { method: 'DELETE' });
                    if (res.ok) {
                        showAdminToast(`"${title}" deleted.`, 'error');
                        setTimeout(() => card.remove(), 300);
                    } else {
                        card.style.opacity = '1';
                        card.style.transform = '';
                        showAdminToast('Failed to delete.', 'error');
                    }
                }
            });
        }
    });
}

loadEvents();
setInterval(() => loadEvents(true), 10000);