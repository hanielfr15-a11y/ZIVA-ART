module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const id = req.query.id || req.query.paymentId;
  if (!id) return res.status(400).json({ error: "ID de pagamento ausente" });

  const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN || "APP_USR-6831589121833969-082409-9cba38328b231e44ee8a872de03e5733-522171992";
  try {
    const mpResp = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
      headers: { "Authorization": `Bearer ${MP_ACCESS_TOKEN}` }
    });
    const data = await mpResp.json();
    return res.status(mpResp.status || 200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};