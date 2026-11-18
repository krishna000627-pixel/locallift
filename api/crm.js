const { getRedisConfig, redisGet, redisSet, verifyToken, extractToken } = require("./_utils");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  const token = extractToken(req);
  if (!verifyToken(token)) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  const { configured } = getRedisConfig();

  if (req.method === "GET") {
    if (!configured) {
      return res.status(200).json({
        ok: true,
        dbConnected: false,
        state: { statuses: {}, customLeads: [], activityLog: [], sopChecks: {} },
        inquiries: []
      });
    }
    try {
      const [state, inquiries] = await Promise.all([
        redisGet("ll:crm_state"),
        redisGet("ll:inquiries")
      ]);
      return res.status(200).json({
        ok: true,
        dbConnected: true,
        state: state || { statuses: {}, customLeads: [], activityLog: [], sopChecks: {} },
        inquiries: Array.isArray(inquiries) ? inquiries : []
      });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  }

  if (req.method === "POST") {
    if (!configured) {
      return res.status(200).json({ ok: true, dbConnected: false });
    }
    try {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
      if (body.action === "update_inquiry_status") {
        const list = (await redisGet("ll:inquiries")) || [];
        const updated = (Array.isArray(list) ? list : []).map((item) =>
          item.id === body.id ? { ...item, status: body.status } : item
        );
        await redisSet("ll:inquiries", updated);
        return res.status(200).json({ ok: true, dbConnected: true, inquiries: updated });
      }

      if (body.action === "delete_inquiry") {
        const list = (await redisGet("ll:inquiries")) || [];
        const updated = (Array.isArray(list) ? list : []).filter((item) => item.id !== body.id);
        await redisSet("ll:inquiries", updated);
        return res.status(200).json({ ok: true, dbConnected: true, inquiries: updated });
      }

      // Default: save CRM shared state
      const current = (await redisGet("ll:crm_state")) || {};
      const nextState = {
        statuses: body.statuses !== undefined ? body.statuses : (current.statuses || {}),
        customLeads: body.customLeads !== undefined ? body.customLeads : (current.customLeads || []),
        activityLog: body.activityLog !== undefined ? body.activityLog : (current.activityLog || []),
        sopChecks: body.sopChecks !== undefined ? body.sopChecks : (current.sopChecks || {}),
        updatedAt: new Date().toISOString()
      };
      await redisSet("ll:crm_state", nextState);
      return res.status(200).json({ ok: true, dbConnected: true });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
};
