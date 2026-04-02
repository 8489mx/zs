function registerSessionRoutes({
  app,
  authMiddleware,
  setNoStore,
  listSessions,
  revokeSessionForUser,
  revokeOtherSessions,
  changePassword,
  validatePasswordChangePayload,
  sessionCookieOptions,
  addAuditLog,
  respondError,
  config,
}) {
  app.get('/api/auth/sessions', authMiddleware, (req, res) => {
    setNoStore(res);
    res.json({ sessions: listSessions(req.user.id) });
  });

  app.delete('/api/auth/sessions/:id', authMiddleware, (req, res) => {
    const sessionId = String(req.params.id || '').trim();
    if (!sessionId) return res.status(400).json({ error: 'Session id is required' });
    const removed = revokeSessionForUser(sessionId, req.user.id);
    if (!removed) return res.status(404).json({ error: 'Session not found' });
    addAuditLog('إنهاء جلسة', `تم إنهاء جلسة للمستخدم ${req.user.username}`, req.user.id);
    if (sessionId === (req.sessionId || req.cookies.session_id)) {
      res.clearCookie('session_id', sessionCookieOptions);
    }
    res.json({ ok: true, sessions: listSessions(req.user.id) });
  });

  app.post('/api/auth/sessions/revoke-others', authMiddleware, (req, res) => {
    const removed = revokeOtherSessions(req.user.id, req.sessionId || req.cookies.session_id || '');
    addAuditLog('إنهاء الجلسات الأخرى', `تم إنهاء ${removed} جلسة أخرى للمستخدم ${req.user.username}`, req.user.id);
    res.json({ ok: true, removed, sessions: listSessions(req.user.id) });
  });

  app.post('/api/auth/change-password', authMiddleware, (req, res) => {
    setNoStore(res);
    try {
      const payload = validatePasswordChangePayload(req.body || {}, config.minAdminPasswordLength);
      changePassword(req.user.id, payload.currentPassword, payload.newPassword, { requireCurrent: true });
      const removed = revokeOtherSessions(req.user.id, req.sessionId || req.cookies.session_id || '');
      addAuditLog('تغيير كلمة المرور', `تم تغيير كلمة المرور للمستخدم ${req.user.username} وإنهاء ${removed} جلسة أخرى`, req.user.id);
      res.json({ ok: true, removedOtherSessions: removed });
    } catch (err) {
      respondError(res, err, 'Could not change password');
    }
  });
}

module.exports = {
  registerSessionRoutes,
};
