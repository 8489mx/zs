const crypto = require('crypto');

const db = require('../../db');
const config = require('../../config');
const adminTools = require('../../admin-tools');
const { createAccountingGuards } = require('../../accounting-guards');
const { createBackupSnapshotStore } = require('../../backup-snapshot-store');
const { createAccountingReportingService } = require('../../accounting-reporting-service');
const { createDomainNormalizers } = require('../../domain-normalizers');
const { createSystemDomainService } = require('../../system-domain-service');
const { createRelationalReadModels } = require('../../relational-read-models');
const { createBackupPayloadService } = require('../../backup-payload-service');
const { createDashboardOverviewService } = require('../../dashboard-overview-service');
const { createStateStoreService } = require('../../state-store-service');
const { createBootstrapStateService } = require('../../bootstrap-state-service');
const { createTransactionService } = require('../../transaction-service');
const { createTransactionMutationService } = require('../../transaction-mutation-service');
const { createPasswordRecord, normalizeText } = require('../../security');
const { validateSettingsPayload } = require('../../validation');
const { ROLE_PRESETS } = require('../../role-presets');
const { createBackupRestoreService } = require('../../backup-service');
const { createUserManagementService } = require('../../user-management-service');

module.exports = {
  crypto,
  db,
  config,
  adminTools,
  createAccountingGuards,
  createBackupSnapshotStore,
  createAccountingReportingService,
  createDomainNormalizers,
  createSystemDomainService,
  createRelationalReadModels,
  createBackupPayloadService,
  createDashboardOverviewService,
  createStateStoreService,
  createBootstrapStateService,
  createTransactionService,
  createTransactionMutationService,
  createPasswordRecord,
  normalizeText,
  validateSettingsPayload,
  ROLE_PRESETS,
  createBackupRestoreService,
  createUserManagementService,
};
