module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Idempotency-Key");
  if (req.method === "OPTIONS") return res.status(200).end();

  const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN || "APP_USR-6831589121833969-082409-9cba38328b231e44ee8a872de03e5733-522171992";

  try {
    const bodyData = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const mpResp = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": req.headers["x-idempotency-key"] || `${Date.now()}-${Math.random()}`
      },
      body: JSON.stringify(bodyData)
    });
    const data = await mpResp.json();
    return res.status(mpResp.status || 200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};