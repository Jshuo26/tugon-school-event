const catColors = {
    Academic: 'cat-academic',
    Cultural:  'cat-cultural',
    Sports:    'cat-sports',
    Social:    'cat-social',
    Tech:      'cat-tech',
    Technology: 'cat-tech',
    Others:    'cat-others',
};

function buildFeaturedSlide(e) {
    const dateStr = e.date ? new Date(e.date).toLocaleDateString('en-PH', { year:'numeric', month:'long', day:'numeric' }) : '';
    const timeStr = [formatTime(e.start_time), formatTime(e.end_time)].filter(Boolean).join(' – ');
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

let featuredEvents = [];
let currentFeaturedIndex = 0;
let lastRenderedHtml = '';

function renderFeaturedSlide() {
    const container = document.getElementById('featured-container');
    const indicators = document.getElementById('slideshow-indicators');
    if (!container || !featuredEvents.length) return;

    const e = featuredEvents[currentFeaturedIndex];
    const newHtml = buildFeaturedSlide(e);
    
    // ONLY re-render if the content has actually changed to prevent flickering
    if (newHtml !== lastRenderedHtml) {
        // Use a unique class for animation triggers
        container.innerHTML = `<div class="featured-slide-content">${newHtml}</div>`;
        lastRenderedHtml = newHtml;
        
        // Re-bind register button
        const regBtn = container.querySelector('.register-btn');
        if (regBtn) {
            regBtn.addEventListener('click', function() {
                handleRegister(e.id, this);
            });
        }
    }

    // Update indicators (only if they exist and changed)
    if (indicators) {
        const dotsHtml = featuredEvents.map((_, i) => 
            `<div class="indicator-dot ${i === currentFeaturedIndex ? 'active' : ''}" data-index="${i}"></div>`
        ).join('');
        
        if (indicators.innerHTML !== dotsHtml) {
            indicators.innerHTML = dotsHtml;
            indicators.querySelectorAll('.indicator-dot').forEach(dot => {
                dot.addEventListener('click', () => {
                    currentFeaturedIndex = parseInt(dot.dataset.index);
                    renderFeaturedSlide();
                });
            });
        }
    }

    // Show/hide controls and indicators based on count
    const controls = document.querySelector('.slideshow-controls');
    if (controls) {
        controls.style.display = featuredEvents.length > 1 ? 'flex' : 'none';
    }
    if (indicators) {
        indicators.style.display = featuredEvents.length > 1 ? 'flex' : 'none';
    }
}

async function loadFeatured(silent = false) {
    const container = document.getElementById('featured-container');
    if (!container) return;
    if (!silent && !featuredEvents.length) container.innerHTML = '<p class="loading-text">Loading featured events…</p>';
    try {
        const res    = await apiFetch('/api/events/featured');
        const events = await res.json();
        
        if (!res.ok || !events.length) {
            container.innerHTML = '<p class="section-label featured-empty">No featured events for your college or year level.</p>';
            featuredEvents = [];
            lastRenderedHtml = '';
            renderFeaturedSlide();
            return;
        }
        
        const oldIds = featuredEvents.map(e => e.id).join(',');
        const newIds = events.map(e => e.id).join(',');
        
        featuredEvents = events;
        
        if (oldIds !== newIds) {
            // If the set of events changed, reset index and force a re-render
            currentFeaturedIndex = 0;
            lastRenderedHtml = ''; 
            renderFeaturedSlide();
        } else {
            // Just update data (renderFeaturedSlide handles the "no-change" check)
            renderFeaturedSlide();
        }
    } catch { 
        if (!featuredEvents.length) container.innerHTML = ''; 
    }
}

// ── Slideshow Navigation ──────────────────────────────────────────────────
document.getElementById('prev-slide')?.addEventListener('click', () => {
    if (featuredEvents.length <= 1) return;
    currentFeaturedIndex = (currentFeaturedIndex - 1 + featuredEvents.length) % featuredEvents.length;
    renderFeaturedSlide();
});

document.getElementById('next-slide')?.addEventListener('click', () => {
    if (featuredEvents.length <= 1) return;
    currentFeaturedIndex = (currentFeaturedIndex + 1) % featuredEvents.length;
    renderFeaturedSlide();
});

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