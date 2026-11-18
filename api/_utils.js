const crypto = require("crypto");

function getRedisConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";
  return { url: url.replace(/\/$/, ""), token, configured: Boolean(url && token) };
}

async function redisGet(key) {
  const { url, token, configured } = getRedisConfig();
  if (!configured) return null;
  const res = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(`Redis GET failed: ${res.status}`);
  const data = await res.json();
  if (data.result === null || data.result === undefined) return null;
  try {
    return JSON.parse(data.result);
  } catch {
    return data.result;
  }
}

async function redisSet(key, value) {
  const { url, token, configured } = getRedisConfig();
  if (!configured) return false;
  const payload = typeof value === "string" ? value : JSON.stringify(value);
  const res = await fetch(`${url}/set/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`Redis SET failed: ${res.status}`);
  return true;
}

function getAuthSecret() {
  return process.env.CRM_SECRET || process.env.CRM_PASSWORD || "locallift-studio-v3-secret";
}

function getCrmPassword() {
  return process.env.CRM_PASSWORD || "locallift2026";
}

function signToken(ttlSeconds = 60 * 60 * 24 * 7) {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const sig = crypto.createHmac("sha256", getAuthSecret()).update(String(exp)).digest("hex");
  return `${exp}.${sig}`;
}

function verifyToken(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) return false;
  const [expStr, sig] = token.split(".");
  const exp = Number(expStr);
  if (!exp || exp < Math.floor(Date.now() / 1000)) return false;
  const expected = crypto.createHmac("sha256", getAuthSecret()).update(expStr).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

function extractToken(req) {
  const auth = req.headers.authorization || "";
  if (auth.startsWith("Bearer ")) return auth.slice(7).trim();
  const cookie = req.headers.cookie || "";
  const match = cookie.match(/(?:^|;\s*)ll_crm_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

module.exports = {
  getRedisConfig,
  redisGet,
  redisSet,
  getCrmPassword,
  signToken,
  verifyToken,
  extractToken
};
