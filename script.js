/* =========================================================
   ZIVA ART - MASTER SCRIPT (INTEGRADO AO SUPABASE & MODAL PRO)
   ========================================================= */

// --- CONFIGURAÇÃO DO SUPABASE ---
const SUPABASE_URL = "https://oxokzbbiyvbqossudrdk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94b2t6YmJpeXZicW9zc3VkcmRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxNDAwNTcsImV4cCI6MjEwMjcxNjA1N30.Ys96hk3Y_Su7pgaTuq38TJPqJblwfyEbLzNAU_wXnNM";

// --- CONFIGURAÇÃO DO MERCADO PAGO ---
const MP_PUBLIC_KEY = "APP_USR-93cad6a3-8d80-4fa6-92aa-2c0c5ee21b61";
// Token privado removido do frontend por seguranca (processado via /api/ no backend)
let mp = null;
if (window.MercadoPago) {
    try {
        mp = new window.MercadoPago(MP_PUBLIC_KEY, { locale: "pt-BR" });
    } catch (e) {
        console.warn("Mercado Pago SDK:", e);
    }
}

// Converte link do Google Drive em link de download direto instantâneo
function getDirectDownloadUrl(url) {
    if (!url) return "#";
    const driveMatch = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([a-zA-Z0-9_-]+)/);
    if (driveMatch && driveMatch[1]) {
        return `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
    }
    return url;
}

// Inicializa cliente Supabase
let supabaseClient = null;
let db = null;
if (window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    db = supabaseClient;
}

// Lista dinâmica de produtos (sincronizada com Supabase)
let products = [
    {
        id: "arte-dragon-red-0",
        name: "ARTE DRAGON RED",
        cat: "INTERCLASS, MASCOTE",
        price: 11.99,
        old: 55,
        img: "https://lh3.googleusercontent.com/d/110nCtDpYhcCp3hGeSE8WICsK_SQ1lCIu"
    },
    {
        id: "arte-mumia-1",
        name: "ARTE MUMIA",
        cat: "INTERCLASS",
        price: 11.99,
        old: 55,
        img: "https://lh3.googleusercontent.com/d/1PRPU2rahaecLE1PsoMAEGDE7mciCSITK"
    }
];
let currentFilter = "all";
let currentSort = "default";
let searchQuery = "";
let currentModalProductId = null;

/* --- CONFIGURAÇÕES INICIAIS (CARRINHO E FAVORITOS) --- */
let cart = JSON.parse(localStorage.getItem("zivaCart") || "[]");
let favorites = JSON.parse(localStorage.getItem("zivaFavs") || "[]");
const money = (val) => Number(val || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Placeholder SVG inline (sem dependência externa)
const PLACEHOLDER_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='500' height='500'%3E%3Crect width='500' height='500' fill='%230f0f0f'/%3E%3Ctext x='50%25' y='50%25' font-family='Arial' font-size='20' fill='%23444' text-anchor='middle' dy='.3em'%3EZIVA ART%3C/text%3E%3C/svg%3E";

// Converte link do Google Drive em link de imagem direta para exibição na web
function formatDriveImageUrl(url) {
    if (!url) return PLACEHOLDER_IMG;
    const driveMatch = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([a-zA-Z0-9_-]+)/);
    if (driveMatch && driveMatch[1]) {
        return `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
    }
    return url;
}

/* =========================================================
   1. CARREGAR PRODUTOS DO SUPABASE (VITRINE SEGURA)
   ========================================================= */

async function fetchProductsFromSupabase() {
    const container = document.getElementById("products");

    if (container && products.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #888;">
                <i class="fa-solid fa-spinner fa-spin" style="font-size: 24px; color: #ff0000; margin-bottom: 10px;"></i>
                <p>Carregando catálogo de artes...</p>
            </div>
        `;
    }

    if (!db && window.supabase) {
        db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        supabaseClient = db;
    }

    let rawData = null;

    // 1. Tenta buscar via SDK do Supabase
    if (db) {
        try {
            const { data, error } = await db.from("produtos").select("nome, cat, price, old_price, img_url");
            if (!error && data && data.length > 0) {
                rawData = data;
            }
        } catch (e) {
            console.warn("Tentando fallback via REST API direta...");
        }
    }

    // 2. Fallback garantido via REST API direta do Supabase
    if (!rawData || rawData.length === 0) {
        try {
            const resp = await fetch(`${SUPABASE_URL}/rest/v1/produtos?select=nome,cat,price,old_price,img_url`, {
                headers: {
                    "apikey": SUPABASE_ANON_KEY,
                    "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
                }
            });
            if (resp.ok) {
                const restData = await resp.json();
                if (Array.isArray(restData) && restData.length > 0) {
                    rawData = restData;
                }
            }
        } catch (err) {
            console.error("Erro no fallback REST:", err);
        }
    }

    if (rawData && rawData.length > 0) {
        products = rawData.map((item, idx) => ({
            id: item.id || (item.nome || "art").trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + idx,
            name: item.nome || item.name || "Arte Sem Nome",
            cat: item.cat || "Geral",
            price: Number(item.price) || 0,
            old: Number(item.old_price) || 0,
            img: formatDriveImageUrl(item.img_url)
        }));
        console.log("✅ Produtos sincronizados do Supabase:", products);
        applyFilterAndRender();
    } else if (products.length === 0) {
        console.log("Tabela vazia no Supabase. Aguardando cadastro de artes.");
        renderEmptyState("Nenhuma arte cadastrada ainda no Supabase.", "Adicione suas artes na tabela 'produtos' para vê-las aqui!");
    } else {
        // Mantém as artes já carregadas
        applyFilterAndRender();
    }
}

function renderEmptyState(msg, tip = "") {
    const container = document.getElementById("products");
    const countLabel = document.getElementById("catalogResults");
    if (countLabel) countLabel.innerText = "Há 0 resultados no total";
    if (container) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: #666; border: 1px dashed #222; border-radius: 8px;">
                <i class="fa-solid fa-cloud-arrow-up" style="font-size: 32px; color: #ff0000; margin-bottom: 15px;"></i>
                <p style="font-size: 15px; color: #eee; font-weight: 600;">${msg}</p>
                <small style="color: #888; font-size: 13px; line-height: 1.6; display: block; max-width: 480px; margin: 8px auto 0;">${tip || "Cadastre linhas na tabela 'produtos' no Supabase para vê-las aqui."}</small>
            </div>
        `;
    }
}

/* =========================================================
   2. FILTROS, ORDENAÇÃO E RENDERIZAÇÃO
   ========================================================= */

function applyFilterAndRender() {
    let list = [...products];

    // Filtro por categoria inteligente
    if (currentFilter !== "all") {
        const f = currentFilter.toLowerCase();
        if (f.includes("mascot")) {
            list = list.filter((p) => p.cat && p.cat.toLowerCase().includes("mascot"));
        } else if (f.includes("interclas")) {
            list = list.filter((p) => p.cat && p.cat.toLowerCase().includes("interclas"));
        } else if (f === "famosas") {
            list = list.filter((p) => (p.cat && p.cat.toLowerCase().includes("famos")) || p.old > p.price);
        } else if (f === "outros") {
            list = list.filter((p) => {
                const c = (p.cat || "").toLowerCase();
                return !c.includes("mascot") && !c.includes("interclas");
            });
        } else {
            list = list.filter((p) => p.cat && p.cat.toLowerCase().includes(f));
        }
    }

    // Filtro por busca
    if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        list = list.filter((p) => 
            (p.name && p.name.toLowerCase().includes(q)) || 
            (p.cat && p.cat.toLowerCase().includes(q))
        );
    }

    // Ordenação
    if (currentSort === "low") {
        list.sort((a, b) => a.price - b.price);
    } else if (currentSort === "high") {
        list.sort((a, b) => b.price - a.price);
    } else if (currentSort === "recent") {
        list = [...list].reverse();
    }

    renderProducts(list);
}

