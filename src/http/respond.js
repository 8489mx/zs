function respond(res, statusCode, payload) {
  return res.status(statusCode).json(payload);
}

function errorPayload(message, extras) {
  return { error: message, ...(extras || {}) };
}

function ok(res, payload) {
  return res.json(payload);
}

function created(res, payload) {
  return respond(res, 201, payload);
}

function badRequest(res, message, extras) {
  return respond(res, 400, errorPayload(message, extras));
}

function unauthorized(res, message = 'Unauthorized', extras) {
  return respond(res, 401, errorPayload(message, extras));
}

function forbidden(res, message = 'Forbidden', extras) {
  return respond(res, 403, errorPayload(message, extras));
}

function notFound(res, message = 'Not found', extras) {
  return respond(res, 404, errorPayload(message, extras));
}

function conflict(res, message, extras) {
  return respond(res, 409, errorPayload(message, extras));
}

function tooManyRequests(res, message, extras) {
  return respond(res, 429, errorPayload(message, extras));
}

function fail(res, err, fallbackMessage, statusCode = 400) {
  return respond(res, Number(err && err.statusCode) || statusCode, errorPayload((err && err.message) || fallbackMessage));
}

module.exports = {
  ok,
  created,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  tooManyRequests,
  fail,
};
