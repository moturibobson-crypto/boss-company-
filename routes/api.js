const express = require('express');
const router = express.Router();
const pool = require('../db/conn');

router.get('/status', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

router.get('/dbtest', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 AS ok');
    res.json({ db: 'connected', rows });
  } catch (err) {
    res.status(500).json({ db: 'error', message: err.message });
  }
});

router.get('/config', (req, res) => {
  res.json({ apiBase: '/api' });
});

// List users
router.get('/users', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, username, email, created_at FROM users ORDER BY id DESC');
    res.json({ users: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create user
router.post('/users', async (req, res) => {
  const { username, email } = req.body || {};
  if (!username || !email) return res.status(400).json({ error: 'username and email are required' });
  try {
    const [result] = await pool.query('INSERT INTO users (username, email) VALUES (?, ?) ', [username, email]);
    const [rows] = await pool.query('SELECT id, username, email, created_at FROM users WHERE id = ?', [result.insertId]);
    res.status(201).json({ user: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