function renderProducts(list = products) {
    const container = document.getElementById("products");
    const countLabel = document.getElementById("catalogResults");
    if (!container) return;

    if (countLabel) countLabel.innerText = `Há ${list.length} resultado(s) no total`;

    if (list.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #777;">
                <p>Nenhuma arte encontrada com os filtros selecionados.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = list.map((p) => {
        const isFav = favorites.some(f => String(f) === String(p.id));
        const discount = p.old > p.price ? Math.round((1 - p.price / p.old) * 100) : 0;
        
        return `
            <article class="product" onclick="openProductPage('${p.id}')" style="cursor: pointer;">
                <div class="product-img">
                    <img src="${p.img}" alt="${p.name}" draggable="false" oncontextmenu="return false;" onerror="this.src='${PLACEHOLDER_IMG}'">
                    
                    <!-- Botão Favoritar -->
                    <button class="wishlist-btn ${isFav ? 'active' : ''}" onclick="event.stopPropagation(); toggleFav(this, '${p.id}')" title="Favoritar">
                        <i class="${isFav ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
                    </button>

                    ${discount > 0 ? `<span class="tag">-${discount}%</span>` : ''}
                </div>
                <div class="product-info">
                    <small>${p.cat}</small>
                    <h3>${p.name}</h3>
                    <div class="price">
                        <strong>${money(p.price)}</strong>
                        ${p.old > p.price ? `<del>${money(p.old)}</del>` : ''}
                    </div>
                    <div class="product-actions">
                        <button class="btn-card-buy" onclick="event.stopPropagation(); buyNowDirect('${p.id}')">
                            <i class="fa-solid fa-bolt"></i> COMPRAR AGORA
                        </button>
                        <button class="btn-card-cart" onclick="event.stopPropagation(); addCart('${p.id}')">
                            <i class="fa-solid fa-cart-plus"></i> Adicionar ao Carrinho
                        </button>
                    </div>
                </div>
            </article>
        `;
    }).join("");
}

/* =========================================================
   3. PÁGINA DEDICADA DA ARTE (SINGLE PRODUCT PAGE)
   ========================================================= */

function openProductPage(id) {
    const p = products.find(prod => String(prod.id) === String(id));
    if (!p) return;

    currentModalProductId = p.id;

    // Imagem
    const img = document.getElementById('pvImg');
    if (img) { img.src = p.img; img.alt = p.name; }

    // Textos
    const title = document.getElementById('pvTitle');
    const bread = document.getElementById('pvBreadTitle');
    const cat   = document.getElementById('pvCat');
    if (title) title.innerText = p.name;
    if (bread) bread.innerText = p.name.toUpperCase();
    if (cat)   cat.innerText  = p.cat;

    // Preço
    const priceEl    = document.getElementById('pvPrice');
    const oldPriceEl = document.getElementById('pvOldPrice');
    const tagEl      = document.getElementById('pvTag');
    if (priceEl) priceEl.innerText = money(p.price);
    if (oldPriceEl) {
        if (p.old > p.price) {
            oldPriceEl.innerText    = money(p.old);
            oldPriceEl.style.display = 'inline';
        } else {
            oldPriceEl.style.display = 'none';
        }
    }
    if (tagEl) {
        const disc = p.old > p.price ? Math.round((1 - p.price / p.old) * 100) : 0;
        if (disc > 0) {
            tagEl.innerText    = `-${disc}% OFF`;
            tagEl.style.display = 'inline';
        } else {
            tagEl.style.display = 'none';
        }
    }

    // WhatsApp
    const waBtn = document.getElementById('pvBtnWhats');
    if (waBtn) {
        const txt = encodeURIComponent(`Olá! Tenho interesse na arte "${p.name}". Gostaria de mais informações!`);
        waBtn.href = `https://wa.me/5511986424121?text=${txt}`;
    }

    // Botões compra
    const buyBtn  = document.getElementById('pvBtnBuy');
    const cartBtn = document.getElementById('pvBtnCart');
    if (buyBtn)  buyBtn.onclick  = () => buyNowDirect(p.id);
    if (cartBtn) cartBtn.onclick = () => addCart(p.id);

    // Produtos relacionados
    const relGrid = document.getElementById('pvRelated');
    if (relGrid) {
        const others = products.filter(x => String(x.id) !== String(p.id)).slice(0, 3);
        relGrid.innerHTML = others.map(o => {
            const d = o.old > o.price ? Math.round((1 - o.price / o.old) * 100) : 0;
            return `
                <article class="product" onclick="openProductPage('${o.id}')" style="cursor:pointer;">
                    <div class="product-img">
                        <img src="${o.img}" alt="${o.name}" draggable="false" oncontextmenu="return false;">
                        ${d > 0 ? `<span class="tag">-${d}%</span>` : ''}
                    </div>
                    <div class="product-info">
                        <small>${o.cat}</small>
                        <h3>${o.name}</h3>
                        <div class="price"><strong>${money(o.price)}</strong></div>
                        <div class="product-actions">
                            <button class="btn-card-buy" onclick="event.stopPropagation(); buyNowDirect('${o.id}')">
                                <i class="fa-solid fa-bolt"></i> COMPRAR AGORA
                            </button>
                        </div>
                    </div>
                </article>`;
        }).join('');
    }

    // Troca de visão com fade
    const homeView    = document.getElementById('homeView');
    const productView = document.getElementById('productView');
    if (homeView && productView) {
        homeView.classList.add('fading');
        setTimeout(() => {
            homeView.style.display    = 'none';
            homeView.classList.remove('fading');
            productView.style.display = 'block';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 300);
    }

    // URL hash
    history.pushState(null, '', '#arte=' + p.id);
}

function closeProductPage() {
    const homeView    = document.getElementById('homeView');
    const productView = document.getElementById('productView');
    if (homeView && productView) {
        productView.classList.add('fading');
        setTimeout(() => {
            productView.style.display = 'none';
            productView.classList.remove('fading');
            homeView.style.display    = 'block';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 300);
    }
    history.pushState(null, '', '#catalogo');
}

// Suporte ao botão voltar do navegador
window.addEventListener('popstate', () => {
    if (window.location.hash.startsWith('#arte=')) {
        const id = window.location.hash.replace('#arte=', '');
        openProductPage(id);
    } else {
        const pv = document.getElementById('productView');
        if (pv && pv.style.display !== 'none') closeProductPage();
    }
});

/* =========================================================
   4. LÓGICA DOS FAVORITOS
   ========================================================= */

function toggleFav(btn, productId) {
    btn.classList.toggle('active');
    const icon = btn.querySelector('i');
    const strId = String(productId);

    const exists = favorites.some(f => String(f) === strId);

    if (exists) {
        favorites = favorites.filter(f => String(f) !== strId);
        icon.classList.replace('fa-solid', 'fa-regular');
    } else {
        favorites.push(strId);
        icon.classList.replace('fa-regular', 'fa-solid');
    }

    saveFavs();
}

function saveFavs() {
    localStorage.setItem("zivaFavs", JSON.stringify(favorites));
    const favCount = document.getElementById('favCount');
    if (favCount) favCount.innerText = favorites.length;
    renderFavs();
}

function renderFavs() {
    const el = document.getElementById("favItems");
    if (!el) return;

    if (!favorites.length) {
        el.innerHTML = '<p class="empty" style="text-align:center;color:#555;margin-top:50px;">Sua lista está vazia.</p>';
        return;
    }

    el.innerHTML = favorites.map(id => {
        const p = products.find(item => String(item.id) === String(id));
        if (!p) return "";
        return `
            <div class="fav-product-item" style="display:flex; align-items:center; gap:15px; padding:15px 0; border-bottom:1px solid #111;">
                <img src="${p.img}" style="width:50px; height:50px; border-radius:5px; object-fit:cover;">
                <div style="flex:1">
                    <h4 style="font-size:12px; color:#fff; margin:0;">${p.name}</h4>
                    <small style="color:#ff0000; font-weight:bold; cursor:pointer;" onclick="addCart('${p.id}')">ADICIONAR AO CARRINHO</small>
                </div>
                <button style="background:none; border:none; color:#666; cursor:pointer; font-size:18px;" onclick="removeFav('${p.id}')">×</button>
            </div>
        `;
    }).join("");
}

function removeFav(id) {
    favorites = favorites.filter(favId => String(favId) !== String(id));
    saveFavs();
    applyFilterAndRender();
}

/* =========================================================
   5. LÓGICA DO CARRINHO
   ========================================================= */

function saveCart() {
    localStorage.setItem("zivaCart", JSON.stringify(cart));
    renderCart();
    const countEl = document.querySelector("#cartCount");
    if (countEl) countEl.textContent = cart.reduce((t, i) => t + i.qty, 0);
}

function addCart(id) {
    const strId = String(id);
    const found = cart.find(i => String(i.id) === strId);
    if (found) {
        found.qty++;
    } else {
        cart.push({ id: strId, qty: 1 });
    }
    saveCart();
    openCart();
}

function renderCart() {
    const el = document.querySelector("#cartItems");
    if (!el) return;

    // Só filtra itens 'fantasma' se os produtos JÁ foram carregados do Supabase
    // Evita apagar o carrinho durante a inicialização (antes do fetch terminar)
    if (products.length > 0) {
        const cartBefore = cart.length;
        cart = cart.filter(item => products.find(prod => String(prod.id) === String(item.id)));
        // Só salva se algo foi removido (evita loop)
        if (cart.length !== cartBefore) {
            localStorage.setItem("zivaCart", JSON.stringify(cart));
            const countEl = document.querySelector("#cartCount");
            if (countEl) countEl.textContent = cart.reduce((t, i) => t + i.qty, 0);
        }
    }

    if (!cart.length) {
        el.innerHTML = '<p class="empty">Seu carrinho está vazio.</p>';
        const totalEl = document.querySelector("#cartTotal");
        if (totalEl) totalEl.textContent = money(0);
        return;
    }
    let total = 0;
    el.innerHTML = cart.map(item => {
        const p = products.find(prod => String(prod.id) === String(item.id));
        if (!p) return "";
        total += p.price * item.qty;
        return `
            <div class="cart-item">
                <div class="mini" style="background-image:url(${p.img});background-size:cover;background-position:center;"></div>
                <div>
                    <h4>${p.name}</h4>
                    <span>${item.qty} × ${money(p.price)}</span>
                </div>
                <button style="margin-left:auto;background:none;border:0;color:#888;cursor:pointer;font-size:18px;" onclick="removeCart('${item.id}')">&times;</button>
            </div>
        `;
    }).join("");
    const totalEl = document.querySelector("#cartTotal");
    if (totalEl) totalEl.textContent = money(total);
}

function removeCart(id) {
    cart = cart.filter(i => String(i.id) !== String(id));
    saveCart();
}

function buyNowDirect(id) {
    const p = products.find(prod => String(prod.id) === String(id));
    if (!p) {
        addCart(id);
        openCart();
        return;
    }
    // Checkout direto do produto avulso
    openZivaCheckout([{
        id: p.id,
        name: p.name,
        cat: p.cat,
        price: p.price,
        qty: 1
    }]);
}

function openCart() { 
    document.querySelector("#cart")?.classList.add("open"); 
    document.querySelector("#overlay")?.classList.add("open"); 
}

function closeCart() { 
    document.querySelector("#cart")?.classList.remove("open"); 
    document.querySelector("#overlay")?.classList.remove("open"); 
}

/* =========================================================
   CHECKOUT MERCADO PAGO (PIX & CARTÃO 100% AUTOMATIZADO)
   ========================================================= */

async function initiateMercadoPagoCheckout(itemsToPay, buttonEl = null) {
    openZivaCheckout(itemsToPay);
    return;
    if (!itemsToPay || itemsToPay.length === 0) {
        alert("Seu carrinho está vazio!");
        return;
    }

    const originalContent = buttonEl ? buttonEl.innerHTML : "";
    if (buttonEl) {
        buttonEl.disabled = true;
        buttonEl.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> GERANDO PAGAMENTO...`;
    }

    try {
        const preferenceItems = itemsToPay.map(item => ({
            id: String(item.id),
            title: String(item.name || "Arte Digital ZIVA ART"),
            description: `Vetor ZIVA ART (CDR + Fontes TTF)`,
            quantity: Number(item.qty || 1),
            currency_id: "BRL",
            unit_price: Number(item.price)
        }));

        // Salva apenas nomes e IDs para a ordem (sem expor o link de download)
        const itemsMeta = encodeURIComponent(JSON.stringify(itemsToPay.map(i => ({
            id: i.id,
            name: i.name
        }))));

        const prefPayload = {
            items: preferenceItems,
            statement_descriptor: "ZIVA ART"
        };

        if (window.location.protocol.startsWith("http")) {
            const baseUrl = window.location.origin + window.location.pathname;
            prefPayload.back_urls = {
                success: `${baseUrl}?status=approved&items=${itemsMeta}`,
                pending: `${baseUrl}?status=pending&items=${itemsMeta}`,
                failure: `${baseUrl}?status=failure`
            };
            prefPayload.auto_return = "approved";
        }

        const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
            method: "POST",
            headers: {
                // Token de checkout externo movido para backend
                "Content-Type": "application/json"
            },
            body: JSON.stringify(prefPayload)
        });

        const data = await response.json();

        if (data && data.init_point) {
            localStorage.setItem("zivaLastPendingOrder", itemsMeta);
            // Redireciona para a tela oficial segura de pagamento do Mercado Pago (PIX / Cartão)
            window.location.href = data.init_point;
        } else {
            console.error("Erro na resposta do Mercado Pago:", data);
            alert("Não foi possível gerar a cobrança no momento. Verifique as credenciais ou tente novamente.");
            if (buttonEl) {
                buttonEl.disabled = false;
                buttonEl.innerHTML = originalContent;
            }
        }
    } catch (err) {
        console.error("Erro na requisição ao Mercado Pago:", err);
        alert("Erro de conexão ao processar pagamento. Tente novamente.");
        if (buttonEl) {
            buttonEl.disabled = false;
            buttonEl.innerHTML = originalContent;
        }
    }
}

async function checkPaymentReturn() {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentId = urlParams.get("payment_id") || urlParams.get("collection_id");
    const status = urlParams.get("status") || urlParams.get("collection_status");
    let itemsParam = urlParams.get("items") || localStorage.getItem("zivaLastPendingOrder");

    if (status === "approved" || status === "success") {
        let purchasedItems = [];
        try {
            if (itemsParam) {
                purchasedItems = JSON.parse(decodeURIComponent(itemsParam));
            }
        } catch (e) {
            console.warn("Erro ao parsear itens comprados:", e);
        }

        // Limpa o carrinho
        cart = [];
        saveCart();

        // Busca com segurança os links de download reais das artes compradas
        let unlockedArts = [];
        if (paymentId) {
            try {
                const checkUrl = window.location.origin.includes("localhost") || window.location.protocol.startsWith("http")
                    ? ("/api/check-pix?id=" + paymentId)
                    : ("http://localhost:5500/api/check-pix?id=" + paymentId);
                const resp = await fetch(checkUrl);
                if (resp.ok) {
                    const checkData = await resp.json();
                    if (checkData && checkData.status === "approved" && Array.isArray(checkData.downloads)) {
                        unlockedArts = checkData.downloads.map(dl => ({
                            name: dl.name,
                            cdr: dl.cdrUrl
                        }));
                    }
                }
            } catch (err) {
                console.error("Erro ao validar pagamento no backend:", err);
            }
        }
        // Salva na biblioteca permanente de downloads do usuário
        if (unlockedArts.length > 0) {
            try {
                const existingPurchases = JSON.parse(localStorage.getItem("zivaPurchasedArts") || "[]");
                unlockedArts.forEach(item => {
                    if (!existingPurchases.some(ex => ex.name === item.name)) {
                        existingPurchases.push(item);
                    }
                });
                localStorage.setItem("zivaPurchasedArts", JSON.stringify(existingPurchases));
            } catch (e) {}
        }

        // Abre modal de sucesso
        const successModal = document.getElementById("paymentSuccessModal");
        const listEl = document.getElementById("purchasedItemsList");

        if (successModal && listEl) {
            const listToRender = unlockedArts.length > 0 ? unlockedArts : purchasedItems;
            if (listToRender.length > 0) {
                listEl.innerHTML = listToRender.map(p => {
                    const downloadUrl = getDirectDownloadUrl(p.cdr);
                    return `
                        <div style="background:#111116; border:1px solid rgba(255,23,34,0.3); border-radius:10px; padding:15px; display:flex; justify-content:space-between; align-items:center; text-align:left; gap:12px;">
                            <div>
                                <strong style="display:block; color:#fff; font-size:14px; font-family:'Space Grotesk',sans-serif;">${p.name}</strong>
                                <small style="color:#25D366; font-size:11px;"><i class="fa-solid fa-circle-check"></i> CDR + Fontes TTF Inclusas</small>
                            </div>
                            <a href="${downloadUrl}" target="_blank" class="btn primary" style="padding:10px 16px; font-size:12px; background:#ff1722; color:#fff; border-radius:6px; text-decoration:none; font-weight:800; display:inline-flex; align-items:center; gap:6px; flex-shrink:0;">
                                <i class="fa-solid fa-download"></i> BAIXAR (.ZIP)
                            </a>
                        </div>
                    `;
                }).join("");
            } else {
                listEl.innerHTML = `<p style="color:#eee; font-size:13px;">Seus arquivos foram liberados! Verifique também seu e-mail cadastrado.</p>`;
            }

            successModal.classList.add("open");
        }

        // Limpa URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

/* =========================================================
   SISTEMA MEUS DOWNLOADS (ÁREA DO CLIENTE)
   ========================================================= */

function openMyDownloadsModal() {
    toggleUserMenu(false);
    const modal = document.getElementById("myDownloadsModal");
    const listEl = document.getElementById("myDownloadsList");
    if (!modal || !listEl) return;

    let purchased = [];
    try {
        purchased = JSON.parse(localStorage.getItem("zivaPurchasedArts") || "[]");
    } catch (e) {
        purchased = [];
    }

    if (purchased.length > 0) {
        listEl.innerHTML = purchased.map(p => {
            const downloadUrl = getDirectDownloadUrl(p.cdr);
            return `
                <div style="background:#111116; border:1px solid rgba(255,23,34,0.3); border-radius:10px; padding:15px; display:flex; justify-content:space-between; align-items:center; text-align:left; gap:12px;">
                    <div>
                        <strong style="display:block; color:#fff; font-size:14px; font-family:'Space Grotesk',sans-serif;">${p.name}</strong>
                        <small style="color:#25D366; font-size:11px;"><i class="fa-solid fa-circle-check"></i> Licença Vitalícia • .CDR + Fontes</small>
                    </div>
                    <a href="${downloadUrl}" target="_blank" class="btn primary" style="padding:10px 16px; font-size:12px; background:#ff1722; color:#fff; border-radius:6px; text-decoration:none; font-weight:800; display:inline-flex; align-items:center; gap:6px; flex-shrink:0;">
                        <i class="fa-solid fa-download"></i> BAIXAR (.ZIP)
                    </a>
                </div>
            `;
        }).join("");
    } else {
        listEl.innerHTML = `
            <div style="padding:30px 10px; color:#777; text-align:center;">
                <i class="fa-solid fa-box-open" style="font-size:36px; color:#444; margin-bottom:12px; display:block;"></i>
                <p style="font-size:14px; color:#bbb; margin-bottom:6px;">Você ainda não possui artes adquiridas nesta conta.</p>
                <small style="color:#666;">Adquira suas artes no catálogo para ter downloads ilimitados aqui!</small>
            </div>
        `;
    }

    modal.classList.add("open");
}

function closeMyDownloadsModal() {
    document.getElementById("myDownloadsModal")?.classList.remove("open");
}

/* =========================================================
   6. EVENTOS, MODAIS, BUSCA E EFEITOS
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    // 1. Carrinho
    document.querySelector("#cartBtn")?.addEventListener("click", openCart);
    document.querySelector("#closeCart")?.addEventListener("click", closeCart);
    document.getElementById("continueShoppingBtn")?.addEventListener("click", closeCart);

    // 1.1 Finalizar Compra do Carrinho via Mercado Pago
    const checkoutBtn = document.getElementById("checkoutBtn");
    if (checkoutBtn) {
        checkoutBtn.onclick = () => {
            if (!cart.length) {
                alert("Seu carrinho está vazio!");
                return;
            }
            const fullCartItems = cart.map(item => {
                const prod = products.find(p => String(p.id) === String(item.id));
                return prod ? { ...prod, qty: item.qty } : null;
            }).filter(Boolean);

            openZivaCheckout(fullCartItems);
        };
    }

    // 2. Favoritos
    const favBtn = document.getElementById('favBtn');
    const favPanel = document.getElementById('favPanel');
    if (favBtn && favPanel) {
        favBtn.onclick = () => { 
            favPanel.classList.add('open'); 
            document.getElementById('overlay')?.classList.add('open'); 
            renderFavs(); 
        };
    }
    document.getElementById('closeFavs')?.addEventListener("click", () => {
        favPanel?.classList.remove('open');
        document.getElementById('overlay')?.classList.remove('open');
    });

    // 3. Overlay (Fecha tudo ao clicar fora)
    document.getElementById('overlay')?.addEventListener("click", () => {
        closeCart();
        document.getElementById('favPanel')?.classList.remove('open');
        document.getElementById('loginModal')?.classList.remove('open');
    });

    // 3.1 Botão Voltar ao Catálogo
    document.getElementById("btnBackCatalog")?.addEventListener("click", closeProductPage);


    // 4. Login / Cadastro / Recuperação Modal
    const userBtn = document.getElementById('userBtn');
    const loginModal = document.getElementById('loginModal');
    if (userBtn) {
        userBtn.onclick = () => {
            if (currentUser) {
                toggleUserMenu();
            } else {
                openAuthModal('login');
            }
        };
    }

    document.getElementById('closeLogin')?.addEventListener("click", closeAuthModal);
    document.getElementById('closeLoginBackdrop')?.addEventListener("click", closeAuthModal);

    // Alternância de Telas no Modal de Auth
    document.getElementById("btnForgotPass")?.addEventListener("click", () => switchAuthView("forgot"));
    document.getElementById("linkGoRegister")?.addEventListener("click", () => switchAuthView("register"));
    document.getElementById("linkGoLogin")?.addEventListener("click", () => switchAuthView("login"));
    document.getElementById("linkBackLogin")?.addEventListener("click", () => switchAuthView("login"));

    // Toggle de visibilidade da senha
    document.getElementById("toggleLoginPass")?.addEventListener("click", function() {
        togglePassInput("loginPassword", this);
    });
    document.getElementById("toggleRegPass")?.addEventListener("click", function() {
        togglePassInput("regPassword", this);
    });

    // Submissão do Login
    document.getElementById("loginForm")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("loginEmail").value.trim();
        const password = document.getElementById("loginPassword").value;
        const btn = document.getElementById("btnLoginSubmit");

        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> ENTRANDO...`;
        clearAuthAlert();

        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (error) throw error;
            showAuthAlert("Login realizado com sucesso! Bem-vindo de volta.", "success");
            setTimeout(() => {
                closeAuthModal();
            }, 1000);
        } catch (err) {
            let msg = "E-mail ou senha incorretos.";
            if (err.message?.includes("Email not confirmed")) {
                msg = "Por favor, confirme seu e-mail antes de entrar.";
            }
            showAuthAlert(msg, "error");
        } finally {
            btn.disabled = false;
            btn.innerHTML = `<i class="fa-solid fa-right-to-bracket"></i> ENTRAR NA CONTA`;
        }
    });

    // Submissão do Cadastro
    document.getElementById("registerForm")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = document.getElementById("regName").value.trim();
        const email = document.getElementById("regEmail").value.trim();
        const password = document.getElementById("regPassword").value;
        const btn = document.getElementById("btnRegisterSubmit");

        if (password.length < 6) {
            showAuthAlert("A senha deve ter pelo menos 6 caracteres.", "error");
            return;
        }

        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> CRIANDO CONTA...`;
        clearAuthAlert();

        try {
            const { data, error } = await supabaseClient.auth.signUp({
                email,
                password,
                options: { 
                    data: { full_name: name }
                }
            });
            
            if (error) throw error;

            if (data?.user && data?.user?.identities?.length === 0) {
                showAuthAlert("Este e-mail já está cadastrado. Clique em 'Entrar'.", "error");
                return;
            }

            if (data?.session) {
                showAuthAlert("Conta criada com sucesso! Você já está conectado.", "success");
                setTimeout(() => {
                    closeAuthModal();
                }, 1200);
            } else {
                showAuthAlert("Conta criada! Se o Supabase exigir confirmação, verifique seu e-mail para ativar.", "success");
            }
        } catch (err) {
            console.error("Erro Supabase Auth:", err);
            let msg = err.message || "Erro ao criar conta.";
            if (msg.includes("already registered") || msg.includes("already exists")) {
                msg = "Este e-mail já possui cadastro. Clique em 'Entrar'.";
            } else if (msg.includes("rate limit")) {
                msg = "Muitas tentativas em pouco tempo. Aguarde um minuto.";
            } else if (msg.includes("Password")) {
                msg = "A senha deve ter pelo menos 6 caracteres.";
            }
            showAuthAlert(msg, "error");
        } finally {
            btn.disabled = false;
            btn.innerHTML = `<i class="fa-solid fa-user-plus"></i> CRIAR CONTA GRÁTIS`;
        }
    });

    // Submissão da Recuperação de Senha
    document.getElementById("forgotForm")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("forgotEmail").value.trim();
        const btn = document.getElementById("btnForgotSubmit");

        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> ENVIANDO LINK...`;
        clearAuthAlert();

        try {
            const { data, error } = await supabaseClient.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + window.location.pathname
            });
            if (error) throw error;
            showAuthAlert("Link de recuperação enviado com sucesso para o seu e-mail! Verifique sua caixa de entrada e spam.", "success");
        } catch (err) {
            showAuthAlert("Erro ao solicitar recuperação. Verifique o e-mail digitado.", "error");
        } finally {
            btn.disabled = false;
            btn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> ENVIAR LINK DE RECUPERAÇÃO`;
        }
    });

    // 5. Modal da Arte (removido - usando página dedicada agora)
    // closeArtModalBtn e closeArtModalBackdrop foram substituídos pela página de produto


    // 6. Busca
    const searchIn = document.getElementById('searchInput');
    if (searchIn) {
        searchIn.addEventListener("input", (e) => {
            searchQuery = e.target.value;
            applyFilterAndRender();
        });
    }

    // 7. Menu de Filtro e Categorias
    const filterBtn = document.getElementById("catalogFilterBtn");
    const filterMenu = document.getElementById("filterMenu");
    if (filterBtn && filterMenu) {
        filterBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            filterMenu.classList.toggle("open");
        });

        document.addEventListener("click", () => {
            filterMenu.classList.remove("open");
        });

        document.querySelectorAll(".filter-option").forEach((opt) => {
            opt.addEventListener("click", (e) => {
                currentFilter = e.target.getAttribute("data-filter") || "all";
                document.querySelectorAll(".filter-option").forEach(o => o.classList.remove("active"));
                e.target.classList.add("active");
                filterMenu.classList.remove("open");
                applyFilterAndRender();
            });
        });
    }

    // 8. Ordenação — dropdown customizado
    const sortDropdown = document.getElementById("customSortDropdown");
    const sortSelectedBtn = document.getElementById("sortSelectedBtn");
    const sortOptions = document.getElementById("sortOptions");
    const sortSelectedLabel = document.getElementById("sortSelectedLabel");

    if (sortSelectedBtn && sortOptions) {
        sortSelectedBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            sortOptions.classList.toggle("open");
            sortSelectedBtn.classList.toggle("open");
        });

        document.addEventListener("click", () => {
            sortOptions.classList.remove("open");
            sortSelectedBtn.classList.remove("open");
        });

        document.querySelectorAll(".sort-opt").forEach((opt) => {
            opt.addEventListener("click", (e) => {
                e.stopPropagation();
                currentSort = opt.getAttribute("data-value") || "default";
                if (sortSelectedLabel) sortSelectedLabel.textContent = opt.textContent;
                document.querySelectorAll(".sort-opt").forEach(o => o.classList.remove("active"));
                opt.classList.add("active");
                sortOptions.classList.remove("open");
                sortSelectedBtn.classList.remove("open");
                applyFilterAndRender();
            });
        });
    }

    // 9. Tecla ESC fecha tudo
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            closeProductPage();
            closeCart();
            document.getElementById("loginModal")?.classList.remove("open");
            document.getElementById("favPanel")?.classList.remove("open");
        }
    });

    // 10. Inicializa Dados e Autenticação do Supabase
    try {
        applyFilterAndRender();
        fetchProductsFromSupabase();
        initSupabaseAuth();
        saveCart();
        saveFavs();
        initCounters(); 
        initMagneticButtons();
        initFaq();
        initSocialProof();
        checkPaymentReturn();
    } catch (e) {
        console.error("Erro na inicialização:", e);
    }

    // 11. Loader com garantia de fechamento
    dismissLoader();
});

function dismissLoader() {
    const loader = document.getElementById("zivaLoader");
    if (loader) {
        loader.classList.add("hide");
        setTimeout(() => {
            if (loader) loader.style.display = "none";
        }, 400);
    }
    document.body.classList.add("ziva-loaded");
}

// Garantia absoluta: fecha o loader após 500ms ou ao carregar a página
setTimeout(dismissLoader, 500);
window.addEventListener("load", dismissLoader);

/* =========================================================
   7. SISTEMA DE AUTENTICAÇÃO E PERFIL (SUPABASE AUTH)
   ========================================================= */

let currentUser = null;

function initSupabaseAuth() {
    if (!supabaseClient && window.supabase) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        db = supabaseClient;
    }
    if (!supabaseClient) return;

    // 1. Checa sessão ativa
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
            setLoggedUserState(session.user);
        } else {
            setLoggedUserState(null);
        }
    });

    // 2. Escuta mudanças em tempo real (Login / Logout / Token Refresh)
    supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
            setLoggedUserState(session.user);
        } else if (event === "SIGNED_OUT") {
            setLoggedUserState(null);
        } else if (event === "PASSWORD_RECOVERY") {
            // Usuário clicou no link do e-mail para redefinir senha
            promptPasswordReset();
        }
    });
}

function setLoggedUserState(user) {
    currentUser = user;
    const userBtn = document.getElementById("userBtn");
    if (!userBtn) return;

    // Remove dropdown anterior se existir
    document.getElementById("userDropdownMenu")?.remove();

    if (user) {
        const fullName = user.user_metadata?.full_name || user.email.split("@")[0];
        const firstName = fullName.split(" ")[0].toUpperCase();
        
        userBtn.innerHTML = `
            <i class="fa-solid fa-circle-user" style="color: #25D366;"></i>
            <span>${firstName}</span>
        `;
        userBtn.classList.add("user-logged");
        userBtn.style.position = "relative";

        // Cria dropdown de opções da conta
        const dropdown = document.createElement("div");
        dropdown.id = "userDropdownMenu";
        dropdown.className = "user-menu-dropdown";
        dropdown.style.display = "none";
        dropdown.innerHTML = `
            <div class="user-info-bar">
                <span class="user-name">${fullName}</span>
                <span class="user-email">${user.email}</span>
            </div>
            <button type="button" class="user-menu-item" onclick="openMyDownloadsModal();">
                <i class="fa-solid fa-cloud-arrow-down" style="color: #ff1722;"></i> Meus Downloads
            </button>
            <button type="button" class="user-menu-item" onclick="toggleUserMenu(false); closeProductPage();">
                <i class="fa-solid fa-images" style="color: #ff1722;"></i> Explorar Catálogo
            </button>
            <button type="button" class="user-menu-item logout" onclick="handleLogout()">
                <i class="fa-solid fa-right-from-bracket"></i> Sair da Conta
            </button>
        `;
        userBtn.appendChild(dropdown);
    } else {
        userBtn.innerHTML = `
            <i class="fa-solid fa-user"></i>
            <span>LOGIN</span>
        `;
        userBtn.classList.remove("user-logged");
    }
}

function toggleUserMenu(forceState) {
    const menu = document.getElementById("userDropdownMenu");
    if (!menu) return;
    if (typeof forceState === "boolean") {
        menu.style.display = forceState ? "flex" : "none";
    } else {
        menu.style.display = menu.style.display === "none" ? "flex" : "none";
    }
}

// Fecha o menu de usuário ao clicar fora
document.addEventListener("click", (e) => {
    const userBtn = document.getElementById("userBtn");
    const menu = document.getElementById("userDropdownMenu");
    if (menu && userBtn && !userBtn.contains(e.target)) {
        menu.style.display = "none";
    }
});

async function handleLogout() {
    toggleUserMenu(false);
    if (!supabaseClient) return;
    await supabaseClient.auth.signOut();
    alert("Você saiu da sua conta.");
}

function openAuthModal(view = "login") {
    switchAuthView(view);
    clearAuthAlert();
    document.getElementById("loginModal")?.classList.add("open");
}

function closeAuthModal() {
    document.getElementById("loginModal")?.classList.remove("open");
    clearAuthAlert();
}

function switchAuthView(view) {
    clearAuthAlert();
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");
    const forgotForm = document.getElementById("forgotForm");
    
    const title = document.getElementById("authTitle");
    const subtitle = document.getElementById("authSubtitle");

    const toReg = document.getElementById("toggleToRegister");
    const toLog = document.getElementById("toggleToLogin");
    const backLog = document.getElementById("toggleBackToLogin");

    if (view === "login") {
        loginForm.style.display = "flex";
        registerForm.style.display = "none";
        forgotForm.style.display = "none";

        title.textContent = "ACESSAR CONTA";
        subtitle.textContent = "Entre para gerenciar seus pedidos e baixar suas artes.";

        toReg.style.display = "block";
        toLog.style.display = "none";
        backLog.style.display = "none";
    } else if (view === "register") {
        loginForm.style.display = "none";
        registerForm.style.display = "flex";
        forgotForm.style.display = "none";

        title.textContent = "CRIAR CONTA";
        subtitle.textContent = "Cadastre-se para ter acesso vitalício aos seus arquivos.";

        toReg.style.display = "none";
        toLog.style.display = "block";
        backLog.style.display = "none";
    } else if (view === "forgot") {
        loginForm.style.display = "none";
        registerForm.style.display = "none";
        forgotForm.style.display = "flex";

        title.textContent = "RECUPERAR SENHA";
        subtitle.textContent = "Enviaremos as instruções para você criar uma nova senha.";

        toReg.style.display = "none";
        toLog.style.display = "none";
        backLog.style.display = "block";
    }
}

function showAuthAlert(msg, type = "error") {
    const alertBox = document.getElementById("authAlert");
    if (!alertBox) return;
    alertBox.className = `auth-alert ${type}`;
    const icon = type === "success" ? "fa-circle-check" : "fa-triangle-exclamation";
    alertBox.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${msg}</span>`;
    alertBox.style.display = "flex";
}

