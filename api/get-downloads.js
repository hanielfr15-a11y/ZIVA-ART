module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-user-email");
  if (req.method === "OPTIONS") return res.status(200).end();

  let body = {};
  if (req.body) {
    try {
      body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    } catch (e) {}
  }

  let email = body.email || "";
  if (!email && req.headers && req.headers["x-user-email"]) {
    try { email = decodeURIComponent(req.headers["x-user-email"]); } catch (e) { email = req.headers["x-user-email"]; }
  }
  if (!email && req.query && req.query.email) {
    email = req.query.email;
  }
  if (!email && req.url) {
    try {
      const u = new URL(req.url, "http://localhost");
      email = u.searchParams.get("email") || "";
    } catch (e) {}
  }
  email = (email || "").trim().toLowerCase();

  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "E-mail válido é obrigatório." });
  }

  const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN || "APP_USR-6831589121833969-082409-9cba38328b231e44ee8a872de03e5733-522171992";
  const SUPABASE_URL = process.env.SUPABASE_URL || "https://oxokzbbiyvbqossudrdk.supabase.co";
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94b2t6YmJpeXZicW9zc3VkcmRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxNDAwNTcsImV4cCI6MjEwMjcxNjA1N30.Ys96hk3Y_Su7pgaTuq38TJPqJblwfyEbLzNAU_wXnNM";

  try {
    // 1. Busca os últimos pagamentos aprovados no Mercado Pago
    const mpResp = await fetch("https://api.mercadopago.com/v1/payments/search?sort=date_created&criteria=desc&limit=50", {
      headers: { "Authorization": `Bearer ${MP_ACCESS_TOKEN}` }
    });
    const mpData = await mpResp.json();
    const payments = mpData.results || [];

    const norm = (s) => (s || "").toLowerCase().split("@")[0].replace(/[^a-z]/g, "").replace(/(.)\1+/g, "$1");
    const userNorm = norm(email);

    // 2. Filtra pagamentos aprovados do cliente por e-mail (exato ou com tolerância inteligente para nomes como aliany / alliany)
    const matchingPayments = payments.filter(p => {
      if (p.status !== "approved" || !p.payer) return false;
      const payerEmail = (p.payer.email || "").trim().toLowerCase();
      if (!payerEmail) return false;
      if (payerEmail === email) return true;

      const payerNorm = norm(payerEmail);
      if (userNorm.length >= 4 && payerNorm.length >= 4) {
        if (payerNorm.includes(userNorm) || userNorm.includes(payerNorm)) return true;
      }
      return false;
    });

    if (matchingPayments.length === 0) {
      return res.status(200).json({ downloads: [] });
    }

    // 3. Busca lista de produtos no Supabase para obter o link do arquivo .CDR
    let dbProducts = [];
    try {
      const respDb = await fetch(`${SUPABASE_URL}/rest/v1/produtos?select=nome,cdr_url,img_url`, {
        headers: {
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
        }
      });
      if (respDb.ok) {
        dbProducts = await respDb.json();
      }
    } catch (e) {
      console.warn("Aviso ao buscar produtos do Supabase:", e.message);
    }

    // 4. Monta lista de downloads autorizados
    const downloadsMap = new Map();

    for (const payment of matchingPayments) {
      const items = payment.metadata?.items || [];
      for (const item of items) {
        const itemName = (item.name || "").trim();
        if (!itemName || downloadsMap.has(itemName.toLowerCase())) continue;

        const match = dbProducts.find(p => (p.nome || "").trim().toLowerCase() === itemName.toLowerCase());
        let rawCdr = match ? match.cdr_url : "";
        let directUrl = "#";
        if (rawCdr) {
          const driveMatch = rawCdr.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([a-zA-Z0-9_-]+)/);
          directUrl = (driveMatch && driveMatch[1]) ? `https://drive.google.com/uc?export=download&id=${driveMatch[1]}` : rawCdr;
        }

        downloadsMap.set(itemName.toLowerCase(), {
          name: itemName,
          cdrUrl: directUrl,
          img: match ? match.img_url : "",
          date: payment.date_approved ? new Date(payment.date_approved).toLocaleDateString("pt-BR") : new Date().toLocaleDateString("pt-BR"),
          paymentId: payment.id
        });
      }
    }

    return res.status(200).json({ downloads: Array.from(downloadsMap.values()) });
  } catch (err) {
    console.error("Erro no get-downloads:", err);
    return res.status(500).json({ error: "Erro ao buscar downloads: " + err.message });
  }
};
