const crypto = require('crypto');
const express = require('express');
const https = require('https');
const router = express.Router();
const pool = require('../db/conn');

const sessions = new Map();
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'moturibobson@gmail.com').toLowerCase();
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}
function passwordMatches(password, saved) {
  if (!saved || !saved.includes(':')) return false;
  const [salt, expected] = saved.split(':');
  const actual = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(actual, 'hex'));
}
function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, phone: user.phone || '', isAdmin: user.email.toLowerCase() === ADMIN_EMAIL };
}
function createSession(user) {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { user: publicUser(user), expires: Date.now() + 1000 * 60 * 60 * 12 });
  return token;
}
function auth(req, res, next) {
  const token = (req.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const session = sessions.get(token);
  if (!session || session.expires < Date.now()) return res.status(401).json({ error: 'Sign in required.' });
  req.user = session.user;
  next();
}
function admin(req, res, next) {
  if (!req.user || !req.user.isAdmin) return res.status(403).json({ error: 'Administrator access required.' });
  next();
}
function getGoogleClaims(idToken) {
  return new Promise((resolve, reject) => {
    https.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`, response => {
      let body = '';
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => {
        try {
          const claims = JSON.parse(body);
          if (response.statusCode !== 200 || claims.aud !== GOOGLE_CLIENT_ID || !['accounts.google.com', 'https://accounts.google.com'].includes(claims.iss) || claims.email_verified !== 'true') {
            return reject(new Error('Invalid Google credential.'));
          }
          resolve(claims);
        } catch { reject(new Error('Invalid Google response.')); }
      });
    }).on('error', () => reject(new Error('Google verification failed.')));
  });
}

router.get('/status', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));
router.get('/config', (req, res) => res.json({ apiBase: '/api', googleClientId: GOOGLE_CLIENT_ID || null }));

router.post('/auth/register', async (req, res) => {
  const { name, email, phone, password } = req.body || {};
  if (!name || !email || !phone || !password || password.length < 8) return res.status(400).json({ error: 'Name, email, phone, and an 8-character password are required.' });
  try {
    const [result] = await pool.query('INSERT INTO accounts (name, email, phone, password_hash) VALUES (?, ?, ?, ?)', [name.trim(), email.trim().toLowerCase(), phone.trim(), hashPassword(password)]);
    const [rows] = await pool.query('SELECT id, name, email, phone FROM accounts WHERE id = ?', [result.insertId]);
    const token = createSession(rows[0]);
    res.status(201).json({ token, user: publicUser(rows[0]) });
  } catch (err) {
    res.status(err.code === 'ER_DUP_ENTRY' ? 409 : 500).json({ error: err.code === 'ER_DUP_ENTRY' ? 'That email is already registered.' : 'Unable to create account.' });
  }
});

router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
  try {
    const [rows] = await pool.query('SELECT id, name, email, phone, password_hash FROM accounts WHERE email = ?', [email.trim().toLowerCase()]);
    if (!rows[0] || !passwordMatches(password, rows[0].password_hash)) return res.status(401).json({ error: 'Invalid email or password.' });
    res.json({ token: createSession(rows[0]), user: publicUser(rows[0]) });
  } catch { res.status(500).json({ error: 'Unable to sign in. Please try again.' }); }
});

router.get('/auth/me', auth, (req, res) => res.json({ user: req.user }));

router.post('/auth/google', async (req, res) => {
  if (!GOOGLE_CLIENT_ID) return res.status(503).json({ error: 'Google sign-in has not been configured yet.' });
  try {
    const claims = await getGoogleClaims(req.body && req.body.credential);
    const [rows] = await pool.query('SELECT id, name, email, phone FROM accounts WHERE google_sub = ? OR email = ?', [claims.sub, claims.email.toLowerCase()]);
    let user = rows[0];
    if (user) {
      await pool.query('UPDATE accounts SET google_sub = COALESCE(google_sub, ?) WHERE id = ?', [claims.sub, user.id]);
    } else {
      const [result] = await pool.query('INSERT INTO accounts (name, email, google_sub) VALUES (?, ?, ?)', [claims.name || claims.email, claims.email.toLowerCase(), claims.sub]);
      user = { id: result.insertId, name: claims.name || claims.email, email: claims.email, phone: '' };
    }
    res.json({ token: createSession(user), user: publicUser(user) });
  } catch (err) { res.status(401).json({ error: err.message || 'Google sign-in failed.' }); }
});

router.get('/products', async (req, res) => {
  try {
    const [products] = await pool.query('SELECT id, name, description, price, media_data AS mediaData, media_type AS mediaType, created_at AS createdAt FROM products ORDER BY id DESC');
    res.json({ products });
  } catch { res.status(500).json({ error: 'Unable to load products.' }); }
});

router.post('/products', auth, admin, async (req, res) => {
  const { name, description, price, mediaData, mediaType } = req.body || {};
  if (!name || !description || !price) return res.status(400).json({ error: 'Name, description, and price are required.' });
  if (mediaData && (!/^data:(image|video)\/[a-z0-9.+-]+;base64,/i.test(mediaData) || mediaData.length > 20 * 1024 * 1024)) return res.status(400).json({ error: 'Upload a valid image or video smaller than 15 MB.' });
  try {
    const [result] = await pool.query('INSERT INTO products (name, description, price, media_data, media_type) VALUES (?, ?, ?, ?, ?)', [name.trim(), description.trim(), price.trim(), mediaData || null, mediaType || null]);
    res.status(201).json({ id: result.insertId });
  } catch { res.status(500).json({ error: 'Unable to upload product.' }); }
});

router.delete('/products/:id', auth, admin, async (req, res) => {
  try { await pool.query('DELETE FROM products WHERE id = ?', [req.params.id]); res.status(204).end(); }
  catch { res.status(500).json({ error: 'Unable to delete product.' }); }
});

router.get('/admin/users', auth, admin, async (req, res) => {
  try {
    const [users] = await pool.query('SELECT id, name, email, phone, created_at AS createdAt FROM accounts ORDER BY id DESC');
    res.json({ users });
  } catch { res.status(500).json({ error: 'Unable to load users.' }); }
});

module.exports = router;