function clearAuthAlert() {
    const alertBox = document.getElementById("authAlert");
    if (alertBox) {
        alertBox.style.display = "none";
        alertBox.innerHTML = "";
    }
}

function togglePassInput(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    if (input.type === "password") {
        input.type = "text";
        btn.innerHTML = `<i class="fa-solid fa-eye-slash"></i>`;
    } else {
        input.type = "password";
        btn.innerHTML = `<i class="fa-solid fa-eye"></i>`;
    }
}

// Redefinição de senha quando vem do e-mail
// Usa o modal de login já existente para entrada de nova senha de forma segura
function promptPasswordReset() {
    // Abre o modal de auth com campo especial de nova senha
    const modal = document.getElementById("loginModal");
    const title = document.getElementById("authTitle");
    const subtitle = document.getElementById("authSubtitle");
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");
    const forgotForm = document.getElementById("forgotForm");

    if (!modal || !loginForm) return;

    if (loginForm) loginForm.style.display = "none";
    if (registerForm) registerForm.style.display = "none";
    if (forgotForm) forgotForm.style.display = "none";

    // Cria formulário de nova senha temporariamente
    const resetFormId = "tempResetForm";
    let resetForm = document.getElementById(resetFormId);
    if (!resetForm) {
        resetForm = document.createElement("form");
        resetForm.id = resetFormId;
        resetForm.className = "auth-form";
        resetForm.innerHTML = `
            <p style="color:#aaa;font-size:13px;margin-bottom:16px;">Você veio pelo link do e-mail. Digite sua nova senha abaixo:</p>
            <div class="form-group">
                <label><i class="fa-solid fa-lock"></i> Nova Senha</label>
                <div class="input-pass-wrap">
                    <input type="password" id="newPasswordInput" placeholder="Mínimo 6 caracteres" minlength="6" required>
                    <button type="button" class="btn-toggle-pass" onclick="togglePassInput('newPasswordInput', this)"><i class="fa-solid fa-eye"></i></button>
                </div>
            </div>
            <button type="submit" class="btn-auth-submit">
                <i class="fa-solid fa-key"></i> SALVAR NOVA SENHA
            </button>
        `;
        resetForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const newPass = document.getElementById("newPasswordInput").value;
            if (!newPass || newPass.length < 6) {
                showAuthAlert("A senha deve ter pelo menos 6 caracteres.", "error");
                return;
            }
            const btn = resetForm.querySelector("button[type='submit']");
            if (btn) { btn.disabled = true; btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> SALVANDO...`; }
            const { error } = await supabaseClient.auth.updateUser({ password: newPass });
            if (error) {
                showAuthAlert("Erro ao atualizar senha: " + error.message, "error");
            } else {
                showAuthAlert("Senha atualizada com sucesso! Você já está conectado.", "success");
                setTimeout(() => { closeAuthModal(); resetForm?.remove(); }, 1500);
            }
            if (btn) { btn.disabled = false; btn.innerHTML = `<i class="fa-solid fa-key"></i> SALVAR NOVA SENHA`; }
        });
        modal.querySelector(".modal-box")?.appendChild(resetForm);
    }

    resetForm.style.display = "flex";
    if (title) title.textContent = "NOVA SENHA";
    if (subtitle) subtitle.textContent = "Crie uma senha segura para sua conta ZIVA ART.";
    clearAuthAlert();
    modal.classList.add("open");
}

/* --- BOTÃO MAGNÉTICO E CONTADORES --- */
function initMagneticButtons() {
    document.querySelectorAll(".btn").forEach(btn => {
        btn.onmousemove = (e) => {
            const r = btn.getBoundingClientRect();
            btn.style.setProperty("--mouse-x", `${(e.clientX - r.left - r.width/2) * 0.1}px`);
            btn.style.setProperty("--mouse-y", `${(e.clientY - r.top - r.height/2) * 0.1}px`);
        };
        btn.onmouseleave = () => { 
            btn.style.setProperty("--mouse-x", "0px"); 
            btn.style.setProperty("--mouse-y", "0px"); 
        };
    });
}

function initCounters() {
    const statsItems = document.querySelectorAll(".stats strong[data-target]");
    if (!statsItems.length) return;

    let animated = false;

    function runAnimation() {
        if (animated) return;
        animated = true;

        statsItems.forEach(s => {
            const target = +s.dataset.target || 0;
            const suffix = s.dataset.suffix || "";
            const duration = 1500;
            const startTime = performance.now();

            function updateCounter(currentTime) {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                // Ease out expo
                const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
                const currentVal = Math.floor(easeProgress * target);
                s.innerText = currentVal + suffix;

                if (progress < 1) {
                    requestAnimationFrame(updateCounter);
                } else {
                    s.innerText = target + suffix;
                }
            }

            requestAnimationFrame(updateCounter);
        });
    }

    const statsSection = document.querySelector(".stats-section") || document.querySelector(".stats");
    if (statsSection && "IntersectionObserver" in window) {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                runAnimation();
                observer.disconnect();
            }
        }, { threshold: 0.15 });
        observer.observe(statsSection);
    } else {
        setTimeout(runAnimation, 600);
    }
}

/* =========================================================
   FAQ - ACORDEÃO INTERATIVO
   ========================================================= */

function initFaq() {
    const faqItems = document.querySelectorAll(".faq-item");
    if (!faqItems.length) return;

    faqItems.forEach((item) => {
        const questionBtn = item.querySelector(".faq-question");
        if (!questionBtn) return;

        questionBtn.addEventListener("click", () => {
            const isActive = item.classList.contains("active");

            // Fecha todos os outros
            faqItems.forEach(i => i.classList.remove("active"));

            // Se não estava ativo, abre
            if (!isActive) {
                item.classList.add("active");
            }
        });
    });
}

/* =========================================================
   PROVA SOCIAL - NOTIFICAÇÃO FLUTUANTE DE COMPRAS RECENTES
   ========================================================= */

const recentPurchases = [
    { user: "Lucas M. • São Paulo", art: "Mascote Interclasse Leão", time: "há 2 minutos" },
    { user: "Thiago S. • Curitiba", art: "Arte Camisa Esportiva Phoenix", time: "há 5 minutos" },
    { user: "Matheus R. • Minas Gerais", art: "Mascote Tigre Feroz CDR", time: "há 8 minutos" },
    { user: "Felipe A. • Rio de Janeiro", art: "Pack Vetor Interclasse 3º Ano", time: "há 12 minutos" },
    { user: "Diego N. • Fortaleza", art: "Mascote Lobo Alfa Editável", time: "há 15 minutos" },
    { user: "Camila R. • Goiânia", art: "Arte Dragão Neon Sublimação", time: "há 18 minutos" }
];

let currentProofIdx = 0;
let proofTimer = null;

function initSocialProof() {
    const toast = document.getElementById("socialProofToast");
    if (!toast) return;

    const closeBtn = document.getElementById("toastCloseBtn");
    if (closeBtn) {
        closeBtn.onclick = () => {
            toast.classList.remove("show");
            if (proofTimer) clearTimeout(proofTimer);
            proofTimer = setTimeout(showNextProof, 35000);
        };
    }

    // Inicia a primeira notificação após 4 segundos
    setTimeout(showNextProof, 4000);
}

function showNextProof() {
    const toast = document.getElementById("socialProofToast");
    const userEl = document.getElementById("toastUser");
    const artEl = document.getElementById("toastArt");
    const timeEl = document.getElementById("toastTime");

    if (!toast || !userEl || !artEl) return;

    const p = recentPurchases[currentProofIdx];
    currentProofIdx = (currentProofIdx + 1) % recentPurchases.length;

    userEl.innerText = p.user;
    artEl.innerText = p.art;
    if (timeEl) {
        timeEl.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${p.time} • Download Liberado`;
    }

    // Mostra o toast
    toast.classList.add("show");

    // Esconde após 5.5 segundos
    setTimeout(() => {
        toast.classList.remove("show");
        // Agenda o próximo após 20 a 30 segundos
        const nextDelay = Math.floor(Math.random() * 10000) + 20000;
        proofTimer = setTimeout(showNextProof, nextDelay);
    }, 5500);
}

/* =========================================================
   PROTEÇÃO DE ASSETS E IMAGENS CONTRA CÓPIA
   ========================================================= */
document.addEventListener("contextmenu", (e) => {
    if (e.target.tagName === "IMG" || e.target.closest(".product-img") || e.target.closest(".pv-img-frame")) {
        e.preventDefault();
        return false;
    }
});

document.addEventListener("dragstart", (e) => {
    if (e.target.tagName === "IMG") {
        e.preventDefault();
        return false;
    }
});



/* =========================================================
   SISTEMA DE CHECKOUT TRANSPARENTE MULTI-ETAPAS (PIX DIRETO)
   ========================================================= */

let checkoutItems = [];
let checkoutDiscount = 0;
let checkoutCouponApplied = null;
let currentCheckoutStep = 1;
let pixPollingTimer = null;
let pixCountdownTimer = null;
let activePixPaymentId = null;

// Formata CPF
function formatCpfInput(input) {
    let v = input.value.replace(/\D/g, "");
    if (v.length > 11) v = v.substring(0, 11);
    if (v.length > 9) {
        input.value = v.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, "$1.$2.$3-$4");
    } else if (v.length > 6) {
        input.value = v.replace(/(\d{3})(\d{3})(\d{1,3})/, "$1.$2.$3");
    } else if (v.length > 3) {
        input.value = v.replace(/(\d{3})(\d{1,3})/, "$1.$2");
    } else {
        input.value = v;
    }
}

