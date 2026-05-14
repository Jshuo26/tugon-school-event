const adminToken = localStorage.getItem('tugon_admin_token');
if (!adminToken) 
    window.location.href = 'login.html';

async function apiFetch(url) {
    return fetch(url, { headers: { 'Authorization': 'Bearer ' + adminToken } });
}

const selector = document.getElementById('event-selector');
const container = document.getElementById('participants-container');
let allEvents = [];
let currentTab = 'All';
let currentYear = 'All';

function audienceLabel(targetColleges, targetYears) {
    const isAllColleges = targetColleges.includes('All');
    const isAllYears = targetYears.includes('All');
    const colLabel = isAllColleges ? 'All Colleges' : targetColleges.join(', ');
    const yearLabel = isAllYears    ? 'All Years'    : targetYears.join(', ');
    return `${colLabel} • ${yearLabel}`;
}

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTab = btn.dataset.college;
        currentYear = 'All';
        document.querySelectorAll('.year-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('.year-btn[data-year="All"]').classList.add('active');
        renderEventSelector();
    });
});

document.querySelectorAll('.year-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.year-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentYear = btn.dataset.year;
        renderEventSelector();
    });
});

async function loadEvents() {
    try {
        const res = await apiFetch('/api/admin/events');
        const events = await res.json();
        if (!res.ok) {
            selector.innerHTML = '<p class="text-error">Failed to load events.</p>';
            return;
        }
        allEvents = events;
        renderEventSelector();
    } catch {
        selector.innerHTML = '<p class="text-error">Server unreachable.</p>';
    }
}

function renderEventSelector() {
    const filtered = allEvents.filter(e => {
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

    if (!filtered.length) {
        selector.innerHTML = `<p class="text-muted" style="padding:1rem;">No events found for this filter.</p>`;
        return;
    }

    selector.innerHTML = filtered.map(e =>
        `<button class="btn-event-pill" data-id="${e.id}">${e.title}</button>`
    ).join('');

    selector.querySelectorAll('.btn-event-pill').forEach(btn => {
        btn.addEventListener('click', () => {
            selector.querySelectorAll('.btn-event-pill').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadParticipants(btn.dataset.id);
        });
    });
}

async function loadParticipants(eventId) {
    const event = allEvents.find(e => e.id == eventId);
    if (!event) return;

    container.innerHTML = '<p class="text-loading">Loading…</p>';
    try {
        const res  = await apiFetch(`/api/admin/registrations/${eventId}`);
        const list = await res.json();

        const audience = audienceLabel(event.target_colleges, event.target_years);

        let html = `<div class="participants-header">
            <h3><span>${list.length}</span> participant${list.length !== 1 ? 's' : ''} registered for <span>${event.title}</span></h3>
            <div class="target-audience-header" style="color:rgba(255,255,255,0.45); font-size:0.8rem; margin-top:0.4rem; font-weight:500;">
                Target Audience: ${audience}
            </div>
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