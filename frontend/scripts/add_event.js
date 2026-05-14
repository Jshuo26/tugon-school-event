(function () {
    const adminToken = localStorage.getItem('tugon_admin_token');
    if (!adminToken) { window.location.href = 'login.html'; return; }

    const collegeAll            = document.getElementById('college-all');
    const allCollegeChecks      = document.querySelectorAll('.college-check');
    const specificCollegeChecks = Array.from(allCollegeChecks).filter(cb => cb.value !== 'All');

    const yearAll            = document.getElementById('year-all');
    const allYearChecks      = document.querySelectorAll('.year-check');
    const specificYearChecks = Array.from(allYearChecks).filter(cb => cb.value !== 'All');

    function updateCollegePillState() {
        if (collegeAll.checked) {
            specificCollegeChecks.forEach(cb => {
                cb.checked = false;
                const p = cb.closest('.pill-checkbox');
                if (p) p.classList.add('disabled');
            });
        } else {
            specificCollegeChecks.forEach(cb => {
                const p = cb.closest('.pill-checkbox');
                if (p) p.classList.remove('disabled');
            });
        }
    }

    function updateYearPillState() {
        if (yearAll.checked) {
            specificYearChecks.forEach(cb => {
                cb.checked = false;
                const p = cb.closest('.pill-checkbox');
                if (p) p.classList.add('disabled');
            });
        } else {
            specificYearChecks.forEach(cb => {
                const p = cb.closest('.pill-checkbox');
                if (p) p.classList.remove('disabled');
            });
        }
    }

    collegeAll.addEventListener('change', () => {
        if (collegeAll.checked) specificCollegeChecks.forEach(cb => cb.checked = false);
        updateCollegePillState();
    });
    specificCollegeChecks.forEach(cb => cb.addEventListener('change', () => {
        if (cb.checked) collegeAll.checked = false;
        updateCollegePillState();
    }));

    yearAll.addEventListener('change', () => {
        if (yearAll.checked) specificYearChecks.forEach(cb => cb.checked = false);
        updateYearPillState();
    });
    specificYearChecks.forEach(cb => cb.addEventListener('change', () => {
        if (cb.checked) yearAll.checked = false;
        updateYearPillState();
    }));

    updateCollegePillState();
    updateYearPillState();

    function getSelectedColleges() {
        const checked = Array.from(allCollegeChecks).filter(cb => cb.checked).map(cb => cb.value);
        return checked.includes('All') ? ['All'] : checked;
    }

    function getSelectedYears() {
        const checked = Array.from(allYearChecks).filter(cb => cb.checked).map(cb => cb.value);
        return checked.includes('All') ? ['All'] : checked;
    }

    function showInlineError(message) {
        let errDiv = document.getElementById('dynamic-form-error');
        if (!errDiv) {
            errDiv = document.createElement('div');
            errDiv.id = 'dynamic-form-error';
            errDiv.style.cssText = 'margin:0 0 1rem 0;padding:0.8rem 1.2rem;border-radius:12px;background:rgba(220,38,38,0.15);border:1px solid rgba(239,68,68,0.4);color:#fca5a5;font-weight:500;';
            const fc = document.querySelector('.admin-form');
            if (fc) fc.prepend(errDiv);
        }
        errDiv.textContent = message;
        errDiv.style.display = 'block';
        setTimeout(() => errDiv.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
    }

    function clearInlineError() {
        const errDiv = document.getElementById('dynamic-form-error');
        if (errDiv) errDiv.style.display = 'none';
    }

    function validateAllFields() {
        const title    = document.getElementById('event-title').value.trim();
        const date     = document.getElementById('event-date').value;
        const startTime = document.getElementById('start-time').value;
        const endTime  = document.getElementById('end-time').value;
        const location = document.getElementById('event-location').value;
        const description = document.getElementById('event-description').value.trim();
        const category = document.getElementById('event-category').value;
        const capacity = document.getElementById('event-capacity').value;

        if (!title)       { showInlineError('Please provide an event title.'); return false; }
        if (!date)        { showInlineError('Select a valid event date.'); return false; }
        if (!startTime || !endTime) { showInlineError('Fill in both start and end time.'); return false; }
        if (!location)    { showInlineError('Choose a venue / location.'); return false; }
        if (!description) { showInlineError('Event description is required.'); return false; }
        if (!category)    { showInlineError('Please select an event category.'); return false; }
        if (!capacity || capacity < 1 || capacity > 300) { showInlineError('Capacity must be between 1 and 300.'); return false; }

        const colleges = getSelectedColleges();
        const years    = getSelectedYears();
        if (!colleges.length) { showInlineError('Select at least one target college (or "All Colleges").'); return false; }
        if (!years.length)    { showInlineError('Select at least one target year level (or "All Years").'); return false; }

        clearInlineError();
        return true;
    }

    const form       = document.getElementById('create-event-form');
    const publishBtn = form?.querySelector('.btn-publish');

    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        if (!validateAllFields()) return;

        const colleges = getSelectedColleges();
        const years    = getSelectedYears();

        publishBtn.innerHTML = 'Publishing…';
        publishBtn.style.opacity = '0.7';
        publishBtn.style.pointerEvents = 'none';

        try {
            const formData = new FormData();
            formData.append('title',           document.getElementById('event-title').value.trim());
            formData.append('date',            document.getElementById('event-date').value);
            formData.append('start_time',      document.getElementById('start-time').value);
            formData.append('end_time',        document.getElementById('end-time').value);
            formData.append('location',        document.getElementById('event-location').value);
            formData.append('description',     document.getElementById('event-description').value.trim());
            formData.append('category',        document.getElementById('event-category').value);
            formData.append('capacity',        document.getElementById('event-capacity').value);
            formData.append('target_colleges', JSON.stringify(colleges));
            formData.append('target_years',    JSON.stringify(years));

            const imageFile = document.getElementById('event-image').files[0];
            if (imageFile) formData.append('event_image', imageFile);

            const res  = await fetch('/api/admin/events', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + adminToken },
                body: formData,
            });
            const data = await res.json();

            if (!res.ok) {
                showInlineError(data.error || 'Failed to publish event.');
                publishBtn.innerHTML = 'Publish Event →';
                publishBtn.style.opacity = '';
                publishBtn.style.pointerEvents = '';
                return;
            }

            showAdminToast('Event published successfully! Redirecting…');
            setTimeout(() => {
                window.location.href = 'admin_dashboard.html';
            }, 1500);
        } catch {
            showInlineError('Could not reach the server. Is it running?');
            publishBtn.innerHTML = 'Publish Event →';
            publishBtn.style.opacity = '';
            publishBtn.style.pointerEvents = '';
        }
    });
})();