// Formata Telefone
function formatPhoneInput(input) {
    let v = input.value.replace(/\D/g, "");
    if (v.length > 11) v = v.substring(0, 11);
    if (v.length > 10) {
        input.value = v.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    } else if (v.length > 6) {
        input.value = v.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
    } else if (v.length > 2) {
        input.value = v.replace(/(\d{2})(\d{0,5})/, "($1) $2");
    } else {
        input.value = v;
    }
}

// Abre o Checkout Multi-Etapas
function openZivaCheckout(items) {
    if (!items || items.length === 0) {
        alert("Selecione ao menos um produto para continuar!");
        return;
    }

    checkoutItems = items.map(it => {
        const prod = products.find(p => String(p.id) === String(it.id)) || it;
        return {
            id: prod.id,
            name: prod.name,
            price: Number(prod.price) || 0,
            img: prod.img || PLACEHOLDER_IMG,
            cat: prod.cat || "Vetor CDR",
            qty: Number(it.qty || 1)
        };
    });

    checkoutDiscount = 0;
    checkoutCouponApplied = null;
    const couponInput = document.getElementById("checkoutCouponCode");
    const couponFeedback = document.getElementById("couponFeedback");
    if (couponInput) couponInput.value = "";
    if (couponFeedback) { couponFeedback.textContent = ""; couponFeedback.style.color = ""; }

    // Fecha carrinho se estiver aberto
    closeCart();

    // Preenche dados do usuario se estiver logado no Supabase
    if (supabaseClient) {
        supabaseClient.auth.getUser().then(({ data: { user } }) => {
            if (user) {
                const emailInput = document.getElementById("checkoutEmail");
                const nameInput = document.getElementById("checkoutFirstName");
                const loginLabel = document.getElementById("checkoutLoginLabel");
                
                if (emailInput && !emailInput.value) emailInput.value = user.email || "";
                if (nameInput && !nameInput.value && user.user_metadata?.full_name) {
                    const parts = user.user_metadata.full_name.split(" ");
                    nameInput.value = parts[0] || "";
                    const lastNameInput = document.getElementById("checkoutLastName");
                    if (lastNameInput && parts.length > 1) {
                        lastNameInput.value = parts.slice(1).join(" ");
                    }
                }
                if (loginLabel) loginLabel.textContent = "Conectado";
            }
        }).catch(() => {});
    }

    renderCheckoutSidebar();
    goToCheckoutStep(1);

    const modal = document.getElementById("zivaCheckoutModal");
    if (modal) {
        modal.classList.add("open");
        document.body.style.overflow = "hidden";
    }
}

