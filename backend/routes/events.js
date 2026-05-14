'use strict';
const router = require('express').Router();
const pool   = require('../config/db');
const { authStudent } = require('../middleware/auth');

function parseJSON(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  try { return JSON.parse(v); } catch { return []; }
}

function isVisible(event, college, yearLevel) {
  const cols  = parseJSON(event.target_colleges);
  const years = parseJSON(event.target_years);
  return (cols.includes('All')  || cols.includes(college))
      && (years.includes('All') || years.includes(yearLevel));
}

router.get('/', authStudent, async (req, res) => {
  const { id, college, year_level } = req.student;
  try {
    const [events] = await pool.execute(
      `SELECT e.*, COUNT(r.event_id) AS registration_count
       FROM events e
       LEFT JOIN registrations r ON r.event_id = e.id
       GROUP BY e.id
       ORDER BY e.date ASC, e.start_time ASC`,
    );
    const [myRegs] = await pool.execute(
      'SELECT event_id FROM registrations WHERE student_id = ?', [id],
    );
    const mine = new Set(myRegs.map(r => r.event_id));

    return res.json(
      events
        .filter(e => isVisible(e, college, year_level))
        .map(e => ({
          ...e,
          target_colleges:    parseJSON(e.target_colleges),
          target_years:       parseJSON(e.target_years),
          registered:         mine.has(e.id),
          registration_count: Number(e.registration_count) || 0,
        })),
    );
  } catch (err) {
    console.error('[GET /events]', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

router.get('/featured', authStudent, async (req, res) => {
  const { college, year_level, id: studentId } = req.student;
  try {
    const [rows] = await pool.execute(
      `SELECT e.*, COUNT(r.event_id) AS registration_count
       FROM events e
       LEFT JOIN registrations r ON r.event_id = e.id
       WHERE e.is_featured = 1
       GROUP BY e.id`
    );

    const [myRegs] = await pool.execute(
      'SELECT event_id FROM registrations WHERE student_id = ?', [studentId],
    );
    const mine = new Set(myRegs.map(r => r.event_id));

    const filtered = rows.filter(e => isVisible(e, college, year_level));

    // Sort by priority hierarchy: All > All:Year > College > College:Year
    filtered.sort((a, b) => {
      const getPriority = (scope) => {
        if (scope === 'All') return 1;
        if (scope && scope.startsWith('All:')) return 2;
        if (scope === college) return 3;
        if (scope === `${college}:${year_level}`) return 4;
        return 5;
      };
      return getPriority(a.featured_scope) - getPriority(b.featured_scope);
    });

    return res.json(filtered.map(e => ({
      ...e,
      target_colleges:    parseJSON(e.target_colleges),
      target_years:       parseJSON(e.target_years),
      registered:         mine.has(e.id),
      registration_count: Number(e.registration_count) || 0,
    })));
  } catch (err) {
    console.error('[GET /events/featured]', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

router.get('/my-registrations', authStudent, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT e.*, r.registration_date
       FROM registrations r
       JOIN events e ON r.event_id = e.id
       WHERE r.student_id = ?
       ORDER BY e.date ASC`, [req.student.id],
    );
    return res.json(rows.map(e => ({
      ...e,
      target_colleges: parseJSON(e.target_colleges),
      target_years:    parseJSON(e.target_years),
    })));
  } catch (err) {
    console.error('[GET /events/my-registrations]', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

router.get('/:id', authStudent, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT e.*, COUNT(r.event_id) AS registration_count
       FROM events e
       LEFT JOIN registrations r ON r.event_id = e.id
       WHERE e.id = ?
       GROUP BY e.id`,
      [req.params.id],
    );
    if (!rows.length) return res.status(404).json({ error: 'Event not found.' });

    const event = rows[0];
    const [reg] = await pool.execute(
      'SELECT 1 FROM registrations WHERE student_id = ? AND event_id = ?',
      [req.student.id, event.id],
    );
    return res.json({
      ...event,
      target_colleges:    parseJSON(event.target_colleges),
      target_years:       parseJSON(event.target_years),
      registered:         reg.length > 0,
      registration_count: Number(event.registration_count) || 0,
    });
  } catch (err) {
    console.error('[GET /events/:id]', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

router.post('/:id/register', authStudent, async (req, res) => {
  const studentId = req.student.id;
  const eventId   = Number(req.params.id);
  try {
    const [evts] = await pool.execute('SELECT * FROM events WHERE id = ?', [eventId]);
    if (!evts.length) return res.status(404).json({ error: 'Event not found.' });

    const ev = evts[0];
    if (!isVisible(ev, req.student.college, req.student.year_level)) {
      return res.status(403).json({ error: 'You are not eligible for this event.' });
    }

    if (ev.capacity) {
      const [[{ cnt }]] = await pool.execute(
        'SELECT COUNT(*) AS cnt FROM registrations WHERE event_id = ?', [eventId],
      );
      if (cnt >= ev.capacity)
        return res.status(409).json({ error: 'This event is already at full capacity.' });
    }

    await pool.execute(
      'INSERT INTO registrations (student_id, event_id) VALUES (?, ?)', [studentId, eventId],
    );
    return res.status(201).json({ message: 'Successfully registered!' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'You are already registered for this event.' });
    console.error('[POST /events/:id/register]', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

router.delete('/:id/register', authStudent, async (req, res) => {
  try {
    const [result] = await pool.execute(
      'DELETE FROM registrations WHERE student_id = ? AND event_id = ?',
      [req.student.id, req.params.id],
    );
    if (!result.affectedRows)
      return res.status(404).json({ error: 'Registration not found.' });
    return res.json({ message: 'Registration cancelled.' });
  } catch (err) {
    console.error('[DELETE /events/:id/register]', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
