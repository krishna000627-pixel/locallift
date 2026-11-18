const { getRedisConfig, redisGet, redisSet } = require("./_utils");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const business = String(body.business || "").trim();
    const city = String(body.city || "").trim();
    const phone = String(body.phone || "").trim();
    const plan = String(body.plan || "").trim();

    if (!business || !phone) {
      return res.status(400).json({ ok: false, error: "Business name and phone are required" });
    }

    const { configured } = getRedisConfig();
    if (!configured) {
      return res.status(200).json({ ok: true, savedToDb: false, note: "DB env vars not configured yet" });
    }

    const existing = (await redisGet("ll:inquiries")) || [];
    const list = Array.isArray(existing) ? existing : [];
    const entry = {
      id: "req_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
      business,
      city,
      phone,
      plan,
      status: "New",
      createdAt: new Date().toISOString()
    };
    list.unshift(entry);
    await redisSet("ll:inquiries", list.slice(0, 500));

    return res.status(200).json({ ok: true, savedToDb: true, entry });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message || "Failed to save request" });
  }
};
