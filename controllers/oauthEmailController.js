const axios = require("axios");
const EmailAccount = require("../models/EmailAccount");
const MondayUser = require("../models/MondayUser");

const buildGoogleAuthUrl = (state) => {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || "",
    redirect_uri: process.env.GOOGLE_REDIRECT_URI || "",
    response_type: "code",
    scope: "openid email profile https://www.googleapis.com/auth/gmail.send",
    access_type: "offline",
    prompt: "consent",
    state: state || ""
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
};

exports.googleAuthStart = (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_REDIRECT_URI) {
    return res.status(500).send("Google OAuth not configured");
  }
  res.redirect(buildGoogleAuthUrl(req.query.state));
};

exports.googleAuthCallback = async (req, res) => {
  const code = req.query.code;
  const state = req.query.state || "";
  if (!code) return res.status(400).send("Missing code");

  try {
    const tokenRes = await axios.post(
      "https://oauth2.googleapis.com/token",
      {
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code"
      }
    );

    const { access_token, refresh_token } = tokenRes.data;
    const profileRes = await axios.get("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    let tenant = { accountId: "", userId: "", accessToken: "" };
    if (state.includes(":")) {
      const [accountId, userId] = state.split(":");
      const mondayUser = await MondayUser.findOne({ accountId, userId });
      if (mondayUser) {
        tenant = {
          accountId: mondayUser.accountId,
          userId: mondayUser.userId,
          accessToken: mondayUser.accessToken
        };
      }
    }

    const created = await EmailAccount.create({
      ...tenant,
      provider: "google",
      email: profileRes.data.email,
      displayName: profileRes.data.name || "",
      accessToken: access_token,
      refreshToken: refresh_token || ""
    });
    console.log("Google account saved", created._id.toString(), created.email);

    const origin = process.env.FRONTEND_REDIRECT_URI || "http://localhost:3000";
    res.set("Content-Type", "text/html");
    res.send(`<!doctype html>
<html>
  <head><meta charset="utf-8"></head>
  <body>
    <script>
      (function(){
        try {
          if (window.opener) {
            window.opener.postMessage({ provider: "google", status: "connected" }, "${origin}");
          }
        } catch (e) {}
        window.close();
      })();
    </script>
    <p>Connected. You can close this window.</p>
  </body>
</html>`);
  } catch (error) {
    console.log("Google OAuth failed", error.response?.data || error.message);
    res.status(500).send("Google OAuth failed");
  }
};

const buildMicrosoftAuthUrl = (state) => {
  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID || "",
    response_type: "code",
    redirect_uri: process.env.MICROSOFT_REDIRECT_URI || "",
    response_mode: "query",
    scope: "openid profile email offline_access https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/User.Read",
    prompt: "consent",
    state: state || ""
  });
  return `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID || "common"}/oauth2/v2.0/authorize?${params.toString()}`;
};

exports.microsoftAuthStart = (req, res) => {
  if (!process.env.MICROSOFT_CLIENT_ID || !process.env.MICROSOFT_REDIRECT_URI) {
    return res.status(500).send("Microsoft OAuth not configured");
  }
  res.redirect(buildMicrosoftAuthUrl(req.query.state));
};

exports.microsoftAuthCallback = async (req, res) => {
  const code = req.query.code;
  const state = req.query.state || "";
  if (!code) return res.status(400).send("Missing code");

  try {
    const tokenRes = await axios.post(
      `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID || "common"}/oauth2/v2.0/token`,
      new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET || "",
        code,
        redirect_uri: process.env.MICROSOFT_REDIRECT_URI,
        grant_type: "authorization_code",
        scope: "https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/User.Read offline_access"
      }).toString(),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const { access_token, refresh_token } = tokenRes.data;
    const profileRes = await axios.get("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    let tenant = { accountId: "", userId: "", accessToken: "" };
    if (state.includes(":")) {
      const [accountId, userId] = state.split(":");
      const mondayUser = await MondayUser.findOne({ accountId, userId });
      if (mondayUser) {
        tenant = {
          accountId: mondayUser.accountId,
          userId: mondayUser.userId,
          accessToken: mondayUser.accessToken
        };
      }
    }

    const created = await EmailAccount.create({
      ...tenant,
      provider: "microsoft",
      email: profileRes.data.mail || profileRes.data.userPrincipalName,
      displayName: profileRes.data.displayName || "",
      accessToken: access_token,
      refreshToken: refresh_token || ""
    });
    console.log("Microsoft account saved", created._id.toString(), created.email);

    const origin = process.env.FRONTEND_REDIRECT_URI || "http://localhost:3000";
    res.set("Content-Type", "text/html");
    res.send(`<!doctype html>
<html>
  <head><meta charset="utf-8"></head>
  <body>
    <script>
      (function(){
        try {
          if (window.opener) {
            window.opener.postMessage({ provider: "microsoft", status: "connected" }, "${origin}");
          }
        } catch (e) {}
        window.close();
      })();
    </script>
    <p>Connected. You can close this window.</p>
  </body>
</html>`);
  } catch (error) {
    console.log("Microsoft OAuth failed", error.response?.data || error.message);
    res.status(500).send("Microsoft OAuth failed");
  }
};
