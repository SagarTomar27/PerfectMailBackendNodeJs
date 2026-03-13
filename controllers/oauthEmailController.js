const axios = require("axios");
const EmailAccount = require("../models/EmailAccount");

const buildGoogleAuthUrl = () => {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || "",
    redirect_uri: process.env.GOOGLE_REDIRECT_URI || "",
    response_type: "code",
    scope: "openid email profile https://www.googleapis.com/auth/gmail.send",
    access_type: "offline",
    prompt: "consent"
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
};

exports.googleAuthStart = (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_REDIRECT_URI) {
    return res.status(500).send("Google OAuth not configured");
  }
  res.redirect(buildGoogleAuthUrl());
};

exports.googleAuthCallback = async (req, res) => {
  const code = req.query.code;
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

    const account = await EmailAccount.create({
      provider: "google",
      email: profileRes.data.email,
      displayName: profileRes.data.name || "",
      accessToken: access_token,
      refreshToken: refresh_token || ""
    });

    res.redirect("http://localhost:3000/templates?account=connected");
  } catch (error) {
    res.status(500).send("Google OAuth failed");
  }
};

const buildMicrosoftAuthUrl = () => {
  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID || "",
    response_type: "code",
    redirect_uri: process.env.MICROSOFT_REDIRECT_URI || "",
    response_mode: "query",
    scope: "openid profile email offline_access https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/User.Read",
    prompt: "consent"
  });
  return `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID || "common"}/oauth2/v2.0/authorize?${params.toString()}`;
};

exports.microsoftAuthStart = (req, res) => {
  if (!process.env.MICROSOFT_CLIENT_ID || !process.env.MICROSOFT_REDIRECT_URI) {
    return res.status(500).send("Microsoft OAuth not configured");
  }
  res.redirect(buildMicrosoftAuthUrl());
};

exports.microsoftAuthCallback = async (req, res) => {
  const code = req.query.code;
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

    await EmailAccount.create({
      provider: "microsoft",
      email: profileRes.data.mail || profileRes.data.userPrincipalName,
      displayName: profileRes.data.displayName || "",
      accessToken: access_token,
      refreshToken: refresh_token || ""
    });

    res.redirect("http://localhost:3000/templates?account=connected");
  } catch (error) {
    res.status(500).send("Microsoft OAuth failed");
  }
};
