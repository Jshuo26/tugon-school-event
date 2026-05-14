'use strict';
const path    = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const express = require('express');
const cors    = require('cors');

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const frontendDir = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendDir));

app.use(express.static(path.join(__dirname, '..')));

app.use('/api/auth',   require('./routes/auth'));
app.use('/api/events', require('./routes/events'));
app.use('/api/admin',  require('./routes/admin'));

app.get('/', (_req, res) => res.redirect('/pages/login.html'));

app.use((req, res) => {
  if (req.path.startsWith('/api'))
    return res.status(404).json({ error: 'API route not found.' });
  res.status(404).redirect('/pages/login.html');
});

app.use((err, _req, res, _next) => {
  console.error('[Unhandled]', err);
  res.status(500).json({ error: 'Internal server error.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\nTUGON server running: http://localhost:${PORT}`);
  console.log(`Student login: http://localhost:${PORT}/pages/login.html`);
  console.log(`Admin panel: http://localhost:${PORT}/pages/admin_dashboard.html\n`);
});
