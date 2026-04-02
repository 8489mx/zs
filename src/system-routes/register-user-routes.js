function registerUserRoutes({
  app,
  authMiddleware,
  adminOnly,
  requirePermission,
  setNoStore,
  defaultUsersState,
  createManagedUser,
  updateManagedUser,
  deleteManagedUser,
  unlockManagedUser,
  validateUsersPayload,
  syncUsers,
  addSecurityAudit,
  withUserLookup,
  paginateRows,
  filterManagedUsersRows,
  summarizeManagedUsersRows,
  respondError,
}) {
  app.get('/api/users', authMiddleware, adminOnly, requirePermission('canManageUsers'), (req, res) => {
    setNoStore(res);
    const allUsers = defaultUsersState({ includeInactive: true });
    const filteredRows = filterManagedUsersRows(allUsers, req.query || {});
    const { rows, pagination } = paginateRows(filteredRows, req.query || {}, { pageSize: 10, maxPageSize: 100 });
    res.json({ users: rows, pagination, summary: summarizeManagedUsersRows(filteredRows) });
  });

  app.post('/api/users', authMiddleware, adminOnly, requirePermission('canManageUsers'), (req, res) => {
    try {
      const user = createManagedUser(req.body || {});
      addSecurityAudit('إضافة مستخدم', `تمت إضافة المستخدم ${user.username} بواسطة ${req.user.username}`, req.user.id);
      res.status(201).json({ ok: true, user: withUserLookup(user), users: defaultUsersState({ includeInactive: true }) });
    } catch (err) {
      respondError(res, err, 'Could not create user');
    }
  });

  app.put('/api/users/:id', authMiddleware, adminOnly, requirePermission('canManageUsers'), (req, res) => {
    try {
      const user = updateManagedUser(req.params.id, req.body || {}, req.user.id, req.user.role, req.sessionId);
      addSecurityAudit('تعديل مستخدم', `تم تحديث المستخدم ${user.username} بواسطة ${req.user.username}`, req.user.id);
      res.json({ ok: true, user: withUserLookup(user), users: defaultUsersState({ includeInactive: true }) });
    } catch (err) {
      respondError(res, err, 'Could not update user');
    }
  });

  app.delete('/api/users/:id', authMiddleware, adminOnly, requirePermission('canManageUsers'), (req, res) => {
    try {
      const removedUser = deleteManagedUser(req.params.id, req.user.id, req.user.role);
      addSecurityAudit('حذف مستخدم', `تم حذف المستخدم ${removedUser.username} بواسطة ${req.user.username}`, req.user.id);
      res.json({ ok: true, removedUserId: String(removedUser.id), users: defaultUsersState({ includeInactive: true }) });
    } catch (err) {
      respondError(res, err, 'Could not delete user');
    }
  });

  app.post('/api/users/:id/unlock', authMiddleware, adminOnly, requirePermission('canManageUsers'), (req, res) => {
    try {
      const user = unlockManagedUser(req.params.id, req.user.role);
      addSecurityAudit('فتح مستخدم', `تم فتح المستخدم ${user.username} بواسطة ${req.user.username}`, req.user.id);
      res.json({ ok: true, user: withUserLookup(user), users: defaultUsersState({ includeInactive: true }) });
    } catch (err) {
      respondError(res, err, 'Could not unlock user');
    }
  });

  app.put('/api/users', authMiddleware, adminOnly, requirePermission('canManageUsers'), (req, res) => {
    try {
      const users = validateUsersPayload(req.body && req.body.users);
      syncUsers(users, { actorUserId: req.user.id, actorSessionId: req.sessionId || req.cookies.session_id || '' });
      addSecurityAudit('تعديل المستخدمين', `تم تحديث ${users.length} مستخدم/صلاحية بواسطة ${req.user.username}`, req.user.id);
      res.json({ ok: true, users: defaultUsersState({ includeInactive: true }) });
    } catch (err) {
      respondError(res, err, 'Could not save users');
    }
  });
}

module.exports = {
  registerUserRoutes,
};
