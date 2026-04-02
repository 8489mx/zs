function createWithUserLookup(defaultUsersState) {
  return (user) => defaultUsersState({ includeInactive: true }).find((entry) => String(entry.id) === String(user.id)) || null;
}

function respondError(res, err, fallbackMessage, statusCode = 400) {
  res.status(err.statusCode || statusCode).json({ error: err.message || fallbackMessage });
}

module.exports = {
  createWithUserLookup,
  respondError,
};
