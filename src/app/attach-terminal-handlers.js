const fs = require('fs');
const path = require('path');

function attachTerminalHandlers({ app, logger }) {
  app.use((err, req, res, next) => {
    logger.error('unhandled_request_error', { requestId: req.requestId || 'n/a', error: err });
    if (res.headersSent) return next(err);
    res.status(err.statusCode || 500).json({ error: err.message || 'Internal server error', requestId: req.requestId || null });
  });

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    try {
      const reactIndexPath = path.join(__dirname, '..', '..', 'frontend', 'dist', 'index.html');
      if (!fs.existsSync(reactIndexPath)) {
        throw new Error('No React frontend bundle found. Build frontend/dist before startup.');
      }
      const html = fs.readFileSync(reactIndexPath, 'utf8').replace(/<script(\s|>)/g, `<script nonce="${res.locals.cspNonce}"$1`);
      res.type('html').send(html);
    } catch (error) {
      next(error);
    }
  });
}

module.exports = {
  attachTerminalHandlers,
};