// Fecha o Checkout
function closeZivaCheckout() {
    clearInterval(pixPollingTimer);
    clearInterval(pixCountdownTimer);
    const modal = document.getElementById("zivaCheckoutModal");
    if (modal) {
        modal.classList.remove("open");
        document.body.style.overflow = "";
    }
}

// Renderiza a barra lateral de resumo do checkout
function renderCheckoutSidebar() {
    const list = document.getElementById("checkoutItemsList");
    const countEl = document.getElementById("checkoutSummaryCount");
    const subtotalEl = document.getElementById("checkoutSubtotalDisplay");
    const discountRow = document.getElementById("checkoutDiscountRow");
    const discountEl = document.getElementById("checkoutDiscountDisplay");
    const grandTotalEl = document.getElementById("checkoutGrandTotalDisplay");

    const totalQty = checkoutItems.reduce((acc, i) => acc + i.qty, 0);
    if (countEl) countEl.textContent = `${totalQty} ${totalQty === 1 ? 'item' : 'itens'}`;

    if (list) {
        list.innerHTML = checkoutItems.map(item => `
            <div class="checkout-item-row">
                <div class="checkout-item-thumb">
                    <img src="${item.img}" alt="${item.name}">
                    ${item.qty > 1 ? `<span class="checkout-item-qty">${item.qty}</span>` : ''}
                </div>
                <div class="checkout-item-details">
                    <span class="checkout-item-title">${item.name}</span>
                    <span class="checkout-item-cat">${item.cat}</span>
                </div>
                <div class="checkout-item-price">
                    ${money(item.price * item.qty)}
                </div>
            </div>
        `).join("");
    }

    const subtotal = checkoutItems.reduce((acc, i) => acc + (i.price * i.qty), 0);
    const discountVal = subtotal * (checkoutDiscount / 100);
    const grandTotal = Math.max(0.50, subtotal - discountVal);

    if (subtotalEl) subtotalEl.textContent = money(subtotal);
    
    if (discountRow && discountEl) {
        if (checkoutDiscount > 0) {
            discountRow.style.display = "flex";
            discountEl.textContent = `- ${money(discountVal)} (${checkoutDiscount}%)`;
        } else {
            discountRow.style.display = "none";
        }
    }

    if (grandTotalEl) grandTotalEl.textContent = money(grandTotal);
}

