const { createRuntimeContext } = require('./create-runtime-context');
const { createServiceContainer } = require('./create-service-container');
const { registerApplicationRoutes } = require('./register-application-routes');
const { attachTerminalHandlers } = require('./attach-terminal-handlers');

function createApp() {
  const runtime = createRuntimeContext();
  const services = createServiceContainer({ userHasPermission: runtime.userHasPermission });

  registerApplicationRoutes({ runtime, services });
  attachTerminalHandlers({ app: runtime.app, logger: runtime.logger });

  return {
    app: runtime.app,
    config: runtime.config,
    logger: runtime.logger,
    testables: {
      reportSummary: services.reportSummary,
      buildRelationalBackupPayload: services.buildRelationalBackupPayload,
    },
  };
}

function startServer(app, { config, logger }) {
  return app.listen(config.port, config.host, () => {
    logger.info('server_started', {
      host: config.host,
      port: config.port,
      localUrl: `http://localhost:${config.port}`,
      networkUrlHint: `http://<your-ip>:${config.port}`,
      logLevel: config.logLevel,
      logFormat: config.logFormat,
    });
    if (config.allowLegacyStateWrite) {
      logger.warn('legacy_state_write_enabled', { message: 'Disable ALLOW_LEGACY_STATE_WRITE after fully migrating away from legacy state flows.' });
    }
  });
}

module.exports = {
  createApp,
  startServer,
};
