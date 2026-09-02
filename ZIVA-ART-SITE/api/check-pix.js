export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const { id } = req.query;
  const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN || "APP_USR-6831589121833969-082409-9cba38328b231e44ee8a872de03e5733-522171992";
  try {
    const mpResp = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
      headers: { "Authorization": `Bearer ${MP_ACCESS_TOKEN}` }
    });
    const data = await mpResp.json();
    return res.status(mpResp.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}