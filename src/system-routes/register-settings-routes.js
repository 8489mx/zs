function registerSettingsRoutes({
  app,
  authMiddleware,
  adminOnly,
  requirePermission,
  requireAnyPermission,
  stateWithUsers,
  saveState,
  allowLegacyStateWrite,
  getSettings,
  saveSettings,
  listBranches,
  createBranch,
  updateBranch,
  deleteBranch,
  listLocations,
  createLocation,
  updateLocation,
  deleteLocation,
  listServices,
  createService,
  updateService,
  deleteService,
  buildServicesListResponse,
  respondError,
}) {
  app.get('/api/state', authMiddleware, adminOnly, requireAnyPermission(['canManageSettings', 'settings']), (req, res) => {
    res.json({ state: stateWithUsers() });
  });

  app.put('/api/state', authMiddleware, adminOnly, requireAnyPermission(['canManageSettings', 'settings']), (req, res) => {
    try {
      if (!allowLegacyStateWrite) {
        return res.status(403).json({ error: 'Legacy state write is disabled' });
      }
      const state = saveState(req.body || {});
      res.json({ ok: true, state });
    } catch (err) {
      respondError(res, err, 'Could not save state');
    }
  });

  app.get('/api/settings', authMiddleware, (req, res) => {
    res.json(getSettings());
  });

  app.put('/api/settings', authMiddleware, requireAnyPermission(['canManageSettings', 'settings']), (req, res) => {
    try {
      const settings = saveSettings(req.body || {}, req.user);
      res.json(settings);
    } catch (err) {
      respondError(res, err, 'Could not save settings');
    }
  });

  app.get('/api/branches', authMiddleware, (req, res) => {
    res.json({ branches: listBranches() });
  });

  app.post('/api/branches', authMiddleware, requireAnyPermission(['canManageSettings', 'settings']), (req, res) => {
    try {
      const result = createBranch(req.body || {}, req.user);
      res.status(201).json({ ok: result.ok, branchId: result.branchId, branches: result.branches });
    } catch (err) {
      respondError(res, err, 'Could not create branch');
    }
  });

  app.put('/api/branches/:id', authMiddleware, requireAnyPermission(['canManageSettings', 'settings']), (req, res) => {
    try {
      const result = updateBranch(req.params.id, req.body || {}, req.user);
      res.json({ ok: result.ok, branchId: result.branchId, branches: result.branches });
    } catch (err) {
      respondError(res, err, 'Could not update branch');
    }
  });

  app.delete('/api/branches/:id', authMiddleware, requireAnyPermission(['canManageSettings', 'settings']), (req, res) => {
    try {
      const result = deleteBranch(req.params.id, req.user);
      res.json({ ok: result.ok, removedBranchId: result.removedBranchId, branches: result.branches });
    } catch (err) {
      respondError(res, err, 'Could not delete branch');
    }
  });

  app.get('/api/locations', authMiddleware, (req, res) => {
    res.json({ locations: listLocations() });
  });

  app.post('/api/locations', authMiddleware, requireAnyPermission(['canManageSettings', 'settings']), (req, res) => {
    try {
      const result = createLocation(req.body || {}, req.user);
      res.status(201).json({ ok: result.ok, locationId: result.locationId, locations: result.locations });
    } catch (err) {
      respondError(res, err, 'Could not create location');
    }
  });

  app.put('/api/locations/:id', authMiddleware, requireAnyPermission(['canManageSettings', 'settings']), (req, res) => {
    try {
      const result = updateLocation(req.params.id, req.body || {}, req.user);
      res.json({ ok: result.ok, locationId: result.locationId, locations: result.locations });
    } catch (err) {
      respondError(res, err, 'Could not update location');
    }
  });

  app.delete('/api/locations/:id', authMiddleware, requireAnyPermission(['canManageSettings', 'settings']), (req, res) => {
    try {
      const result = deleteLocation(req.params.id, req.user);
      res.json({ ok: result.ok, removedLocationId: result.removedLocationId, locations: result.locations });
    } catch (err) {
      respondError(res, err, 'Could not delete location');
    }
  });

  app.get('/api/services', authMiddleware, requirePermission('services'), (req, res) => {
    res.json(buildServicesListResponse(listServices() || [], req.query || {}));
  });

  app.post('/api/services', authMiddleware, requirePermission('services'), (req, res) => {
    try {
      res.status(201).json(createService(req.body || {}, req.user));
    } catch (err) {
      respondError(res, err, 'Could not save service');
    }
  });

  app.put('/api/services/:id', authMiddleware, requirePermission('services'), (req, res) => {
    try {
      res.json(updateService(req.params.id, req.body || {}, req.user));
    } catch (err) {
      respondError(res, err, 'Could not update service');
    }
  });

  app.delete('/api/services/:id', authMiddleware, requirePermission('services'), (req, res) => {
    try {
      res.json(deleteService(req.params.id, req.user));
    } catch (err) {
      respondError(res, err, 'Could not delete service');
    }
  });
}

module.exports = {
  registerSettingsRoutes,
};
