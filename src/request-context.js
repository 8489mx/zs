function normalizeIp(value) {
  const raw = String(value || '').split(',')[0].trim();
  if (!raw) return '';
  if (raw === '::1') return '127.0.0.1';
  if (raw.startsWith('::ffff:')) return raw.slice(7);
  return raw;
}

function getClientIp(req) {
  if (!req || typeof req !== 'object') return '';
  return normalizeIp(req.ip || req.socket?.remoteAddress || '');
}

function getSafeUserAgent(req) {
  const value = String(req?.headers?.['user-agent'] || '').replace(/[\r\n\t]+/g, ' ').trim();
  return value.slice(0, 255);
}

function getRateLimitKey(req, prefix, userId) {
  if (userId) return `${prefix}:${userId}`;
  const ip = getClientIp(req);
  return `${prefix}:${ip || 'local'}`;
}

function getSessionClientMeta(req) {
  return {
    ipAddress: getClientIp(req),
    userAgent: getSafeUserAgent(req)
  };
}

module.exports = {
  getClientIp,
  getRateLimitKey,
  getSessionClientMeta,
  getSafeUserAgent,
};
