/* =========================================================
   ZIVA ART - MASTER SCRIPT (TUDO INTEGRADO)
   ========================================================= */

const products = [
    { id: 1, name: "Panda Black & White", cat: "Interclasse", price: 14.99, old: 55, img: "assets/img/teste.jpg" },
    { id: 2, name: "Pantera Black", cat: "Mascotes", price: 12.99, old: 45, img: "assets/img/teste.jpg" },
    { id: 3, name: "Wolf Red Elite", cat: "Interclasse", price: 15.99, old: 55, img: "assets/img/teste.jpg" },
    { id: 4, name: "Fenix Concept", cat: "Mascotes", price: 14.99, old: 50, img: "assets/img/teste.jpg" },
    { id: 5, name: "Jersey Sport", cat: "Esportivo", price: 11.99, old: 40, img: "assets/img/teste.jpg" },
    { id: 6, name: "Typography X", cat: "Vetores", price: 9.99, old: 35, img: "assets/img/teste.jpg" },
    { id: 7, name: "Brasil Concept", cat: "Interclasse", price: 13.99, old: 45, img: "assets/img/teste.jpg" },
    { id: 8, name: "Lion Gold", cat: "Mascotes", price: 16.99, old: 60, img: "assets/img/teste.jpg" }
];

/* --- CONFIGURAÇÕES INICIAIS (CARRINHO E FAVORITOS) --- */
let cart = JSON.parse(localStorage.getItem("zivaCart") || "[]");
let favorites = JSON.parse(localStorage.getItem("zivaFavs") || "[]");
const money = (val) => val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/* =========================================================
   1. RENDERIZAR PRODUTOS (COM CORAÇÃO INTELIGENTE)
   ========================================================= */

function renderProducts(list = products) {
    const container = document.getElementById("products");
    const countLabel = document.getElementById("catalogResults");
    if (!container) return;

    if (countLabel) countLabel.innerText = `Há ${list.length} resultados no total`;

    container.innerHTML = list.map((p) => {
        // Verifica se o produto já está nos favoritos para manter o coração vermelho
        const isFav = favorites.includes(p.id);
        
        return `
            <article class="product">
                <div class="product-img">
                    <img src="${p.img}" alt="${p.name}" onerror="this.src='https://via.placeholder.com/1000x1000?text=ZIVA+ART'">
                    
                    <!-- Botão Coração Passando o ID do Produto -->
                    <button class="wishlist-btn ${isFav ? 'active' : ''}" onclick="event.stopPropagation(); toggleFav(this, ${p.id})">
                        <i class="${isFav ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
                    </button>

                    <span class="tag">-${Math.round((1 - p.price / p.old) * 100)}%</span>
                </div>
                <div class="product-info">
                    <small>${p.cat}</small>
                    <h3>${p.name}</h3>
                    <div class="price">
                        <strong>${money(p.price)}</strong>
                        <del>${money(p.old)}</del>
                    </div>
                    <button class="add" onclick="addCart(${p.id})">Adicionar ao carrinho</button>
                </div>
            </article>
        `;
    }).join("");
}

/* =========================================================
   2. LÓGICA DOS FAVORITOS (CORAÇÃO + PAINEL)
   ========================================================= */

function toggleFav(btn, productId) {
    btn.classList.toggle('active');
    const icon = btn.querySelector('i');
    
    if (btn.classList.contains('active')) {
        icon.classList.replace('fa-regular', 'fa-solid');
        if (!favorites.includes(productId)) favorites.push(productId);
    } else {
        icon.classList.replace('fa-solid', 'fa-regular');
        favorites = favorites.filter(id => id !== productId);
    }

    saveFavs();
}

function saveFavs() {
    localStorage.setItem("zivaFavs", JSON.stringify(favorites));
    const favCount = document.getElementById('favCount');
    if (favCount) favCount.innerText = favorites.length;
    renderFavs(); // Atualiza a lista lateral
}

function renderFavs() {
    const el = document.getElementById("favItems");
    if (!el) return;

    if (!favorites.length) {
        el.innerHTML = '<p class="empty" style="text-align:center;color:#555;margin-top:50px;">Sua lista está vazia.</p>';
        return;
    }

    el.innerHTML = favorites.map(id => {
        const p = products.find(item => item.id === id);
        if(!p) return "";
        return `
            <div class="fav-product-item" style="display:flex; align-items:center; gap:15px; padding:15px 0; border-bottom:1px solid #111;">
                <img src="${p.img}" style="width:50px; height:50px; border-radius:5px; object-fit:cover;">
                <div style="flex:1">
                    <h4 style="font-size:12px; color:#fff; margin:0;">${p.name}</h4>
                    <small style="color:#ff0000; font-weight:bold; cursor:pointer;" onclick="addCart(${p.id})">ADICIONAR AO CARRINHO</small>
                </div>
                <button style="background:none; border:none; color:#444; cursor:pointer; font-size:18px;" onclick="removeFav(${p.id})">×</button>
            </div>
        `;
    }).join("");
}

