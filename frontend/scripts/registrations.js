const adminToken = localStorage.getItem('tugon_admin_token');
if (!adminToken) window.location.href = 'login.html';

async function apiFetch(url) {
    return fetch(url, { headers: { 'Authorization': 'Bearer ' + adminToken } });
}

const selector  = document.getElementById('event-selector');
const container = document.getElementById('participants-container');

async function loadEvents() {
    try {
        const res    = await apiFetch('/api/admin/events');
        const events = await res.json();
        if (!res.ok || !events.length) {
            selector.innerHTML = '<p class="text-muted">No events found.</p>';
            return;
        }
        selector.innerHTML = events.map(e =>
            `<button class="btn-event-pill" data-id="${e.id}">${e.title}</button>`
        ).join('');

        selector.querySelectorAll('.btn-event-pill').forEach(btn => {
            btn.addEventListener('click', () => {
                selector.querySelectorAll('.btn-event-pill').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                loadParticipants(btn.dataset.id, btn.textContent);
            });
        });
    } catch {
        selector.innerHTML = '<p class="text-error">Server unreachable.</p>';
    }
}

async function loadParticipants(eventId, eventName) {
    container.innerHTML = '<p class="text-loading">Loading…</p>';
    try {
        const res  = await apiFetch(`/api/admin/registrations/${eventId}`);
        const list = await res.json();

        let html = `<div class="participants-header">
            <h3><span>${list.length}</span> participant${list.length !== 1 ? 's' : ''} registered for <span>${eventName}</span></h3>
        </div><div class="participants-list">`;

        if (!list.length) {
            html += '<div class="no-selection-msg"><p>No participants registered yet.</p></div>';
        } else {
            list.forEach((s, i) => {
                html += `<div class="participant-card slide-in" style="animation-delay:${i * 0.05}s;">
                    <div class="participant-num">${i + 1}</div>
                    <div class="participant-name">
                        ${s.first_name} ${s.last_name}
                        <small class="participant-meta">${s.student_number} · ${s.college} · ${s.year_level}</small>
                    </div>
                </div>`;
            });
        }
        html += '</div>';
        container.innerHTML = html;
    } catch {
        container.innerHTML = '<p class="text-error">Failed to load participants.</p>';
    }
}

loadEvents();