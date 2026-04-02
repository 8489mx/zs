const { hashPassword, safeEqual } = require('./security');
const { getRateLimitKey, getSessionClientMeta } = require('./request-context');


const BUNDLED_DEFAULT_ADMIN_PASSWORD = 'infoadmin';

function usesBootstrapAdminPassword(db, config, user) {
  if (!user || String(user.role || '').trim() !== 'super_admin') return false;
  const expectedUsername = String(config.defaultAdminUsername || 'ZS').trim() || 'ZS';
  if (String(user.username || '').trim().toLowerCase() !== expectedUsername.toLowerCase()) return false;
  const row = db.prepare('SELECT password_hash, password_salt FROM users WHERE id = ? LIMIT 1').get(user.id);
  if (!row?.password_hash || !row?.password_salt) return false;
  const candidate = String(config.defaultAdminPassword || '').trim() || BUNDLED_DEFAULT_ADMIN_PASSWORD;
  const attempted = hashPassword(candidate, row.password_salt);
  return safeEqual(attempted, row.password_hash);
}

function registerAuthRoutes({
  app,
  db,
  config,
  authMiddleware,
  superAdminOnly,
  loginRateLimit,
  login,
  createSession,
  destroySession,
  setNoStore,
  sessionCookieOptions,
  addAuditLog,
  addSecurityAudit,
  ensureDefaultUsers,
  getSetting,
}) {
  if (!app) throw new Error('app is required');

  app.post('/api/auth/login', (req, res) => {
    const rate = loginRateLimit(getRateLimitKey(req, 'login'));
    if (!rate.allowed) {
      return res.status(429).json({ error: 'Too many login attempts. Try again later.' });
    }
    const { username = '', password = '' } = req.body || {};
    const result = login(String(username).trim(), String(password));
    if (!result.ok) {
      if (String(username).trim()) addSecurityAudit('فشل تسجيل الدخول', `فشل تسجيل دخول للمستخدم ${String(username).trim()}`, null);
      if (result.reason === 'locked') return res.status(423).json({ error: 'Account locked temporarily', lockedUntil: result.lockedUntil || null });
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    const user = result.user;
    const session = createSession(user.id, getSessionClientMeta(req));
    setNoStore(res);
    res.cookie('session_id', session.id, {
      ...sessionCookieOptions,
      expires: new Date(session.expires)
    });
    addAuditLog('تسجيل دخول', `تم تسجيل دخول المستخدم ${user.username}`, user.id);
    res.json({ user, mustChangePassword: user.mustChangePassword === true });
  });

  app.post('/api/auth/reset-users', authMiddleware, superAdminOnly, (req, res) => {
    if (!config.allowResetUsers) return res.status(403).json({ error: 'User reset is disabled' });
    const tx = db.transaction(() => {
      db.prepare('DELETE FROM sessions').run();
      db.prepare('DELETE FROM users').run();
      ensureDefaultUsers();
    });
    tx();
    res.json({ ok: true });
  });

  app.post('/api/auth/logout', authMiddleware, (req, res) => {
    addAuditLog('تسجيل خروج', `تم تسجيل خروج المستخدم ${req.user.username}`, req.user.id);
    destroySession(req.cookies.session_id);
    setNoStore(res);
    res.clearCookie('session_id', sessionCookieOptions);
    res.json({ ok: true });
  });

  app.get('/api/auth/me', authMiddleware, (req, res) => {
    setNoStore(res);
    res.json({
      user: req.user,
      settings: {
        storeName: getSetting('storeName', config.defaultStoreName),
        theme: getSetting('theme', 'dark')
      },
      security: {
        mustChangePassword: req.user.mustChangePassword === true,
        usingDefaultAdminPassword: usesBootstrapAdminPassword(db, config, req.user)
      }
    });
  });
}

module.exports = { registerAuthRoutes };