// Aplicar Cupom
function applyCheckoutCoupon() {
    const input = document.getElementById("checkoutCouponCode");
    const feedback = document.getElementById("couponFeedback");
    if (!input) return;

    const code = input.value.trim().toUpperCase();
    if (!code) {
        feedback.textContent = "Digite um cÃ³digo de cupom.";
        feedback.style.color = "#ff4444";
        return;
    }

    const coupons = {
        "ZIVA10": 10,
        "PRIMEIRACOMPRA": 15,
        "ZIVA20": 20,
        "ZIVA50": 50,
        "VIP100": 99
    };

    if (coupons[code]) {
        checkoutDiscount = coupons[code];
        checkoutCouponApplied = code;
        feedback.textContent = `âœ“ Cupom ${code} aplicado com sucesso! (${checkoutDiscount}% OFF)`;
        feedback.style.color = "#00ff88";
        renderCheckoutSidebar();
    } else {
        feedback.textContent = "Cupom invÃ¡lido ou expirado.";
        feedback.style.color = "#ff4444";
    }
}

// TransiÃ§Ã£o de Etapas
function goToCheckoutStep(step) {
    if (step === 2) {
        const email = document.getElementById("checkoutEmail")?.value.trim();
        const firstName = document.getElementById("checkoutFirstName")?.value.trim();
        const lastName = document.getElementById("checkoutLastName")?.value.trim() || "";

        if (!email || !email.includes("@")) {
            alert("Por favor, digite um e-mail vÃ¡lido para continuar.");
            document.getElementById("checkoutEmail")?.focus();
            return;
        }
        if (!firstName) {
            alert("Por favor, informe seu nome.");
            document.getElementById("checkoutFirstName")?.focus();
            return;
        }

        // Atualiza card de revisÃ£o
        const reviewEmail = document.getElementById("reviewContactEmail");
        const reviewName = document.getElementById("reviewContactName");
        if (reviewEmail) reviewEmail.textContent = email;
        if (reviewName) reviewName.textContent = `${firstName} ${lastName}`.trim();
    }

    currentCheckoutStep = step;

    // Atualiza Paineis
    for (let i = 1; i <= 4; i++) {
        const panel = document.getElementById(`checkoutStep${i}`);
        if (panel) panel.style.display = (i === step) ? "block" : "none";
    }

    // Atualiza Stepper Visual
    const s1 = document.getElementById("stepNode1");
    const s2 = document.getElementById("stepNode2");
    const s3 = document.getElementById("stepNode3");
    const d1 = document.getElementById("stepDivider1");
    const d2 = document.getElementById("stepDivider2");

    if (s1 && s2 && s3 && d1 && d2) {
        s1.className = "step-node " + (step === 1 ? "active" : "completed");
        d1.className = "step-divider " + (step >= 2 ? "active" : "");
        s2.className = "step-node " + (step === 2 ? "active" : (step > 2 ? "completed" : ""));
        d2.className = "step-divider " + (step >= 3 ? "active" : "");
        s3.className = "step-node " + (step >= 3 ? "active" : "");
    }

    // Scroll para o topo do form
    document.querySelector(".checkout-main-col")?.scrollTo({ top: 0, behavior: "smooth" });
}

