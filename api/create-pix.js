module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Idempotency-Key");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN || "APP_USR-6831589121833969-082409-9cba38328b231e44ee8a872de03e5733-522171992";
  const SUPABASE_URL = process.env.SUPABASE_URL || "https://oxokzbbiyvbqossudrdk.supabase.co";
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94b2t6YmJpeXZicW9zc3VkcmRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxNDAwNTcsImV4cCI6MjEwMjcxNjA1N30.Ys96hk3Y_Su7pgaTuq38TJPqJblwfyEbLzNAU_wXnNM";

  try {
    const bodyData = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const { items, payer, couponCode } = bodyData;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Nenhum item selecionado para pagamento." });
    }
    if (!payer || !payer.email) {
      return res.status(400).json({ error: "E-mail do comprador é obrigatório." });
    }

    // 1. Busca os produtos no Supabase para validar preço real
    let dbProducts = [];
    try {
      const respDb = await fetch(`${SUPABASE_URL}/rest/v1/produtos?select=nome,price,cdr_url`, {
        headers: {
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
        }
      });
      if (respDb.ok) {
        dbProducts = await respDb.json();
      }
    } catch (e) {
      console.warn("Aviso ao buscar produtos do Supabase no backend:", e.message);
    }

    // 2. Calcula subtotal com itens verificados
    let subtotal = 0;
    const verifiedItems = [];

    for (const it of items) {
      const dbMatch = dbProducts.find(p => (p.nome || "").trim().toLowerCase() === (it.name || "").trim().toLowerCase());
      const realPrice = dbMatch && Number(dbMatch.price) > 0 ? Number(dbMatch.price) : (Number(it.price) || 11.99);
      const qty = Math.max(1, Number(it.qty || 1));
      subtotal += realPrice * qty;
      verifiedItems.push({
        id: it.id || "art-digital",
        name: dbMatch ? dbMatch.nome : (it.name || "Arte Digital"),
        price: realPrice,
        qty: qty
      });
    }

    // 3. Validação de cupons
    const validCoupons = {
      "ZIVA10": 10,
      "PRIMEIRACOMPRA": 15,
      "ZIVA20": 20,
      "ZIVA50": 50,
      "VIP100": 99
    };

    let discountPercent = 0;
    if (couponCode && validCoupons[String(couponCode).trim().toUpperCase()]) {
      discountPercent = validCoupons[String(couponCode).trim().toUpperCase()];
    }

    const discountVal = subtotal * (discountPercent / 100);
    const finalAmount = Number(Math.max(0.50, subtotal - discountVal).toFixed(2));
    const description = verifiedItems.map(i => i.name).join(", ").substring(0, 100);

    // 4. Monta objeto do comprador seguro
    const payerData = {
      email: String(payer.email).trim(),
      first_name: String(payer.first_name || "Cliente").trim(),
      last_name: String(payer.last_name || "Ziva").trim()
    };
    if (payer.identification && payer.identification.number) {
      const cleanCpf = String(payer.identification.number).replace(/\D/g, "");
      if (cleanCpf.length === 11) {
        payerData.identification = {
          type: "CPF",
          number: cleanCpf
        };
      }
    }

    // 5. Payload oficial exigido pelo Mercado Pago
    const mpPayload = {
      transaction_amount: finalAmount,
      description: `ZIVA ART: ${description}`,
      payment_method_id: "pix",
      payer: payerData,
      metadata: {
        items: verifiedItems.map(i => ({ name: i.name, qty: i.qty, price: i.price })),
        coupon_applied: couponCode || null,
        discount_percent: discountPercent
      }
    };

    // 6. Envia para o Mercado Pago
    const idempotencyKey = req.headers["x-idempotency-key"] || `${Date.now()}-${Math.random()}`;
    const mpResp = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": idempotencyKey
      },
      body: JSON.stringify(mpPayload)
    });

    const data = await mpResp.json();
    return res.status(mpResp.status || 200).json(data);
  } catch (err) {
    console.error("Erro interno no create-pix:", err);
    return res.status(500).json({ error: "Falha interna ao processar pagamento PIX: " + err.message });
  }
};