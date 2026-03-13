const axios = require("axios");
const MondayUser = require("../models/MondayUser");

exports.oauthCallback = async (req, res) => {

  const code = req.query.code;

  if (!code) {
    return res.send("OAuth Failed");
  }

  try {

    const response = await axios.post(
      "https://auth.monday.com/oauth2/token",
      {
        client_id: process.env.MONDAY_CLIENT_ID,
        client_secret: process.env.MONDAY_CLIENT_SECRET,
        code: code,
        redirect_uri: process.env.MONDAY_REDIRECT_URI
      }
    );

    const accessToken = response.data.access_token;

    const meQuery = {
      query: `query { me { id name email account { id } } }`
    };

    const meRes = await axios.post(
      "https://api.monday.com/v2",
      meQuery,
      { headers: { Authorization: accessToken } }
    );

    const me = meRes.data && meRes.data.data ? meRes.data.data.me : null;

    if (me) {
      await MondayUser.findOneAndUpdate(
        { userId: String(me.id), accountId: String(me.account.id) },
        {
          userId: String(me.id),
          accountId: String(me.account.id),
          name: me.name || "",
          email: me.email || "",
          accessToken: accessToken
        },
        { upsert: true, new: true }
      );
    }

    if (me) {
      const params = new URLSearchParams({
        accountId: String(me.account.id),
        userId: String(me.id),
        accessToken: accessToken
      });
      return res.redirect(`${process.env.FRONTEND_REDIRECT_URI}/monday-auth?${params.toString()}`);
    }

    res.send("OAuth Success");

  } catch (error) {

    console.log(error);

    res.send("Token exchange failed");

  }

};