// GeraÃ§Ã£o de ID Ãšnico para idempotÃªncia do Mercado Pago
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// 3. ExecuÃ§Ã£o da GeraÃ§Ã£o do PIX via Mercado Pago API
async function executePixGeneration() {
    const btn = document.getElementById("btnGeneratePix");
    const originalText = btn ? btn.innerHTML : "";
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> GERANDO QR CODE PIX...`;
    }

    const email = document.getElementById("checkoutEmail")?.value.trim();
    const firstName = document.getElementById("checkoutFirstName")?.value.trim() || "Cliente";
    const lastName = document.getElementById("checkoutLastName")?.value.trim() || "Ziva";
    const cpf = document.getElementById("checkoutCpf")?.value.replace(/\D/g, "");

    const subtotal = checkoutItems.reduce((acc, i) => acc + (i.price * i.qty), 0);
    const discountVal = subtotal * (checkoutDiscount / 100);
    const finalAmount = Number(Math.max(0.50, subtotal - discountVal).toFixed(2));

    const description = checkoutItems.map(i => i.name).join(", ").substring(0, 100);

    const payerObj = {
        email: email,
        first_name: firstName,
        last_name: lastName
    };
    if (cpf && cpf.length === 11) {
        payerObj.identification = {
            type: "CPF",
            number: cpf
        };
    }

    const payload = {
        transaction_amount: finalAmount,
        description: `ZIVA ART: ${description}`,
        payment_method_id: "pix",
        payer: payerObj
    };

    try {
        const safePayload = {
            items: checkoutItems.map(i => ({ name: i.name, qty: i.qty, price: i.price })),
            payer: payerObj,
            couponCode: checkoutCouponApplied
        };
        const apiUrl = window.location.origin.includes("localhost") || window.location.protocol.startsWith("http")
            ? "/api/create-pix"
            : "http://localhost:5500/api/create-pix";

        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Idempotency-Key": generateUUID()
            },
            body: JSON.stringify(safePayload)
        });
        const data = await response.json();

        if (data && data.point_of_interaction && data.point_of_interaction.transaction_data) {
            const txData = data.point_of_interaction.transaction_data;
            const qrCodeBase64 = txData.qr_code_base64;
            const qrCodeCopy = txData.qr_code;
            activePixPaymentId = data.id;

            // Renderiza na tela do PIX
            const qrImg = document.getElementById("checkoutPixQrImg");
            const copyInput = document.getElementById("checkoutPixCopyInput");
            const amountDisp = document.getElementById("checkoutPixAmountDisplay");

            if (qrImg) qrImg.src = `data:image/png;base64,${qrCodeBase64}`;
            if (copyInput) copyInput.value = qrCodeCopy;
            if (amountDisp) amountDisp.textContent = money(finalAmount);

            // AvanÃ§a para tela do PIX
            goToCheckoutStep(3);

            // Inicia Contagem Regressiva e Polling
            startPixCountdown(15 * 60);
            startPixPolling(activePixPaymentId);

        } else {
            console.error("Erro na resposta do Mercado Pago:", data);
            alert("NÃ£o foi possÃ­vel gerar a chave PIX no momento. " + (data.message || "Verifique seus dados."));
        }
    } catch (err) {
        console.error("Erro na requisiÃ§Ã£o ao Mercado Pago:", err);
        alert("Erro de conexÃ£o ao gerar o PIX. Tente novamente.");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }
}

// Copiar cÃ³digo PIX
function copyPixCode() {
    const copyInput = document.getElementById("checkoutPixCopyInput");
    const btn = document.getElementById("btnCopyPixAction");
    if (!copyInput || !btn) return;

    copyInput.select();
    copyInput.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(copyInput.value).then(() => {
        btn.classList.add("copied");
        btn.innerHTML = `<i class="fa-solid fa-check"></i> PIX COPIADO COM SUCESSO!`;
        setTimeout(() => {
            btn.classList.remove("copied");
            btn.innerHTML = `<i class="fa-solid fa-copy"></i> Copiar CÃ³digo PIX`;
        }, 3000);
    }).catch(() => {
        document.execCommand("copy");
        btn.innerHTML = `<i class="fa-solid fa-check"></i> PIX COPIADO!`;
    });
}

// Contagem regressiva do PIX (15 min)
function startPixCountdown(durationSeconds) {
    clearInterval(pixCountdownTimer);
    let remaining = durationSeconds;
    const display = document.getElementById("pixCountDown");

    pixCountdownTimer = setInterval(() => {
        remaining--;
        if (remaining <= 0) {
            clearInterval(pixCountdownTimer);
            if (display) display.textContent = "Expirado";
            const statusMsg = document.getElementById("pixStatusMsg");
            if (statusMsg) statusMsg.textContent = "QR Code expirado. Gere um novo pedido.";
            return;
        }
        const m = Math.floor(remaining / 60);
        const s = remaining % 60;
        if (display) display.textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }, 1000);
}

// Polling de verificaÃ§Ã£o de pagamento do PIX em tempo real
function startPixPolling(paymentId) {
    clearInterval(pixPollingTimer);
    if (!paymentId) return;

    pixPollingTimer = setInterval(async () => {
        try {
            const checkUrl = window.location.origin.includes("localhost") || window.location.protocol.startsWith("http")
                ? ("/api/check-pix?id=" + paymentId)
                : ("http://localhost:5500/api/check-pix?id=" + paymentId);

            const resp = await fetch(checkUrl);

            if (resp.ok) {
                const data = await resp.json();
                if (data && data.status === "approved") {
                    clearInterval(pixPollingTimer);
                    clearInterval(pixCountdownTimer);
                    onPixPaymentApproved(data);
                }
            }
        } catch (e) {
            // Silencioso em caso de oscilaÃ§Ã£o de rede momentÃ¢nea
        }
    }, 3500);
}

// Cancelar PIX e voltar
function cancelPixAndBack() {
    clearInterval(pixPollingTimer);
    clearInterval(pixCountdownTimer);
    goToCheckoutStep(2);
}

// LiberaÃ§Ã£o de Sucesso e Download
async function onPixPaymentApproved(paymentData) {
    goToCheckoutStep(4);

    // Esvazia carrinho local se a compra continha itens do carrinho
    cart = [];
    localStorage.setItem("zivaCart", "[]");
    updateCart();

    const downloadsList = document.getElementById("checkoutDownloadsList");
    if (downloadsList) {
        downloadsList.innerHTML = `
            <div style="text-align:center; padding: 15px; color:#888;">
                <i class="fa-solid fa-spinner fa-spin"></i> Preparando seus links de download direto...
            </div>
        `;
    }

    // Utiliza os links de download verificados e liberados pelo backend seguro
    let boughtProds = [];
    if (paymentData && Array.isArray(paymentData.downloads) && paymentData.downloads.length > 0) {
        boughtProds = paymentData.downloads.map(dl => {
            const originalItem = checkoutItems.find(i => (i.name || "").trim().toLowerCase() === (dl.name || "").trim().toLowerCase()) || {};
            return {
                id: originalItem.id || "art-digital",
                name: dl.name,
                img: originalItem.img || dl.img || PLACEHOLDER_IMG,
                cdrUrl: dl.cdrUrl
            };
        });
    } else {
        boughtProds = checkoutItems.map(item => ({
            id: item.id,
            name: item.name,
            img: item.img,
            cdrUrl: "#"
        }));
    }

    // Salva no historico de downloads do cliente
    try {
        const existingDownloads = JSON.parse(localStorage.getItem("zivaUserDownloads") || "[]");
        boughtProds.forEach(bp => {
            if (!existingDownloads.some(ed => ed.name === bp.name)) {
                existingDownloads.unshift({
                    name: bp.name,
                    date: new Date().toLocaleDateString("pt-BR"),
                    cdrUrl: bp.cdrUrl
                });
            }
        });
        localStorage.setItem("zivaUserDownloads", JSON.stringify(existingDownloads));
    } catch (e) {}

    // Renderiza os botÃµes de download direto
    if (downloadsList) {
        downloadsList.innerHTML = boughtProds.map(p => `
            <div class="download-item-card">
                <img src="${p.img}" alt="${p.name}">
                <div class="download-item-info">
                    <strong>${p.name}</strong>
                    <span>Arquivo Vetor (.CDR + Fontes TTF)</span>
                </div>
                <a href="${p.cdrUrl || '#'}" target="_blank" class="btn-download-cdr">
                    <i class="fa-solid fa-cloud-arrow-down"></i> BAIXAR CDR
                </a>
            </div>
        `).join("");
    }
}
