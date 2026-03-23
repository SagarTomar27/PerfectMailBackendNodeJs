const axios = require("axios");
const MondayUser = require("../models/MondayUser");

const normalizeToken = (value) => {
  const raw = String(value || "").trim();
  return raw.replace(/^bearer\s+/i, "");
};

const getAccessToken = async (req) => {
  const headerToken = normalizeToken(req.headers["x-access-token"] || "");
  if (headerToken) return headerToken;

  const accountId = req.headers["x-account-id"] || "";
  const userId = req.headers["x-user-id"] || "";
  if (accountId && userId) {
    const user = await MondayUser.findOne({ accountId, userId });
    return normalizeToken(user?.accessToken || "");
  }
  if (process.env.MONDAY_API_TOKEN) {
    return normalizeToken(process.env.MONDAY_API_TOKEN);
  }
  return "";
};

exports.boardList = async (req, res) => {
  try {
    const accessToken = await getAccessToken(req);
    if (!accessToken) {
      return res.status(400).json({ error: "Missing Monday access token" });
    }

    const query = `
      query {
        boards(limit: 50) {
          id
          name
        }
      }
    `;

    const response = await axios.post(
      "https://api.monday.com/v2",
      { query },
      {
        headers: {
          Authorization: accessToken,
          "Content-Type": "application/json"
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    const details = error.response?.data || error.message;
    console.log("ERROR:", details);
    res.status(500).json({ error: "Failed to fetch boards", details });
  }
};
