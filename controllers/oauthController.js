const axios = require("axios");

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

    console.log("Access Token:", accessToken);

    res.send("OAuth Success");

  } catch (error) {

    console.log(error);

    res.send("Token exchange failed");

  }

};