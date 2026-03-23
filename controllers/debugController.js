exports.tokenDebug = (req, res) => {
  res.json({
    hasAccessTokenHeader: Boolean(req.headers["x-access-token"]),
    hasAccountIdHeader: Boolean(req.headers["x-account-id"]),
    hasUserIdHeader: Boolean(req.headers["x-user-id"])
  });
};
