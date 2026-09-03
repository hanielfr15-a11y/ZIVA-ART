module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  const id = req.query?.id || req.query?.paymentId;
  if (!id) return res.status(400).json({ error: "ID de pagamento ausente" });

  const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN || "APP_USR-6831589121833969-082409-9cba38328b231e44ee8a872de03e5733-522171992";
  const SUPABASE_URL = process.env.SUPABASE_URL || "https://oxokzbbiyvbqossudrdk.supabase.co";
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94b2t6YmJpeXZicW9zc3VkcmRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxNDAwNTcsImV4cCI6MjEwMjcxNjA1N30.Ys96hk3Y_Su7pgaTuq38TJPqJblwfyEbLzNAU_wXnNM";

  try {
    // 1. Consulta o status oficial direto na API do Mercado Pago
    const mpResp = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
      headers: { "Authorization": `Bearer ${MP_ACCESS_TOKEN}` }
    });
    const paymentData = await mpResp.json();

    if (!mpResp.ok || !paymentData) {
      return res.status(mpResp.status || 400).json(paymentData);
    }

    // 2. Se o pagamento NÃO estiver aprovado, retorna o status sem liberar downloads
    if (paymentData.status !== "approved") {
      return res.status(200).json({
        id: paymentData.id,
        status: paymentData.status,
        status_detail: paymentData.status_detail
      });
    }

    // 3. Pagamento APROVADO: busca os links legítimos de download dos produtos comprados
    let downloadLinks = [];
    try {
      const respDb = await fetch(`${SUPABASE_URL}/rest/v1/produtos?select=nome,cdr_url,img_url`, {
        headers: {
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
        }
      });
      if (respDb.ok) {
        const dbProducts = await respDb.json();
        const boughtItems = paymentData.metadata?.items || [];

        downloadLinks = boughtItems.map(item => {
          const match = dbProducts.find(p => (p.nome || "").trim().toLowerCase() === (item.name || "").trim().toLowerCase());
          let rawCdr = match ? match.cdr_url : "";
          let directUrl = "#";
          if (rawCdr) {
            const driveMatch = rawCdr.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([a-zA-Z0-9_-]+)/);
            directUrl = (driveMatch && driveMatch[1]) ? `https://drive.google.com/uc?export=download&id=${driveMatch[1]}` : rawCdr;
          }
          return {
            name: item.name,
            cdrUrl: directUrl,
            img: match ? match.img_url : ""
          };
        });
      }
    } catch (e) {
      console.warn("Aviso ao buscar links de download após aprovação:", e.message);
    }

    return res.status(200).json({
      id: paymentData.id,
      status: "approved",
      status_detail: paymentData.status_detail,
      downloads: downloadLinks
    });
  } catch (err) {
    return res.status(500).json({ error: "Erro ao verificar status do PIX: " + err.message });
  }
};