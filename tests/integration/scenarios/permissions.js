async function runPermissionScenario(ctx) {
  const { assert, api, port, extractCookie } = ctx;
  const adminLogin = await api('POST', port, '/api/auth/login', '', { username: 'admin', password: 'AdminPass123!' });
  assert.equal(adminLogin.status, 200);
  const adminCookie = extractCookie(adminLogin.headers['set-cookie']);

  const settings = await api('PUT', port, '/api/settings', adminCookie, { managerPin: '1234', storeName: 'Integration Store' });
  assert.equal(settings.status, 200);
  assert.equal(settings.body.hasManagerPin, true);
  assert.equal(settings.body.managerPin, undefined);

  const currentState = await api('GET', port, '/api/state', adminCookie);
  assert.equal(currentState.status, 200);
  const usersPayload = {
    users: [
      ...(currentState.body.state.users || []).map((user) => ({
        id: user.id,
        username: user.username,
        password: '',
        role: user.role,
        permissions: user.permissions || [],
        name: user.name || user.username,
        isActive: true,
        mustChangePassword: user.mustChangePassword === true,
      })),
      {
        username: 'cashier2',
        password: 'Cashier123!',
        role: 'cashier',
        permissions: ['dashboard', 'sales', 'customers', 'services', 'cashDrawer'],
        name: 'Cashier 2',
        isActive: true,
        mustChangePassword: false,
      },
    ],
  };
  const saveUsers = await api('PUT', port, '/api/users', adminCookie, usersPayload);
  assert.equal(saveUsers.status, 200);

  const cashierLogin = await api('POST', port, '/api/auth/login', '', { username: 'cashier2', password: 'Cashier123!' });
  assert.equal(cashierLogin.status, 200);
  const cashierCookie = extractCookie(cashierLogin.headers['set-cookie']);

  const cashierState = await api('GET', port, '/api/state', cashierCookie);
  assert.equal(cashierState.status, 403);

  const cashierTreasury = await api('GET', port, '/api/treasury-transactions', cashierCookie);
  assert.equal(cashierTreasury.status, 403);

  const cashierAudit = await api('GET', port, '/api/audit-logs', cashierCookie);
  assert.equal(cashierAudit.status, 403);

  const cashierStockMovements = await api('GET', port, '/api/stock-movements', cashierCookie);
  assert.equal(cashierStockMovements.status, 403);

  const cashierSalesList = await api('GET', port, '/api/sales', cashierCookie);
  assert.equal(cashierSalesList.status, 200);

  const cashierSaleDetailsMissing = await api('GET', port, '/api/sales/999999', cashierCookie);
  assert.equal(cashierSaleDetailsMissing.status, 404);

  const refreshedState = await api('GET', port, '/api/state', adminCookie);
  assert.equal(refreshedState.status, 200);

  const reportsOnlyPayload = {
    users: [
      ...(refreshedState.body.state.users || []).map((user) => ({
        id: user.id,
        username: user.username,
        password: '',
        role: user.role,
        permissions: user.permissions || [],
        name: user.name || user.username,
        isActive: true,
        mustChangePassword: user.mustChangePassword === true,
      })),
      {
        username: 'reporter1',
        password: 'Reporter123!',
        role: 'admin',
        permissions: ['dashboard', 'reports'],
        name: 'Reporter 1',
        isActive: true,
        mustChangePassword: false,
      },
    ],
  };
  const saveReporter = await api('PUT', port, '/api/users', adminCookie, reportsOnlyPayload);
  assert.equal(saveReporter.status, 200);

  const reporterLogin = await api('POST', port, '/api/auth/login', '', { username: 'reporter1', password: 'Reporter123!' });
  assert.equal(reporterLogin.status, 200);
  const reporterCookie = extractCookie(reporterLogin.headers['set-cookie']);

  const reporterSalesList = await api('GET', port, '/api/sales', reporterCookie);
  assert.equal(reporterSalesList.status, 200);

  const reporterTreasury = await api('GET', port, '/api/treasury-transactions', reporterCookie);
  assert.equal(reporterTreasury.status, 403);

  const reporterAudit = await api('GET', port, '/api/audit-logs', reporterCookie);
  assert.equal(reporterAudit.status, 403);

  const reporterAdminDiagnostics = await api('GET', port, '/api/admin/diagnostics', reporterCookie);
  assert.equal(reporterAdminDiagnostics.status, 403);

  const reporterBackup = await api('GET', port, '/api/backup', reporterCookie);
  assert.equal(reporterBackup.status, 403);

  const createUserEditor = await api('POST', port, '/api/users', adminCookie, {
    username: 'editor1',
    password: 'Editor123!',
    role: 'admin',
    permissions: ['dashboard', 'canEditUsers'],
    name: 'Editor 1',
    isActive: true,
    mustChangePassword: false,
  });
  assert.equal(createUserEditor.status, 201);

  const editorLogin = await api('POST', port, '/api/auth/login', '', { username: 'editor1', password: 'Editor123!' });
  assert.equal(editorLogin.status, 200);
  const editorCookie = extractCookie(editorLogin.headers['set-cookie']);

  const editorManagedUsers = await api('GET', port, '/api/users', editorCookie);
  assert.equal(editorManagedUsers.status, 403);

  const createTreasuryOnly = await api('POST', port, '/api/users', adminCookie, {
    username: 'treasury1',
    password: 'Treasury123!',
    role: 'admin',
    permissions: ['dashboard', 'treasury', 'reports'],
    name: 'Treasury 1',
    isActive: true,
    mustChangePassword: false,
  });
  assert.equal(createTreasuryOnly.status, 201);

  const treasuryLogin = await api('POST', port, '/api/auth/login', '', { username: 'treasury1', password: 'Treasury123!' });
  assert.equal(treasuryLogin.status, 200);
  const treasuryCookie = extractCookie(treasuryLogin.headers['set-cookie']);

  const treasuryShiftList = await api('GET', port, '/api/cashier-shifts', treasuryCookie);
  assert.equal(treasuryShiftList.status, 200);

  const treasuryOpenShift = await api('POST', port, '/api/cashier-shifts/open', treasuryCookie, { openingCash: 50, note: 'blocked treasury open' });
  assert.equal(treasuryOpenShift.status, 403);

  const cashierOpenShift = await api('POST', port, '/api/cashier-shifts/open', cashierCookie, { openingCash: 120, note: 'integration cashier shift' });
  assert.equal(cashierOpenShift.status, 201);
  const cashierShiftId = Number((cashierOpenShift.body.cashierShifts || [])[0]?.id || 0);
  assert.ok(cashierShiftId > 0);

  const cashierCashOutBlocked = await api('POST', port, `/api/cashier-shifts/${cashierShiftId}/cash-movement`, cashierCookie, { type: 'cash_out', amount: 10, note: 'صرف تجريبي واضح' });
  assert.equal(cashierCashOutBlocked.status, 400);

  const cashierCashOutApproved = await api('POST', port, `/api/cashier-shifts/${cashierShiftId}/cash-movement`, cashierCookie, { type: 'cash_out', amount: 10, note: 'صرف تجريبي واضح', managerPin: '1234' });
  assert.equal(cashierCashOutApproved.status, 201);

  const cashierCloseBlocked = await api('POST', port, `/api/cashier-shifts/${cashierShiftId}/close`, cashierCookie, { countedCash: 110, note: 'اغلاق وردية واضح' });
  assert.equal(cashierCloseBlocked.status, 400);

  const cashierCloseApproved = await api('POST', port, `/api/cashier-shifts/${cashierShiftId}/close`, cashierCookie, { countedCash: 110, note: 'اغلاق وردية واضح', managerPin: '1234' });
  assert.equal(cashierCloseApproved.status, 200);

  const createBackupOnly = await api('POST', port, '/api/users', adminCookie, {
    username: 'backup1',
    password: 'Backup123!',
    role: 'admin',
    permissions: ['dashboard', 'canManageBackups'],
    name: 'Backup 1',
    isActive: true,
    mustChangePassword: false,
  });
  assert.equal(createBackupOnly.status, 201);

  const backupLogin = await api('POST', port, '/api/auth/login', '', { username: 'backup1', password: 'Backup123!' });
  assert.equal(backupLogin.status, 200);
  const backupCookie = extractCookie(backupLogin.headers['set-cookie']);

  const backupSnapshots = await api('GET', port, '/api/backup-snapshots', backupCookie);
  assert.equal(backupSnapshots.status, 200);

  const backupImportProducts = await api('POST', port, '/api/import/products', backupCookie, { rows: [] });
  assert.equal(backupImportProducts.status, 403);

  const managedUsers = await api('GET', port, '/api/users', adminCookie);
  assert.equal(managedUsers.status, 200);
  const cashier2Managed = managedUsers.body.users.find((user) => user.username === 'cashier2');
  assert.ok(cashier2Managed);
  assert.equal(cashier2Managed.isActive, true);

  const createCashier3 = await api('POST', port, '/api/users', adminCookie, {
    username: 'cashier3',
    password: 'Cashier333!',
    role: 'cashier',
    permissions: ['dashboard', 'sales'],
    name: 'Cashier 3',
    isActive: true,
    mustChangePassword: true,
  });
  assert.equal(createCashier3.status, 201);
  const cashier3 = createCashier3.body.user;
  assert.ok(cashier3);

  const updateCashier3 = await api('PUT', port, `/api/users/${cashier3.id}`, adminCookie, {
    username: 'cashier3',
    password: '',
    role: 'cashier',
    permissions: ['dashboard', 'sales', 'customers'],
    name: 'Cashier 3 Updated',
    isActive: true,
    mustChangePassword: false,
  });
  assert.equal(updateCashier3.status, 200);
  assert.equal(updateCashier3.body.user.name, 'Cashier 3 Updated');

  const deleteCashier3 = await api('DELETE', port, `/api/users/${cashier3.id}`, adminCookie);
  assert.equal(deleteCashier3.status, 200);
  assert.ok(!(deleteCashier3.body.users || []).some((user) => String(user.id) === String(cashier3.id)));


  return {
    adminCookie,
    cashierCookie,
  };
}

module.exports = {
  runPermissionScenario,
};
