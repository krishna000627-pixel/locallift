const { getCrmPassword, signToken, verifyToken, extractToken } = require("./_utils");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "GET") {
    const token = extractToken(req);
    return res.status(200).json({ authenticated: verifyToken(token) });
  }

  if (req.method === "POST") {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    if (body.action === "logout") {
      res.setHeader("Set-Cookie", "ll_crm_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
      return res.status(200).json({ ok: true });
    }
    const password = String(body.password || "");
    if (!password || password !== getCrmPassword()) {
      return res.status(401).json({ ok: false, error: "Invalid team passcode" });
    }
    const token = signToken();
    res.setHeader(
      "Set-Cookie",
      `ll_crm_token=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`
    );
    return res.status(200).json({ ok: true, token });
  }

  return res.status(405).json({ error: "Method not allowed" });
};