function removeFav(id) {
    favorites = favorites.filter(favId => favId !== id);
    saveFavs();
    renderProducts(); // Redesenha para o coração do produto "desapagar"
}

/* =========================================================
   3. LÓGICA DO CARRINHO
   ========================================================= */

function save() {
    localStorage.setItem("zivaCart", JSON.stringify(cart));
    renderCart();
    const countEl = document.querySelector("#cartCount");
    if(countEl) countEl.textContent = cart.reduce((t, i) => t + i.qty, 0);
}

function addCart(id) {
    const found = cart.find(i => i.id === id);
    if (found) found.qty++; else cart.push({ id, qty: 1 });
    save(); openCart();
}

function renderCart() {
    const el = document.querySelector("#cartItems");
    if (!el) return;
    if (!cart.length) {
        el.innerHTML = '<p class="empty">Seu carrinho está vazio.</p>';
        document.querySelector("#cartTotal").textContent = money(0);
        return;
    }
    let total = 0;
    el.innerHTML = cart.map(item => {
        const p = products.find(prod => prod.id === item.id);
        if(!p) return "";
        total += p.price * item.qty;
        return `<div class="cart-item">
            <div class="mini" style="background-image:url(${p.img});background-size:cover"></div>
            <div><h4>${p.name}</h4><span>${item.qty} × ${money(p.price)}</span></div>
            <button style="margin-left:auto;background:none;border:0;color:#666;" onclick="removeCart(${item.id})">×</button>
        </div>`;
    }).join("");
    document.querySelector("#cartTotal").textContent = money(total);
}

function removeCart(id) { cart = cart.filter(i => i.id !== id); save(); }
function openCart() { document.querySelector("#cart")?.classList.add("open"); document.querySelector("#overlay")?.classList.add("open"); }
function closeCart() { document.querySelector("#cart")?.classList.remove("open"); document.querySelector("#overlay")?.classList.remove("open"); }

/* =========================================================
   4. MODAIS, BUSCA E EFEITOS
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    
    // Carrinho
    document.querySelector("#cartBtn").onclick = openCart;
    document.querySelector("#closeCart").onclick = closeCart;

    // Favoritos
    const favBtn = document.getElementById('favBtn');
    const favPanel = document.getElementById('favPanel');
    if (favBtn) favBtn.onclick = () => { favPanel.classList.add('open'); document.getElementById('overlay').classList.add('open'); renderFavs(); };
    if (document.getElementById('closeFavs')) document.getElementById('closeFavs').onclick = () => { favPanel.classList.remove('open'); document.getElementById('overlay').classList.remove('open'); };

    // Overlay (Fecha tudo)
    document.getElementById('overlay').onclick = () => { closeCart(); document.getElementById('favPanel')?.classList.remove('open'); };

    // Login
    const userBtn = document.getElementById('userBtn');
    if (userBtn) userBtn.onclick = () => document.getElementById('loginModal')?.classList.add('open');
    if (document.getElementById('closeLogin')) document.getElementById('closeLogin').onclick = () => document.getElementById('loginModal')?.classList.remove('open');

    // Busca
    const searchIn = document.getElementById('searchInput');
    if (searchIn) {
        searchIn.oninput = () => {
            const query = searchIn.value.toLowerCase();
            renderProducts(products.filter(p => p.name.toLowerCase().includes(query) || p.cat.toLowerCase().includes(query)));
        };
    }

    renderProducts();
    save();
    saveFavs();
    initCounters(); 
    initMagneticButtons();

    // Loader
    setTimeout(() => {
        document.body.classList.add("ziva-loaded");
        document.getElementById("zivaLoader")?.classList.add("hide");
    }, 600);
});

/* --- BOTÃO MAGNÉTICO E CONTADORES --- */
function initMagneticButtons() {
    document.querySelectorAll(".btn").forEach(btn => {
        btn.onmousemove = (e) => {
            const r = btn.getBoundingClientRect();
            btn.style.setProperty("--mouse-x", `${(e.clientX - r.left - r.width/2) * 0.1}px`);
            btn.style.setProperty("--mouse-y", `${(e.clientY - r.top - r.height/2) * 0.1}px`);
        };
        btn.onmouseleave = () => { btn.style.setProperty("--mouse-x", "0px"); btn.style.setProperty("--mouse-y", "0px"); };
    });
}

function initCounters() {
    const stats = document.querySelector(".stats");
    if (!stats) return;
    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
            stats.querySelectorAll("strong[data-target]").forEach(s => {
                const target = +s.dataset.target;
                let count = 0;
                const update = () => {
                    count += target / 100;
                    if (count < target) { s.innerText = Math.floor(count) + (s.dataset.suffix || ""); setTimeout(update, 20); }
                    else s.innerText = target + (s.dataset.suffix || "");
                };
                update();
            });
            observer.disconnect();
        }
    }, { threshold: 0.5 });
    observer.observe(stats);
}
